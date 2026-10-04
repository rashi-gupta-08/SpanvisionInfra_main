use crate::pdf::colors::{Color, mm};
use pdf_writer::{Content, Finish, Name, Pdf, Rect, Ref, Str};
use pdf_writer::types::{CidFontType, FontFlags, SystemInfo};
use std::collections::{BTreeMap, HashMap};
use std::sync::Arc;

/// Draw operations accumulated during rendering.
#[derive(Debug, Clone)]
pub enum DrawOp {
    Text {
        text: String,
        x_pt: f64,
        y_pt: f64,
        font_name: String,
        size: f64,
        color: Color,
    },
    Line {
        x0_pt: f64,
        y0_pt: f64,
        x1_pt: f64,
        y1_pt: f64,
        width_pt: f64,
        color: Color,
    },
    Rect {
        x_pt: f64,
        y_pt: f64,
        w_pt: f64,
        h_pt: f64,
        fill: Option<Color>,
        stroke: Option<Color>,
        stroke_width_pt: f64,
    },
}

struct PageData {
    width_pt: f64,
    height_pt: f64,
    ops: Vec<DrawOp>,
}

struct RegisteredFont {
    name: String,
    data: Arc<Vec<u8>>,
}

/// PDF backend using pdf-writer for direct PDF generation.
pub struct PdfBackend {
    pages: Vec<PageData>,
    fonts: Vec<RegisteredFont>,
    font_name_to_idx: HashMap<String, usize>,
}

impl PdfBackend {
    pub fn new() -> Self {
        PdfBackend {
            pages: Vec::new(),
            fonts: Vec::new(),
            font_name_to_idx: HashMap::new(),
        }
    }

    /// Register a font for embedding.
    pub fn register_font(&mut self, name: &str, data: Arc<Vec<u8>>) {
        let idx = self.fonts.len();
        self.fonts.push(RegisteredFont {
            name: name.to_string(),
            data,
        });
        self.font_name_to_idx.insert(name.to_string(), idx);
    }

    /// Start a new page.
    pub fn new_page(&mut self, width_mm: f64, height_mm: f64) {
        self.pages.push(PageData {
            width_pt: mm(width_mm),
            height_pt: mm(height_mm),
            ops: Vec::new(),
        });
    }

    /// Add a draw operation to the current page.
    pub fn draw(&mut self, op: DrawOp) {
        if let Some(page) = self.pages.last_mut() {
            page.ops.push(op);
        }
    }

    /// Draw text at position (mm coordinates, top-left origin).
    pub fn draw_text(
        &mut self,
        text: &str,
        x_mm: f64,
        y_mm: f64,
        font_name: &str,
        size: f64,
        color: Color,
    ) {
        if let Some(page) = self.pages.last() {
            let page_height = page.height_pt;
            self.draw(DrawOp::Text {
                text: text.to_string(),
                x_pt: mm(x_mm),
                y_pt: page_height - mm(y_mm) - size, // PDF y-axis is bottom-up
                font_name: font_name.to_string(),
                size,
                color,
            });
        }
    }

    /// Draw a line (mm coordinates).
    pub fn draw_line(
        &mut self,
        x0_mm: f64,
        y0_mm: f64,
        x1_mm: f64,
        y1_mm: f64,
        width_pt: f64,
        color: Color,
    ) {
        if let Some(page) = self.pages.last() {
            let h = page.height_pt;
            self.draw(DrawOp::Line {
                x0_pt: mm(x0_mm),
                y0_pt: h - mm(y0_mm),
                x1_pt: mm(x1_mm),
                y1_pt: h - mm(y1_mm),
                width_pt,
                color,
            });
        }
    }

    /// Draw a filled/stroked rectangle (mm coordinates).
    pub fn draw_rect(
        &mut self,
        x_mm: f64,
        y_mm: f64,
        w_mm: f64,
        h_mm: f64,
        fill: Option<Color>,
        stroke: Option<Color>,
        stroke_width_pt: f64,
    ) {
        if let Some(page) = self.pages.last() {
            let page_h = page.height_pt;
            self.draw(DrawOp::Rect {
                x_pt: mm(x_mm),
                y_pt: page_h - mm(y_mm) - mm(h_mm),
                w_pt: mm(w_mm),
                h_pt: mm(h_mm),
                fill,
                stroke,
                stroke_width_pt,
            });
        }
    }

    /// Current page count.
    pub fn page_count(&self) -> usize {
        self.pages.len()
    }

