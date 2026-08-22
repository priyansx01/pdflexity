//! Pure-Rust page rotation — sets the `/Rotate` entry of page dictionaries.
//!
//! Lossless by construction: no streams are touched, only one integer key per
//! target page. Inherited `/Rotate` values from parent `/Pages` nodes are
//! resolved first so the delta is applied to what a viewer actually shows.

use std::collections::BTreeSet;
use std::path::Path;

use anyhow::{bail, Context, Result};
use lopdf::{Document, Object};

/// Apply `delta` degrees (a multiple of 90) to the pages named by an
/// extract-style range spec ("1-3, 5"; empty = every page). Returns the
/// 1-based page numbers that were rotated.
pub fn rotate_pages(
    input: &Path,
    output: &Path,
    delta: i64,
    spec: Option<&str>,
) -> Result<Vec<u32>> {
    if delta == 0 {
        bail!("Choose a rotation angle first");
    }
    if delta.rem_euclid(90) != 0 {
        bail!("Rotation must be a multiple of 90 degrees");
    }
    let mut doc = Document::load(input).context("open PDF for rotation")?;
    let pages = doc.get_pages();
    let total = pages.len() as u32;
    if total == 0 {
        bail!("This document has no pages to rotate");
    }

    let targets: BTreeSet<u32> = match spec.map(str::trim).filter(|s| !s.is_empty()) {
        Some(s) => parse_ranges(s, total)?,
        None => (1..=total).collect(),
    };

    let mut rotated = Vec::with_capacity(targets.len());
    for &num in &targets {
        let id = pages[&num];
        let current = inherited_rotate(&doc, id);
        let next = (current + delta).rem_euclid(360);
        match doc.get_object_mut(id)? {
            Object::Dictionary(dict) => dict.set("Rotate", Object::Integer(next as i64)),
            Object::Stream(_) => bail!("page {num} has an unexpected stream object"),
            _ => bail!("page {num} is not a page dictionary"),
        }
        rotated.push(num);
    }

    doc.save(output).context("save rotated PDF")?;
    Ok(rotated)
}

/// Walk up the page-tree from `id` looking for the effective inherited
/// `/Rotate` value (bounded depth guards against malformed cyclic trees).
fn inherited_rotate(doc: &Document, mut id: lopdf::ObjectId) -> i64 {
    for _ in 0..32 {
        let obj = match doc.get_object(id) {
            Ok(o) => o,
            Err(_) => return 0,
        };
        let dict = match obj {
            Object::Dictionary(d) => d,
            _ => return 0,
        };
        if let Ok(value) = dict.get(b"Rotate") {
            // A present but unparseable value is treated as 0.
            return value.as_i64().unwrap_or(0);
        }
        match dict.get(b"Parent").ok().and_then(|p| p.as_reference().ok()) {
            Some(parent) => id = parent,
            None => return 0,
        }
    }
    0
}

/// Parse "1-3, 5" into a set of 1-based page numbers, validated against the
/// document's page count. Same syntax as the Extract tool.
pub fn parse_ranges(spec: &str, total: u32) -> Result<BTreeSet<u32>> {
    let mut out = BTreeSet::new();
    for part in spec.split(',') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        if let Some((a, b)) = part.split_once('-') {
            let start: u32 = a.trim().parse().with_context(|| format!("bad range {part:?}"))?;
            let end: u32 = b.trim().parse().with_context(|| format!("bad range {part:?}"))?;
            if start == 0 || end < start || end > total {
                bail!("Pages {start}-{end} are out of range (document has {total} pages)");
            }
            out.extend(start..=end);
        } else {
            let n: u32 = part.parse().with_context(|| format!("bad page number {part:?}"))?;
            if n == 0 || n > total {
                bail!("Page {n} is out of range (document has {total} pages)");
            }
            out.insert(n);
        }
    }
    if out.is_empty() {
        bail!("No valid pages in \"{spec}\"");
    }
    Ok(out)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

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
        std::env::temp_dir().join(format!("pdflexity-rotate-test-{name}.pdf"))
    }

    fn page_rotate(doc: &Document, num: u32) -> i64 {
        let id = doc.get_pages()[&num];
        match doc.get_object(id).unwrap() {
            Object::Dictionary(d) => d
                .get(b"Rotate")
                .ok()
                .and_then(|v| v.as_i64().ok())
                .unwrap_or(0),
            _ => panic!("not a dict"),
        }
    }

    #[test]
    fn rotates_all_pages_cumulatively() {
        let input = fixture("text.pdf");
        let output = tmp_out("all-90.pdf");
        let total = Document::load(&input).unwrap().get_pages().len() as u32;

        let rotated = rotate_pages(&input, &output, 90, None).unwrap();
        assert_eq!(rotated.len() as u32, total);

        let doc = Document::load(&output).unwrap();
        for num in 1..=total {
            assert_eq!(page_rotate(&doc, num), 90);
        }

        // Second run stacks on top of the first.
        rotate_pages(&output, &output, 270, None).unwrap();
        let doc = Document::load(&output).unwrap();
        for num in 1..=total {
            assert_eq!(page_rotate(&doc, num), 0); // (90 + 270) mod 360
        }
    }

    #[test]
    fn rotates_only_selected_pages() {
        let input = fixture("text.pdf");
        let output = tmp_out("subset.pdf");
        let total = Document::load(&input).unwrap().get_pages().len() as u32;
        assert!(total >= 2, "fixture needs at least 2 pages");

        rotate_pages(&input, &output, 180, Some("1")).unwrap();
        let doc = Document::load(&output).unwrap();
        assert_eq!(page_rotate(&doc, 1), 180);
        assert_eq!(page_rotate(&doc, 2), 0);
    }

    #[test]
    fn output_is_a_valid_pdf() {
        let input = fixture("images.pdf");
        let output = tmp_out("images-valid.pdf");
        rotate_pages(&input, &output, 270, None).unwrap();
        let doc = Document::load(&output).expect("output reloads as a valid PDF");
        assert!(!doc.get_pages().is_empty());
    }

    #[test]
    fn rejects_non_90_multiples_and_zero() {
        let input = fixture("text.pdf");
        let output = tmp_out("reject.pdf");
        assert!(rotate_pages(&input, &output, 45, None).is_err());
        assert!(rotate_pages(&input, &output, 0, None).is_err());
    }

    #[test]
    fn range_parser_matches_extract_syntax() {
        let parsed = parse_ranges("1-3, 5", 10).unwrap();
        assert_eq!(parsed, BTreeSet::from([1, 2, 3, 5]));

        assert!(parse_ranges("0", 10).is_err());
        assert!(parse_ranges("11", 10).is_err());
        assert!(parse_ranges("3-1", 10).is_err());
        assert!(parse_ranges("abc", 10).is_err());
        assert!(parse_ranges(", ,", 10).is_err());
    }
}
