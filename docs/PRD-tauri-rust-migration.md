# PRD — Migrasi Markdown Open ke Tauri + Rust

Tanggal: 1 November 2026
Status: Disetujui untuk implementasi pada 1 November 2026; hasil validasi dicatat terpisah
Baseline: versi Electron pada commit 67429f0
Target awal: macOS Apple Silicon (arm64)

## Problem Statement

Markdown Open sudah dapat membuka dan menampilkan file Markdown, menjelajah folder,
menavigasi tautan dokumen lokal, menampilkan Mermaid, dan mengekspor PDF. Distribusi
Electron terakhir berukuran sekitar 159 MB untuk DMG maupun ZIP. Pengguna ingin
aplikasi dengan fungsi yang sama dan paket lebih kecil, menggunakan Rust untuk
bagian desktop.

Migrasi harus mempertahankan pengalaman membaca dokumen dan kemampuan offline.
Pengurangan ukuran tidak boleh menghilangkan Mermaid atau fitur desktop yang sudah
tersedia. Pengguna meminta PRD terlebih dahulu sebelum implementasi.

## Solution

Ganti shell Electron dengan Tauri dan implementasikan layanan desktop menggunakan
Rust. Pertahankan React, TypeScript, CSS, Vite, markdown-it, highlight.js, dan Mermaid
untuk UI serta preview. Gunakan WKWebView bawaan macOS untuk menampilkan frontend.

Ini adalah penulisan ulang lapisan desktop menggunakan Rust, bukan penulisan ulang
seluruh UI ke framework GUI Rust. React dan Mermaid tetap JavaScript; layanan Rust
dikompilasi menjadi binary native. Tidak ada server development, runtime Node.js,
atau Chromium yang dibundel untuk menjalankan distribusi akhirnya.

### Kriteria keberhasilan

- Semua alur utama pada user stories dan matriks penerimaan berfungsi di aplikasi
  macOS hasil build, tanpa internet dan tanpa instalasi Node.js/Rust di mesin pengguna.
- DMG arm64 minimal 50% lebih kecil dibanding DMG Electron baseline, berdasarkan
  ukuran byte aktual. Ini target penerimaan yang diusulkan, bukan hasil yang sudah
  diukur atau jaminan dari Tauri. Jika tidak tercapai, ukur penyebab dan review ulang
  target sebelum menyatakan migrasi selesai.
- Catat ukuran DMG, ZIP, dan direktori `.app` terpasang secara terpisah. Bandingkan
  artefak dengan arsitektur, aset, dan fitur setara. Baseline 159 MB hanya perkiraan;
  ambil ukuran byte artefak Electron sebelum build migrasi menggantikannya.
- Preview tetap responsif saat membaca dan memindai folder; tidak ada file lama atau
  hasil render Mermaid lama yang menimpa pilihan dokumen terbaru.
- Web app yang sudah tersedia tetap dapat dibangun dan membuka file melalui browser.

## User Stories

