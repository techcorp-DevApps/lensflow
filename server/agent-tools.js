import { query } from './db.js';
import { randomUUID } from 'node:crypto';

const SESSION_TYPES = ['portrait', 'wedding', 'family', 'newborn', 'maternity', 'event', 'commercial', 'headshot'];

// Legacy: schemas now live in agents/booking_assistant/config.json and are
// consumed via the agent loader. This export remains for any callers that want
// a programmatic fallback when the spec file is missing.
export const bookingToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description:
        'Check whether the studio already has bookings on a given date. Returns a list of existing booking time slots so the assistant can propose alternatives if needed.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Target date in YYYY-MM-DD format (e.g. 2026-06-01).',
          },
        },
        required: ['date'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_booking',
      description:
        'Produce a normalized draft of the booking the client wants. Use this before submitting so the client can review and confirm. Does not persist anything.',
      parameters: {
        type: 'object',
        properties: {
          client_name: { type: 'string' },
          client_email: { type: 'string' },
          client_phone: { type: 'string' },
          session_type: { type: 'string', enum: SESSION_TYPES },
          session_date: {
            type: 'string',
            description: 'ISO-8601 date-time string for the requested session start (e.g. 2026-06-01T10:00:00.000Z).',
          },
          location: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['client_name', 'client_email', 'session_type', 'session_date'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'submit_booking_request',
      description:
        'Create a booking record with status "pending" after the client has explicitly confirmed the details. Only call this once per conversation and only after explicit confirmation.',
      parameters: {
        type: 'object',
        properties: {
          client_name: { type: 'string' },
          client_email: { type: 'string' },
          client_phone: { type: 'string' },
          session_type: { type: 'string', enum: SESSION_TYPES },
          session_date: {
            type: 'string',
            description: 'ISO-8601 date-time string for the requested session start.',
          },
          location: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['client_name', 'client_email', 'session_type', 'session_date'],
        additionalProperties: false,
      },
    },
  },
];

const parseDateOnly = (s) => {
  // Accept YYYY-MM-DD; build a UTC day window.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  if (!m) return null;
  const start = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

const runCheckAvailability = async ({ date }) => {
  const range = parseDateOnly(date);
  if (!range) {
    return { ok: false, error: 'invalid_date', message: 'Date must be in YYYY-MM-DD format.' };
  }
  const { rows } = await query(
    `SELECT id, session_type, session_date, status
       FROM bookings
      WHERE deleted_at IS NULL
        AND status IN ('pending','confirmed','contract_sent','contract_signed')
        AND session_date >= $1 AND session_date < $2
      ORDER BY session_date ASC`,
    [range.start.toISOString(), range.end.toISOString()]
  );
  return {
    ok: true,
    date,
    booked_slots: rows.map((r) => ({
      session_type: r.session_type,
      session_date: r.session_date,
      status: r.status,
    })),
    available: rows.length === 0,
  };
};

const runDraftBooking = async (args) => {
  return {
    ok: true,
    draft: {
      client_name: args.client_name,
      client_email: args.client_email,
      client_phone: args.client_phone || null,
      session_type: args.session_type,
      session_date: args.session_date,
      location: args.location || null,
      notes: args.notes || null,
      status: 'pending',
    },
    message: 'Draft ready. Show this to the client and ask them to confirm before submitting.',
  };
};

const CORE_BOOKING_FIELDS = ['client_name', 'client_email', 'session_type', 'session_date'];

const normalizeForCompare = (value, key) => {
  if (value === undefined || value === null) return null;
  if (key === 'client_email') return String(value).trim().toLowerCase();
  if (key === 'session_date') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value).trim() : d.toISOString();
  }
  return String(value).trim();
};

const findLatestDraft = async (conversationId) => {
  const { rows } = await query(
    `SELECT metadata FROM agent_messages
      WHERE conversation_id = $1 AND role = 'assistant'
      ORDER BY created_date DESC`,
    [conversationId]
  );
  for (const row of rows) {
    const meta = row.metadata || {};
    const results = Array.isArray(meta.tool_results) ? meta.tool_results : [];
    const calls = Array.isArray(meta.tool_calls) ? meta.tool_calls : [];
    for (const r of results) {
      const call = calls.find((c) => c.id === r.tool_call_id);
      if (call?.function?.name !== 'draft_booking') continue;
      let parsed = null;
      try { parsed = typeof r.content === 'string' ? JSON.parse(r.content) : r.content; }
      catch { parsed = null; }
      const draft = parsed?.draft;
      if (draft) {
        return { draft, draftMessageMeta: meta, drafted: true };
      }
    }
  }
  return null;
};

const userConfirmedAfterDraft = async (conversationId) => {
  // Find the timestamp of the most recent draft_booking assistant turn, then
  // require at least one subsequent user message (the confirmation turn).
  const { rows: drafts } = await query(
    `SELECT id, created_date FROM agent_messages
      WHERE conversation_id = $1 AND role = 'assistant'
        AND metadata::text LIKE '%"draft_booking"%'
      ORDER BY created_date DESC LIMIT 1`,
    [conversationId]
  );
  const draftRow = drafts[0];
  if (!draftRow) return false;
  const { rows: users } = await query(
    `SELECT id FROM agent_messages
      WHERE conversation_id = $1 AND role = 'user' AND created_date > $2
      LIMIT 1`,
    [conversationId, draftRow.created_date]
  );
  return users.length > 0;
};

const runSubmitBookingRequest = async (args, ctx) => {
  if (!SESSION_TYPES.includes(args.session_type)) {
    return { ok: false, error: 'invalid_session_type' };
  }
  const sessionDate = new Date(args.session_date);
  if (Number.isNaN(sessionDate.getTime())) {
    return { ok: false, error: 'invalid_session_date' };
  }

  const conversationId = ctx?.conversation?.id;
  if (!conversationId) {
    return { ok: false, error: 'missing_conversation_context' };
  }

  // Idempotency: at most one booking per conversation. The booking id is
  // recorded on the conversation row at first successful insert.
  const conv = ctx.conversation;
  if (conv?.metadata?.booking_submitted_id) {
    return {
      ok: false,
      error: 'already_submitted',
      booking_id: conv.metadata.booking_submitted_id,
      message:
        'A booking request has already been submitted for this conversation. Do not call submit_booking_request again.',
    };
  }

  // Confirmation gate (1): require a prior draft_booking with matching core fields.
  const draftResult = await findLatestDraft(conversationId);
  if (!draftResult) {
    return {
      ok: false,
      error: 'confirmation_required',
      message:
        'You must call draft_booking first, present the draft to the client, and wait for explicit confirmation before calling submit_booking_request.',
    };
  }
  const { draft } = draftResult;
  for (const key of CORE_BOOKING_FIELDS) {
    if (normalizeForCompare(args[key], key) !== normalizeForCompare(draft[key], key)) {
      return {
        ok: false,
        error: 'draft_mismatch',
        field: key,
        message:
          `Field "${key}" does not match the most recent draft_booking. Re-run draft_booking with the corrected values, present it to the client, and wait for confirmation before submitting.`,
      };
    }
  }

  // Confirmation gate (2): require at least one user turn after the draft.
  const confirmed = await userConfirmedAfterDraft(conversationId);
  if (!confirmed) {
    return {
      ok: false,
      error: 'awaiting_user_confirmation',
      message:
        'The client has not confirmed the draft yet. Ask them to confirm in their next message, then call submit_booking_request.',
    };
  }

  const accessToken = randomUUID();
  const { rows } = await query(
    `INSERT INTO bookings
       (client_name, client_email, client_phone, session_type, session_date,
        location, notes, status, access_token, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9)
     RETURNING id, client_name, client_email, session_type, session_date, status, access_token, created_date`,
    [
      args.client_name,
      args.client_email,
      args.client_phone || null,
      args.session_type,
      sessionDate.toISOString(),
      args.location || null,
      args.notes || null,
      accessToken,
      ctx?.user?.email || null,
    ]
  );
  const booking = rows[0];

  // Record on the conversation for idempotency. Merge into existing metadata.
  const newMeta = { ...(conv.metadata || {}), booking_submitted_id: booking.id };
  await query(
    `UPDATE agent_conversations
        SET metadata = $1, updated_date = NOW()
      WHERE id = $2`,
    [JSON.stringify(newMeta), conversationId]
  );
  // Mutate the in-memory conversation so subsequent rounds in the same turn
  // also see the flag.
  if (ctx.conversation) ctx.conversation.metadata = newMeta;

  return { ok: true, booking };
};

export const runTool = async (name, args, ctx) => {
  switch (name) {
    case 'check_availability': return runCheckAvailability(args);
    case 'draft_booking': return runDraftBooking(args);
    case 'submit_booking_request': return runSubmitBookingRequest(args, ctx);
    default: return { ok: false, error: 'unknown_tool', name };
  }
};
