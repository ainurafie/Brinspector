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
      const inspectedWindowEvaluations = [];
      let inspectedTarget = target;
      const withContent = (entry) => ({ ...entry, getContent: (callback) => callback(entry.__body, '') });
      const listenerApi = (list) => ({
        addListener: (fn) => list.push(fn),
        removeListener: (fn) => list.splice(list.indexOf(fn), 1),
      });
      window.chrome = window.chrome || {};
      window.chrome.devtools = {
        inspectedWindow: {
          eval: (expression, callback) => {
            inspectedWindowEvaluations.push(expression);
            if (expression === 'location.href') {
              callback(inspectedTarget, { isException: false });
              return;
            }
            if (window.__failNextDevtoolsEval) {
              window.__failNextDevtoolsEval = false;
              callback(undefined, { isException: true, value: 'Page evaluation blocked by CSP' });
              return;
            }
            try {
              callback(window.eval(expression), { isException: false });
            } catch (error) {
              callback(undefined, { isException: true, value: error.message });
            }
          },
        },
        network: {
          getHAR: (callback) => callback({ entries: entries.map(withContent) }),
          onRequestFinished: listenerApi(finished),
          onNavigated: listenerApi(navigated),
        },
      };
      window.__devtoolsEvalCalls = inspectedWindowEvaluations;
      window.__emitRequest = (entry) => finished.forEach((fn) => fn(withContent(entry)));
      window.__navigate = (url) => {
        inspectedTarget = url;
        navigated.forEach((fn) => fn(url));
      };
      // Pushes a fake capture straight into the Console Trap buffer so tests don't
      // need to trigger a real window.onerror/unhandledrejection to see it drained.
      window.__emitConsoleError = (capture) => {
        const state = window.__brinspector;
        if (state?.installed) state.buffer.push(capture);
      };
    },
    { entries: initialEntries, target: targetUrl },
  );
}

module.exports = { harEntry, installChromeStub };
