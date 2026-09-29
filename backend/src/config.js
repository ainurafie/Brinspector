const PROVIDERS = ['mock', 'azure', 'openai'];

function loadConfig(env = process.env) {
  const provider = (env.AI_PROVIDER || 'mock').toLowerCase();
  if (!PROVIDERS.includes(provider)) {
    throw new Error(`AI_PROVIDER must be one of: ${PROVIDERS.join(', ')}`);
  }
  if (provider !== 'mock') {
    const missing = ['AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL'].filter((name) => !env[name]);
    if (missing.length) throw new Error(`Missing env for AI_PROVIDER=${provider}: ${missing.join(', ')}`);
  }
  return {
    port: Number(env.PORT) || 3000,
    provider,
    baseUrl: (env.AI_BASE_URL || '').replace(/\/+$/, ''),
    apiKey: env.AI_API_KEY || '',
    model: env.AI_MODEL || '',
    timeoutMs: Number(env.AI_TIMEOUT_MS) || 20000,
    bodyLimitBytes: 64 * 1024,
  };
}

module.exports = { loadConfig, PROVIDERS };
