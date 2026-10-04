//! Build-time distribution identity from the shared brand manifest.
pub const PRODUCT: &str = env!("CALC_PRODUCT");
pub const ORGANIZATION: &str = env!("CALC_ORGANIZATION");
pub const INITIALS: &str = env!("CALC_INITIALS");
pub const LEGACY_APP_ID: &str = env!("CALC_LEGACY_APP_ID");

/// Copy settings only on the first launch of the new profile. Never overwrite
/// either profile, or copy account credentials and WebView caches.
pub fn migrate_settings(profile: &std::path::Path) -> std::io::Result<bool> {
    let target = profile.join("settings.json");
    if target.exists() { return Ok(false); }
    let Some(parent) = profile.parent() else { return Ok(false); };
    let source = parent.join(LEGACY_APP_ID).join("settings.json");
    if !source.is_file() { return Ok(false); }
    std::fs::create_dir_all(profile)?;
    let mut input = std::fs::File::open(source)?;
    let mut output = match std::fs::OpenOptions::new().write(true).create_new(true).open(target) {
        Ok(file) => file,
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => return Ok(false),
        Err(error) => return Err(error),
    };
    std::io::copy(&mut input, &mut output)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn migration_preserves_existing_profiles() {
        let root = std::env::temp_dir().join(format!("calc-migration-{}", std::process::id()));
        let old = root.join(LEGACY_APP_ID);
        let new = root.join("new-profile");
        std::fs::create_dir_all(&old).unwrap();
        std::fs::write(old.join("settings.json"), r#"{"theme":"dark"}"#).unwrap();
        assert!(migrate_settings(&new).unwrap());
        assert_eq!(std::fs::read(new.join("settings.json")).unwrap(), std::fs::read(old.join("settings.json")).unwrap());
        std::fs::write(new.join("settings.json"), r#"{"theme":"light"}"#).unwrap();
        assert!(!migrate_settings(&new).unwrap());
        assert!(old.join("settings.json").exists());
        std::fs::remove_dir_all(root).unwrap();
    }
}