1. Sebagai pembaca, saya ingin memasang aplikasi dari DMG, agar dapat memakai Markdown Open seperti aplikasi macOS biasa.
2. Sebagai pembaca, saya ingin paket distribusi lebih kecil, agar unduhan dan penyimpanan aplikasi berkurang.
3. Sebagai pembaca, saya ingin aplikasi berjalan tanpa Node.js atau Rust terpasang, agar tidak memerlukan setup development.
4. Sebagai pembaca, saya ingin membuka file `.md` dan `.markdown` lewat Open File, agar dapat membaca dokumen lokal.
5. Sebagai pembaca, saya ingin menyeret file ke aplikasi, agar dapat membuka dokumen dengan cepat.
6. Sebagai pembaca, saya ingin membatalkan dialog pemilihan tanpa mengubah dokumen aktif, agar tidak kehilangan konteks.
7. Sebagai pembaca, saya ingin membuka dokumen lewat Finder Open With, agar dapat memilih Markdown Open dari sistem.
8. Sebagai pembaca, saya ingin file yang membuka aplikasi dari kondisi tertutup langsung ditampilkan, agar tidak perlu memilih ulang.
9. Sebagai pembaca, saya ingin file dari Finder muncul ketika aplikasi sudah berjalan, agar dapat berpindah dokumen dengan mudah.
10. Sebagai pembaca, saya ingin membuka file ketika window aplikasi sudah ditutup, agar dokumen tampil di window yang tersedia atau dibuat kembali.
11. Sebagai pembaca, saya ingin membuka folder workspace, agar dapat menjelajahi seluruh dokumen Markdown di dalamnya.
12. Sebagai pembaca, saya ingin sidebar menampilkan folder dan file Markdown yang relevan, agar daftar mudah dijelajahi.
13. Sebagai pembaca, saya ingin folder `.git` dan `node_modules` dilewati, agar pemindaian tidak penuh dengan file yang tidak relevan.
14. Sebagai pembaca, saya ingin file dengan spasi dan karakter Unicode tetap terbuka, agar nama dokumen tidak membatasi penggunaan.
15. Sebagai pembaca, saya ingin tautan relatif antarfile Markdown bekerja, agar dapat membaca dokumentasi yang saling terhubung.
16. Sebagai pembaca, saya ingin tautan web dibuka di browser default, agar aplikasi tetap menampilkan dokumen lokal.
17. Sebagai pembaca, saya ingin heading, daftar, tabel, kutipan, kode, dan syntax highlighting tetap terbaca, agar format dokumen tetap berguna.
18. Sebagai pembaca, saya ingin tema mengikuti preferensi terang/gelap macOS, agar dokumen nyaman dibaca.
19. Sebagai pembaca, saya ingin flowchart dan sequence diagram Mermaid tampil otomatis, agar penjelasan visual tetap tersedia.
20. Sebagai pembaca, saya ingin Mermaid dan preview bekerja offline, agar dokumen lokal tidak bergantung pada layanan eksternal.
21. Sebagai pembaca, saya ingin sintaks Mermaid yang salah menampilkan pesan dan kode asli, agar isi dokumen lain tetap terbaca.
22. Sebagai pembaca, saya ingin berpindah file dengan cepat tanpa diagram dari file sebelumnya muncul, agar preview sesuai pilihan terbaru.
23. Sebagai pembaca, saya ingin mengekspor dokumen beserta diagram ke PDF, agar dapat menyimpan atau membagikannya.
24. Sebagai pembaca, saya ingin export menunggu render diagram, agar diagram tidak hilang dari PDF.
25. Sebagai pembaca, saya ingin file kosong tetap tampil sebagai dokumen terbuka, agar tidak disalahartikan sebagai belum memilih file.
26. Sebagai pembaca, saya ingin kegagalan akses file atau folder dijelaskan tanpa membuat aplikasi berhenti, agar dapat memilih dokumen lain.
27. Sebagai pengguna web, saya ingin tetap membuka file lokal melalui browser, agar mode web tidak rusak akibat migrasi desktop.
28. Sebagai pengembang, saya ingin perintah development dan build terdokumentasi, agar proyek dapat dijalankan ulang secara konsisten.

## Implementation Decisions

Keputusan di bawah merupakan rancangan untuk review, belum implementasi selesai.

### 1. Runtime desktop dan lifecycle

- Gunakan lini stabil Tauri yang sesuai saat implementasi; baseline rancangan Tauri 2.
  Pin dependency melalui lockfile Rust dan npm. Jangan mengambil versi alpha hanya
  untuk migrasi ini.
- Rust mengelola window, dialog native, event pembukaan file, dan integrasi sistem.
- Gunakan nama produk, ikon, dan identitas aplikasi yang konsisten dengan versi saat
  ini agar migrasi tidak membingungkan asosiasi file. Jangan menimpa aplikasi di
  Applications secara otomatis selama development.
