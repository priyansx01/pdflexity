package handler

import (
	"encoding/json"
	"log"

	"github.com/pdflexity/pdf-engine/internal/model"
	"github.com/pdflexity/pdf-engine/internal/pdf/security/compare"
)

// handleCompare validates inputs and delegates to compare.Compare.
// The result JSON from Compare is embedded in Response.OutputPath for
// simplicity — the Electron layer unpacks it on the other side.
func handleCompare(enc *json.Encoder, cmd model.Command) {
	if cmd.InputPath == "" || cmd.InputPathB == "" {
		writeError(enc, "inputPath (original) and inputPathB (modified) are required")
		return
	}

	log.Printf("compare: %q vs %q", cmd.InputPath, cmd.InputPathB)

	result, err := compare.Compare(cmd.InputPath, cmd.InputPathB)
	if err != nil {
		log.Printf("compare error: %v", err)
		writeError(enc, err.Error())
		return
	}

	log.Printf("compare success: %d bytes of diff JSON", len(result))
	// OutputPath carries the JSON payload back to the Electron layer
	_ = enc.Encode(model.Response{Success: true, OutputPath: result})
}
