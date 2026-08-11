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
		handler.Route(encoder, cmd)
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("stdin read error: %v", err)
	}
}

func writeError(enc *json.Encoder, msg string) {
	_ = enc.Encode(model.Response{Success: false, Error: msg})
}
