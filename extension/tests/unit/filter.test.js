import { buildMatcher, filterRecords } from '../../src/lib/filter.js';
import { errorRecord } from './fixtures.js';

describe('buildMatcher', () => {
  test('an empty pattern matches everything', () => {
    expect(buildMatcher('')(errorRecord())).toBe(true);
    expect(buildMatcher('   ')(errorRecord())).toBe(true);
  });

  test('plain text matches case-insensitively across method/url/status/category/errorText', () => {
    const matcher = buildMatcher('transfer');
    expect(matcher(errorRecord({ url: 'https://bank.example/api/Transfer' }))).toBe(true);
    expect(matcher(errorRecord({ url: 'https://bank.example/api/users' }))).toBe(false);
  });

  test('accepts a "/pattern/flags" regex literal', () => {
    const matcher = buildMatcher('/v1|v2/');
    expect(matcher(errorRecord({ url: 'https://bank.example/v1/transfer' }))).toBe(true);
    expect(matcher(errorRecord({ url: 'https://bank.example/v3/transfer' }))).toBe(false);
  });

  test('accepts a bare regex source without slashes', () => {
    const matcher = buildMatcher('error|500');
    expect(matcher(errorRecord({ status: 500 }))).toBe(true);
  });

  test('falls back to a substring match when the regex is invalid', () => {
    const matcher = buildMatcher('/[unterminated/');
    expect(matcher(errorRecord({ url: 'https://bank.example/[unterminated/path' }))).toBe(true);
    expect(matcher(errorRecord({ url: 'https://bank.example/other' }))).toBe(false);
  });

  test('matches on category and errorText too', () => {
    expect(buildMatcher('NETWORK_ERROR')(errorRecord({ category: 'NETWORK_ERROR' }))).toBe(true);
    expect(buildMatcher('ERR_ABORTED')(errorRecord({ errorText: 'net::ERR_ABORTED' }))).toBe(true);
  });
});

describe('filterRecords', () => {
  test('keeps only records matching the pattern', () => {
    const records = [
      errorRecord({ id: 1, url: 'https://bank.example/api/transfer' }),
      errorRecord({ id: 2, url: 'https://bank.example/api/users' }),
    ];
    expect(filterRecords(records, 'transfer').map((r) => r.id)).toEqual([1]);
  });

  test('returns all records when the pattern is empty', () => {
    const records = [errorRecord({ id: 1 }), errorRecord({ id: 2 })];
    expect(filterRecords(records, '')).toHaveLength(2);
  });
});
