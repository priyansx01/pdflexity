package handler

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"os"

	"github.com/pdflexity/pdf-engine/internal/model"
)

// handleEditExtract asks the bundled worker for an editable text model of the PDF
// (per-page blocks with bbox/font/size/color), forwarding its JSON verbatim.
func handleEditExtract(enc *json.Encoder, cmd model.Command) {
	workerArgs := []string{
		"--input", cmd.InputPath,
		"--mode", "edit-extract",
	}
	proc, err := ocrCommand(cmd, workerArgs)
	if err != nil {
		writeError(enc, err.Error())
		return
	}
	proc.Stderr = os.Stderr

	stdout, err := proc.StdoutPipe()
	if err != nil {
		writeError(enc, fmt.Sprintf("stdout pipe: %v", err))
		return
	}
	if err := proc.Start(); err != nil {
		writeError(enc, fmt.Sprintf("failed to start worker: %v", err))
		return
	}

	// The model can be large (many blocks); read with a generous buffer and
	// forward the worker's terminal event verbatim.
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 0, 1<<20), 64<<20)
	var forwarded bool
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var event map[string]interface{}
		if err := json.Unmarshal(line, &event); err != nil {
			continue
		}
		if t, _ := event["type"].(string); t == "complete" || t == "error" {
			_ = enc.Encode(event)
			forwarded = true
			break
		}
	}
	_ = proc.Wait()
	if !forwarded {
		writeError(enc, "worker produced no result")
	}
}

// handleEditApply pipes the edit list (JSON on stdin) to the worker and returns
// its terminal event; the worker writes the edited PDF to cmd.OutputPath.
func handleEditApply(enc *json.Encoder, cmd model.Command) {
	workerArgs := []string{
		"--input", cmd.InputPath,
		"--mode", "edit-apply",
		"--export-output", cmd.OutputPath,
	}
	proc, err := ocrCommand(cmd, workerArgs)
	if err != nil {
		writeError(enc, err.Error())
		return
	}
	proc.Stderr = os.Stderr

	stdin, err := proc.StdinPipe()
	if err != nil {
		writeError(enc, fmt.Sprintf("stdin pipe: %v", err))
		return
	}
	go func() {
		defer stdin.Close()
		// The worker reads one line: the JSON edit list.
		fmt.Fprintf(stdin, "%s\n", cmd.EditData)
	}()

	out, err := proc.Output()
	if err != nil {
		writeError(enc, fmt.Sprintf("edit apply failed: %v", err))
		return
	}
	// Forward the worker's terminal JSON line verbatim.
	scanner := bufio.NewScanner(bytes.NewReader(out))
	scanner.Buffer(make([]byte, 0, 1<<20), 8<<20)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var event map[string]interface{}
		if err := json.Unmarshal(line, &event); err != nil {
			continue
		}
		if t, _ := event["type"].(string); t == "complete" || t == "error" {
			_ = enc.Encode(event)
			return
		}
	}
	writeError(enc, "worker produced no result")
}
