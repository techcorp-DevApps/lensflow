import OpenAI from 'openai';

let cached = null;

export const isOpenAIConfigured = () => Boolean(process.env.OPENAI_API_KEY);

export const getOpenAI = () => {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  cached = new OpenAI({
    apiKey,
    project: process.env.OPENAI_PROJECT_ID || undefined,
    organization: process.env.OPENAI_ORG_ID || undefined,
  });
  return cached;
};

export const assertOpenAIBoot = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY must be set in production');
  }
};

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
