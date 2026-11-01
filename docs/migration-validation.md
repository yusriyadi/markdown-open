# Tauri migration — implementation and validation

Date: 1 November 2026
Branch: `feature/refactor-to-rust`
Baseline: Electron commit `67429f0`

## Implemented

- Tauri 2 desktop shell with a Rust document service, workspace traversal, native
  file/folder dialogs, macOS file associations, and Finder/drop event handling.
- Session grants derived from native dialogs, Finder/drop events, and navigation
  from authorized documents. Canonical paths prevent implicit workspace grants
  from escaping through symlinks.
- Native open-file queue and a frontend inbox that buffers across React mounts.
- Shared frontend adapter and request ordering for dialog/sidebar/Finder/link loads.
- Empty document support, error reporting, consistent active paths, external opener,
  and browser File API fallback.
- Existing React Markdown, syntax tokenization, and offline Mermaid rendering.
- Native WKWebView printing after diagram/font readiness; keyboard shortcut Cmd+P.
- Standalone arm64 `.app`, DMG, and ZIP with exact size comparison.
- Electron runtime, bridge, and packaging dependencies removed from this branch.

## Checks performed

| Check | Result |
|---|---|
| Frontend production build / TypeScript | Passed |
| Vitest | 9 tests passed, including App file selection in browser mode with no Tauri globals |
| Rust tests | 6 passed |
| Rust Clippy, all targets, warnings denied | Passed |
| Native packaged launch, no dev server | Passed |
| Native Open File and Open Folder | Passed |
| Workspace sidebar and relative Markdown navigation | Passed |
| Unicode/space filename link | Passed |
| Empty document | Passed: header and preview remain open |
| Mermaid flowchart and sequence diagram in WKWebView | Passed |
| Invalid Mermaid with readable remaining document | Passed |
| Finder warm open via explicit Tauri bundle | Passed |
| Finder cold start via explicit Tauri bundle | Passed |
| Native PDF save from packaged app | Passed; actual PDF generated and all pages inspected |
| Cmd+P in final distribution | Passed |
| ZIP integrity | Passed, unzip reported no errors |
| DMG checksum | Passed, hdiutil reported VALID |
| Binary and file associations | Confirmed arm64 Mach-O; md/markdown Viewer associations present |
| Working-tree whitespace check | Passed |

The native PDF test exercised both flowchart and sequence SVG output with text and
a table. Short tables now move as a whole between pages. WebKit may leave the
preceding heading on the prior page; more sophisticated pagination is not part of
this migration. The native print API acknowledges opening the dialog; macOS owns
completion/cancellation and does not return a save/cancel result through this API.

## Distribution sizes

Exact byte counts are in `tauri-size-report.json`. MB below uses 1,000,000 bytes.

| Artifact | Electron | Tauri |
|---|---:|---:|
| DMG | 167.12 MB | 6.16 MB |
| ZIP | 166.28 MB | 5.03 MB |
| Installed app file bytes | 478.92 MB | 11.38 MB |

DMG reduction: **96.31%**, exceeding the proposed 50% acceptance target.
Directory size is the sum of file/symlink lengths, not allocated disk blocks.
Tauri artifacts are in `release/tauri-arm64/`; the Electron baseline was preserved.

## Remaining manual coverage and distribution limits

- Actual Finder-to-window native drag/drop is implemented through Tauri's drop
  event and the tested Rust queue, but has not been exercised with a real OS drag.
  The available automation interface did not expose window origins for a reliable
  cross-application drag.
- Window close-to-hide behavior is implemented and the app remains running. Finder
  cold/warm opens were checked; a separate end-to-end check after hiding the window
  remains useful. Duplicate installed bundles make default-app testing ambiguous.
- Live system theme switching and compatibility on the minimum declared macOS 11
  were not exercised. Current-machine WKWebView rendering and print output were checked.
- The browser app loaded with desktop-only controls absent. Automated Chrome file
  upload was blocked by the extension's file-URL permission, and native Chrome
  automation timed out. No browser permissions were changed. Browser file loading,
  empty documents, and error preservation instead have an automated DOM integration
  test; native browser file-picker smoke coverage remains manual.
- These are local builds with a linker ad-hoc signature, without an Apple Developer
  identity or notarization. Installing the new app in Applications is a user action;
  the existing installed Electron app was not replaced.
- No memory/CPU/startup speed improvement is claimed; only distribution size was measured.

## Developer toolchain used for this session

The machine initially had no Rust toolchain. Rust stable 1.99.1 was installed into
project-specific temporary directories without editing shell startup files. To
reuse that toolchain while those directories exist:

```bash
export PATH="/tmp/markdown-open-cargo/bin:$PATH"
export CARGO_HOME=/tmp/markdown-open-cargo
export RUSTUP_HOME=/tmp/markdown-open-rustup
npm run desktop:dev
```

For persistent development, install stable Rust with the official rustup installer,
then use the standard commands in the README. End users of the `.app` do not need Rust.
