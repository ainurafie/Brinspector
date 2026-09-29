const { buildApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { createSummarizer } = require('../src/services/summarizer');

const validError = {
  method: 'POST',
  url: 'https://bank.example/api/transfer',
  status: 500,
  statusText: 'Internal Server Error',
  errorText: null,
  resourceType: 'fetch',
  durationMs: 812,
  requestHeaders: { authorization: '[REDACTED]' },
  responseHeaders: { 'content-type': 'application/json' },
  requestBody: '{"amount":100000}',
  responseBody: '{"message":"NullPointerException at TransferService.java:42"}',
};

function mockApp() {
  return buildApp({ config: loadConfig({ AI_PROVIDER: 'mock' }) });
}

describe('GET /health', () => {
  test('reports status and active provider', async () => {
    const res = await mockApp().inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', provider: 'mock' });
  });
});

describe('POST /api/summarize (mock provider)', () => {
  test('returns a contract-shaped summary', async () => {
    const res = await mockApp().inject({ method: 'POST', url: '/api/summarize', payload: { error: validError } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ category: 'SERVER_ERROR', severity: 'high', provider: 'mock' });
    expect(body.summary).toContain('NullPointerException');
    expect(body.summary).toContain('POST /api/transfer');
    expect(body.summary).not.toContain('bank.example');
    expect(body.summary).not.toMatch(/\.\.$/);
    expect(body.likelyCauses.length).toBeGreaterThan(0);
    expect(body.suggestedFixes.length).toBeGreaterThan(0);
  });

  test.each([
    [401, null, 'AUTH_ERROR'],
    [404, null, 'NOT_FOUND'],
    [0, 'net::ERR_NAME_NOT_RESOLVED', 'NETWORK_ERROR'],
  ])('status %i → %s category', async (status, errorText, category) => {
    const res = await mockApp().inject({
      method: 'POST',
      url: '/api/summarize',
      payload: { error: { ...validError, status, errorText, responseBody: null } },
    });
    expect(res.json().category).toBe(category);
  });

  test('answers in English when language=en', async () => {
    const res = await mockApp().inject({
      method: 'POST',
      url: '/api/summarize',
      payload: { language: 'en', error: validError },
    });
    expect(res.json().summary).toMatch(/^The server failed/);
  });

  test.each([
    ['missing error', {}],
    ['empty url', { error: { ...validError, url: '' } }],
    ['non-numeric status', { error: { ...validError, status: 'abc' } }],
    ['unsupported language', { language: 'fr', error: validError }],
  ])('%s → 422 with a message', async (_label, payload) => {
    const res = await mockApp().inject({ method: 'POST', url: '/api/summarize', payload });
    expect(res.statusCode).toBe(422);
    expect(res.json().message).toEqual(expect.any(String));
  });

  test('body over the limit → 413', async () => {
    const huge = { error: { ...validError, responseBody: 'x'.repeat(70 * 1024) } };
    const res = await mockApp().inject({ method: 'POST', url: '/api/summarize', payload: huge });
    expect(res.statusCode).toBe(413);
  });
});

describe('POST /api/summarize (real provider, faked fetch)', () => {
  const azureConfig = loadConfig({
    AI_PROVIDER: 'azure',
    AI_BASE_URL: 'https://example.openai.azure.com/openai/v1/',
    AI_API_KEY: 'test-key',
    AI_MODEL: 'small-model',
  });

  function appWithFetch(fetchImpl) {
    return buildApp({ config: azureConfig, summarizer: createSummarizer(azureConfig, { fetchImpl }) });
  }

  test('calls the chat completions endpoint with the api-key header', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: 'Ringkas', category: 'SERVER_ERROR', severity: 'high', likelyCauses: ['a'], suggestedFixes: ['b'] }) } }],
      }),
    });
    const res = await appWithFetch(fetchImpl).inject({ method: 'POST', url: '/api/summarize', payload: { error: validError } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ summary: 'Ringkas', provider: 'azure' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://example.openai.azure.com/openai/v1/chat/completions');
    expect(init.headers['api-key']).toBe('test-key');
    expect(JSON.parse(init.body).model).toBe('small-model');
  });

  test('non-JSON model output is wrapped instead of crashing', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Server error, check logs.' } }] }),
    });
    const res = await appWithFetch(fetchImpl).inject({ method: 'POST', url: '/api/summarize', payload: { error: validError } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ summary: 'Server error, check logs.', category: 'UNKNOWN' });
  });

  test('provider failure → 502 without leaking internals', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const res = await appWithFetch(fetchImpl).inject({ method: 'POST', url: '/api/summarize', payload: { error: validError } });
    expect(res.statusCode).toBe(502);
    expect(res.json().message).toBe('AI provider responded with 429');
    expect(res.body).not.toContain('test-key');
  });

  test('network failure to provider → 502', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('fetch failed'));
    const res = await appWithFetch(fetchImpl).inject({ method: 'POST', url: '/api/summarize', payload: { error: validError } });
    expect(res.statusCode).toBe(502);
  });
});
