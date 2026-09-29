import { redactRecord } from './redact.js';
import { describeStatus, formatDuration, urlPath } from './format.js';

const MAX_BODY_IN_REPORT = 1500;

/**
 * Markdown report for one failure (+ AI result when available), for "Copy Report".
 * Always built from a redacted copy, because reports get pasted into tickets and chats.
 */
export function buildMarkdownReport(record, ai = null) {
  const safe = redactRecord(record);
  const lines = [
    `### BRINSPECTOR — ${safe.method} ${urlPath(safe.url)}`,
    '',
    `- **Status:** ${describeStatus(safe)}`,
    `- **Kategori:** ${safe.category}`,
    `- **URL:** ${safe.url}`,
    `- **Durasi:** ${formatDuration(safe.durationMs)}`,
  ];

  if (ai) {
    lines.push('', `#### AI Root Cause (perkiraan AI · severity: ${ai.severity})`, '', ai.summary);
    if (ai.likelyCauses?.length) lines.push('', '**Kemungkinan penyebab**', ...ai.likelyCauses.map((c) => `- ${c}`));
    if (ai.suggestedFixes?.length) lines.push('', '**Saran perbaikan**', ...ai.suggestedFixes.map((f) => `- ${f}`));
  }

  if (safe.responseBody) {
    const body = safe.responseBody.slice(0, MAX_BODY_IN_REPORT);
    lines.push('', '**Response body**', '```', body, '```');
  }
  return lines.join('\n');
}