- Daftarkan `.md` dan `.markdown` sebagai tipe dokumen. Registrasi tidak memaksa
  aplikasi menjadi default viewer pengguna.
- Tangani event file macOS pada cold start dan saat aplikasi aktif. Simpan antrean
  sampai frontend siap, kirim setiap event tepat sekali, dan lepaskan listener saat
  frontend dibersihkan. Jangan hanya mengandalkan argumen command line.
- Closing window dan membuka kembali dari Dock/Finder harus diuji sebagai lifecycle
  macOS, bukan diasumsikan identik dengan Electron.

### 2. Layanan dokumen Rust

- Sediakan antarmuka sederhana: pilih file, baca dokumen, dan resolusi tautan lokal.
- Hasil baca membawa path absolut, nama file, dan konten UTF-8. Pembatalan dialog
  dibedakan dari error. Gunakan error bertipe untuk path hilang, izin ditolak,
  format tidak didukung, dan encoding tidak valid.
- Semua sumber pembukaan desktop—dialog, drop, sidebar, Finder, dan tautan lokal—
  melewati alur pemuatan dokumen yang sama agar path aktif selalu benar.
- Gunakan operasi path platform untuk `..`, spasi, Unicode, URL encoding, dan
  konversi file URL; jangan menggabungkan path dengan string secara manual.
- Resolusi tautan berpatokan pada lokasi dokumen aktif. Navigasi relatif ke luar
  folder workspace tetap boleh untuk dokumen yang dipilih pengguna; jangan
  membatasi semua dokumen ke workspace tanpa kebutuhan produk.
- Gunakan identitas permintaan agar hasil baca yang terlambat tidak menimpa
  dokumen yang dipilih lebih baru. Konten kosong merupakan hasil baca yang valid.

### 3. Layanan workspace Rust

- Antarmuka utama: pilih folder dan ambil tree Markdown. Tree membawa nama, path,
  tipe file/folder, serta children untuk folder.
- Pindai rekursif, filter ekstensi tanpa membedakan kapital, abaikan `.git` dan
  `node_modules`, serta sembunyikan folder tanpa dokumen Markdown yang relevan.
- Urutkan folder sebelum file dengan urutan nama yang stabil.
- Jangan mengikuti symlink direktori pada versi awal agar tidak terjadi siklus.
- Error root ditampilkan sebagai kegagalan membuka workspace. Subfolder yang tidak
  dapat dibaca dilewati dengan peringatan ringkas; hasil lain tetap dapat dibuka.
- Jalankan traversal filesystem di luar jalur yang memblokir event loop UI.

### 4. Adapter frontend desktop/web

- Ganti ketergantungan langsung ke bridge Electron dengan adapter desktop bertipe.
  UI menggunakan operasi dokumen/workspace tanpa mengetahui detail IPC Tauri.
- Mode browser memakai File API untuk membuka dan menyeret file serta menyembunyikan
  kemampuan filesystem desktop yang tidak tersedia. Hindari memuat API Tauri saat
  mode browser berjalan.
- Simpan path, nama, konten, dan status pemuatan dokumen sebagai satu konteks yang
  konsisten. Buka dari dialog/drop tidak boleh mewarisi path file sidebar sebelumnya.

### 5. Preview dan Mermaid

- Pertahankan renderer Markdown, syntax highlighting, dan Mermaid yang ada. Library
  serta chunk diagram dibundel lokal; tidak ada CDN untuk fungsi inti.
- Pertahankan HTML mentah Markdown nonaktif dan Mermaid security level strict.
- Render SVG secara asynchronous, batalkan penerapan hasil yang sudah kedaluwarsa,
  dan render ulang ketika tema berubah.
- Kesalahan satu diagram tidak menggagalkan preview dokumen. Tampilkan kode aslinya
  beserta pesan singkat. Pertahankan scroll horizontal untuk diagram yang lebar.
- Uji perilaku SVG, font, dan CSS di WKWebView pada aplikasi hasil packaging.
- Tidak menambahkan editor, zoom, fullscreen, atau download SVG dalam migrasi ini.

