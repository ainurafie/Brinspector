# F-003 — Redaksi Data Sensitif

Status: **Baseline sebagian** (`redact.js` dasar + test sudah ada; redaksi di backend & perluasan pola = backlog)

## Intent
Memastikan tidak ada kredensial atau data pribadi yang meninggalkan browser menuju AI. Ini wajib untuk konteks perbankan.

## Behavior
Sebelum payload dikirim, terapkan:

| Target | Aturan |
| --- | --- |
| Header | `authorization`, `cookie`, `set-cookie`, `x-api-key`, `proxy-authorization`, `x-auth-token`, `x-csrf-token` → `[REDACTED]` |
| Query string | Parameter `token`, `access_token`, `refresh_token`, `api_key`, `apikey`, `key`, `password`, `pwd`, `secret`, `session`, `sig`, `signature` → `[REDACTED]` |
| Body JSON | Field bernama sama seperti di atas (case-insensitive, nested) → `[REDACTED]` |
| Body teks bebas | JWT (`eyJ...`), `Bearer xxx`, email, nomor kartu 16 digit, nomor HP Indonesia (`08…`/`+628…`), NIK 16 digit → `[REDACTED]` |
| Panjang | Body dipotong ke 4.000 karakter + penanda `…[truncated]` |

Backend menjalankan fungsi redaksi yang sama sekali lagi (defense in depth).

## Constraints
- Redaksi harus deterministik & murni (pure function) agar mudah dites.
- Tidak boleh mengubah objek asli (immutable).
- Pengguna dapat melihat **preview payload** sebelum mengirim (backlog UI).

## Edge cases
- Body bukan JSON valid → perlakukan sebagai teks bebas.
- Nama field campuran huruf (`Access_Token`) → tetap diredaksi.
- URL relatif / tanpa query → dikembalikan apa adanya.
- Nomor 16 digit yang bukan kartu (mis. ID transaksi) → ikut diredaksi (lebih aman; didokumentasikan).

## Acceptance criteria
- Unit test membuktikan setiap baris tabel di atas.
- Snapshot payload hasil `buildPayload()` tidak mengandung string kredensial dari fixture.
- Test backend: payload berisi `authorization` asli → yang diteruskan ke provider sudah `[REDACTED]`.

## Data
Klasifikasi: **Rahasia** (token, cookie, PII). Tidak disimpan, tidak di-log.
