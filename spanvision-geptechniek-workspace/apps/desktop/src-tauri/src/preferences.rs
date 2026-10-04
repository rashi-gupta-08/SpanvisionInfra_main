//! One-time, non-destructive migration from the upstream app profile.
use std::{fs, io, path::Path};
use serde_json::{Map, Value};

pub fn migrate(profile: &Path) -> io::Result<()> {
    let legacy = profile.parent().unwrap_or(profile).join("foundation.openaec.opengeotechniekstudio");
    migrate_from(profile, &legacy)
}

fn migrate_from(profile: &Path, legacy: &Path) -> io::Result<()> {
    let marker = profile.join("spanvision-migration-v1.json");
    if marker.exists() { return Ok(()); }
    fs::create_dir_all(profile)?;
    let old = legacy.join("preferences.json");
    let new = profile.join("preferences.json");
    if old.is_file() {
        let parse = |path: &Path| -> io::Result<Map<String, Value>> {
            serde_json::from_slice::<Map<String, Value>>(&fs::read(path)?)
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
        };
        let source = parse(&old)?;
        let mut settings = if new.is_file() { parse(&new)? } else { Map::new() };
        for (key, value) in source { settings.entry(key).or_insert(value); }
        let temporary = profile.join("preferences.spanvision-migration.tmp");
        fs::write(&temporary, serde_json::to_vec_pretty(&settings)?)?;
        // Windows rename cannot replace an existing file. A backup protects
        // the new profile if a filesystem failure interrupts replacement.
        if new.exists() {
            let backup = profile.join("preferences.pre-migration.json");
            if !backup.exists() { fs::copy(&new, &backup)?; }
            fs::write(&new, fs::read(&temporary)?)?;
            fs::remove_file(&temporary)?;
        } else { fs::rename(&temporary, &new)?; }
    }
    fs::write(marker, b"{\"version\":1,\"source\":\"foundation.openaec.opengeotechniekstudio\"}")
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn copies_once_preserves_newer_keys_and_never_changes_source() {
        let root = std::env::temp_dir().join(format!("spanvision-migration-test-{}-{}", std::process::id(), chrono::Utc::now().timestamp_nanos_opt().unwrap()));
        let old = root.join("old"); let new = root.join("new");
        fs::create_dir_all(&old).unwrap(); fs::create_dir_all(&new).unwrap();
        let original = br##"{"theme":"light","language":"nl","canvasBackground":"#123456","extensions":{"custom":true}}"##;
        fs::write(old.join("preferences.json"), original).unwrap();
        fs::write(new.join("preferences.json"), br#"{"theme":"spanvision-mono"}"#).unwrap();
        migrate_from(&new, &old).unwrap();
        let migrated: Value = serde_json::from_slice(&fs::read(new.join("preferences.json")).unwrap()).unwrap();
        assert_eq!(migrated["theme"], "spanvision-mono");
        assert_eq!(migrated["language"], "nl");
        assert_eq!(migrated["canvasBackground"], "#123456");
        assert_eq!(migrated["extensions"]["custom"], true);
        assert_eq!(fs::read(old.join("preferences.json")).unwrap(), original);
        fs::write(old.join("preferences.json"), br#"{"language":"en"}"#).unwrap();
        migrate_from(&new, &old).unwrap();
        assert_eq!(fs::read(new.join("preferences.json")).unwrap(), serde_json::to_vec_pretty(&migrated).unwrap());
        let fresh = root.join("fresh");
        migrate_from(&fresh, &old).unwrap();
        assert_eq!(fs::read(fresh.join("preferences.json")).unwrap(), serde_json::to_vec_pretty(&serde_json::json!({"language":"en"})).unwrap());
        fs::remove_dir_all(root).unwrap();
    }
}
