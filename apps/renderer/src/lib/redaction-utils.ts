import type { RedactionMark, SearchResult, PageDimension } from "@/features/security/redact/types"

export interface PdfRect {
  x: number
  y: number
  width: number
  height: number
}

export function canvasRectToPdfPoints(
  canvasRect: { x: number; y: number; width: number; height: number },
  pageHeightPt: number,
  scale: number
): PdfRect {
  const x = canvasRect.x / scale
  const width = canvasRect.width / scale
  const height = canvasRect.height / scale
  const y = pageHeightPt - canvasRect.y / scale - height
  return { x, y, width, height }
}

export function pdfRectToCanvasRect(
  pdfRect: PdfRect,
  pageHeightPt: number,
  scale: number
): { x: number; y: number; width: number; height: number } {
  const x = pdfRect.x * scale
  const y = (pageHeightPt - pdfRect.y - pdfRect.height) * scale
  const width = pdfRect.width * scale
  const height = pdfRect.height * scale
  return { x, y, width, height }
}

export function mergeOverlappingMarks(marks: RedactionMark[], tolerance = 2): RedactionMark[] {
  if (marks.length <= 1) return marks

  const merged: RedactionMark[] = []
  const used = new Set<string>()

  for (const mark of marks) {
    if (used.has(mark.id)) continue

    let { x, y, width, height } = mark

    for (const other of marks) {
      if (mark.id === other.id || used.has(other.id)) continue

      if (Math.abs(x - other.x) < tolerance && Math.abs(y - other.y) < tolerance) {
        const minX = Math.min(x, other.x)
        const minY = Math.min(y, other.y)
        const maxX = Math.max(x + width, other.x + other.width)
        const maxY = Math.max(y + height, other.y + other.height)
        x = minX
        y = minY
        width = maxX - minX
        height = maxY - minY
        used.add(other.id)
      }
    }

    merged.push({ ...mark, x, y, width, height })
    used.add(mark.id)
  }

  return merged
}

export function padRect(rect: PdfRect, padding: number): PdfRect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

export function calculateViewerScale(
  canvasWidth: number,
  pageWidthPt: number,
  zoom: number
): number {
  const baseScale = canvasWidth / pageWidthPt
  return baseScale * zoom
}

export function getPageDimensions(
  dimensions: PageDimension[],
  pageNum: number
): PageDimension | null {
  return dimensions[pageNum - 1] || null
}

export function formatCoordinates(mark: RedactionMark): string {
  return `(${mark.x.toFixed(1)}, ${mark.y.toFixed(1)})`
}

export function formatDimensions(mark: RedactionMark): string {
  return `${mark.width.toFixed(1)} × ${mark.height.toFixed(1)}`
}

export function groupMarksByPage(marks: RedactionMark[]): Map<number, RedactionMark[]> {
  const groups = new Map<number, RedactionMark[]>()
  
  for (const mark of marks) {
    const existing = groups.get(mark.page) || []
    existing.push(mark)
    groups.set(mark.page, existing)
  }
  
  return groups
}

export function filterMarksByPage(marks: RedactionMark[], pageNum: number): RedactionMark[] {
  return marks.filter(m => m.page === pageNum)
}

export function searchResultToMark(result: SearchResult, source: "manual" | "search" = "search"): Omit<RedactionMark, "id"> {
  return {
    page: result.page,
    x: result.x,
    y: result.y,
    width: result.width,
    height: result.height,
    source,
    searchTerm: result.text,
  }
}

export function marksToBackendFormat(
  marks: RedactionMark[],
  appearance: { fillColor: string; overlayLabel: string; labelColor: string }
): Array<{
  page: number
  x: number
  y: number
  width: number
  height: number
  fillColor?: string
  label?: string
  labelColor?: string
}> {
  return marks.map(mark => ({
    page: mark.page,
    x: mark.x,
    y: mark.y,
    width: mark.width,
    height: mark.height,
    fillColor: appearance.fillColor,
    label: appearance.overlayLabel || undefined,
    labelColor: appearance.labelColor || undefined,
  }))
}
