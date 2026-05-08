"use client"

import { useCallback, useEffect, useRef } from "react"
import { useOcrStore } from "@/stores/use-ocr-store"
import type { OCRProgressEvent, OCRPageResult } from "@/features/optimize/ocr/types"

/**
 * Hook that wires the OCR Zustand store to Electron IPC events.
 * Handles: starting OCR, cancelling, listening for streaming progress,
 * and exporting results.
 */
export function useOcrPipeline() {
  const store = useOcrStore()
  const listenerRegistered = useRef(false)

  // Register IPC event listeners for streaming progress
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).electronAPI) return
    if (listenerRegistered.current) return
    listenerRegistered.current = true

    const api = (window as any).electronAPI.pdf?.ocr
    if (!api) return

    api.onProgress((_event: any, data: OCRProgressEvent) => {
      if (data.status) {
        useOcrStore.getState().setStep(data.status)
      }
      if (data.currentPage && data.totalPages) {
        useOcrStore.getState().setProgress(data.currentPage, data.totalPages)
      }
    })

    api.onPageResult((_event: any, data: OCRProgressEvent) => {
      if (data.type === "page-result" && data.pageResult) {
        useOcrStore.getState().addPageResult(data.pageResult as unknown as OCRPageResult)
      }
      if (data.type === "page-image" && data.pageImage) {
        useOcrStore.getState().setPageImage(data.pageImage.page, data.pageImage.imageBase64)
      }
    })

    return () => {
      api.removeListeners()
      listenerRegistered.current = false
    }
  }, [])

  // Start OCR processing
  const startOcr = useCallback(async () => {
    const { uploadedFile, options } = useOcrStore.getState()
    if (!uploadedFile) return

    const api = (window as any).electronAPI?.pdf?.ocr
    if (!api) {
      // Fallback: use mock data for development without Electron
      await runMockOcr()
      return
    }

    useOcrStore.getState().setStep("uploading")

    try {
      const result = await api.start(
        uploadedFile.buffer,
        uploadedFile.name,
        options.languages,
        options.dpi
      )

      if (result.success) {
        useOcrStore.getState().setJobId(result.jobId)
        useOcrStore.getState().setCompletionData(
          result.data?.overallConfidence ?? 0,
          result.data?.detectedLanguages ?? []
        )
      } else {
        useOcrStore.getState().setError(result.error || "OCR processing failed")
      }
    } catch (err: any) {
      useOcrStore.getState().setError(err.message || "OCR processing failed")
    }
  }, [])

  // Cancel OCR
  const cancelOcr = useCallback(async () => {
    const { jobId } = useOcrStore.getState()
    if (!jobId) return

    const api = (window as any).electronAPI?.pdf?.ocr
    if (api) {
      await api.cancel(jobId)
    }
    useOcrStore.getState().setStep("idle")
  }, [])

  // Export results
  const exportResults = useCallback(async (format: string) => {
    const { uploadedFile, pageResults, editedBlocks } = useOcrStore.getState()
    if (!uploadedFile) return

    const api = (window as any).electronAPI?.pdf?.ocr
    if (!api) {
      // Mock export for development
      alert(`Export as ${format} — requires Electron runtime`)
      return
    }

    try {
      // Convert page results to serializable format
      const ocrData = Array.from(pageResults.values())
      const edits: Record<string, any> = {}
      for (const [id, block] of editedBlocks) {
        edits[id] = { text: block.text }
      }

      const result = await api.export(
        uploadedFile.buffer,
        uploadedFile.name,
        format,
        ocrData,
        edits
      )

      if (result.success) {
        // Create download from base64
        const binaryStr = atob(result.data)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i)
        }

        const mimeMap: Record<string, string> = {
          "editable-pdf": "application/pdf",
          "searchable-pdf": "application/pdf",
          "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "json": "application/json",
        }

        const blob = new Blob([bytes], { type: mimeMap[format] || "application/octet-stream" })
        const url = URL.createObjectURL(blob)
        useOcrStore.getState().setExportUrl(url)

        // Trigger download
        const a = document.createElement("a")
        a.href = url
        a.download = result.fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        useOcrStore.getState().setError(result.error || "Export failed")
      }
    } catch (err: any) {
      useOcrStore.getState().setError(err.message || "Export failed")
    }
  }, [])

  return { startOcr, cancelOcr, exportResults }
}

/**
 * Mock OCR pipeline for development without Electron/PaddleOCR.
 * Generates realistic-looking OCR results with simulated delays.
 */
async function runMockOcr() {
  const { uploadedFile } = useOcrStore.getState()
  if (!uploadedFile) return

  const totalPages = 3 // Simulated page count
  const store = useOcrStore.getState()

  // Simulate pipeline stages
  const stages = [
    { step: "uploading" as const, delay: 400 },
    { step: "rendering" as const, delay: 600 },
    { step: "detecting-layout" as const, delay: 800 },
  ]

  for (const { step, delay } of stages) {
    store.setStep(step)
    await sleep(delay)
  }

  for (let page = 1; page <= totalPages; page++) {
    store.setStep("running-ocr")
    store.setProgress(page, totalPages)
    await sleep(500)

    // Generate mock text blocks
    const blocks = generateMockBlocks(page, 612, 792)
    
    const pageResult: OCRPageResult = {
      page,
      width: 612,
      height: 792,
      textBlocks: blocks,
      tables: [],
      images: [],
      language: "en",
      avgConfidence: 0.87 + Math.random() * 0.1,
      processingTimeMs: 800 + Math.random() * 400,
    }

    store.addPageResult(pageResult)
  }

  store.setStep("rebuilding")
  await sleep(400)
  store.setCompletionData(0.91, ["en"])
}

