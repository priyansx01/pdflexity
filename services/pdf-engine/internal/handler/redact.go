package handler

import (
	"encoding/json"
	"log"

	"github.com/pdflexity/pdf-engine/internal/model"
	"github.com/pdflexity/pdf-engine/internal/pdf/security/redact"
)

func handleRedactInfo(enc *json.Encoder, cmd model.Command) {
	if cmd.InputPath == "" {
		writeError(enc, "inputPath is required")
		return
	}

	info, err := redact.GetInfo(cmd.InputPath)
	if err != nil {
		log.Printf("redact info error: %v", err)
		writeError(enc, err.Error())
		return
	}

	_ = enc.Encode(model.Response{Success: true, Data: info})
}

func handleRedactSearch(enc *json.Encoder, cmd model.Command) {
	if cmd.InputPath == "" || cmd.Query == "" {
		writeError(enc, "inputPath and query are required")
		return
	}

	results, err := redact.Search(cmd.InputPath, cmd.Query, cmd.CaseSensitive, cmd.Regex)
	if err != nil {
		log.Printf("redact search error: %v", err)
		writeError(enc, err.Error())
		return
	}

	_ = enc.Encode(model.Response{Success: true, Data: results})
}

func handleRedactPreview(enc *json.Encoder, cmd model.Command) {
	if cmd.InputPath == "" || cmd.Page == 0 {
		writeError(enc, "inputPath and page are required")
		return
	}

	imageBase64, dims, err := redact.Preview(cmd.InputPath, cmd.Page, cmd.Scale, cmd.Marks)
	if err != nil {
		log.Printf("redact preview error: %v", err)
		writeError(enc, err.Error())
		return
	}

	_ = enc.Encode(model.Response{Success: true, Data: model.PreviewResponse{
		ImageBase64: imageBase64,
		Width:       int(dims.Width),
		Height:      int(dims.Height),
	}})
}

func handleRedact(enc *json.Encoder, cmd model.Command) {
	if cmd.InputPath == "" || cmd.OutputPath == "" {
		writeError(enc, "inputPath and outputPath are required")
		return
	}
	if len(cmd.Marks) == 0 {
		writeError(enc, "at least one mark is required")
		return
	}

	err := redact.Apply(cmd.InputPath, cmd.OutputPath, cmd.Marks)
	if err != nil {
		log.Printf("redact error: %v", err)
		writeError(enc, err.Error())
		return
	}

	log.Printf("redact success: %q with %d marks", cmd.OutputPath, len(cmd.Marks))
	
	pagesAffected := getUniquePages(cmd.Marks)
	_ = enc.Encode(model.Response{
		Success:    true,
		OutputPath: cmd.OutputPath,
		Data: model.RedactionResult{
			MarksApplied:  len(cmd.Marks),
			PagesAffected: pagesAffected,
		},
	})
}

func getUniquePages(marks []model.RedactionMark) []int {
	seen := make(map[int]bool)
	var pages []int
	for _, m := range marks {
		if !seen[m.Page] {
			seen[m.Page] = true
			pages = append(pages, m.Page)
		}
	}
	return pages
}
