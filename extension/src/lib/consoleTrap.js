import { redactText, redactUrl } from './redact.js';
import { toExceptionView } from './stack.js';

export const MAX_CONSOLE_BUFFER = 200;

export const INSTALL_CONSOLE_TRAP_SCRIPT = `(() => {
  const page = window;
  const existing = page.__brinspector;
  if (existing?.installed) return true;
  if (existing !== undefined) return false;

  const state = {
    installed: true,
    buffer: [],
    originalOnError: page.onerror,
    originalConsoleError: page.console.error,
    onError: null,
    onRejection: null,
    consoleError: null,
  };
  const stringify = (value) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && typeof value.message === 'string') {
      const name = typeof value.name === 'string' ? value.name : 'Error';
      return name + ': ' + value.message;
    }
    try {
      const result = JSON.stringify(value);
      return result === undefined ? String(value) : result;
    } catch {
      return String(value);
    }
  };
  const enqueue = (message, stack, source) => {
    try {
      state.buffer.push({
        message: stringify(message),
        stack: typeof stack === 'string' ? stack : '',
        source: typeof source === 'string' ? source : '',
      });
      if (state.buffer.length > 200) state.buffer.shift();
    } catch {
      // Capturing must never interfere with the page.
    }
  };

  state.onError = function (message, source, line, column, error) {
    const location = [source, line, column].filter(Boolean).join(':');
    enqueue(message, error && error.stack ? error.stack : location, source);
    if (typeof state.originalOnError === 'function') {
      return state.originalOnError.apply(this, arguments);
    }
    return false;
  };
  state.onRejection = (event) => {
    const reason = event && event.reason;
    enqueue(reason, reason && typeof reason.stack === 'string' ? reason.stack : '', '');
  };
  state.consoleError = function (...args) {
    const error = args.find((value) => value && typeof value.stack === 'string');
    const message = args.map(stringify).join(' ');
    enqueue(message, error ? error.stack : '', page.location.href);
    return state.originalConsoleError.apply(this, args);
  };

  page.__brinspector = state;
  page.onerror = state.onError;
  page.addEventListener('unhandledrejection', state.onRejection);
  page.console.error = state.consoleError;
  return true;
})()`;

export const DRAIN_CONSOLE_TRAP_SCRIPT = `(() => {
  const state = window.__brinspector;
  return state && state.installed ? state.buffer.splice(0, state.buffer.length) : [];
})()`;

export const CLEAR_CONSOLE_TRAP_BUFFER_SCRIPT = `(() => {
  const state = window.__brinspector;
  if (state && state.installed) state.buffer.length = 0;
  return true;
})()`;

export const UNINSTALL_CONSOLE_TRAP_SCRIPT = `(() => {
  const page = window;
  const state = page.__brinspector;
  if (!state || !state.installed) return true;
  if (page.onerror === state.onError) page.onerror = state.originalOnError;
  if (page.console.error === state.consoleError) page.console.error = state.originalConsoleError;
  page.removeEventListener('unhandledrejection', state.onRejection);
  state.buffer.length = 0;
  delete page.__brinspector;
  return true;
})()`;

export function toConsoleExceptionRecord(capture, id, startedAt = new Date().toISOString()) {
  const message = typeof capture?.message === 'string' ? capture.message : '';
  const stack = typeof capture?.stack === 'string' ? capture.stack : '';
  const exception = toExceptionView({ message, stack });
  const errorText = redactText([message, stack].filter(Boolean).join('\n'));

  return {
    id,
    method: 'JS ERR',
    url: redactUrl(capture?.source || exception.frames[0]?.url || ''),
    status: 0,
    statusText: 'JavaScript Error',
    category: 'SCRIPT_ERROR',
    errorText,
    resourceType: 'script',
    durationMs: 0,
    startedAt,
    requestHeaders: {},
    responseHeaders: {},
    requestBody: null,
    responseBody: null,
    bodyLoaded: true,
    exception,
  };
}