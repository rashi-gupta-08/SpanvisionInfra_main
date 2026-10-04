use std::io::{Cursor, Write};
fn main() -> Result<(),Box<dyn std::error::Error>> {
    let las=include_bytes!("../../tests/fixtures/rgb-classified.las");
    let items=laz::LazItemRecordBuilder::new().add_item(laz::LazItemType::Point10).add_item(laz::LazItemType::RGB12).build();
    let vlr=laz::LazVlrBuilder::new(items).build();
    let mut vlr_bytes=Vec::new();vlr.write_to(&mut vlr_bytes)?;
    let offset=227+54+vlr_bytes.len();
    let mut header=las[..227].to_vec();header[104]=2|0x80;
    header[96..100].copy_from_slice(&(offset as u32).to_le_bytes());header[100..104].copy_from_slice(&1u32.to_le_bytes());
    let mut vlr_header=[0u8;54];vlr_header[2..16].copy_from_slice(b"laszip encoded");vlr_header[18..20].copy_from_slice(&22204u16.to_le_bytes());vlr_header[20..22].copy_from_slice(&(vlr_bytes.len() as u16).to_le_bytes());
    let mut output=Cursor::new(Vec::new());output.write_all(&header)?;output.write_all(&vlr_header)?;output.write_all(&vlr_bytes)?;
    {let mut compressor=laz::LasZipCompressor::new(&mut output,vlr)?;compressor.compress_many(&las[227..])?;compressor.done()?;}
    let path=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/rgb-classified.laz");std::fs::write(path,output.into_inner())?;
    println!("Generated compressed RGB/classification regression fixture.");Ok(())
}
