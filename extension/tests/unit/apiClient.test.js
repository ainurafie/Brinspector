import { summarizeError, checkHealth, DEFAULT_API_BASE_URL } from '../../src/lib/apiClient.js';

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('summarizeError', () => {
  test('POSTs the payload as JSON to /api/summarize', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { summary: 'ok', provider: 'mock' }));
    const payload = { error: { status: 500 } };

    const result = await summarizeError(payload, { baseUrl: 'http://localhost:3000', fetchImpl });

    expect(result).toEqual({ summary: 'ok', provider: 'mock' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/summarize');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  test('defaults to DEFAULT_API_BASE_URL when no baseUrl is given', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, {}));
    await summarizeError({ error: {} }, { fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe(`${DEFAULT_API_BASE_URL}/api/summarize`);
  });

  test('rejects with the backend message on 4xx/5xx responses (F-002 friendly error)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(422, { message: 'error.url is required' }));
    await expect(summarizeError({ error: {} }, { fetchImpl })).rejects.toThrow('error.url is required');
  });

  test('falls back to a generic message when the error body has none', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(502, {}));
    await expect(summarizeError({ error: {} }, { fetchImpl })).rejects.toThrow('Backend responded with 502');
  });

  test('reports "unreachable" when the backend cannot be contacted', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(summarizeError({ error: {} }, { baseUrl: 'http://localhost:3000', fetchImpl })).rejects.toThrow(
      'Backend unreachable at http://localhost:3000',
    );
  });

  test('reports "timeout" when the request is aborted', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetchImpl = jest.fn().mockRejectedValue(abortError);
    await expect(summarizeError({ error: {} }, { baseUrl: 'http://localhost:3000', fetchImpl })).rejects.toThrow(
      'Backend timeout at http://localhost:3000',
    );
  });
});

describe('checkHealth', () => {
  test('resolves ok:true with the active provider', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { status: 'ok', provider: 'mock' }));
    expect(await checkHealth({ fetchImpl })).toEqual({ ok: true, provider: 'mock' });
  });

  test('resolves ok:false when the body status is not "ok"', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { status: 'degraded' }));
    expect(await checkHealth({ fetchImpl })).toEqual({ ok: false, provider: undefined });
  });

  test('resolves ok:false on a non-2xx response instead of throwing', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(503, {}));
    expect(await checkHealth({ fetchImpl })).toEqual({ ok: false });
  });

  test('resolves ok:false when the backend is unreachable, never throws', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(checkHealth({ fetchImpl })).resolves.toEqual({ ok: false });
  });
});
