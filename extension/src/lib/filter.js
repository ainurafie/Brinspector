// Stream filter used by the "Filter regex" box.
// Accepts "/v1|error/", "v1|error" or plain text. Invalid regex falls back to a substring match.

function searchableText(record) {
  return `${record.method} ${record.url} ${record.status} ${record.category} ${record.errorText || ''}`;
}

export function buildMatcher(pattern = '') {
  const trimmed = String(pattern).trim();
  if (!trimmed) return () => true;

  const literal = trimmed.match(/^\/(.+)\/([a-z]*)$/i);
  const source = literal ? literal[1] : trimmed;
  const flags = literal ? literal[2].replace(/[gy]/g, '') : '';
  try {
    const regex = new RegExp(source, flags.includes('i') ? flags : `${flags}i`);
    return (record) => regex.test(searchableText(record));
  } catch {
    const needle = trimmed.toLowerCase();
    return (record) => searchableText(record).toLowerCase().includes(needle);
  }
}

export function filterRecords(records, pattern) {
  const matches = buildMatcher(pattern);
  return records.filter(matches);
}
