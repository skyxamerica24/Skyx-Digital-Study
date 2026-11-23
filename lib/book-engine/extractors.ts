import crypto from "crypto";
import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import mammoth from "mammoth";
import Papa from "papaparse";
import TurndownService from "turndown";
import { rm } from "node:fs/promises";
import { pdfLayout, pdfTextBoxes } from "./pdf-layout";
import { createOcrInput, recognizePage } from "./pdf-ocr";
import { getDocumentProxy, getMeta, getResolvedPDFJS } from "unpdf";
import {
  skyxBookProjectSchema,
  type BookChapterNode,
  type BookPageRecord,
  type BookProjectLanguage,
  type BookSourceFormat,
  type SkyxBookProject,
} from "@/lib/book-engine/types";

const MAX_ZIP_ENTRIES = 500;
const MAX_ZIP_ENTRY_BYTES = 5 * 1024 * 1024;
const MAX_ZIP_TOTAL_BYTES = 40 * 1024 * 1024;
const CSV_ROWS_PER_PAGE = 25;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "epub",
  "docx",
  "csv",
  "md",
  "markdown",
  "txt",
  "json",
]);

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

export function getExtension(fileName: string): string {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".skyxbook.json")) return "skyxbook";
  const parts = lower.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function isSupportedExtension(ext: string): boolean {
  return ext === "skyxbook" || ALLOWED_EXTENSIONS.has(ext);
}

export function normalizeExtractedText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function detectBookLanguage(sample: string): BookProjectLanguage {
  const sliced = sample.slice(0, 15000);
  const bengaliMatches = sliced.match(/[\u0980-\u09FF]/g)?.length ?? 0;
  const latinMatches = sliced.match(/[A-Za-z]/g)?.length ?? 0;
  const total = bengaliMatches + latinMatches;
  if (total === 0) return "bilingual";
  const bnRatio = bengaliMatches / total;
  if (bnRatio >= 0.72) return "bn";
  if (bnRatio <= 0.12) return "en";
  return "bilingual";
}

function cleanFileTitle(fileName: string): string {
  return (
    fileName
      .replace(/\.skyxbook\.json$/i, "")
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Untitled Book"
  );
}

function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  td.remove(["script", "style", "noscript", "iframe", "object", "embed"]);
  return td;
}

function stripDangerousHtmlTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
}

function isPdfMagic(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function isZipMagic(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  );
}

function safeUnzipEntries(buffer: Buffer): Record<string, Uint8Array> {
  let entryCount = 0;
  let totalBytes = 0;

  return unzipSync(new Uint8Array(buffer), {
    filter(file) {
      entryCount += 1;
      if (entryCount > MAX_ZIP_ENTRIES) {
        throw new Error(`Archive exceeds maximum entry limit (${MAX_ZIP_ENTRIES} files).`);
      }
      const name = file.name.replace(/\\/g, "/");
      if (name.startsWith("/") || name.includes("../") || name === "..") {
        return false;
      }
      if (file.originalSize > MAX_ZIP_ENTRY_BYTES) {
        throw new Error(`Archive entry "${name}" exceeds max allowed size (5 MB).`);
      }
      totalBytes += file.originalSize;
      if (totalBytes > MAX_ZIP_TOTAL_BYTES) {
        throw new Error("Decompressed archive exceeds safety limit (40 MB).");
      }
      return true;
    },
  });
}

