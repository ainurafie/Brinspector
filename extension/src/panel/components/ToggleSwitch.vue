<script setup>
defineProps({
  label: { type: String, required: true },
  disabled: { type: Boolean, default: false },
  hint: { type: String, default: '' },
});
const model = defineModel({ type: Boolean, default: false });
</script>

<template>
  <label class="toggle" :class="{ 'toggle--disabled': disabled }" :title="hint">
    <span class="toggle__label">{{ label }}<small v-if="hint" class="toggle__hint">{{ hint }}</small></span>
    <input v-model="model" type="checkbox" role="switch" :disabled="disabled" class="toggle__input" />
    <span class="toggle__track" aria-hidden="true"><span class="toggle__thumb" /></span>
  </label>
</template>

<style scoped>
.toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 3px 6px;
  background: var(--bi-border);
  border-radius: 2px;
  font: 12px var(--bi-font-mono);
  cursor: pointer;
}
.toggle--disabled { cursor: not-allowed; opacity: 0.55; }
.toggle__hint { margin-left: 6px; color: var(--bi-text-dim); font-size: 10px; }
.toggle__input { position: absolute; opacity: 0; pointer-events: none; }
.toggle__track {
  position: relative;
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: var(--bi-chip);
  transition: background 0.15s;
}
.toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--bi-text-muted);
  transition: transform 0.15s, background 0.15s;
}
.toggle__input:checked + .toggle__track { background: var(--bi-accent); }
.toggle__input:checked + .toggle__track .toggle__thumb { transform: translateX(12px); background: var(--bi-accent-ink); }
.toggle__input:focus-visible + .toggle__track { outline: 2px solid var(--bi-accent); outline-offset: 2px; }
</style>
