import type { BookPageRecord, SkyxBookProject } from "@/lib/book-engine/types";

export interface BulkCleanupOptions {
  stripPageNumbers: boolean;
  fixHyphenLineWraps: boolean;
  normalizeBanglaUnicode: boolean;
  joinBrokenParagraphs: boolean;
  removeLinesExact: string[];
  findText?: string;
  replaceText?: string;
}

export interface DetectedRunningLine {
  text: string;
  occurrences: number;
  position: "header" | "footer" | "both";
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function recalcProjectTotals(project: SkyxBookProject, pages: BookPageRecord[]): SkyxBookProject {
  const totalWords = pages.reduce((sum, p) => sum + p.wordCount, 0);
  const totalChars = pages.reduce((sum, p) => sum + p.charCount, 0);
  const scannedPageCount = pages.filter((p) => p.isLikelyScanned).length;
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    extraction: {
      ...project.extraction,
      totalPages: pages.length,
      totalWords,
      totalChars,
      scannedPageCount,
    },
    pages,
  };
}

/**
 * Detects repeated running headers and footers across active pages.
 */
export function detectRepeatedHeadersFooters(
  pages: BookPageRecord[]
): DetectedRunningLine[] {
  const activePages = pages.filter((p) => p.status !== "skipped" && p.cleanedText.trim().length > 0);
  if (activePages.length < 3) return [];

  const headerCounts = new Map<string, number>();
  const footerCounts = new Map<string, number>();

  for (const page of activePages) {
    const lines = page.cleanedText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;

    const first = lines[0];
    const last = lines[lines.length - 1];

    if (first.length >= 3 && first.length <= 120) {
      headerCounts.set(first, (headerCounts.get(first) ?? 0) + 1);
    }
    if (last.length >= 3 && last.length <= 120) {
      footerCounts.set(last, (footerCounts.get(last) ?? 0) + 1);
    }
  }

  const threshold = Math.max(2, Math.ceil(activePages.length * 0.35));
  const combined = new Map<string, DetectedRunningLine>();

  for (const [text, count] of headerCounts.entries()) {
    if (count >= threshold) {
      combined.set(text, { text, occurrences: count, position: "header" });
    }
  }

  for (const [text, count] of footerCounts.entries()) {
    if (count >= threshold) {
      const existing = combined.get(text);
      if (existing) {
        existing.occurrences = Math.max(existing.occurrences, count);
        existing.position = "both";
      } else {
        combined.set(text, { text, occurrences: count, position: "footer" });
      }
    }
  }

  return Array.from(combined.values())
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 12);
}

function isStandalonePageNumberLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 32) return false;
  return (
    /^[-—–|•·\s]*[0-9০-৯]+[-—–|•·\s]*$/.test(trimmed) ||
    /^(?:page|pg\.?|p\.?|পৃষ্ঠা|পাতা)\s*[-:.]?\s*[0-9০-৯]+(?:\s*(?:of|\/)\s*[0-9০-৯]+)?$/i.test(
      trimmed
    )
  );
}

