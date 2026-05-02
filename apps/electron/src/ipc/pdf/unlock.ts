import { ipcMain } from "electron";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Channels } from "../../constants/channels";
import { goBridge } from "../../services/go-bridge";

/**
 * pdf:unlock
 *
 * Receives a PDF file as a Uint8Array buffer + password from the renderer.
 * Saves it to a temp file, calls the Go engine, reads back the output,
 * and returns the decrypted file as a base64 string.
 */
export function registerUnlockHandler(): void {
  ipcMain.handle(
    Channels.PDF_UNLOCK,
    async (_event, fileBuffer: Uint8Array, password: string, fileName: string) => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdflexity-"));
      const inputPath  = path.join(tmpDir, "input.pdf");
      const outputPath = path.join(tmpDir, "output.pdf");

      try {
        // 1. Write the renderer's ArrayBuffer to a temp file
        fs.writeFileSync(inputPath, Buffer.from(fileBuffer));

        // 2. Call the Go engine
        const result = await goBridge.send({
          op: "unlock",
          inputPath,
          outputPath,
          password,
        });

        if (!result.success) {
          throw new Error(result.error ?? "Unknown unlock error");
        }

        // 3. Read the decrypted file and return as base64
        const unlocked = fs.readFileSync(outputPath);
        return {
          success: true,
          data: unlocked.toString("base64"),
          fileName: fileName.replace(/\.pdf$/i, "_unlocked.pdf"),
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      } finally {
        // 4. Always clean up temp files
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch { /* ignore cleanup errors */ }
      }
    }
  );
}
