const REDACTED = '[REDACTED]';
const MAX_BODY_CHARS = 4000;

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
]);

const SENSITIVE_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'api_key',
  'apikey',
  'key',
  'password',
  'pwd',
  'secret',
  'client_secret',
  'session',
  'sig',
  'signature',
]);

const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const EMAIL_PATTERN = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/gi;
const INDONESIAN_PHONE_PATTERN = /(?<!\d)(?:\+62[ -]?|0)8(?:[ -]?\d)+(?!\d)/g;
const NUMBER_SEQUENCE_PATTERN = /(?<!\d)\d(?:[\d -]*\d)?(?!\d)/g;

function isSensitiveKey(key) {
  return SENSITIVE_KEYS.has(String(key).toLowerCase());
}

function redactHeaders(headers = {}) {
  if (headers === null) return null;
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      SENSITIVE_HEADERS.has(name.toLowerCase()) ? REDACTED : value,
    ]),
  );
}

function redactUrl(url = '') {
  const [beforeHash, hash] = String(url).split('#', 2);
  const queryStart = beforeHash.indexOf('?');
  if (queryStart === -1) return url;

  const base = beforeHash.slice(0, queryStart);
  const query = beforeHash
    .slice(queryStart + 1)
    .split('&')
    .map((pair) => {
      const [rawKey] = pair.split('=', 1);
      let key = rawKey;
      try {
        key = decodeURIComponent(rawKey);
      } catch {
        // Keep malformed query keys unchanged.
      }
      return isSensitiveKey(key) ? `${rawKey}=${REDACTED}` : pair;
    })
    .join('&');

  return `${base}?${query}${hash !== undefined ? `#${hash}` : ''}`;
}

function redactJsonValue(value) {
  if (Array.isArray(value)) return value.map(redactJsonValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        isSensitiveKey(key) ? REDACTED : redactJsonValue(item),
      ]),
    );
  }
  return value;
}

function redactIndonesianPhone(match) {
  const digits = match.replace(/\D/g, '');
  const nationalDigits = digits.startsWith('62') ? digits.length - 2 : digits.length;
  const minLength = digits.startsWith('62') ? 9 : 10;
  const maxLength = digits.startsWith('62') ? 12 : 13;
  return nationalDigits >= minLength && nationalDigits <= maxLength ? REDACTED : match;
}

function redactSixteenDigitSequence(match) {
  return match.replace(/\D/g, '').length === 16 ? REDACTED : match;
}

function redactText(text) {
  return String(text)
    .replace(BEARER_PATTERN, `Bearer ${REDACTED}`)
    .replace(JWT_PATTERN, REDACTED)
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(INDONESIAN_PHONE_PATTERN, redactIndonesianPhone)
    .replace(NUMBER_SEQUENCE_PATTERN, redactSixteenDigitSequence);
}

function truncate(text, max = MAX_BODY_CHARS) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…[truncated]`;
}

function redactBody(body, max = MAX_BODY_CHARS) {
  if (body === null || body === undefined || body === '') return body ?? null;
  const text = String(body);
  let cleaned;
  try {
    cleaned = JSON.stringify(redactJsonValue(JSON.parse(text)));
  } catch {
    cleaned = text;
  }
  return truncate(redactText(cleaned), max);
}

function redactRecord(record) {
  return {
    ...record,
    url: redactUrl(record.url),
    errorText: record.errorText ? redactText(record.errorText) : record.errorText,
    requestHeaders: redactHeaders(record.requestHeaders),
    responseHeaders: redactHeaders(record.responseHeaders),
    requestBody: redactBody(record.requestBody),
    responseBody: redactBody(record.responseBody),
  };
}

module.exports = { REDACTED, redactRecord };