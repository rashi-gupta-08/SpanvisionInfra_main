# speech workspace · verification

Verified 3 October 2026 (Asia/Calcutta). Organization: **Spanvision infra**.

## Preview and source

- Speech: http://127.0.0.1:4240/
- Suite launcher: http://127.0.0.1:4230/
- Application: `../../spanvision-speech-workspace`
- Architecture: `../../spanvision-speech-workspace/ARCHITECTURE.md`
- Browser evidence: `browser-results.json` and `screenshots/`.

The original archive remains unchanged. Archived Git/LFS data and redundant
backups were excluded from the import. The source retains Apache-2.0 and original
attribution in Open-source notices; archived design documents are provenance,
not active project instructions. Original valid models and engine binaries remain.
The existing suite name and GW identity are preserved; Speech uses its SW override.

## Observed results

| Check | Result |
|---|---|
| Shared registry, generated identity/palette/manifests | Pass |
| TypeScript check and production frontend build | Pass |
| Rust check and Windows native executable build | Pass; unsigned debug executable produced |
| Browser scenarios | 107 passed; zero page errors, overflow findings, or forbidden requests |
| Screen widths | 320, 390, 820, 1440px |
| Screens | Landing, workspace, audio import, suggestions, login, sign-up, account, settings, dictionary, models, meeting, mic test, TTS, About |
| All 25 locales | No upstream presentation found in rendered settings screens |
| Audio dialog | Focus containment/restoration, cancellation, completion, Escape, invalid extension and long filename passed |
| Accounts | Email/name/password validation, in-memory edits, no credential/profile storage, reset on reload passed |
| Preferences and migration | Light/dark preserved, fresh Mono default, legacy browser keys/output directory retained, remote processing forced off, existing new data protected, malformed legacy JSON handled |
| Native unit tests | 21 passed; 3 fixture/hardware tests ignored in standard run |
| Native migration | Missing local data copied once, existing Spanvision data protected, account/cache files excluded |
| Native compatibility | Disabled account and empty remote-service responses passed |
| Missing native model | Clear error test passed |
| Native CPU transcription | Real Rust Transcriber + local WAV + bundled base model passed |
| Native file-job cancellation | Real CPU engine process stopped; job removed; unknown-job cancellation preserves other jobs |
| Overlay windows | Transparent document/body/root backgrounds passed; native panels use theme tokens |
| Natural-color photography | Loaded successfully; no grayscale filter; visually inspected |

Mono/dark supporting text measured **6.05:1** against the transcript surface;
primary buttons and TTS progress badges measured **18.10:1**. Light supporting
text measured **7.46:1**, with primary controls **18.73:1**. These are representative
token/state checks, not an assertion that every pixel or assistive-technology
combination was audited. Keyboard focus, mobile drawer containment, Escape
dismissal, and primary touch-control sizes were checked.

The native fixture produced:

> The project meeting starts at 9. Please review the foundation drawings and confirm the site access route.

The two local fixture tests ran separately and both passed. Only live loopback
capture remains unexercised among the ignored tests. See `cargo-tests.log`,
`native-smoke.log`, `native-results.json`, `cargo-check.log` and `cargo-build.log`.
The native executable is at
`../../spanvision-speech-workspace/src-tauri/target/debug/spanvision-speech-workspace.exe`;
keep its adjacent resources when moving it. This is a development build.

## CPU engine repair

The archived CUDA engine failed to start on this machine with Windows status
`0xC0000135`; its import table requires the absent NVIDIA `nvcuda.dll`, even with
`--no-gpu`. The original binaries are preserved. An official
[whisper.cpp v1.8.3 CPU asset](https://github.com/ggml-org/whisper.cpp/releases/expanded_assets/v1.8.3)
was added in `bin/cpu`, with the downloaded archive SHA-256 verified against the
published value:

`d824b1e37599f882b396e73f1ee0bfd5d0529f700314c48311dcbd00b803321d`

The additional engine's MIT license and provenance accompany the application and
appear in About → Open-source notices. CPU selection does not change public
Tauri command names, transcription payloads or export formats.

## Remaining hardware and release checks

Live microphone input, Windows loopback capture, global hotkeys/auto-paste,
native floating-window positioning, GPU acceleration, optional speaker models
and installed Piper voices need validation with their respective hardware and
models. A signed installer was not produced. Browser import and native file-job
cancellation were verified. The native fixture runs directly
through the Rust speech adapter and does not test live microphone capture.

The native backend emits 21 unused/dead-code warnings. They do not prevent
compilation or the passing tests. Frontend builds warn about the large existing
locale bundle. Local dependency/compiler caches live on D: because this machine's
system drive is constrained; a fresh checkout can install dependencies normally.

## Reproduce

From the suite root:

```powershell
node branding/build.mjs speech hub
npm run brand:check
npm run verify:speech
```

For native checks on this machine:

```powershell
pwsh -NoProfile -File qa/speech/native-check.ps1
```

Representative screenshots: `landing-1440.png`, `landing-photo-1440.png`,
`workspace-390.png`, `workspace-1440.png`, `signup-820.png`, `audio-dialog-320.png`.
