package handler

import (
	"encoding/json"

	"github.com/pdflexity/pdf-engine/internal/model"
	"github.com/pdflexity/pdf-engine/internal/pdf/security/sign"
)

// HandleSign processes the 'sign' operation
func HandleSign(enc *json.Encoder, cmd model.Command) {
	req := sign.SignRequest{
		PdfPath:    cmd.InputPath,
		OutputPath: cmd.OutputPath,
		CertPath:   cmd.CertPath,
		Passphrase: cmd.Passphrase,
		Page:       cmd.Page,
		Zone:       cmd.Zone,
		Reason:     cmd.Reason,
		Location:   cmd.Location,
		Contact:    cmd.Contact,
		Appearance: cmd.Appearance,
	}

	if err := sign.SignPDF(req); err != nil {
		writeError(enc, err.Error())
		return
	}

	_ = enc.Encode(model.Response{
		Success:    true,
		OutputPath: cmd.OutputPath,
	})
}

// HandleVerify processes the 'verify' operation
func HandleVerify(enc *json.Encoder, cmd model.Command) {
	res, err := sign.VerifyPDF(cmd.InputPath)
	if err != nil {
		writeError(enc, err.Error())
		return
	}

	_ = enc.Encode(model.Response{
		Success: true,
		Data:    res,
	})
}

// HandleCertInfo processes the 'certInfo' operation
func HandleCertInfo(enc *json.Encoder, cmd model.Command) {
	info, err := sign.GetCertInfo(cmd.CertPath, cmd.Passphrase)
	if err != nil {
		writeError(enc, err.Error())
		return
	}

	_ = enc.Encode(model.Response{
		Success: true,
		Data:    info,
	})
}
