package handler

import (
	"encoding/json"
	"log"

	"github.com/pdflexity/pdf-engine/internal/model"
	"github.com/pdflexity/pdf-engine/internal/pdf/optimize/repair"
)

// handleRepair validates the command and calls the repair operation.
func handleRepair(enc *json.Encoder, cmd model.Command) {
	if cmd.InputPath == "" || cmd.OutputPath == "" {
		writeError(enc, "inputPath and outputPath are required")
		return
	}

	if err := repair.Repair(cmd.InputPath, cmd.OutputPath); err != nil {
		log.Printf("repair error: %v", err)
		writeError(enc, err.Error())
		return
	}

	log.Printf("repair success: %q", cmd.OutputPath)
	_ = enc.Encode(model.Response{Success: true, OutputPath: cmd.OutputPath})
}
