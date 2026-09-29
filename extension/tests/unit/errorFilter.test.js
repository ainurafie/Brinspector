import {
  isFailedEntry,
  categorizeError,
  toErrorRecord,
  headersToObject,
  countByCategory,
} from '../../src/lib/errorFilter.js';
import { harEntry } from './fixtures.js';

describe('isFailedEntry', () => {
  test.each([
    [404, true],
    [500, true],
    [401, true],
    [0, true],
    [200, false],
    [204, false],
    [304, false],
  ])('status %i → failed=%s', (status, expected) => {
    expect(isFailedEntry(harEntry({ status }))).toBe(expected);
  });

  test('entry with a browser error is failed even if status looks fine', () => {
    expect(isFailedEntry(harEntry({ status: 200, error: 'net::ERR_ABORTED' }))).toBe(true);
  });

  test('malformed entry without response is not failed', () => {
    expect(isFailedEntry({})).toBe(false);
  });
});

describe('categorizeError', () => {
  test.each([
    [500, null, 'SERVER_ERROR'],
    [503, null, 'SERVER_ERROR'],
    [401, null, 'AUTH_ERROR'],
    [403, null, 'AUTH_ERROR'],
    [404, null, 'NOT_FOUND'],
    [422, null, 'CLIENT_ERROR'],
    [504, null, 'TIMEOUT'],
    [0, 'net::ERR_TIMED_OUT', 'TIMEOUT'],
    [0, 'net::ERR_NAME_NOT_RESOLVED', 'NETWORK_ERROR'],
    [0, 'net::ERR_BLOCKED_BY_RESPONSE', 'CORS_ERROR'],
  ])('status %i + %s → %s', (status, errorText, expected) => {
    expect(categorizeError(status, errorText)).toBe(expected);
  });
});

describe('headersToObject', () => {
  test('lowercases names and merges duplicates', () => {
    const result = headersToObject([
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Set-Cookie', value: 'a=1' },
      { name: 'set-cookie', value: 'b=2' },
    ]);
    expect(result).toEqual({ 'content-type': 'application/json', 'set-cookie': 'a=1, b=2' });
  });
});

describe('toErrorRecord', () => {
  test('maps HAR fields into a record', () => {
    const record = toErrorRecord(
      harEntry({ status: 500, statusText: 'Internal Server Error', method: 'POST', postData: '{"a":1}' }),
      7,
    );
    expect(record).toMatchObject({
      id: 7,
      method: 'POST',
      status: 500,
      statusText: 'Internal Server Error',
      category: 'SERVER_ERROR',
      resourceType: 'fetch',
      durationMs: 120,
      requestBody: '{"a":1}',
      responseBody: null,
    });
  });

  test('network failure keeps the browser error text', () => {
    const record = toErrorRecord(harEntry({ status: 0, error: 'net::ERR_NAME_NOT_RESOLVED' }), 1);
    expect(record.errorText).toBe('net::ERR_NAME_NOT_RESOLVED');
    expect(record.category).toBe('NETWORK_ERROR');
  });
});

test('countByCategory groups records', () => {
  expect(
    countByCategory([{ category: 'NOT_FOUND' }, { category: 'SERVER_ERROR' }, { category: 'NOT_FOUND' }]),
  ).toEqual({ NOT_FOUND: 2, SERVER_ERROR: 1 });
});
