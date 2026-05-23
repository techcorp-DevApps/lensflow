import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { HttpError } from '../middleware/error.js';
import { getOpenAI, isOpenAIConfigured, DEFAULT_MODEL } from '../openai-client.js';
import { loadAgent } from '../agent-loader.js';
import { runTool } from '../agent-tools.js';
import { createRateLimiter } from '../rate-limit.js';

const router = Router();
// Public access: /book is a public route in the SPA, so conversation create /
// resume / message-post must work without auth. Authenticated users own their
// conversations by email; anonymous conversations are owned by a NULL
// created_by and can only be accessed by callers that know the conversation
// UUID (treated as a bearer token for that session).

const createConversationSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.any()).optional(),
}).passthrough();

const messageSchema = z.object({
  // Client-facing message creation is restricted to user turns. Assistant and
  // tool turns are only ever inserted by the server itself; accepting them
  // here would let a caller forge agent history and steer future tool calls.
  role: z.literal('user').default('user'),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

const DEFAULT_AGENT = 'booking_assistant';
const MAX_HISTORY = 40;

const conversationLimiter = createRateLimiter({
  namespace: 'agents:conversation',
  windowMs: 60_000,
  max: Number(process.env.AGENT_RATE_LIMIT_PER_MIN || 20),
  keyFn: (req) => req.user?.id || req.ip,
});

const messageLimiter = createRateLimiter({
  namespace: 'agents:message',
  windowMs: 60_000,
  max: Number(process.env.AGENT_MESSAGE_RATE_LIMIT_PER_MIN || 30),
  keyFn: (req) => req.user?.id || req.ip,
});

const insertMessage = async (conversationId, role, content, metadata = {}) => {
  const { rows } = await query(
    `INSERT INTO agent_messages (conversation_id, role, content, metadata)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [conversationId, role, content, JSON.stringify(metadata || {})]
  );
  return rows[0];
};

const loadConversationHistory = async (conversationId) => {
  const { rows } = await query(
    `SELECT role, content, metadata
       FROM agent_messages
      WHERE conversation_id = $1
      ORDER BY created_date ASC`,
    [conversationId]
  );
  return rows;
};

const toChatMessages = (agent, history) => {
  const messages = [{ role: 'system', content: agent.systemPrompt }];
  const trimmed = history.slice(-MAX_HISTORY);
  for (const row of trimmed) {
    if (row.role === 'system') continue;
    const meta = row.metadata || {};
    if (row.role === 'assistant' && Array.isArray(meta.tool_calls) && meta.tool_calls.length) {
      messages.push({
        role: 'assistant',
        content: row.content || '',
        tool_calls: meta.tool_calls,
      });
      if (Array.isArray(meta.tool_results)) {
        for (const tr of meta.tool_results) {
          messages.push({
            role: 'tool',
            tool_call_id: tr.tool_call_id,
            content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content),
          });
        }
      }
    } else {
      messages.push({ role: row.role, content: row.content });
    }
  }
  return messages;
};

const loadOwnedConversation = async (id, user) => {
  const { rows } = await query(
    `SELECT * FROM agent_conversations WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const conv = rows[0];
  if (!conv) throw new HttpError(404, 'Not Found');
  if (user) {
    if (user.role !== 'admin' && conv.created_by !== user.email) {
      throw new HttpError(404, 'Not Found');
    }
  } else {
    // Anonymous caller may only access conversations created anonymously.
    if (conv.created_by !== null) {
      throw new HttpError(404, 'Not Found');
    }
  }
  return conv;
};

router.post('/conversations', conversationLimiter, async (req, res, next) => {
  try {
    const data = createConversationSchema.parse(req.body || {});
    const metadata = { agent: DEFAULT_AGENT, ...(data.metadata || {}) };
    const { rows } = await query(
      `INSERT INTO agent_conversations (title, metadata, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.title || null, JSON.stringify(metadata), req.user?.email || null]
    );
    res.status(201).json({ ...rows[0], messages: [] });
  } catch (err) { next(err); }
});

router.get('/conversations', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { rows } = await query(
      `SELECT * FROM agent_conversations
        WHERE deleted_at IS NULL AND created_by = $1
        ORDER BY created_date DESC`,
      [req.user.email]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/conversations/:id', async (req, res, next) => {
  try {
    const conv = await loadOwnedConversation(req.params.id, req.user);
    const { rows: messages } = await query(
      `SELECT * FROM agent_messages WHERE conversation_id = $1 ORDER BY created_date ASC`,
      [req.params.id]
    );
    res.json({ ...conv, messages });
  } catch (err) { next(err); }
});

const runAgentTurn = async ({ agent, conversation, user, onDelta }) => {
  if (!isOpenAIConfigured()) {
    throw new HttpError(503, 'AI assistant is not configured. Set OPENAI_API_KEY on the server.');
  }
  const openai = getOpenAI();
  const tools = Array.isArray(agent.tools) && agent.tools.length ? agent.tools : undefined;
  const model = agent.model || DEFAULT_MODEL;
  const maxRounds = agent.maxToolRounds || 5;

  for (let round = 0; round < maxRounds; round += 1) {
    const history = await loadConversationHistory(conversation.id);
    const chatMessages = toChatMessages(agent, history);

    const streaming = Boolean(onDelta);
    let assistantText = '';
    const toolCallMap = new Map(); // index -> { id, function: { name, arguments } }

    if (streaming) {
      const stream = await openai.chat.completions.create({
        model,
        messages: chatMessages,
        tools,
        stream: true,
      });
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;
        if (typeof delta.content === 'string' && delta.content.length) {
          assistantText += delta.content;
          onDelta({ type: 'token', delta: delta.content });
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            const existing = toolCallMap.get(idx) || {
              id: '', type: 'function', function: { name: '', arguments: '' },
            };
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.function.name += tc.function.name;
            if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            toolCallMap.set(idx, existing);
          }
        }
      }
    } else {
      const completion = await openai.chat.completions.create({
        model,
        messages: chatMessages,
        tools,
        stream: false,
      });
      const message = completion.choices?.[0]?.message;
      assistantText = message?.content || '';
      if (Array.isArray(message?.tool_calls)) {
        message.tool_calls.forEach((tc, i) => toolCallMap.set(i, tc));
      }
    }

    const toolCalls = Array.from(toolCallMap.values()).filter((t) => t.function?.name);

    if (toolCalls.length === 0) {
      const saved = await insertMessage(conversation.id, 'assistant', assistantText || '', {});
      return saved;
    }

    // Execute tool calls and persist them as a single assistant turn,
    // followed by tool result messages stored alongside.
    const toolResults = [];
    for (const tc of toolCalls) {
      let parsedArgs = {};
      try { parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}; }
      catch { parsedArgs = {}; }
      if (onDelta) onDelta({ type: 'tool_call', name: tc.function.name, arguments: parsedArgs });
      let result;
      try {
        result = await runTool(tc.function.name, parsedArgs, { user, conversation });
      } catch (err) {
        result = { ok: false, error: 'tool_execution_failed', message: err.message };
      }
      if (onDelta) onDelta({ type: 'tool_result', name: tc.function.name, result });
      toolResults.push({ tool_call_id: tc.id, content: JSON.stringify(result) });
    }

    await insertMessage(conversation.id, 'assistant', assistantText || '', {
      tool_calls: toolCalls,
      tool_results: toolResults,
    });
    // Loop: feed tool results back to the model for the next turn.
  }
  // Safety fallback
  const fallback = await insertMessage(
    conversation.id,
    'assistant',
    "Sorry — I'm having trouble completing that request. Could you try rephrasing?",
    { fallback: 'max_tool_rounds' }
  );
  return fallback;
};

router.post('/conversations/:id/messages', messageLimiter, async (req, res, next) => {
  try {
    const data = messageSchema.parse(req.body);
    const conv = await loadOwnedConversation(req.params.id, req.user);
    const agent = loadAgent(
      (conv.metadata && conv.metadata.agent) || DEFAULT_AGENT
    );

    const wantsStream =
      String(req.query.stream || '') === '1' ||
      String(req.query.stream || '').toLowerCase() === 'true' ||
      (req.headers.accept || '').includes('text/event-stream');

    // Hard precondition checks happen BEFORE we persist the user message so a
    // failure can be safely retried via the non-stream JSON endpoint without
    // creating a duplicate user turn.
    if (!isOpenAIConfigured()) {
      return res.status(503).json({
        error: 'AI assistant is not configured. Set OPENAI_API_KEY on the server.',
      });
    }

    // Persist the user message now that we know the agent will run.
    const userMessage = await insertMessage(
      conv.id, data.role, data.content, data.metadata || {}
    );

    if (wantsStream) {
      // Streaming contract: on a ?stream=1 request the server MUST respond
      // with text/event-stream (or have already failed before persistence
      // above). The client uses Content-Type to decide whether the user
      // message was persisted, so we must not switch transports mid-flight.
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();
      const send = (event, payload) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };
      send('user_message', userMessage);
      try {
        const assistant = await runAgentTurn({
          agent,
          conversation: conv,
          user: req.user,
          onDelta: (d) => send(d.type, d),
        });
        send('assistant_message', assistant);
        send('done', { ok: true });
      } catch (err) {
        send('error', { error: err.message || 'Agent error' });
      } finally {
        res.end();
      }
      return;
    }

    const assistant = await runAgentTurn({
      agent,
      conversation: conv,
      user: req.user,
      onDelta: null,
    });
    res.status(201).json(assistant);
  } catch (err) { next(err); }
});

export default router;
