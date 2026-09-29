import { buildMarkdownReport, buildJiraReport, buildRedactedHar } from '../../src/lib/report.js';
import { errorRecord } from './fixtures.js';

const secretRecord = errorRecord({
  method: 'POST',
  url: 'https://bank.example/api/transfer?token=raw-secret',
  status: 500,
  statusText: 'Internal Server Error',
  requestHeaders: { authorization: 'Bearer raw-token' },
  requestBody: JSON.stringify({ password: 'raw-password' }),
  responseBody: 'Contact jane@example.com for help.',
});

const ai = {
  summary: 'The server crashed while processing the transfer.',
  severity: 'high',
  likelyCauses: ['Null pointer in TransferService'],
  suggestedFixes: ['Add a null check before charging the account'],
};

describe('buildMarkdownReport', () => {
  test('includes method, URL, status, and duration', () => {
    const report = buildMarkdownReport(errorRecord());
    expect(report).toContain('### BRINSPECTOR — GET /api/transfer');
    expect(report).toContain('- **Status:** 500 Server Err');
    expect(report).toContain('- **Kategori:** SERVER_ERROR');
    expect(report).toContain('- **Durasi:** 812ms');
  });

  test('includes the AI summary, causes, and fixes when provided', () => {
    const report = buildMarkdownReport(errorRecord(), ai);
    expect(report).toContain('The server crashed while processing the transfer.');
    expect(report).toContain('severity: high');
    expect(report).toContain('- Null pointer in TransferService');
    expect(report).toContain('- Add a null check before charging the account');
  });

  test('includes incident notes and tags when provided (F-006)', () => {
    const report = buildMarkdownReport(errorRecord(), null, { notes: 'Happens every time on staging', tags: ['#P1-Blocker'] });
    expect(report).toContain('- **Tag:** #P1-Blocker');
    expect(report).toContain('Happens every time on staging');
  });

  test('never contains secrets from the record, notes, or AI text', () => {
    const report = buildMarkdownReport(secretRecord, ai, { notes: 'Ping jane@example.com if this repeats' });
    expect(report).not.toContain('raw-secret');
    expect(report).not.toContain('raw-token');
    expect(report).not.toContain('raw-password');
    expect(report).not.toContain('jane@example.com');
    expect(report).toContain('[REDACTED]');
  });

  test('omits the response body section when there is none', () => {
    expect(buildMarkdownReport(errorRecord({ responseBody: null }))).not.toContain('Response body');
  });
});

describe('buildJiraReport', () => {
  test('uses Jira wiki markup and includes the same core fields', () => {
    const report = buildJiraReport(errorRecord(), ai, { notes: 'Happens on staging', tags: ['#Staging'] });
    expect(report).toContain('h3. BRINSPECTOR — GET /api/transfer');
    expect(report).toContain('* *Status:* 500 Server Err');
    expect(report).toContain('* *Tag:* #Staging');
    expect(report).toContain('Happens on staging');
    expect(report).toContain('The server crashed while processing the transfer.');
    expect(report).toContain('{noformat}');
  });

  test('never contains secrets from the record', () => {
    const report = buildJiraReport(secretRecord);
    expect(report).not.toContain('raw-secret');
    expect(report).not.toContain('raw-token');
    expect(report).not.toContain('raw-password');
  });
});

describe('buildRedactedHar', () => {
  test('produces a valid HAR 1.2 log containing only the given entries', () => {
    const har = buildRedactedHar([errorRecord()], { version: '1.2.3' });
    expect(har.log.version).toBe('1.2');
    expect(har.log.creator).toEqual({ name: 'BRINSPECTOR', version: '1.2.3' });
    expect(har.log.entries).toHaveLength(1);
    const [entry] = har.log.entries;
    expect(entry.request).toMatchObject({ method: 'GET', url: 'https://bank.example/api/transfer' });
    expect(entry.response.status).toBe(500);
    expect(entry.timings.wait).toBe(812);
  });

  test('redacts headers, query params, and bodies in every entry', () => {
    const har = buildRedactedHar([secretRecord]);
    const json = JSON.stringify(har);
    expect(json).not.toContain('raw-secret');
    expect(json).not.toContain('raw-token');
    expect(json).not.toContain('raw-password');
    expect(json).not.toContain('jane@example.com');
    const [entry] = har.log.entries;
    expect(entry.request.headers).toEqual([{ name: 'authorization', value: '[REDACTED]' }]);
  });

  test('includes postData only when a request body exists', () => {
    const withBody = buildRedactedHar([errorRecord({ requestBody: '{"a":1}' })]).log.entries[0];
    expect(withBody.request.postData.text).toBe('{"a":1}');
    const withoutBody = buildRedactedHar([errorRecord({ requestBody: null })]).log.entries[0];
    expect(withoutBody.request.postData).toBeUndefined();
  });

  test('carries the browser error text on network failures', () => {
    const record = errorRecord({ status: 0, category: 'NETWORK_ERROR', errorText: 'net::ERR_NAME_NOT_RESOLVED' });
    const [entry] = buildRedactedHar([record]).log.entries;
    expect(entry.response._error).toBe('net::ERR_NAME_NOT_RESOLVED');
  });
});
