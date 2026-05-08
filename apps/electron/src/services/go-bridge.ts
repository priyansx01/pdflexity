import * as childProcess from "child_process";
import * as path from "path";
import * as fs from "fs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoCommand {
  op: string;
  inputPath?: string;
  inputPathB?: string;   // compare: second input PDF
  inputPaths?: string[]; // merge: multiple input PDFs
  outputPath?: string;
  password?: string;
  // Signing operations
  certPath?: string;
  passphrase?: string;
  page?: number;
  zone?: any;
  reason?: string;
  location?: string;
  contact?: string;
  appearance?: any;
  // Redaction operations
  marks?: any[];
  query?: string;
  caseSensitive?: boolean;
  regex?: boolean;
  scale?: number;
  // Split operations
  pageRanges?: string[];
  mergeOutput?: boolean;
  // OCR operations
  languages?: string[];
  dpi?: number;
  enableGpu?: boolean;
  exportFormat?: string;
  ocrData?: string;
  edits?: string;
}

interface GoResponse {
  success: boolean;
  outputPath?: string;
  error?: string;
  data?: any;
  // Streaming event fields
  type?: string;   // "progress" | "page-result" | "page-image" | "complete" | "error"
  jobId?: string;
}

type StreamingCallback = (event: GoResponse) => void;

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
  
  // Streaming support: when set, intermediate events go to this callback
  private streamingCallback: StreamingCallback | null = null;
  private streamingResolve: ((resp: GoResponse) => void) | null = null;

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
          this.handleResponse(resp);
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
      // Also reject streaming resolver
      if (this.streamingResolve) {
        this.streamingResolve({ success: false, error: `Engine crashed (exit ${code})` });
        this.streamingResolve = null;
        this.streamingCallback = null;
      }
    });
  }

  /** Route a parsed response to the correct handler */
  private handleResponse(resp: GoResponse): void {
    // Check if this is a streaming event
    if (this.streamingCallback && resp.type) {
      if (resp.type === "complete" || resp.type === "error") {
        // Final event — resolve the streaming promise
        const resolve = this.streamingResolve;
        this.streamingResolve = null;
        this.streamingCallback = null;
        if (resolve) {
          resolve({
            success: resp.type === "complete",
            data: resp.data,
            error: resp.error,
          });
        }
      } else {
        // Intermediate event — forward to callback
        this.streamingCallback(resp);
      }
      return;
    }
    
    // Regular one-shot response
    const resolve = this.pendingResolvers.shift();
    if (resolve) resolve(resp);
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

  /**
   * Send a command that produces multiple streaming responses.
   * Intermediate events (progress, page-result) are forwarded to the callback.
   * The promise resolves when a "complete" or "error" event is received.
   */
  sendStreaming(cmd: GoCommand, onEvent: StreamingCallback): Promise<GoResponse> {
    return new Promise((resolve, reject) => {
      try {
        this.ensureRunning();
      } catch (err) {
        reject(err);
        return;
      }

      this.streamingCallback = onEvent;
      this.streamingResolve = resolve;

      const json = JSON.stringify(cmd) + "\n";
      this.proc!.stdin!.write(json, (err) => {
        if (err) {
          this.streamingCallback = null;
          this.streamingResolve = null;
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

