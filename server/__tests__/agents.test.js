import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { initTestDb } from './test-db.js';

// Mock OpenAI BEFORE importing the app so the agents route picks up the stub.
const chatCreate = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn(function MockOpenAI() {
    this.chat = { completions: { create: chatCreate } };
  }),
}));

// Force the openai-client to consider itself configured.
process.env.OPENAI_API_KEY = 'sk-test-agents';

const { createApp } = await import('../app.js');

describe('agents proxy route', () => {
  let teardown;
  let app;

  beforeAll(async () => {
    teardown = await initTestDb();
    app = createApp();
  });

  afterAll(async () => { await teardown(); });

  test('creates an anonymous conversation', async () => {
    const res = await request(app).post('/api/agents/conversations').send({});
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.created_by).toBeNull();
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  test('posting a user message proxies to OpenAI and returns the assistant reply', async () => {
    chatCreate.mockResolvedValueOnce({
      choices: [{ message: { role: 'assistant', content: 'Hello from mock model!' } }],
    });

    const conv = await request(app).post('/api/agents/conversations').send({});
    const convId = conv.body.id;

    const res = await request(app)
      .post(`/api/agents/conversations/${convId}/messages`)
      .send({ role: 'user', content: 'Hi there' });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('assistant');
    expect(res.body.content).toBe('Hello from mock model!');
    expect(chatCreate).toHaveBeenCalledTimes(1);

    const callArgs = chatCreate.mock.calls[0][0];
    expect(callArgs.stream).toBe(false);
    // The system prompt + the user turn must be forwarded to the model.
    const roles = callArgs.messages.map((m) => m.role);
    expect(roles[0]).toBe('system');
    expect(roles).toContain('user');

    // The conversation now has both turns persisted.
    const fetched = await request(app).get(`/api/agents/conversations/${convId}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.messages.length).toBe(2);
  });

  test('returns 503 when OpenAI is not configured', async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const conv = await request(app).post('/api/agents/conversations').send({});
      const res = await request(app)
        .post(`/api/agents/conversations/${conv.body.id}/messages`)
        .send({ role: 'user', content: 'hi' });
      expect(res.status).toBe(503);
    } finally {
      process.env.OPENAI_API_KEY = original;
    }
  });

  test('rejects non-user roles via schema validation', async () => {
    const conv = await request(app).post('/api/agents/conversations').send({});
    const res = await request(app)
      .post(`/api/agents/conversations/${conv.body.id}/messages`)
      .send({ role: 'assistant', content: 'sneaky' });
    expect(res.status).toBe(400);
  });
});
