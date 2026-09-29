<script setup>
// Figma node 1:776 "Catatan Insiden / Incident Notes" (.incident-remarks-field). Spec F-006.
import { computed } from 'vue';

const MAX_NOTE_CHARS = 500;

const PRESETS = [
  { tag: '#Repro-100%', tone: 'accent' },
  { tag: '#Staging', tone: 'muted' },
  { tag: '#P1-Blocker', tone: 'danger' },
  { tag: '#PaymentGateway', tone: 'warning' },
];

const notes = defineModel('notes', { type: String, default: '' });
const tags = defineModel('tags', { type: Array, default: () => [] });

const count = computed(() => notes.value.length);

function toggleTag(tag) {
  tags.value = tags.value.includes(tag) ? tags.value.filter((t) => t !== tag) : [...tags.value, tag];
}
</script>

<template>
  <section class="notes" data-testid="incident-notes">
    <header class="notes__head">
      <h2 class="notes__title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M3 6h14M3 11h10M3 16h6" />
          <path d="M20 12l-7 7-3 1 1-3 7-7 2 2z" />
        </svg>
        CATATAN INSIDEN / INCIDENT NOTES
        <span class="notes__optional mono">(OPSIONAL)</span>
      </h2>
      <span class="notes__hint mono">Markdown syntax supported</span>
    </header>

    <textarea
      v-model="notes"
      class="notes__input mono"
      rows="3"
      :maxlength="MAX_NOTE_CHARS"
      placeholder="e.g. Terjadi setelah klik tombol bayar dengan kartu kredit sandbox. Gateway timeout di layer 7, token checkout undefined..."
      aria-label="Catatan insiden"
      data-testid="notes-input"
    />

    <footer class="notes__footer mono">
      <span class="notes__presets-label">PRESETS:</span>
      <button
        v-for="preset in PRESETS"
        :key="preset.tag"
        type="button"
        class="notes__tag"
        :class="[`notes__tag--${preset.tone}`, { 'notes__tag--on': tags.includes(preset.tag) }]"
        :aria-pressed="tags.includes(preset.tag)"
        data-testid="preset-tag"
        @click="toggleTag(preset.tag)"
      >{{ preset.tag }}</button>
      <span class="notes__count" data-testid="notes-count">{{ count }} / {{ MAX_NOTE_CHARS }} chars</span>
    </footer>

    <div v-if="$slots.export" class="notes__export mono">
      <span class="notes__presets-label">EXPORT:</span>
      <slot name="export" />
    </div>
  </section>
</template>

<style scoped>
/* .incident-remarks-field (Figma CSS) */
.notes {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 8px;
  background: var(--bi-surface);
  border-radius: var(--bi-radius);
  box-shadow: var(--bi-shadow-md);
}
.notes__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.notes__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font: 600 13px var(--bi-font-sans);
  color: var(--bi-text);
}
.notes__title svg { color: var(--bi-accent-tab); }
.notes__optional { font-weight: 400; font-size: 11px; letter-spacing: 0.06em; color: var(--bi-text-muted); }
.notes__hint { font-size: 11px; color: var(--bi-text-muted); }

.notes__input {
  width: 100%;
  min-height: 64px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: var(--bi-surface-sunken);
  color: var(--bi-text);
  font-size: 12px;
  line-height: 1.6;
  resize: vertical;
}
.notes__input::placeholder { color: var(--bi-text-dim); }
.notes__input:focus { outline: none; border-color: var(--bi-accent-ink); }

.notes__footer { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font-size: 11px; }
.notes__presets-label { color: var(--bi-text-muted); font-weight: 700; letter-spacing: 0.06em; margin-right: 2px; }
.notes__tag {
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: var(--bi-border);
  font: 12px/18px var(--bi-font-mono);
  cursor: pointer;
}
.notes__tag--accent { color: var(--bi-text-code-strong); }
.notes__tag--muted { color: var(--bi-text-muted); }
.notes__tag--danger { color: var(--bi-danger); }
.notes__tag--warning { color: var(--bi-warning); }
.notes__tag--on { border-color: currentColor; background: var(--bi-chip); }
.notes__count { margin-left: auto; color: var(--bi-text-muted); }
.notes__export { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 11px; }
</style>
