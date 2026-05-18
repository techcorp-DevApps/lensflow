const pick = (...values) => values.find((value) => typeof value === 'string' && value.trim().length > 0) || '';

// Non-secret config only. The OpenAI API key lives server-side and is never
// shipped in the client bundle. Project name/id are optional metadata that the
// server can use when routing requests; they are safe to expose.
export const openAIConfig = {
  projectName: pick(import.meta.env.VITE_OPENAI_PROJECT_NAME, import.meta.env.VITE_PROJECT_NAME),
  projectId: pick(import.meta.env.VITE_OPENAI_PROJECT_ID, import.meta.env.VITE_PROJECT_ID),
};

export const hasOpenAIProjectConfig = Boolean(openAIConfig.projectName && openAIConfig.projectId);
