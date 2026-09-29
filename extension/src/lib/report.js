import { redactRecord, redactText } from './redact.js';
import { describeStatus, formatDuration, urlPath } from './format.js';

const MAX_BODY_IN_REPORT = 1500;

/**
 * Markdown report for one failure (+ AI result and incident notes when available), for "Copy Report".
 * Always built from redacted data, because reports get pasted into tickets and chats.
 * @param {object} record
 * @param {object|null} ai - result of POST /api/summarize
 * @param {{ notes?: string, tags?: string[] }} incident - Incident Notes card (spec F-006)
 */
export function buildMarkdownReport(record, ai = null, { notes = '', tags = [] } = {}) {
  const safe = redactRecord(record);
  const lines = [
    `### BRINSPECTOR — ${safe.method} ${urlPath(safe.url)}`,
    '',
    `- **Status:** ${describeStatus(safe)}`,
    `- **Kategori:** ${safe.category}`,
    `- **URL:** ${safe.url}`,
    `- **Durasi:** ${formatDuration(safe.durationMs)}`,
  ];

  if (tags.length) lines.push(`- **Tag:** ${tags.join(' ')}`);
  if (notes.trim()) lines.push('', '#### Catatan insiden', '', redactText(notes.trim()));

  if (ai) {
    lines.push('', `#### AI Root Cause (perkiraan AI · severity: ${redactText(ai.severity)})`, '', redactText(ai.summary));
    if (ai.likelyCauses?.length) lines.push('', '**Kemungkinan penyebab**', ...ai.likelyCauses.map((cause) => `- ${redactText(cause)}`));
    if (ai.suggestedFixes?.length) lines.push('', '**Saran perbaikan**', ...ai.suggestedFixes.map((fix) => `- ${redactText(fix)}`));
  }

  if (safe.responseBody) {
    const body = safe.responseBody.slice(0, MAX_BODY_IN_REPORT);
    lines.push('', '**Response body**', '```', body, '```');
  }
  return lines.join('\n');
}

/** Same content as the Markdown report, in Jira wiki markup (for pasting into a Jira ticket). */
export function buildJiraReport(record, ai = null, { notes = '', tags = [] } = {}) {
  const safe = redactRecord(record);
  const lines = [
    `h3. BRINSPECTOR — ${safe.method} ${urlPath(safe.url)}`,
    `* *Status:* ${describeStatus(safe)}`,
    `* *Kategori:* ${safe.category}`,
    `* *URL:* {noformat}${safe.url}{noformat}`,
    `* *Durasi:* ${formatDuration(safe.durationMs)}`,
  ];
  if (tags.length) lines.push(`* *Tag:* ${tags.join(' ')}`);
  if (notes.trim()) lines.push('', 'h4. Catatan insiden', redactText(notes.trim()));
  if (ai) {
    lines.push('', `h4. AI Root Cause (perkiraan AI · severity: ${ai.severity})`, ai.summary);
    if (ai.likelyCauses?.length) lines.push('*Kemungkinan penyebab*', ...ai.likelyCauses.map((c) => `* ${c}`));
    if (ai.suggestedFixes?.length) lines.push('*Saran perbaikan*', ...ai.suggestedFixes.map((f) => `* ${f}`));
  }
  if (safe.responseBody) {
    lines.push('', '*Response body*', '{code}', safe.responseBody.slice(0, MAX_BODY_IN_REPORT), '{code}');
  }
  return lines.join('\n');
}

const toHarHeaders = (headers = {}) => Object.entries(headers || {}).map(([name, value]) => ({ name, value: String(value) }));

/**
 * HAR 1.2 containing only the given failures, fully redacted (headers, query, bodies).
 * Can be re-imported into the Chrome Network tab.
 */
export function buildRedactedHar(records, { version = 'dev' } = {}) {
  const entries = records.map((record) => {
    const safe = redactRecord(record);
    const request = {
      method: safe.method,
      url: safe.url,
      httpVersion: 'HTTP/1.1',
      headers: toHarHeaders(safe.requestHeaders),
      queryString: [],
      cookies: [],
      headersSize: -1,
      bodySize: -1,
    };
    if (safe.requestBody) {
      request.postData = { mimeType: safe.requestHeaders?.['content-type'] || 'text/plain', text: safe.requestBody };
    }
    const response = {
      status: safe.status,
      statusText: safe.statusText || '',
      httpVersion: 'HTTP/1.1',
      headers: toHarHeaders(safe.responseHeaders),
      cookies: [],
      content: {
        size: safe.responseBody ? safe.responseBody.length : 0,
        mimeType: safe.mimeType || 'text/plain',
        ...(safe.responseBody ? { text: safe.responseBody } : {}),
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: -1,
    };
    if (safe.errorText) response._error = safe.errorText;
    const time = Number(safe.durationMs) || 0;
    return {
      startedDateTime: safe.startedAt || new Date(0).toISOString(),
      time,
      request,
      response,
      cache: {},
      timings: { send: 0, wait: time, receive: 0 },
      _resourceType: safe.resourceType,
    };
  });
  return { log: { version: '1.2', creator: { name: 'BRINSPECTOR', version }, entries } };
}
