import {
  toStatusAndErrorText,
  isFailedWebRequest,
  categorizeWebRequest,
} from '../../src/lib/webRequestClassify.js';

describe('toStatusAndErrorText', () => {
  test('maps statusCode and error into { status, errorText }', () => {
    expect(toStatusAndErrorText({ statusCode: 404 })).toEqual({ status: 404, errorText: null });
    expect(toStatusAndErrorText({ error: 'net::ERR_NAME_NOT_RESOLVED' })).toEqual({
      status: 0,
      errorText: 'net::ERR_NAME_NOT_RESOLVED',
    });
  });
});

describe('isFailedWebRequest', () => {
  test.each([
    [{ statusCode: 200 }, false],
    [{ statusCode: 304 }, false],
    [{ statusCode: 404 }, true],
    [{ statusCode: 500 }, true],
    [{ error: 'net::ERR_NAME_NOT_RESOLVED' }, true],
  ])('%j → failed=%s', (details, expected) => {
    expect(isFailedWebRequest(details)).toBe(expected);
  });
});

describe('categorizeWebRequest', () => {
  test.each([
    [{ statusCode: 404 }, 'NOT_FOUND'],
    [{ statusCode: 500 }, 'SERVER_ERROR'],
    [{ statusCode: 401 }, 'AUTH_ERROR'],
    [{ error: 'net::ERR_NAME_NOT_RESOLVED' }, 'NETWORK_ERROR'],
  ])('%j → %s', (details, expected) => {
    expect(categorizeWebRequest(details)).toBe(expected);
  });
});
