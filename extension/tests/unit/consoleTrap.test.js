import vm from 'node:vm';
import {
  CLEAR_CONSOLE_TRAP_BUFFER_SCRIPT,
  DRAIN_CONSOLE_TRAP_SCRIPT,
  INSTALL_CONSOLE_TRAP_SCRIPT,
  MAX_CONSOLE_BUFFER,
  toConsoleExceptionRecord,
  UNINSTALL_CONSOLE_TRAP_SCRIPT,
} from '../../src/lib/consoleTrap.js';

function createPage() {
  const listeners = new Map();
  const originalOnError = jest.fn(() => false);
  const originalConsoleError = jest.fn();
  const page = {
    onerror: originalOnError,
    location: { href: 'https://app.example/checkout' },
    console: { error: originalConsoleError },
    addEventListener: jest.fn((name, listener) => listeners.set(name, listener)),
    removeEventListener: jest.fn((name, listener) => {
      if (listeners.get(name) === listener) listeners.delete(name);
    }),
  };
  const run = (script) => vm.runInNewContext(script, { window: page });
  return { page, listeners, originalOnError, originalConsoleError, run };
}

describe('Console Trap page scripts', () => {
  test('installs idempotently, captures errors, and preserves page handlers', () => {
    const { page, listeners, originalOnError, originalConsoleError, run } = createPage();
    expect(run(INSTALL_CONSOLE_TRAP_SCRIPT)).toBe(true);
    const installedOnError = page.onerror;
    const installedConsoleError = page.console.error;
    expect(run(INSTALL_CONSOLE_TRAP_SCRIPT)).toBe(true);
    expect(page.onerror).toBe(installedOnError);
    expect(page.console.error).toBe(installedConsoleError);

    page.onerror('TypeError: boom', 'https://app.example/app.js', 4, 8, {
      stack: 'TypeError: boom\n    at run (https://app.example/app.js:4:8)',
    });
    listeners.get('unhandledrejection')({ reason: new Error('promise failed') });
    page.console.error('console failed', new Error('logged failure'));

    expect(originalOnError).toHaveBeenCalledTimes(1);
    expect(originalConsoleError).toHaveBeenCalledTimes(1);
    expect(page.__brinspector.buffer.map(({ message }) => message)).toEqual([
      'TypeError: boom',
      'Error: promise failed',
      'console failed Error: logged failure',
    ]);
  });

  test('caps the buffer and drain/clear scripts empty it', () => {
    const { page, run } = createPage();
    run(INSTALL_CONSOLE_TRAP_SCRIPT);
    for (let index = 0; index < MAX_CONSOLE_BUFFER + 5; index += 1) {
      page.onerror(`Error: ${index}`, '', 0, 0, null);
    }

    expect(page.__brinspector.buffer).toHaveLength(MAX_CONSOLE_BUFFER);
    expect(page.__brinspector.buffer[0].message).toBe('Error: 5');
    expect(run(DRAIN_CONSOLE_TRAP_SCRIPT)).toHaveLength(MAX_CONSOLE_BUFFER);
    expect(page.__brinspector.buffer).toHaveLength(0);
    page.onerror('Error: after drain', '', 0, 0, null);
    expect(run(CLEAR_CONSOLE_TRAP_BUFFER_SCRIPT)).toBe(true);
    expect(page.__brinspector.buffer).toHaveLength(0);
  });

  test('uninstalls and restores original handlers', () => {
    const { page, listeners, originalOnError, originalConsoleError, run } = createPage();
    run(INSTALL_CONSOLE_TRAP_SCRIPT);
    expect(run(UNINSTALL_CONSOLE_TRAP_SCRIPT)).toBe(true);
    expect(page.onerror).toBe(originalOnError);
    expect(page.console.error).toBe(originalConsoleError);
    expect(listeners.has('unhandledrejection')).toBe(false);
    expect(page.__brinspector).toBeUndefined();
  });
});

test('toConsoleExceptionRecord creates a redacted JS ERR record for StackTraceViewer', () => {
  const record = toConsoleExceptionRecord({
    message: 'TypeError: customer jane@example.com failed',
    stack: 'TypeError: customer failed\n    at submit (https://app.example/submit.js:12:4)',
    source: 'https://app.example/submit.js?token=secret',
  }, -1, '2026-09-29T00:00:00.000Z');

  expect(record).toMatchObject({
    id: -1,
    method: 'JS ERR',
    url: 'https://app.example/submit.js?token=[REDACTED]',
    status: 0,
    category: 'SCRIPT_ERROR',
    resourceType: 'script',
    errorText: 'TypeError: customer [REDACTED] failed\nTypeError: customer failed\n    at submit (https://app.example/submit.js:12:4)',
  });
  expect(record.exception).toMatchObject({ type: 'TypeError', frames: [{ file: 'submit.js', line: 12, column: 4 }] });
});