// Pure helpers for turning Chrome HAR entries into error records.
// No chrome.* calls here, so everything is unit-testable (see tests/unit/errorFilter.test.js).

export const CATEGORIES = Object.freeze([
  'CLIENT_ERROR',
  'AUTH_ERROR',
  'NOT_FOUND',
  'SERVER_ERROR',
  'NETWORK_ERROR',
  'CORS_ERROR',
  'TIMEOUT',
  'UNKNOWN',
]);

/**
 * True when a status/errorText pair represents a failure: status >= 400, no response
 * at all (status 0), or a browser-level error. Shared with `webRequestClassify.js` so the
 * DevTools panel and the toolbar badge (F-005) never disagree on what "failed" means.
 */
export function isFailedStatus(status, errorText) {
  if (errorText) return true;
  const value = Number(status);
  if (value === 0) return true;
  return value >= 400;
}

/** A request "failed" when the server answered >= 400, or the browser never got an answer. */
export function isFailedEntry(entry) {
  const response = entry?.response;
  if (!response) return false;
  return isFailedStatus(Number(response.status), response._error);
}

/** HAR headers come as [{ name, value }]; turn them into a lowercase-keyed object. */
export function headersToObject(headers = []) {
  return headers.reduce((acc, { name, value }) => {
    const key = String(name).toLowerCase();
    acc[key] = key in acc ? `${acc[key]}, ${value}` : value;
    return acc;
  }, {});
}

/** Map status + browser error text to one of CATEGORIES. */
export function categorizeError(status, errorText = '') {
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

/** Convert a HAR entry into the record shape used by the panel and the API payload. */
export function toErrorRecord(entry, id) {
  const { request = {}, response = {} } = entry;
  const status = Number(response.status) || 0;
  const errorText = response._error || null;
  return {
    id,
    method: request.method || 'GET',
    url: request.url || '',
    status,
    statusText: response.statusText || '',
    errorText,
    category: categorizeError(status, errorText),
    resourceType: entry._resourceType || 'other',
    mimeType: response.content?.mimeType || '',
    durationMs: Math.round(Number(entry.time) || 0),
    startedAt: entry.startedDateTime || null,
    requestHeaders: headersToObject(request.headers),
    responseHeaders: headersToObject(response.headers),
    requestBody: request.postData?.text ?? null,
    responseBody: null, // loaded lazily via entry.getContent()
    bodyLoaded: false,
  };
}

/** Count records per category, e.g. { SERVER_ERROR: 2, NOT_FOUND: 1 }. */
export function countByCategory(records) {
  return records.reduce((acc, { category }) => {
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
}
