//! Import only local user data. Never import account state or overwrite new data.
use std::{fs, io, path::Path};

pub fn import_legacy(destination: &Path) -> io::Result<()> {
    let Some(parent) = destination.parent() else { return Ok(()) };
    migrate(&parent.join("open-speech-studio"), destination)
}

fn copy_missing(source: &Path, target: &Path) -> io::Result<()> {
    if !source.is_file() || target.exists() { return Ok(()) }
    if let Some(parent) = target.parent() { fs::create_dir_all(parent)?; }
    // create_new prevents overwriting a file created by another launch.
    let mut output = match fs::OpenOptions::new().write(true).create_new(true).open(target) {
        Ok(output) => output,
        Err(error) if error.kind() == io::ErrorKind::AlreadyExists => return Ok(()),
        Err(error) => return Err(error),
    };
    let mut input = fs::File::open(source)?;
    io::copy(&mut input, &mut output)?;
    output.sync_all()
}

fn copy_directory(source: &Path, target: &Path) -> io::Result<()> {
    if !source.is_dir() { return Ok(()) }
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        // Ignore links, preventing unexpected paths outside the old profile.
        let kind = entry.file_type()?;
        if kind.is_dir() { copy_directory(&entry.path(), &target.join(entry.file_name()))?; }
        else if kind.is_file() { copy_missing(&entry.path(), &target.join(entry.file_name()))?; }
    }
    Ok(())
}

fn migrate(source: &Path, destination: &Path) -> io::Result<()> {
    let marker = destination.join("local-data-import-v1.json");
    if marker.exists() || !source.is_dir() { return Ok(()) }
    for name in ["settings.json", "dictionary.json"] {
        copy_missing(&source.join(name), &destination.join(name))?;
    }
    for name in ["speaker_profiles", "profiles", "piper"] {
        copy_directory(&source.join(name), &destination.join(name))?;
    }
    // Models remain discoverable in their old directory without duplicating GBs.
    fs::write(marker, "{\"version\":1,\"accountDataImported\":false}\n")
}

pub fn legacy_models() -> Option<std::path::PathBuf> {
    dirs::config_dir().map(|directory| directory.join("open-speech-studio").join("models"))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preserves_new_data_and_excludes_credentials() {
        let base=std::env::temp_dir().join(format!("sw-migration-{}",uuid::Uuid::new_v4()));
        let old=base.join("old");let new=base.join("new");
        fs::create_dir_all(old.join("speaker_profiles")).unwrap();fs::create_dir_all(&new).unwrap();
        fs::write(old.join("settings.json"),"old preferences").unwrap();
        fs::write(new.join("settings.json"),"new preferences").unwrap();
        fs::write(old.join("dictionary.json"),"custom words").unwrap();
        fs::write(old.join("auth.json"),"secret").unwrap();
        fs::write(old.join("app-config.json"),"cloud").unwrap();
        fs::write(old.join("speaker_profiles/alex.json"),"profile").unwrap();
        migrate(&old,&new).unwrap();
        assert_eq!(fs::read_to_string(new.join("settings.json")).unwrap(),"new preferences");
        assert!(new.join("dictionary.json").exists());assert!(new.join("speaker_profiles/alex.json").exists());
        assert!(!new.join("auth.json").exists());assert!(!new.join("app-config.json").exists());
        fs::write(old.join("dictionary.json"),"changed upstream").unwrap();migrate(&old,&new).unwrap();
        assert_eq!(fs::read_to_string(new.join("dictionary.json")).unwrap(),"custom words");
        fs::remove_dir_all(base).unwrap();
    }
}
