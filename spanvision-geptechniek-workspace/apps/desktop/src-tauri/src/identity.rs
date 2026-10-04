use std::sync::OnceLock;
fn data() -> &'static serde_json::Value { static BRAND: OnceLock<serde_json::Value> = OnceLock::new(); BRAND.get_or_init(|| serde_json::from_str(include_str!("../../brand.json")).expect("generated branding manifest")) }
pub fn product() -> &'static str { data()["product"].as_str().expect("product") }
pub fn organization() -> &'static str { data()["organization"].as_str().expect("organization") }
pub fn mark() -> &'static str { data()["mark"].as_str().expect("mark") }
pub fn version() -> &'static str { data()["version"].as_str().expect("version") }

pub fn stamp_pdf(bytes: Vec<u8>) -> Result<Vec<u8>, String> {
    let mut doc = lopdf::Document::load_mem(&bytes).map_err(|e| e.to_string())?;
    // printpdf emits non-BMP scalar values in some full-font CMaps. PDF
    // ToUnicode destinations must contain UTF-16BE code units instead.
    let cmap_ids: Vec<_> = doc.objects.values().filter_map(|object| object.as_dict().ok())
        .filter_map(|dict| dict.get(b"ToUnicode").ok()?.as_reference().ok()).collect();
    for id in cmap_ids {
        if let Ok(lopdf::Object::Stream(stream)) = doc.get_object_mut(id) {
            let content = stream.decompressed_content().unwrap_or_else(|_| stream.content.clone());
            if let Ok(source) = std::str::from_utf8(&content) {
                let repaired = repair_unicode_cmap(source);
                if repaired != source { stream.set_plain_content(repaired.into_bytes()); }
            }
        }
    }
    let existing = doc.trailer.get(b"Info").ok().and_then(|v| v.as_reference().ok())
        .and_then(|id| doc.get_dictionary(id).ok()).cloned();
    let mut info = existing.unwrap_or_default();
    let pdf_text = |text: &str| {
        let mut encoded = vec![0xFE, 0xFF];
        for unit in text.encode_utf16() { encoded.extend_from_slice(&unit.to_be_bytes()); }
        lopdf::Object::String(encoded, lopdf::StringFormat::Hexadecimal)
    };
    info.set("Creator", pdf_text(product()));
    info.set("Producer", pdf_text(organization()));
    if let Ok(lopdf::Object::String(value, _)) = info.get(b"Title") {
        if !value.starts_with(&[0xFE, 0xFF]) {
            if let Ok(title) = std::str::from_utf8(value) {
                let title = pdf_text(title); info.set("Title", title);
            }
        }
    }
    let info_id = doc.add_object(info); doc.trailer.set("Info", info_id);
    let mut result = Vec::new(); doc.save_to(&mut result).map_err(|e| e.to_string())?;
    Ok(result)
}

fn repair_unicode_cmap(source: &str) -> String {
    let mut in_char_map = false;
    source.split_inclusive('\n').map(|line| {
        if line.contains("beginbfchar") { in_char_map = true; }
        if line.contains("endbfchar") { in_char_map = false; }
        if in_char_map {
            let fields: Vec<_> = line.split_whitespace().collect();
            if fields.len() == 2 {
                let destination = fields[1].trim_start_matches('<').trim_end_matches('>');
                if (5..=6).contains(&destination.len()) {
                    if let Some(ch) = u32::from_str_radix(destination, 16).ok().and_then(char::from_u32) {
                        let mut units = [0; 2];
                        let utf16: String = ch.encode_utf16(&mut units).iter().map(|unit| format!("{unit:04X}")).collect();
                        return line.replace(fields[1], &format!("<{utf16}>"));
                    }
                }
            }
        }
        line.to_string()
    }).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn supplementary_unicode_cmap_is_valid_utf16() {
        let source = "2 beginbfchar\n<02a0> <1d538>\n<0010> <00b7>\nendbfchar\n";
        assert_eq!(repair_unicode_cmap(source), "2 beginbfchar\n<02a0> <D835DD38>\n<0010> <00b7>\nendbfchar\n");
        assert_eq!(repair_unicode_cmap("<02a0> <1d538>\n"), "<02a0> <1d538>\n");
    }
}
