<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import StatusBanner from './components/StatusBanner.vue';
import InspectorHud from './components/InspectorHud.vue';
import AiRootCauseCard from './components/AiRootCauseCard.vue';
import BreakdownPanel from './components/BreakdownPanel.vue';
import { useNetworkErrors } from './useNetworkErrors.js';
import { useAiSummary } from './useAiSummary.js';
import { computeStats } from '../lib/stats.js';
import { filterRecords } from '../lib/filter.js';
import { buildMarkdownReport } from '../lib/report.js';

const { errors, paused, targetUrl, available, clear, ensureResponseBody } = useNetworkErrors();
const ai = useAiSummary({ ensureResponseBody });

const filter = ref('');
const selectedId = ref(null);
const toast = ref('');

const autoIntercept = computed({
  get: () => !paused.value,
  set: (on) => { paused.value = !on; },
});
const stats = computed(() => computeStats(errors.value));
const visible = computed(() => filterRecords(errors.value, filter.value));
const selected = computed(() => errors.value.find((r) => r.id === selectedId.value) || null);
const aiState = computed(() => ai.stateFor(selected.value));

function select(id) {
  selectedId.value = id;
  ensureResponseBody(selected.value);
}

function generate(force = false) {
  if (selected.value) ai.generate(selected.value, { force });
}

function clearAll() {
  clear();
  ai.reset();
  selectedId.value = null;
}

function flash(message) {
  toast.value = message;
  setTimeout(() => { toast.value = ''; }, 1800);
}

// DevTools frames may block the async Clipboard API, so fall back to execCommand.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

async function copyReport() {
  if (!selected.value) return;
  await ensureResponseBody(selected.value);
  await copyText(buildMarkdownReport(selected.value, aiState.value.result || null));
  flash('Report copied (redacted)');
}

function onKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
    event.preventDefault();
    generate();
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <main class="panel">
    <StatusBanner :stats="stats" :paused="paused" :target-url="targetUrl" />

    <div class="panel__grid">
      <div class="panel__col">
        <InspectorHud
          v-model:auto-intercept="autoIntercept"
          :records="visible"
          :total-count="errors.length"
          :stats="stats"
          :selected-id="selectedId"
          :ai-busy="aiState.status === 'loading'"
          :backend="ai.backend.value"
          :api-base-url="ai.apiBaseUrl"
          :available="available"
          @select="select"
          @generate="generate()"
          @copy-report="copyReport"
          @clear="clearAll"
        />
        <AiRootCauseCard :state="aiState" :has-selection="Boolean(selected)" @retry="generate(true)" @copy="copyReport" />
      </div>

      <BreakdownPanel v-model:filter="filter" :record="selected" :match-count="visible.length" />
    </div>

    <p v-if="toast" class="panel__toast" role="status" data-testid="toast">{{ toast }}</p>
  </main>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: var(--bi-gap); padding: var(--bi-gap); }
.panel__grid {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: var(--bi-gap);
  align-items: start;
}
.panel__col { display: flex; flex-direction: column; gap: var(--bi-gap); min-width: 0; }
@media (max-width: 760px) {
  .panel__grid { grid-template-columns: minmax(0, 1fr); }
}
.panel__toast {
  position: fixed;
  right: 12px;
  bottom: 12px;
  margin: 0;
  padding: 4px 10px;
  border-radius: 2px;
  background: var(--bi-accent);
  color: var(--bi-accent-ink);
  font: 600 12px var(--bi-font-mono);
}
</style>
