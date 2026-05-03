import { ipcMain } from "electron";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Channels } from "../../constants/channels";
import { goBridge } from "../../services/go-bridge";

export function registerMergeHandler(): void {
  ipcMain.handle(
    Channels.PDF_MERGE,
    async (_event, buffers: Uint8Array[], names: string[], fileName: string) => {
      const tmpDir     = fs.mkdtempSync(path.join(os.tmpdir(), "pdflexity-merge-"));
      const inputPaths = buffers.map((bufArray, i) => {
        const ext = path.extname(names[i]) || ".pdf";
        const p = path.join(tmpDir, `input_${i}${ext}`);
        // Ensure f.buffer is correctly parsed from IPC
        const buf = Buffer.from(bufArray);
        if (buf.length === 0) {
          throw new Error(`File ${names[i]} was received as empty (0 bytes) over IPC. Please try again.`);
        }
        fs.writeFileSync(p, buf);
        return p;
      });
      const outputPath = path.join(tmpDir, "merged.pdf");

      try {
        const result = await goBridge.send({
          op: "merge",
          inputPaths,
          outputPath,
        });

        if (!result.success) {
          throw new Error(result.error ?? "Unknown merge error");
        }

        const merged = fs.readFileSync(outputPath);
        return {
          success: true,
          data: merged.toString("base64"),
          fileName: fileName.replace(/\.pdf$/i, "_merged.pdf"),
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      } finally {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch { /* ignore cleanup errors */ }
      }
    }
  );
}
