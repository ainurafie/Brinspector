// Pure per-tab failure counter bookkeeping for the toolbar badge (F-005).
// No chrome.* calls here — see tests/unit/tabCounters.test.js. Used by
// extension/src/background/serviceWorker.js, which owns the chrome.* glue.

function emptyCounter() {
  return { total: 0, byCategory: {} };
}

/** Creates an isolated per-tab counter store: get/record/reset/dispose. */
export function createTabCounters() {
  const counters = new Map();

  return {
    /** Current counter for a tab, or an empty one if nothing was recorded yet. */
    get(tabId) {
      return counters.get(tabId) || emptyCounter();
    },
    /** Record one more failure of `category` for a tab; returns the updated counter. */
    record(tabId, category) {
      const current = counters.get(tabId) || emptyCounter();
      const next = {
        total: current.total + 1,
        byCategory: { ...current.byCategory, [category]: (current.byCategory[category] || 0) + 1 },
      };
      counters.set(tabId, next);
      return next;
    },
    /** Clear a tab's counter back to zero (called on main-frame navigation). */
    reset(tabId) {
      counters.set(tabId, emptyCounter());
    },
    /** Forget a tab entirely (called when the tab closes) so memory doesn't grow unbounded. */
    dispose(tabId) {
      counters.delete(tabId);
    },
  };
}
