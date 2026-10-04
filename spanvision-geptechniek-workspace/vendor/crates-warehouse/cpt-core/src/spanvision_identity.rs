use std::sync::OnceLock;
fn data() -> &'static serde_json::Value { static BRAND: OnceLock<serde_json::Value> = OnceLock::new(); BRAND.get_or_init(|| serde_json::from_str(include_str!("../../brand.json")).expect("generated branding manifest")) }
pub fn product() -> &'static str { data()["product"].as_str().expect("product") }
pub fn organization() -> &'static str { data()["organization"].as_str().expect("organization") }
pub fn mark() -> &'static str { data()["mark"].as_str().expect("mark") }
pub fn version() -> &'static str { data()["version"].as_str().expect("version") }
