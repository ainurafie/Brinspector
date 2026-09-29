<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit: { type: String, default: '' },
  caption: { type: String, default: '' },
  tone: { type: String, default: 'danger', validator: (v) => ['danger', 'warning', 'accent'].includes(v) },
  ratio: { type: Number, default: 0 }, // 0..1, fill of the bottom bar
});
</script>

<template>
  <div class="stat" :class="`stat--${tone}`">
    <span class="stat__label">{{ label }}</span>
    <div class="stat__row">
      <span class="stat__value">{{ value }}<small v-if="unit">{{ unit }}</small></span>
      <span class="stat__caption">{{ caption }}</span>
    </div>
    <span class="stat__bar"><span class="stat__fill" :style="{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }" /></span>
  </div>
</template>

<style scoped>
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 4px 6px 4px;
  background: var(--bi-surface);
  border-radius: 2px;
  min-width: 0;
}
.stat__label {
  font: 600 10px var(--bi-font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.stat__row { display: flex; align-items: baseline; justify-content: space-between; gap: 4px; }
.stat__value { font: 500 20px/1.2 var(--bi-font-sans); color: var(--tone); }
.stat__value small { font-size: 12px; margin-left: 1px; }
.stat__caption { font: 11px var(--bi-font-mono); color: var(--bi-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stat__bar { height: 4px; border-radius: 2px; background: var(--bi-border-strong); overflow: hidden; margin-top: 2px; }
.stat__fill { display: block; height: 100%; background: var(--tone); transition: width 0.3s; }

.stat--danger { --tone: var(--bi-danger); }
.stat--danger .stat__label { color: var(--bi-danger); }
.stat--warning { --tone: var(--bi-warning); }
.stat--warning .stat__label { color: var(--bi-warning); }
.stat--accent { --tone: var(--bi-accent); }
.stat--accent .stat__label { color: var(--bi-text-code-strong); }
.stat--accent .stat__value { color: var(--bi-text); }
</style>