### 6. Export PDF

- Antarmuka export mengembalikan status selesai, dibatalkan, atau gagal yang dapat
  ditangani UI. Tunggu semua render Mermaid aktif sebelum memulai export.
- Pertahankan alur pengguna Export PDF menuju fasilitas cetak/simpan PDF macOS.
  Jangan mengasumsikan `window.print()` di WKWebView langsung setara Electron.
- Validasi dukungan cetak pada spike awal. Jika memerlukan jembatan native macOS,
  implementasikan di lapisan desktop dengan antarmuka frontend yang sama.
- PDF harus memuat teks, syntax highlighting, tabel, dan SVG Mermaid dengan warna
  terbaca; toolbar/sidebar tidak masuk hasil cetak. Pembatalan tidak mengubah dokumen.

### 7. Packaging, izin, dan dokumentasi

- Hasil awal: `.app`, DMG, dan ZIP aplikasi untuk arm64. ZIP dapat dibuat dari bundle
  `.app` dengan alat packaging macOS; tidak perlu mengasumsikan ZIP sebagai target
  bundler native Tauri.
- Pisahkan direktori artefak dari baseline Electron selama perbandingan ukuran.
- Berikan kemampuan Tauri hanya untuk window utama dan operasi yang dibutuhkan;
  validasi path pada command Rust, bukan hanya di frontend. Jangan menambahkan
  kemampuan shell umum atau akses filesystem tak terbatas sebagai shortcut.
- Buka tautan eksternal dengan mekanisme opener yang membatasi skema yang didukung.
  Jangan izinkan preview mengganti halaman utama dengan halaman remote berhak IPC.
- Setelah paritas lolos, hapus runtime/bridge/build dependency Electron dari jalur
  distribusi baru. Riwayat Git menjadi referensi implementasi lama.
- Dokumentasikan prasyarat developer, dev desktop, web build, release build,
  pemasangan, hasil pengukuran ukuran, serta status signing/notarization.

## Testing Decisions

Usulan cakupan berikut memerlukan review pemilik produk sebelum implementasi.

- Uji perilaku dan hasil yang terlihat pengguna, bukan susunan internal fungsi,
  class, atau snapshot seluruh implementasi.
- **Prioritas otomatis Rust: layanan dokumen dan workspace.** Gunakan fixture
  filesystem sementara untuk pembacaan, dokumen kosong, path relatif, spasi/Unicode,
  filter, pengurutan, symlink, dan error. Jangan mengandalkan izin Unix yang mungkin
  berbeda ketika test berjalan sebagai pengguna berprivilege.
- **Prioritas integrasi: adapter dan lifecycle pembukaan.** Verifikasi cold start,
  warm start, frontend belum siap, cleanup listener, serta hasil baca yang terlambat.
  Test bagian antrean/event yang dapat diisolasi; alur Finder tetap smoke test di macOS.
- **Smoke test aplikasi terpasang: preview, Mermaid, dan PDF.** Periksa flowchart,
  sequence diagram, sintaks salah, tema terang/gelap, pergantian file, dan export ketika
  diagram masih merender. Buka PDF hasil export dan inspeksi secara visual; stub
  `window.print()` saja tidak cukup membuktikan fitur PDF.
- **Smoke test packaging/offline:** jalankan `.app` hasil build tanpa dev server,
  buka file/folder/drop/Finder, dan tampilkan Mermaid tanpa jaringan. Uji DMG mount,
  integritas ZIP, ikon, serta asosiasi dokumen dari bundle terpasang.
- **Regresi web:** build frontend dan buka file via browser tanpa bridge Tauri.
- Prior art repo: belum ada test runner atau suite otomatis yang dicommit. Versi
  Electron sebelumnya telah dicek dengan build produksi dan smoke test browser
  sementara untuk Mermaid; ini referensi skenario, bukan suite regresi yang tersedia.
