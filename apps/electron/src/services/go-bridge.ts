import * as childProcess from "child_process";
import * as path from "path";
import * as fs from "fs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoCommand {
  op: string;
  inputPath?: string;
  inputPathB?: string;   // compare: second input PDF
  outputPath?: string;
  password?: string;
}

interface GoResponse {
  success: boolean;
  outputPath?: string;
  error?: string;
}

// ─── GoBridge ────────────────────────────────────────────────────────────────

/**
 * Singleton bridge to the Go PDF engine binary.
 * The binary stays alive as a long-running child process; commands are sent
 * over stdin and responses are read from stdout — one JSON line each.
 */
class GoBridge {
  private proc: childProcess.ChildProcess | null = null;
  private pendingResolvers: Array<(resp: GoResponse) => void> = [];
  private buffer = "";

  private get binaryPath(): string {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      // __dirname at runtime = apps/electron/dist/services/
      // ../../bin  →  apps/electron/bin/  ✓
      return path.join(__dirname, "../../bin/pdflexity-engine.exe");
    }
    // In production (packaged), the binary is in the app's resources folder
    return path.join(process.resourcesPath, "bin", "pdflexity-engine.exe");
  }

  /** Start the Go process if not already running. */
  private ensureRunning(): void {
    if (this.proc && !this.proc.killed) return;

    if (!fs.existsSync(this.binaryPath)) {
      throw new Error(
        `PDF engine binary not found at: ${this.binaryPath}\n` +
        `Run: cd services/pdf-engine && go build -o ../../apps/electron/bin/pdflexity-engine.exe ./cmd/pdflexity-engine/`
      );
    }

    this.proc = childProcess.spawn(this.binaryPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Route stderr to Electron's console for debugging
    this.proc.stderr?.on("data", (chunk: Buffer) => {
      console.log("[pdf-engine]", chunk.toString().trim());
    });

    // Accumulate stdout and emit one response per complete line
    this.proc.stdout?.on("data", (chunk: Buffer) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop() ?? ""; // last partial line stays buffered

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const resp: GoResponse = JSON.parse(trimmed);
          const resolve = this.pendingResolvers.shift();
          if (resolve) resolve(resp);
        } catch {
          console.error("[pdf-engine] bad JSON from stdout:", trimmed);
        }
      }
    });

    this.proc.on("exit", (code) => {
      console.warn(`[pdf-engine] process exited with code ${code}`);
      this.proc = null;
      // Reject all pending resolvers
      for (const resolve of this.pendingResolvers) {
        resolve({ success: false, error: `Engine crashed (exit ${code})` });
      }
      this.pendingResolvers = [];
    });
  }

  /** Send a command and await exactly one response. */
  send(cmd: GoCommand): Promise<GoResponse> {
    return new Promise((resolve, reject) => {
      try {
        this.ensureRunning();
      } catch (err) {
        reject(err);
        return;
      }

      this.pendingResolvers.push(resolve);

      const json = JSON.stringify(cmd) + "\n";
      this.proc!.stdin!.write(json, (err) => {
        if (err) {
          this.pendingResolvers.pop();
          reject(new Error(`Failed to write to pdf-engine stdin: ${err.message}`));
        }
      });
    });
  }

  /** Gracefully shut down the Go process. */
  shutdown(): void {
    this.proc?.stdin?.end();
    this.proc = null;
  }
}

// Export a single shared instance
export const goBridge = new GoBridge();
