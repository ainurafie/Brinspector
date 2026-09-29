<script setup>
import { computed } from 'vue';
import BiIcon from './BiIcon.vue';

const props = defineProps({
  state: { type: Object, required: true }, // { status: idle|loading|done|error, result?, error? }
  hasSelection: { type: Boolean, default: false },
});
defineEmits(['retry', 'copy']);

const SEVERITY_CLASS = { high: 'tag--pill', medium: 'tag--warning', low: 'tag--chip' };
const result = computed(() => props.state.result);
const severityClass = computed(() => SEVERITY_CLASS[result.value?.severity] || 'tag--chip');
</script>

<template>
  <section class="ai" aria-live="polite" data-testid="ai-card">
    <header class="ai__head">
      <h2 class="ai__title"><BiIcon name="sparkles" :size="14" class="ai__spark" />AI Root Cause Inference</h2>
      <span v-if="state.status === 'done'" class="tag" :class="severityClass" data-testid="ai-severity">
        {{ result.severity.toUpperCase() }} SEVERITY
      </span>
    </header>

    <p v-if="state.status === 'idle'" class="ai__muted">
      {{ hasSelection ? 'Tekan Generate Diagnostic Report untuk menganalisis error ini.' : 'Pilih error di Active Failure Stream terlebih dahulu.' }}
    </p>

    <p v-else-if="state.status === 'loading'" class="ai__muted ai__loading" data-testid="ai-loading">
      Menganalisis payload yang sudah diredaksi…
    </p>

    <div v-else-if="state.status === 'error'" class="ai__error" data-testid="ai-error">
      <p><BiIcon name="alert" :size="12" /> {{ state.error }}</p>
      <button type="button" class="btn" data-testid="ai-retry" @click="$emit('retry')">
        <BiIcon name="refresh" :size="12" />Coba lagi
      </button>
    </div>

    <template v-else>
      <p class="ai__summary" data-testid="ai-summary">{{ result.summary }}</p>
      <div class="ai__lists">
        <div v-if="result.likelyCauses.length">
          <span class="label">Kemungkinan penyebab</span>
          <ul><li v-for="(cause, i) in result.likelyCauses" :key="`c${i}`">{{ cause }}</li></ul>
        </div>
        <div v-if="result.suggestedFixes.length">
          <span class="label">Saran perbaikan</span>
          <ul><li v-for="(fix, i) in result.suggestedFixes" :key="`f${i}`">{{ fix }}</li></ul>
        </div>
      </div>
      <footer class="ai__footer">
        <button type="button" class="btn ai__chip" @click="$emit('copy')"><BiIcon name="copy" :size="12" />Copy as Markdown</button>
        <button type="button" class="btn ai__chip" @click="$emit('retry')"><BiIcon name="refresh" :size="12" />Regenerate</button>
        <span class="ai__meta mono">{{ result.category }} · perkiraan AI ({{ result.provider }})</span>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.ai {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: var(--bi-surface);
  border-radius: var(--bi-radius-lg);
}
.ai__head { margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ai__title { display: flex; align-items: center; gap: 6px; margin: 0; font: 600 13px var(--bi-font-sans); color: var(--bi-text); }
.ai__spark { color: var(--bi-warning); }
.ai__summary { margin: 0; font: 13px/1.6 var(--bi-font-sans); color: var(--bi-text-muted); }
.ai__muted { margin: 0; color: var(--bi-text-muted); font-size: 12px; }
.ai__loading::after { content: ''; display: inline-block; width: 8px; height: 8px; margin-left: 6px; border-radius: 50%; background: var(--bi-accent); animation: pulse 1s infinite; }
@keyframes pulse { 50% { opacity: 0.2; } }
.ai__error { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--bi-danger); }
.ai__error p { margin: 0; display: flex; align-items: center; gap: 6px; }
.ai__lists { margin-top: 4px; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
.ai__lists ul { margin: 4px 0 0; padding-left: 16px; color: var(--bi-text); font-size: 12px; }
.ai__footer { margin-top: 4px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.ai__chip { height: 22px; background: var(--bi-chip); color: var(--bi-text-muted); }
.ai__meta { margin-left: auto; font-size: 10px; color: var(--bi-text-dim); }
</style>
