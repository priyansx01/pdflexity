package protect

import (
	"fmt"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	pdfmodel "github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

// Encrypt applies AES-256 password protection to a PDF.
// If ownerPassword is empty it defaults to userPassword.
func Encrypt(inputPath, outputPath, userPassword, ownerPassword string) error {
	if ownerPassword == "" {
		ownerPassword = userPassword
	}

	conf := pdfmodel.NewAESConfiguration(userPassword, ownerPassword, 256)
	conf.ValidationMode = pdfmodel.ValidationRelaxed

	if err := api.EncryptFile(inputPath, outputPath, conf); err != nil {
		return fmt.Errorf("encrypt failed: %w", err)
	}
	return nil
}
