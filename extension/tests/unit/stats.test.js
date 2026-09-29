import { isNetworkDrop, isClientError, computeStats, buildHeadline } from '../../src/lib/stats.js';
import { errorRecord } from './fixtures.js';

describe('isNetworkDrop', () => {
  test.each([
    [0, true],
    [500, true],
    [503, true],
    [404, false],
    [200, false],
  ])('status %i → %s', (status, expected) => {
    expect(isNetworkDrop({ status })).toBe(expected);
  });
});

describe('isClientError', () => {
  test.each([
    [400, true],
    [404, true],
    [499, true],
    [500, false],
    [399, false],
  ])('status %i → %s', (status, expected) => {
    expect(isClientError({ status })).toBe(expected);
  });
});

describe('computeStats', () => {
  test('counts per category and the peak latency, excluding exceptions from network buckets', () => {
    const records = [
      errorRecord({ id: 1, status: 500, durationMs: 800 }),
      errorRecord({ id: 2, status: 404, category: 'NOT_FOUND', durationMs: 200 }),
      errorRecord({ id: 3, status: 0, category: 'NETWORK_ERROR', durationMs: 50 }),
      errorRecord({ id: 4, status: 0, exception: { type: 'TypeError' }, durationMs: 9999 }),
    ];
    const stats = computeStats(records);
    expect(stats).toMatchObject({
      total: 4,
      server: 1,
      client: 1,
      network: 1,
      exceptions: 1,
      networkDrop: 2,
      peakLatencyMs: 800,
    });
  });

  test('lists unique, sorted statuses for network drops and client errors, capped at 3', () => {
    const records = [
      errorRecord({ id: 1, status: 500 }),
      errorRecord({ id: 2, status: 502 }),
      errorRecord({ id: 3, status: 503 }),
      errorRecord({ id: 4, status: 504 }),
      errorRecord({ id: 5, status: 0 }),
    ];
    const stats = computeStats(records);
    expect(stats.networkDropStatuses).toBe('500 / 502 / 503');
  });

  test('shows unique client-error statuses', () => {
    const records = [
      errorRecord({ id: 1, status: 404, category: 'NOT_FOUND' }),
      errorRecord({ id: 2, status: 404, category: 'NOT_FOUND' }),
      errorRecord({ id: 3, status: 422, category: 'CLIENT_ERROR' }),
    ];
    expect(computeStats(records).clientStatuses).toBe('404 / 422');
  });

  test('returns zeros for an empty list', () => {
    expect(computeStats([])).toMatchObject({ total: 0, server: 0, client: 0, network: 0, exceptions: 0, networkDrop: 0, peakLatencyMs: 0 });
  });
});

describe('buildHeadline', () => {
  test('shows an idle message when there are no failures', () => {
    expect(buildHeadline(computeStats([]))).toEqual({
      title: 'No Failures Detected',
      detail: 'Listening for failed requests…',
    });
  });

  test('singular "Failure" and category breakdown for one record', () => {
    const stats = computeStats([errorRecord({ status: 500 })]);
    expect(buildHeadline(stats)).toEqual({ title: '1 Failure Detected', detail: '(1 Server)' });
  });

  test('pluralizes and lists every non-zero category, including exceptions', () => {
    const stats = computeStats([
      errorRecord({ id: 1, status: 500 }),
      errorRecord({ id: 2, status: 404 }),
      errorRecord({ id: 3, exception: { type: 'TypeError' }, status: 0 }),
    ]);
    expect(buildHeadline(stats)).toEqual({
      title: '3 Failures Detected',
      detail: '(1 Server, 1 Client, 1 Exception)',
    });
  });
});
