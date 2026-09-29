<script setup>
import { computed } from 'vue';
import BiIcon from './BiIcon.vue';
import StatCard from './StatCard.vue';
import ToggleSwitch from './ToggleSwitch.vue';
import FailureStreamItem from './FailureStreamItem.vue';
import { formatLatency } from '../../lib/format.js';
import logoUrl from '../assets/logo.svg';

const props = defineProps({
  records: { type: Array, required: true }, // already filtered
  totalCount: { type: Number, required: true },
  stats: { type: Object, required: true },
  selectedId: { type: Number, default: null },
  aiBusy: { type: Boolean, default: false },
  backend: { type: Object, required: true },
  apiBaseUrl: { type: String, required: true },
  consoleTrapError: { type: String, default: '' },
  available: { type: Boolean, default: true },
});
const autoIntercept = defineModel('autoIntercept', { type: Boolean, default: true });
const consoleTrap = defineModel('consoleTrap', { type: Boolean, default: false });
defineEmits(['select', 'generate', 'copy-report', 'clear']);

// eslint-disable-next-line no-undef
const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
const shortcut = isMac ? 'CMD+E' : 'CTRL+E';

const ratio = (count) => (props.stats.total ? count / props.stats.total : 0);
const latencyRatio = computed(() => Math.min(1, props.stats.peakLatencyMs / 10000));
const latency = computed(() => {
  const text = formatLatency(props.stats.peakLatencyMs);
  const match = text.match(/^([\d.]+)(ms|s)$/);
  return match ? { value: match[1], unit: match[2] } : { value: text, unit: '' };
});
</script>

<template>
  <section class="hud" aria-label="BRINSPECTOR inspector">
    <span class="hud__glow" aria-hidden="true" />

    <header class="hud__header">
      <img :src="logoUrl" alt="" width="32" height="32" class="hud__logo" />
      <div class="hud__brand">
        <div class="hud__name">BRINSPECTOR <span class="tag tag--accent">v{{ version }}</span></div>
        <div class="hud__sub mono">Hook: chrome.devtools.network</div>
      </div>
      <span class="tag tag--pill" :class="{ 'hud__monitor--off': !autoIntercept }">
        {{ autoIntercept ? 'MONITOR ON' : 'MONITOR OFF' }}
      </span>
    </header>

    <div class="hud__toggles">
      <ToggleSwitch v-model="autoIntercept" label="Auto-Intercept" data-testid="toggle-intercept" />
      <ToggleSwitch
        v-model="consoleTrap"
        label="Console Trap"
        :hint="available ? 'Capture page exceptions' : 'Open this panel in DevTools'"
        :disabled="!available"
        data-testid="toggle-console-trap"
      />
    </div>
    <p v-if="consoleTrapError" class="hud__console-error" role="alert" data-testid="console-trap-error">
      {{ consoleTrapError }}
    </p>

    <div class="hud__stats">
      <StatCard
        label="Network Drop"
        :value="stats.networkDrop"
        :caption="stats.networkDropStatuses"
        tone="danger"
        :ratio="ratio(stats.networkDrop)"
        data-testid="stat-network"
      />
      <StatCard
        label="Client Error"
        :value="stats.client"
        :caption="stats.clientStatuses"
        tone="warning"
        :ratio="ratio(stats.client)"
        data-testid="stat-client"
      />
      <StatCard
        label="Trace Latency"
        :value="latency.value"
        :unit="latency.unit"
        caption="Peak"
        tone="accent"
        :ratio="latencyRatio"
      />
      <StatCard
        label="Exceptions"
        :value="stats.exceptions"
        caption="Script"
        tone="danger"
        :ratio="ratio(stats.exceptions)"
        data-testid="stat-exceptions"
      />
    </div>

    <button
      type="button"
      class="hud__generate"
      :disabled="!selectedId || aiBusy"
      data-testid="generate-button"
      @click="$emit('generate')"
    >
      <BiIcon name="bolt" :size="16" />
      <span>{{ aiBusy ? 'Analyzing…' : 'Generate Diagnostic Report' }}</span>
      <kbd class="hud__kbd">{{ shortcut }}</kbd>
    </button>

    <div class="hud__actions">
      <button type="button" class="btn" :disabled="!selectedId" data-testid="copy-report" @click="$emit('copy-report')">
        <BiIcon name="copy" :size="12" />Copy Report
      </button>
      <button type="button" class="btn btn--danger" :disabled="!totalCount" data-testid="clear-button" @click="$emit('clear')">
        <BiIcon name="trash" :size="12" />Clear Logs
      </button>
    </div>

    <div class="hud__stream-head">
      <span class="label">Active Failure Stream</span>
      <span class="hud__showing">Showing {{ records.length }} of {{ totalCount }}</span>
    </div>

    <p v-if="!available" class="hud__empty">Open this panel from Chrome DevTools to capture network errors.</p>
    <p v-else-if="!totalCount" class="hud__empty" data-testid="empty-state">
      No failed requests yet. Reload the page or trigger an action to capture errors.
    </p>
    <p v-else-if="!records.length" class="hud__empty" data-testid="no-match">No failures match the current filter.</p>
    <ul v-else class="hud__stream" data-testid="error-table">
      <FailureStreamItem
        v-for="record in records"
        :key="record.id"
        :record="record"
        :selected="record.id === selectedId"
        @select="$emit('select', $event)"
      />
    </ul>

    <footer class="hud__footer mono">
      <span data-testid="backend-status">
        <span class="hud__dot" :class="{ 'hud__dot--off': !backend.ok }" />
        <template v-if="!backend.checked">Checking backend…</template>
        <template v-else-if="backend.ok">Backend connected ({{ backend.provider }})</template>
        <template v-else>Backend offline — {{ apiBaseUrl }}</template>
      </span>
      <span>PII auto-redact ON</span>
    </footer>
  </section>
