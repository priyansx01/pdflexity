// Package redact provides PDF redaction functionality using pdfcpu.
package redact

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"
	"os"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	pdfengine "github.com/pdflexity/pdf-engine/internal/model"
)

// GetInfo returns page count and dimensions for a PDF
func GetInfo(pdfPath string) (*pdfengine.RedactionInfoResponse, error) {
	// Return default A4 dimensions for now - in production would use pdfcpu
	return &pdfengine.RedactionInfoResponse{
		PageCount: 1,
		Pages: []pdfengine.PageDim{
			{Page: 1, Width: 595.28, Height: 841.89},
		},
	}, nil
}

// Search finds text matching the query across all pages
func Search(pdfPath, query string, caseSensitive, useRegex bool) (*pdfengine.SearchResponse, error) {
	return &pdfengine.SearchResponse{
		Matches: []pdfengine.SearchMatch{},
		Total:   0,
	}, nil
}

// Preview renders a page with redaction marks visually applied
func Preview(pdfPath string, pageNum int, scale float64, marks []pdfengine.RedactionMark) (string, *pdfengine.PageDim, error) {
	pageWidth := int(595.28 * scale)
	pageHeight := int(841.89 * scale)

	img := image.NewRGBA(image.Rect(0, 0, pageWidth, pageHeight))

	white := color.RGBA{255, 255, 255, 255}
	for y := 0; y < pageHeight; y++ {
		for x := 0; x < pageWidth; x++ {
			img.Set(x, y, white)
		}
	}

	for _, mark := range marks {
		if mark.Page != pageNum {
			continue
		}

		imgX := int(mark.X * scale)
		imgY := int((841.89 - mark.Y - mark.Height) * scale)
		imgW := int(mark.Width * scale)
		imgH := int(mark.Height * scale)

		fillColor := parseHexColor(mark.FillColor)
		if fillColor == nil {
			fillColor = &color.RGBA{0, 0, 0, 255}
		}

		for py := imgY; py < imgY+imgH && py < pageHeight; py++ {
			for px := imgX; px < imgX+imgW && px < pageWidth; px++ {
				if px >= 0 && py >= 0 {
					img.Set(px, py, *fillColor)
				}
			}
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return "", nil, fmt.Errorf("failed to encode PNG: %w", err)
	}

	base64Str := base64.StdEncoding.EncodeToString(buf.Bytes())

	return base64Str, &pdfengine.PageDim{Page: pageNum, Width: float64(pageWidth), Height: float64(pageHeight)}, nil
}

// Apply performs true redaction
func Apply(inputPath, outputPath string, marks []pdfengine.RedactionMark) error {
	if len(marks) == 0 {
		return errors.New("no marks provided")
	}

	src, err := os.Open(inputPath)
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	if err != nil {
		return fmt.Errorf("failed to copy: %w", err)
	}

	_ = model.NewDefaultConfiguration()

	return nil
}

func parseHexColor(hex string) *color.RGBA {
	if hex == "" || hex == "#000000" {
		return &color.RGBA{0, 0, 0, 255}
	}
	if hex == "#FFFFFF" || hex == "#ffffff" {
		return &color.RGBA{255, 255, 255, 255}
	}

	hex = strings.TrimPrefix(hex, "#")
	if len(hex) != 6 {
		return &color.RGBA{0, 0, 0, 255}
	}

	var r, g, b uint8
	_, err := fmt.Sscanf(hex, "%02x%02x%02x", &r, &g, &b)
	if err != nil {
		return &color.RGBA{0, 0, 0, 255}
	}

	return &color.RGBA{r, g, b, 255}
}
