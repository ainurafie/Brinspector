# Proposal

## Why

Today the only way to see a failure count is to open DevTools and look at the BRINSPECTOR panel. Developers, QA, and tech leads need an at-a-glance signal — a badge on the toolbar icon — so they notice failures on the current tab without opening DevTools first. This is F-005 from `docs/plan.md` §5, called out there as an "Eksplorasi" item to be planned through OpenSpec before implementation.

## What Changes

- Add a Manifest V3 popup (`chrome.action`) that shows a per-tab summary: total failed requests, a breakdown by category (server/client/network), and a button/link that focuses the DevTools panel (or tells the user to open DevTools) for full detail.
- Add a background service worker that uses `chrome.webRequest` (`onCompleted` / `onErrorOccurred`, status and headers only — **never response bodies**) to count failed requests per tab and set the `chrome.action` badge text/color.
- Reset the per-tab counter on navigation (`chrome.webRequest.onBeforeRequest` main-frame navigation, or `chrome.tabs.onUpdated` with `status: 'loading'`), mirroring the "separator on navigate" behavior already specced for the DevTools panel (F-001).
- Reuse the existing pure classification logic (`categorizeError` / `isFailedEntry` conventions from `extension/src/lib/errorFilter.js`) rather than duplicating "what counts as a failure" — extract/share it so the background worker and the DevTools panel agree on categories.
- **BREAKING (manifest)**: adds new permissions to `extension/public/manifest.json`: `webRequest`, `action`, a `background` service worker entry, and `host_permissions` (`<all_urls>` or a narrower set, to be confirmed in design). Per `AGENTS.md`, this requires explicit approval before implementation — flagged again in `design.md`.

## Capabilities

### New Capabilities
- `toolbar-popup-badge`: badge counter + popup summary for failed requests on the active tab, backed by `chrome.webRequest` (status/headers only) and `chrome.action`, independent from the DevTools panel's HAR-based capture.

### Modified Capabilities
- None. F-001's HAR-based capture in the DevTools panel is unchanged; this adds a second, independent observation path (`webRequest`) rather than altering existing behavior.

## Impact

- `extension/public/manifest.json`: new permissions (`webRequest`, `action`, `host_permissions`) and a `background.service_worker` entry — **requires team approval** before an apply step edits it (AGENTS.md: "Minimal manifest permissions; ask before adding any").
- New extension code: a background service worker (`extension/src/background/`, chrome API calls only) and a popup UI (`extension/src/popup/`, Vue 3 + Vite build target alongside the existing `panel.html`/`devtools.html` entries).
- Possible extraction of shared pure logic out of `extension/src/lib/errorFilter.js` (or a new `extension/src/lib/webRequestFilter.js`) so category counting stays unit-testable and consistent with the DevTools panel.
- `extension/vite.config.js`: add a build entry for the popup (and background worker, if it needs bundling).
- No backend impact — this feature is fully client-side and never sends data off the device.
- Docs: `docs/plan.md` §11 already links Figma nodes 1:451 and 1:2 for this feature; `specs/features/README.md` marks F-005 status.
