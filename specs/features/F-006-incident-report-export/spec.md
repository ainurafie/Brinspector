# F-006 — Incident Notes & Export Laporan

Status: **Backlog**

UI: Figma frame 1:776 — *Catatan Insiden / Incident Notes* (textarea + preset tag), *Diagnostic Bundle Packed*, tombol ekspor `.HAR` / `JIRA` / `MD` / `PDF`. Frame 1:1130 — tombol *Export HAR*.

## Intent
QA bisa menambahkan catatan singkat lalu mengekspor laporan insiden yang sudah ter-redaksi, siap ditempel ke Jira atau dilampirkan ke tiket.

## Behavior
| Input | Output / perubahan state |
| --- | --- |
| Ketik catatan (maks 500 karakter) | Counter `n / 500 chars`; Markdown diperbolehkan |
| Klik preset tag (`#Repro-100%`, `#Staging`, `#P1-Blocker`, dll.) | Tag ditambahkan/dihapus dari laporan |
| Export `.HAR` | Unduh HAR berisi hanya entri gagal, **sudah diredaksi** (header, query, body) |
| Export `MD` | Unduh/salin Markdown: catatan, tag, daftar error, ringkasan AI (bila ada) |
| Export `JIRA` | Salin teks dengan format wiki Jira (`h3.`, `{code}`) ke clipboard |
| Export `PDF` | Opsional: cetak laporan Markdown via `window.print()` pada halaman laporan |

## Constraints
- Semua ekspor melewati `redactRecord()`; tidak ada jalur ekspor data mentah.
- Pembuatan laporan = fungsi murni di `src/lib/report.js` (mudah dites).
- Tanpa library PDF tambahan di MVP.

## Edge cases
- Tidak ada error → tombol ekspor disabled.
- Body sangat besar → dipotong sesuai aturan F-003.
- Catatan berisi data sensitif yang diketik pengguna → ikut melewati `redactText()`.

## Acceptance criteria
- HAR hasil ekspor valid (bisa diimpor kembali ke tab Network Chrome) dan tidak mengandung string rahasia dari fixture.
- Markdown & Jira memuat catatan, tag, method, URL, status, dan ringkasan AI.
- Unit test untuk `buildMarkdownReport()`, `buildJiraReport()`, `buildRedactedHar()`.

## Data
Klasifikasi **Internal** (sudah ter-redaksi). Tidak disimpan permanen oleh extension.
