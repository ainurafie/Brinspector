const { loadConfig } = require('../src/config');
const { createSummarizer, normalizeSummary } = require('../src/services/summarizer');
const { redactRecord } = require('../src/services/redact');

const sensitiveError = {
  method: 'POST',
  url: 'https://bank.example/transfer?access_token=raw-query-token',
  status: 500,
  statusText: 'Internal Server Error',
  errorText: 'Contact jane@example.com; Bearer raw-error-token',
  resourceType: 'fetch',
  durationMs: 100,
  requestHeaders: { authorization: 'raw-header-token', 'x-api-key': 'raw-api-key' },
  responseHeaders: null,
  requestBody: JSON.stringify({ user: { Password: 'raw-body-password' } }),
  responseBody: 'Phone 0812-3456-7890, NIK 3175061205900001, card 4111 1111-1111 1111',
};

describe('loadConfig', () => {
  test('defaults to mock provider on port 3000', () => {
    expect(loadConfig({})).toMatchObject({ provider: 'mock', port: 3000 });
  });

  test('rejects unknown providers', () => {
    expect(() => loadConfig({ AI_PROVIDER: 'magic' })).toThrow('AI_PROVIDER must be one of');
  });

  test('requires credentials for real providers', () => {
    expect(() => loadConfig({ AI_PROVIDER: 'openai' })).toThrow('AI_BASE_URL, AI_API_KEY, AI_MODEL');
  });
});

describe('normalizeSummary', () => {
  test('maps unknown category/severity to safe defaults', () => {
    const result = normalizeSummary({ summary: 'x', category: 'WEIRD', severity: 'extreme' }, 'openai');
    expect(result).toMatchObject({ category: 'UNKNOWN', severity: 'medium', provider: 'openai' });
  });

  test('drops non-string list items and caps lists at 5', () => {
    const result = normalizeSummary({ summary: 'x', likelyCauses: ['a', 1, '', 'b', 'c', 'd', 'e', 'f'] }, 'mock');
    expect(result.likelyCauses).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('empty payload still yields a valid contract', () => {
    expect(normalizeSummary(null, 'mock')).toEqual({
      summary: 'No summary available.',
      category: 'UNKNOWN',
      likelyCauses: [],
      suggestedFixes: [],
      severity: 'medium',
      provider: 'mock',
    });
  });
});

describe('createSummarizer redaction', () => {
  test('redacts header, query, and nested JSON secrets and truncates bodies', () => {
    const error = {
      url: 'https://bank.example/users?TOKEN=query-secret&Access_Token=access-secret&page=1#top',
      requestHeaders: {
        Cookie: 'cookie-secret',
        'proxy-authorization': 'proxy-secret',
        'set-cookie': 'set-cookie-secret',
        'x-auth-token': 'auth-secret',
        'x-csrf-token': 'csrf-secret',
      },
      responseHeaders: null,
      requestBody: JSON.stringify({ user: { Client_Secret: 'nested-secret' } }),
      responseBody: 'x'.repeat(5000),
    };
    const original = JSON.parse(JSON.stringify(error));
    const redacted = redactRecord(error);

    expect(redacted.url).toBe('https://bank.example/users?TOKEN=[REDACTED]&Access_Token=[REDACTED]&page=1#top');
    expect(Object.values(redacted.requestHeaders)).toEqual(Array(5).fill('[REDACTED]'));
    expect(redacted.responseHeaders).toBeNull();
    expect(JSON.parse(redacted.requestBody).user.Client_Secret).toBe('[REDACTED]');
    expect(redacted.responseBody).toBe(`${'x'.repeat(4000)}…[truncated]`);
    expect(error).toEqual(original);
  });

  test('redacts sensitive input before sending it to the provider', async () => {
    const original = JSON.parse(JSON.stringify(sensitiveError));
    let providerBody;
    const fetchImpl = jest.fn(async (_url, options) => {
      providerBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"summary":"ok"}' } }] }),
      };
    });
    const summarizer = createSummarizer({
      provider: 'openai',
      baseUrl: 'https://provider.example/v1',
      apiKey: 'provider-key',
      model: 'small-model',
      timeoutMs: 1000,
    }, { fetchImpl });

    await summarizer.summarize(sensitiveError);

    const userMessage = providerBody.messages.find((message) => message.role === 'user').content;
    const sentError = JSON.parse(userMessage.slice('Failed request:\n'.length));
    expect(sentError.requestHeaders).toEqual({ authorization: '[REDACTED]', 'x-api-key': '[REDACTED]' });
    expect(sentError.url).toContain('access_token=[REDACTED]');
    expect(sentError.requestBody).toContain('"Password":"[REDACTED]"');
    expect(sentError.errorText).toBe('Contact [REDACTED]; Bearer [REDACTED]');
    expect(sentError.responseBody).toBe(
      'Phone [REDACTED], NIK [REDACTED], card [REDACTED]',
    );
    expect(userMessage).not.toMatch(/raw-query-token|raw-header-token|raw-api-key|raw-body-password|jane@example\.com|raw-error-token/);
    expect(sensitiveError).toEqual(original);
  });
});
