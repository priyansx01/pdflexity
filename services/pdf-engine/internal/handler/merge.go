package handler

import (
	"encoding/json"
	"log"

	"github.com/pdflexity/pdf-engine/internal/model"
	"github.com/pdflexity/pdf-engine/internal/pdf/organize/merge"
)

// handleMerge validates inputs and delegates to merge.Merge.
func handleMerge(enc *json.Encoder, cmd model.Command) {
	if len(cmd.InputPaths) < 2 {
		writeError(enc, "at least two input paths are required for merging")
		return
	}
	if cmd.OutputPath == "" {
		writeError(enc, "outputPath is required")
		return
	}

	log.Printf("merge: %d files -> %q", len(cmd.InputPaths), cmd.OutputPath)

	if err := merge.Merge(cmd.InputPaths, cmd.OutputPath); err != nil {
		log.Printf("merge error: %v", err)
		writeError(enc, err.Error())
		return
	}

	log.Printf("merge success: %q", cmd.OutputPath)
	_ = enc.Encode(model.Response{Success: true, OutputPath: cmd.OutputPath})
}
