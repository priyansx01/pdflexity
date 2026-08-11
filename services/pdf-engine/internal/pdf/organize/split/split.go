package split

import (
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

// Split extracts specific pages from inputPath to outDir as separate PDFs.
func Split(inputPath string, outDir string, selectedPages []string) error {
	conf := model.NewDefaultConfiguration()
	return api.ExtractPagesFile(inputPath, outDir, selectedPages, conf)
}

// Trim extracts specific pages from inputPath and merges them into a single PDF.
func Trim(inputPath string, outputPath string, selectedPages []string) error {
	conf := model.NewDefaultConfiguration()
	return api.TrimFile(inputPath, outputPath, selectedPages, conf)
}
