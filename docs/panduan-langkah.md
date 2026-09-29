# Panduan Langkah — Tugas Akhir BRINSPECTOR

Panduan ini mengikuti alur workshop *GitHub Copilot: Build a Procurement System MVP*:
**baseline yang sudah jalan → context engineering → spec → implementasi per checkpoint → test → dokumentasi → OpenSpec → review di GitHub**.

Starter v0.2.0 sudah berisi panel DevTools sesuai desain Figma (frame 1:1130), AI Root Cause (mode mock), redaksi dasar, dan 89 test — setara "modul PR" di workshop. Fitur berikutnya (F-003 lengkap, F-004, F-006, provider AI nyata) adalah **backlog tim** yang dikerjakan bersama Copilot.

### Link penting

| Apa | Di mana |
| --- | --- |
| Desain Figma (file) | https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=0-1 |
| Link per node Figma → komponen | `docs/plan.md` §11 |
| Spec utama & kontrak API | `docs/plan.md` |
| Spec per fitur | `specs/features/` |
| Status terkini | `docs/progress.md` |
| Konfigurasi MCP (chrome-devtools, figma) | `.vscode/mcp.json` |

Node Figma yang paling sering dipakai:

| Node | Isi | Fitur |
| --- | --- | --- |
| [1:1130](https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-1130) | Error Inspector (panel DevTools, sudah diimplementasikan) | F-001, F-002 |
| [1:1392](https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-1392) | Console Stack Trace Viewer | F-004 |
| [1:776](https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-776) | Incident Diagnostics (notes, export, screenshot) | F-006, F-007 |
| [1:451](https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-451) | Popup toolbar + badge | F-005 |

---

## Pembagian peran (saran untuk 4 orang)

| Peran | Fokus | Fitur | Node Figma |
| --- | --- | --- | --- |
| A — Panel/UI | Console Trap, stack frame, kartu Exceptions | F-004 (+ sisa F-001) | 1:1392 |
| B — Privacy | Redaksi PII, redaksi ulang di backend, preview payload | F-003 | — |
| C — AI/Backend | Provider Microsoft Foundry, tuning prompt, Swagger | F-002 (provider nyata) | 1:1298 |
| D — QA/Docs | Incident notes & export, E2E, dokumentasi, demo | F-006 + eksplorasi F-005 | 1:776, 1:451 |

Aturan Git: satu branch per fitur (`feature/f-004-console-trap`), merge lewat Pull Request, minimal 1 review teman + Copilot review.

---

## Fase 0 — Persiapan tools (semua anggota)

- VS Code terbaru + GitHub Copilot (akun berlisensi)
- Node.js 20+, Git, Google Chrome
- Python + `uv` (untuk Graphify)
- **Akun Figma** yang sudah diberi akses ke file desain (minimal *can view*; wajib untuk Peran A dan D). Pemilik file mengundang lewat tombol **Share** di Figma.
- Opsional: RTK, OpenSpec (`npm install -g @fission-ai/openspec@latest`)
- Akses **Microsoft Foundry**: deploy satu model kecil (kelas "mini"), catat *endpoint*, *API key*, dan *deployment name*

---

## Fase 1 — Setup repo & jalankan baseline

1. Satu orang membuat repo GitHub baru, lalu push starter ini:
   ```bash
   git init && git add . && git commit -m "chore: BRINSPECTOR starter v0.2.0"
   git branch -M main
   git remote add origin https://github.com/<org>/<repo>.git
   git push -u origin main
   ```
2. Anggota lain clone, lalu dari **root**:
   ```bash
   npm install          # sekali saja (npm workspaces) — juga mengaktifkan git hook pre-push
   ```
3. Salin file env:
   - `backend/.env.example` → `backend/.env` (biarkan `AI_PROVIDER=mock` dulu)
   - `extension/.env.example` → `extension/.env`
4. Jalankan:
   ```bash
   npm run dev:backend   # terminal 1 → http://localhost:3000/health
   npm run dev:ext       # terminal 2 → build ulang otomatis ke extension/dist
   ```
5. Buka `chrome://extensions` → aktifkan **Developer mode** → **Load unpacked** → pilih folder `extension/dist`.
6. Buka website apa pun → DevTools (F12) → tab **BRINSPECTOR**. Di Console ketik:
   ```js
   fetch('https://httpbin.org/status/500'); fetch('https://httpbin.org/status/404');
   ```
   Dua baris muncul di *Active Failure Stream*. Klik baris 500 → **Generate Diagnostic Report** (atau Ctrl/Cmd+E) → kartu *AI Root Cause Inference* terisi.
