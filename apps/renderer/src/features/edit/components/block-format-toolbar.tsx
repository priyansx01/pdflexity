"use client";

import * as React from "react";
import { motion } from "motion/react";
import { AlignJustify, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Minus, Plus } from "lucide-react";
import type { EditBlock } from "@/lib/backend-types";
import { cn } from "@/lib/utils";

const SWATCHES = [
  "#000000", "#374151", "#6b7280", "#ef4444",
  "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
];

/** Floating formatter for the selected editable text block. */
export function BlockFormatToolbar({ block, onUpdate }: {
  block: EditBlock;
  onUpdate: (u: Partial<EditBlock>) => void;
}) {
  const [colorOpen, setColorOpen] = React.useState(false);
  const hold = (e: React.MouseEvent) => e.preventDefault();
  const setSize = (n: number) => onUpdate({ fontSize: Math.max(6, Math.min(96, Math.round(n))) });

  const aligns: { v: EditBlock["align"]; Icon: React.ElementType }[] = [
    { v: "left", Icon: AlignLeft }, { v: "center", Icon: AlignCenter },
    { v: "right", Icon: AlignRight }, { v: "justify", Icon: AlignJustify },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
      onMouseDown={hold}
      className="absolute left-1/2 top-2 z-40 -translate-x-1/2 flex items-center gap-0.5 rounded-lg border border-hairline bg-surface/95 px-1.5 py-1 shadow-2xl backdrop-blur-xl"
    >
      <button onMouseDown={hold} onClick={() => setSize(block.fontSize - 1)} title="Smaller"
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/70 hover:bg-surface-raised"><Minus className="h-3 w-3" /></button>
      <input type="number" value={Math.round(block.fontSize)} min={6} max={96} onMouseDown={hold}
        onChange={(e) => setSize(Number(e.target.value) || block.fontSize)}
        className="h-6 w-9 rounded bg-surface-raised text-center text-[11px] tabular-nums outline-none" />
      <button onMouseDown={hold} onClick={() => setSize(block.fontSize + 1)} title="Larger"
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/70 hover:bg-surface-raised"><Plus className="h-3 w-3" /></button>

      <div className="h-4 w-px bg-hairline" />

      <ToolBtn active={block.bold} onClick={() => onUpdate({ bold: !block.bold })} title="Bold"><Bold className="h-3 w-3" /></ToolBtn>
      <ToolBtn active={block.italic} onClick={() => onUpdate({ italic: !block.italic })} title="Italic"><Italic className="h-3 w-3" /></ToolBtn>

      <div className="h-4 w-px bg-hairline" />

      {aligns.map(({ v, Icon }) => (
        <ToolBtn key={v} active={block.align === v} onClick={() => onUpdate({ align: v })} title={v}><Icon className="h-3 w-3" /></ToolBtn>
      ))}

      <div className="h-4 w-px bg-hairline" />

      <div className="relative">
        <button onMouseDown={hold} onClick={() => setColorOpen((o) => !o)} title="Text color"
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-surface-raised">
          <span className="h-3.5 w-3.5 rounded-sm border border-hairline" style={{ backgroundColor: block.color || "#000000" }} />
        </button>
        {colorOpen && (
          <div onMouseDown={hold} className="absolute left-1/2 top-8 z-50 -translate-x-1/2 rounded-lg border border-hairline bg-surface/95 p-2 shadow-2xl backdrop-blur-xl">
            <div className="grid grid-cols-4 gap-1.5">
              {SWATCHES.map((c) => (
                <button key={c} onMouseDown={hold} onClick={() => { onUpdate({ color: c }); setColorOpen(false); }}
                  className={cn("h-5 w-5 rounded border", block.color === c ? "border-emerald ring-1 ring-emerald/50" : "border-hairline")}
                  style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
            <label className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
              Custom
              <input type="color" value={block.color || "#000000"} onMouseDown={hold}
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="h-5 w-8 cursor-pointer rounded border border-hairline bg-transparent" />
            </label>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ToolBtn({ active, onClick, title, children }: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={cn("flex h-6 w-6 items-center justify-center rounded transition-colors",
        active ? "bg-emerald/20 text-emerald" : "text-muted-foreground/70 hover:bg-surface-raised")}>
      {children}
    </button>
  );
}