    /// Serialize all pages to a PDF byte buffer.
    pub fn finish(self) -> Result<Vec<u8>, String> {
        let mut pdf = Pdf::new();
        let mut ref_alloc = Ref::new(1);

        let catalog_ref = ref_alloc;
        ref_alloc = Ref::new(ref_alloc.get() + 1);
        let page_tree_ref = ref_alloc;
        ref_alloc = Ref::new(ref_alloc.get() + 1);

        // Allocate refs for fonts
        let mut font_refs: Vec<Ref> = Vec::new();
        for _ in &self.fonts {
            font_refs.push(ref_alloc);
            ref_alloc = Ref::new(ref_alloc.get() + 1);
            // CID font, descriptor, TrueType stream and Unicode map.
            ref_alloc = Ref::new(ref_alloc.get() + 4);
        }

        // Allocate refs for pages
        let mut page_refs: Vec<Ref> = Vec::new();
        let mut content_refs: Vec<Ref> = Vec::new();
        for _ in &self.pages {
            page_refs.push(ref_alloc);
            ref_alloc = Ref::new(ref_alloc.get() + 1);
            content_refs.push(ref_alloc);
            ref_alloc = Ref::new(ref_alloc.get() + 1);
        }

        // Embed the original TrueType faces with glyph IDs and Unicode maps.
        // Raw UTF-8 is not a valid WinAnsi PDF text string.
        for (i, font) in self.fonts.iter().enumerate() {
            let font_ref = font_refs[i];
            let cid_ref = Ref::new(font_ref.get() + 1);
            let descriptor_ref = Ref::new(font_ref.get() + 2);
            let stream_ref = Ref::new(font_ref.get() + 3);
            let cmap_ref = Ref::new(font_ref.get() + 4);
            let face = ttf_parser::Face::parse(&font.data, 0)
                .map_err(|e| format!("Invalid font {}: {e}", font.name))?;
            let scale = 1000.0 / face.units_per_em() as f32;
            let bbox = face.global_bounding_box();

            // Font stream (raw TTF data)
            pdf.stream(stream_ref, &font.data);

            // Font descriptor
            let mut descriptor = pdf.font_descriptor(descriptor_ref);
            descriptor.name(Name(font.name.as_bytes()));
            descriptor.flags(FontFlags::NON_SYMBOLIC);
            descriptor.bbox(Rect::new(bbox.x_min as f32 * scale, bbox.y_min as f32 * scale,
                bbox.x_max as f32 * scale, bbox.y_max as f32 * scale));
            descriptor.ascent(face.ascender() as f32 * scale);
            descriptor.descent(face.descender() as f32 * scale);
            descriptor.stem_v(80.0);
            descriptor.font_file2(stream_ref);
            descriptor.finish();

            let mut cid = pdf.cid_font(cid_ref);
            cid.subtype(CidFontType::Type2);
            cid.base_font(Name(font.name.as_bytes()));
            cid.system_info(SystemInfo { registry: Str(b"Adobe"), ordering: Str(b"Identity"), supplement: 0 });
            cid.font_descriptor(descriptor_ref);
            cid.cid_to_gid_map_predefined(Name(b"Identity"));
            cid.widths().consecutive(0, (0..face.number_of_glyphs()).map(|gid|
                face.glyph_hor_advance(ttf_parser::GlyphId(gid)).unwrap_or(0) as f32 * scale));
            cid.finish();

            let mut used = BTreeMap::new();
            for page in &self.pages {
                for op in &page.ops {
                    if let DrawOp::Text { text, font_name, .. } = op {
                        if self.font_name_to_idx.get(font_name).copied().unwrap_or(0) == i {
                            for ch in text.chars() {
                                if let Some(gid) = face.glyph_index(ch) { used.entry(gid.0).or_insert(ch); }
                            }
                        }
                    }
                }
            }
            pdf.stream(cmap_ref, unicode_cmap(&used).as_bytes());
            let mut font_dict = pdf.type0_font(font_ref);
            font_dict.base_font(Name(font.name.as_bytes()));
            font_dict.encoding_predefined(Name(b"Identity-H"));
            font_dict.descendant_font(cid_ref);
            font_dict.to_unicode(cmap_ref);
            font_dict.finish();
        }

        // Write page tree
        let mut page_tree = pdf.pages(page_tree_ref);
        page_tree.kids(page_refs.iter().copied());
        let page_count = self.pages.len() as i32;
        page_tree.count(page_count);
        page_tree.finish();

        // Write pages + content streams
        for (i, page_data) in self.pages.iter().enumerate() {
            // Build content stream
            let mut content = Content::new();

            for op in &page_data.ops {
                match op {
                    DrawOp::Rect { x_pt, y_pt, w_pt, h_pt, fill, stroke, stroke_width_pt } => {
                        content.save_state();
                        if let Some(c) = fill {
                            content.set_fill_rgb(c.r, c.g, c.b);
                            content.rect(*x_pt as f32, *y_pt as f32, *w_pt as f32, *h_pt as f32);
                            content.fill_nonzero();
                        }
                        if let Some(c) = stroke {
                            content.set_stroke_rgb(c.r, c.g, c.b);
                            content.set_line_width(*stroke_width_pt as f32);
                            content.rect(*x_pt as f32, *y_pt as f32, *w_pt as f32, *h_pt as f32);
                            content.stroke();
                        }
                        content.restore_state();
                    }
                    DrawOp::Line { x0_pt, y0_pt, x1_pt, y1_pt, width_pt, color } => {
                        content.save_state();
                        content.set_stroke_rgb(color.r, color.g, color.b);
                        content.set_line_width(*width_pt as f32);
                        content.move_to(*x0_pt as f32, *y0_pt as f32);
                        content.line_to(*x1_pt as f32, *y1_pt as f32);
                        content.stroke();
                        content.restore_state();
                    }
                    DrawOp::Text { text, x_pt, y_pt, font_name, size, color } => {
                        let font_idx = self.font_name_to_idx.get(font_name).copied().unwrap_or(0);
                        let font_tag = format!("F{}", font_idx);
                        content.save_state();
                        content.begin_text();
                        content.set_fill_rgb(color.r, color.g, color.b);
                        content.set_font(Name(font_tag.as_bytes()), *size as f32);
                        content.next_line(*x_pt as f32, *y_pt as f32);
                        let face = self.fonts.get(font_idx)
                            .and_then(|font| ttf_parser::Face::parse(&font.data, 0).ok());
                        let encoded: Vec<u8> = text.chars().flat_map(|ch| face.as_ref()
                            .and_then(|font| font.glyph_index(ch)).map(|gid| gid.0).unwrap_or(0)
                            .to_be_bytes()).collect();
                        content.show(Str(&encoded));
                        content.end_text();
                        content.restore_state();
                    }
                }
            }

            let content_bytes = content.finish();
            pdf.stream(content_refs[i], &content_bytes);

            // Page dictionary
            let mut page = pdf.page(page_refs[i]);
            page.parent(page_tree_ref);
            page.media_box(Rect::new(
                0.0,
                0.0,
                page_data.width_pt as f32,
                page_data.height_pt as f32,
            ));
            page.contents(content_refs[i]);

            // Font resources
            let mut resources = page.resources();
            let mut font_map = resources.fonts();
            for (idx, _) in self.fonts.iter().enumerate() {
                let tag = format!("F{}", idx);
                font_map.pair(Name(tag.as_bytes()), font_refs[idx]);
            }
            font_map.finish();
            resources.finish();
            page.finish();
        }

        // Catalog
        pdf.catalog(catalog_ref).pages(page_tree_ref);

        Ok(pdf.finish())
    }
}