function normalizeBanglaText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u200B\u200E\u200F\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    // Clean spaces before Bengali danda (।) and common punctuation
    .replace(/[ \t]+([।,;:?!])/g, "$1")
    // Ensure a single space after Bengali danda when followed directly by a word
    .replace(/।([^\s\n"'”’)\]])/g, "। $1")
    // Collapse multiple spaces inside lines
    .replace(/[ \t]{2,}/g, " ");
}

function joinSoftLineBreaks(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((block) => {
      const lines = block.split("\n");
      if (lines.length <= 1) return block;
      const out: string[] = [];
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        const isStructured =
          /^(?:#{1,6}\s|[-*•]\s|[0-9০-৯]+[.)]\s|\||>|```)/.test(line);
        if (out.length === 0 || isStructured) {
          out.push(line);
        } else {
          const prev = out[out.length - 1];
          const prevIsStructured =
            /^(?:#{1,6}\s|[-*•]\s|[0-9০-৯]+[.)]\s|\||>|```)/.test(prev);
          if (prevIsStructured || /[.:?!।]$/.test(prev) && line.length < 48) {
            out.push(line);
          } else {
            out[out.length - 1] = `${prev} ${line}`;
          }
        }
      }
      return out.join("\n");
    })
    .join("\n\n");
}

export function cleanSingleText(text: string, options: BulkCleanupOptions): string {
  let result = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const exactRemoveSet = new Set(
    options.removeLinesExact.map((l) => l.trim()).filter(Boolean)
  );

  if (options.stripPageNumbers || exactRemoveSet.size > 0) {
    const lines = result.split("\n");
    const filtered = lines.filter((line) => {
      const trimmed = line.trim();
      if (exactRemoveSet.size > 0 && exactRemoveSet.has(trimmed)) {
        return false;
      }
      if (options.stripPageNumbers && isStandalonePageNumberLine(trimmed)) {
        return false;
      }
      return true;
    });
    result = filtered.join("\n");
  }

  if (options.fixHyphenLineWraps) {
    result = result.replace(/([A-Za-z\u0980-\u09FF])-\n([A-Za-z\u0980-\u09FF])/g, "$1$2");
  }

  if (options.joinBrokenParagraphs) {
    result = joinSoftLineBreaks(result);
  }

  if (options.normalizeBanglaUnicode) {
    result = normalizeBanglaText(result);
  }

  if (options.findText && options.findText.length > 0) {
    // Safe literal global replacement (zero regex/ReDoS exposure)
    result = result.split(options.findText).join(options.replaceText ?? "");
  }

  return result
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function applyBulkCleanupToProject(
  project: SkyxBookProject,
  options: BulkCleanupOptions
): { project: SkyxBookProject; modifiedCount: number } {
  let modifiedCount = 0;

  const nextPages: BookPageRecord[] = project.pages.map((page) => {
    if (page.status === "skipped") return page;
    const nextText = cleanSingleText(page.cleanedText, options);
    if (nextText !== page.cleanedText) {
      modifiedCount += 1;
    }
    const words = countWords(nextText);
    const chars = nextText.length;
    return {
      ...page,
      cleanedText: nextText,
      wordCount: words,
      charCount: chars,
      isLikelyScanned: chars < 35,
      status: nextText !== page.cleanedText ? "cleaned" : page.status,
    };
  });

  return {
    project: recalcProjectTotals(project, nextPages),
    modifiedCount,
  };
}

export function skipLowTextPagesInProject(
  project: SkyxBookProject
): { project: SkyxBookProject; skippedCount: number } {
  let skippedCount = 0;
  const nextPages: BookPageRecord[] = project.pages.map((page) => {
    if (page.isLikelyScanned && page.status !== "skipped") {
      skippedCount += 1;
      return { ...page, status: "skipped" };
    }
    return page;
  });

  return {
    project: recalcProjectTotals(project, nextPages),
    skippedCount,
  };
}

export function mergePageWithNextInProject(
  project: SkyxBookProject,
  pageId: string
): { project: SkyxBookProject; mergedPageId: string } | null {
  const idx = project.pages.findIndex((p) => p.id === pageId);
  if (idx < 0 || idx >= project.pages.length - 1) return null;

  const current = project.pages[idx];
  const next = project.pages[idx + 1];

  const mergedCleaned = [current.cleanedText.trim(), next.cleanedText.trim()]
    .filter(Boolean)
    .join("\n\n");
  const mergedRaw = [current.rawText, next.rawText].filter(Boolean).join("\n\n---\n\n");
  const mergedWords = countWords(mergedCleaned);
  const mergedChars = mergedCleaned.length;

  const mergedPage: BookPageRecord = {
    ...current,
    label: current.label || next.label,
    rawText: mergedRaw,
    cleanedText: mergedCleaned,
    wordCount: mergedWords,
    charCount: mergedChars,
    isLikelyScanned: mergedChars < 35,
    status: current.status === "skipped" ? "skipped" : "cleaned",
    tags: Array.from(new Set([...current.tags, ...next.tags])),
  };

  const nextPages: BookPageRecord[] = [
    ...project.pages.slice(0, idx),
    mergedPage,
    ...project.pages.slice(idx + 2),
  ].map((p, i) => ({ ...p, pageNumber: i + 1 }));

  return {
    project: recalcProjectTotals(project, nextPages),
    mergedPageId: mergedPage.id,
  };
}

export function splitPageAtIndexInProject(
  project: SkyxBookProject,
  pageId: string,
  splitIndex: number
): { project: SkyxBookProject; secondPageId: string } | null {
  const idx = project.pages.findIndex((p) => p.id === pageId);
  if (idx < 0) return null;

  const page = project.pages[idx];
  const text = page.cleanedText;
  if (text.trim().length < 20) return null;

  const safeSplit =
    splitIndex > 5 && splitIndex < text.length - 5
      ? splitIndex
      : Math.floor(text.length / 2);

  const firstPart = text.slice(0, safeSplit).trim();
  const secondPart = text.slice(safeSplit).trim();
  if (!firstPart || !secondPart) return null;

  const firstPage: BookPageRecord = {
    ...page,
    cleanedText: firstPart,
    wordCount: countWords(firstPart),
    charCount: firstPart.length,
    isLikelyScanned: firstPart.length < 35,
    status: page.status === "skipped" ? "skipped" : "cleaned",
  };

  const secondPageId = `pg-split-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const secondPage: BookPageRecord = {
    id: secondPageId,
    pageNumber: page.pageNumber + 1,
    label: page.label ? `${page.label} (Part 2)` : undefined,
    rawText: secondPart,
    cleanedText: secondPart,
    wordCount: countWords(secondPart),
    charCount: secondPart.length,
    isLikelyScanned: secondPart.length < 35,
    status: "cleaned",
    chapterId: page.chapterId,
    tags: [...page.tags],
  };

  const nextPages: BookPageRecord[] = [
    ...project.pages.slice(0, idx),
    firstPage,
    secondPage,
    ...project.pages.slice(idx + 1),
  ].map((p, i) => ({ ...p, pageNumber: i + 1 }));

  return {
    project: recalcProjectTotals(project, nextPages),
    secondPageId,
  };
}
