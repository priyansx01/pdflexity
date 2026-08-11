package handler

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/pdflexity/pdf-engine/internal/model"
)

// cancelMu guards the cancel flag for the current OCR job
var (
	cancelMu   sync.Mutex
	cancelFlag bool
)

// handleOCRStart orchestrates the full OCR pipeline by spawning the Python
// ocr_worker.py script and streaming its JSON events to stdout.
func handleOCRStart(enc *json.Encoder, cmd model.Command) {
	log.Printf("OCR: starting job for %q", cmd.InputPath)

	// Reset cancel flag
	cancelMu.Lock()
	cancelFlag = false
	cancelMu.Unlock()

	// Resolve Python + script paths
	pythonPath := findPython()
	scriptPath := findOCRScript()

	if pythonPath == "" {
		writeStreamError(enc, "Python not found. Install Python 3.8+ and PaddleOCR.")
		return
	}
	if scriptPath == "" {
		writeStreamError(enc, "OCR worker script not found.")
		return
	}

	// Build command args
	languages := "en"
	if len(cmd.Languages) > 0 {
		languages = strings.Join(cmd.Languages, ",")
	}
	dpi := cmd.DPI
	if dpi == 0 {
		dpi = 300
	}

	args := []string{
		scriptPath,
		"--input", cmd.InputPath,
		"--output-dir", cmd.OutputPath,
		"--languages", languages,
		"--dpi", fmt.Sprintf("%d", dpi),
		"--mode", "full",
	}

	log.Printf("OCR: running %s %v", pythonPath, args)

	// Spawn Python process
	proc := exec.Command(pythonPath, args...)
	proc.Stderr = os.Stderr

	stdout, err := proc.StdoutPipe()
	if err != nil {
		writeStreamError(enc, fmt.Sprintf("Failed to create stdout pipe: %v", err))
		return
	}

	if err := proc.Start(); err != nil {
		writeStreamError(enc, fmt.Sprintf("Failed to start OCR worker: %v", err))
		return
	}

	// Read streaming JSON events from Python stdout
	scanner := bufio.NewScanner(stdout)
	// Increase buffer size for large page results
	scanner.Buffer(make([]byte, 0), 10*1024*1024)

	for scanner.Scan() {
		// Check cancel
		cancelMu.Lock()
		cancelled := cancelFlag
		cancelMu.Unlock()
		if cancelled {
			proc.Process.Kill()
			_ = enc.Encode(model.OCRStreamEvent{
				Type:  "error",
				Error: "OCR cancelled by user",
			})
			return
		}

		line := scanner.Text()
		if line == "" {
			continue
		}

		// Parse and re-emit the JSON event from Python
		var event model.OCRStreamEvent
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			log.Printf("OCR: bad JSON from worker: %s", line)
			continue
		}

		// Forward event directly to stdout
		if err := enc.Encode(event); err != nil {
			log.Printf("OCR: failed to encode event: %v", err)
		}

		// If this is the final event, stop reading
		if event.Type == "complete" || event.Type == "error" {
			break
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("OCR: scanner error: %v", err)
	}

	// Wait for process to finish
	if err := proc.Wait(); err != nil {
		log.Printf("OCR: process exited with error: %v", err)
	}
}

// handleOCRCancel sets the cancel flag for the current OCR job
func handleOCRCancel(enc *json.Encoder, cmd model.Command) {
	cancelMu.Lock()
	cancelFlag = true
	cancelMu.Unlock()
	_ = enc.Encode(model.Response{Success: true})
}

// handleOCRRenderPage renders a single PDF page as an image via Python
func handleOCRRenderPage(enc *json.Encoder, cmd model.Command) {
	pythonPath := findPython()
	scriptPath := findOCRScript()

	if pythonPath == "" || scriptPath == "" {
		writeError(enc, "Python or OCR script not found")
		return
	}

	scale := cmd.Scale
	if scale == 0 {
		scale = 1.5
	}

	args := []string{
		scriptPath,
		"--input", cmd.InputPath,
		"--mode", "render-page",
		"--page", fmt.Sprintf("%d", cmd.Page),
		"--dpi", fmt.Sprintf("%d", int(72*scale)),
	}

	out, err := exec.Command(pythonPath, args...).Output()
	if err != nil {
		writeError(enc, fmt.Sprintf("Failed to render page: %v", err))
		return
	}

	// Python outputs a single JSON line with image data
	var result map[string]interface{}
	if err := json.Unmarshal(out, &result); err != nil {
		writeError(enc, fmt.Sprintf("Failed to parse render output: %v", err))
		return
	}

	_ = enc.Encode(model.Response{Success: true, Data: result})
}

