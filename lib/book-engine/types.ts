import { z } from "zod";

export type BookSourceFormat =
  | "pdf"
  | "epub"
  | "docx"
  | "csv"
  | "md"
  | "txt"
  | "skyxbook";

export type PageStatus = "raw" | "cleaned" | "reviewed" | "skipped";

export type BookProjectLanguage = "bn" | "en" | "bilingual";

export interface BookPageRecord {
  id: string;
  pageNumber: number;
  label?: string;
  layout?: { kind: "text" | "columns" | "table"; rows: string[][]; columns: number; source: "digital" | "ocr" };
  rawText: string;
  cleanedText: string;
  wordCount: number;
  charCount: number;
  isLikelyScanned: boolean;
  status: PageStatus;
  chapterId: string | null;
  tags: string[];
}

export interface BookChapterNode {
  id: string;
  orderIndex: number;
  chapterNumber: number;
  title: string;
  level: 1 | 2 | 3;
  parentId: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  contentMarkdown: string;
  contentHtml?: string;
  tags: string[];
  status: "draft" | "reviewed" | "ready";
}

export interface BookExtractionMeta {
  fileName: string;
  format: BookSourceFormat;
  fileSizeBytes: number;
  sha256: string;
  engineUsed: string;
  extractedAt: string;
  totalPages: number;
  totalWords: number;
  totalChars: number;
  scannedPageCount: number;
  detectedOutlineCount: number;
  csvHeaders?: string[];
  warnings: string[];
}

export interface BookStorageRef {
  mode: "portable" | "vps-local";
  relativePath?: string;
}

export interface SkyxBookProject {
  schemaVersion: "1.0";
  id: string;
  title: string;
  subtitle: string;
  author: string;
  subject: string;
  language: BookProjectLanguage;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  storageRef: BookStorageRef;
  extraction: BookExtractionMeta;
  pages: BookPageRecord[];
  chapters: BookChapterNode[];
}

export const bookPageSchema = z.object({
  id: z.string().min(1).max(120),
  pageNumber: z.number().int().min(1).max(20000),
  label: z.string().max(200).optional(),
  layout: z.object({ kind: z.enum(["text","columns","table"]), rows: z.array(z.array(z.string())), columns: z.number().int().nonnegative(), source: z.enum(["digital","ocr"]) }).optional(),
  rawText: z.string().max(400000),
  cleanedText: z.string().max(400000),
  wordCount: z.number().int().min(0),
  charCount: z.number().int().min(0),
  isLikelyScanned: z.boolean(),
  status: z.enum(["raw", "cleaned", "reviewed", "skipped"]),
  chapterId: z.string().max(120).nullable(),
  tags: z.array(z.string().max(80)).max(50).default([]),
});

export const bookChapterSchema = z.object({
  id: z.string().min(1).max(120),
  orderIndex: z.number().int().min(0),
  chapterNumber: z.number().int().min(0),
  title: z.string().min(1).max(300),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  parentId: z.string().max(120).nullable(),
  pageStart: z.number().int().min(1).nullable(),
  pageEnd: z.number().int().min(1).nullable(),
  contentMarkdown: z.string().max(1000000),
  contentHtml: z.string().max(1200000).optional(),
  tags: z.array(z.string().max(80)).max(50).default([]),
  status: z.enum(["draft", "reviewed", "ready"]),
});

export const skyxBookProjectSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(300),
  subtitle: z.string().max(400).default(""),
  author: z.string().max(200).default("Unknown Author"),
  subject: z.string().max(200).default("General"),
  language: z.enum(["bn", "en", "bilingual"]).default("bilingual"),
  tags: z.array(z.string().max(80)).max(60).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  storageRef: z
    .object({
      mode: z.enum(["portable", "vps-local"]),
      relativePath: z.string().max(400).optional(),
    })
    .default({ mode: "portable" }),
  extraction: z.object({
    fileName: z.string().max(300),
    format: z.enum(["pdf", "epub", "docx", "csv", "md", "txt", "skyxbook"]),
    fileSizeBytes: z.number().min(0),
    sha256: z.string().max(128),
    engineUsed: z.string().max(120),
    extractedAt: z.string(),
    totalPages: z.number().int().min(0),
    totalWords: z.number().int().min(0),
    totalChars: z.number().int().min(0),
    scannedPageCount: z.number().int().min(0),
    detectedOutlineCount: z.number().int().min(0),
    csvHeaders: z.array(z.string().max(200)).max(200).optional(),
    warnings: z.array(z.string().max(500)).max(100).default([]),
  }),
  pages: z.array(bookPageSchema).max(5000),
  chapters: z.array(bookChapterSchema).max(1500),
});
