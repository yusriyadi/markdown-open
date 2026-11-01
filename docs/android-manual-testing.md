# Android — build dan pengujian manual

Versi awal Android memakai Tauri + Rust, React, dan Android System WebView.
Fokusnya membuka satu dokumen Markdown, preview, Mermaid dengan zoom/scroll,
Open With/Share dari aplikasi Files, dan cetak melalui dialog Android.

## Persiapan build

- Node.js 22.12+ dan npm.
- Rust stable dengan target `aarch64-linux-android`.
- JDK 17+, Android SDK, Build-Tools, dan NDK side-by-side.
- Konfigurasi `JAVA_HOME`, `ANDROID_HOME`, dan `NDK_HOME` sesuai instalasi mesin.

Contoh macOS untuk toolchain Rust normal:

```bash
export JAVA_HOME="/path/to/jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/30.0.16248370"
rustup target add aarch64-linux-android
npm ci
npm run android:apk
```

Project Android ada di `src-tauri/gen/android`. Project ini ikut disimpan dalam
repository, termasuk konfigurasi manifest dan Activity yang sudah disesuaikan;
tidak perlu menjalankan `android init` lagi setelah clone.
Kode plugin dokumen dipelihara di `src-tauri/android/src/main/java` dan dimasukkan
ke source set aplikasi Android.

APK untuk pengujian adalah **debug APK arm64**, memakai debug signing key dan
bukan artefak yang siap diunggah ke Play Store. APK memerlukan Android 7.0/API 24
atau lebih baru dan Android System WebView yang mendukung frontend modern.
Untuk rilis publik, gunakan konfigurasi signing sendiri dan build release/AAB.

## Identitas aplikasi versi terbaru

Versi `1.1.1` memakai application ID dan namespace `com.tellabs.markdownopen.app`.
Registrasi plugin Rust dan package Kotlin disesuaikan bersama. Android menganggapnya
aplikasi berbeda dari versi `1.1.0` (`com.markdownopen.app`); versi lama dapat tetap
terpasang berdampingan. Catatan hasil build `1.1.0` di bawah adalah riwayat, bukan
identitas APK terbaru.

Validasi versi `1.1.1`: build release Rust/Kotlin dan signature v2/v3 berhasil;
APK terverifikasi memakai package baru, versionCode `1001001`, min SDK 24,
ABI arm64-v8a, dan plugin Kotlin namespace baru. Ukuran sekitar 12,1 MiB.
APK dengan package baru ini belum dites pada perangkat. Tes frontend (13) dan
Rust desktop (6) lulus. Output lokal:
`release/android/Markdown-Open-1.1.1-android-arm64-release-local-signed.apk`.

## Hasil build pengembangan

Build debug arm64 versi `1.1.0` berhasil dibuat. Output Gradle:

```text
src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

Salinan untuk pengujian lokal tersedia di
`release/android/Markdown-Open-1.1.0-android-arm64-debug.apk` (folder `release/`
diabaikan Git). Ukurannya sekitar **133,6 MiB** karena menyertakan simbol debug
Rust; ukuran ini bukan ukuran distribusi release yang dioptimalkan.

Validasi terbatas yang sudah dijalankan:

- Build frontend TypeScript/Vite berhasil.
- `cargo check` untuk desktop berhasil setelah pemisahan entry point.
- Build Rust dan Kotlin Android beserta packaging APK berhasil.
- Signature APK terverifikasi (v2); application ID `com.markdownopen.app`, versi
  `1.1.0`, min SDK 24, target SDK 36, library native hanya `arm64-v8a`.
- Plugin dokumen Kotlin terkonfirmasi ada dalam DEX APK.
- `git diff --check` bersih.

APK berhasil diinstal dan dibuka pada perangkat RMX1971. Pemilik perangkat
mengonfirmasi sampel Markdown/Mermaid berfungsi saat tes manual. Checklist
lengkap di bawah belum seluruhnya diverifikasi.

## Build release untuk ukuran lebih kecil

```bash
npm run android:apk:release
```

Build release arm64 berhasil dengan optimasi ukuran Rust, LTO, dan stripping
simbol debug. Perbandingan APK lokal:

| Build | Ukuran |
|---|---:|
| Debug | 133,63 MiB |
| Release, ditandatangani lokal | 12,07 MiB |

Ukuran APK turun **90,97%**. Output unsigned asli berada di
`src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk`.
Salinan lokal untuk dipasang berada di
`release/android/Markdown-Open-1.1.0-android-arm64-release-local-signed.apk`.

APK release lokal ditandatangani memakai **debug keystore yang sudah ada** agar
bisa dipasang untuk tes manual dan menggunakan identitas signing yang sama dengan
APK debug sebelumnya. Build tetap mode release dan tidak debuggable; key ini bukan
key distribusi publik. Untuk publikasi, tandatangani output unsigned dengan release
keystore sendiri. Folder `release/` tidak masuk Git.

Signature v2/v3 dan alignment APK terverifikasi, ABI hanya arm64-v8a, serta plugin
dokumen native tetap ada dalam DEX. APK release ini belum dites ulang pada perangkat.

## Checklist di perangkat

1. Pasang APK arm64, lalu buka aplikasi. Pastikan toolbar tidak tertutup status bar
   atau navigation bar, dan tombol Back Android berperilaku normal.
2. Pilih **Open File**. Coba dokumen `.md`/`.markdown`, file kosong, nama file dengan
   spasi/Unicode, dan pembatalan picker. Dokumen lama harus tetap ada saat picker dibatalkan.
3. Buka file dari **Files → Open With** dan **Share**, baik saat aplikasi belum
   berjalan maupun sudah terbuka. Pastikan tidak muncul duplikat pembukaan file.
4. Coba heading, tabel, kode, flowchart, sequence diagram, dan sintaks Mermaid yang
   salah. Gunakan tombol zoom/Fit dan scroll diagram ke dua arah. Coba tema sistem
   terang/gelap serta orientasi layar.
5. Pilih **Export PDF**, simpan lewat layanan cetak Android, lalu buka PDF-nya.
   Periksa diagram tidak terpotong akibat zoom dan tombol kontrol tidak ikut tercetak.
6. Coba tautan web/email: tautan harus dibuka oleh aplikasi yang sesuai, tanpa
   mengganti halaman utama viewer. Putuskan internet dan coba lagi dokumen lokal
   beserta Mermaid yang tidak memakai resource eksternal.

## Batas versi awal

- Pemilihan satu file memakai Storage Access Framework dan URI `content://`.
  Aplikasi tidak meminta izin akses seluruh penyimpanan.
- Workspace folder dan navigasi file relatif belum tersedia di Android. Pilih
  dokumen berikutnya melalui Open File. Gambar relatif dari file lain juga belum
  dapat diakses otomatis dari dokumen yang dipilih satu per satu.
- Dokumen harus berformat UTF-8 dan maksimal 16 MB.
- Tidak ada penyimpanan dokumen terakhir jika proses aplikasi dihentikan Android.
- Dukungan Open With bergantung MIME type yang diberikan aplikasi Files/provider;
  filter mencakup Markdown, teks biasa, dan application/octet-stream.
- Cetak/Save as PDF bergantung layanan cetak yang tersedia di perangkat.

Sesuai permintaan, validasi pengembangan difokuskan pada kompilasi dan build.
Checklist perangkat dilakukan manual oleh pemilik perangkat; konfirmasi sampel
berfungsi tidak mencakup semua provider file atau perangkat Android.