function resolveRelativeArchivePath(baseFilePath: string, relativeHref: string): string {
  const cleanHref = relativeHref.split("#")[0].split("?")[0];
  const baseParts = baseFilePath.split("/").slice(0, -1);
  const relParts = cleanHref.split("/");
  const stack = [...baseParts];
  for (const part of relParts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return decodeURIComponent(stack.join("/"));
}

function buildPagesFromTexts(texts: string[], labels?: string[]): BookPageRecord[] {
  return texts.map((raw, idx) => {
    const cleaned = normalizeExtractedText(raw);
    const words = countWords(cleaned);
    const chars = cleaned.length;
    const isLikelyScanned = chars < 35;
    return {
      id: createId("pg"),
      pageNumber: idx + 1,
      label: labels?.[idx],
      rawText: raw,
      cleanedText: cleaned,
      wordCount: words,
      charCount: chars,
      isLikelyScanned,
      status: "raw",
      chapterId: null,
      tags: isLikelyScanned ? ["low-text-or-scanned"] : [],
    };
  });
}

function autoDetectChaptersFromPages(pages: BookPageRecord[]): BookChapterNode[] {
  const headingRegex =
    /^(?:#{1,2}\s+(.+)|(?:chapter|unit|part|module|lesson|অধ্যায়|অধ্যায়|পাঠ|পরিচ্ছেদ)\s*[-:.–—]?\s*([0-9০-৯]+|[IVXLCDM]+)?[\s.:–—-]*(.*))$/im;

  const detectedStarts: { pageNumber: number; title: string }[] = [];

  for (const page of pages) {
    const lines = page.cleanedText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 6);

    for (const line of lines) {
      if (line.length > 140) continue;
      const match = line.match(headingRegex);
      if (match) {
        const title = (match[1] || line.replace(/^#{1,3}\s+/, "")).trim();
        if (title.length >= 2) {
          detectedStarts.push({ pageNumber: page.pageNumber, title });
          break;
        }
      }
    }
  }

  if (detectedStarts.length === 0) {
    if (pages.length === 0) return [];
    const combined = pages.map((p) => p.cleanedText).filter(Boolean).join("\n\n");
    const chapterId = createId("ch");
    pages.forEach((p) => {
      p.chapterId = chapterId;
    });
    return [
      {
        id: chapterId,
        orderIndex: 0,
        chapterNumber: 1,
        title: "Full Extracted Content",
        level: 1,
        parentId: null,
        pageStart: 1,
        pageEnd: pages.length,
        contentMarkdown: combined,
        tags: [],
        status: "draft",
      },
    ];
  }

  const chapters: BookChapterNode[] = [];
  for (let i = 0; i < detectedStarts.length; i++) {
    const start = detectedStarts[i].pageNumber;
    const end =
      i + 1 < detectedStarts.length
        ? Math.max(start, detectedStarts[i + 1].pageNumber - 1)
        : pages.length;

    const chapterId = createId("ch");
    const chapterPages = pages.filter((p) => p.pageNumber >= start && p.pageNumber <= end);
    chapterPages.forEach((p) => {
      p.chapterId = chapterId;
    });

    chapters.push({
      id: chapterId,
      orderIndex: i,
      chapterNumber: i + 1,
      title: detectedStarts[i].title,
      level: 1,
      parentId: null,
      pageStart: start,
      pageEnd: end,
      contentMarkdown: chapterPages.map((p) => p.cleanedText).filter(Boolean).join("\n\n"),
      tags: [],
      status: "draft",
    });
  }

  return chapters;
}

async function extractPdf(
  buffer: Buffer,
  fileName: string,
  sha256: string,
  forceOcr: boolean
): Promise<SkyxBookProject> {
  if (!isPdfMagic(buffer)) {
    throw new Error("Invalid PDF file header. Please upload a valid PDF document.");
  }

  const warnings: string[] = [];
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const totalPages = pdf.numPages;
  const { OPS } = await getResolvedPDFJS();
  const pages: BookPageRecord[] = [];
  let dir: string | undefined;
  try {
    for (let number = 1; number <= totalPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent({disableNormalization: true});
      let layout = pdfLayout(pdfTextBoxes(content.items, page.getViewport({scale:1}).transform));
      let source: "digital" | "ocr" = "digital";
      const damagedText = /[\u0080-\u009f\uFFFD\uE000-\uF8FF]/u.test(layout.text) ||
        /(?:^|\s)[িেৈ][ ]+[অ-হ]/u.test(layout.text) ||
        /[ঀ-৿][\u00c0-\u024f]|[\u00c0-\u024f][ঀ-৿]/u.test(layout.text);
      const shortImagePage = layout.text.length > 0 && layout.text.length < 35 &&
        (await page.getOperatorList()).fnArray.some(op => op === OPS.paintImageXObject || op === OPS.paintInlineImageXObject);
      if (forceOcr || !layout.text || damagedText || shortImagePage) {
        try {
          dir ??= await createOcrInput(buffer);
          const scanned = pdfLayout(await recognizePage(dir, number));
          if (scanned.text) { layout = scanned; source = "ocr"; }
          else warnings.push(`Page ${number}: OCR found no readable words.`);
        } catch {
          warnings.push(`Page ${number}: OCR unavailable or failed. Check Poppler, Tesseract and ben+eng language data. Available digital text was retained.`);
        }
      }
      const [record] = buildPagesFromTexts([layout.text]);
      record.pageNumber = number;
      record.layout = {kind:layout.kind,columns:layout.columns,rows:layout.rows,source};
      pages.push(record);
      page.cleanup();
    }
  } finally {
    if (dir) await rm(dir,{recursive:true,force:true});
  }

  let metaTitle = "";
  let metaAuthor = "";
  try {
    const meta = await getMeta(pdf);
    const info = (meta?.info ?? {}) as unknown as Record<string, unknown>;
    if (typeof info.Title === "string" && info.Title.trim()) {
      metaTitle = info.Title.trim();
    }
    if (typeof info.Author === "string" && info.Author.trim()) {
      metaAuthor = info.Author.trim();
    }
  } catch {
    // Metadata optional
  }

  const outlineTitles: string[] = [];
  try {
    const outline = await pdf.getOutline();
    if (Array.isArray(outline)) {
      for (const item of outline.slice(0, 120)) {
        if (item && typeof item.title === "string" && item.title.trim()) {
          outlineTitles.push(item.title.trim());
        }
      }
    }
  } catch {
    // Outline optional
  }

  await pdf.cleanup();
  const scannedCount = pages.filter((p) => p.isLikelyScanned).length;
  if (scannedCount > 0) {
    warnings.push(
      `${scannedCount} page(s) contain very little selectable text and may be scanned images or cover pages.`
    );
  }

  let chapters = autoDetectChaptersFromPages(pages);
  if (chapters.length <= 1 && outlineTitles.length > 1) {
    warnings.push(
      `Detected ${outlineTitles.length} embedded PDF bookmark entries in the outline metadata.`
    );
  }

  const combinedSample = pages.slice(0, 12).map((p) => p.cleanedText).join("\n");
  const totalWords = pages.reduce((acc, p) => acc + p.wordCount, 0);
  const totalChars = pages.reduce((acc, p) => acc + p.charCount, 0);
  const now = new Date().toISOString();

  if (chapters.length === 0 && totalPages > 0) {
    chapters = [
      {
        id: createId("ch"),
        orderIndex: 0,
        chapterNumber: 1,
        title: "Chapter 1",
        level: 1,
        parentId: null,
        pageStart: 1,
        pageEnd: pages.length,
        contentMarkdown: "",
        tags: [],
        status: "draft",
      },
    ];
  }

  return {
    schemaVersion: "1.0",
    id: createId("book"),
    title: metaTitle || cleanFileTitle(fileName),
    subtitle: "",
    author: metaAuthor || "Unknown Author",
    subject: "General",
    language: detectBookLanguage(combinedSample),
    tags: ["pdf-extracted"],
    createdAt: now,
    updatedAt: now,
    storageRef: { mode: "portable" },
    extraction: {
      fileName,
      format: "pdf",
      fileSizeBytes: buffer.length,
      sha256,
      engineUsed: "PDF.js layout + Bengali/English OCR",
      extractedAt: now,
      totalPages: totalPages || pages.length,
      totalWords,
      totalChars,
      scannedPageCount: scannedCount,
      detectedOutlineCount: outlineTitles.length || chapters.length,
      warnings,
    },
    pages,
    chapters,
  };
}

async function extractDocx(
  buffer: Buffer,
  fileName: string,
  sha256: string
): Promise<SkyxBookProject> {
  if (!isZipMagic(buffer)) {
    throw new Error("Invalid DOCX archive signature. Please upload a valid .docx file.");
  }

  const result = await mammoth.convertToHtml({ buffer });
  const safeHtml = stripDangerousHtmlTags(result.value || "");
  const td = createTurndown();
  const fullMarkdown = normalizeExtractedText(td.turndown(safeHtml));

  const sections = fullMarkdown
    .split(/(?=^#{1,2}\s+)/m)
    .map((s) => s.trim())
    .filter(Boolean);

  const pageInputs = sections.length > 0 ? sections : [fullMarkdown || ""];
  const pages = buildPagesFromTexts(pageInputs);
  const chapters = autoDetectChaptersFromPages(pages);

  const warnings: string[] = (result.messages ?? [])
    .filter((m) => m.type === "warning")
    .slice(0, 5)
    .map((m) => m.message);

  const totalWords = pages.reduce((acc, p) => acc + p.wordCount, 0);
  const totalChars = pages.reduce((acc, p) => acc + p.charCount, 0);
  const now = new Date().toISOString();

  return {
    schemaVersion: "1.0",
    id: createId("book"),
    title: cleanFileTitle(fileName),
    subtitle: "",
    author: "Unknown Author",
    subject: "General",
    language: detectBookLanguage(fullMarkdown),
    tags: ["docx-extracted"],
    createdAt: now,
    updatedAt: now,
    storageRef: { mode: "portable" },
    extraction: {
      fileName,
      format: "docx",
      fileSizeBytes: buffer.length,
      sha256,
      engineUsed: "mammoth + turndown",
      extractedAt: now,
      totalPages: pages.length,
      totalWords,
      totalChars,
      scannedPageCount: 0,
      detectedOutlineCount: chapters.length,
      warnings,
    },
    pages,
    chapters,
  };
}

function extractEpub(
  buffer: Buffer,
  fileName: string,
  sha256: string
): SkyxBookProject {
  if (!isZipMagic(buffer)) {
    throw new Error("Invalid EPUB archive signature. Please upload a valid .epub file.");
  }

  const entries = safeUnzipEntries(buffer);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: false,
    allowBooleanAttributes: true,
  });

  const warnings: string[] = [];
  const containerRaw = entries["META-INF/container.xml"];
  let opfPath = "";

  if (containerRaw) {
    const containerXml = xmlParser.parse(decoder.decode(containerRaw));
    const rootfiles = containerXml?.container?.rootfiles?.rootfile;
    const firstRoot = Array.isArray(rootfiles) ? rootfiles[0] : rootfiles;
    if (firstRoot && typeof firstRoot["@_full-path"] === "string") {
      opfPath = firstRoot["@_full-path"];
    }
  }

  if (!opfPath) {
    opfPath = Object.keys(entries).find((k) => k.toLowerCase().endsWith(".opf")) || "";
  }

  let title = cleanFileTitle(fileName);
  let author = "Unknown Author";
  const orderedChapterFiles: string[] = [];

  if (opfPath && entries[opfPath]) {
    const opfXml = xmlParser.parse(decoder.decode(entries[opfPath]));
    const pkg = opfXml?.package ?? opfXml?.["opf:package"] ?? {};
    const metadata = pkg?.metadata ?? pkg?.["opf:metadata"] ?? {};
    const rawTitle = metadata?.["dc:title"] ?? metadata?.title;
    if (typeof rawTitle === "string" && rawTitle.trim()) title = rawTitle.trim();
    else if (rawTitle && typeof rawTitle["#text"] === "string") title = rawTitle["#text"].trim();

    const rawCreator = metadata?.["dc:creator"] ?? metadata?.creator;
    if (typeof rawCreator === "string" && rawCreator.trim()) author = rawCreator.trim();
    else if (rawCreator && typeof rawCreator["#text"] === "string") author = rawCreator["#text"].trim();

    const manifestItemsRaw = pkg?.manifest?.item ?? [];
    const manifestItems = Array.isArray(manifestItemsRaw) ? manifestItemsRaw : [manifestItemsRaw];
    const idToHref = new Map<string, string>();
    for (const item of manifestItems) {
      if (item?.["@_id"] && item?.["@_href"]) {
        idToHref.set(String(item["@_id"]), String(item["@_href"]));
      }
    }

    const spineRefsRaw = pkg?.spine?.itemref ?? [];
    const spineRefs = Array.isArray(spineRefsRaw) ? spineRefsRaw : [spineRefsRaw];
    for (const ref of spineRefs) {
      const idref = ref?.["@_idref"];
      const href = idref ? idToHref.get(String(idref)) : undefined;
      if (href) {
        const resolved = resolveRelativeArchivePath(opfPath, href);
        if (entries[resolved]) orderedChapterFiles.push(resolved);
      }
    }
  }

  if (orderedChapterFiles.length === 0) {
    const fallback = Object.keys(entries)
      .filter((k) => /\.(xhtml|html|htm)$/i.test(k))
      .sort();
    orderedChapterFiles.push(...fallback);
    warnings.push("EPUB spine metadata was incomplete; chapters were ordered alphabetically by XHTML filename.");
  }

  const td = createTurndown();
  const pageTexts: string[] = [];
  const pageLabels: string[] = [];
  const chapters: BookChapterNode[] = [];

  orderedChapterFiles.forEach((entryPath) => {
    const htmlRaw = decoder.decode(entries[entryPath]);
    const titleMatch = htmlRaw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const h1Match = htmlRaw.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
    const cleanedHeading = (h1Match?.[1] || titleMatch?.[1] || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const bodyMatch = htmlRaw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const safeHtml = stripDangerousHtmlTags(bodyMatch ? bodyMatch[1] : htmlRaw);
    const markdown = normalizeExtractedText(td.turndown(safeHtml));
    if (!markdown) return;

    const pageNum = pageTexts.length + 1;
    const label = cleanedHeading || `Section ${pageNum}`;
    pageTexts.push(markdown);
    pageLabels.push(label);

    chapters.push({
      id: createId("ch"),
      orderIndex: chapters.length,
      chapterNumber: chapters.length + 1,
      title: label.slice(0, 180),
      level: 1,
      parentId: null,
      pageStart: pageNum,
      pageEnd: pageNum,
      contentMarkdown: markdown,
      tags: [],
      status: "draft",
    });
  });

  const pages = buildPagesFromTexts(pageTexts, pageLabels);
  pages.forEach((p, idx) => {
    if (chapters[idx]) {
      p.chapterId = chapters[idx].id;
    }
  });

  const combinedSample = pageTexts.slice(0, 10).join("\n");
  const totalWords = pages.reduce((acc, p) => acc + p.wordCount, 0);
  const totalChars = pages.reduce((acc, p) => acc + p.charCount, 0);
  const now = new Date().toISOString();

  return {
    schemaVersion: "1.0",
    id: createId("book"),
    title,
    subtitle: "",
    author,
    subject: "General",
    language: detectBookLanguage(combinedSample),
    tags: ["epub-extracted"],
    createdAt: now,
    updatedAt: now,
    storageRef: { mode: "portable" },
    extraction: {
      fileName,
      format: "epub",
      fileSizeBytes: buffer.length,
      sha256,
      engineUsed: "fflate + fast-xml-parser + turndown",
      extractedAt: now,
      totalPages: pages.length,
      totalWords,
      totalChars,
      scannedPageCount: 0,
      detectedOutlineCount: chapters.length,
      warnings,
    },
    pages,
    chapters,
  };
}

function escapeMdCell(cell: string): string {
  return String(cell ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function extractCsv(
  buffer: Buffer,
  fileName: string,
  sha256: string
): SkyxBookProject {
  const csvText = buffer.toString("utf-8");
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  const rows = (parsed.data ?? []).filter(
    (r) => Array.isArray(r) && r.some((c) => String(c).trim() !== "")
  );
  if (rows.length === 0) {
    throw new Error("CSV file appears to be empty.");
  }

  const headers = rows[0].map((h, i) => escapeMdCell(h) || `Column ${i + 1}`);
  const dataRows = rows.slice(1);
  const pageTexts: string[] = [];
  const pageLabels: string[] = [];

  for (let offset = 0; offset < Math.max(1, dataRows.length); offset += CSV_ROWS_PER_PAGE) {
    const slice = dataRows.slice(offset, offset + CSV_ROWS_PER_PAGE);
    const startRow = offset + 1;
    const endRow = offset + slice.length;
    const mdLines = [
      `## Rows ${startRow}–${endRow}`,
      "",
      `| ${headers.join(" | ")} |`,
      `| ${headers.map(() => "---").join(" | ")} |`,
      ...slice.map((row) => {
        const normalized = headers.map((_, idx) => escapeMdCell(row[idx] ?? ""));
        return `| ${normalized.join(" | ")} |`;
      }),
    ];
    pageTexts.push(mdLines.join("\n"));
    pageLabels.push(`Rows ${startRow}–${endRow}`);
  }

  const pages = buildPagesFromTexts(pageTexts, pageLabels);
  const chapters: BookChapterNode[] = pages.map((page, idx) => {
    const chId = createId("ch");
    page.chapterId = chId;
    return {
      id: chId,
      orderIndex: idx,
      chapterNumber: idx + 1,
      title: page.label || `Table Batch ${idx + 1}`,
      level: 1,
      parentId: null,
      pageStart: page.pageNumber,
      pageEnd: page.pageNumber,
      contentMarkdown: page.cleanedText,
      tags: ["csv-table"],
      status: "draft",
    };
  });

  const warnings: string[] = (parsed.errors ?? [])
    .slice(0, 5)
    .map((e) => `Row ${e.row ?? "?"}: ${e.message}`);

  const totalWords = pages.reduce((acc, p) => acc + p.wordCount, 0);
  const totalChars = pages.reduce((acc, p) => acc + p.charCount, 0);
  const now = new Date().toISOString();

  return {
    schemaVersion: "1.0",
    id: createId("book"),
    title: cleanFileTitle(fileName),
    subtitle: `${dataRows.length} rows · ${headers.length} columns`,
    author: "CSV Dataset",
    subject: "Structured Data",
    language: detectBookLanguage(csvText),
    tags: ["csv-extracted"],
    createdAt: now,
    updatedAt: now,
    storageRef: { mode: "portable" },
    extraction: {
      fileName,
      format: "csv",
      fileSizeBytes: buffer.length,
      sha256,
      engineUsed: "papaparse (CSV Table Engine)",
      extractedAt: now,
      totalPages: pages.length,
      totalWords,
      totalChars,
      scannedPageCount: 0,
      detectedOutlineCount: chapters.length,
      csvHeaders: headers,
      warnings,
    },
    pages,
    chapters,
  };
}

function extractTextOrMarkdown(
  buffer: Buffer,
  fileName: string,
  format: "md" | "txt",
  sha256: string
): SkyxBookProject {
  const raw = buffer.toString("utf-8");
  const normalized = normalizeExtractedText(raw);

  let chunks: string[] = [];
  if (normalized.includes("\f")) {
    chunks = normalized.split("\f").map((s) => s.trim()).filter(Boolean);
  } else if (/^---page---$/im.test(normalized)) {
    chunks = normalized.split(/^---page---$/im).map((s) => s.trim()).filter(Boolean);
  } else if (format === "md" && /^#{1,2}\s+/m.test(normalized)) {
    chunks = normalized.split(/(?=^#{1,2}\s+)/m).map((s) => s.trim()).filter(Boolean);
  } else {
    const paragraphs = normalized.split(/\n{2,}/);
    let current = "";
    for (const para of paragraphs) {
      if (current.length + para.length > 2600 && current.trim()) {
        chunks.push(current.trim());
        current = para;
      } else {
        current = current ? `${current}\n\n${para}` : para;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }

  if (chunks.length === 0) chunks = [normalized];

  const pages = buildPagesFromTexts(chunks);
  const chapters = autoDetectChaptersFromPages(pages);
  const totalWords = pages.reduce((acc, p) => acc + p.wordCount, 0);
  const totalChars = pages.reduce((acc, p) => acc + p.charCount, 0);
  const now = new Date().toISOString();

  return {
    schemaVersion: "1.0",
    id: createId("book"),
    title: cleanFileTitle(fileName),
    subtitle: "",
    author: "Unknown Author",
    subject: "General",
    language: detectBookLanguage(normalized),
    tags: [`${format}-extracted`],
    createdAt: now,
    updatedAt: now,
    storageRef: { mode: "portable" },
    extraction: {
      fileName,
      format,
      fileSizeBytes: buffer.length,
      sha256,
      engineUsed: format === "md" ? "Markdown Structure Parser" : "Smart Paragraph Page Chunker",
      extractedAt: now,
      totalPages: pages.length,
      totalWords,
      totalChars,
      scannedPageCount: 0,
      detectedOutlineCount: chapters.length,
      warnings: [],
    },
    pages,
    chapters,
  };
}

function extractSkyxBookJson(buffer: Buffer): SkyxBookProject {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(buffer.toString("utf-8"));
  } catch {
    throw new Error("Invalid JSON file. Could not parse .skyxbook.json project.");
  }

  const validated = skyxBookProjectSchema.safeParse(parsedJson);
  if (!validated.success) {
    const firstIssue = validated.error.issues[0];
    throw new Error(
      `Invalid .skyxbook project schema at "${firstIssue?.path.join(".") || "root"}": ${firstIssue?.message || "Malformed structure"}`
    );
  }

  return {
    ...validated.data,
    updatedAt: new Date().toISOString(),
  };
}

export async function extractDocumentBuffer(
  buffer: Buffer,
  fileName: string,
  forceOcr = false
): Promise<SkyxBookProject> {
  const ext = getExtension(fileName);
  if (!isSupportedExtension(ext)) {
    throw new Error(
      `Unsupported file format ".${ext || "unknown"}". Supported formats: PDF, EPUB, DOCX, CSV, MD, TXT, and .skyxbook.json.`
    );
  }

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  switch (ext as BookSourceFormat | "markdown" | "json") {
    case "pdf":
      return extractPdf(buffer, fileName, sha256, forceOcr);
    case "docx":
      return extractDocx(buffer, fileName, sha256);
    case "epub":
      return extractEpub(buffer, fileName, sha256);
    case "csv":
      return extractCsv(buffer, fileName, sha256);
    case "md":
    case "markdown":
      return extractTextOrMarkdown(buffer, fileName, "md", sha256);
    case "txt":
      return extractTextOrMarkdown(buffer, fileName, "txt", sha256);
    case "skyxbook":
    case "json":
      return extractSkyxBookJson(buffer);
    default:
      throw new Error(`Unsupported file format ".${ext}".`);
  }
}