7. Cek test: `npm test` (unit) dan `npm run test:e2e` (sekali jalankan `npx playwright install chromium`).
8. Bandingkan panel dengan desain: buka [node 1:1130](https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-1130) di sebelah `docs/images/panel.png`. Catat perbedaan yang ingin dipoles sebagai issue.

✅ Checkpoint: semua anggota melihat panel seperti `docs/images/panel.png` & test hijau.

> Setelah mengubah kode extension, klik ikon reload di `chrome://extensions`, lalu tutup-buka DevTools.

---

## Fase 2 — Context engineering (AGENTS.md, RTK, Graphify, MCP)

1. Copilot **Ask** mode, lampirkan `AGENTS.md`:
   ```prompt
   Review this repository instruction file and improve it with a concise checklist for implementation quality, testing, and documentation discipline.
   ```
2. **Tulis ulang sendiri** bagian yang relevan (pesan workshop: instruksi persisten sebaiknya ditulis manusia). Pastikan ada: konteks produk, tech stack, aturan privasi, aturan design tokens, referensi Figma (§11 di `docs/plan.md`), stopping criteria.
3. RTK (opsional): pasang, lalu tambahkan blok aturan "selalu awali perintah shell dengan `rtk`" ke `AGENTS.md`.
4. Graphify: `.graphifyignore` sudah disiapkan.
   ```bash
   uv tool install graphifyy
   graphify . --no-llm
   ```
   Tambahkan blok *Codebase Context & Knowledge Graph Protocol* dari workshop ke `AGENTS.md`, ganti filter path menjadi `backend/src/` dan `extension/src/`.
5. MCP: `.vscode/mcp.json` berisi dua server — `chrome-devtools` (browsing headless) dan `figma` (baca desain). Sesuai tips hemat token workshop, **nyalakan hanya saat dibutuhkan** lalu **Stop** lagi.
6. Hemat token lainnya: pisahkan sesi riset–rencana–implementasi, dan pilih model sesuai tugas (reasoning untuk rencana, mid-tier untuk koding, mini untuk docs).

---

## Fase 2b — Hubungkan Figma MCP (Peran A & D)

1. Buka `.vscode/mcp.json` di VS Code → klik **Start** di atas entri `figma`.
2. Browser terbuka → login Figma dengan akun yang punya akses ke file desain → izinkan VS Code.
3. Uji koneksi dengan satu panggilan kecil (Copilot **Agent** mode):
   ```prompt
   Using Figma MCP, get the metadata of https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-1121 and tell me the node name.
   ```
   Jawaban yang benar: *BRINSPECTOR Extension Logo*.
4. **Stop** server `figma` lagi sampai benar-benar dipakai di Fase 4.

**Aturan pakai Figma MCP (plan Starter, kuota kecil):**
- Satu prompt = **satu node spesifik** (ambil link dari §11 `docs/plan.md`), jangan seluruh page `0-1` — respons page penuh sangat besar dan langsung menghabiskan kuota.
- Minta Copilot menyesuaikan hasil ke komponen yang sudah ada (`extension/src/panel/components/`) dan token `panel.css`, bukan menyalin kode Figma mentah.
- Kalau kuota habis (pesan *"reached the Figma MCP tool call limit"*), pakai jalur manual:
  - Pilih layer di Figma → klik kanan → **Copy/Paste as → Copy as code → CSS (all layers)** (atau **Copy as CSS**) → tempel ke chat Copilot bersama screenshot node tersebut.
  - Untuk ikon/logo: panel kanan **Export → SVG**.
  - Starter v0.2.0 dibuat dengan cara ini: container dari CSS export, warna lain dari render desain.
- Supaya hasil MCP akurat, rapikan file Figma: nama layer deskriptif (bukan "Container"/"Frame 12"), badge/kartu/baris dijadikan component, warna sebagai Variables, dan Auto Layout.

---

## Fase 3 — Spec-Driven Development: validasi rencana

1. Baca bersama `docs/plan.md` (arsitektur hybrid §4, referensi Figma §11) dan spec di `specs/features/`. Diskusikan & edit bila perlu — **spec adalah kontrak tim**.
2. Copilot **Plan** mode, lampirkan `docs/plan.md`, `docs/progress.md`, dan spec F-003, F-004, F-006:
   ```prompt
   Validate this plan for an MVP.
   Return a strict task sequence with checkpoints.
   Focus on the remaining backlog: F-003 (redaction first), then F-004 and F-006, then the real AI provider for F-002.
   For UI work, reference the Figma node links in docs/plan.md §11.
   Point out gaps or contradictions in the specs.
   ```
