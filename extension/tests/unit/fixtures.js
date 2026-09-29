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
