const { buildMessages, CATEGORIES, SEVERITIES } = require('./prompt');

class ProviderError extends Error {}

function categorize(status, errorText = '') {
  const text = String(errorText || '').toUpperCase();
  if (text.includes('TIMED_OUT') || status === 408 || status === 504) return 'TIMEOUT';
  if (text.includes('CORS') || text.includes('BLOCKED_BY_RESPONSE')) return 'CORS_ERROR';
  if (status === 0 || text.startsWith('NET::')) return 'NETWORK_ERROR';
  if (status === 401 || status === 403) return 'AUTH_ERROR';
  if (status === 404 || status === 410) return 'NOT_FOUND';
  if (status >= 500) return 'SERVER_ERROR';
  if (status >= 400) return 'CLIENT_ERROR';
  return 'UNKNOWN';
}

const MOCK_TEXT = {
  id: {
    SERVER_ERROR: ['Server gagal memproses request', 'Bug atau exception di server', 'Periksa log server untuk endpoint ini', 'high'],
    AUTH_ERROR: ['Request ditolak karena autentikasi/otorisasi', 'Token kedaluwarsa atau hak akses kurang', 'Login ulang / perbarui token, cek role pengguna', 'medium'],
    NOT_FOUND: ['Resource atau endpoint tidak ditemukan', 'URL salah atau data sudah dihapus', 'Cocokkan URL dengan dokumentasi API', 'medium'],
    CLIENT_ERROR: ['Server menolak data yang dikirim', 'Payload tidak valid atau field wajib kosong', 'Bandingkan request body dengan skema API', 'medium'],
    NETWORK_ERROR: ['Browser tidak mendapat respons dari server', 'Server mati, DNS gagal, atau request dibatalkan', 'Cek koneksi, DNS, dan apakah server berjalan', 'high'],
    CORS_ERROR: ['Request diblokir oleh kebijakan CORS', 'Header Access-Control-Allow-Origin tidak sesuai', 'Tambahkan origin frontend ke konfigurasi CORS server', 'medium'],
    TIMEOUT: ['Request melebihi batas waktu', 'Server lambat atau proses terlalu berat', 'Profiling endpoint, tambah timeout, atau jadikan asynchronous', 'medium'],
    UNKNOWN: ['Request gagal dengan penyebab yang belum jelas', 'Data error kurang lengkap', 'Buka detail request dan cek log server', 'low'],
  },
  en: {
    SERVER_ERROR: ['The server failed to process the request', 'A bug or exception on the server', 'Check the server logs for this endpoint', 'high'],
    AUTH_ERROR: ['The request was rejected by authentication/authorization', 'Expired token or missing permission', 'Log in again / refresh the token, check user roles', 'medium'],
    NOT_FOUND: ['The resource or endpoint was not found', 'Wrong URL or deleted data', 'Compare the URL with the API documentation', 'medium'],
    CLIENT_ERROR: ['The server rejected the submitted data', 'Invalid payload or missing required field', 'Compare the request body with the API schema', 'medium'],
    NETWORK_ERROR: ['The browser got no response from the server', 'Server down, DNS failure, or request aborted', 'Check connectivity, DNS, and that the server is running', 'high'],
    CORS_ERROR: ['The request was blocked by CORS policy', 'Access-Control-Allow-Origin does not match', 'Add the frontend origin to the server CORS config', 'medium'],
    TIMEOUT: ['The request exceeded its time limit', 'Slow server or heavy processing', 'Profile the endpoint, raise the timeout, or make it async', 'medium'],
    UNKNOWN: ['The request failed for an unclear reason', 'Not enough error data', 'Open the request details and check server logs', 'low'],
  },
};

/** "https://a.com/x?y=1" → "/x?y=1"; keeps relative URLs as-is. */
function pathOf(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

/** Pull a short human message out of a response body, if there is one. */
function extractServerMessage(body) {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    const message = parsed.message || parsed.error || parsed.detail || parsed.title;
    return typeof message === 'string' ? message.slice(0, 200) : null;
  } catch {
    return null;
  }
}

function mockSummary(error, language = 'id') {
  const category = categorize(error.status, error.errorText);
  const text = MOCK_TEXT[language === 'en' ? 'en' : 'id'][category];
  const [headline, cause, fix, severity] = text;
  const detail = (extractServerMessage(error.responseBody) || error.errorText || '').replace(/[.\s]+$/, '');
  const statusPart = error.status ? `${error.status} ` : '';
  return {
    summary: `${headline} (${statusPart}${error.method} ${pathOf(error.url)})${detail ? `: ${detail}` : ''}.`,
    category,
    likelyCauses: [cause],
    suggestedFixes: [fix],
    severity,
  };
}

function toStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' && item.trim()).slice(0, 5);
}

/** Make whatever the model returned conform to the API contract. */
function normalizeSummary(raw, provider) {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { summary: raw };
    }
  }
  data = data && typeof data === 'object' ? data : {};
  return {
    summary: typeof data.summary === 'string' && data.summary.trim() ? data.summary.trim() : 'No summary available.',
    category: CATEGORIES.includes(data.category) ? data.category : 'UNKNOWN',
    likelyCauses: toStringList(data.likelyCauses),
    suggestedFixes: toStringList(data.suggestedFixes),
    severity: SEVERITIES.includes(data.severity) ? data.severity : 'medium',
    provider,
  };
}

async function callChatCompletion(config, messages, fetchImpl) {
  const headers = { 'content-type': 'application/json' };
  if (config.provider === 'azure') headers['api-key'] = config.apiKey;
  else headers.authorization = `Bearer ${config.apiKey}`;

  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: config.model, messages, response_format: { type: 'json_object' } }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (err) {
    throw new ProviderError(err?.name === 'TimeoutError' ? 'AI provider timed out' : 'AI provider unreachable');
  }
  if (!response.ok) throw new ProviderError(`AI provider responded with ${response.status}`);

  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new ProviderError('AI provider returned an unexpected response');
  return content;
}

function createSummarizer(config, { fetchImpl = globalThis.fetch } = {}) {
  return {
    provider: config.provider,
    async summarize(error, language = 'id') {
      if (config.provider === 'mock') return normalizeSummary(mockSummary(error, language), 'mock');
      const content = await callChatCompletion(config, buildMessages(error, language), fetchImpl);
      return normalizeSummary(content, config.provider);
    },
  };
}

module.exports = { createSummarizer, normalizeSummary, mockSummary, categorize, ProviderError };
