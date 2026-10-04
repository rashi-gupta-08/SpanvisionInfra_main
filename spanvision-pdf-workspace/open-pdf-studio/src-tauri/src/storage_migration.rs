//! Copies legacy assets without changing or replacing either installation's data.
use std::{fs, io, path::Path};

fn copy_tree(source: &Path, destination: &Path) -> io::Result<()> {
    fs::create_dir_all(destination)?;
    for item in fs::read_dir(source)? {
        let item = item?;
        let kind = item.file_type()?;
        let target = destination.join(item.file_name());
        if kind.is_symlink() { continue; }
        if kind.is_dir() { copy_tree(&item.path(), &target)?; }
        else if kind.is_file() { fs::copy(item.path(), target)?; }
    }
    Ok(())
}

pub fn copy_if_empty(source: &Path, destination: &Path) -> io::Result<bool> {
    if !source.is_dir() || source == destination { return Ok(false); }
    if destination.exists() && (!destination.is_dir() || fs::read_dir(destination)?.next().is_some()) { return Ok(false); }
    let parent = destination.parent().ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput,"missing parent"))?;
    fs::create_dir_all(parent)?;
    let stage = parent.join(format!(".spanvision-migration-{}-{}", std::process::id(), destination.file_name().unwrap().to_string_lossy()));
    if stage.exists() { return Err(io::Error::new(io::ErrorKind::AlreadyExists,"migration staging directory already exists")); }
    copy_tree(source, &stage)?;
    if destination.exists() { fs::remove_dir(destination)?; } // only succeeds while still empty
    fs::rename(stage, destination)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize,Ordering};
    static SEQUENCE: AtomicUsize=AtomicUsize::new(0);
    #[test]
    fn copies_nested_assets_preserves_source_and_never_overwrites_newer_settings() {
        let root=std::env::temp_dir().join(format!("sv-storage-{}-{}",std::process::id(),SEQUENCE.fetch_add(1,Ordering::Relaxed)));
        let old=root.join("old"); let new=root.join("new");
        fs::create_dir_all(old.join("catalogs")).unwrap();
        fs::write(old.join("preferences.json"),"saved-theme").unwrap();
        fs::write(old.join("catalogs/custom.json"),"asset").unwrap();
        assert!(copy_if_empty(&old,&new).unwrap());
        assert_eq!(fs::read_to_string(new.join("catalogs/custom.json")).unwrap(),"asset");
        assert_eq!(fs::read_to_string(old.join("preferences.json")).unwrap(),"saved-theme");
        fs::write(new.join("preferences.json"),"newer-theme").unwrap();
        assert!(!copy_if_empty(&old,&new).unwrap());
        assert_eq!(fs::read_to_string(new.join("preferences.json")).unwrap(),"newer-theme");
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn accepts_an_empty_destination_and_ignores_missing_source() {
        let root=std::env::temp_dir().join(format!("sv-storage-{}-{}",std::process::id(),SEQUENCE.fetch_add(1,Ordering::Relaxed)));
        let old=root.join("old"); let new=root.join("new");
        assert!(!copy_if_empty(&old,&new).unwrap());
        fs::create_dir_all(&old).unwrap(); fs::create_dir_all(&new).unwrap();
        fs::write(old.join("session.json"),"session").unwrap();
        assert!(copy_if_empty(&old,&new).unwrap());
        fs::remove_dir_all(root).unwrap();
    }
}
