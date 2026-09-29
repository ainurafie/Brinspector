<script setup>
// Figma node 1:1392 "Deep Diagnostic Breakdown 2: Console Stack Trace Viewer".
// Renders the output of toExceptionView() from src/lib/stack.js (spec F-004).
import { ref } from 'vue';

const props = defineProps({
  exception: { type: Object, required: true }, // { type, message, frames, codeFrame, sourceMapped }
});

const openFrame = ref(null);

function toggle(index) {
  openFrame.value = openFrame.value === index ? null : index;
}

function location(frame) {
  return `${frame.file}:${frame.line}:${frame.column}`;
}
</script>

<template>
  <section class="stv" data-testid="stack-trace-viewer">
    <header class="stv__head">
      <span class="tag tag--warning-solid">EXCEPTION</span>
      <span class="stv__title mono">Uncaught {{ props.exception.type }}</span>
      <span v-if="props.exception.sourceMapped !== undefined" class="stv__map mono">
        SourceMap: {{ props.exception.sourceMapped ? 'Mapped' : 'Not mapped' }}
      </span>
    </header>
    <p v-if="props.exception.message" class="stv__message mono" data-testid="exception-message">{{ props.exception.message }}</p>

    <!-- .code-frame-snippet -->
    <div v-if="props.exception.codeFrame" class="stv__code mono" data-testid="code-frame">
      <div class="stv__code-head">
        <span class="stv__file">{{ props.exception.codeFrame.file }}</span>
        <span>LOC: {{ props.exception.codeFrame.line }}</span>
      </div>
      <div
        v-for="line in props.exception.codeFrame.lines"
        :key="line.number"
        class="stv__line"
        :class="{ 'stv__line--error': line.isError }"
      >
        <span class="stv__num"><span v-if="line.isError" class="stv__marker">&gt;</span>{{ line.number }}</span>
        <code class="stv__src">{{ line.text }}</code>
      </div>
    </div>

    <span class="label stv__label">Stack Frame Execution Order</span>

    <!-- .interactive-trace-accordion -->
    <ol class="stv__frames mono" data-testid="stack-frames">
      <li v-for="(frame, index) in props.exception.frames" :key="index">
        <button
          type="button"
          class="stv__frame"
          :class="{ 'stv__frame--top': index === 0 }"
          :aria-expanded="openFrame === index"
          @click="toggle(index)"
        >
          <span class="stv__call">at {{ frame.fn }} <span class="stv__loc">({{ location(frame) }})</span></span>
          <span class="stv__depth">#{{ index + 1 }}</span>
        </button>
        <p v-if="openFrame === index" class="stv__detail">{{ frame.url }}:{{ frame.line }}:{{ frame.column }}</p>
      </li>
      <li v-if="!props.exception.frames.length" class="stv__none">(no stack frames captured)</li>
    </ol>
  </section>
</template>

<style scoped>
/* .console-stack-trace-viewer (Figma CSS) */
.stv {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 8px;
  background: var(--bi-surface-raised);
  border-radius: var(--bi-radius);
  min-width: 0;
}
.stv__head { display: flex; align-items: center; gap: 8px; min-width: 0; }
.stv__title { font-size: 13px; color: var(--bi-text); white-space: nowrap; }
.stv__map { margin-left: auto; font-size: 12px; color: var(--bi-danger); white-space: nowrap; }
.stv__message { margin: 0; font-size: 12px; color: var(--bi-danger-body); overflow-wrap: anywhere; }

/* .code-frame-snippet (Figma CSS) */
.stv__code {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 4px;
  background: var(--bi-surface-sunken);
  border-radius: 2px;
  font-size: 12px;
  overflow-x: auto;
}
.stv__code-head { display: flex; justify-content: space-between; gap: 8px; color: var(--bi-text-muted); padding: 0 2px 2px; }
.stv__file { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stv__line { display: flex; gap: 12px; padding: 1px 2px; color: var(--bi-text); }
.stv__num { flex: none; width: 4ch; text-align: right; color: var(--bi-text-muted); }
.stv__src { font: inherit; white-space: pre; }
.stv__line--error { background: var(--bi-danger-row); color: var(--bi-danger); padding: 4px 2px; }
.stv__line--error .stv__num { color: var(--bi-danger); font-weight: 700; }
.stv__marker { margin-right: 4px; }

.stv__label { margin-top: 4px; }

/* .interactive-trace-accordion (Figma CSS) */
.stv__frames { display: flex; flex-direction: column; gap: 2px; width: 100%; margin: 0; padding: 0; list-style: none; font-size: 12px; }
.stv__frame {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 3px 4px;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--bi-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.stv__frame:hover, .stv__frame[aria-expanded='true'] { background: var(--bi-border); }
.stv__frame--top .stv__call { color: var(--bi-text-code-strong); }
.stv__call { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stv__loc { color: inherit; }
.stv__depth { flex: none; color: var(--bi-text-muted); }
.stv__detail { margin: 0; padding: 2px 8px 4px; color: var(--bi-text-muted); font-size: 11px; overflow-wrap: anywhere; }
.stv__none { color: var(--bi-text-dim); padding: 3px 4px; }
</style>
