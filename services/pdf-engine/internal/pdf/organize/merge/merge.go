package merge

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

// Merge combines multiple PDF and image files into a single PDF.
// Images are automatically converted to A4 PDF pages with proper padding.
func Merge(inputPaths []string, outputPath string) error {
	conf := model.NewDefaultConfiguration()

	var finalPDFPaths []string
	var tempFiles []string

	defer func() {
		// Clean up temporary converted image PDFs
		for _, f := range tempFiles {
			os.Remove(f)
		}
	}()

	for _, p := range inputPaths {
		ext := strings.ToLower(filepath.Ext(p))
		if ext == ".png" || ext == ".jpg" || ext == ".jpeg" {
			// Convert image to a temporary PDF page
			tempPDF := p + "_img_temp.pdf"
			tempFiles = append(tempFiles, tempPDF)

			// f:A4 (A4 size), pos:c (center), sc:0.9 (90% scale for padding/margin)
			imp, err := pdfcpu.ParseImportDetails("f:A4, pos:c, sc:0.9", types.POINTS)
			if err != nil {
				return fmt.Errorf("failed to parse import details: %w", err)
			}

			err = api.ImportImagesFile([]string{p}, tempPDF, imp, conf)
			if err != nil {
				return fmt.Errorf("failed to import image %s: %w", p, err)
			}
			finalPDFPaths = append(finalPDFPaths, tempPDF)
		} else {
			finalPDFPaths = append(finalPDFPaths, p)
		}
	}

	return api.MergeCreateFile(finalPDFPaths, outputPath, false, conf)
}
