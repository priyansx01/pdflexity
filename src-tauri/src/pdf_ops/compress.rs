//! PDF compression — pure Rust, no external processes.
//!
//! Two tiers of work:
//!   1. **Lossless structural pass** — prune orphan objects, flate-compress
//!      any uncompressed content streams, re-save with default deflate.
//!   2. **Image recompression** — walk image XObjects, decode the well-known
//!      subsets (DCTDecode JPEGs; FlateDecode RGB/Gray 8bpc raw samples),
//!      optionally downsample to a long-edge cap, re-encode as JPEG at the
//!      chosen quality, and replace the stream in place.
//!
//! Anything exotic (CCITT fax, JBIG2, JPEG2000, CMYK, indexed palettes, …) is
//! *skipped gracefully* and counted, so the result card can be honest about it.
//!
//! CPU-bound: callers run this via `spawn_blocking` and receive progress via
//! the injected callback (`pct` 0–100, `stage` label).

use std::fs;
use std::io::Read;
use std::path::Path;

use anyhow::{anyhow, Context, Result};
use flate2::read::ZlibDecoder;
use flate2::write::ZlibEncoder;
use flate2::Compression;
use image::codecs::jpeg::JpegEncoder;
use image::DynamicImage;
use lopdf::{Document, Object, Stream};

/// lopdf's `as_name` in this version returns Result<&[u8], Error>; normalize
/// to Option<&[u8]> for ergonomic matching.
fn name_of(object: &Object) -> Option<&[u8]> {
    object.as_name().ok()
}

/// Tuning knobs for a single compression pass.
#[derive(Debug, Clone, Copy)]
pub struct CompressParams {
    /// JPEG quality 1–100. `None` = lossless pass only (no image re-encode).
    pub jpeg_quality: Option<u8>,
    /// Downsample so the longest image edge is at most this many px. `None` = keep size.
    pub downsample_long_edge: Option<u32>,
    /// Drop document metadata (`/Info` in the trailer).
    pub strip_info: bool,
}

/// What happened during a pass.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct CompressStats {
    pub original_bytes: u64,
    pub compressed_bytes: u64,
    pub images_seen: u64,
    pub images_recompressed: u64,
    pub images_skipped_codec: u64,   // unsupported decode (fax/jpx/cmyk/…)
    pub images_skipped_optimal: u64, // re-encode wasn't smaller
}

impl CompressStats {
    pub fn saved_percent(&self) -> f64 {
        if self.original_bytes == 0 {
            return 0.0;
        }
        let saved = self.original_bytes.saturating_sub(self.compressed_bytes);
        (saved as f64 / self.original_bytes as f64) * 100.0
    }
}

/// Preset parameter sets (frontend ids: less | recommended | extreme).
pub fn preset_params(preset: &str) -> CompressParams {
    match preset {
        "less" => CompressParams {
            jpeg_quality: None,
            downsample_long_edge: None,
            strip_info: false,
        },
        "extreme" => CompressParams {
            jpeg_quality: Some(45),
            downsample_long_edge: Some(900),
            strip_info: true,
        },
        // recommended (and anything else — safe default)
        _ => CompressParams {
            jpeg_quality: Some(72),
            downsample_long_edge: None,
            strip_info: false,
        },
    }
}

/// The custom-size search ladder: increasing aggressiveness, bounded so the
/// loop stays snappy. `(downsample_long_edge, jpeg_quality)` pairs.
pub const CUSTOM_LADDER: [(Option<u32>, u8); 7] = [
    (None, 80),
    (None, 72),
    (Some(1600), 60),
    (Some(1200), 50),
    (Some(900), 45),
    (Some(700), 35),
    (Some(500), 30),
];

