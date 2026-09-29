import { buildSummarizePayload } from '../../src/lib/buildPayload.js';
import { summarizeError } from '../../src/lib/apiClient.js';
import { toErrorRecord } from '../../src/lib/errorFilter.js';
import { harEntry } from './fixtures.js';

const SECRET_TOKEN = 'super-secret-token-123';

function sampleRecord() {
  const record = toErrorRecord(
    harEntry({
      status: 500,
      method: 'POST',
      url: `https://bank.example/api/transfer?token=${SECRET_TOKEN}`,
      requestHeaders: [
        { name: 'Authorization', value: `Bearer ${SECRET_TOKEN}` },
        { name: 'Cookie', value: `sid=${SECRET_TOKEN}` },
      ],
      postData: JSON.stringify({ amount: 100000, password: SECRET_TOKEN }),
    }),
    1,
  );
  record.responseBody = '{"message":"NullPointerException at TransferService.java:42"}';
  return record;
}

describe('buildSummarizePayload', () => {
  test('never contains the secret anywhere in the payload', () => {
    const payload = buildSummarizePayload(sampleRecord());
    expect(JSON.stringify(payload)).not.toContain(SECRET_TOKEN);
  });

  test('matches the API contract shape', () => {
    const payload = buildSummarizePayload(sampleRecord(), { language: 'en' });
    expect(payload.language).toBe('en');
    expect(Object.keys(payload.error).sort()).toEqual(
      [
        'durationMs',
        'errorText',
        'method',
        'requestBody',
        'requestHeaders',
        'resourceType',
        'responseBody',
        'responseHeaders',
        'status',
        'statusText',
        'url',
      ].sort(),
    );
    expect(payload.error.responseBody).toContain('NullPointerException');
  });
});

describe('summarizeError', () => {
  test('posts JSON to /api/summarize and returns the result', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ summary: 'ok', category: 'SERVER_ERROR' }),
    });
    const result = await summarizeError({ error: {} }, { baseUrl: 'http://api', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith('http://api/api/summarize', expect.objectContaining({ method: 'POST' }));
    expect(result.category).toBe('SERVER_ERROR');
  });

  test('surfaces the backend error message on 422', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ message: 'error.url is required' }),
    });
    await expect(summarizeError({}, { fetchImpl })).rejects.toThrow('error.url is required');
  });

  test('reports an unreachable backend clearly', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(summarizeError({}, { baseUrl: 'http://x', fetchImpl })).rejects.toThrow(
      'Backend unreachable at http://x',
    );
  });
});
