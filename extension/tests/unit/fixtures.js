// Minimal Chrome HAR entry factory for tests.
export function harEntry({
  status = 200,
  statusText = '',
  error,
  method = 'GET',
  url = 'https://example.com/api',
  requestHeaders = [],
  responseHeaders = [],
  postData,
  resourceType = 'fetch',
  time = 120.4,
} = {}) {
  const response = { status, statusText, headers: responseHeaders, content: { mimeType: 'application/json' } };
  if (error) response._error = error;
  const request = { method, url, headers: requestHeaders };
  if (postData !== undefined) request.postData = { text: postData };
  return { request, response, _resourceType: resourceType, time, startedDateTime: '2026-09-29T03:00:00.000Z' };
}

/** Minimal error record (shape produced by toErrorRecord) for format/report/stats tests. */
export function errorRecord({
  id = 1,
  method = 'GET',
  url = 'https://bank.example/api/transfer',
  status = 500,
  statusText = 'Internal Server Error',
  errorText = null,
  category = 'SERVER_ERROR',
  resourceType = 'fetch',
  durationMs = 812,
  startedAt = '2026-09-29T03:00:00.000Z',
  requestHeaders = {},
  responseHeaders = {},
  requestBody = null,
  responseBody = null,
  exception,
} = {}) {
  const record = {
    id,
    method,
    url,
    status,
    statusText,
    errorText,
    category,
    resourceType,
    durationMs,
    startedAt,
    requestHeaders,
    responseHeaders,
    requestBody,
    responseBody,
    bodyLoaded: true,
  };
  if (exception) record.exception = exception;
  return record;
}