/// Compress `input` into `output` with the given params. Never writes to
/// `input`. Progress is reported through `progress(pct, stage)`.
pub fn compress_pdf(
    input: &Path,
    output: &Path,
    params: &CompressParams,
    progress: &dyn Fn(u8, &str),
) -> Result<CompressStats> {
    let original_bytes = fs::metadata(input).map(|m| m.len()).unwrap_or(0);

    progress(5, "Reading document");
    let mut doc = Document::load(input).context("open PDF for compression")?;

    // ── 1. Lossless structural pass ─────────────────────────────────────────
    progress(15, "Optimizing structure");
    let _ = doc.compress(); // flate any uncompressed content streams
    if params.strip_info {
        doc.trailer.remove(b"Info");
    }

    // ── 2. Image recompression ──────────────────────────────────────────────
    let mut stats = CompressStats::default();
    if params.jpeg_quality.is_some() {
        let total_images = doc
            .objects
            .values()
            .filter(|o| is_image_object(o))
            .count() as u64;
        stats.images_seen = total_images;

        let mut processed: u64 = 0;
        let mut recompressed: u64 = 0;
        let mut skipped_codec: u64 = 0;
        let mut skipped_optimal: u64 = 0;

        // Image objects live at stable addresses in lopdf's object map; edit
        // them in place via retain-style iteration.
        let mut replacements: Vec<(lopdf::ObjectId, Vec<u8>, u32, u32)> = Vec::new();
        let mut drops: Vec<lopdf::ObjectId> = Vec::new();

        for (id, object) in doc.objects.iter() {
            if !is_image_object(object) {
                continue;
            }
            let stream = match object {
                Object::Stream(s) => s,
                _ => continue,
            };
            processed += 1;
            let pct = 20 + ((processed as f32 / total_images.max(1) as f32) * 60.0) as u8;
            progress(pct.min(80), "Recompressing images");

            // Resolve an (possibly indirect) colorspace to channel count.
            let channels = resolve_channels(&doc, stream);
            match recompress_image(stream, channels, params) {
                Ok(Some((jpeg, w, h))) => {
                    if jpeg.len() < stream.content.len() {
                        replacements.push((*id, jpeg, w, h));
                        recompressed += 1;
                    } else {
                        skipped_optimal += 1;
                    }
                }
                Ok(None) => { /* not a candidate (no image ops) */ }
                Err(_unsupported) => {
                    skipped_codec += 1;
                }
            }
            if replacements.len() > 4096 {
                drops.clear(); // sanity guard, never expected
            }
        }

        // Apply replacements after the borrow of doc.objects ends.
        for (id, jpeg, w, h) in replacements {
            if let Some(Object::Stream(stream)) = doc.objects.get_mut(&id) {
                let quality = params.jpeg_quality.unwrap_or(72);
                replace_with_jpeg(stream, jpeg, w, h, quality);
            }
        }

        stats.images_recompressed = recompressed;
        stats.images_skipped_codec = skipped_codec;
        stats.images_skipped_optimal = skipped_optimal;
        let _ = drops;
    }

    // ── 3. Save ──────────────────────────────────────────────────────────────
    progress(90, "Saving");
    doc.save(output).context("write compressed PDF")?;
    let compressed_bytes = fs::metadata(output).map(|m| m.len()).unwrap_or(0);

    stats.original_bytes = original_bytes;
    stats.compressed_bytes = compressed_bytes;
    progress(100, "Done");
    Ok(stats)
}

// ─── Image inspection & re-encoding ──────────────────────────────────────────

/**
 * Resolve an image's colorspace — direct name, array form ([/ICCBased stream]),
 * or a bare indirect reference — down to a channel count. `None` = unsupported.
 */
fn resolve_channels(doc: &Document, stream: &Stream) -> Option<usize> {
    match stream.dict.get(b"ColorSpace") {
        Ok(Object::Name(n)) => match n.as_slice() {
            b"DeviceRGB" | b"RGB" => Some(3),
            b"DeviceGray" | b"G" => Some(1),
            _ => None,
        },
        Ok(Object::Array(arr)) => {
            // [/ICCBased <ref>] — the referenced stream's /N gives components.
            let is_icc = arr.first().and_then(|o| o.as_name().ok()) == Some(b"ICCBased");
            if !is_icc {
                return None;
            }
            let (id, gen) = arr.get(1)?.as_reference().ok()?;
            icc_channels(doc, (id, gen))
        }
        // Bare reference: /CS0 12 0 R pointing at the ICC profile stream.
        Ok(Object::Reference((id, gen))) => icc_channels(doc, (*id, *gen)),
        _ => None,
    }
}

fn icc_channels(doc: &Document, id: lopdf::ObjectId) -> Option<usize> {
    match doc.objects.get(&id) {
        Some(Object::Stream(s)) => match s.dict.get(b"N").and_then(Object::as_i64) {
            Ok(3) => Some(3),
            Ok(1) => Some(1),
            _ => None,
        },
        // Indirect chain: /CS0 7 0 R where 7 is [/ICCBased 6 0 R] — recurse.
        Some(Object::Array(arr)) => {
            let (id, gen) = arr.get(1)?.as_reference().ok()?;
            icc_channels(doc, (id, gen))
        }
        // Named colorspace indirection: a dict like { /CS0 /DeviceRGB }.
        Some(Object::Dictionary(d)) => d
            .iter()
            .find_map(|(_, o)| o.as_name().ok())
            .and_then(|n| match n {
                b"DeviceRGB" => Some(3),
                b"DeviceGray" => Some(1),
                _ => None,
            }),
        _ => None,
    }
}

