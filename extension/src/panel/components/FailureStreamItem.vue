<script setup>
import { computed } from 'vue';
import { describeStatus, formatDuration, urlPath } from '../../lib/format.js';
import { redactUrl } from '../../lib/redact.js';

const props = defineProps({
  record: { type: Object, required: true },
  selected: { type: Boolean, default: false },
});
defineEmits(['select']);

const CATEGORY_LABEL = {
  SERVER_ERROR: 'Server error',
  AUTH_ERROR: 'Auth rejected',
  NOT_FOUND: 'Resource not found',
  CLIENT_ERROR: 'Request rejected',
  NETWORK_ERROR: 'No response',
  CORS_ERROR: 'Blocked by CORS',
  TIMEOUT: 'Timed out',
  SCRIPT_ERROR: 'JavaScript exception',
  UNKNOWN: 'Unknown failure',
};

const tone = computed(() => (props.record.status === 0 || props.record.status >= 500 ? 'danger' : 'warning'));
const detail = computed(() => CATEGORY_LABEL[props.record.category] || props.record.category);
// Display the redacted URL so screenshots/demos never show tokens from query strings.
const safeUrl = computed(() => redactUrl(props.record.url));
</script>

<template>
  <li>
    <button
      type="button"
      class="item"
      :class="[`item--${tone}`, { 'item--selected': selected }]"
      :aria-pressed="selected"
      data-testid="error-row"
      @click="$emit('select', record.id)"
    >
      <span class="item__row">
        <span class="item__left">
          <span class="tag" :class="tone === 'danger' ? 'tag--danger' : 'tag--warning'">{{ record.method }}</span>
          <span class="item__path" :title="safeUrl">{{ urlPath(safeUrl) }}</span>
        </span>
        <span class="item__status">{{ describeStatus(record) }}</span>
      </span>
      <span class="item__row item__row--meta">
        <span>Latency: {{ formatDuration(record.durationMs) }}</span>
        <span class="item__detail">{{ detail }}</span>
      </span>
    </button>
  </li>
</template>

<style scoped>
.item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 4px 6px;
  border: 0;
  border-left: 2px solid transparent;
  border-radius: 2px;
  background: var(--bi-surface-raised);
  text-align: left;
  font: 12px/1.4 var(--bi-font-mono);
  cursor: pointer;
}
.item:hover { background: var(--bi-border); }
.item--selected { background: var(--bi-border); border-left-color: var(--bi-accent); }
.item__row { display: flex; justify-content: space-between; gap: 8px; min-width: 0; }
.item__left { display: flex; align-items: center; gap: 6px; min-width: 0; }
.item__path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--bi-text); }
.item__status { flex: none; white-space: nowrap; }
.item--danger .item__status { color: var(--bi-danger); }
.item--warning .item__status { color: var(--bi-warning); }
.item__row--meta { color: var(--bi-text-muted); font-size: 11px; }
.item__detail { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
