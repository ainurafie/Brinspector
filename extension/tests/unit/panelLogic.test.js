import {
  formatLatency,
  formatDuration,
  urlPath,
  urlHost,
  shortNetError,
  describeStatus,
  formatBody,
} from '../../src/lib/format.js';
import { computeStats, buildHeadline } from '../../src/lib/stats.js';
import { buildMatcher, filterRecords } from '../../src/lib/filter.js';
import { buildMarkdownReport } from '../../src/lib/report.js';
import { checkHealth } from '../../src/lib/apiClient.js';

const record = (status, extra = {}) => ({
  method: 'GET',
  url: `https://app.example/api/v1/item/${status}`,
  status,
  category: status >= 500 ? 'SERVER_ERROR' : status === 0 ? 'NETWORK_ERROR' : 'CLIENT_ERROR',
  errorText: status === 0 ? 'net::ERR_NAME_NOT_RESOLVED' : null,
  durationMs: 100,
  requestHeaders: {},
  responseHeaders: {},
  requestBody: null,
  responseBody: null,
  ...extra,
});

describe('format', () => {
  test.each([
    [0, '0ms'],
    [812.4, '812ms'],
    [15002, '15.0s'],
    [NaN, '0ms'],
  ])('formatLatency(%s) → %s', (ms, expected) => {
    expect(formatLatency(ms)).toBe(expected);
  });

  test('formatDuration adds thousands separators', () => {
    expect(formatDuration(15002)).toBe('15,002ms');
  });

  test('urlPath/urlHost handle absolute and relative URLs', () => {
    expect(urlPath('https://a.com/x/y?z=1')).toBe('/x/y?z=1');
    expect(urlPath('/relative')).toBe('/relative');
    expect(urlHost('https://a.com:8443/x')).toBe('a.com:8443');
    expect(urlHost('/relative')).toBe('');
  });

  test('describeStatus uses short labels and browser error text', () => {
    expect(describeStatus(record(504))).toBe('504 Gateway T/O');
    expect(describeStatus(record(418, { statusText: "I'm a teapot" }))).toBe("418 I'm a teapot");
    expect(describeStatus(record(0))).toBe('ERR_NAME_NOT_RESOLVED');
    expect(shortNetError(null)).toBe('Network error');
  });

  test('formatBody pretty-prints JSON and keeps text', () => {
    expect(formatBody('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(formatBody('<html>oops</html>')).toBe('<html>oops</html>');
    expect(formatBody(null)).toBeNull();
  });
});

describe('stats', () => {
  test('computeStats splits drops, client errors and peak latency', () => {
    const stats = computeStats([
      record(500, { durationMs: 1420 }),
      record(504, { durationMs: 15002 }),
      record(0),
      record(404),
      record(401),
    ]);
    expect(stats).toMatchObject({
      total: 5,
      server: 2,
      client: 2,
      network: 1,
      networkDrop: 3,
      peakLatencyMs: 15002,
      networkDropStatuses: '500 / 504 / NET',
      clientStatuses: '401 / 404',
    });
  });

  test('buildHeadline describes the mix of failures', () => {
    expect(buildHeadline(computeStats([record(500), record(404)]))).toEqual({
      title: '2 Failures Detected',
      detail: '(1 Server, 1 Client)',
    });
    expect(buildHeadline(computeStats([record(0)])).title).toBe('1 Failure Detected');
    expect(buildHeadline(computeStats([])).title).toBe('No Failures Detected');
  });
});

describe('filter', () => {
  const records = [record(500), record(404, { url: 'https://app.example/assets/logo.png' }), record(0)];

  test('empty pattern matches everything', () => {
    expect(filterRecords(records, '  ')).toHaveLength(3);
  });

  test('supports /regex/ literals, case-insensitive', () => {
    expect(filterRecords(records, '/V1|logo/')).toHaveLength(3);
    expect(filterRecords(records, '/logo/')).toHaveLength(1);
  });

  test('matches status and category text', () => {
    expect(filterRecords(records, '500')).toHaveLength(1);
    expect(filterRecords(records, 'network_error')).toHaveLength(1);
  });

  test('invalid regex falls back to substring match', () => {
    expect(() => buildMatcher('api/v1/item/(')).not.toThrow();
    expect(filterRecords(records, 'item/(')).toHaveLength(0);
  });

  test('global flag does not make matching stateful', () => {
    const matches = buildMatcher('/v1/g');
    expect([matches(records[0]), matches(records[0])]).toEqual([true, true]);
  });
});

describe('report', () => {
  test('markdown report is redacted and includes the AI result', () => {
    const md = buildMarkdownReport(
      record(500, {
        method: 'POST',
        url: 'https://app.example/pay?token=secret-123',
        responseBody: '{"message":"boom","password":"secret-123"}',
      }),
      { summary: 'Gateway down.', severity: 'high', likelyCauses: ['Upstream timeout'], suggestedFixes: ['Retry later'] },
    );
    expect(md).not.toContain('secret-123');
    expect(md).toContain('### BRINSPECTOR — POST /pay?token=[REDACTED]');
    expect(md).toContain('Gateway down.');
    expect(md).toContain('- Upstream timeout');
    expect(md).toContain('- Retry later');
  });

  test('works without an AI result or body', () => {
    const md = buildMarkdownReport(record(404));
    expect(md).toContain('404 Not Found');
    expect(md).not.toContain('AI Root Cause');
    expect(md).not.toContain('Response body');
  });
});

describe('checkHealth', () => {
  test('returns provider when backend is up', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok', provider: 'mock' }) });
    await expect(checkHealth({ fetchImpl })).resolves.toEqual({ ok: true, provider: 'mock' });
  });

  test('never throws when backend is down', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(checkHealth({ fetchImpl })).resolves.toEqual({ ok: false });
  });

  test('non-2xx is reported as offline', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false });
    await expect(checkHealth({ fetchImpl })).resolves.toEqual({ ok: false });
  });
});