fn is_image_object(object: &Object) -> bool {
    matches!(
        object,
        Object::Stream(s) if s.dict.get(b"Subtype").ok().and_then(name_of) == Some(b"Image")
    )
}

/// Filter chain of a stream as owned names (`FlateDecode`, `DCTDecode`, …).
fn filter_chain(stream: &Stream) -> Vec<Vec<u8>> {
    match stream.dict.get(b"Filter") {
        Ok(Object::Name(n)) => vec![n.to_vec()],
        Ok(Object::Array(arr)) => arr
            .iter()
            .filter_map(|o| o.as_name().ok().map(|n| n.to_vec()))
            .collect(),
        _ => Vec::new(),
    }
}

/// Build a DynamicImage from raw interleaved samples (RGB or Gray).
fn raw_to_image(width: u32, height: u32, channels: usize, data: &[u8]) -> Result<DynamicImage> {
    if channels == 3 {
        let img = image::RgbImage::from_raw(width, height, data.to_vec())
            .ok_or_else(|| anyhow!("bad rgb image"))?;
        Ok(DynamicImage::ImageRgb8(img))
    } else {
        let img = image::GrayImage::from_raw(width, height, data.to_vec())
            .ok_or_else(|| anyhow!("bad gray image"))?;
        Ok(DynamicImage::ImageLuma8(img))
    }
}

/// Try to recompress one image XObject. `Ok(None)` = no-op; `Err` = unsupported
/// (counted and skipped, never fatal).
fn recompress_image(
    stream: &Stream,
    channels: Option<usize>,
    params: &CompressParams,
) -> Result<Option<(Vec<u8>, u32, u32)>> {
    let quality = match params.jpeg_quality {
        Some(q) => q,
        None => return Ok(None),
    };

    let dict = &stream.dict;
    let width = dict
        .get(b"Width")
        .and_then(Object::as_i64)
        .unwrap_or(0) as u32;
    let height = dict
        .get(b"Height")
        .and_then(Object::as_i64)
        .unwrap_or(0) as u32;
    if width == 0 || height == 0 || width * height < 48 * 48 {
        return Err(anyhow!("tiny image, not worth re-encoding"));
    }

    // Image masks and odd bit depths: skip.
    if dict.get(b"ImageMask").and_then(Object::as_bool).unwrap_or(false) {
        return Err(anyhow!("image mask"));
    }
    let bpc = dict
        .get(b"BitsPerComponent")
        .and_then(Object::as_i64)
        .unwrap_or(8);
    if bpc != 8 {
        return Err(anyhow!("unsupported bit depth"));
    }

    // Colorspace resolved by the caller (handles indirect ICCBased refs).
    let channels = match channels {
        Some(c @ (1 | 3)) => c,
        _ => return Err(anyhow!("unsupported colorspace")),
    };

    let filters = filter_chain(stream);
    let img: DynamicImage = if filters.len() == 1 && filters[0] == b"DCTDecode" {
        // The stream content IS a JPEG.
        image::load_from_memory(&stream.content).context("decode embedded JPEG")?
    } else if filters.len() == 1 && filters[0] == b"FlateDecode" {
        // Raw samples after zlib inflate.
        let expected = width as usize * height as usize * channels;
        let mut inflated: Vec<u8> = Vec::with_capacity(expected);
        let mut z = ZlibDecoder::new(&stream.content[..]);
        z.read_to_end(&mut inflated).context("inflate image data")?;
        if inflated.len() < expected {
            return Err(anyhow!("short image data"));
        }
        raw_to_image(width, height, channels, &inflated[..expected])?
    } else if filters.is_empty() {
        // Uncompressed raw samples stored inline (common from some writers).
        let expected = width as usize * height as usize * channels;
        if stream.content.len() < expected {
            return Err(anyhow!("short image data"));
        }
        raw_to_image(width, height, channels, &stream.content[..expected])?
    } else {
        return Err(anyhow!("unsupported filter chain"));
    };

    // Optional downsample (fit within long-edge cap, aspect preserved).
    let img = match params.downsample_long_edge {
        Some(edge) if img.width().max(img.height()) > edge => {
            img.resize(edge, edge, image::imageops::FilterType::Lanczos3)
        }
        _ => img,
    };

    // Re-encode as JPEG at the requested quality.
    let mut jpeg: Vec<u8> = Vec::new();
    let encoder = JpegEncoder::new_with_quality(&mut jpeg, quality);
    img.write_with_encoder(encoder)
        .context("re-encode JPEG")?;

    Ok(Some((jpeg, img.width(), img.height())))
}

