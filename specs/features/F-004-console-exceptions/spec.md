# F-004 — Console & JS Exceptions ("Console Trap")

Status: **Backlog**

UI: Figma frame 1:1130 — toggle *Console Trap*, kartu statistik *Exceptions*, baris `JS ERR` di *Active Failure Stream*, blok *Exception* + *Stack Frame Execution Order* di *Active Breakdown*. Frame 1:776 — kartu *Console & Script Errors*.

## Intent
Menangkap JavaScript exception dan `console.error` di halaman yang di-inspect, supaya kegagalan yang tidak terlihat di tab Network (mis. `TypeError` setelah respons 500) ikut dianalisis.

## Behavior
| Input | Output / perubahan state |
| --- | --- |
| Toggle *Console Trap* ON | Pasang hook di halaman via `chrome.devtools.inspectedWindow.eval()` (tanpa izin tambahan): `window.onerror`, `unhandledrejection`, `console.error` → simpan ke buffer `window.__brinspector` |
| Tombol "Reload & capture" | `chrome.devtools.inspectedWindow.reload({ injectedScript })` agar hook terpasang sebelum script halaman berjalan |
| Setiap 1 detik saat ON | Ambil & kosongkan buffer lewat `eval`, tambahkan ke stream sebagai `JS ERR` |
| Klik baris `JS ERR` | Breakdown menampilkan pesan, file:line:col, dan stack frame |
| Generate Diagnostic Report pada exception | Kirim ke `/api/summarize` dengan `status: 0`, `resourceType: "script"`, `errorText` = pesan + stack (ter-redaksi) |

## Constraints
- Hook harus idempotent (tidak terpasang dua kali) dan tidak mengubah perilaku halaman (tetap panggil handler asli).
- Buffer maksimal 200 item di halaman.
- Stack & pesan melewati `redactText()` sebelum dikirim.
- Tanpa perubahan manifest.

## Edge cases
- Halaman dengan CSP ketat → `eval` dari DevTools tetap berjalan (konteks DevTools), tetapi tampilkan pesan bila gagal.
- Navigasi → buffer hilang; pasang ulang hook setelah `onNavigated` bila toggle ON.
- Error lintas origin (`Script error.` tanpa detail) → tampilkan apa adanya dengan catatan "detail diblokir browser".

## Acceptance criteria
- `throw new TypeError('x')` di halaman muncul di stream < 2 detik saat toggle ON.
- Kartu *Exceptions* menghitung jumlah exception.
- Unit test untuk parser stack (`parseStack()`), normalisasi record exception, dan redaksi pesan.
- E2E: stub `inspectedWindow.eval` mengembalikan buffer → baris `JS ERR` tampil.

## Data
Pesan error & stack trace (bisa memuat data pengguna) → klasifikasi **Internal**, selalu diredaksi sebelum keluar browser.
