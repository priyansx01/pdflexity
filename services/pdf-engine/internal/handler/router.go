package handler

import (
	"encoding/json"
	"fmt"

	"github.com/pdflexity/pdf-engine/internal/model"
)

// Route dispatches an incoming Command to the correct feature handler.
// Unknown ops return an error response — they never panic.
func Route(enc *json.Encoder, cmd model.Command) {
	switch cmd.Op {
	case "unlock":
		handleUnlock(enc, cmd)
	case "protect":
		handleProtect(enc, cmd)
	case "compare":
		handleCompare(enc, cmd)
	default:
		writeError(enc, fmt.Sprintf("unknown operation: %q", cmd.Op))
	}
}

// writeError is shared across all handlers in this package.
func writeError(enc *json.Encoder, msg string) {
	_ = enc.Encode(model.Response{Success: false, Error: msg})
}
