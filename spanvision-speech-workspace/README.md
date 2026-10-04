# speech workspace

**Spanvision infra · SW · Spanvision Mono**

An independent local speech application with a launcher in the Spanvision suite.
SolidJS + Vite provides the interface; Rust + Tauri 2 runs the existing bundled
Whisper speech engine, recording, file conversion, hotkeys, dictionary, meeting
workflows, and optional local Piper text-to-speech.

## Browser preview

From the suite root:

```powershell
node branding/build.mjs speech hub
npm run preview:speech
npm run verify:speech
```

Open http://127.0.0.1:4240/ for Speech or the existing hub at port 4230. The
independent Speech preview can join a running hub without stopping other tools.
For a fresh full suite session, use `npm run preview:suite`.

From this directory, `npm install`, `npm run build`, and `npm run preview` also
provide an independent Vite preview. `npm run dev` uses port 3025 for Tauri.

Browser previews offer editable sample transcripts and an audio-import sample.
Selected files are not read or uploaded. Capture, model downloads, voice
generation, and OS integrations require the desktop app. No Web Speech API or
automatic speech-server discovery is used. Account forms are explicitly previews;
passwords are never saved or transmitted and profile changes reset on reload.

## Desktop

```powershell
npm run tauri dev
```

On this machine, the `src-tauri/target` junction stores compilation artifacts in
`D:\CAD\spanvision-speech-build-cache` to avoid filling the system drive. A fresh
checkout can use normal Cargo storage or set `CARGO_TARGET_DIR` to another disk.
Installed frontend dependencies also use a local D: cache; `npm install` restores
normal dependencies in a fresh checkout. Linked dependencies resolve to one Solid
runtime through the Vite and TypeScript configuration.
Use `cargo test --locked --lib -j 1` inside `src-tauri` for the native unit tests.
On machines with limited memory, use `CARGO_PROFILE_DEV_DEBUG=0` and
`CARGO_PROFILE_TEST_DEBUG=0` to reduce compiler memory use.

The CPU transcription smoke test uses a locally synthesized 16 kHz WAV in
`../qa/speech/local-fixture.wav` and the bundled base model:

```powershell
cargo test --locked --lib -j 1 local_fixture_transcription -- --ignored --nocapture
```

No live microphone recording is needed for that test. Live input, hotkeys,
Windows loopback audio, GPU acceleration, and installed Piper voices require
their respective hardware/runtime validation.

The original CUDA engine is retained. The additional verified CPU engine in
`bin/cpu` is selected when GPU use is off or an NVIDIA driver is unavailable.
Its source, checksum and MIT license accompany the application.

## Identity, themes, and compatibility

The suite's shared brand registry generates this app's local JSON, CSS, Rust
constants, and SW assets. Standalone builds include those adapters and do not
depend on the parent directory. The application identifier is
`com.spanvisioninfra.speechworkspace`, executable is `spanvision-speech-workspace`,
and Rust library is `spanvision_speech_workspace_lib`.

Fresh profiles use Spanvision Mono. Existing light/dark choices remain intact
through grayscale compatibility palettes. Local settings, dictionaries, speaker
profiles, and Piper data import once without overwriting new data. Prior model
paths remain usable; legacy model directories remain discoverable. Account
credentials and cloud service caches are excluded, and remote processing is off.
Same-origin browser storage migrates legacy keys without deleting originals.

All local Tauri command names, transcription event payloads, and export formats
remain compatible. The former account and service-discovery commands return
disabled/local-only responses; there are no upstream account-service connections.

## Open-source notices

This is a modified Apache-2.0 application. Original attribution is preserved in
`legal/UPSTREAM-NOTICES.md` and the unmodified `LICENSE`, also accessible through
**About → Open-source notices**. Bundled engines, model weights, libraries, and
optional voices retain their own licenses and technical resource names.

## Documentation archive

Historical plans, research, logs and superseded source documentation have moved out of this tool to [the suite source archive](../source-provenance/spanvision-speech-workspace/). Current run instructions, useful technical guides, in-app Help and required source/license notices remain with the application.
