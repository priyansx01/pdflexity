import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { ipcMain } from "electron";
import { Channels }  from "../../constants/channels";
import { goBridge }  from "../../services/go-bridge";   // instance, not class

export function registerCompareHandler(): void {
  ipcMain.handle(
    Channels.PDF_COMPARE,
    async (_event, bufferA: ArrayBuffer, bufferB: ArrayBuffer) => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdflexity-cmp-"));
      const tmpA   = path.join(tmpDir, "original.pdf");
      const tmpB   = path.join(tmpDir, "modified.pdf");

      try {
        fs.writeFileSync(tmpA, Buffer.from(bufferA));
        fs.writeFileSync(tmpB, Buffer.from(bufferB));

        const response = await goBridge.send({
          op:          "compare",
          inputPath:   tmpA,
          inputPathB:  tmpB,
          outputPath:  "",   // unused for compare
        });

        if (!response.success) {
          return { success: false, error: response.error ?? "Compare failed" };
        }

        // Go packs the diff JSON into response.outputPath
        const diffResult = JSON.parse(response.outputPath!);
        return { success: true, data: diffResult };

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
    }
  );
}
