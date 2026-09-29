import { redactRecord } from './redact.js';

const PAYLOAD_FIELDS = [
  'method',
  'url',
  'status',
  'statusText',
  'errorText',
  'resourceType',
  'durationMs',
  'requestHeaders',
  'responseHeaders',
  'requestBody',
  'responseBody',
];

/**
 * Build the body for POST /api/summarize (contract: docs/plan.md §7).
 * Always redacts first — this is the only function that should produce API payloads.
 */
export function buildSummarizePayload(record, { language = 'id' } = {}) {
  const safe = redactRecord(record);
  const error = Object.fromEntries(PAYLOAD_FIELDS.map((field) => [field, safe[field] ?? null]));
  return { language, error };
}
