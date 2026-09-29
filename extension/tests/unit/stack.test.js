import {
  parseErrorHeadline,
  shortFileName,
  parseStack,
  buildCodeFrame,
  toExceptionView,
} from '../../src/lib/stack.js';

const V8_STACK = `TypeError: Cannot read properties of undefined (reading 'auth_token')
    at PaymentProcessor.triggerExecution (https://app.example/checkout/handlers/paymentProcessor.ts:142:19)
    at HTMLButtonElement.dispatchSubmit (https://app.example/checkoutButton.tsx:88:5)
    at https://app.example/zone.js:406:31`;

const GECKO_STACK = `triggerExecution@https://app.example/paymentProcessor.js:142:19
@https://app.example/zone.js:406:31`;

describe('parseErrorHeadline', () => {
  test.each([
    ["TypeError: Cannot read properties of undefined (reading 'x')", 'TypeError', "Cannot read properties of undefined (reading 'x')"],
    ['Uncaught ReferenceError: foo is not defined', 'ReferenceError', 'foo is not defined'],
    ['Error: boom', 'Error', 'boom'],
    ['Script error.', 'Error', 'Script error.'],
  ])('%s', (text, type, message) => {
    expect(parseErrorHeadline(text)).toEqual({ type, message });
  });
});

test('shortFileName strips origin and query', () => {
  expect(shortFileName('https://app.example/static/js/app.chunk.js?v=3')).toBe('static/js/app.chunk.js');
  expect(shortFileName('webpack:///src/a.js')).toBe('src/a.js');
  expect(shortFileName('app.js?x=1')).toBe('app.js');
});

describe('parseStack', () => {
  test('parses Chrome/V8 frames, with and without a function name', () => {
    expect(parseStack(V8_STACK)).toEqual([
      {
        fn: 'PaymentProcessor.triggerExecution',
        url: 'https://app.example/checkout/handlers/paymentProcessor.ts',
        file: 'checkout/handlers/paymentProcessor.ts',
        line: 142,
        column: 19,
      },
      { fn: 'HTMLButtonElement.dispatchSubmit', url: 'https://app.example/checkoutButton.tsx', file: 'checkoutButton.tsx', line: 88, column: 5 },
      { fn: '<anonymous>', url: 'https://app.example/zone.js', file: 'zone.js', line: 406, column: 31 },
    ]);
  });

  test('parses Firefox/Safari frames', () => {
    const frames = parseStack(GECKO_STACK);
    expect(frames.map((f) => [f.fn, f.file, f.line])).toEqual([
      ['triggerExecution', 'paymentProcessor.js', 142],
      ['<anonymous>', 'zone.js', 406],
    ]);
  });

  test('ignores non-frame lines and empty input', () => {
    expect(parseStack('just a message')).toEqual([]);
    expect(parseStack()).toEqual([]);
  });
});

describe('buildCodeFrame', () => {
  const source = ['a', 'b', 'c', 'd', 'e', 'f'].join('\n');

  test('returns context lines around the error line', () => {
    expect(buildCodeFrame(source, { file: 'x.js', line: 4, context: 1 })).toEqual({
      file: 'x.js',
      line: 4,
      lines: [
        { number: 3, text: 'c', isError: false },
        { number: 4, text: 'd', isError: true },
        { number: 5, text: 'e', isError: false },
      ],
    });
  });

  test('clamps at file boundaries', () => {
    expect(buildCodeFrame(source, { line: 1 }).lines.map((l) => l.number)).toEqual([1, 2, 3]);
    expect(buildCodeFrame(source, { line: 6 }).lines.map((l) => l.number)).toEqual([4, 5, 6]);
  });

  test('returns null for invalid input', () => {
    expect(buildCodeFrame(null, { line: 1 })).toBeNull();
    expect(buildCodeFrame(source, { line: 0 })).toBeNull();
    expect(buildCodeFrame(source, { line: 99 })).toBeNull();
  });
});

describe('toExceptionView', () => {
  test('combines headline, frames and code frame, and redacts secrets', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.SflKxwRJSMeKKF2QT4fwpM';
    const source = Array.from({ length: 150 }, (_, i) => `line ${i + 1}`).join('\n');
    const view = toExceptionView({
      message: `TypeError: invalid token ${jwt}`,
      stack: V8_STACK,
      source,
      sourceMapped: true,
    });
    expect(view.type).toBe('TypeError');
    expect(view.message).not.toContain(jwt);
    expect(view.frames).toHaveLength(3);
    expect(view.codeFrame.line).toBe(142);
    expect(view.codeFrame.lines.find((l) => l.isError).text).toBe('line 142');
    expect(view.sourceMapped).toBe(true);
  });

  test('works without source code', () => {
    const view = toExceptionView({ stack: V8_STACK });
    expect(view.type).toBe('TypeError');
    expect(view.codeFrame).toBeNull();
  });
});
