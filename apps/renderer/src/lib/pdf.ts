"use client";

// Lazily load pdf.js (legacy build) with the worker configured the same way the
// existing viewers do, and expose best-effort page-count + encryption detection.
// NEVER throws — callers get nulls on failure.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLibPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPdfjs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (pdfjsLibPromise) return pdfjsLibPromise;
  pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((lib) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    lib.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.min.mjs`;
    pdfjsLib = lib;
    return lib;
  });
  return pdfjsLibPromise;
}

export async function getPdfMeta(
  buffer: ArrayBuffer,
): Promise<{ pages: number | null; encrypted: boolean }> {
  try {
    const lib = await getPdfjs();
    // Copy the buffer — pdf.js neutralizes (detaches) the data it's handed.
    const data = new Uint8Array(buffer.slice(0));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = lib.getDocument({ data, password: "" });
    const pdf = await task.promise;
    const pages = pdf.numPages;
    try {
      await pdf.destroy();
    } catch {
      /* ignore */
    }
    return { pages, encrypted: false };
  } catch (e: unknown) {
    const name = (e as { name?: string })?.name;
    if (name === "PasswordException") return { pages: null, encrypted: true };
    return { pages: null, encrypted: false };
  }
}
