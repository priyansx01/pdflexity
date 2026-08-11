"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Merge, Scissors, ListOrdered, PenTool, LockOpen, Shield,
  FileStack, EyeOff, Minimize2, Wrench, ScanSearch,
  type LucideIcon,
} from "lucide-react";

import { TitleBar } from "./title-bar";
import { ToolRail } from "./tool-rail";
import { ToolHeader } from "./tool-header";
import { StatusStrip } from "./status-strip";

// Minimal tool list for the shell. Step 9 promotes this to lib/tools.ts with
// option schemas + backend mapping.
export type ToolGroup = "Organize" | "Security" | "Optimize";
export type ShellTool = {
  id: string;
  name: string;
  group: ToolGroup;
  icon: LucideIcon;
  subtitle: string;
  engine: string;
  capability: string;
  href: string;
};

export const SHELL_TOOLS: ShellTool[] = [
  { id: "merge",    name: "Merge PDF",    group: "Organize", icon: Merge,       subtitle: "Combine PDFs into one",        engine: "pdfcpu",    capability: "Multi-file", href: "/organize/merge" },
  { id: "split",    name: "Split PDF",    group: "Organize", icon: Scissors,    subtitle: "Extract pages or ranges",      engine: "pdfcpu",    capability: "Multi-out",  href: "/organize/split" },
  { id: "organize", name: "Organize PDF", group: "Organize", icon: ListOrdered, subtitle: "Reorder pages",                engine: "pdfcpu",    capability: "Drag-sort",  href: "/organize/organize" },
  { id: "sign",     name: "Sign PDF",     group: "Security", icon: PenTool,     subtitle: "Add a digital signature",      engine: "pdfcpu",    capability: "PKCS#12",    href: "/security/sign" },
  { id: "unlock",   name: "Unlock PDF",   group: "Security", icon: LockOpen,    subtitle: "Remove password protection",   engine: "pdfcpu",    capability: "Decrypt",    href: "/security/unlock" },
  { id: "protect",  name: "Protect PDF",  group: "Security", icon: Shield,      subtitle: "Encrypt with a password",      engine: "pdfcpu",    capability: "AES-256",    href: "/security/protect" },
  { id: "compare",  name: "Compare PDF",  group: "Security", icon: FileStack,   subtitle: "Diff two documents",           engine: "pdfcpu",    capability: "Visual diff",href: "/security/compare" },
  { id: "redact",   name: "Redact PDF",   group: "Security", icon: EyeOff,      subtitle: "Permanently remove content",   engine: "pdfcpu",    capability: "Burn-in",    href: "/security/redact" },
  { id: "compress", name: "Compress PDF", group: "Optimize", icon: Minimize2,   subtitle: "Reduce file size",             engine: "pdfcpu",    capability: "Lossless",   href: "/optimize/compress" },
  { id: "repair",   name: "Repair PDF",   group: "Optimize", icon: Wrench,      subtitle: "Fix a damaged file",           engine: "pdfcpu",    capability: "Recover",    href: "/optimize/repair" },
  { id: "ocr",      name: "OCR PDF",      group: "Optimize", icon: ScanSearch,  subtitle: "Make scans searchable",        engine: "PaddleOCR", capability: "AI text",     href: "/optimize/ocr" },
];

export function getToolByPath(pathname: string | null): ShellTool | null {
  if (!pathname) return null;
  return SHELL_TOOLS.find((t) => pathname.startsWith(t.href)) ?? null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tool = getToolByPath(pathname);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <ToolRail tools={SHELL_TOOLS} activeId={tool?.id ?? null} />
        <div className="flex min-w-0 flex-1 flex-col">
          <ToolHeader tool={tool} />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          <StatusStrip tool={tool} />
        </div>
      </div>
    </div>
  );
}
