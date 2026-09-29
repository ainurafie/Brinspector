# AGENTS.md — BRINSPECTOR

> DRAFT dari starter. Workshop menyarankan file ini ditulis dan dirawat oleh manusia:
> baca, sesuaikan dengan kata-kata tim sendiri, dan perbarui seiring proyek berjalan.

## Product context
BRINSPECTOR is a Chrome extension (DevTools panel first, toolbar popup later). It captures failed
requests (and later JS exceptions) and asks an AI (through our own backend) for the root cause and fix.
UI design: Figma file `n4DsSHcxUMYVAl2JW5mbPH`; node links per component in `docs/plan.md` §11 (frame 1:1130 = DevTools panel).
When using Figma MCP, request one specific node at a time and adapt the result to existing components and `panel.css` tokens.
Users: developers and QA in a banking environment → privacy is non-negotiable.

Source of truth: `docs/plan.md`, then `specs/features/*/spec.md`.
Current state: `docs/progress.md`. Task order: `docs/runbook.md` (once created).

## Tech stack
- `extension/`: Chrome Manifest V3, Vue 3 (Composition API, `<script setup>`), Vite, plain JavaScript (no TypeScript).
- `backend/`: Fastify 5, plain JavaScript (CommonJS), Node.js 20+.
- Tests: Jest (unit), Playwright (E2E). Monorepo with npm workspaces.

## Architecture rules
- Pure logic lives in `extension/src/lib/` (no `chrome.*` calls there) so it is unit-testable.
- Only `extension/src/panel/` and `extension/src/devtools.js` may touch `chrome.devtools.*`.
- UI building blocks live in `extension/src/panel/components/`; reuse them before creating new ones.
- Colors, spacing and fonts come from the CSS variables in `extension/src/panel/panel.css` (design tokens). No hardcoded hex values in components.
- The extension never calls an AI provider directly and never contains API keys.
- AI provider code lives only in `backend/src/services/`. Routes stay thin.
- Every payload sent to the backend must pass through `redact()` first.

## Conventions
- Descriptive names (`buildSummarizePayload`, not `build`). Small functions.
- Validation errors from the API return 422 with a clear message; AI failures return 502.
- Never log request/response bodies or headers on the backend.
- Never create, edit or commit `.env` files. Use `.env.example`.
- Do not add npm dependencies without stating why in your answer.
- Minimal manifest permissions; ask before adding any.

## Workflow
1. Before large changes, read `docs/plan.md` and the relevant feature spec.
2. For new work, propose a plan first; implement in small checkpoints.
3. Add or update tests for every new logic path (`*.test.js` next to `tests/unit/`).
4. After a checkpoint, update `docs/progress.md`.
5. If a spec is ambiguous or conflicts with the code, STOP and ask — do not guess.

## Stopping criteria
- Stop after the requested checkpoint is done and tests pass; summarize changes in ≤ 10 bullets.
- Stop if the same test fails 3 times after fixes; report what you tried.
- Do not refactor unrelated files.

## Commands
- `npm run dev:backend` — backend on http://localhost:3000
- `npm run build:ext` — build extension into `extension/dist` (load unpacked)
- `npm test` — all unit tests
- `npm run test:e2e` — Playwright E2E

<!-- Opsional: tambahkan blok RTK dan Graphify di bawah ini setelah tools terpasang
     (lihat docs/panduan-langkah.md Fase 2). -->
