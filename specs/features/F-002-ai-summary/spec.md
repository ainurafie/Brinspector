# F-002 — AI Root Cause Inference

Status: **Baseline sebagian** — sudah: kartu *AI Root Cause Inference* + tombol *Generate Diagnostic Report* terhubung ke backend (mode mock), loading/error state, cache per entri, Copy as Markdown. Backlog: uji & tuning provider nyata (Microsoft Foundry), pilihan bahasa di UI, shortcut keyboard teruji E2E.

UI: Figma frame 1:1130 — kartu kiri bawah. Label "98% confidence" pada desain **diganti badge severity** (angka confidence LLM tidak terkalibrasi).

## Intent
Dengan satu klik, pengguna mendapat penjelasan singkat dalam Bahasa Indonesia: apa yang terjadi, kemungkinan penyebab, dan langkah perbaikan.

## Behavior
| Input | Output / perubahan state |
| --- | --- |
| Pilih error lalu klik "Generate Diagnostic Report" (atau Ctrl/Cmd+E) | Ambil body (jika belum), redaksi (F-003), kirim `POST /api/summarize` |
| Menunggu respons | Tombol disabled + indikator loading |
| Respons 200 | Tampilkan kartu: summary, category badge, severity, likelyCauses, suggestedFixes |
| Respons 4xx/5xx/timeout | Tampilkan pesan error yang ramah + tombol "Coba lagi" |
| Klik "Copy" | Salin ringkasan dalam format Markdown ke clipboard |

Backend:
- `AI_PROVIDER=mock` → ringkasan berbasis aturan (tanpa jaringan), untuk dev & test.
- `AI_PROVIDER=azure` → Azure OpenAI (Microsoft Foundry) endpoint v1, header `api-key`.
- `AI_PROVIDER=openai` → endpoint OpenAI-compatible, header `Authorization: Bearer`.
- Prompt sistem meminta keluaran **JSON** sesuai skema di `docs/plan.md §7`; backend memvalidasi dan menormalkan hasilnya.

## Constraints
- API key hanya ada di `backend/.env`; tidak pernah di kode extension atau repo.
- Timeout panggilan AI 20 detik → `502`.
- Maks 1 request summarize berjalan bersamaan per entri (cegah klik ganda).
- Hasil ringkasan di-cache di memori panel per entri (klik ulang tidak memanggil AI lagi).
- Pilih model hemat untuk tugas ini (kelas "mini"/"Haiku"); model reasoning tidak diperlukan.

## Edge cases
- AI mengembalikan teks non-JSON → backend fallback: bungkus teks ke `summary`, `category: UNKNOWN`.
- AI mengembalikan kategori di luar enum → normalkan ke `UNKNOWN`.
- Backend tidak jalan → panel menampilkan "Backend tidak dapat dihubungi di <url>".
- Error tanpa body (mis. network error) → ringkasan berdasarkan `errorText` saja.

## Acceptance criteria
- Mode mock: 500 → `SERVER_ERROR`, 401/403 → `AUTH_ERROR`, 404 → `NOT_FOUND`, status 0 + `ERR_NAME_NOT_RESOLVED` → `NETWORK_ERROR`.
- Payload tidak valid → `422` dengan pesan field yang salah.
- Respons AI non-JSON tidak membuat backend crash (unit test).
- Ringkasan tampil < 10 detik pada provider nyata (diukur manual saat demo).

## Data
Payload ter-redaksi (F-003) dikirim ke backend, lalu ke AI provider. Tidak ada penyimpanan permanen di backend (tanpa log body).
