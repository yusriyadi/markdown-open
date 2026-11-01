# Panduan agent

Markdown Open adalah viewer Markdown offline berbasis React/TypeScript dan Tauri 2
dengan Rust. Mermaid dibundel lokal. Target yang sudah dibangun adalah macOS Apple
Silicon dan Android arm64; browser juga didukung. Windows masih eksperimental.

## Mulai membaca

- [Peta kode dan alur fitur](docs/codebase-map.md): lokasi implementasi dan hubungan
  frontend, Rust, serta Kotlin Android.
- [README](README.md): setup dan cara build distribusi.
- [Panduan Android](docs/android-manual-testing.md): build, signing, dan tes perangkat.
- [PRD migrasi](docs/PRD-tauri-rust-migration.md): konteks migrasi Electron ke Tauri;
  gunakan kode saat ini sebagai acuan implementasi terbaru.

## Aturan implementasi

- Pisahkan perilaku desktop, Android, dan browser melalui `src/lib/platform.ts`.
  Fitur native memakai kontrak `NativeBridge` di `src/lib/types.ts`.
- Perubahan frontend bersama harus mempertahankan alur desktop dan browser.
  Gaya khusus Android dibatasi dengan `.app-android`.
- Desktop memakai path file yang diberikan akses oleh layanan `Documents`.
  Android memakai Storage Access Framework dan URI `content://`; jangan perlakukan
  URI tersebut sebagai path desktop. Android belum mendukung workspace folder dan
  navigasi file relatif.
- Pertahankan pembatalan picker, dokumen kosong, dan perlindungan hasil async lama
  melalui `LatestTask`. Pertahankan antrean file saat frontend belum siap.
- Markdown tidak mengizinkan HTML mentah; Mermaid memakai `securityLevel: 'strict'`.
  Command native dibatasi melalui capability tiap platform. Saat menambah command,
  cek handler Rust, `src-tauri/build.rs`, dan capability yang sesuai.
- `src-tauri/gen/android` berisi scaffold yang **ikut dilacak Git dan sudah
  dikustomisasi**. Jangan menjalankan `android:init` ulang tanpa memeriksa dampak
  pada manifest, Activity, dan Gradle. Plugin Kotlin dipelihara di
  `src-tauri/android/src/main/java` dan dimasukkan lewat source set Gradle.
- Artefak `release/`, `dist/`, direktori target Rust, dan cache build bukan sumber
  kode. Jangan masukkan keystore, password, atau konfigurasi mesin ke Git.
- Jika memindah file atau mengubah entry point/alur fitur, perbarui peta kode.

## Perintah dari root repository

| Kebutuhan | Perintah |
|---|---|
| Instal dependency JS | `npm ci` |
| Dev browser / desktop | `npm run dev` / `npm run desktop:dev` |
| Build frontend | `npm run build` |
| Tes frontend / Rust | `npm test` / `npm run test:rust` |
| Build macOS arm64 + packaging | `npm run desktop:build` |
| Dev Android | `npm run android:dev` |
| APK Android debug / release arm64 | `npm run android:apk` / `npm run android:apk:release` |

Android memerlukan JDK, SDK, NDK, target Rust `aarch64-linux-android`, dan environment
sesuai README. Build release tanpa konfigurasi signing menghasilkan APK unsigned.
APK release lokal yang pernah dibuat memakai debug key untuk tes, bukan identitas
signing publik.

Pilih pemeriksaan sesuai perubahan. Gunakan tes yang sudah ada untuk regresi kode
bersama; perubahan dokumentasi cukup diperiksa path, perintah, dan diff-nya.
Pengujian Android difokuskan pada build dan tes manual perangkat; hindari membuat
suite besar tanpa kebutuhan. Nyatakan terpisah hasil build dan hasil tes perangkat.
