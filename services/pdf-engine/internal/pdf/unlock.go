package pdf

import (
	"fmt"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

// Unlock decrypts a password-protected PDF and writes the output file.
// Returns an error if the password is wrong or the file is not encrypted.
func Unlock(inputPath, outputPath, password string) error {
	conf := model.NewDefaultConfiguration()
	conf.UserPW = password
	conf.OwnerPW = password

	if err := api.DecryptFile(inputPath, outputPath, conf); err != nil {
		return fmt.Errorf("unlock failed: %w", err)
	}
	return nil
}
