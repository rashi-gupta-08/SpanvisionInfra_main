//! Native commands van de Rust-schil — precies één, en dat is opzet.
//!
//! Alle bestand-I/O loopt via de JS-plugins `@tauri-apps/plugin-fs` +
//! `@tauri-apps/plugin-dialog` (zie `src/services/fileAccess/`). Het enige
//! `invoke()` in de hele frontend staat in
//! `src/services/updater/updaterService.ts` en roept `install_kind` aan.
//!
//! Hier stonden ook `read_file`/`write_file`: ongebruikte "escape hatch"-commands
//! voor native bestand-I/O. Ze zijn verwijderd bij onderhoudbaarheidsbevinding
//! K6a, omdat ongebruikt hier niet onbereikbaar betekent. Alles wat in de
//! `invoke_handler` staat is aan te roepen via
//! `window.__TAURI_INTERNALS__.invoke(...)`, dus ook vanuit extensiecode, die in
//! dezelfde realm draait. Ze namen een willekeurig pad aan, deden geen enkele
//! padvalidatie en gingen volledig buiten de scope-configuratie van `plugin-fs`
//! om — daarmee waren ze een lees-/schrijfprimitief op het hele bestandssysteem,
//! zonder dat één regel productiecode ze nodig had. Heb je ooit native
//! bestand-I/O nodig, breid dan `src/services/fileAccess/` uit (of voeg een
//! command toe MÉT padvalidatie), niet deze module.

/// Detecteer hoe de app op deze machine geïnstalleerd is, zodat de frontend kan
/// beslissen óf en hoe de in-app updater mag werken.
///
/// Gerechtvaardigde minimale uitzondering op "domeinlogica hoort in TypeScript":
/// dit is pure platform-introspectie (env-read), géén domeinlogica. De frontend
/// kan zelf geen process-env lezen, vandaar deze piepkleine command.
///
/// Teruggegeven waarden:
/// - `"appimage"` — gestart vanuit een AppImage (env `APPIMAGE` gezet); updater
///   kan in-place vervangen → auto-install OK.
/// - `"snap"` — gestart binnen een Snap (env `SNAP` gezet); read-only, snapd
///   updatet zelf → in-app updater overslaan.
/// - `"deb"` — Linux zonder AppImage/Snap (vermoedelijk .deb/systeempakket);
///   de updater-plugin (≥2.6) installeert .deb gewoon in-place via pkexec/sudo
///   + `dpkg -i` → normale auto-install-flow, handmatige instructies alleen
///   nog als fallback bij een fout.
/// - `"native"` — Windows/macOS (en overige niet-Linux): de normale updater-flow.
#[tauri::command]
pub fn install_kind() -> String {
    if cfg!(target_os = "linux") {
        if std::env::var_os("APPIMAGE").is_some() {
            "appimage".to_string()
        } else if std::env::var_os("SNAP").is_some() {
            "snap".to_string()
        } else {
            "deb".to_string()
        }
    } else {
        "native".to_string()
    }
}
