package repair

import (
	"fmt"
	"os"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	pdfmodel "github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

// Repair rebuilds a damaged PDF: pdfcpu's low-level reader re-scans the raw
// bytes, reconstructs the cross-reference table/trailer and recovers every
// reachable object; writing the context emits a clean, valid document.
// Validation is skipped — salvageable files must not be rejected for spec
// violations. (v0.12 has no dedicated RepairFile API; Read+Write IS repair.)
func Repair(inputPath, outputPath string) error {
	f, err := os.Open(inputPath)
	if err != nil {
		return fmt.Errorf("repair failed: %w", err)
	}
	defer f.Close()

	conf := pdfmodel.NewDefaultConfiguration()
	conf.ValidationMode = pdfmodel.ValidationRelaxed

	ctx, err := api.ReadContext(f, conf)
	if err != nil {
		return fmt.Errorf("repair failed: %w", err)
	}

	if err := api.WriteContextFile(ctx, outputPath); err != nil {
		return fmt.Errorf("repair failed: %w", err)
	}
	return nil
}
