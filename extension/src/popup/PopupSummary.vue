<script setup>
import { computed, onMounted, ref } from 'vue';
import { GET_TAB_SUMMARY_MESSAGE } from '../lib/messages.js';

// Groups the fine-grained categories from errorFilter.js into the same three buckets
// shown in the DevTools panel's stat cards (server/client/network), per F-005's spec.
const GROUPS = {
  SERVER_ERROR: 'Server',
  CLIENT_ERROR: 'Client',
  AUTH_ERROR: 'Client',
  NOT_FOUND: 'Client',
  NETWORK_ERROR: 'Network',
  CORS_ERROR: 'Network',
  TIMEOUT: 'Network',
  UNKNOWN: 'Other',
};

const summary = ref(null); // null while loading; then { total, byCategory }

const breakdown = computed(() => {
  if (!summary.value) return [];
  const grouped = {};
  for (const [category, count] of Object.entries(summary.value.byCategory)) {
    const label = GROUPS[category] || 'Other';
    grouped[label] = (grouped[label] || 0) + count;
  }
  return Object.entries(grouped).map(([label, count]) => `${count} ${label}`);
});

onMounted(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    summary.value = { total: 0, byCategory: {} };
    return;
  }
  chrome.runtime.sendMessage({ type: GET_TAB_SUMMARY_MESSAGE, tabId: tab.id }, (response) => {
    summary.value = response || { total: 0, byCategory: {} };
  });
});
</script>

<template>
  <div class="popup" data-testid="popup-summary">
    <header class="popup__header">
      <span class="popup__logo">BRINSPECTOR</span>
    </header>

    <p v-if="summary === null" class="popup__empty" data-testid="popup-loading">Loading…</p>
    <p v-else-if="summary.total === 0" class="popup__empty" data-testid="popup-empty">No failures on this tab.</p>
    <template v-else>
      <p class="popup__total" data-testid="popup-total">
        {{ summary.total }} {{ summary.total === 1 ? 'Failure' : 'Failures' }}
      </p>
      <p class="popup__breakdown" data-testid="popup-breakdown">{{ breakdown.join(', ') }}</p>
      <p class="popup__cta">Open DevTools → BRINSPECTOR for full detail and AI root cause.</p>
    </template>
  </div>
</template>

<style scoped>
.popup {
  width: 260px;
  padding: 12px;
  background: var(--bi-bg);
}
.popup__header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.popup__logo {
  font: 700 12px var(--bi-font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--bi-accent);
}
.popup__empty {
  margin: 0;
  color: var(--bi-text-muted);
}
.popup__total {
  margin: 0 0 4px;
  font: 500 20px var(--bi-font-sans);
  color: var(--bi-danger);
}
.popup__breakdown {
  margin: 0 0 8px;
  color: var(--bi-text-muted);
}
.popup__cta {
  margin: 0;
  font-size: 11px;
  color: var(--bi-text-soft);
}
</style>
