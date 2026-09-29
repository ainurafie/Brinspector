# Tasks

## 1. Permission approval gate

- [x] 1.1 Confirm with the team that adding `webRequest`, `action`, and `host_permissions: ["http://*/*", "https://*/*"]` to `extension/public/manifest.json` is approved (per `AGENTS.md`: "ask before adding any [permission]"). Verify: written sign-off/decision recorded in the PR description or a note in this change before task 2.x edits the manifest.
  - Approved by the user during apply (2026-09-29). Note: `action` is not a real Chrome permission string (chrome.action is enabled by the top-level `action` manifest key, not a `permissions` entry) — the manifest declares `permissions: ["webRequest"]` plus the `action`/`background` keys, which grants the same capability the approval covered.

## 2. Shared failure-classification helper

- [x] 2.1 Extract/expose the status+errorText classification used by `categorizeError` (`extension/src/lib/errorFilter.js`) as the single source of truth for "what counts as a failure" and which category it maps to; add a small adapter (e.g. `extension/src/lib/webRequestClassify.js`) that maps a `chrome.webRequest` `onCompleted`/`onErrorOccurred` details object (`{ statusCode, error }`) to the same `{ status, errorText }` shape `categorizeError` accepts. No `chrome.*` calls in this file. Verify: new unit test file `extension/tests/unit/webRequestClassify.test.js` covers 200/304 (not failed), 404/500 (failed, correct category), and a `net::ERR_NAME_NOT_RESOLVED`-style error (failed, `NETWORK_ERROR`), matching the spec's "per-tab failure badge" and "classification uses status/headers only" scenarios.
- [x] 2.2 Add a pure badge-label helper (e.g. `formatBadgeCount(n)` in `extension/src/lib/format.js` or a new small module) implementing the `99+` cap. Verify: unit tests cover `0 → ''`, `1 → '1'`, `99 → '99'`, `100 → '99+'`.

## 3. Background service worker (badge counting)

- [x] 3.1 Add `extension/src/background/serviceWorker.js`: register `chrome.webRequest.onCompleted`/`onErrorOccurred` listeners, classify each request with the task 2.1 helper, and maintain an in-memory `Map<tabId, { total, byCategory }>`. Verify: manual load-unpacked smoke test — triggering a 404/500 on a test page increments the in-memory count (inspectable via a temporary `console.log` or the service worker's DevTools console during development).
  - Wired (via `tabCounters.js`, unit-tested); manual load-unpacked smoke test still pending (tracked with task 5.2's manual verification).
- [x] 3.2 Reset a tab's counter on main-frame navigation (`chrome.webRequest.onBeforeRequest` filtered to `type: 'main_frame'`, or `chrome.webNavigation.onCommitted` if simpler to wire correctly). Verify: manual test — navigating a tab clears its badge; a hash-only URL change does not.
- [x] 3.3 Update the toolbar badge via `chrome.action.setBadgeText({ tabId, text })` / `setBadgeBackgroundColor` whenever a tab's counter changes and whenever the active tab changes (`chrome.tabs.onActivated`). Use the task 2.2 helper for the displayed text. Verify: manual test — badge shows the right count on the active tab and updates immediately on tab switch (spec: "Badge reflects the active tab").
- [x] 3.4 Clean up a tab's counter on `chrome.tabs.onRemoved`. Verify: manual test or a small in-memory map assertion (extract the map-management logic into a plain, unit-testable module, e.g. `extension/src/background/tabCounters.js`, with pure `record()`/`reset()`/`dispose()` functions) — unit test confirms `dispose(tabId)` removes the entry.
  - `extension/tests/unit/tabCounters.test.js` covers record/reset/dispose/independent tabs.

## 4. Popup UI

- [x] 4.1 Create `extension/popup.html` + `extension/src/popup/main.js` + `extension/src/popup/PopupSummary.vue` showing total failures and a category breakdown for the active tab, requested from the background worker via `chrome.runtime.sendMessage`. Verify: manual load-unpacked test — opening the popup on a tab with failures shows the correct total and per-category counts (spec: "Popup summary of the active tab's failures").
  - Built; manual load-unpacked confirmation still pending (see task 5.2 note).
- [x] 4.2 Add an empty state ("no failures on this tab") and a CTA linking/instructing the user to open DevTools → BRINSPECTOR for full detail. Verify: manual test on a tab with zero failures shows the empty state, not a zeroed breakdown (spec: "Popup empty state").
- [x] 4.3 Style the popup using the existing design tokens from `extension/src/panel/panel.css` (reuse CSS variables; no hardcoded hex values, per `AGENTS.md`).

## 5. Build & manifest wiring

- [x] 5.1 Add `popup.html` (and the background service worker, if it needs bundling) as new Vite build entries in `extension/vite.config.js`. Verify: `npm run build --workspace extension` succeeds and emits `dist/popup.html` and the background worker bundle.
  - Verified: `npm run build --workspace extension` emits `dist/popup.html` and a stable `dist/background.js`.
- [x] 5.2 Update `extension/public/manifest.json` with `action.default_popup`, the `background.service_worker` entry, and the permissions approved in task 1.1. Verify: `npm run build --workspace extension` succeeds and the unpacked extension loads in Chrome without a manifest error, with the toolbar icon showing a popup on click.
  - Manifest updated and build verified. Loading the unpacked `dist/` in real Chrome and clicking the toolbar icon has NOT been manually verified in this session — please smoke-test before shipping.

## 6. Docs & catalog updates

- [x] 6.1 Update `specs/features/README.md` and `docs/plan.md` §5 to move F-005 from "Eksplorasi" to its implemented status, and add a `specs/features/F-005-toolbar-popup-badge/spec.md` (copied from `_template/feature-template.md`, matching this change's spec delta) so the feature catalog stays the project's single index, per the project's convention of keeping one spec per feature ID. Verify: `specs/features/README.md` table links to the new file and the file exists.
- [x] 6.2 Update `docs/progress.md` with what shipped in this checkpoint (badge, popup, new permissions) per the project's "update progress after a checkpoint" workflow. Verify: entry is present and mentions the new test counts.

## 7. End-to-end verification

- [ ] 7.1 Add a Playwright E2E spec (e.g. `tests/e2e/toolbar-popup-badge.spec.js`) exercising: a failing request updates the badge, navigating resets it, and the popup shows the right breakdown — extending the existing Chrome-extension test harness (`tests/e2e/chromeStub.js` or the real extension loading approach already used by `tests/e2e/capture-errors.spec.js`). Verify: `npm run test:e2e` passes including the new spec.
- [x] 7.2 Run the full test suite (`npm test` at the repo root, per `AGENTS.md` commands) and confirm no regressions in existing unit/E2E tests.
  - `npm test` (root): 176 extension + 30 backend unit tests pass. `npx playwright test`: 20/21 pass; the one failure (`incident-report.spec.js` › "Markdown export ... no secrets", a `toast` text assertion) is in unrelated, already-modified F-006 export code (`git status` shows `App.vue`/`ExportFormatSelector.vue`/`report.js`/that spec file were mid-change before this session started) — not caused by this change and out of this change's scope to fix.
