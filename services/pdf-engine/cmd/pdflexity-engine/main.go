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

	"github.com/pdflexity/pdf-engine/internal/handler"
	"github.com/pdflexity/pdf-engine/internal/model"
)

func main() {
	log.SetOutput(os.Stderr)
	log.SetPrefix("[pdf-engine] ")
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	log.Println("pdf-engine started, waiting for commands on stdin...")

	scanner := bufio.NewScanner(os.Stdin)
	// Commands can carry large inline JSON payloads (e.g. ocr-export embeds the
	// full OCR result + edits). The default 64 KB token cap would silently stop
	// the scanner mid-session and kill the engine, so raise it to 64 MB.
	scanner.Buffer(make([]byte, 0, 1<<20), 64<<20)
	encoder := json.NewEncoder(os.Stdout)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var cmd model.Command
		if err := json.Unmarshal(line, &cmd); err != nil {
			writeError(encoder, fmt.Sprintf("invalid command JSON: %v", err))
			continue
		}

		log.Printf("received op=%q input=%q", cmd.Op, cmd.InputPath)

		// `ocr-start` streams events for the whole job and would otherwise block
		// this loop, so a following `ocr-cancel` could never be read until the
		// job finished. Run it concurrently; the frontend/Rust bridge serialize
		// ops so the only command that arrives mid-job is `ocr-cancel`, which
		// writes nothing to stdout — no concurrent encoder writes occur.
		if cmd.Op == "ocr-start" {
			go handler.Route(encoder, cmd)
		} else {
			handler.Route(encoder, cmd)
		}
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("stdin read error: %v", err)
	}
}

func writeError(enc *json.Encoder, msg string) {
	_ = enc.Encode(model.Response{Success: false, Error: msg})
}
