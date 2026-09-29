# Progress — BRINSPECTOR

> Diperbarui oleh tim/Copilot setelah setiap checkpoint. Copilot membaca file ini untuk tahu apa yang sudah ada.

## Status per 2026-09-29 (v0.2.0 — desain Figma diterapkan)

### Sudah ada
- **Panel DevTools "BRINSPECTOR"** mengikuti Figma frame 1:1130:
  - `StatusBanner`: status Auto-Trigger, jumlah kegagalan, target URL, chip "Interception Paused".
  - `InspectorHud`: logo, toggle Auto-Intercept (berfungsi), Console Trap (disabled → F-004), kartu statistik (Network Drop, Client Error, Trace Latency), tombol *Generate Diagnostic Report* (Ctrl/Cmd+E), Copy Report, Clear Logs, *Active Failure Stream*, status backend.
  - `AiRootCauseCard`: idle/loading/error/done, badge severity, penyebab & saran, Copy as Markdown, Regenerate.
  - `BreakdownPanel`: tab *Active Breakdown* (response header + body) dan *Payload & State* (request header + body), filter regex (ESC untuk reset).
  - Design tokens di `panel.css` (container dari Figma CSS export; warna lain dari render Figma); font Inter + JetBrains Mono dibundel lokal (`@fontsource`); ikon extension dari logo SVG Figma.
- `extension/src/lib/`: `errorFilter`, `redact`, `buildPayload`, `apiClient` (+ `checkHealth`), `format`, `stats`, `filter`, `report`.
- URL & header sensitif juga di-mask di UI (aman untuk screenshot/demo).
- Backend Fastify: `GET /health`, `POST /api/summarize` (422 validasi, 413 batas body, 502 provider gagal), provider `mock` / `azure` / `openai`.
- Test: 58 unit extension, 21 unit backend, 10 E2E Playwright (capture, filter, Auto-Intercept, breakdown, AI happy path, shortcut, privasi payload, 422 + retry, backend offline).
- Git hook `pre-push` menjalankan `npm test`.

### Endpoint tersedia
| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/health` | Cek backend hidup + provider aktif |
| POST | `/api/summarize` | Ringkasan satu error |

### Belum ada (backlog)
- F-001: separator navigasi, filter chip per kategori.
- F-002: uji & tuning provider nyata (Microsoft Foundry), pilihan bahasa di UI.
- F-003: redaksi ulang di backend, preview payload, pola PII (email, HP, NIK, kartu) di teks bebas.
- F-004: Console Trap (JS exceptions + stack frame).
- F-006: incident notes, preset tag, export .HAR/MD/Jira.
- Eksplorasi: F-005 popup + badge, F-007 screenshot, F-008 options.
- Swagger `/api-docs`, `docs/architecture.md`.
