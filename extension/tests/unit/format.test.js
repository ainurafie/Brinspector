import {
  formatLatency,
  formatDuration,
  urlPath,
  urlHost,
  shortNetError,
  describeStatus,
  formatBody,
  formatBadgeCount,
} from '../../src/lib/format.js';
import { errorRecord } from './fixtures.js';

describe('formatLatency', () => {
  test.each([
    [0, '0ms'],
    [-5, '0ms'],
    [812, '812ms'],
    [999, '999ms'],
    [1000, '1.0s'],
    [15002, '15.0s'],
    [Number.NaN, '0ms'],
  ])('%p → %s', (input, expected) => {
    expect(formatLatency(input)).toBe(expected);
  });
});

describe('formatDuration', () => {
  test('adds thousands separators and an "ms" suffix', () => {
    expect(formatDuration(1420)).toBe('1,420ms');
  });

  test('falls back to 0 for non-numeric input', () => {
    expect(formatDuration(undefined)).toBe('0ms');
  });
});

describe('urlPath', () => {
  test('strips scheme and host, keeps path and query', () => {
    expect(urlPath('https://bank.example/api/transfer?amount=1')).toBe('/api/transfer?amount=1');
  });

  test('returns the raw input when it is not a valid URL', () => {
    expect(urlPath('/relative/path')).toBe('/relative/path');
  });

  test('returns an empty string for empty input', () => {
    expect(urlPath('')).toBe('');
  });
});

describe('urlHost', () => {
  test('extracts the host', () => {
    expect(urlHost('https://bank.example:8080/api')).toBe('bank.example:8080');
  });

  test('returns an empty string for an invalid URL', () => {
    expect(urlHost('not-a-url')).toBe('');
  });
});

describe('shortNetError', () => {
  test('strips the "net::" prefix', () => {
    expect(shortNetError('net::ERR_NAME_NOT_RESOLVED')).toBe('ERR_NAME_NOT_RESOLVED');
  });

  test('falls back to "Network error" when empty', () => {
    expect(shortNetError(null)).toBe('Network error');
  });
});

describe('describeStatus', () => {
  test('uses the exception type for JS exceptions', () => {
    expect(describeStatus(errorRecord({ exception: { type: 'TypeError' } }))).toBe('TypeError');
  });

  test('falls back to "JavaScript Error" when the exception has no type', () => {
    expect(describeStatus(errorRecord({ exception: {} }))).toBe('JavaScript Error');
  });

  test('uses the short net error label when there is no status', () => {
    expect(describeStatus(errorRecord({ status: 0, errorText: 'net::ERR_ABORTED' }))).toBe('ERR_ABORTED');
  });

  test('combines status and known label', () => {
    expect(describeStatus(errorRecord({ status: 404, statusText: 'Not Found' }))).toBe('404 Not Found');
  });

  test('falls back to statusText for unmapped status codes', () => {
    expect(describeStatus(errorRecord({ status: 418, statusText: "I'm a teapot" }))).toBe("418 I'm a teapot");
  });
});

describe('formatBody', () => {
  test('pretty-prints JSON bodies', () => {
    expect(formatBody('{"a":1}')).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  test('returns non-JSON text unchanged', () => {
    expect(formatBody('plain text')).toBe('plain text');
  });

  test('returns null for null/undefined bodies', () => {
    expect(formatBody(null)).toBeNull();
    expect(formatBody(undefined)).toBeNull();
  });
});

describe('formatBadgeCount', () => {
  test.each([
    [0, ''],
    [1, '1'],
    [99, '99'],
    [100, '99+'],
    [-5, ''],
    [Number.NaN, ''],
  ])('%p → %p', (input, expected) => {
    expect(formatBadgeCount(input)).toBe(expected);
  });
});