fn unicode_cmap(mapping: &BTreeMap<u16, char>) -> String {
    let mut result = String::from("/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Spanvision-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n");
    let entries: Vec<_> = mapping.iter().collect();
    for chunk in entries.chunks(100) {
        result.push_str(&format!("{} beginbfchar\n", chunk.len()));
        for (gid, ch) in chunk {
            let mut units = [0; 2];
            let unicode: String = ch.encode_utf16(&mut units).iter().map(|unit| format!("{unit:04X}")).collect();
            result.push_str(&format!("<{gid:04X}> <{unicode}>\n"));
        }
        result.push_str("endbfchar\n");
    }
    result.push_str("endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n");
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tenant_pdf_has_distinct_pages_and_unicode_fonts() {
        let mut backend = PdfBackend::new();
        backend.register_font("Inter", Arc::new(include_bytes!("../../tenants/spanvision_infra/fonts/Inter-Regular.ttf").to_vec()));
        for text in ["QA customer · é", "Second page"] {
            backend.new_page(210.0, 297.0);
            backend.draw_text(text, 20.0, 20.0, "Inter", 12.0, Color::from_hex("#000000"));
        }
        let doc = lopdf::Document::load_mem(&backend.finish().unwrap()).unwrap();
        let pages: Vec<_> = doc.get_pages().into_values().collect();
        assert_eq!(pages.len(), 2);
        let contents: Vec<_> = pages.iter().map(|id| doc.get_dictionary(*id).unwrap().get(b"Contents").unwrap().as_reference().unwrap()).collect();
        assert_ne!(contents[0], contents[1]);
        assert!(doc.objects.values().any(|obj| obj.as_dict().ok().and_then(|d| d.get(b"Subtype").ok()).and_then(|o| o.as_name().ok()) == Some(b"Type0")));
        assert!(doc.objects.values().filter_map(|o| o.as_stream().ok()).any(|s| String::from_utf8_lossy(&s.content).contains("<00B7>")));
    }

    #[test]
    fn unicode_map_uses_surrogate_pairs() {
        assert!(unicode_cmap(&BTreeMap::from([(42, '\u{1D538}')])).contains("<002A> <D835DD38>"));
    }
}