3. Setelah puas, pindah ke **Agent** mode:
   ```prompt
   Save the refined checklist to docs/runbook.md, grouped by feature, with an owner column and the Figma node for each UI task.
   ```

---

## Fase 4 — Implementasi per checkpoint

Gunakan prompt file `/implement-checkpoint` di Copilot Chat, isi *feature* dan *checkpoint*. Satu checkpoint = satu sesi chat baru. Komponen UI ada di `extension/src/panel/components/`; gunakan ulang dan pakai token di `panel.css` (aturan di `AGENTS.md`).

Pola untuk pekerjaan UI: **logika dulu (murni + unit test), baru tampilan dari Figma.**

### F-003 (Peran B) — kerjakan paling awal
```prompt
/implement-checkpoint  feature: F-003  checkpoint: redact emails, Indonesian phone numbers, NIK and 16-digit card numbers in free text
```
```prompt
/implement-checkpoint  feature: F-003  checkpoint: re-apply redaction in the backend before calling the AI provider (defense in depth)
```

### F-004 (Peran A) — Figma node 1:1392
1. Logika:
   ```prompt
   /implement-checkpoint  feature: F-004  checkpoint: enable the Console Trap toggle — install an idempotent error hook via chrome.devtools.inspectedWindow.eval, poll the buffer every second, and parse stack traces in src/lib (with unit tests)
   ```
2. Tampilan (nyalakan server `figma` dulu):
   ```prompt
   Using Figma MCP, implement the stack trace viewer from https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-1392
   as extension/src/panel/components/StackTraceViewer.vue and show it in BreakdownPanel when a JS ERR row is selected.
   Reuse panel.css tokens and existing components (BiIcon, StatCard). Do not add API calls.
   ```
3. Lanjutkan: baris `JS ERR` di stream → kartu statistik *Exceptions* (sesuai node [1:1159](https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-1159)) menggantikan *Client Error* atau jadi kartu ke-4.

### F-006 (Peran D) — Figma node 1:776
1. Logika:
   ```prompt
   /implement-checkpoint  feature: F-006  checkpoint: pure report builders in src/lib/report.js (markdown, jira, redacted HAR) with unit tests
   ```
2. Tampilan:
   ```prompt
   Using Figma MCP, implement the Incident Notes card (textarea, preset tags, character counter) and the export bar (.HAR, JIRA, MD)
   from https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-776 as Vue components in extension/src/panel/components.
   Wire the export buttons to the report builders in src/lib/report.js. Reuse panel.css tokens.
   ```
   Node 1:776 berukuran besar; kalau respons MCP terlalu besar, buka file di Figma, klik kartu *Catatan Insiden* dan bar ekspor, salin link node masing-masing (klik kanan → **Copy link to selection**), lalu minta satu per satu.

### F-002 provider nyata (Peran C)
1. Isi `backend/.env` dengan data Foundry: `AI_PROVIDER=azure`, `AI_BASE_URL=https://<resource>.openai.azure.com/openai/v1`, `AI_API_KEY`, `AI_MODEL`. Restart backend.
2. Uji beberapa error nyata; tuning `backend/src/services/prompt.js` bila ringkasan kurang tajam. Tampilan kartu AI mengikuti node [1:1298](https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-1298) (badge severity menggantikan "98% confidence").
3. Swagger:
   ```prompt
   Add Swagger/OpenAPI support to this Fastify JavaScript backend.
   Use @fastify/swagger and @fastify/swagger-ui. Expose API documentation at /api-docs.
   Reuse the existing route JSON schemas.
   ```

Setelah tiap checkpoint:
```prompt
Analyze this repository and summarize what is already implemented.
Document the latest state of the project in docs/progress.md.
```

---

## Fase 5 — Kualitas

1. Unit test tambahan:
   ```prompt
   Create unit tests for the new logic in extension/src/lib and backend/src/services.
   Cover every acceptance criterion in specs/features/F-00X/spec.md. Keep tests readable.
   ```
   Ingat pesan workshop: AI "ingin menyenangkan" — pastikan test benar-benar menguji perilaku, bukan menyalin implementasi.
