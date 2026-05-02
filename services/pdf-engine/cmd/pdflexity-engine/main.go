// pdflexity-engine — stdin/stdout JSON-RPC PDF processor
//
// Protocol:
//   stdin:  one JSON Command per line
//   stdout: one JSON Response per line
//   stderr: debug/error logs (never parsed by caller)
//
// Example:
//   echo '{"op":"unlock","inputPath":"/tmp/a.pdf","outputPath":"/tmp/b.pdf","password":"secret"}' | ./pdflexity-engine

package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/pdflexity/pdf-engine/internal/pdf"
)

func main() {
	// Log to stderr only — stdout is reserved for JSON responses
	log.SetOutput(os.Stderr)
	log.SetPrefix("[pdf-engine] ")
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	log.Println("pdf-engine started, waiting for commands on stdin...")

	scanner := bufio.NewScanner(os.Stdin)
	encoder := json.NewEncoder(os.Stdout)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var cmd pdf.Command
		if err := json.Unmarshal(line, &cmd); err != nil {
			writeError(encoder, fmt.Sprintf("invalid command JSON: %v", err))
			continue
		}

		log.Printf("received op=%q input=%q", cmd.Op, cmd.InputPath)

		switch cmd.Op {
		case "unlock":
			handleUnlock(encoder, cmd)
		default:
			writeError(encoder, fmt.Sprintf("unknown operation: %q", cmd.Op))
		}
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("stdin read error: %v", err)
	}
}

// handleUnlock validates inputs then calls the unlock operation.
func handleUnlock(enc *json.Encoder, cmd pdf.Command) {
	if cmd.InputPath == "" || cmd.OutputPath == "" {
		writeError(enc, "inputPath and outputPath are required")
		return
	}
	if cmd.Password == "" {
		writeError(enc, "password is required")
		return
	}

	if err := pdf.Unlock(cmd.InputPath, cmd.OutputPath, cmd.Password); err != nil {
		log.Printf("unlock error: %v", err)
		writeError(enc, err.Error())
		return
	}

	log.Printf("unlock success: %q", cmd.OutputPath)
	_ = enc.Encode(pdf.Response{Success: true, OutputPath: cmd.OutputPath})
}

// writeError writes a failure Response to stdout.
func writeError(enc *json.Encoder, msg string) {
	_ = enc.Encode(pdf.Response{Success: false, Error: msg})
}
