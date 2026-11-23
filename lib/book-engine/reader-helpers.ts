import { pdfLayout, pdfTextBoxes } from "./pdf-layout";
import type {
  BookPageRecord,
  BookSourceFormat,
  SkyxBookProject,
} from "@/lib/book-engine/types";

export interface ReaderDocumentItem {
  id: string;
  title: string;
  fileName: string;
  format: BookSourceFormat;
  fileSizeBytes: number;
  totalPages: number;
  currentPage: number;
  bookmarks: number[];
  addedAt: string;
  /** Raw bytes kept in client session memory for PDF.js rendering */
  pdfBytes?: Uint8Array;
  /** Parsed pages for non-PDF documents (EPUB, DOCX, MD, TXT, CSV, .skyxbook.json) */
  textPages?: BookPageRecord[];
  /** Optional linked project if loaded from Extract Studio or .skyxbook.json */
  linkedProject?: SkyxBookProject;
}

export interface ExtractedPageClip {
  id: string;
  sourceDocId: string;
  sourceTitle: string;
  pageLabel: string;
  pageNumbers: number[];
  text: string;
  wordCount: number;
  sentToProject: boolean;
  createdAt: string;
}

const BN_DIGIT_MAP: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

export function normalizeBanglaDigits(input: string): string {
  return input.replace(/[০-৯]/g, (ch) => BN_DIGIT_MAP[ch] ?? ch);
}

export function countWordsQuick(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Parses single page or small manual ranges (supports English & Bangla digits):
 * Examples: "14", "12-15", "১২-১৫", "3, 7, 10-12"
 * Caps manual batch at 30 pages for instant client responsiveness.
 */
export function parseManualPageRange(
  rawInput: string,
  totalPages: number
): number[] {
  if (totalPages < 1) return [];
  const normalized = normalizeBanglaDigits(rawInput).trim();
  if (!normalized) return [];

  const result = new Set<number>();
  const segments = normalized.split(/[,;]+/);
  for (const segment of segments) {
    const match = segment.trim().match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/);
    if (!match) return [];
    const first = Number(match[1]);
    const last = Number(match[2] ?? match[1]);
    const start = Math.min(first, last);
    const end = Math.max(first, last);
    if (start < 1 || end > totalPages) return [];
    for (let page = start; page <= end && result.size < 30; page++) result.add(page);
  }

  return Array.from(result).sort((a, b) => a - b);
}

export function extractStructuredTextFromPdfItems(items: unknown[], transform?: number[]): string {
  return pdfLayout(pdfTextBoxes(items, transform)).text;
}

/**
 * Appends a manually extracted page clip into an existing SkyxBookProject,
 * or creates a fresh portable SkyxBookProject automatically if none exists yet.
 */
export function appendExtractedClipToProject(
  existingProject: SkyxBookProject | null,
  doc: ReaderDocumentItem,
  pageLabel: string,
  extractedText: string
): SkyxBookProject {
  const now = new Date().toISOString();
  const cleanText = extractedText.trim();
  const wordCount = countWordsQuick(cleanText);
  const charCount = cleanText.length;

  const baseProject: SkyxBookProject = existingProject
    ? existingProject
    : {
        schemaVersion: "1.0",
        id: `book-reader-${Date.now().toString(36)}`,
        title: doc.title,
        subtitle: "Manually Extracted via Skyx Smart Reader",
        author: "Editorial",
        subject: "General",
        language: "bilingual",
        tags: ["reader-extract"],
        createdAt: now,
        updatedAt: now,
        storageRef: { mode: "portable" },
        extraction: {
          fileName: doc.fileName,
          format: doc.format,
          fileSizeBytes: doc.fileSizeBytes,
          sha256: `manual-extract-${Date.now()}`,
          engineUsed: "Smart Reader Manual Extractor",
          extractedAt: now,
          totalPages: 0,
          totalWords: 0,
          totalChars: 0,
          scannedPageCount: 0,
          detectedOutlineCount: 0,
          warnings: [],
        },
        pages: [],
        chapters: [],
      };

  const nextPageNumber = baseProject.pages.length + 1;
  const newPage: BookPageRecord = {
    id: `pg-clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    pageNumber: nextPageNumber,
    label: `${doc.title.slice(0, 28)} · ${pageLabel}`,
    rawText: cleanText,
    cleanedText: cleanText,
    wordCount,
    charCount,
    isLikelyScanned: wordCount < 5,
    status: "cleaned",
    chapterId: null,
    tags: ["manual-extract"],
  };

  const nextPages = [...baseProject.pages, newPage];
  const totalWords = nextPages.reduce((sum, p) => sum + p.wordCount, 0);
  const totalChars = nextPages.reduce((sum, p) => sum + p.charCount, 0);

  return {
    ...baseProject,
    updatedAt: now,
    extraction: {
      ...baseProject.extraction,
      totalPages: nextPages.length,
      totalWords,
      totalChars,
    },
    pages: nextPages,
  };
}

export function downloadSingleTextFile(
  content: string,
  baseName: string,
  ext: "md" | "txt"
): string {
  const safeSlug =
    baseName
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 52) || "extracted-page";
  const fileName = `${safeSlug}.${ext}`;
  const mime =
    ext === "md"
      ? "text/markdown;charset=utf-8"
      : "text/plain;charset=utf-8";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