// handleOCRExport exports OCR results to various formats via Python
func handleOCRExport(enc *json.Encoder, cmd model.Command) {
	pythonPath := findPython()
	scriptPath := findOCRScript()

	if pythonPath == "" || scriptPath == "" {
		writeError(enc, "Python or OCR script not found")
		return
	}

	args := []string{
		scriptPath,
		"--input", cmd.InputPath,
		"--output-dir", filepath.Dir(cmd.OutputPath),
		"--mode", "export",
		"--export-format", cmd.ExportFormat,
		"--export-output", cmd.OutputPath,
	}

	// Pass OCR data via stdin
	proc := exec.Command(pythonPath, args...)
	proc.Stderr = os.Stderr

	stdin, err := proc.StdinPipe()
	if err != nil {
		writeError(enc, fmt.Sprintf("Failed to create stdin pipe: %v", err))
		return
	}

	go func() {
		defer stdin.Close()
		// Write OCR data and edits as JSON to stdin
		fmt.Fprintf(stdin, "%s\n", cmd.OCRData)
		if cmd.Edits != "" {
			fmt.Fprintf(stdin, "%s\n", cmd.Edits)
		}
	}()

	out, err := proc.Output()
	if err != nil {
		writeError(enc, fmt.Sprintf("Export failed: %v", err))
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(out, &result); err != nil {
		// Export produced file, not JSON
		_ = enc.Encode(model.Response{Success: true, OutputPath: cmd.OutputPath})
		return
	}

	_ = enc.Encode(model.Response{Success: true, OutputPath: cmd.OutputPath, Data: result})
}

// writeStreamError emits a streaming error event
func writeStreamError(enc *json.Encoder, msg string) {
	_ = enc.Encode(model.OCRStreamEvent{
		Type:  "error",
		Error: msg,
	})
}

// findPython locates a Python 3 interpreter
func findPython() string {
	// On Windows, prioritize explicit installations over PATH
	// because the Microsoft Store alias in PATH causes exit 9009 errors.
	if runtime.GOOS == "windows" {
		commonPaths := []string{
			filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs", "Python", "Python311", "python.exe"),
			filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs", "Python", "Python310", "python.exe"),
			filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs", "Python", "Python312", "python.exe"),
			filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs", "Python", "Python313", "python.exe"),
		}
		for _, p := range commonPaths {
			if _, err := os.Stat(p); err == nil {
				return p
			}
		}
	}

	candidates := []string{"python", "python3"}
	if runtime.GOOS == "windows" {
		candidates = []string{"python", "python3", "py"}
	}

	for _, name := range candidates {
		path, err := exec.LookPath(name)
		if err == nil {
			// Skip Microsoft Store app execution aliases which are dummy files
			if runtime.GOOS == "windows" && strings.Contains(strings.ToLower(path), "windowsapps") {
				continue
			}
			return path
		}
	}

	return ""
}

// findOCRScript locates the ocr_worker.py script
func findOCRScript() string {
	// Look relative to the binary (development)
	exePath, err := os.Executable()
	if err == nil {
		// services/pdf-engine/ -> services/ocr-engine/ocr_worker.py
		dir := filepath.Dir(exePath)
		candidates := []string{
			filepath.Join(dir, "..", "..", "services", "ocr-engine", "ocr_worker.py"),
			filepath.Join(dir, "..", "services", "ocr-engine", "ocr_worker.py"),
			filepath.Join(dir, "ocr_worker.py"),
			// Development: when running from project root
			filepath.Join(dir, "..", "..", "..", "services", "ocr-engine", "ocr_worker.py"),
			filepath.Join(dir, "..", "..", "..", "..", "services", "ocr-engine", "ocr_worker.py"),
		}
		for _, p := range candidates {
			abs, _ := filepath.Abs(p)
			if _, err := os.Stat(abs); err == nil {
				return abs
			}
		}
	}

	// Fallback: look from working directory
	cwd, _ := os.Getwd()
	candidates := []string{
		filepath.Join(cwd, "services", "ocr-engine", "ocr_worker.py"),
		filepath.Join(cwd, "..", "services", "ocr-engine", "ocr_worker.py"),
		filepath.Join(cwd, "..", "..", "services", "ocr-engine", "ocr_worker.py"),
	}
	for _, p := range candidates {
		abs, _ := filepath.Abs(p)
		if _, err := os.Stat(abs); err == nil {
			return abs
		}
	}

	return ""
}
