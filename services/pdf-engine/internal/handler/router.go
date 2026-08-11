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
	case "merge":
		handleMerge(enc, cmd)
	case "split":
		handleSplit(enc, cmd)
	case "sign":
		HandleSign(enc, cmd)
	case "verify":
		HandleVerify(enc, cmd)
	case "certInfo":
		HandleCertInfo(enc, cmd)
	case "redactInfo":
		handleRedactInfo(enc, cmd)
	case "redactSearch":
		handleRedactSearch(enc, cmd)
	case "redactPreview":
		handleRedactPreview(enc, cmd)
	case "redact":
		handleRedact(enc, cmd)
	case "ocr-start":
		handleOCRStart(enc, cmd)
	case "ocr-cancel":
		handleOCRCancel(enc, cmd)
	case "ocr-render-page":
		handleOCRRenderPage(enc, cmd)
	case "ocr-export":
		handleOCRExport(enc, cmd)
	default:
		writeError(enc, fmt.Sprintf("unknown operation: %q", cmd.Op))
	}
}

// writeError is shared across all handlers in this package.
func writeError(enc *json.Encoder, msg string) {
	_ = enc.Encode(model.Response{Success: false, Error: msg})
}
