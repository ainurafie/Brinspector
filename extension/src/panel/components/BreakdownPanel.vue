<script setup>
import { computed, ref } from 'vue';
import BiIcon from './BiIcon.vue';
import StackTraceViewer from './StackTraceViewer.vue';
import { describeStatus, formatBody, urlPath } from '../../lib/format.js';
import { redactHeaders, redactUrl } from '../../lib/redact.js';

const props = defineProps({
  record: { type: Object, default: null },
  matchCount: { type: Number, default: 0 },
});
const filter = defineModel('filter', { type: String, default: '' });

const tab = ref('response'); // 'response' | 'request'

const isDanger = computed(() => !props.record || props.record.status === 0 || props.record.status >= 500);
// Headers are shown masked in the UI too, so screenshots/demos never expose credentials.
const headers = computed(() =>
  Object.entries(redactHeaders(tab.value === 'response' ? props.record?.responseHeaders : props.record?.requestHeaders)),
);
const body = computed(() => {
  if (!props.record) return null;
  return formatBody(tab.value === 'response' ? props.record.responseBody : props.record.requestBody);
});
const bodyLoading = computed(() => tab.value === 'response' && props.record && !props.record.bodyLoaded);
const safeUrl = computed(() => redactUrl(props.record?.url || ''));
const meta = computed(() => [props.record?.resourceType, props.record?.mimeType].filter(Boolean).join(' · '));

function isAccentHeader(name) {
  return /^(cf-ray|x-request-id|x-correlation-id|traceparent)$/i.test(name);
}
</script>

<template>
  <section class="bd" aria-label="Active breakdown">
    <div class="bd__tabs" role="tablist">
      <button type="button" role="tab" class="bd__tab" :aria-selected="tab === 'response'" data-testid="tab-response" @click="tab = 'response'">
        <BiIcon name="gear" :size="12" />Active Breakdown ({{ matchCount }})
      </button>
      <button type="button" role="tab" class="bd__tab" :aria-selected="tab === 'request'" data-testid="tab-request" @click="tab = 'request'">
        <BiIcon name="braces" :size="12" />Payload &amp; State
      </button>
    </div>

    <label class="bd__filter">
      <BiIcon name="filter" :size="12" />
      <span class="bd__filter-label">Filter regex:</span>
      <input
        v-model="filter"
        type="text"
        placeholder="/v1|error/"
        spellcheck="false"
        data-testid="filter-input"
        @keydown.esc="filter = ''"
      />
      <kbd>ESC</kbd>
    </label>

    <p v-if="!record" class="bd__empty" data-testid="breakdown-empty">Pilih error dari stream untuk melihat detailnya.</p>

    <!-- JS exception records (spec F-004) carry record.exception = toExceptionView(...) -->
    <StackTraceViewer v-else-if="record.exception" :exception="record.exception" />

    <article v-else class="bd__detail" data-testid="breakdown">
      <header class="bd__head">
        <span class="tag" :class="isDanger ? 'tag--danger-soft' : 'tag--warning-solid'">{{ record.status || 'NET' }}</span>
        <span class="bd__req mono" :title="safeUrl">{{ record.method }} {{ urlPath(safeUrl) }}</span>
        <span class="bd__meta mono">{{ meta }}</span>
      </header>
      <p class="bd__status mono">{{ describeStatus(record) }} · {{ record.category }}</p>

      <table class="bd__table mono">
        <thead>
          <tr><th>{{ tab === 'response' ? 'Header key' : 'Request header' }}</th><th>Observed value</th></tr>
        </thead>
        <tbody>
          <tr v-for="[name, value] in headers" :key="name">
            <td>{{ name }}</td>
            <td :class="{ 'bd__value--accent': isAccentHeader(name), 'bd__value--redacted': value === '[REDACTED]' }">{{ value }}</td>
          </tr>
          <tr v-if="!headers.length"><td colspan="2" class="bd__none">(no headers captured)</td></tr>
        </tbody>
      </table>

      <span class="label">{{ tab === 'response' ? 'Response body preview' : 'Request body' }}</span>
      <pre class="bd__body mono" data-testid="body-preview">{{ bodyLoading ? 'Loading…' : body ?? '(no body)' }}</pre>
    </article>
  </section>
</template>

<style scoped>
.bd {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: var(--bi-surface);
  border-radius: var(--bi-radius-lg);
  box-shadow: var(--bi-shadow-lg);
  min-width: 0;
}
.bd__tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.bd__tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--bi-text-muted);
  font: 12px var(--bi-font-mono);
  cursor: pointer;
}
.bd__tab[aria-selected='true'] { background: var(--bi-border); color: var(--bi-accent-tab); }

.bd__filter {
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  max-width: 100%;
  padding: 2px 6px;
  border-radius: 2px;
  background: var(--bi-surface-sunken);
  color: var(--bi-text-muted);
  font: 11px var(--bi-font-mono);
}
.bd__filter input {
  width: 180px;
  min-width: 60px;
  border: 0;
  background: transparent;
  color: var(--bi-text);
  font: inherit;
  outline: none;
}
.bd__filter kbd { font: inherit; color: var(--bi-text-dim); }

.bd__empty { margin: 0; padding: 24px 8px; color: var(--bi-text-muted); text-align: center; }

/* .deep-diagnostic-breakdown (Figma CSS) */
.bd__detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: var(--bi-surface-raised);
  border-radius: var(--bi-radius);
  min-width: 0;
}
.bd__head { display: flex; align-items: center; gap: 8px; min-width: 0; }
.bd__req { font-size: 13px; color: var(--bi-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bd__meta { margin-left: auto; font-size: 11px; color: var(--bi-text-muted); white-space: nowrap; }
.bd__status { margin: 0; font-size: 11px; color: var(--bi-text-muted); }

.bd__table { width: 100%; border-collapse: collapse; table-layout: fixed; background: var(--bi-surface-sunken); border-radius: 2px; font-size: 11px; }
.bd__table th, .bd__table td { padding: 2px 8px; text-align: left; overflow-wrap: anywhere; vertical-align: top; }
.bd__table th { font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--bi-text-muted); font-size: 10px; }
.bd__table td:first-child { color: var(--bi-text-muted); width: 40%; }
.bd__table td:last-child { color: var(--bi-text-code); }
.bd__value--accent { color: var(--bi-warning) !important; }
.bd__value--redacted { color: var(--bi-danger) !important; }
.bd__none { color: var(--bi-text-dim) !important; }

.bd__body {
  margin: 0;
  max-height: 260px;
  overflow: auto;
  padding: 6px 8px;
  border-radius: 2px;
  background: var(--bi-surface-sunken);
  color: var(--bi-danger-body);
  font-size: 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
