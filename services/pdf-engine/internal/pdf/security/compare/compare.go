package compare

import (
	"encoding/json"
	"fmt"
	"runtime"
	"strings"
	"sync"

	"github.com/ledongthuc/pdf"
	"github.com/sergi/go-diff/diffmatchpatch"
)

// ─── Output types ─────────────────────────────────────────────────────────────

type DiffType string

const (
	DiffEqual  DiffType = "equal"
	DiffInsert DiffType = "insert"
	DiffDelete DiffType = "delete"
)

type Change struct {
	Type DiffType `json:"type"`
	Text string   `json:"text"`
}

type PageResult struct {
	Page         int      `json:"page"`
	Changes      []Change `json:"changes"`
	AddedChars   int      `json:"addedChars"`
	DeletedChars int      `json:"deletedChars"`
	Similarity   int      `json:"similarity"`
}

type CompareResult struct {
	Pages        []PageResult `json:"pages"`
	TotalAdded   int          `json:"totalAdded"`
	TotalDeleted int          `json:"totalDeleted"`
	ChangedPages int          `json:"changedPages"`
	TotalPages   int          `json:"totalPages"`
	Similarity   int          `json:"similarity"`
}

// ─── Concurrent page extraction ───────────────────────────────────────────────

// workers caps the goroutine pool to avoid thrashing the OS file descriptor table.
var workers = func() int {
	n := runtime.NumCPU()
	if n < 2 {
		return 2
	}
	if n > 8 {
		return 8
	}
	return n
}()

type pageText struct {
	index int    // 0-based
	text  string // normalised plain text
}

// extractPages opens the PDF and extracts all pages concurrently using a
// bounded worker pool — each worker has its own file handle so there is no
// shared seek-position contention.
func extractPages(filePath string) ([]string, error) {
	// Open once just to get the page count, then close.
	f0, r0, err := pdf.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("open %q: %w", filePath, err)
	}
	numPages := r0.NumPage()
	f0.Close()

	if numPages == 0 {
		return []string{}, nil
	}

	pages := make([]string, numPages)

	// ── Worker pool ───────────────────────────────────────────────────────────

	jobs    := make(chan int, numPages) // page numbers (1-indexed)
	results := make(chan pageText, numPages)

	w := workers
	if numPages < w {
		w = numPages
	}

	var wg sync.WaitGroup
	for i := 0; i < w; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			// Each goroutine owns its own file handle.
			f, r, err := pdf.Open(filePath)
			if err != nil {
				return
			}
			defer f.Close()

			for pageNum := range jobs {
				page := r.Page(pageNum)
				text := ""
				if !page.V.IsNull() {
					if t, err := page.GetPlainText(nil); err == nil {
						text = strings.Join(strings.Fields(t), " ")
					}
				}
				results <- pageText{index: pageNum - 1, text: text}
			}
		}()
	}

	// Enqueue all page numbers, then signal end-of-work.
	for p := 1; p <= numPages; p++ {
		jobs <- p
	}
	close(jobs)

	// Close results once all workers are done.
	go func() { wg.Wait(); close(results) }()

	for pt := range results {
		pages[pt.index] = pt.text
	}
	return pages, nil
}

// ─── Diff computation (per page) ─────────────────────────────────────────────

func diffPage(textA, textB string) ([]Change, int, int, int) {
	dmp := diffmatchpatch.New()
	raw := dmp.DiffMain(textA, textB, false)
	dmp.DiffCleanupSemantic(raw)

	changes := make([]Change, 0, len(raw))
	added, deleted := 0, 0

	for _, d := range raw {
		switch d.Type {
		case diffmatchpatch.DiffInsert:
			changes = append(changes, Change{Type: DiffInsert, Text: d.Text})
			added += len(d.Text)
		case diffmatchpatch.DiffDelete:
			changes = append(changes, Change{Type: DiffDelete, Text: d.Text})
			deleted += len(d.Text)
		default:
			changes = append(changes, Change{Type: DiffEqual, Text: d.Text})
		}
	}

	maxLen := len(textA)
	if len(textB) > maxLen {
		maxLen = len(textB)
	}
	sim := 100
	if maxLen > 0 {
		eq := 0
		for _, c := range changes {
			if c.Type == DiffEqual {
				eq += len(c.Text)
			}
		}
		sim = (eq * 100) / maxLen
	}
	return changes, added, deleted, sim
}

// ─── Public entry point ───────────────────────────────────────────────────────

// Compare extracts text from both PDFs concurrently, diffs all pages in
// parallel, and returns a JSON-encoded CompareResult.
func Compare(pathA, pathB string) (string, error) {

	// ── Step 1: extract both files in parallel ────────────────────────────────

	var (
		pagesA []string
		pagesB []string
		errA   error
		errB   error
		extWg  sync.WaitGroup
	)
	extWg.Add(2)
	go func() { defer extWg.Done(); pagesA, errA = extractPages(pathA) }()
	go func() { defer extWg.Done(); pagesB, errB = extractPages(pathB) }()
	extWg.Wait()

	if errA != nil {
		return "", fmt.Errorf("extract original: %w", errA)
	}
	if errB != nil {
		return "", fmt.Errorf("extract modified: %w", errB)
	}

	// ── Step 2: diff all pages concurrently ───────────────────────────────────

	total := len(pagesA)
	if len(pagesB) > total {
		total = len(pagesB)
	}

	results := make([]PageResult, total)

	var diffWg sync.WaitGroup
	diffWg.Add(total)
	for i := 0; i < total; i++ {
		go func(idx int) {
			defer diffWg.Done()
			a, b := "", ""
			if idx < len(pagesA) {
				a = pagesA[idx]
			}
			if idx < len(pagesB) {
				b = pagesB[idx]
			}
			changes, added, deleted, sim := diffPage(a, b)
			results[idx] = PageResult{
				Page:         idx + 1,
				Changes:      changes,
				AddedChars:   added,
				DeletedChars: deleted,
				Similarity:   sim,
			}
		}(i)
	}
	diffWg.Wait()

	// ── Step 3: aggregate stats ───────────────────────────────────────────────

	totalAdded, totalDeleted, changedPages, simSum := 0, 0, 0, 0
	for _, r := range results {
		totalAdded += r.AddedChars
		totalDeleted += r.DeletedChars
		if r.AddedChars > 0 || r.DeletedChars > 0 {
			changedPages++
		}
		simSum += r.Similarity
	}

	overallSim := 100
	if total > 0 {
		overallSim = simSum / total
	}

	out, err := json.Marshal(CompareResult{
		Pages:        results,
		TotalAdded:   totalAdded,
		TotalDeleted: totalDeleted,
		ChangedPages: changedPages,
		TotalPages:   total,
		Similarity:   overallSim,
	})
	if err != nil {
		return "", fmt.Errorf("marshal: %w", err)
	}
	return string(out), nil
}