2. Git hook `pre-push` sudah aktif (`.githooks/pre-push`). Uji: buat test gagal → commit → push → push harus ditolak.
3. Review dengan custom agent: pilih agent **spec-reviewer** di Copilot Chat, lampirkan file yang berubah.
4. Review visual: bandingkan screenshot panel dengan node Figma terkait; cek tidak ada warna hex mentah di komponen (semua lewat token `panel.css`).

---

## Fase 6 — E2E Playwright (Peran D)

Sudah ada 10 skenario di `tests/e2e/` (capture, filter, Auto-Intercept, breakdown, AI happy path, shortcut, privasi payload, 422 + retry, backend offline). `chromeStub.js` memalsukan `chrome.devtools` sehingga panel bisa dites tanpa membuka DevTools sungguhan.

Tambahkan untuk fitur baru:
```prompt
Extend tests/e2e/chromeStub.js so inspectedWindow.eval can return a fake error buffer.
Create tests/e2e/console-trap.spec.js: toggle Console Trap → a JS ERR row appears → breakdown shows the stack frames.
Create tests/e2e/export.spec.js: exported Markdown and HAR never contain the fixture secret.
Use data-testid selectors and clear assertions.
```

---

## Fase 7 — Dokumentasi

```prompt
Create docs/architecture.md describing how BRINSPECTOR works.
Add a user flow chart and a sequence diagram (panel → redact → backend → AI provider) in Mermaid.
Link each UI component to its Figma node from docs/plan.md §11.
```
Perbarui `README.md` (pakai custom agent **readme-creator** di `.github/agents/`), screenshot `docs/images/panel.png`, dan `docs/progress.md`.

---

## Fase 8 — Eksplorasi dengan OpenSpec

```bash
openspec init        # pilih GitHub Copilot, lalu restart VS Code
```
```prompt
/opsx:propose toolbar-popup-badge
```
Referensi desain: [node 1:451](https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-451) dan [node 1:2](https://www.figma.com/design/n4DsSHcxUMYVAl2JW5mbPH/Untitled?node-id=1-2). Ingat batasan di `docs/plan.md §4`: popup hanya counter via `chrome.webRequest`, tanpa body. Review dokumen di `openspec/`, lalu `/opsx:apply`, verifikasi, dan `/opsx:archive`.

Kandidat lain: `viewport-screenshot` (F-007, node 1:776 bagian *Automated Screenshot Capture* — wajib opt-in + blur), `options-page` (F-008).

---

## Fase 9 — Copilot di GitHub

- Tambahkan **Copilot sebagai reviewer** di setiap Pull Request, di samping reviewer manusia.
- Untuk PR yang mengubah UI, sertakan screenshot sebelum/sesudah dan link node Figma di deskripsi PR.
- Tugas kecil (mis. merapikan docs) bisa diberikan ke Copilot agent di github.com — tetap periksa commit & PR-nya sebelum merge.

---

## Fase 10 — Persiapan demo

Checklist (dari `docs/plan.md §9`):
- [ ] Panel BRINSPECTOR muncul setelah load unpacked, tampilan sesuai Figma node 1:1130
- [ ] Error 4xx/5xx/network tertangkap, sukses tidak
- [ ] Generate Diagnostic Report menghasilkan AI Root Cause (provider nyata; mode mock sebagai cadangan)
- [ ] Bukti redaksi: tunjukkan payload tanpa token
- [ ] 422 untuk payload tidak valid (Swagger)
- [ ] `npm test` + `npm run test:e2e` hijau, coverage ≥ 80%
- [ ] `docs/architecture.md` + `/api-docs`

Skenario demo 5 menit: tunjukkan desain Figma berdampingan dengan panel → picu error (500, 401, DNS gagal, JS exception) → tunjukkan stream & breakdown → Generate Diagnostic Report → tunjukkan payload ter-redaksi → ekspor laporan → tunjukkan test & report Playwright → ceritakan alur SDD (plan → runbook → checkpoint → OpenSpec) dan alur desain (Figma → MCP / CSS export → komponen).

---

### Prinsip yang dibawa dari workshop
1. Jelaskan **apa** dan **kenapa**; biarkan agent mengerjakan **bagaimana**.
2. Lampirkan konteks relevan (spec, file kode, screenshot, link node Figma) di setiap prompt.
3. Minta rencana dulu, implementasi dalam checkpoint kecil.
4. Kode boleh di-outsource, **pemahaman tidak** — selalu validasi hasil agent.
