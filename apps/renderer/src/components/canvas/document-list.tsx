"use client";

import * as React from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical, Lock, Plus, X } from "lucide-react";

import type { LoadedFile } from "@/lib/file-intake";
import { getPdfMeta, renderThumbnail } from "@/lib/pdf";
import { cn } from "@/lib/utils";

/**
 * Multi-file Document step: sortable card list with live page-1 thumbnails,
 * per-file remove, add-more, and an aggregate summary. Order defines the merge
 * order.
 */
export function DocumentList({
  files,
  onReorder,
  onRemove,
  onAddMore,
  disabled,
}: {
  files: LoadedFile[];
  onReorder: (files: LoadedFile[]) => void;
  onRemove: (index: number) => void;
  onAddMore: () => void;
  disabled?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = files.findIndex((_, i) => `file-${i}` === active.id);
    const to = files.findIndex((_, i) => `file-${i}` === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(files, from, to));
  };

  const totalPages = files.reduce((a, f) => a + (pageCache.current.get(key(f))?.pages ?? 0), 0);
  const totalSize = files.reduce((a, f) => a + f.buffer.byteLength, 0);

  function key(f: LoadedFile) {
    return `${f.name}:${f.buffer.byteLength}`;
  }
  const pageCache = React.useRef(new Map<string, { pages: number | null; encrypted: boolean }>());

  return (
    <div className={cn("space-y-2", disabled && "pointer-events-none opacity-60")}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={files.map((_, i) => `file-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {files.map((f, i) => (
              <SortableFileCard
                key={key(f) + i}
                id={`file-${i}`}
                index={i}
                file={f}
                cacheKey={key(f)}
                pageCache={pageCache}
                onRemove={() => onRemove(i)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {/* Add more */}
      <button
        type="button"
        onClick={onAddMore}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-hairline py-2.5 text-[13px] text-muted-foreground transition-colors hover:border-ember/50 hover:text-foreground"
      >
        <Plus className="h-4 w-4" /> Add more PDFs
      </button>

      {/* Aggregate */}
      <p className="tnum text-right text-[11px] text-muted-foreground">
        {files.length} file{files.length === 1 ? "" : "s"}
        {totalPages ? ` · ${totalPages} page${totalPages === 1 ? "" : "s"}` : ""} · {fmtSize(totalSize)}
      </p>
    </div>
  );
}

function SortableFileCard({
  id,
  index,
  file,
  cacheKey,
  pageCache,
  onRemove,
}: {
  id: string;
  index: number;
  file: LoadedFile;
  cacheKey: string;
  pageCache: React.RefObject<Map<string, { pages: number | null; encrypted: boolean }>>;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const [thumb, setThumb] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<{ pages: number | null; encrypted: boolean } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const cached = pageCache.current?.get(cacheKey);
    if (cached) {
      setMeta(cached);
    } else {
      getPdfMeta(file.buffer).then((m) => {
        if (cancelled) return;
        pageCache.current?.set(cacheKey, m);
        setMeta(m);
      });
    }
    renderThumbnail(file.buffer).then((t) => !cancelled && setThumb(t));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-hairline bg-surface px-3 py-2.5",
        isDragging && "z-10 opacity-80 ring-1 ring-ember/40"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        aria-label={`Reorder ${file.name}`}
        className="-ml-1 flex h-7 w-5 cursor-grab touch-none items-center justify-center text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Thumbnail */}
      <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-raised">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-contain" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="tnum text-[11px] text-muted-foreground">{index + 1}.</span>
          <p className="truncate text-[14px] font-semibold">{file.name}</p>
          {meta?.encrypted && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ember-soft px-2 py-0.5 text-[10px] font-medium text-ember">
              <Lock className="h-3 w-3" /> AES-256
            </span>
          )}
        </div>
        <p className="text-[12px] text-muted-foreground">
          {meta?.pages ? `${meta.pages} ${meta.pages === 1 ? "page" : "pages"} · ` : ""}
          {fmtSize(file.buffer.byteLength)}
        </p>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