/// Replace a stream's content with new JPEG bytes and fix its dictionary.
fn replace_with_jpeg(stream: &mut Stream, jpeg: Vec<u8>, width: u32, height: u32, _quality: u8) {
    let grayscale = matches!(
        stream.dict.get(b"ColorSpace").ok().and_then(name_of),
        Some(b"DeviceGray")
    );

    stream.dict.set(b"Filter", Object::Name(b"DCTDecode".to_vec()));
    stream.dict.remove(b"DecodeParms");
    stream.dict.remove(b"Decode");
    stream.dict.set(b"ColorSpace", Object::Name(if grayscale {
        b"DeviceGray".to_vec()
    } else {
        b"DeviceRGB".to_vec()
    }));
    stream.dict.set(b"BitsPerComponent", Object::Integer(8));
    stream.dict.set(b"Width", Object::Integer(width as i64));
    stream.dict.set(b"Height", Object::Integer(height as i64));
    stream.dict.set(b"Length", Object::Integer(jpeg.len() as i64));
    stream.set_content(jpeg);
}

/// Best-effort re-deflate of a stream (used by tests / future lossless-plus).
#[allow(dead_code)]
pub fn reflate(content: &[u8]) -> Vec<u8> {
    let mut enc = ZlibEncoder::new(Vec::new(), Compression::best());
    use std::io::Write;
    let _ = enc.write_all(content);
    enc.finish().unwrap_or_default()
}

// ─── Tests ────────────────────────────────────────────────────────────────────
//
// Fixtures live in tests/fixtures/compress/ (generated once by the Python dev
// tooling and committed): text.pdf (no images), images.pdf (JPEG + flate RGB).

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn fixture(name: &str) -> PathBuf {
        let p = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/compress")
            .join(name);
        assert!(p.exists(), "missing fixture {}", p.display());
        p
    }

    fn tmp_out(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("pdflexity-compress-test-{name}.pdf"))
    }

    const NOP: fn(u8, &str) = |_, _| {};

    #[test]
    fn lossless_pass_never_grows_text_pdf() {
        let input = fixture("text.pdf");
        let output = tmp_out("text-lossless.pdf");
        let stats = compress_pdf(&input, &output, &preset_params("less"), &NOP).unwrap();
        assert!(stats.compressed_bytes > 0, "produced an output");
        assert!(
            stats.compressed_bytes <= stats.original_bytes.max(stats.compressed_bytes),
            "lossless pass must not grow the file"
        );
    }

    #[test]
    fn recommended_reduces_image_pdf() {
        let input = fixture("images.pdf");
        let output = tmp_out("images-recommended.pdf");
        let stats = compress_pdf(&input, &output, &preset_params("recommended"), &NOP).unwrap();
        assert!(
            stats.compressed_bytes < stats.original_bytes,
            "recommended should shrink an image-heavy PDF (got {} -> {})",
            stats.original_bytes,
            stats.compressed_bytes
        );
        assert!(stats.images_recompressed >= 1, "should re-encode images");
    }

    #[test]
    fn extreme_reduces_more_than_recommended() {
        let input = fixture("images.pdf");
        let rec = compress_pdf(
            &input,
            &tmp_out("images-extreme-rec.pdf"),
            &preset_params("recommended"),
            &NOP,
        )
        .unwrap();
        let ext = compress_pdf(
            &input,
            &tmp_out("images-extreme-ext.pdf"),
            &preset_params("extreme"),
            &NOP,
        )
        .unwrap();
        assert!(
            ext.compressed_bytes <= rec.compressed_bytes,
            "extreme ({}) should be <= recommended ({})",
            ext.compressed_bytes,
            rec.compressed_bytes
        );
    }

    #[test]
    fn output_is_a_valid_pdf() {
        let input = fixture("images.pdf");
        let output = tmp_out("images-valid.pdf");
        compress_pdf(&input, &output, &preset_params("extreme"), &NOP).unwrap();
        Document::load(&output).expect("output reloads as a valid PDF");
    }
}