function generateMockBlocks(page: number, pageW: number, pageH: number) {
  const blocks = [
    {
      id: `p${page}-title`,
      text: page === 1 ? "Quarterly Business Report" : page === 2 ? "Financial Analysis" : "Appendix & Notes",
      bbox: { x: 72, y: 60, width: 468, height: 32 },
      confidence: 0.98,
      type: "heading" as const,
      fontSize: 24,
      fontWeight: "bold" as const,
      fontStyle: "normal" as const,
      alignment: "left" as const,
      lineHeight: 33.6,
      color: "#000000",
    },
    {
      id: `p${page}-subtitle`,
      text: page === 1 ? "Q4 2025 — Internal Distribution" : page === 2 ? "Revenue & Growth Metrics" : "Supporting Documentation",
      bbox: { x: 72, y: 100, width: 350, height: 18 },
      confidence: 0.95,
      type: "paragraph" as const,
      fontSize: 14,
      fontWeight: "normal" as const,
      fontStyle: "normal" as const,
      alignment: "left" as const,
      lineHeight: 19.6,
      color: "#444444",
    },
    {
      id: `p${page}-body1`,
      text: "This document contains confidential information regarding the company's operational performance during the fourth quarter. All metrics presented have been verified by the finance department and approved for internal review. Distribution outside the organization is strictly prohibited without prior written consent.",
      bbox: { x: 72, y: 140, width: 468, height: 52 },
      confidence: 0.92,
      type: "paragraph" as const,
      fontSize: 11,
      fontWeight: "normal" as const,
      fontStyle: "normal" as const,
      alignment: "justify" as const,
      lineHeight: 15.4,
      color: "#000000",
    },
    {
      id: `p${page}-body2`,
      text: "Key highlights include a 23% year-over-year revenue increase, improved operational efficiency across all departments, and successful completion of the digital transformation initiative. Customer satisfaction scores reached an all-time high of 94.2%, reflecting our commitment to service excellence.",
      bbox: { x: 72, y: 210, width: 468, height: 52 },
      confidence: 0.89,
      type: "paragraph" as const,
      fontSize: 11,
      fontWeight: "normal" as const,
      fontStyle: "normal" as const,
      alignment: "justify" as const,
      lineHeight: 15.4,
      color: "#000000",
    },
    {
      id: `p${page}-heading2`,
      text: page === 1 ? "Executive Summary" : page === 2 ? "Market Analysis" : "Data Sources",
      bbox: { x: 72, y: 290, width: 300, height: 22 },
      confidence: 0.96,
      type: "heading" as const,
      fontSize: 18,
      fontWeight: "bold" as const,
      fontStyle: "normal" as const,
      alignment: "left" as const,
      lineHeight: 25.2,
      color: "#000000",
    },
    {
      id: `p${page}-body3`,
      text: "The organization demonstrated remarkable resilience in a challenging economic environment. Strategic investments in technology infrastructure and talent development have positioned the company for sustained growth. Our market share expanded by 4.7 percentage points, reaching 31.2% in our primary segment.",
      bbox: { x: 72, y: 330, width: 468, height: 52 },
      confidence: 0.85,
      type: "paragraph" as const,
      fontSize: 11,
      fontWeight: "normal" as const,
      fontStyle: "normal" as const,
      alignment: "justify" as const,
      lineHeight: 15.4,
      color: "#000000",
    },
    {
      id: `p${page}-list1`,
      text: "• Revenue growth: $142.3M (+23% YoY)",
      bbox: { x: 90, y: 400, width: 350, height: 16 },
      confidence: 0.93,
      type: "list-item" as const,
      fontSize: 11,
      fontWeight: "normal" as const,
      fontStyle: "normal" as const,
      alignment: "left" as const,
      lineHeight: 15.4,
      color: "#000000",
    },
    {
      id: `p${page}-list2`,
      text: "• Operating margin: 18.4% (+2.1 pp)",
      bbox: { x: 90, y: 420, width: 350, height: 16 },
      confidence: 0.91,
      type: "list-item" as const,
      fontSize: 11,
      fontWeight: "normal" as const,
      fontStyle: "normal" as const,
      alignment: "left" as const,
      lineHeight: 15.4,
      color: "#000000",
    },
    {
      id: `p${page}-list3`,
      text: "• Customer retention: 96.8% (+1.3 pp)",
      bbox: { x: 90, y: 440, width: 350, height: 16 },
      confidence: 0.72,
      type: "list-item" as const,
      fontSize: 11,
      fontWeight: "normal" as const,
      fontStyle: "normal" as const,
      alignment: "left" as const,
      lineHeight: 15.4,
      color: "#000000",
    },
    {
      id: `p${page}-body4`,
      text: "Looking ahead to the next fiscal year, management expects continued momentum driven by new product launches and geographic expansion. The board has approved an increased R&D budget to accelerate innovation in artificial intelligence and machine learning capabilities.",
      bbox: { x: 72, y: 480, width: 468, height: 52 },
      confidence: 0.88,
      type: "paragraph" as const,
      fontSize: 11,
      fontWeight: "normal" as const,
      fontStyle: "normal" as const,
      alignment: "justify" as const,
      lineHeight: 15.4,
      color: "#000000",
    },
    {
      id: `p${page}-footer`,
      text: `Page ${page} of ${3} — Confidential`,
      bbox: { x: 72, y: 750, width: 200, height: 12 },
      confidence: 0.94,
      type: "footer" as const,
      fontSize: 9,
      fontWeight: "normal" as const,
      fontStyle: "normal" as const,
      alignment: "left" as const,
      lineHeight: 12.6,
      color: "#888888",
    },
  ]

  return blocks
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
