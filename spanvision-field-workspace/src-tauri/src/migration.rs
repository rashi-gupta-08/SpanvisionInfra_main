//! Copy a quiescent legacy WebView profile before constructing the new webview.
use std::{fs, io, path::{Path, PathBuf}, time::{SystemTime, UNIX_EPOCH}};

pub const LEGACY_IDENTIFIER: &str = "com.openaec.openfieldstudio";
pub const IDENTIFIER: &str = "com.spanvisioninfra.fieldworkspace";

#[derive(Debug, PartialEq)]
pub enum Outcome { Fresh, Existing, Imported }

fn snapshot(source: &Path, relative: &Path, out: &mut Vec<(PathBuf, u64, SystemTime)>) -> io::Result<()> {
    let mut entries = fs::read_dir(source.join(relative))?.collect::<Result<Vec<_>, _>>()?;
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        let kind = entry.file_type()?;
        if kind.is_symlink() { return Err(io::Error::new(io::ErrorKind::InvalidData, "Profile contains a symbolic link; import a project JSON instead.")); }
        let name = entry.file_name();
        let name_text = name.to_string_lossy();
        let child = relative.join(&name);
        if kind.is_dir() {
            if ["Cache", "Code Cache", "GPUCache", "Crashpad", "ShaderCache", "GrShaderCache", "GraphiteDawnCache", "DawnCache"].contains(&name_text.as_ref()) { continue; }
            snapshot(source, &child, out)?;
        } else if kind.is_file() {
            let metadata = entry.metadata()?;
            out.push((child, metadata.len(), metadata.modified()?));
        }
    }
    Ok(())
}

fn copy_exclusive(source: &Path, target: &Path) -> io::Result<()> {
    let mut options = fs::OpenOptions::new();
    options.read(true);
    // WebView databases in use must fail migration, rather than yield an inconsistent copy.
    #[cfg(windows)] {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(0);
    }
    let mut input = options.open(source)?;
    fs::create_dir_all(target.parent().ok_or_else(|| io::Error::other("Invalid profile path"))?)?;
    let mut output = fs::OpenOptions::new().write(true).create_new(true).open(target)?;
    io::copy(&mut input, &mut output)?;
    output.sync_all()
}

pub fn migrate(source: &Path, destination: &Path) -> io::Result<Outcome> {
    if destination.is_dir() && fs::read_dir(destination)?.next().is_some() { return Ok(Outcome::Existing); }
    if !source.is_dir() { return Ok(Outcome::Fresh); }
    let parent = destination.parent().ok_or_else(|| io::Error::other("Invalid destination profile"))?;
    fs::create_dir_all(parent)?;
    let nonce = SystemTime::now().duration_since(UNIX_EPOCH).map_err(io::Error::other)?.as_nanos();
    let stage = parent.join(format!(".field-profile-import-{}-{nonce}", std::process::id()));
    fs::create_dir(&stage)?;
    let result = (|| {
        let mut before = Vec::new();
        snapshot(source, Path::new(""), &mut before)?;
        for (relative, length, _) in &before {
            copy_exclusive(&source.join(relative), &stage.join(relative))?;
            if fs::metadata(stage.join(relative))?.len() != *length { return Err(io::Error::other("Profile changed while importing. Close the previous app and retry.")); }
        }
        let mut after = Vec::new();
        snapshot(source, Path::new(""), &mut after)?;
        if before != after { return Err(io::Error::other("Profile changed while importing. Close the previous app and retry.")); }
        fs::write(stage.join("SPANVISION-MIGRATION.json"), format!("{{\"version\":1,\"source\":\"{LEGACY_IDENTIFIER}\",\"files\":{}}}\n", before.len()))?;
        // Re-check immediately before commit; never merge database files into an existing profile.
        if destination.exists() {
            if fs::read_dir(destination)?.next().is_some() { return Ok(Outcome::Existing); }
            fs::remove_dir(destination)?;
        }
        fs::rename(&stage, destination)?;
        Ok(Outcome::Imported)
    })();
    // This directory was created by this operation inside the validated destination parent.
    if stage.is_dir() { let _ = fs::remove_dir_all(&stage); }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Fixture(PathBuf);
    impl Fixture { fn new() -> Self { let dir=std::env::temp_dir().join(format!("fw-migration-{}-{}",std::process::id(),SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));fs::create_dir(&dir).unwrap();Self(dir) } }
    impl Drop for Fixture { fn drop(&mut self) { let _=fs::remove_dir_all(&self.0); } }
    #[test]
    fn copies_preferences_and_media_without_changing_source() {
        let fixture=Fixture::new();let old=fixture.0.join("old");let new=fixture.0.join("new");
        fs::create_dir_all(old.join("EBWebView/Default/IndexedDB")).unwrap();
        fs::create_dir_all(old.join("EBWebView/Default/Local Storage")).unwrap();
        fs::write(old.join("EBWebView/Default/IndexedDB/photos.bin"),[0u8,128,255]).unwrap();
        fs::write(old.join("EBWebView/Default/Local Storage/settings"),"ofs_theme=light;ofs_lang=fr;ofs_canvas_background=#424242").unwrap();
        assert_eq!(migrate(&old,&new).unwrap(),Outcome::Imported);
        for relative in ["EBWebView/Default/IndexedDB/photos.bin","EBWebView/Default/Local Storage/settings"] { assert_eq!(fs::read(old.join(relative)).unwrap(),fs::read(new.join(relative)).unwrap()); }
        assert!(new.join("SPANVISION-MIGRATION.json").exists());
        assert_eq!(migrate(&old,&new).unwrap(),Outcome::Existing);
    }
    #[test]
    fn preserves_existing_destination_and_works_on_fresh_profiles() {
        let fixture=Fixture::new();let old=fixture.0.join("old");let new=fixture.0.join("new");
        assert_eq!(migrate(&old,&new).unwrap(),Outcome::Fresh);assert!(!new.exists());
        fs::create_dir(&old).unwrap();fs::create_dir(&new).unwrap();
        fs::write(old.join("data"),"old").unwrap();fs::write(new.join("data"),"new").unwrap();
        assert_eq!(migrate(&old,&new).unwrap(),Outcome::Existing);assert_eq!(fs::read_to_string(new.join("data")).unwrap(),"new");
    }
    #[cfg(windows)]
    #[test]
    fn locked_profile_rolls_back_and_can_be_retried() {
        use std::os::windows::fs::OpenOptionsExt;
        let fixture=Fixture::new();let old=fixture.0.join("old");let new=fixture.0.join("new");fs::create_dir(&old).unwrap();
        fs::write(old.join("a-settings"),"saved").unwrap();fs::write(old.join("z-database"),"media").unwrap();
        let locked=fs::OpenOptions::new().read(true).share_mode(0).open(old.join("z-database")).unwrap();
        assert!(migrate(&old,&new).is_err());assert!(!new.exists());
        assert_eq!(fs::read_dir(&fixture.0).unwrap().count(),1);
        drop(locked);assert_eq!(migrate(&old,&new).unwrap(),Outcome::Imported);
        assert_eq!(fs::read_to_string(new.join("a-settings")).unwrap(),"saved");
    }
}
