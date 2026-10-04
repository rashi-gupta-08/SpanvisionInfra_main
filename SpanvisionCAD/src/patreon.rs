//! Legacy supporter interface retained for source compatibility.
//! This distribution has no configured supporter feed.

pub fn merge_manual(mut patrons: Vec<(String, i64)>) -> Vec<(String, i64)> {
    patrons.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    patrons
}

#[cfg(not(target_arch = "wasm32"))]
pub fn fetch_patrons() -> Result<Vec<(String, i64)>, String> {
    Err("Supporter feed is not configured".into())
}

#[cfg(target_arch = "wasm32")]
pub async fn fetch_patrons_web() -> Result<Vec<(String, i64)>, String> {
    Err("Supporter feed is not configured".into())
}
