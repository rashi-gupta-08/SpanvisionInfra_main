//! Shared per-user config directory used by the small settings stores (recent
//! files, status-bar layout, ribbon collapse mode, …). Everything lives under
//! `<platform-config>/Spanvision Infra/CAD` so the app keeps a single tidy folder.

#[cfg(not(target_arch = "wasm32"))]
use std::path::PathBuf;

/// The Spanvision CAD config directory (not created). `None` when the platform
/// config base can't be resolved (e.g. no `HOME`). Callers `join` their own
/// file name onto it and `create_dir_all` its parent before writing.
#[cfg(not(target_arch = "wasm32"))]
pub fn config_dir() -> Option<PathBuf> {
    // Tests must never read or write the person's real settings: a test run
    // once raced dozens of tests through an alias-table migration and left the
    // user's alias file holding a single line. Every store routes through here,
    // so one per-process scratch folder isolates them all.
    if cfg!(test) {
        return Some(std::env::temp_dir().join(format!("ocs-test-config-{}", std::process::id())));
    }
    let base: PathBuf = if cfg!(target_os = "windows") {
        std::env::var_os("APPDATA").map(PathBuf::from)?
    } else if cfg!(target_os = "macos") {
        let home = std::env::var_os("HOME")?;
        let mut p = PathBuf::from(home);
        p.push("Library");
        p.push("Application Support");
        p
    } else if let Some(d) = std::env::var_os("XDG_CONFIG_HOME") {
        PathBuf::from(d)
    } else {
        let home = std::env::var_os("HOME")?;
        let mut p = PathBuf::from(home);
        p.push(".config");
        p
    };
    static PROFILE: OnceLock<Option<PathBuf>> = OnceLock::new();
    PROFILE.get_or_init(|| {
        let legacy = base.join("OpenCADStudio");
        let current = base.join(crate::brand::ORGANIZATION).join(crate::brand::PRODUCT);
        migrate_profile(&legacy, &current);
        Some(current)
    }).clone()
}

/// Copy only user-owned state. Old files are never removed, and existing new
/// files always win. Caches, crash logs and update feeds are left behind.
#[cfg(not(target_arch = "wasm32"))]
fn migrate_profile(legacy: &std::path::Path, current: &std::path::Path) {
    if !legacy.is_dir() || current.join("settings.json").exists() {
        return;
    }
    for file in ["settings.json", "ocad.pgp", "ocad.pgp.version", "last_dir.txt"] {
        let source = legacy.join(file);
        let target = current.join(file);
        if source.is_file() && !target.exists() {
            if std::fs::create_dir_all(current).is_ok() {
                let _ = std::fs::copy(source, target);
            }
        }
    }
    for folder in ["fonts", "plotstyles", "plugins"] {
        copy_user_tree(&legacy.join(folder), &current.join(folder));
    }
}

#[cfg(not(target_arch = "wasm32"))]
fn copy_user_tree(source: &std::path::Path, target: &std::path::Path) {
    let Ok(entries) = std::fs::read_dir(source) else { return };
    if std::fs::create_dir_all(target).is_err() { return; }
    for entry in entries.flatten() {
        let Ok(kind) = entry.file_type() else { continue };
        if kind.is_symlink() { continue; }
        let destination = target.join(entry.file_name());
        if kind.is_dir() {
            copy_user_tree(&entry.path(), &destination);
        } else if kind.is_file() && !destination.exists() {
            let _ = std::fs::copy(entry.path(), destination);
        }
    }
}

#[cfg(test)]
mod migration_tests {
    use super::*;

    #[test]
    fn migration_copies_user_state_only_and_never_overwrites() {
        let root = std::env::temp_dir().join(format!("spanvision-profile-test-{}", std::process::id()));
        let old = root.join("OpenCADStudio");
        let new = root.join(crate::brand::ORGANIZATION).join(crate::brand::PRODUCT);
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(old.join("fonts")).unwrap();
        std::fs::create_dir_all(old.join("video_thumbs")).unwrap();
        std::fs::create_dir_all(&new).unwrap();
        std::fs::write(old.join("settings.json"), "old").unwrap();
        std::fs::write(old.join("ocad.pgp"), "alias").unwrap();
        std::fs::write(old.join("fonts/custom.shx"), "font").unwrap();
        std::fs::write(old.join("video_thumbs/cache.png"), "cache").unwrap();
        migrate_profile(&old, &new);
        assert_eq!(std::fs::read_to_string(new.join("settings.json")).unwrap(), "old");
        assert_eq!(std::fs::read_to_string(new.join("ocad.pgp")).unwrap(), "alias");
        assert_eq!(std::fs::read_to_string(new.join("fonts/custom.shx")).unwrap(), "font");
        assert!(!new.join("video_thumbs").exists());
        assert!(old.join("settings.json").exists());
        std::fs::write(new.join("settings.json"), "new").unwrap();
        std::fs::write(old.join("ocad.pgp"), "changed old alias").unwrap();
        migrate_profile(&old, &new);
        assert_eq!(std::fs::read_to_string(new.join("settings.json")).unwrap(), "new");
        assert_eq!(std::fs::read_to_string(new.join("ocad.pgp")).unwrap(), "alias");
        std::fs::remove_dir_all(root).unwrap();
    }
}

// ── Last file-dialog directory ───────────────────────────────────────────────

#[cfg(not(target_arch = "wasm32"))]
use std::path::Path;
#[cfg(not(target_arch = "wasm32"))]
use std::sync::{Mutex, OnceLock};

#[cfg(not(target_arch = "wasm32"))]
fn last_dir_store() -> &'static Mutex<Option<PathBuf>> {
    static STORE: OnceLock<Mutex<Option<PathBuf>>> = OnceLock::new();
    STORE.get_or_init(|| {
        // Seed from the persisted value; discard it if the folder is gone.
        let loaded = config_dir()
            .map(|d| d.join("last_dir.txt"))
            .and_then(|f| std::fs::read_to_string(f).ok())
            .map(|s| PathBuf::from(s.trim()))
            .filter(|p| p.is_dir());
        Mutex::new(loaded)
    })
}

/// The directory the last file dialog picked or saved into, if it still
/// exists — used to seed the next dialog so pickers reopen where the user
/// left off. Persisted across runs.
#[cfg(not(target_arch = "wasm32"))]
pub fn last_dialog_dir() -> Option<PathBuf> {
    last_dir_store().lock().ok()?.clone().filter(|p| p.is_dir())
}

/// Record the directory of a path a file dialog just returned.
#[cfg(not(target_arch = "wasm32"))]
pub fn remember_dialog_dir(file_path: &Path) {
    let Some(dir) = file_path.parent().filter(|d| d.is_dir()) else {
        return;
    };
    if let Ok(mut store) = last_dir_store().lock() {
        if store.as_deref() == Some(dir) {
            return; // unchanged — skip the disk write
        }
        *store = Some(dir.to_path_buf());
    }
    if let Some(cfg) = config_dir() {
        let _ = std::fs::create_dir_all(&cfg);
        let _ = std::fs::write(cfg.join("last_dir.txt"), dir.display().to_string());
    }
}