- Jangan menetapkan klaim penurunan RAM atau peningkatan kecepatan tanpa benchmark.
  Pengukuran ukuran distribusi wajib; benchmark performa menyeluruh bukan syarat awal.

### Matriks penerimaan minimum

| Area | Hasil yang harus dibuktikan |
|---|---|
| Dokumen | File valid dan kosong terbuka; cancel/error tidak merusak dokumen aktif |
| Workspace | Tree relevan, urut stabil, tanpa siklus symlink, UI tetap responsif |
| Navigasi | Tautan relatif mengacu file aktif; path spasi/Unicode bekerja |
| Finder/lifecycle | Cold start, warm start, dan window ditutup tetap membuka dokumen |
| Preview | Format Markdown dan highlight setara baseline untuk fixture yang disepakati |
| Mermaid | Flowchart/sequence offline, perubahan tema, fallback error, tanpa hasil stale |
| PDF | Dokumen dan diagram terlihat pada PDF nyata; cancel ditangani |
| Web | Build dan pembukaan file browser tetap bekerja |
| Distribusi | DMG/ZIP valid, `.app` berjalan tanpa development tools/server |
| Ukuran | Catatan byte baseline vs Tauri tersedia; target pengurangan DMG dievaluasi |

## Out of Scope

- Menulis ulang UI ke Iced, egui, SwiftUI, atau seluruh aplikasi menjadi Rust murni.
- Mengganti Mermaid dengan renderer Rust atau memindahkan semua parsing Markdown ke Rust.
- Fitur baru: auto-refresh file, daftar isi, pencarian, recent files, editor, tabs,
  Mermaid zoom/fullscreen, atau auto-update.
- Distribusi Windows/Linux, Intel macOS, atau universal binary pada iterasi pertama.
- Publikasi ke App Store atau GitHub Release secara otomatis.
- Pengadaan sertifikat Apple, signing, dan notarization berbayar. Status artefak
  harus dilaporkan; penggunaan sertifikat yang nanti disediakan dibahas terpisah.
- Perbaikan bug lama yang tidak memengaruhi alur migrasi. Konsistensi path aktif,
  dokumen kosong, dan penanganan error termasuk scope karena memengaruhi paritas.

## Further Notes

### Urutan implementasi yang diusulkan

1. Review scope, modul, cakupan test, dan target ukuran dalam PRD ini.
2. Spike Tauri: boot frontend lokal, render Mermaid offline, dan buktikan export PDF
   di WKWebView sebelum menginvestasikan seluruh migrasi.
3. Implementasi layanan Rust dokumen/workspace dan test perilakunya.
4. Sambungkan adapter frontend, file drop, navigasi, Finder events, dan lifecycle.
5. Uji paritas di `.app` terpaket, pertahankan mode web, lalu lepaskan Electron.
6. Bangun DMG/ZIP arm64, validasi integritas dan PDF nyata, ukur ukuran, dan laporkan
   keterbatasan signing serta hasil penerimaan.

### Risiko yang harus diselesaikan

- Dukungan cetak WKWebView mungkin membutuhkan implementasi native khusus macOS.
- Finder file-open events dapat datang sebelum frontend siap dan perlu antrean.
- Perbedaan WebKit dan Chromium dapat memengaruhi SVG Mermaid, font, dan pagination.
- Ukuran akhir tetap dipengaruhi aset dan dependency; Rust sendiri tidak menjamin
  angka ukuran tertentu.

### Referensi teknis

- [WebView Tauri pada macOS](https://v2.tauri.app/reference/webview-versions/):
  WKWebView mengikuti WebKit sistem; renderer perlu diuji pada macOS target.
- [Arsitektur Tauri](https://v2.tauri.app/concept/architecture/): pemisahan core
  dan WebView menjadi dasar layanan Rust serta adapter frontend yang diusulkan.
- [API WebviewWindow](https://v2.tauri.app/reference/javascript/api/namespacewebviewwindow/):
  referensi integrasi window; mekanisme export PDF tetap harus dibuktikan melalui spike.
