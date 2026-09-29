# toolbar-popup-badge Specification

## Purpose

Give developers, QA, and tech leads an at-a-glance failure signal on the browser toolbar — a badge count and a quick per-tab summary — without needing to open the DevTools panel first.

## Requirements

### Requirement: Per-tab failure badge
The extension SHALL show a badge on its toolbar icon (`chrome.action`) with the number of failed requests observed on the currently active tab since that tab's last navigation. A request is "failed" using the same definition as F-001: `response.status >= 400`, or the request never got a response (`status === 0` / a browser network error).

#### Scenario: A failed request increments the badge
- **WHEN** the active tab issues a request that receives a 404, 500, or a network error (e.g. `net::ERR_NAME_NOT_RESOLVED`)
- **THEN** the toolbar badge text increases by one and reflects the new per-tab failure count

#### Scenario: Successful requests do not affect the badge
- **WHEN** the active tab issues a request that receives a 200, 204, or 304 response, or a 3xx redirect
- **THEN** the toolbar badge count does not change

#### Scenario: No failures shows an empty badge
- **WHEN** a tab has had zero failed requests since its last navigation
- **THEN** the toolbar badge text is empty (no badge shown)

#### Scenario: Badge caps its displayed text for very high counts
- **WHEN** the per-tab failure count exceeds 99
- **THEN** the badge displays `99+` instead of the exact number

### Requirement: Badge resets on navigation
The per-tab failure counter SHALL reset when the tab navigates to a new top-level document, so the badge always reflects the currently loaded page rather than accumulating across page loads.

#### Scenario: Navigating to a new page clears the previous count
- **WHEN** a tab with a non-zero badge count navigates to a new URL (full page navigation, not a same-document/hash change)
- **THEN** the badge resets to empty and counts only failures observed after the navigation

#### Scenario: Same-document navigation does not reset the count
- **WHEN** a tab updates its URL via a hash change or `history.pushState` without a full document reload
- **THEN** the badge count is preserved

### Requirement: Badge reflects the active tab
The toolbar badge SHALL always represent the currently focused/active browser tab, and update immediately when the user switches tabs.

#### Scenario: Switching tabs updates the badge
- **WHEN** the user switches from a tab with 3 failures to a tab with 0 failures
- **THEN** the badge immediately updates to show empty (0), not the previous tab's count

#### Scenario: Closing a tab releases its counter
- **WHEN** a tab is closed
- **THEN** the extension discards that tab's failure counter and does not leak memory across a long browsing session

### Requirement: Popup summary of the active tab's failures
Clicking the toolbar icon SHALL open a popup showing the active tab's total failure count and a breakdown by category (server / client / network), consistent with the categories already used by the DevTools panel (F-001).

#### Scenario: Popup shows total and category breakdown
- **WHEN** the user clicks the toolbar icon on a tab with failed requests
- **THEN** the popup shows the total failure count and counts per category (e.g. "2 Server, 1 Network")

#### Scenario: Popup empty state
- **WHEN** the user clicks the toolbar icon on a tab with zero failures
- **THEN** the popup shows an empty/idle message instead of a zeroed breakdown

#### Scenario: Popup links to the full DevTools panel
- **WHEN** the popup is open and shows at least one failure
- **THEN** it offers a clear call-to-action telling the user to open DevTools → BRINSPECTOR for full request detail and AI root cause (the popup itself does not duplicate headers/body inspection)

### Requirement: Popup and badge never access request or response bodies
Counting and categorizing failures for the badge/popup SHALL rely only on request/response status and headers (via `chrome.webRequest`), never on request or response bodies, keeping this feature outside the privacy boundary that governs body redaction (F-003).

#### Scenario: Classification uses status/headers only
- **WHEN** the background worker classifies a failed request for the badge/popup
- **THEN** it uses only the response status code and browser error text (no `requestBody`/`responseBody` field is read or stored)

#### Scenario: No additional data leaves the browser
- **WHEN** the badge/popup feature is active
- **THEN** no request/response data it observes is sent to the BRINSPECTOR backend or any other network destination

### Requirement: Minimal additional permissions
The extension SHALL request only the permissions strictly required for this feature (`webRequest`, `action`, and the narrowest workable `host_permissions`), and SHALL NOT use `chrome.debugger` or request response-body access for this feature.

#### Scenario: Manifest lists only the required new permissions
- **WHEN** the manifest is inspected after this feature ships
- **THEN** it includes `webRequest`, `action`, and a scoped `host_permissions` entry for this feature, and does NOT include `webRequestBlocking`, `chrome.debugger`, or any permission needed to read response bodies
