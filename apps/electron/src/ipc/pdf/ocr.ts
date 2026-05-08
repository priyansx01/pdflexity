import { ipcMain, BrowserWindow } from "electron";
import { Channels } from "../../constants/channels";
import { goBridge } from "../../services/go-bridge";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

// ─── Active OCR job tracking ─────────────────────────────────────────────────
let activeJobId: string | null = null;
let cancelRequested = false;

function getTempDir(): string {
  const dir = path.join(os.tmpdir(), "pdflexity-ocr");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function generateJobId(): string {
  return `ocr-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

export function registerOcrHandlers(): void {
  // ── Start OCR processing ─────────────────────────────────────────────────
  ipcMain.handle(
    Channels.PDF_OCR_START,
    async (
      _event,
      buffer: Uint8Array,
      fileName: string,
      languages: string[],
      dpi: number
    ) => {
      const jobId = generateJobId();
      activeJobId = jobId;
      cancelRequested = false;

      const tmpDir = getTempDir();
      const inputPath = path.join(tmpDir, `input-${jobId}.pdf`);
      const outputDir = path.join(tmpDir, jobId);

      try {
        // Write PDF buffer to temp file
        fs.writeFileSync(inputPath, Buffer.from(buffer));
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const mainWindow = getMainWindow();

        // Send OCR command to Go bridge with streaming support
        const result = await goBridge.sendStreaming(
          {
            op: "ocr-start",
            inputPath,
            outputPath: outputDir,
            languages,
            dpi,
          },
          (event: any) => {
            // Forward streaming events to the renderer process
            if (!mainWindow || mainWindow.isDestroyed()) return;
            if (cancelRequested && event.type !== "complete" && event.type !== "error") return;

            if (event.type === "progress") {
              mainWindow.webContents.send(Channels.PDF_OCR_PROGRESS, {
                ...event,
                jobId,
              });
            } else if (event.type === "page-result" || event.type === "page-image") {
              mainWindow.webContents.send(Channels.PDF_OCR_PAGE_RESULT, {
                ...event,
                jobId,
              });
            }
          }
        );

        activeJobId = null;

        if (result.success) {
          return { success: true, jobId, data: result.data };
        } else {
          return { success: false, error: result.error || "OCR processing failed" };
        }
      } catch (err: any) {
        activeJobId = null;
        return { success: false, error: err.message || "OCR processing failed" };
      }
    }
  );

  // ── Cancel OCR ───────────────────────────────────────────────────────────
  ipcMain.handle(Channels.PDF_OCR_CANCEL, async (_event, jobId: string) => {
    if (activeJobId === jobId) {
      cancelRequested = true;
      // Send cancel command to Go
      try {
        await goBridge.send({ op: "ocr-cancel" });
        return { success: true };
      } catch {
        return { success: false, error: "Failed to cancel OCR job" };
      }
    }
    return { success: false, error: "No matching active job" };
  });

  // ── Render single page ──────────────────────────────────────────────────
  ipcMain.handle(
    Channels.PDF_OCR_RENDER_PAGE,
    async (_event, buffer: Uint8Array, page: number, scale: number) => {
      const tmpDir = getTempDir();
      const inputPath = path.join(tmpDir, `render-${Date.now()}.pdf`);

      try {
        fs.writeFileSync(inputPath, Buffer.from(buffer));
        const result = await goBridge.send({
          op: "ocr-render-page",
          inputPath,
          page,
          scale: scale || 1.5,
        });

        // Clean up temp file
        try { fs.unlinkSync(inputPath); } catch {}

        if (result.success) {
          return { success: true, data: result.data };
        }
        return { success: false, error: result.error || "Failed to render page" };
      } catch (err: any) {
        try { fs.unlinkSync(inputPath); } catch {}
        return { success: false, error: err.message };
      }
    }
  );

  // ── Export OCR result ───────────────────────────────────────────────────
  ipcMain.handle(
    Channels.PDF_OCR_EXPORT,
    async (
      _event,
      buffer: Uint8Array,
      fileName: string,
      format: string,
      ocrData: any,
      edits: any
    ) => {
      const tmpDir = getTempDir();
      const inputPath = path.join(tmpDir, `export-${Date.now()}.pdf`);
      const baseName = fileName.replace(/\.pdf$/i, "");
      const ext = format === "docx" ? ".docx" : format === "json" ? ".json" : ".pdf";
      const outputPath = path.join(tmpDir, `${baseName}-ocr${ext}`);

      try {
        fs.writeFileSync(inputPath, Buffer.from(buffer));
        
        const result = await goBridge.send({
          op: "ocr-export",
          inputPath,
          outputPath,
          exportFormat: format,
          ocrData: JSON.stringify(ocrData),
          edits: JSON.stringify(edits || {}),
        });

        try { fs.unlinkSync(inputPath); } catch {}

        if (result.success && result.outputPath) {
          const exportedBuffer = fs.readFileSync(result.outputPath);
          const base64 = exportedBuffer.toString("base64");
          try { fs.unlinkSync(result.outputPath); } catch {}
          return {
            success: true,
            data: base64,
            fileName: `${baseName}-ocr${ext}`,
          };
        }
        return { success: false, error: result.error || "Export failed" };
      } catch (err: any) {
        try { fs.unlinkSync(inputPath); } catch {}
        return { success: false, error: err.message };
      }
    }
  );
}
