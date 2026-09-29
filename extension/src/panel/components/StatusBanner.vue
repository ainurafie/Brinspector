<script setup>
import { computed } from 'vue';
import BiIcon from './BiIcon.vue';
import { buildHeadline } from '../../lib/stats.js';

const props = defineProps({
  stats: { type: Object, required: true },
  paused: { type: Boolean, default: false },
  targetUrl: { type: String, default: '' },
});

const headline = computed(() => buildHeadline(props.stats));
</script>

<template>
  <header class="banner" data-testid="status-banner">
    <div class="banner__row">
      <span class="tag tag--pill banner__pill" :class="{ 'banner__pill--paused': paused }">
        <span class="banner__dot" />{{ paused ? 'AUTO-TRIGGER PAUSED' : 'AUTO-TRIGGER ACTIVE' }}
      </span>
      <span class="banner__divider" aria-hidden="true" />
      <h1 class="banner__title" data-testid="error-count">{{ headline.title }}</h1>
      <span class="banner__detail">{{ headline.detail }}</span>
    </div>
    <div class="banner__row">
      <span class="banner__chip" :title="targetUrl">
        <BiIcon name="target" :size="12" class="banner__accent" />TARGET:
        <span class="banner__url">{{ targetUrl || 'waiting for inspected page…' }}</span>
      </span>
      <span v-if="paused" class="banner__chip banner__chip--warning" data-testid="paused-chip">
        <BiIcon name="pause" :size="12" />Interception Paused
      </span>
    </div>
  </header>
</template>

<style scoped>
.banner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 8px;
  background: var(--bi-surface);
  border-radius: var(--bi-radius);
  box-shadow: var(--bi-shadow-sm);
}
.banner__row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.banner__pill { gap: 6px; letter-spacing: 0.06em; }
.banner__pill--paused { background: var(--bi-warning-solid); color: var(--bi-warning); }
.banner__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.banner__divider { width: 1px; height: 12px; background: var(--bi-border-strong); }
.banner__title { margin: 0; font: 600 13px var(--bi-font-sans); color: var(--bi-text); }
.banner__detail { color: var(--bi-text-muted); font-size: 12px; }
.banner__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 1px 6px;
  border-radius: 2px;
  background: var(--bi-surface-sunken);
  color: var(--bi-text-muted);
  font: 11px var(--bi-font-mono);
}
.banner__chip--warning { background: var(--bi-surface-raised); color: var(--bi-warning); }
.banner__accent { color: var(--bi-accent); }
.banner__url { color: var(--bi-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
