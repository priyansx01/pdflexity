package handler

import (
	"encoding/json"

	"github.com/pdflexity/pdf-engine/internal/model"
	"github.com/pdflexity/pdf-engine/internal/pdf/organize/split"
)

func handleSplit(enc *json.Encoder, cmd model.Command) {
	if cmd.MergeOutput {
		if err := split.Trim(cmd.InputPath, cmd.OutputPath, cmd.PageRanges); err != nil {
			writeError(enc, err.Error())
			return
		}
	} else {
		if err := split.Split(cmd.InputPath, cmd.OutputPath, cmd.PageRanges); err != nil {
			writeError(enc, err.Error())
			return
		}
	}

	_ = enc.Encode(model.Response{
		Success:    true,
		OutputPath: cmd.OutputPath,
	})
}
