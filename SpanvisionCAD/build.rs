// Build metadata and Windows executable resources.

#[cfg(windows)]
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=brand.json");
    let brand: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string("brand.json").expect("brand.json"),
    )
    .expect("valid brand.json");
    for (field, env_name) in [
        ("organization", "SPANVISION_ORGANIZATION"),
        ("product", "SPANVISION_PRODUCT"),
        ("display_name", "SPANVISION_DISPLAY_NAME"),
        ("executable", "SPANVISION_EXECUTABLE"),
        ("app_id", "SPANVISION_APP_ID"),
        ("website_url", "SPANVISION_WEBSITE_URL"),
        ("repository_url", "SPANVISION_REPOSITORY_URL"),
        ("feedback_url", "SPANVISION_FEEDBACK_URL"),
        ("donation_url", "SPANVISION_DONATION_URL"),
        ("release_url", "SPANVISION_RELEASE_URL"),
        ("release_api_url", "SPANVISION_RELEASE_API_URL"),
        ("community_url", "SPANVISION_COMMUNITY_URL"),
        ("community_feed_url", "SPANVISION_COMMUNITY_FEED_URL"),
        ("tutorial_playlist_url", "SPANVISION_TUTORIAL_PLAYLIST_URL"),
        ("plugin_registry_url", "SPANVISION_PLUGIN_REGISTRY_URL"),
        ("font_repository_url", "SPANVISION_FONT_REPOSITORY_URL"),
    ] {
        let value = brand[field].as_str().unwrap_or("");
        println!("cargo:rustc-env={env_name}={value}");
    }
    let version = std::env::var("CARGO_PKG_VERSION").expect("Cargo package version");
    let parts: Vec<&str> = version.split('.').collect();
    let app_version = if parts.len() == 3 && parts[0].len() == 4
        && parts[0].starts_with("20") && parts[2] == "0"
    {
        format!("{}.{:02}", parts[0], parts[1].parse::<u32>().expect("week number"))
    } else {
        version.clone()
    };
    println!("cargo:rustc-env=OCS_APP_VERSION={app_version}");
    // Rerun on commit and branch switch only. Watching `.git/index` as well
    // would keep the dirty flag fresh, but Cargo recompiles the crate every
    // time this script reruns, and `git status` rewrites the index.
    println!("cargo:rerun-if-changed=.git/HEAD");
    if let Ok(head) = std::fs::read_to_string(".git/HEAD") {
        if let Some(reference) = head.trim().strip_prefix("ref: ") {
            println!("cargo:rerun-if-changed=.git/{reference}");
        }
    }
    let revision = git_output(&["rev-parse", "--short=12", "HEAD"])
        .unwrap_or_else(|| "unknown".to_string());
    // diff-index exits 1 for differences and 128 when there is no repository,
    // so only a real difference marks the build dirty.
    let dirty = std::process::Command::new("git")
        .args(["diff-index", "--quiet", "HEAD", "--"])
        .status()
        .ok()
        .is_some_and(|status| status.code() == Some(1));
    let commit = revision.clone();
    let revision = if dirty {
        format!("{revision}-dirty")
    } else {
        revision
    };
    println!("cargo:rustc-env=OCS_GIT_REV={revision}");

    // Builds from the main branch report how far past the release tag they
    // are. Release tags are `v` + the display version (scripts/release.py),
    // so counting first-parent commits from that tag ties the distance to
    // the version the app already claims. Shallow clones and source
    // tarballs have no tag to count from and fall back to the hash alone.
    let tag_distance = git_output(&[
        "rev-list",
        "--count",
        "--first-parent",
        &format!("v{app_version}..HEAD"),
    ])
    .and_then(|value| value.parse::<u64>().ok());
    println!(
        "cargo:rustc-env=OCS_TAG_DISTANCE={}",
        tag_distance.map_or_else(|| "unknown".to_string(), |n| n.to_string())
    );
    let commit_date = git_output(&["log", "-1", "--format=%cs", "HEAD"])
        .unwrap_or_else(|| "unknown".to_string());
    println!("cargo:rustc-env=OCS_COMMIT_DATE={commit_date}");

    // Semver-style build metadata: empty for a clean build on the release
    // tag, `+N.g<hash>` for N first-parent commits past it, `+g<hash>` when
    // the distance is unknown, and `.dirty` appended for uncommitted changes.
    let short_hash = (commit != "unknown").then(|| commit[..commit.len().min(8)].to_string());
    let mut metadata_parts: Vec<String> = Vec::new();
    match (tag_distance, &short_hash) {
        (Some(0), _) => {}
        (Some(n), Some(hash)) => {
            metadata_parts.push(n.to_string());
            metadata_parts.push(format!("g{hash}"));
        }
        (Some(n), None) => metadata_parts.push(n.to_string()),
        (None, Some(hash)) => metadata_parts.push(format!("g{hash}")),
        (None, None) => {}
    }
    if dirty {
        metadata_parts.push("dirty".to_string());
    }
    let build_metadata = if metadata_parts.is_empty() {
        String::new()
    } else {
        format!("+{}", metadata_parts.join("."))
    };
    println!("cargo:rustc-env=OCS_BUILD_METADATA={build_metadata}");
    let full_version = format!("{app_version}{build_metadata}");
    println!("cargo:rustc-env=OCS_FULL_VERSION={full_version}");
    let profile = std::env::var("PROFILE").unwrap_or_else(|_| "unknown".to_string());
    println!("cargo:rustc-env=OCS_BUILD_PROFILE={profile}");
    if std::env::var("TARGET").ok().as_deref() == Some("x86_64-pc-windows-msvc")
        && profile == "debug"
    {
        println!("cargo:rustc-link-arg-bin=SpanvisionCAD=/STACK:16777216");
    }
    let mut features: Vec<String> = std::env::vars()
        .filter_map(|(name, value)| {
            (value == "1")
                .then(|| name.strip_prefix("CARGO_FEATURE_").map(str::to_owned))
                .flatten()
        })
        .collect();
    features.sort();
    println!(
        "cargo:rustc-env=OCS_BUILD_FEATURES={}",
        if features.is_empty() {
            "none".to_string()
        } else {
            features.join(",")
        }
    );


    // Release builds generate the icon before compiling.
    #[cfg(windows)]
    {
        println!("cargo:rerun-if-changed=packaging/windows/AppIcon.ico");
        if Path::new("packaging/windows/AppIcon.ico").exists() {
            let mut res = winresource::WindowsResource::new();
            res.set_icon("packaging/windows/AppIcon.ico");
            res.set("ProductVersion", &full_version);
            res.set("FileVersion", &app_version);
            if let Err(e) = res.compile() {
                println!("cargo:warning=failed to embed Windows icon: {e}");
            }
        }
    }
}

/// Runs `git` with `args` and returns trimmed stdout, or `None` when git is
/// missing, fails (no repository, unknown tag), or prints nothing.
fn git_output(args: &[&str]) -> Option<String> {
    std::process::Command::new("git")
        .args(args)
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}
