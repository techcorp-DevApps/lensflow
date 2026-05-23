import { describe, test, expect, beforeEach, vi } from 'vitest';

describe('openai client', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.OPENAI_API_KEY;
  });

  test('isOpenAIConfigured reflects env var presence', async () => {
    const { isOpenAIConfigured } = await import('../openai-client.js');
    expect(isOpenAIConfigured()).toBe(false);
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(isOpenAIConfigured()).toBe(true);
  });

  test('assertOpenAIBoot throws in production without key', async () => {
    process.env.NODE_ENV = 'production';
    const { assertOpenAIBoot } = await import('../openai-client.js');
    expect(() => assertOpenAIBoot()).toThrow(/OPENAI_API_KEY/);
    process.env.NODE_ENV = 'test';
  });

  test('assertOpenAIBoot is silent outside production', async () => {
    process.env.NODE_ENV = 'test';
    const { assertOpenAIBoot } = await import('../openai-client.js');
    expect(() => assertOpenAIBoot()).not.toThrow();
  });

  test('getOpenAI throws without API key', async () => {
    const { getOpenAI } = await import('../openai-client.js');
    expect(() => getOpenAI()).toThrow(/OPENAI_API_KEY/);
  });

  test('getOpenAI returns a singleton client when key is set', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-123';
    vi.doMock('openai', () => ({
      default: vi.fn(function MockOpenAI(opts) { this.opts = opts; }),
    }));
    const { getOpenAI } = await import('../openai-client.js');
    const a = getOpenAI();
    const b = getOpenAI();
    expect(a).toBe(b);
    expect(a.opts.apiKey).toBe('sk-test-123');
    vi.doUnmock('openai');
  });
});
