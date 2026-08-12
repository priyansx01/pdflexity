import {
  Merge, Scissors, ListOrdered, PenTool, LockOpen, Shield,
  FileStack, EyeOff, Minimize2, Wrench, ScanSearch,
  type LucideIcon,
} from "lucide-react";

export type ToolGroup = "Organize" | "Security" | "Optimize";

export type ToolOption =
  | { kind: "password"; id: string; label: string; hint?: string }
  | { kind: "toggle"; id: string; label: string; hint?: string; defaultOn?: boolean }
  | { kind: "segment"; id: string; label: string; choices: string[]; defaultChoice: string };

export type RunArgs = {
  files: { buffer: ArrayBuffer; name: string }[];
  options: Record<string, string | boolean>;
  onProgress?: (pct: number) => void;
};

export type RunOutcome =
  | { kind: "file"; fileName: string; dataB64: string }
  | { kind: "files"; files: { name: string; dataB64: string }[] };

export type Tool = {
  id: string;
  name: string;
  group: ToolGroup;
  icon: LucideIcon;
  subtitle: string;
  engine: string;
  capability: string;
  href: string;
  accepts: string;
  cta: string;
  runningVerb: string;
  options: ToolOption[];
  multiFile?: boolean;
  /** Not yet wired to the engine (compress/repair have no Go op). */
  available?: boolean;
  /** Rendered via a bespoke canvas (step 15), not the data-driven flow. */
  complex?: boolean;
  run: (args: RunArgs) => Promise<RunOutcome>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (): any => (window as unknown as { electronAPI?: any }).electronAPI;

const requireFile = (files: RunArgs["files"]) => {
  if (!files[0]) throw new Error("No file loaded");
  return files[0];
};

export const TOOLS: Tool[] = [
  // ── Organize ──
  {
    id: "merge", name: "Merge PDF", group: "Organize", icon: Merge,
    subtitle: "Combine PDFs into one", engine: "pdfcpu", capability: "Multi-file",
    href: "/organize/merge", accepts: "PDF · 2 or more", cta: "Merge", runningVerb: "Merging",
    options: [], multiFile: true,
    run: async ({ files }) => {
      const r = await api().pdf.merge(
        files.map((f) => ({ buffer: f.buffer, name: f.name })),
        "merged.pdf",
      );
      if (!r.success) throw new Error(r.error);
      return { kind: "file", fileName: r.fileName, dataB64: r.data };
    },
  },
  {
    id: "split", name: "Split PDF", group: "Organize", icon: Scissors,
    subtitle: "Extract pages or ranges", engine: "pdfcpu", capability: "Multi-out",
    href: "/organize/split", accepts: "PDF only", cta: "Split", runningVerb: "Splitting",
    options: [], complex: true,
    run: async () => { throw new Error("Split uses a custom canvas"); },
  },
  {
    id: "organize", name: "Organize PDF", group: "Organize", icon: ListOrdered,
    subtitle: "Reorder pages", engine: "pdfcpu", capability: "Drag-sort",
    href: "/organize/organize", accepts: "PDF only", cta: "Organize", runningVerb: "Organizing",
    options: [], complex: true,
    run: async () => { throw new Error("Organize uses a custom canvas"); },
  },

  // ── Security ──
  {
    id: "sign", name: "Sign PDF", group: "Security", icon: PenTool,
    subtitle: "Add a digital signature", engine: "pdfcpu", capability: "PKCS#12",
    href: "/security/sign", accepts: "PDF + certificate", cta: "Sign", runningVerb: "Signing",
    options: [], complex: true,
    run: async () => { throw new Error("Sign uses a custom canvas"); },
  },
  {
    id: "unlock", name: "Unlock PDF", group: "Security", icon: LockOpen,
    subtitle: "Remove password protection", engine: "pdfcpu", capability: "Decrypt",
    href: "/security/unlock", accepts: "PDF only", cta: "Unlock", runningVerb: "Unlocking",
    options: [{ kind: "password", id: "password", label: "Password", hint: "Required if the PDF is encrypted" }],
    run: async ({ files, options }) => {
      const f = requireFile(files);
      const r = await api().pdf.unlock(f.buffer, String(options.password ?? ""), f.name);
      if (!r.success) throw new Error(r.error);
      return { kind: "file", fileName: r.fileName, dataB64: r.data };
    },
  },
  {
    id: "protect", name: "Protect PDF", group: "Security", icon: Shield,
    subtitle: "Encrypt with a password", engine: "pdfcpu", capability: "AES-256",
    href: "/security/protect", accepts: "PDF only", cta: "Protect", runningVerb: "Protecting",
    options: [{ kind: "password", id: "password", label: "Password" }],
    run: async ({ files, options }) => {
      const f = requireFile(files);
      const r = await api().pdf.protect(f.buffer, String(options.password ?? ""), f.name);
      if (!r.success) throw new Error(r.error);
      return { kind: "file", fileName: r.fileName, dataB64: r.data };
    },
  },
  {
    id: "compare", name: "Compare PDF", group: "Security", icon: FileStack,
    subtitle: "Diff two documents", engine: "pdfcpu", capability: "Visual diff",
    href: "/security/compare", accepts: "2 PDFs", cta: "Compare", runningVerb: "Comparing",
    options: [], complex: true,
    run: async () => { throw new Error("Compare uses a custom canvas"); },
  },
  {
    id: "redact", name: "Redact PDF", group: "Security", icon: EyeOff,
    subtitle: "Permanently remove content", engine: "pdfcpu", capability: "Burn-in",
    href: "/security/redact", accepts: "PDF only", cta: "Redact", runningVerb: "Redacting",
    options: [], complex: true,
    run: async () => { throw new Error("Redact uses a custom canvas"); },
  },

  // ── Optimize ──
  {
    id: "compress", name: "Compress PDF", group: "Optimize", icon: Minimize2,
    subtitle: "Reduce file size", engine: "pdfcpu", capability: "Lossless",
    href: "/optimize/compress", accepts: "PDF only", cta: "Compress", runningVerb: "Compressing",
    options: [], available: false,
    run: async () => { throw new Error("Compress isn't wired to the engine yet"); },
  },
  {
    id: "repair", name: "Repair PDF", group: "Optimize", icon: Wrench,
    subtitle: "Fix a damaged file", engine: "pdfcpu", capability: "Recover",
    href: "/optimize/repair", accepts: "PDF only", cta: "Repair", runningVerb: "Repairing",
    options: [], available: false,
    run: async () => { throw new Error("Repair isn't wired to the engine yet"); },
  },
  {
    id: "ocr", name: "OCR PDF", group: "Optimize", icon: ScanSearch,
    subtitle: "Make scans searchable", engine: "PaddleOCR", capability: "AI text",
    href: "/optimize/ocr", accepts: "PDF only", cta: "Start OCR", runningVerb: "Running OCR",
    options: [], complex: true,
    run: async () => { throw new Error("OCR uses a custom canvas"); },
  },
];

export const TOOL_GROUPS: ToolGroup[] = ["Organize", "Security", "Optimize"];

export function getTool(id: string | null | undefined): Tool | undefined {
  if (!id) return undefined;
  return TOOLS.find((t) => t.id === id);
}

export function getToolByPath(pathname: string | null): Tool | null {
  if (!pathname) return null;
  // Longest-prefix match so /security/sign doesn't match /security/sig...
  return (
    [...TOOLS].sort((a, b) => b.href.length - a.href.length).find((t) => pathname.startsWith(t.href)) ?? null
  );
}

/** Tools driven by the data-driven WorkCanvas flow (Document→Options→Run→Result). */
export const isSimpleTool = (t: Tool) => !t.complex;
