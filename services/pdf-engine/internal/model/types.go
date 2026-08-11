package model

// SignatureZone defines where the visual signature goes
type SignatureZone struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

// SignatureAppearance configures visual stamp options
type SignatureAppearance struct {
	ShowName   bool `json:"showName"`
	ShowDate   bool `json:"showDate"`
	ShowReason bool `json:"showReason"`
}

// RedactionMark defines a region to redact in PDF point coordinates
type RedactionMark struct {
	Page       int     `json:"page"`
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	Width      float64 `json:"width"`
	Height     float64 `json:"height"`
	FillColor  string  `json:"fillColor,omitempty"`
	Label      string  `json:"label,omitempty"`
	LabelColor string  `json:"labelColor,omitempty"`
}

// PageDim describes a single page's dimensions in PDF points
type PageDim struct {
	Page   int     `json:"page"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

// RedactionInfoResponse for /info endpoint
type RedactionInfoResponse struct {
	PageCount int        `json:"pageCount"`
	Pages     []PageDim `json:"pages"`
}

// SearchMatch represents a found text instance with its bounding box
type SearchMatch struct {
	Page   int     `json:"page"`
	Text   string  `json:"text"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

// SearchResponse for /search endpoint
type SearchResponse struct {
	Matches []SearchMatch `json:"matches"`
	Total   int           `json:"total"`
}

// PreviewResponse for /preview endpoint
type PreviewResponse struct {
	ImageBase64 string `json:"imageBase64"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
}

// RedactionResult for successful redact operation
type RedactionResult struct {
	MarksApplied   int   `json:"marksApplied"`
	PagesAffected  []int `json:"pagesAffected"`
}

// Command is the JSON-RPC request read from stdin.
// One JSON object per line — never batched.
type Command struct {
	Op          string   `json:"op"`
	InputPath   string   `json:"inputPath"`
	InputPathB  string   `json:"inputPathB,omitempty"` // compare: second input
	InputPaths  []string `json:"inputPaths,omitempty"` // merge: multiple inputs
	OutputPath  string   `json:"outputPath"`           // or OutputDir for split
	Password    string   `json:"password,omitempty"`

	// Split operations
	PageRanges  []string `json:"pageRanges,omitempty"`  // e.g., ["1-3", "5"]
	MergeOutput bool     `json:"mergeOutput,omitempty"` // true = trim to single file

	// Signing operations
	CertPath    string               `json:"certPath,omitempty"`
	Passphrase  string               `json:"passphrase,omitempty"`
	Page        int                  `json:"page,omitempty"`
	Zone        *SignatureZone       `json:"zone,omitempty"`
	Reason      string               `json:"reason,omitempty"`
	Location    string               `json:"location,omitempty"`
	Contact     string               `json:"contact,omitempty"`
	Appearance  *SignatureAppearance `json:"appearance,omitempty"`

	// Redaction operations
	Marks         []RedactionMark `json:"marks,omitempty"`
	Query         string          `json:"query,omitempty"`
	CaseSensitive bool            `json:"caseSensitive,omitempty"`
	Regex         bool            `json:"regex,omitempty"`
	Scale         float64         `json:"scale,omitempty"`

	// OCR operations
	Languages    []string `json:"languages,omitempty"`
	DPI          int      `json:"dpi,omitempty"`
	EnableGPU    bool     `json:"enableGpu,omitempty"`
	ExportFormat string   `json:"exportFormat,omitempty"`
	OCRData      string   `json:"ocrData,omitempty"`
	Edits        string   `json:"edits,omitempty"`
}

// Response is the JSON-RPC result written to stdout.
type Response struct {
	Success    bool   `json:"success"`
	OutputPath string `json:"outputPath,omitempty"`
	Error      string `json:"error,omitempty"`
	Data       any    `json:"data,omitempty"` // Flexible data payload for certInfo, verify, etc.
}

// ─── OCR Types ──────────────────────────────────────────────────────────────

// OCRStreamEvent is used for streaming OCR progress to the frontend.
// Multiple events are sent per job, one JSON line at a time.
type OCRStreamEvent struct {
	Type        string   `json:"type"`                       // "progress" | "page-result" | "page-image" | "complete" | "error"
	JobID       string   `json:"jobId,omitempty"`
	Status      string   `json:"status,omitempty"`           // OCR step name
	CurrentPage int      `json:"currentPage,omitempty"`
	TotalPages  int      `json:"totalPages,omitempty"`
	PageResult  *OCRPage `json:"pageResult,omitempty"`
	PageImage   *PageImage `json:"pageImage,omitempty"`
	Data        any      `json:"data,omitempty"`
	Error       string   `json:"error,omitempty"`
	Confidence  float64  `json:"overallConfidence,omitempty"`
	Languages   []string `json:"detectedLanguages,omitempty"`
}

type BBox struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

type OCRTextBlock struct {
	ID         string  `json:"id"`
	Text       string  `json:"text"`
	BBox       BBox    `json:"bbox"`
	Confidence float64 `json:"confidence"`
	BlockType  string  `json:"type"`
	FontSize   float64 `json:"fontSize"`
	FontWeight string  `json:"fontWeight"`
	FontStyle  string  `json:"fontStyle"`
	Alignment  string  `json:"alignment"`
	LineHeight float64 `json:"lineHeight"`
	Color      string  `json:"color"`
}

type OCRTableCell struct {
	Row        int     `json:"row"`
	Col        int     `json:"col"`
	RowSpan    int     `json:"rowSpan"`
	ColSpan    int     `json:"colSpan"`
	Text       string  `json:"text"`
	BBox       BBox    `json:"bbox"`
	Confidence float64 `json:"confidence"`
}

type OCRTable struct {
	ID         string         `json:"id"`
	BBox       BBox           `json:"bbox"`
	Rows       int            `json:"rows"`
	Cols       int            `json:"cols"`
	Cells      []OCRTableCell `json:"cells"`
	Confidence float64        `json:"confidence"`
}

type OCRImageRegion struct {
	ID        string `json:"id"`
	BBox      BBox   `json:"bbox"`
	ImageData string `json:"imageData,omitempty"`
}

type OCRPage struct {
	Page            int              `json:"page"`
	Width           float64          `json:"width"`
	Height          float64          `json:"height"`
	TextBlocks      []OCRTextBlock   `json:"textBlocks"`
	Tables          []OCRTable       `json:"tables"`
	Images          []OCRImageRegion `json:"images"`
	Language        string           `json:"language"`
	AvgConfidence   float64          `json:"avgConfidence"`
	ProcessingTime  int              `json:"processingTimeMs"`
	PageImageBase64 string           `json:"pageImageBase64,omitempty"`
}

type PageImage struct {
	Page        int    `json:"page"`
	ImageBase64 string `json:"imageBase64"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
}
