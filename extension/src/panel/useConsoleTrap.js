import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  CLEAR_CONSOLE_TRAP_BUFFER_SCRIPT,
  DRAIN_CONSOLE_TRAP_SCRIPT,
  INSTALL_CONSOLE_TRAP_SCRIPT,
  toConsoleExceptionRecord,
  UNINSTALL_CONSOLE_TRAP_SCRIPT,
} from '../lib/consoleTrap.js';

const MAX_EXCEPTION_RECORDS = 500;

export function useConsoleTrap(available) {
  const enabled = ref(false);
  const records = ref([]);
  const error = ref('');
  let nextId = 0;
  let generation = 0;
  let pollTimer = null;
  let pollPending = false;

  function isAvailable() {
    return Boolean(available?.value ?? available) && Boolean(globalThis.chrome?.devtools?.inspectedWindow);
  }

  function showEvalError(exceptionInfo, fallback) {
    error.value = String(exceptionInfo?.value || exceptionInfo?.description || fallback);
  }

  function evalInInspectedPage(expression, callback) {
    try {
      chrome.devtools.inspectedWindow.eval(expression, callback);
    } catch (exception) {
      callback(undefined, { isException: true, value: exception?.message });
    }
  }

  function pollBuffer() {
    if (!enabled.value || pollPending || !isAvailable()) return;
    pollPending = true;
    const requestGeneration = generation;
    evalInInspectedPage(DRAIN_CONSOLE_TRAP_SCRIPT, (captures, exceptionInfo) => {
      if (requestGeneration !== generation) return;
      pollPending = false;
      if (exceptionInfo?.isException) {
        showEvalError(exceptionInfo, 'Console Trap could not read the page error buffer.');
        return;
      }
      if (!Array.isArray(captures)) {
        showEvalError(null, 'Console Trap returned an invalid page error buffer.');
        return;
      }

      const newRecords = captures.map((capture) => {
        nextId -= 1;
        return toConsoleExceptionRecord(capture, nextId);
      });
      if (newRecords.length) {
        records.value = [...newRecords.reverse(), ...records.value].slice(0, MAX_EXCEPTION_RECORDS);
      }
    });
  }

  function installHook() {
    if (!isAvailable()) {
      showEvalError(null, 'Open this panel from Chrome DevTools to enable Console Trap.');
      return;
    }
    const installGeneration = ++generation;
    pollPending = false;
    error.value = '';
    evalInInspectedPage(INSTALL_CONSOLE_TRAP_SCRIPT, (installed, exceptionInfo) => {
      if (installGeneration !== generation || !enabled.value) return;
      if (exceptionInfo?.isException || installed !== true) {
        showEvalError(exceptionInfo, 'Console Trap could not be installed on this page.');
        return;
      }
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(pollBuffer, 1000);
    });
  }

  function uninstallHook() {
    generation += 1;
    pollPending = false;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    error.value = '';
    if (!isAvailable()) return;
    evalInInspectedPage(UNINSTALL_CONSOLE_TRAP_SCRIPT, (_result, exceptionInfo) => {
      if (exceptionInfo?.isException) {
        showEvalError(exceptionInfo, 'Console Trap could not be removed from this page.');
      }
    });
  }

  function onNavigated() {
    if (!enabled.value) return;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    pollPending = false;
    installHook();
  }

  function clear() {
    records.value = [];
    if (enabled.value && isAvailable()) {
      evalInInspectedPage(CLEAR_CONSOLE_TRAP_BUFFER_SCRIPT, (_result, exceptionInfo) => {
        if (exceptionInfo?.isException) {
          showEvalError(exceptionInfo, 'Console Trap could not clear the page error buffer.');
        }
      });
    }
  }

  watch(enabled, (isEnabled) => {
    if (isEnabled) installHook();
    else uninstallHook();
  }, { flush: 'sync' });

  onMounted(() => {
    if (isAvailable()) chrome.devtools.network.onNavigated?.addListener(onNavigated);
  });

  onBeforeUnmount(() => {
    if (isAvailable()) chrome.devtools.network.onNavigated?.removeListener(onNavigated);
    if (enabled.value) enabled.value = false;
    else uninstallHook();
  });

  return { enabled, records, error, clear };
}