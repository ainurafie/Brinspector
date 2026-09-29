// Thin client for the BRINSPECTOR backend. fetchImpl is injectable for unit tests.

export const DEFAULT_API_BASE_URL = 'http://localhost:3000';

export async function summarizeError(
  payload,
  { baseUrl = DEFAULT_API_BASE_URL, fetchImpl = globalThis.fetch, timeoutMs = 25000 } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(`${baseUrl}/api/summarize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'unreachable';
    throw new Error(`Backend ${reason} at ${baseUrl}`);
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Backend responded with ${response.status}`);
  }
  return data;
}

/** Never throws: resolves to { ok: true, provider } or { ok: false }. */
export async function checkHealth({ baseUrl = DEFAULT_API_BASE_URL, fetchImpl = globalThis.fetch, timeoutMs = 3000 } = {}) {
  try {
    const response = await fetchImpl(`${baseUrl}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return { ok: false };
    const data = await response.json();
    return { ok: data.status === 'ok', provider: data.provider };
  } catch {
    return { ok: false };
  }
}
