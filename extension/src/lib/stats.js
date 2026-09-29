// Aggregates for the status banner and stat cards. Pure functions.

export function isNetworkDrop(record) {
  return record.status === 0 || record.status >= 500;
}

export function isClientError(record) {
  return record.status >= 400 && record.status < 500;
}

function statusList(records, limit = 3) {
  const unique = [...new Set(records.map((r) => (r.status === 0 ? 'NET' : String(r.status))))].sort();
  return unique.slice(0, limit).join(' / ');
}

/**
 * Numbers behind the three stat cards and the banner headline.
 * @returns {{ total, server, client, network, networkDrop, peakLatencyMs, networkDropStatuses, clientStatuses }}
 */
export function computeStats(records) {
  const drops = records.filter(isNetworkDrop);
  const clients = records.filter(isClientError);
  return {
    total: records.length,
    server: records.filter((r) => r.status >= 500).length,
    client: clients.length,
    network: records.filter((r) => r.status === 0).length,
    networkDrop: drops.length,
    peakLatencyMs: records.reduce((max, r) => Math.max(max, Number(r.durationMs) || 0), 0),
    networkDropStatuses: statusList(drops),
    clientStatuses: statusList(clients),
  };
}

/** "3 Failures Detected" + "(2 Server, 1 Client)" for the banner. */
export function buildHeadline(stats) {
  if (!stats.total) return { title: 'No Failures Detected', detail: 'Listening for failed requests…' };
  const parts = [
    stats.server && `${stats.server} Server`,
    stats.client && `${stats.client} Client`,
    stats.network && `${stats.network} Network`,
  ].filter(Boolean);
  const noun = stats.total === 1 ? 'Failure' : 'Failures';
  return { title: `${stats.total} ${noun} Detected`, detail: `(${parts.join(', ')})` };
}
