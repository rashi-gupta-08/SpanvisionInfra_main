use std::{fs, io, path::Path};

pub fn migrate_preferences(current: &Path, legacy: &Path) -> io::Result<bool> {
    let target = current.join("preferences.json");
    let source = legacy.join("preferences.json");
    if target.exists() || !source.is_file() { return Ok(false); }
    let bytes = fs::read(source)?;
    serde_json::from_slice::<serde_json::Value>(&bytes)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    fs::create_dir_all(current)?;
    // create_new prevents overwriting a profile created by another instance.
    use std::io::Write;
    let mut file = fs::OpenOptions::new().write(true).create_new(true).open(target)?;
    file.write_all(&bytes)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn migration_preserves_old_data_and_never_overwrites_new_settings() {
        let base=std::env::temp_dir().join(format!("spanvision-pile-migration-{}",std::process::id()));
        let old=base.join("old");let new=base.join("new");fs::create_dir_all(&old).unwrap();
        fs::write(old.join("preferences.json"),br#"{"theme":"openaec","user-settings":{"preferences":{"theme":"light"}}}"#).unwrap();
        assert!(migrate_preferences(&new,&old).unwrap());
        assert_eq!(fs::read(old.join("preferences.json")).unwrap(),fs::read(new.join("preferences.json")).unwrap());
        fs::write(new.join("preferences.json"),b"{}").unwrap();
        assert!(!migrate_preferences(&new,&old).unwrap());
        assert_eq!(fs::read(new.join("preferences.json")).unwrap(),b"{}");
        fs::remove_dir_all(base).unwrap();
    }
}
