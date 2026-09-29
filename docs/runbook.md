# MVP Runbook

Execute checkpoints in order. Do not begin the next feature until the current exit gate passes. Owners below are role-based placeholders; assign named team members before implementation.

## Checkpoint 0: Baseline

| Task | Owner | Figma node |
| --- | --- | --- |
| Run `npm test`, `npm run test:e2e`, `npm run build:ext`, and coverage checks; record existing failures and gaps. | TBD - QA | — |
| Confirm acceptance criteria, resolve blockers listed under Open decisions, and assign named owners. | TBD - Product/Tech Lead | — |

**Exit gate:** Baseline results and named owners are recorded.

## Checkpoint 1: F-003 - Privacy redaction

| Task | Owner | Figma node |
| --- | --- | --- |
| Reconcile rules and fixtures for sensitive headers, query parameters, nested JSON fields, free-text PII, body truncation, and mixed-case keys. | TBD - Extension + Backend | — |
| Complete extension redaction for email, Indonesian phone, NIK, card-like numbers, JWT/Bearer, and existing secret fields; verify pure/immutable behavior. | TBD - Extension | — |
| Add backend redaction before prompt construction; test that original secret values never reach the provider and are never logged. | TBD - Backend | — |
| Redact incident notes before they are sent or exported. | TBD - Extension | 1:776 (notes UI) |
| Add a redacted payload preview and require explicit user confirmation before sending. Preview placement is not specified; use the breakdown only as a visual reference. | TBD - Extension + Design | 1:1345 (reference; placement TBD) |

**Exit gate:** Unit tests cover every redaction rule, immutability, and truncation; backend tests prove secrets are redacted before provider use; E2E verifies preview and explicit confirmation. Do not proceed to a real provider until this gate passes.

## Checkpoint 2: F-004 - Console and JavaScript exceptions

| Task | Owner | Figma node |
| --- | --- | --- |
| Define toggle, reload, navigation, cleanup, duplicate-event, and original-handler behavior; verify the CSP assumption in Chrome. | TBD - Extension + QA | — |
| Update the API and category contract so exceptions with `status: 0` and `resourceType: "script"` are not classified as `NETWORK_ERROR`; update schema, prompt, and tests together. | TBD - Backend | — |
| Implement capture, bounded buffer polling, navigation reinstall, redaction, and failure-stream integration without adding manifest permissions. | TBD - Extension | — |
| Complete exception and stack-trace UI, including the Exceptions count and `JS ERR` stream entry. | TBD - Extension + Design | 1:1130, 1:1392 |

**Exit gate:** Unit tests cover capture normalization, redaction, and classification. E2E verifies capture within two seconds, navigation behavior, and stream display. No new manifest permissions are added.

## Checkpoint 3: F-006 - Incident notes and exports

| Task | Owner | Figma node |
| --- | --- | --- |
| Define whether exports include filtered-out failures and F-004 exceptions. | TBD - Product + Extension | — |
| Verify that notes and all exported records pass through redaction; cover body truncation. | TBD - Extension | 1:776 |
| Verify HAR validity/importability and Markdown/Jira contents with unit and E2E tests; assert fixture secrets are absent from every format. | TBD - Extension + QA | 1:776 |
| Keep PDF and “Diagnostic Bundle Packed” out of MVP unless behavior and acceptance criteria are approved. PDF is optional; bundle contents are undefined. | TBD - Product/Tech Lead | 1:776 (defer UI) |
| Verify existing notes/export UI against the design; change it only for an approved requirement. | TBD - Extension + Design | 1:776 |

**Exit gate:** Existing HAR, Markdown, and Jira exports pass validity and privacy tests; inclusion rules are documented. This is a close-out of implemented core exports, not a rebuild.

## Checkpoint 4: F-002 - Real AI provider

| Task | Owner | Figma node |
| --- | --- | --- |
| Specify Foundry endpoint format, model/deployment, API version, and backend environment configuration. Keep credentials backend-only. | TBD - Backend | — |
| Test success, malformed output, timeout, provider errors, and safe logging; retain mock mode for CI and demos. | TBD - Backend + QA | — |
| Smoke-test with synthetic, redacted data; measure response latency against the agreed under-10-second target. | TBD - Backend + QA | — |
| Decide whether language selection is MVP; implement only if approved. | TBD - Product + Extension | 1:1298 |

**Exit gate:** Provider smoke test passes using synthetic data, credentials remain backend-only, no unredacted payload reaches the provider, and mock tests remain green.

## Checkpoint 5: MVP acceptance and documentation

| Task | Owner | Figma node |
| --- | --- | --- |
| Run unit tests, E2E, extension build, and coverage checks; meet the 80% core-logic coverage target. | TBD - QA | — |
| Complete `docs/architecture.md` and `/api-docs`, or explicitly revise these MVP requirements. | TBD - Tech Lead + Backend | — |
| Update `docs/progress.md` with completed work, test results, coverage, and deferred scope. | TBD - Tech Lead | — |

**Exit gate:** MVP acceptance criteria are verified or explicitly revised; remaining test, security, and documentation gaps are recorded.

## Open decisions

- F-003 requires the “same” redaction in extension and backend, although these are separate runtimes. Use shared code only if practical; otherwise require behavioral parity tests against common fixtures.
- Payload preview is a constraint in F-003 but is also listed as backlog. Confirm it is an MVP requirement and approve its placement; node 1:1345 is only a nearby visual reference.
- F-004 sends `status: 0`, which current categorization treats as a network error. Agree on an exception discriminator/category before connecting exception summaries to the backend.
- Validate F-004 hook behavior under CSP, toggle-off, reload, and navigation in Chrome; the spec's CSP claim needs browser-level verification.
- F-006 says export failures that are “visible” but does not define interaction with filters or exception records. Resolve before closing the checkpoint.
- F-006 PDF is optional and the diagnostic bundle has no defined contents or acceptance criteria; defer both unless explicitly added to MVP.
- F-002's under-10-second target and 20-second timeout need a defined measurement and failure expectation; “Foundry endpoint v1” needs exact deployment and API-version details.
- MVP acceptance requires 80% core coverage, `docs/architecture.md`, and `/api-docs`; progress currently does not mark these complete.
