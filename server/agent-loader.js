import fs from 'node:fs';
import path from 'node:path';

const AGENT_ROOT = path.resolve('agents');

const readIfExists = (p) => {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
};

const readJsonIfExists = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
};

const cache = new Map();

export const loadAgent = (name) => {
  if (cache.has(name)) return cache.get(name);

  const dir = path.join(AGENT_ROOT, name);
  if (!fs.existsSync(dir)) {
    throw new Error(`Agent not found: ${name}`);
  }

  const description = readIfExists(path.join(dir, 'guidelines', 'description.md')).trim();
  const instructions = readIfExists(path.join(dir, 'guidelines', 'instructions.md')).trim();
  const memoryScope = readJsonIfExists(path.join(dir, 'memory', 'memory-scope.json'));
  const entityTool = readIfExists(path.join(dir, 'tools', 'entity-tool.md')).trim();
  const config = readJsonIfExists(path.join(dir, 'config.json')) || {};

  const systemPrompt = [
    instructions,
    description ? `\nContext: ${description}` : '',
  ].filter(Boolean).join('\n').trim();

  const agent = {
    name,
    description,
    instructions,
    systemPrompt,
    memoryScope,
    entityTool,
    tools: Array.isArray(config.tools) ? config.tools : [],
    model: typeof config.model === 'string' && config.model ? config.model : null,
    maxToolRounds:
      typeof config.max_tool_rounds === 'number' && config.max_tool_rounds > 0
        ? config.max_tool_rounds
        : 5,
  };
  cache.set(name, agent);
  return agent;
};

export const clearAgentCache = () => cache.clear();
