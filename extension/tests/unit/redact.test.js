import {
  REDACTED,
  redactHeaders,
  redactUrl,
  redactBody,
  redactText,
  redactRecord,
  truncate,
} from '../../src/lib/redact.js';

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

describe('redactHeaders', () => {
  test('replaces credential headers, keeps the rest', () => {
    const result = redactHeaders({
      authorization: 'Bearer abc',
      Cookie: 'sid=123',
      'x-api-key': 'k',
      'content-type': 'application/json',
    });
    expect(result).toEqual({
      authorization: REDACTED,
      Cookie: REDACTED,
      'x-api-key': REDACTED,
      'content-type': 'application/json',
    });
  });
});

describe('redactUrl', () => {
  test('redacts sensitive query params only', () => {
    expect(redactUrl('https://a.com/p?token=abc&page=2&Access_Token=x#top')).toBe(
      `https://a.com/p?token=${REDACTED}&page=2&Access_Token=${REDACTED}#top`,
    );
  });

  test('returns URL without query unchanged', () => {
    expect(redactUrl('/api/users/1')).toBe('/api/users/1');
  });
});

describe('redactBody', () => {
  test('redacts nested JSON fields case-insensitively', () => {
    const body = JSON.stringify({ user: { name: 'Ani', Password: 'rahasia' }, items: [{ api_key: 'k1' }] });
    const parsed = JSON.parse(redactBody(body));
    expect(parsed.user).toEqual({ name: 'Ani', Password: REDACTED });
    expect(parsed.items[0].api_key).toBe(REDACTED);
  });

  test('redacts JWT and Bearer tokens in free text', () => {
    const result = redactBody(`Error: invalid token ${JWT} for header Bearer abc.def-123`);
    expect(result).not.toContain(JWT);
    expect(result).not.toContain('abc.def-123');
  });

  test('truncates long bodies', () => {
    const result = redactBody('x'.repeat(5000), 100);
    expect(result).toHaveLength(100 + '…[truncated]'.length);
    expect(result.endsWith('…[truncated]')).toBe(true);
  });

  test('keeps null bodies as null', () => {
    expect(redactBody(null)).toBeNull();
    expect(redactBody(undefined)).toBeNull();
  });
});

test('truncate leaves short text alone', () => {
  expect(truncate('short', 10)).toBe('short');
});

test('redactText handles plain text without secrets', () => {
  expect(redactText('Something went wrong')).toBe('Something went wrong');
});

test('redactText replaces email addresses and preserves surrounding text', () => {
  expect(redactText('Contact Ani+qa@example.co.id for help.')).toBe(`Contact ${REDACTED} for help.`);
});

test('redactText replaces formatted Indonesian mobile numbers', () => {
  expect(redactText('Call 0812-3456-7890 or +62 812 3456 7890.')).toBe(
    `Call ${REDACTED} or ${REDACTED}.`,
  );
});

test('redactText replaces NIK and 16-digit sequences but not longer numbers', () => {
  expect(redactText('NIK 3175061205900001; card 4111 1111-1111 1111; ref 12345678901234567.')).toBe(
    `NIK ${REDACTED}; card ${REDACTED}; ref 12345678901234567.`,
  );
});

test('redactRecord does not mutate the original record', () => {
  const original = {
    url: 'https://a.com/?password=1',
    errorText: null,
    requestHeaders: { authorization: 'Bearer x' },
    responseHeaders: {},
    requestBody: null,
    responseBody: null,
  };
  const snapshot = JSON.parse(JSON.stringify(original));
  const redacted = redactRecord(original);
  expect(original).toEqual(snapshot);
  expect(redacted.requestHeaders.authorization).toBe(REDACTED);
  expect(redacted.url).toContain(`password=${REDACTED}`);
});
