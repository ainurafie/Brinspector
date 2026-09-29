// AI Root Cause state per error record (spec F-002). Results are cached per record id.
import { reactive, ref, onMounted } from 'vue';
import { buildSummarizePayload } from '../lib/buildPayload.js';
import { summarizeError, checkHealth } from '../lib/apiClient.js';
import { API_BASE_URL } from './config.js';

export function useAiSummary({ ensureResponseBody, language = 'id' }) {
  const states = reactive({}); // id -> { status: 'loading'|'done'|'error', result?, error? }
  const backend = ref({ checked: false, ok: false, provider: null });

  function stateFor(record) {
    return record ? states[record.id] || { status: 'idle' } : { status: 'idle' };
  }

  async function generate(record, { force = false } = {}) {
    if (!record) return;
    const current = states[record.id];
    if (current?.status === 'loading') return; // no double submit
    if (current?.status === 'done' && !force) return; // cached

    states[record.id] = { status: 'loading' };
    try {
      await ensureResponseBody(record);
      const payload = buildSummarizePayload(record, { language });
      const result = await summarizeError(payload, { baseUrl: API_BASE_URL });
      states[record.id] = { status: 'done', result };
    } catch (err) {
      states[record.id] = { status: 'error', error: err.message };
    }
  }

  async function refreshBackend() {
    const health = await checkHealth({ baseUrl: API_BASE_URL });
    backend.value = { checked: true, ...health };
  }

  function reset() {
    Object.keys(states).forEach((key) => delete states[key]);
  }

  onMounted(refreshBackend);

  return { stateFor, generate, backend, refreshBackend, reset, apiBaseUrl: API_BASE_URL };
}
