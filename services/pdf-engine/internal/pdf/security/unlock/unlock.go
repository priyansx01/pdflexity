package unlock

import (
	"fmt"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	pdfmodel "github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

// Decrypt removes password protection from an AES/RC4-encrypted PDF.
// Returns an error if the password is wrong or the file is not encrypted.
func Decrypt(inputPath, outputPath, password string) error {
	conf := pdfmodel.NewDefaultConfiguration()
	conf.UserPW = password
	conf.OwnerPW = password

	if err := api.DecryptFile(inputPath, outputPath, conf); err != nil {
		return fmt.Errorf("decrypt failed: %w", err)
	}
	return nil
}
