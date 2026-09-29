# Progress — BRINSPECTOR

> Diperbarui oleh tim/Copilot setelah setiap checkpoint. Copilot membaca file ini untuk tahu apa yang sudah ada.

## Status per 2026-09-29 (v0.2.0 — desain Figma diterapkan, notes & export termasuk PDF)

### Sudah ada
- **Panel DevTools "BRINSPECTOR"** mengikuti Figma frame 1:1130:
  - `StatusBanner`: status Auto-Trigger, jumlah kegagalan, target URL, chip "Interception Paused".
  - `InspectorHud`: logo, toggle Auto-Intercept dan Console Trap, kartu statistik (Network Drop, Client Error, Trace Latency, Exceptions), tombol *Generate Diagnostic Report* (Ctrl/Cmd+E), Copy Report, Clear Logs, *Active Failure Stream*, status backend.
  - `AiRootCauseCard`: idle/loading/error/done, badge severity, penyebab & saran, Copy as Markdown, Regenerate.
  - `BreakdownPanel`: tab *Active Breakdown* (response header + body) dan *Payload & State* (request header + body), filter regex (ESC untuk reset). Menampilkan `StackTraceViewer` bila record punya `exception`.
  - `StackTraceViewer` (node 1:1392): header exception, code frame dengan baris error, stack frame yang bisa dibuka (siap dipakai F-004).
  - `IncidentNotes` (node 1:776): catatan maks 500 karakter + preset tag; ikut ke Copy Report dan export.
  - `ExportFormatSelector` (node 1:776): `.HAR` ter-redaksi, `JIRA` (clipboard), `MD` (unduh), `PDF` (halaman laporan ter-redaksi + dialog print; memerlukan pilihan error).
  - Design tokens di `panel.css` (container dari Figma CSS export; warna lain dari render Figma); font Inter + JetBrains Mono dibundel lokal (`@fontsource`); ikon extension dari logo SVG Figma.
- `extension/src/lib/`: `errorFilter` (+ `isFailedStatus` bersama), `redact`, `buildPayload`, `apiClient` (+ `checkHealth`), `format` (+ `formatBadgeCount`), `stats`, `filter`, `report` (Markdown, Jira, HAR ter-redaksi), `stack` (parser stack trace & code frame), `consoleTrap` (idempotent page hooks, bounded capture buffer, redacted exception records), `webRequestClassify` (adapter `chrome.webRequest` → kategori F-001, dipakai F-005), `messages` (kontrak pesan popup ↔ background).
- **F-005 Popup toolbar + badge** (`openspec/changes/toolbar-popup-badge/`): `extension/src/background/serviceWorker.js` menghitung kegagalan per tab dari `chrome.webRequest` (status/header saja, tanpa body), reset saat navigasi dokumen baru, badge `chrome.action` (maks `99+`); `extension/src/popup/PopupSummary.vue` menampilkan total + breakdown kategori atau status kosong. Permission baru: `webRequest`, `host_permissions` (`http`/`https` saja), key `action`/`background` di manifest.
- URL & header sensitif juga di-mask di UI (aman untuk screenshot/demo).
- Redaksi teks bebas mencakup email, nomor HP Indonesia dengan format umum (`08…` / `+628…`), NIK, dan semua urutan 16 digit (termasuk yang dikelompokkan dengan spasi atau tanda hubung).
- Backend menerapkan ulang redaksi header, URL, JSON, teks bebas, dan batas body sebelum membuat ringkasan atau memanggil provider.
- Backend Fastify: `GET /health`, `POST /api/summarize` (422 validasi, 413 batas body, 502 provider gagal), provider `mock` / `azure` / `openai`; Swagger UI di `/api-docs`.
- `docs/architecture.md`: overview, tabel komponen → node Figma, user flow chart, sequence diagram panel → redact → backend → AI provider.
- Test: 176 unit extension (tambahan `webRequestClassify`, `tabCounters`, dan `formatBadgeCount` untuk F-005), 30 unit backend, dan 21 E2E Playwright lulus, termasuk Console Trap capture dan ekspor PDF (konten ter-redaksi, pop-up diblokir). F-005 belum punya E2E (lihat backlog — harness Playwright saat ini men-stub `chrome.devtools.*` di halaman biasa, bukan konteks ekstensi asli, sehingga tidak bisa menjalankan `chrome.webRequest`/`chrome.action`/`chrome.runtime` sungguhan).
- Git hook `pre-push` menjalankan `npm test`.

### Endpoint tersedia
| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/health` | Cek backend hidup + provider aktif |
| POST | `/api/summarize` | Ringkasan satu error |

### Belum ada (backlog)
- F-001: separator navigasi, filter chip per kategori.
- F-002: uji & tuning provider nyata (Microsoft Foundry), pilihan bahasa di UI.
- F-003: preview payload.
- F-004: ambil source untuk code frame dan resolve API/category contract karena exception `status: 0` masih dikategorikan `NETWORK_ERROR`. Capture hook, polling buffer, baris `JS ERR`, kartu *Exceptions*, `StackTraceViewer`, dan parser sudah ada.
- F-006: kartu *Diagnostic Bundle Packed*.
- F-005: verifikasi manual load-unpacked di Chrome asli (badge, popup, permission prompt) belum dilakukan; E2E Playwright untuk badge/popup belum ada (butuh harness baru yang memuat ekstensi asli via `--load-extension`, bukan stub `chrome.devtools.*` yang ada sekarang); warna badge per kategori masih pertanyaan terbuka di `design.md`.
- Eksplorasi: F-007 screenshot, F-008 options.
