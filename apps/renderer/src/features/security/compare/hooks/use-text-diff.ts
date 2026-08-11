"use client"

import { useMemo } from "react"
import { diffWords } from "diff"
import type { TextItem, PageDiff, DiffChange, CompareStats } from "../types"

function itemsToString(items: TextItem[]): string {
  return items.map(i => i.str).join(" ").replace(/\s+/g, " ").trim()
}

function levenshteinSimilarity(a: string, b: string): number {
  if (!a && !b) return 100
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 100
  // Approx similarity via diff
  const diffs = diffWords(a, b)
  const equalChars = diffs
    .filter(d => !d.added && !d.removed)
    .reduce((acc, d) => acc + d.value.length, 0)
  return Math.round((equalChars / maxLen) * 100)
}

export function useTextDiff(
  textA: TextItem[][],   // per-page text items for doc A
  textB: TextItem[][],   // per-page text items for doc B
): { diffs: PageDiff[]; stats: CompareStats } {
  return useMemo(() => {
    const totalPages = Math.max(textA.length, textB.length)
    const diffs: PageDiff[] = []

    for (let p = 0; p < totalPages; p++) {
      const strA = itemsToString(textA[p] ?? [])
      const strB = itemsToString(textB[p] ?? [])

      const rawDiffs = diffWords(strA, strB)
      const changes: DiffChange[] = rawDiffs.map(d => ({
        type: d.added ? "insert" : d.removed ? "delete" : "equal",
        text: d.value,
      }))

      const addedChars   = changes.filter(c => c.type === "insert").reduce((s, c) => s + c.text.length, 0)
      const deletedChars = changes.filter(c => c.type === "delete").reduce((s, c) => s + c.text.length, 0)
      const similarity   = levenshteinSimilarity(strA, strB)

      diffs.push({ page: p + 1, changes, addedChars, deletedChars, similarity })
    }

    const totalAdded   = diffs.reduce((s, d) => s + d.addedChars, 0)
    const totalDeleted = diffs.reduce((s, d) => s + d.deletedChars, 0)
    const changedPages = diffs.filter(d => d.addedChars > 0 || d.deletedChars > 0).length
    const overallSim   = totalPages > 0
      ? Math.round(diffs.reduce((s, d) => s + d.similarity, 0) / totalPages)
      : 100

    const stats: CompareStats = {
      totalAdded,
      totalDeleted,
      changedPages,
      totalPages,
      similarity: overallSim,
    }

    return { diffs, stats }
  }, [textA, textB])
}
