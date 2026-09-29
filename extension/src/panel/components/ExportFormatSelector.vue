<script setup>
// Figma .export-format-selectors — ".HAR  JIRA  MD  PDF" (spec F-006).
defineProps({
  canExportSelected: { type: Boolean, default: false }, // MD / JIRA need a selected failure
  canExportAll: { type: Boolean, default: false }, // .HAR needs at least one failure
});
defineEmits(['export']);
</script>

<template>
  <div class="efs" role="group" aria-label="Export format">
    <button type="button" class="efs__btn" :disabled="!canExportAll" title="Download all failures as redacted HAR" data-testid="export-har" @click="$emit('export', 'har')">.HAR</button>
    <button type="button" class="efs__btn" :disabled="!canExportSelected" title="Copy selected failure as Jira markup" data-testid="export-jira" @click="$emit('export', 'jira')">JIRA</button>
    <button type="button" class="efs__btn" :disabled="!canExportSelected" title="Download selected failure as Markdown" data-testid="export-md" @click="$emit('export', 'md')">MD</button>
    <button type="button" class="efs__btn" disabled title="PDF export — F-006 backlog" data-testid="export-pdf">PDF</button>
  </div>
</template>

<style scoped>
/* .export-format-selectors (Figma CSS) */
.efs {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: var(--bi-surface-sunken);
  border-radius: 2px;
}
.efs__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: 2px;
  background: transparent;
  color: var(--bi-text-soft);
  font: 400 10px var(--bi-font-mono);
  cursor: pointer;
}
.efs__btn:hover:not(:disabled) { background: var(--bi-hover-overlay); }
.efs__btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