</template>

<style scoped>
.hud {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: var(--bi-surface-sunken);
  border-radius: var(--bi-radius-lg);
  overflow: hidden;
  box-shadow: var(--bi-shadow-lg);
}
.hud__glow {
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, var(--bi-danger), var(--bi-warning) 50%, var(--bi-accent));
}
.hud__header { display: flex; align-items: center; gap: 8px; padding: 4px 0 0; }
.hud__logo { display: block; flex: none; border-radius: 6px; }
.hud__brand { flex: 1; min-width: 0; }
.hud__name { display: flex; align-items: center; gap: 6px; font: 600 13px var(--bi-font-sans); color: var(--bi-text); }
.hud__sub { font-size: 11px; color: var(--bi-text-muted); }
.hud__monitor--off { background: var(--bi-chip); color: var(--bi-text-muted); }

.hud__toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.hud__console-error { margin: 0; color: var(--bi-danger); font-size: 11px; overflow-wrap: anywhere; }
.hud__stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }

.hud__generate {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 2px;
  background: var(--bi-accent);
  color: var(--bi-accent-ink);
  font: 600 13px var(--bi-font-mono);
  cursor: pointer;
}
.hud__generate span { flex: 1; text-align: left; }
.hud__generate:hover:not(:disabled) { background: var(--bi-accent-strong); }
.hud__generate:disabled { opacity: 0.5; cursor: not-allowed; }
.hud__kbd {
  padding: 0 4px;
  border-radius: 2px;
  background: var(--bi-accent-strong);
  color: var(--bi-accent-ink);
  font: 10px var(--bi-font-mono);
}

.hud__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }

.hud__stream-head { display: flex; justify-content: space-between; align-items: baseline; margin-top: 2px; }
.hud__showing { font: 11px var(--bi-font-mono); color: var(--bi-text-muted); }
.hud__stream {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 300px;
  overflow-y: auto;
}
.hud__empty { margin: 0; padding: 12px 6px; color: var(--bi-text-muted); background: var(--bi-surface); border-radius: 2px; }

.hud__footer { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--bi-text-muted); }
.hud__dot { display: inline-block; width: 6px; height: 6px; margin-right: 4px; border-radius: 50%; background: var(--bi-accent); }
.hud__dot--off { background: var(--bi-danger); }
</style>
