"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { getPdfjs, type PdfDocument, type PdfRenderTask } from "@/lib/pdf";
import { useEditStore, type EditableBlock } from "@/stores/use-edit-store";
import { BlockFormatToolbar } from "./block-format-toolbar";
import { cn } from "@/lib/utils";

/**
 * The editor surface: renders the current page with pdf.js and overlays
 * absolutely-positioned, contentEditable text boxes aligned to the extracted
 * fitz blocks (points → px via the render scale). Editing a box records the
 * change in the edit store; Save (in the page toolbar) bakes it via fitz.
 */
export function EditorCanvas() {
  const pdfBytes = useEditStore((s) => s.pdfBytes);
  const pages = useEditStore((s) => s.pages);
  const currentPage = useEditStore((s) => s.currentPage);
  const zoom = useEditStore((s) => s.zoom);
  const updateBlock = useEditStore((s) => s.updateBlock);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const docRef = React.useRef<PdfDocument | null>(null);
  const [rendering, setRendering] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const page = pages.find((p) => p.page === currentPage);
  const scale = zoom / 100;

  // Load the pdf.js document once per pdfBytes; destroy on change/unmount.
  React.useEffect(() => {
    if (!pdfBytes) return;
    let active = true;
    let loaded: PdfDocument | null = null;
    (async () => {
      try {
        const lib = await getPdfjs();
        const data = new Uint8Array(pdfBytes.slice(0));
        const doc = await lib.getDocument({ data }).promise;
        loaded = doc;
        if (!active) return;
        docRef.current = doc;
      } catch (e) {
        console.error("[edit] load pdf:", e);
      }
    })();
    return () => {
      active = false;
      loaded?.destroy().catch(() => {});
      if (docRef.current === loaded) docRef.current = null;
    };
  }, [pdfBytes]);

  // Render the current page whenever page/zoom/doc changes.
  React.useEffect(() => {
    if (!page) return;
    let active = true;
    let task: PdfRenderTask | null = null;
    const raf = requestAnimationFrame(async () => {
      const doc = docRef.current;
      const canvas = canvasRef.current;
      if (!doc || !canvas) return;
      try {
        setRendering(true);
        const pg = await doc.getPage(currentPage);
        if (!active) return;
        const viewport = pg.getViewport({ scale });
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        task = pg.render({ canvasContext: ctx, viewport });
        await task.promise;
      } catch (e) {
        if ((e as { name?: string })?.name !== "RenderingCancelledException") {
          console.error("[edit] render:", e);
        }
      } finally {
        if (active) setRendering(false);
      }
    });
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      task?.cancel();
    };
  }, [page, currentPage, scale]);

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground/50">
        No page to display.
      </div>
    );
  }

  const selected = page.blocks.find((b) => b.id === selectedId);

  return (
    <div ref={containerRef} className="relative flex h-full w-full items-start justify-center overflow-auto bg-muted/30 p-8 dark:bg-black/40">
      {rendering && (
        <div className="pointer-events-none absolute right-4 top-4 z-30 flex items-center gap-2 rounded-full border border-hairline bg-surface/90 px-3 py-1 text-xs text-muted-foreground shadow">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald" /> Rendering…
        </div>
      )}

      {/* The document: a bright white sheet on the dark desk (both themes). */}
      <div className="relative bg-white shadow-2xl ring-1 ring-black/10" style={{ width: page.width * scale, height: page.height * scale }}>
        <canvas ref={canvasRef} className="block" />

        {/* Editable text overlay */}
        <div className="absolute inset-0">
          {page.blocks.map((block) => (
            <EditableTextBox
              key={block.id}
              block={block}
              scale={scale}
              selected={selectedId === block.id}
              onSelect={() => setSelectedId(block.id)}
              onChange={(text) => updateBlock(currentPage, block.id, { text })}
            />
          ))}
        </div>

        {selected && (
          <BlockFormatToolbar
            block={selected}
            onUpdate={(u) => updateBlock(currentPage, selected.id, u)}
          />
        )}
      </div>
    </div>
  );
}

function EditableTextBox({ block, scale, selected, onSelect, onChange }: {
  block: EditableBlock;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (text: string) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  const handleBlur = () => {
    const t = ref.current?.innerText ?? "";
    if (t !== block.text) onChange(t);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={onSelect}
      onBlur={handleBlur}
      className={cn(
        "absolute cursor-text overflow-hidden whitespace-pre-wrap outline-none",
        // The sheet is always white, so keep a dark caret regardless of app theme.
        "caret-black selection:bg-emerald/30",
        selected ? "ring-2 ring-emerald/70 z-20" : "ring-1 ring-transparent hover:ring-emerald/30 z-10",
        block.edited && "bg-emerald/10"
      )}
      style={{
        left: block.bbox.x * scale,
        top: block.bbox.y * scale,
        width: block.bbox.width * scale,
        minHeight: block.bbox.height * scale,
        fontSize: block.fontSize * scale,
        fontWeight: block.bold ? 700 : 400,
        fontStyle: block.italic ? "italic" : "normal",
        textAlign: block.align,
        color: block.color || "#111111",
        lineHeight: 1.1,
      }}
    >
      {block.text}
    </div>
  );
}
