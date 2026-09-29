# F-001 — Tangkap & Tampilkan Error Network

Status: **Baseline sebagian** — sudah: Active Failure Stream, Active Breakdown (response header + body), tab *Payload & State* (request header + body), filter regex, toggle Auto-Intercept, kartu statistik, URL/header sensitif di-mask di UI. Backlog: separator navigasi, filter chip per kategori.

UI: Figma frame 1:1130 — kolom kiri (HUD: kartu statistik + *Active Failure Stream*) dan kolom kanan (*Active Breakdown*).

## Intent
Menampilkan semua request gagal pada halaman yang sedang di-inspect, dalam satu daftar yang mudah dipindai.

## Behavior
| Input | Output / perubahan state |
| --- | --- |
| Panel dibuka | Ambil entri lama via `chrome.devtools.network.getHAR()`, filter, tampilkan |
| Event `onRequestFinished` | Jika gagal → tambahkan ke atas daftar |
| Event `onNavigated` | Tambahkan separator "Navigasi ke <url>" (opsi: kosongkan daftar) |
| Klik baris | Buka panel detail: method, URL, status, durasi, headers, body (lazy load via `entry.getContent`) |
| Tombol "Clear" | Kosongkan daftar |
| Filter chip (4xx / 5xx / Network) | Sembunyikan kategori yang tidak dipilih |

Definisi "gagal":
- `response.status >= 400`, atau
- `response.status === 0` / ada `response._error` (mis. `net::ERR_NAME_NOT_RESOLVED`, CORS, aborted).

## Constraints
- Maks 500 entri disimpan di memori; entri tertua dibuang (FIFO).
- Body dimuat hanya saat detail dibuka (hemat memori).
- Tidak menambah permission manifest selain `devtools_page`.

## Edge cases
- Request gambar/font yang 404 → tetap tampil, tetapi bisa difilter berdasarkan `resourceType`.
- Response body biner / sangat besar → tampilkan "(binary / terlalu besar)".
- Redirect 3xx → bukan error.
- Request yang dibatalkan pengguna (`net::ERR_ABORTED`) → kategori `NETWORK_ERROR`, severity rendah.
- Panel dibuka setelah halaman selesai load → entri lama tetap muncul dari HAR.

## Acceptance criteria
- Request dengan status 404, 500, dan 0 muncul di daftar; 200 dan 304 tidak.
- Urutan daftar: terbaru di atas.
- Jumlah error per kategori tampil di header panel.
- Unit test `errorFilter.test.js` mencakup semua status di atas.

## Data
HAR entry (read-only, dari Chrome). Tidak ada data yang disimpan permanen atau dikirim keluar pada fitur ini.
