import { strToU8, zipSync } from "fflate";
import Papa from "papaparse";
import { markdownToSafeHtml } from "@/lib/book-engine/markdown-bridge";
import type { BookChapterNode, SkyxBookProject } from "@/lib/book-engine/types";
import type { AccessTier, Book, BookTopic } from "@/lib/types";

export interface PrintExportOptions {
  paperTheme: "ivory" | "clean" | "exam";
  includeCover: boolean;
  includeToc: boolean;
  chapterPageBreaks: boolean;
}

export interface SkyxReaderPublishOptions {
  curriculumId: string;
  accessTier: AccessTier;
  coverColor: string;
  isPublished: boolean;
}

function slugifyFileName(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);
  return cleaned || "skyx-book";
}

function safeZipEntrySlug(title: string, fallback: string): string {
  const ascii = title
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 48);
  return ascii || fallback;
}

function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Neutralizes spreadsheet formula injection in CSV cells (leading =, +, -, @, tab, CR).
 */
function safeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function triggerDownload(
  content: string | Blob | Uint8Array,
  fileName: string,
  mimeType: string
) {
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else if (content instanceof Uint8Array) {
    const copy = new Uint8Array(content.byteLength);
    copy.set(content);
    blob = new Blob([copy.buffer], { type: mimeType });
  } else {
    blob = new Blob([content], { type: mimeType });
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function getSortedChapters(project: SkyxBookProject): BookChapterNode[] {
  return [...project.chapters].sort((a, b) => a.orderIndex - b.orderIndex);
}

function resolveChapterBodyMarkdown(
  project: SkyxBookProject,
  chapter: BookChapterNode
): string {
  if (chapter.contentMarkdown.trim()) {
    return chapter.contentMarkdown.trim();
  }
  const chPages = project.pages.filter(
    (p) => p.chapterId === chapter.id && p.status !== "skipped"
  );
  return chPages
    .map((p) => p.cleanedText.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function buildCombinedMarkdownString(project: SkyxBookProject): string {
  const lines: string[] = [
    "---",
    `title: "${project.title.replace(/"/g, '\\"')}"`,
    `author: "${project.author.replace(/"/g, '\\"')}"`,
    `subject: "${project.subject.replace(/"/g, '\\"')}"`,
    `language: "${project.language}"`,
    `source_format: "${project.extraction.format}"`,
    `total_pages: ${project.pages.length}`,
    `total_chapters: ${project.chapters.length}`,
    `exported_at: "${new Date().toISOString()}"`,
    "---",
    "",
    `# ${project.title}`,
    "",
  ];

  if (project.subtitle) {
    lines.push(`> ${project.subtitle}`, "");
  }

  const sortedChapters = getSortedChapters(project);
  if (sortedChapters.length > 0) {
    for (const ch of sortedChapters) {
      const hashes = "#".repeat(Math.min(3, Math.max(1, ch.level)) + 1);
      lines.push(`${hashes} ${ch.title}`, "");
      const body = resolveChapterBodyMarkdown(project, ch);
      if (body) {
        lines.push(body, "");
      }
    }
  } else {
    for (const page of project.pages) {
      if (page.status === "skipped") continue;
      lines.push(`<!-- Page ${page.pageNumber} -->`, "", page.cleanedText, "");
    }
  }

  return lines.join("\n");
}

export function buildBookCsvString(
  project: SkyxBookProject,
  scope: "chapters" | "pages"
): string {
  if (scope === "chapters") {
    const sorted = getSortedChapters(project);
    const rows = sorted.map((ch) => {
      const body = resolveChapterBodyMarkdown(project, ch);
      const wordCount = body ? body.split(/\s+/).filter(Boolean).length : 0;
      return {
        chapter_number: ch.chapterNumber,
        level: `H${ch.level}`,
        title: safeCsvCell(ch.title),
        status: ch.status,
        page_start: ch.pageStart ?? "",
        page_end: ch.pageEnd ?? "",
        word_count: wordCount,
        tags: safeCsvCell(ch.tags.join(", ")),
        content_markdown: safeCsvCell(body),
      };
    });
    return `\uFEFF${Papa.unparse(rows)}`;
  }

  const chapterMap = new Map(project.chapters.map((c) => [c.id, c.title]));
  const rows = project.pages.map((p) => ({
    page_number: p.pageNumber,
    label: safeCsvCell(p.label ?? ""),
    status: p.status,
    chapter_title: safeCsvCell(p.chapterId ? chapterMap.get(p.chapterId) ?? "" : ""),
    word_count: p.wordCount,
    char_count: p.charCount,
    likely_scanned: p.isLikelyScanned ? "yes" : "no",
    cleaned_text: safeCsvCell(p.cleanedText),
  }));
  return `\uFEFF${Papa.unparse(rows)}`;
}

export function exportPortableSkyxBook(project: SkyxBookProject): string {
  const payload: SkyxBookProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  const fileName = `${slugifyFileName(project.title)}.skyxbook.json`;
  triggerDownload(
    JSON.stringify(payload, null, 2),
    fileName,
    "application/json;charset=utf-8"
  );
  return fileName;
}

export function exportCombinedMarkdown(project: SkyxBookProject): string {
  const md = buildCombinedMarkdownString(project);
  const fileName = `${slugifyFileName(project.title)}.md`;
  triggerDownload(md, fileName, "text/markdown;charset=utf-8");
  return fileName;
}

export function exportStructuredDataJson(project: SkyxBookProject): string {
  const activePages = project.pages.filter((p) => p.status !== "skipped");
  const structured = {
    meta: {
      id: project.id,
      title: project.title,
      subtitle: project.subtitle,
      author: project.author,
      subject: project.subject,
      language: project.language,
      tags: project.tags,
      sourceFormat: project.extraction.format,
      exportedAt: new Date().toISOString(),
    },
    chapters: getSortedChapters(project).map((ch) => ({
      id: ch.id,
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      level: ch.level,
      pageStart: ch.pageStart,
      pageEnd: ch.pageEnd,
      status: ch.status,
      tags: ch.tags,
      contentMarkdown: resolveChapterBodyMarkdown(project, ch),
    })),
    pages: activePages.map((p) => ({
      pageNumber: p.pageNumber,
      label: p.label,
      chapterId: p.chapterId,
      wordCount: p.wordCount,
      text: p.cleanedText,
    })),
  };

  const fileName = `${slugifyFileName(project.title)}.structured.json`;
  triggerDownload(
    JSON.stringify(structured, null, 2),
    fileName,
    "application/json;charset=utf-8"
  );
  return fileName;
}

export function exportBookCsv(
  project: SkyxBookProject,
  scope: "chapters" | "pages"
): string {
  const csv = buildBookCsvString(project, scope);
  const fileName = `${slugifyFileName(project.title)}-${scope}.csv`;
  triggerDownload(csv, fileName, "text/csv;charset=utf-8");
  return fileName;
}

/**
 * Exports a clean chapter-wise Markdown ZIP (numbered chapter .md files + SUMMARY.md index).
 */
export function exportChaptersMarkdownZip(project: SkyxBookProject): string {
  const sorted = getSortedChapters(project);
  const files: Record<string, Uint8Array> = {};
  const summaryLines: string[] = [
    `# Table of Contents — ${project.title}`,
    "",
    `Author: ${project.author} | Subject: ${project.subject}`,
    "",
  ];

  sorted.forEach((ch, idx) => {
    const num = String(idx + 1).padStart(2, "0");
    const slug = safeZipEntrySlug(ch.title, `chapter-${num}`);
    const entryName = `chapters/${num}-${slug}.md`;
    const body = resolveChapterBodyMarkdown(project, ch);
    const frontmatter = [
      "---",
      `chapter: ${ch.chapterNumber}`,
      `title: "${ch.title.replace(/"/g, '\\"')}"`,
      `level: ${ch.level}`,
      `status: "${ch.status}"`,
      `pages: "${ch.pageStart ?? ""}-${ch.pageEnd ?? ""}"`,
      `tags: [${ch.tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]`,
      "---",
      "",
      `# ${ch.title}`,
      "",
      body,
      "",
    ].join("\n");

    files[entryName] = strToU8(frontmatter);
    const indent = ch.level === 2 ? "  " : ch.level === 3 ? "    " : "";
    summaryLines.push(`${indent}- [${ch.title}](${entryName})`);
  });

  files["SUMMARY.md"] = strToU8(summaryLines.join("\n"));

  const archive = zipSync(files, { level: 6 });
  const fileName = `${slugifyFileName(project.title)}-chapters-md.zip`;
  triggerDownload(archive, fileName, "application/zip");
  return fileName;
}

/**
 * Exports a complete lossless .skyxbook.zip bundle containing:
 * - manifest.skyxbook.json (lossless re-importable master)
 * - book-combined.md
 * - chapters/01-*.md ...
 * - chapters.csv & pages.csv
 * - print-book.html
 */
export function exportSkyxBookZipBundle(
  project: SkyxBookProject,
  printOptions: PrintExportOptions
): string {
  const updatedProject: SkyxBookProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

  const files: Record<string, Uint8Array> = {
    "manifest.skyxbook.json": strToU8(JSON.stringify(updatedProject, null, 2)),
    "book-combined.md": strToU8(buildCombinedMarkdownString(updatedProject)),
    "chapters.csv": strToU8(buildBookCsvString(updatedProject, "chapters")),
    "pages.csv": strToU8(buildBookCsvString(updatedProject, "pages")),
    "print-book.html": strToU8(
      buildPrintReadyBookHtml(updatedProject, printOptions)
    ),
    "README.txt": strToU8(
      [
        `Skyx Book Manager — Portable Archive Bundle`,
        `Title: ${updatedProject.title}`,
        `Author: ${updatedProject.author}`,
        `Subject: ${updatedProject.subject}`,
        `Chapters: ${updatedProject.chapters.length} | Pages: ${updatedProject.pages.length}`,
        `Exported At: ${updatedProject.updatedAt}`,
        ``,
        `How to resume editing:`,
        `Upload manifest.skyxbook.json inside Book Manager -> Tab 1 (Extract & Metadata).`,
      ].join("\n")
    ),
  };

  const sorted = getSortedChapters(updatedProject);
  sorted.forEach((ch, idx) => {
    const num = String(idx + 1).padStart(2, "0");
    const slug = safeZipEntrySlug(ch.title, `chapter-${num}`);
    const body = resolveChapterBodyMarkdown(updatedProject, ch);
    files[`chapters/${num}-${slug}.md`] = strToU8(
      `# ${ch.title}\n\n${body}\n`
    );
  });

  const archive = zipSync(files, { level: 6 });
  const fileName = `${slugifyFileName(updatedProject.title)}.skyxbook.zip`;
  triggerDownload(archive, fileName, "application/zip");
  return fileName;
}

/**
 * Generates a self-contained, bilingual, print-ready A4 HTML document with escaped metadata,
 * sanitized chapter HTML, and strict CSP header.
 */
export function buildPrintReadyBookHtml(
  project: SkyxBookProject,
  options: PrintExportOptions
): string {
  const sorted = getSortedChapters(project);

  const bgColor =
    options.paperTheme === "ivory"
      ? "#fdfbf7"
      : options.paperTheme === "exam"
      ? "#ffffff"
      : "#ffffff";
  const accentColor =
    options.paperTheme === "exam" ? "#0f172a" : "#3730a3";

  const tocHtml =
    options.includeToc && sorted.length > 0
      ? `<section class="toc-section">
          <h2>সূচিপত্র · Table of Contents</h2>
          <ol class="toc-list">
            ${sorted
              .map((ch) => {
                const range = ch.pageStart
                  ? `P.${ch.pageStart}${ch.pageEnd && ch.pageEnd !== ch.pageStart ? `–${ch.pageEnd}` : ""}`
                  : "";
                return `<li class="toc-lvl-${ch.level}">
                  <a href="#ch-${escapeHtml(ch.id)}">${escapeHtml(ch.title)}</a>
                  <span class="toc-page">${escapeHtml(range)}</span>
                </li>`;
              })
              .join("\n")}
          </ol>
        </section>`
      : "";

  const chaptersHtml =
    sorted.length > 0
      ? sorted
          .map((ch, idx) => {
            const bodyMd = resolveChapterBodyMarkdown(project, ch);
            const safeBodyHtml = markdownToSafeHtml(bodyMd);
            const pageBreakClass =
              options.chapterPageBreaks && idx > 0 ? " chapter-break" : "";
            return `<article id="ch-${escapeHtml(ch.id)}" class="book-chapter${pageBreakClass}">
              <div class="chapter-kicker">Chapter ${ch.chapterNumber}</div>
              <h1 class="chapter-title">${escapeHtml(ch.title)}</h1>
              <div class="chapter-body">${safeBodyHtml}</div>
            </article>`;
          })
          .join("\n")
      : project.pages
          .filter((p) => p.status !== "skipped")
          .map(
            (p) =>
              `<article class="book-chapter"><div class="chapter-kicker">Page ${p.pageNumber}</div><div class="chapter-body">${markdownToSafeHtml(p.cleanedText)}</div></article>`
          )
          .join("\n");

  const coverHtml = options.includeCover
    ? `<header class="cover-page">
        <div class="cover-badge">${escapeHtml(project.subject || "Academic Edition")}</div>
        <h1 class="cover-title">${escapeHtml(project.title)}</h1>
        ${project.subtitle ? `<p class="cover-subtitle">${escapeHtml(project.subtitle)}</p>` : ""}
        <div class="cover-meta">
          <span><strong>Author:</strong> ${escapeHtml(project.author || "Editorial Team")}</span>
          <span><strong>Chapters:</strong> ${sorted.length}</span>
          <span><strong>Words:</strong> ${project.extraction.totalWords.toLocaleString()}</span>
        </div>
      </header>`
    : "";

  return `<!DOCTYPE html>
<html lang="${project.language === "en" ? "en" : "bn"}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;" />
  <title>${escapeHtml(project.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4; margin: 20mm 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px;
      background: #e2e8f0;
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', 'Noto Sans Bengali', system-ui, sans-serif;
      line-height: 1.8;
    }
    .book-sheet {
      max-width: 820px;
      margin: 0 auto;
      background: ${bgColor};
      padding: 48px 54px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }
    .cover-page {
      padding: 56px 0 44px;
      border-bottom: 2px solid #cbd5e1;
      margin-bottom: 36px;
      page-break-after: always;
    }
    .cover-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      background: #eef2ff;
      color: ${accentColor};
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .cover-title {
      font-family: 'Lora', 'Noto Serif Bengali', Georgia, serif;
      font-size: 34px;
      line-height: 1.28;
      margin: 16px 0 10px;
      color: #0f172a;
    }
    .cover-subtitle { font-size: 16px; color: #475569; margin: 0 0 24px; }
    .cover-meta { display: flex; flex-wrap: wrap; gap: 20px; font-size: 13px; color: #334155; }
    .toc-section {
      margin-bottom: 40px;
      padding: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      page-break-after: always;
    }
    .toc-section h2 { margin-top: 0; font-size: 18px; color: ${accentColor}; }
    .toc-list { list-style: none; padding: 0; margin: 0; }
    .toc-list li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 0;
      border-bottom: 1px dashed #cbd5e1;
      font-size: 14px;
    }
    .toc-list li.toc-lvl-2 { padding-left: 18px; font-size: 13.5px; }
    .toc-list li.toc-lvl-3 { padding-left: 36px; font-size: 13px; }
    .toc-list a { color: #1e293b; text-decoration: none; font-weight: 600; }
    .toc-page { color: #64748b; font-family: monospace; font-size: 12px; }
    .book-chapter { margin-bottom: 42px; }
    .chapter-break { page-break-before: always; }
    .chapter-kicker {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${accentColor};
    }
    .chapter-title {
      font-family: 'Lora', 'Noto Serif Bengali', Georgia, serif;
      font-size: 24px;
      margin: 6px 0 18px;
      padding-bottom: 10px;
      border-bottom: 1.5px solid #cbd5e1;
    }
    .chapter-body h2 { font-size: 19px; margin: 24px 0 10px; color: #1e1b4b; }
    .chapter-body h3 { font-size: 16px; margin: 18px 0 8px; color: #312e81; }
    .chapter-body p { margin: 0 0 14px; text-align: justify; }
    .chapter-body blockquote {
      margin: 18px 0;
      padding: 14px 18px;
      border-left: 4px solid ${accentColor};
      background: #f1f5f9;
      border-radius: 6px;
    }
    .chapter-body mark { background: #fef08a; padding: 1px 4px; border-radius: 3px; }
    .chapter-body pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 14px 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 13px;
    }
    .chapter-body table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13.5px; }
    .chapter-body th, .chapter-body td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    .chapter-body th { background: #eef2ff; font-weight: 700; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .book-sheet { box-shadow: none; padding: 0; max-width: 100%; border-radius: 0; }
    }
  </style>
</head>
<body>
  <main class="book-sheet">
    ${coverHtml}
    ${tocHtml}
    ${chaptersHtml}
  </main>
</body>
</html>`;
}

export function exportPrintReadyHtml(
  project: SkyxBookProject,
  options: PrintExportOptions
): string {
  const html = buildPrintReadyBookHtml(project, options);
  const fileName = `${slugifyFileName(project.title)}-print.html`;
  triggerDownload(html, fileName, "text/html;charset=utf-8");
  return fileName;
}

/**
 * Converts a SkyxBookProject into Skyx Academy's Book + BookTopic models
 * so it can be published directly into the Skyx Book Reader.
 */
export function convertProjectToSkyxReaderBook(
  project: SkyxBookProject,
  options: SkyxReaderPublishOptions
): {
  book: Omit<Book, "createdAt" | "updatedAt">;
  topics: Omit<BookTopic, "createdAt" | "updatedAt">[];
} {
  const cleanBookId = `book-bm-${project.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || Date.now()}`;
  const sorted = getSortedChapters(project);

  const topics: Omit<BookTopic, "createdAt" | "updatedAt">[] =
    sorted.length > 0
      ? sorted.map((ch, idx) => {
          const md = resolveChapterBodyMarkdown(project, ch) || `# ${ch.title}\n\n(No content yet)`;
          const words = md.split(/\s+/).filter(Boolean).length;
          return {
            id: `topic-${cleanBookId}-${idx + 1}`,
            bookId: cleanBookId,
            chapterNumber: ch.chapterNumber || idx + 1,
            chapterTitle: ch.title.slice(0, 190),
            sectionTitle:
              ch.pageStart
                ? `Pages ${ch.pageStart}–${ch.pageEnd ?? ch.pageStart}`
                : `Section ${idx + 1}`,
            topicTitle: ch.title.slice(0, 230),
            orderIndex: idx + 1,
            contentMarkdown: md.slice(0, 58000),
            readingMinutes: Math.max(1, Math.ceil(words / 180)),
            model3dKey: "",
            isPublished: options.isPublished,
          };
        })
      : [
          {
            id: `topic-${cleanBookId}-1`,
            bookId: cleanBookId,
            chapterNumber: 1,
            chapterTitle: project.title.slice(0, 190),
            sectionTitle: "Full Document",
            topicTitle: project.title.slice(0, 230),
            orderIndex: 1,
            contentMarkdown: buildCombinedMarkdownString(project).slice(0, 58000),
            readingMinutes: Math.max(
              1,
              Math.ceil(project.extraction.totalWords / 180)
            ),
            model3dKey: "",
            isPublished: options.isPublished,
          },
        ];

  const book: Omit<Book, "createdAt" | "updatedAt"> = {
    id: cleanBookId,
    curriculumId: options.curriculumId,
    title: project.title.slice(0, 195),
    subtitle: (project.subtitle || `${project.subject} · Book Manager Edition`).slice(
      0,
      235
    ),
    author: (project.author || "Skyx Editorial").slice(0, 135),
    subject: (project.subject || "General").slice(0, 120),
    language: project.language,
    accessTier: options.accessTier,
    coverColor: options.coverColor,
    description:
      `Published from Skyx Book Manager (${project.extraction.format.toUpperCase()} source · ${topics.length} chapters · ${project.extraction.totalWords.toLocaleString()} words).`.slice(
        0,
        1150
      ),
    totalTopics: topics.length,
    isPublished: options.isPublished,
  };

  return { book, topics };
}
