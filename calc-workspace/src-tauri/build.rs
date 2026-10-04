fn main() {
    let path = std::path::Path::new("../brand.json");
    println!("cargo:rerun-if-changed={}", path.display());
    let manifest: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(path).expect("brand manifest")).expect("valid brand JSON");
    for (key, variable) in [("product", "CALC_PRODUCT"), ("organization", "CALC_ORGANIZATION"), ("initials", "CALC_INITIALS"), ("legacyAppIdentifier", "CALC_LEGACY_APP_ID")] {
        println!("cargo:rustc-env={variable}={}", manifest[key].as_str().expect("brand field"));
    }
    tauri_build::build()
}
