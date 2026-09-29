// The only panel module that touches chrome.devtools.* (see AGENTS.md).
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { isFailedEntry, toErrorRecord } from '../lib/errorFilter.js';

export const MAX_RECORDS = 500;

export function useNetworkErrors(maxRecords = MAX_RECORDS) {
  const errors = ref([]);
  const paused = ref(false); // "Auto-Intercept" toggle OFF → ignore new requests
  const targetUrl = ref('');
  const available = ref(Boolean(globalThis.chrome?.devtools?.network));
  const rawEntries = new Map(); // id -> HAR entry, kept for lazy getContent()
  let nextId = 0;

  function addEntry(entry) {
    if (paused.value || !isFailedEntry(entry)) return;
    const id = ++nextId;
    rawEntries.set(id, entry);
    errors.value.unshift(toErrorRecord(entry, id));
    if (errors.value.length > maxRecords) {
      const dropped = errors.value.pop();
      rawEntries.delete(dropped.id);
    }
  }

  function clear() {
    errors.value = [];
    rawEntries.clear();
  }

  function readBody(id) {
    const entry = rawEntries.get(id);
    if (!entry || typeof entry.getContent !== 'function') return Promise.resolve(null);
    return new Promise((resolve) => {
      entry.getContent((content, encoding) => {
        resolve(encoding === 'base64' ? '(binary content)' : content ?? null);
      });
    });
  }

  /** Load the response body into the record once (lazy, see spec F-001). */
  async function ensureResponseBody(record) {
    if (!record || record.bodyLoaded) return record;
    record.responseBody = await readBody(record.id);
    record.bodyLoaded = true;
    return record;
  }

  function refreshTargetUrl() {
    chrome.devtools.inspectedWindow.eval('location.href', (href) => {
      if (typeof href === 'string') targetUrl.value = href;
    });
  }

  function onNavigated(url) {
    targetUrl.value = url;
  }

  onMounted(() => {
    if (!available.value) return;
    const { network } = chrome.devtools;
    refreshTargetUrl();
    network.onNavigated?.addListener(onNavigated);
    // Requests that finished before the panel was opened.
    network.getHAR((har) => {
      (har?.entries || []).forEach(addEntry);
      network.onRequestFinished.addListener(addEntry);
    });
  });

  onBeforeUnmount(() => {
    if (!available.value) return;
    chrome.devtools.network.onRequestFinished.removeListener(addEntry);
    chrome.devtools.network.onNavigated?.removeListener(onNavigated);
  });

  return { errors, paused, targetUrl, available, clear, ensureResponseBody };
}
