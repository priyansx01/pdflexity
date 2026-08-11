package handler

import (
	"encoding/json"
	"log"

	"github.com/pdflexity/pdf-engine/internal/model"
	"github.com/pdflexity/pdf-engine/internal/pdf/security/unlock"
)

// handleUnlock validates the command and calls the unlock operation.
func handleUnlock(enc *json.Encoder, cmd model.Command) {
	if cmd.InputPath == "" || cmd.OutputPath == "" {
		writeError(enc, "inputPath and outputPath are required")
		return
	}
	if cmd.Password == "" {
		writeError(enc, "password is required")
		return
	}

	if err := unlock.Decrypt(cmd.InputPath, cmd.OutputPath, cmd.Password); err != nil {
		log.Printf("unlock error: %v", err)
		writeError(enc, err.Error())
		return
	}

	log.Printf("unlock success: %q", cmd.OutputPath)
	_ = enc.Encode(model.Response{Success: true, OutputPath: cmd.OutputPath})
}
