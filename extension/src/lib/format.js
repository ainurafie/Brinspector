// Display helpers for the panel. Pure functions — covered by tests/unit/format.test.js.

const STATUS_SHORT = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Not Allowed',
  408: 'Timeout',
  409: 'Conflict',
  410: 'Gone',
  413: 'Too Large',
  415: 'Bad Media Type',
  422: 'Unprocessable',
  429: 'Rate Limited',
  500: 'Server Err',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Unavailable',
  504: 'Gateway T/O',
};

/** 812 → "812ms", 15002 → "15.0s". */
export function formatLatency(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value <= 0) return '0ms';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

/** 1420 → "1,420ms" (used in the failure stream). */
export function formatDuration(ms) {
  const value = Math.round(Number(ms) || 0);
  return `${value.toLocaleString('en-US')}ms`;
}

/** "https://a.com/api/x?y=1" → "/api/x?y=1". Falls back to the input for relative/invalid URLs. */
export function urlPath(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return String(url || '');
  }
}

export function urlHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/** "net::ERR_NAME_NOT_RESOLVED" → "ERR_NAME_NOT_RESOLVED". */
export function shortNetError(errorText) {
  return String(errorText || 'Network error').replace(/^net::/i, '');
}

/** Short status label for badges and the stream, e.g. "500 Server Err", "ERR_FAILED". */
export function describeStatus(record) {
  if (!record.status) return shortNetError(record.errorText);
  const label = STATUS_SHORT[record.status] || record.statusText || 'Error';
  return `${record.status} ${label}`;
}

/** Pretty-print JSON bodies; return other text unchanged. */
export function formatBody(body) {
  if (body === null || body === undefined) return null;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return String(body);
  }
}
