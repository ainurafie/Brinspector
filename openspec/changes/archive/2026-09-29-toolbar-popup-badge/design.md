# Design

## Context

See proposal.md - Why. Today BRINSPECTOR only has a DevTools panel (`extension/src/panel/`) driven by `chrome.devtools.network.getHAR()`. There is no `background` service worker and no `chrome.action` popup in the current `extension/public/manifest.json`. `chrome.webRequest` cannot read response bodies, so this feature is architecturally independent from the panel's HAR-based capture (see `docs/plan.md` §4 hybrid architecture) — it is a second, coarser observation path for a quick badge/summary, not a replacement for the panel.

`AGENTS.md` requires manifest permission changes to be called out and approved before an apply step edits `manifest.json`; this design flags the exact permissions needed so that approval can happen up front.

## Goals / Non-Goals

**Goals:**
- Show a live per-tab failure badge and a lightweight popup summary, backed only by status/headers (`chrome.webRequest`), consistent with the F-001 failure definition and category set.
- Keep classification logic shared/pure and unit-testable, reusing the existing category contract from `extension/src/lib/errorFilter.js` instead of re-implementing it.
- Keep the new permission surface as small as possible and get it approved before implementation.

**Non-Goals:**
- Replacing or duplicating the DevTools panel's detailed breakdown, AI root cause, or export features.
- Reading or redacting request/response bodies in the background worker (out of scope for this feature; F-003 redaction still only applies to the panel's data path).
- Cross-tab aggregation, history, or persistence beyond the current browsing session.

## Decisions

- **Background service worker owns state; popup is a stateless view.** The MV3 service worker (`extension/src/background/serviceWorker.js`) holds an in-memory `Map<tabId, { total, byCategory }>`, updated from `chrome.webRequest.onCompleted` / `onErrorOccurred`. The popup (`extension/src/popup/`) asks for the active tab's counts via `chrome.runtime.sendMessage` on open rather than keeping its own state, since MV3 service workers can be killed/restarted and the popup should always show fresh data.
  - *Alternative considered*: `chrome.storage.session` for counts, read directly by the popup. Rejected for MVP: adds an async storage round-trip and a second source of truth for no real benefit at this scale (counts are small, per-tab, and don't need to survive a worker restart mid-session — a restart simply resets the badge, which is an acceptable, rare edge case).

- **Reuse `categorizeError`/status-based failure detection from `extension/src/lib/errorFilter.js`.** `isFailedEntry`/`categorizeError` already encode "what counts as a failure" for HAR entries; extract the status/errorText-only parts (already side-effect-free) so both the panel and the background worker classify identically. Where the shapes differ (HAR entry vs. `chrome.webRequest` callback details), add a small adapter in `extension/src/lib/` (pure, unit-tested) that maps a `WebRequestDetails`-like object to the same `{ status, errorText }` inputs `categorizeError` already accepts.
  - *Alternative considered*: a separate classification function under `extension/src/background/`. Rejected because duplicated category logic drifts over time and violates the "small functions, no duplication" convention in `AGENTS.md`.

- **Badge count resets on main-frame navigation, not on every request.** Use `chrome.webRequest.onBeforeRequest` filtered to `type: 'main_frame'` (or `chrome.webNavigation.onCommitted` if already available) to detect a real page load and clear that tab's counter, matching the F-001 "separator on navigate" behavior already specced for the panel.
  - *Alternative considered*: reset via `chrome.tabs.onUpdated` with `status: 'loading'`. Rejected as the primary mechanism because it can fire multiple times per navigation and for sub-resource-driven URL updates; `onBeforeRequest`/`main_frame` is the more precise signal. `onUpdated` may still be used defensively as a fallback in implementation.

- **Badge display caps at "99+".** Simple, matches common browser-extension conventions (e.g. unread counters), and avoids an unbounded/wrapping badge string.

- **Permissions requested statically in the manifest, scoped to `http`/`https`.** Add `"permissions": ["webRequest", "action"]` and `"host_permissions": ["http://*/*", "https://*/*"]` (not `<all_urls>`, which would also cover `file://`/`ftp://`). This is the minimum needed for `chrome.webRequest` to observe requests on normal web pages.
  - *Alternative considered*: `optional_host_permissions` requested at runtime (e.g. on first popup open) for a narrower default footprint. Rejected for MVP because it adds a permission-request UX flow and the badge would not work until granted, undermining the "at a glance" goal; revisit if the security/legal review of this proposal asks for opt-in scoping instead.
  - **This permission set must be explicitly approved before an apply step touches `extension/public/manifest.json`**, per `AGENTS.md`.

- **Popup is a separate small Vue entry point, not reusing panel components.** `extension/src/popup/main.js` + a minimal `PopupSummary.vue`, built as a new Vite entry (`popup.html`) alongside the existing `panel.html`/`devtools.html`. The popup only needs a total, a category breakdown, and a CTA — pulling in the full panel component tree would be unnecessary weight for a popup that Chrome tears down on every close.

## Risks / Trade-offs

- [Service worker can be terminated by Chrome between requests, resetting in-memory counts] → Acceptable for MVP (badge just goes back to counting from zero); document as a known limitation rather than adding `chrome.storage.session` complexity now.
- [New `host_permissions` increases the extension's footprint and re-triggers a Chrome Web Store / internal security review] → Called out explicitly in proposal.md Impact and gated on approval before implementation; keep scoped to `http`/`https` only (no `file://`, no `<all_urls>`).
- [Badge/category logic drifting from the panel's `errorFilter.js` over time] → Mitigated by sharing the same pure classification function instead of duplicating it (see Decisions).
- [Popup shows stale data if the service worker was just restarted and hasn't seen any requests yet for a long-lived tab] → Acceptable: popup naturally reflects "failures since worker start (or navigation)"; not required to backfill from `chrome.devtools.network.getHAR()`, which is a DevTools-only API unavailable to the background worker/popup.

## Open Questions

- Exact badge color per category mix (e.g. all-server-error red vs. mixed categories amber) — a visual/Figma detail (nodes 1:451, 1:2) that can be resolved during implementation from the Figma spec without changing behavior or the task breakdown.
