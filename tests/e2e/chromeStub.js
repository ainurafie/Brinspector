// Fakes the part of chrome.devtools the panel uses.
// initialEntries → returned by getHAR(); window.__emitRequest(entry) → fires onRequestFinished;
// window.__navigate(url) → fires onNavigated.

function toHeaderList(headers = {}) {
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

function harEntry({
  status = 200,
  method = 'GET',
  url = 'https://app.example/api',
  error,
  body = null,
  requestBody,
  requestHeaders = {},
  responseHeaders = { 'content-type': 'application/json' },
  time = 150,
} = {}) {
  const response = { status, statusText: '', headers: toHeaderList(responseHeaders), content: { mimeType: 'application/json' } };
  if (error) response._error = error;
  const request = { method, url, headers: toHeaderList(requestHeaders) };
  if (requestBody !== undefined) request.postData = { text: requestBody };
  return {
    request,
    response,
    _resourceType: 'fetch',
    time,
    startedDateTime: new Date().toISOString(),
    __body: body,
  };
}

async function installChromeStub(page, initialEntries = [], { targetUrl = 'https://app.example/checkout' } = {}) {
  await page.addInitScript(
    ({ entries, target }) => {
      const finished = [];
      const navigated = [];
      const withContent = (entry) => ({ ...entry, getContent: (callback) => callback(entry.__body, '') });
      const listenerApi = (list) => ({
        addListener: (fn) => list.push(fn),
        removeListener: (fn) => list.splice(list.indexOf(fn), 1),
      });
      window.chrome = window.chrome || {};
      window.chrome.devtools = {
        inspectedWindow: { eval: (_expr, callback) => callback(target) },
        network: {
          getHAR: (callback) => callback({ entries: entries.map(withContent) }),
          onRequestFinished: listenerApi(finished),
          onNavigated: listenerApi(navigated),
        },
      };
      window.__emitRequest = (entry) => finished.forEach((fn) => fn(withContent(entry)));
      window.__navigate = (url) => navigated.forEach((fn) => fn(url));
    },
    { entries: initialEntries, target: targetUrl },
  );
}

module.exports = { harEntry, installChromeStub };
