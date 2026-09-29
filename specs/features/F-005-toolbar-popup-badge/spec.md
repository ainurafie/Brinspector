# F-005 — Popup Toolbar & Badge Counter

Status: **Baseline** — badge per-tab, popup ringkasan, dan reset saat navigasi sudah diimplementasikan (lihat `openspec/changes/toolbar-popup-badge/`). Backlog: verifikasi manual di Chrome asli, E2E Playwright (lihat catatan di bawah), warna badge per kategori (detail visual Figma).

UI: Figma frame 1:451 (*Default Chrome UI with Cyber Extension*), 1:2 (*Chrome Extension Installed View*).

## Intent
Memberi sinyal cepat di toolbar (badge + popup) tentang jumlah request gagal pada tab aktif, tanpa perlu membuka DevTools terlebih dahulu.

## Behavior
| Input | Output / perubahan state |
| --- | --- |
| Request gagal (status ≥ 400 atau network error) di tab aktif | Badge toolbar bertambah 1; kategori dicatat (server/client/network) |
| Request sukses (2xx/3xx) | Badge tidak berubah |
| Tab navigasi ke dokumen baru (bukan hash/`pushState`) | Counter tab direset ke 0, badge kosong |
| Pindah tab | Badge langsung menampilkan angka tab yang sekarang aktif |
| Tab ditutup | Counter tab dihapus dari memori |
| Klik ikon toolbar | Popup menampilkan total + breakdown kategori, atau pesan kosong jika tidak ada kegagalan, plus ajakan membuka DevTools → BRINSPECTOR untuk detail lengkap |

Definisi "gagal" sama seperti F-001: `status >= 400`, atau `status === 0` / browser network error.

## Constraints
- Hanya memakai `chrome.webRequest` (status + header saja) dan `chrome.action`; **tidak pernah membaca request/response body**.
- Tidak ada data yang dikirim ke backend atau AI provider dari fitur ini.
- Badge menampilkan maksimal `99+`.
- Permission tambahan diminta seminimal mungkin: `webRequest`, `host_permissions` (`http://*/*`, `https://*/*`), dan key `action`/`background` di manifest — **tidak ada** `webRequestBlocking` atau `chrome.debugger`.
- Logika klasifikasi kategori dipakai bersama dengan panel DevTools (`extension/src/lib/errorFilter.js` + `extension/src/lib/webRequestClassify.js`) agar tidak ada dua definisi "gagal" yang berbeda.

## Edge cases
- Service worker MV3 bisa dimatikan Chrome kapan saja → counter tab tersebut reset ke 0 saat worker restart (perilaku yang diterima, didokumentasikan sebagai batasan di `design.md`).
- Navigasi hash-only / `history.pushState` tidak memicu reset (bukan navigasi dokumen baru).
- Tab tanpa kegagalan → popup menampilkan status kosong, bukan breakdown dengan angka nol.
- `tabId < 0` (request bukan dari tab, mis. dari service worker lain) diabaikan.

## Acceptance criteria
- Request 404/500/network error pada tab aktif menaikkan badge; 200/304 tidak.
- Navigasi dokumen baru mereset badge ke kosong; navigasi hash-only tidak.
- Popup menampilkan total + breakdown kategori yang konsisten dengan kategori F-001.
- Manifest hanya menambah `webRequest`, `host_permissions`, `action`, `background` — tidak ada `chrome.debugger` atau permission pembaca body.
- Unit test: `webRequestClassify.test.js`, `tabCounters.test.js`, `format.test.js` (`formatBadgeCount`).

## Data
Status code + header request/response (tanpa body), diproses sepenuhnya di dalam browser. Tidak ada data yang disimpan permanen atau dikirim keluar.
