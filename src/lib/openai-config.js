const pick = (...values) => values.find((value) => typeof value === 'string' && value.trim().length > 0) || '';

export const openAIConfig = {
  projectName: pick(import.meta.env.VITE_OPENAI_PROJECT_NAME, import.meta.env.VITE_PROJECT_NAME),
  projectId: pick(import.meta.env.VITE_OPENAI_PROJECT_ID, import.meta.env.VITE_PROJECT_ID),
  // NOTE: API keys should be injected server-side. This is optional and intended only for local/dev relay use.
  apiKey: pick(import.meta.env.VITE_OPENAI_API_KEY)
};

export const hasOpenAIProjectConfig = Boolean(openAIConfig.projectName && openAIConfig.projectId);
