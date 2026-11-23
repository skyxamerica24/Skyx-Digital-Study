import type {
  BookChapterNode,
  BookPageRecord,
  SkyxBookProject,
} from "@/lib/book-engine/types";

function createChapterId(): string {
  return `ch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Re-indexes chapter orderIndex and sequential chapterNumber cleanly.
 */
export function normalizeChapterSequence(
  chapters: BookChapterNode[]
): BookChapterNode[] {
  let topLevelCounter = 0;
  return chapters.map((ch, idx) => {
    if (ch.level === 1) {
      topLevelCounter += 1;
    }
    return {
      ...ch,
      orderIndex: idx,
      chapterNumber: ch.level === 1 ? topLevelCounter : Math.max(1, topLevelCounter),
    };
  });
}

/**
 * Synchronizes every chapter's contentMarkdown and each page's chapterId
 * based on chapter [pageStart..pageEnd] ranges (ignoring skipped pages).
 */
export function syncChaptersFromPageRanges(
  project: SkyxBookProject,
  chaptersOverride?: BookChapterNode[]
): SkyxBookProject {
  const ordered = normalizeChapterSequence(chaptersOverride ?? project.chapters);
  const pageToChapter = new Map<number, string>();

  const syncedChapters = ordered.map((ch) => {
    if (ch.pageStart == null || ch.pageEnd == null) {
      return ch;
    }
    const start = Math.min(ch.pageStart, ch.pageEnd);
    const end = Math.max(ch.pageStart, ch.pageEnd);
    const matchedPages = project.pages.filter(
      (p) => p.pageNumber >= start && p.pageNumber <= end && p.status !== "skipped"
    );
    matchedPages.forEach((p) => {
      pageToChapter.set(p.pageNumber, ch.id);
    });
    const compiledMarkdown = matchedPages
      .map((p) => p.cleanedText.trim())
      .filter(Boolean)
      .join("\n\n");

    return {
      ...ch,
      pageStart: start,
      pageEnd: end,
      contentMarkdown: compiledMarkdown,
    };
  });

  const nextPages: BookPageRecord[] = project.pages.map((p) => ({
    ...p,
    chapterId: pageToChapter.get(p.pageNumber) ?? null,
  }));

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    extraction: {
      ...project.extraction,
      detectedOutlineCount: syncedChapters.length,
    },
    pages: nextPages,
    chapters: syncedChapters,
  };
}

export interface ParsedBatchChapter {
  title: string;
  level: 1 | 2 | 3;
  pageStart: number | null;
  pageEnd: number | null;
}

const BENGALI_DIGITS: Record<string, string> = {
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

function toAsciiDigits(str: string): string {
  return str.replace(/[০-৯]/g, (d) => BENGALI_DIGITS[d] ?? d);
}

/**
 * Parses fast batch TOC lines such as:
 *   অধ্যায় ১: কোষ ও এর গঠন | 1-14
 *   Chapter 2: Genetics = 15-30
 *   -- Section 2.1: DNA | 18-22
 *   Chapter 3: Evolution | 31
 */
export function parseBatchRangeInput(
  rawInput: string,
  maxPage: number
): ParsedBatchChapter[] {
  const lines = rawInput
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed: ParsedBatchChapter[] = [];

  for (const rawLine of lines) {
    let level: 1 | 2 | 3 = 1;
    let line = rawLine;
    if (line.startsWith("---")) {
      level = 3;
      line = line.replace(/^---+\s*/, "");
    } else if (line.startsWith("--") || line.startsWith(">")) {
      level = 2;
      line = line.replace(/^(?:--|>)\s*/, "");
    }

    const ascii = toAsciiDigits(line);
    const rangeMatch = ascii.match(
      /(?:\||=|,|:)?\s*(?:pages?|pg\.?|p\.?|পৃষ্ঠা)?\s*(\d+)(?:\s*[-–—to]+\s*(\d+))?\s*$/i
    );

    let title = line;
    let pageStart: number | null = null;
    let pageEnd: number | null = null;

    if (rangeMatch && rangeMatch.index !== undefined) {
      const candidateTitle = line
        .slice(0, rangeMatch.index)
        .replace(/[\s|=,:-]+$/, "")
        .trim();
      const s = Math.max(1, Math.min(maxPage || 1, Number(rangeMatch[1])));
      const e = rangeMatch[2]
        ? Math.max(s, Math.min(maxPage || s, Number(rangeMatch[2])))
        : null;

      if (candidateTitle.length > 0) {
        title = candidateTitle;
        pageStart = s;
        pageEnd = e;
      }
    }

    if (title.length > 0) {
      parsed.push({ title, level, pageStart, pageEnd });
    }
  }

  // Auto-fill missing pageEnd from the next chapter's pageStart - 1
  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i].pageStart != null && parsed[i].pageEnd == null) {
      const nextWithStart = parsed.slice(i + 1).find((c) => c.pageStart != null);
      if (nextWithStart && nextWithStart.pageStart != null) {
        parsed[i].pageEnd = Math.max(parsed[i].pageStart!, nextWithStart.pageStart - 1);
      } else {
        parsed[i].pageEnd = Math.max(parsed[i].pageStart!, maxPage || parsed[i].pageStart!);
      }
    }
  }

  return parsed;
}

export function applyBatchRangeToc(
  project: SkyxBookProject,
  rawInput: string
): { project: SkyxBookProject; count: number } {
  const entries = parseBatchRangeInput(rawInput, project.pages.length);
  if (entries.length === 0) {
    return { project, count: 0 };
  }

  const newChapters: BookChapterNode[] = entries.map((entry, idx) => ({
    id: createChapterId(),
    orderIndex: idx,
    chapterNumber: idx + 1,
    title: entry.title,
    level: entry.level,
    parentId: null,
    pageStart: entry.pageStart,
    pageEnd: entry.pageEnd,
    contentMarkdown: "",
    tags: [],
    status: "draft",
  }));

  return {
    project: syncChaptersFromPageRanges(project, newChapters),
    count: newChapters.length,
  };
}

/**
 * Re-scans all active cleaned pages for Bangla/English chapter headings.
 */
export function autoDetectChaptersFromCleanedPages(
  project: SkyxBookProject
): { project: SkyxBookProject; detectedCount: number } {
  const headingRegex =
    /^(?:#{1,2}\s+(.+)|(?:chapter|unit|part|module|lesson|অধ্যায়|অধ্যায়|পাঠ|পরিচ্ছেদ)\s*[-:.–—]?\s*([0-9০-৯]+|[IVXLCDM]+)?[\s.:–—-]*(.*))$/im;

  const activePages = project.pages.filter((p) => p.status !== "skipped");
  const starts: { pageNumber: number; title: string; level: 1 | 2 }[] = [];

  for (const page of activePages) {
    const lines = page.cleanedText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 6);

    for (const line of lines) {
      if (line.length > 140) continue;
      const match = line.match(headingRegex);
      if (match) {
        const isH2 = line.startsWith("## ");
        const title = (match[1] || line.replace(/^#{1,3}\s+/, "")).trim();
        if (title.length >= 2) {
          starts.push({
            pageNumber: page.pageNumber,
            title,
            level: isH2 ? 2 : 1,
          });
          break;
        }
      }
    }
  }

  if (starts.length === 0) {
    return { project, detectedCount: 0 };
  }

  const maxPage = project.pages.length;
  const built: BookChapterNode[] = starts.map((s, idx) => {
    const end =
      idx + 1 < starts.length
        ? Math.max(s.pageNumber, starts[idx + 1].pageNumber - 1)
        : maxPage;
    return {
      id: createChapterId(),
      orderIndex: idx,
      chapterNumber: idx + 1,
      title: s.title,
      level: s.level,
      parentId: null,
      pageStart: s.pageNumber,
      pageEnd: end,
      contentMarkdown: "",
      tags: [],
      status: "draft",
    };
  });

  return {
    project: syncChaptersFromPageRanges(project, built),
    detectedCount: built.length,
  };
}

export function reorderChaptersInProject(
  project: SkyxBookProject,
  fromIndex: number,
  toIndex: number
): SkyxBookProject {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= project.chapters.length ||
    toIndex >= project.chapters.length
  ) {
    return project;
  }

  const next = [...project.chapters];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    chapters: normalizeChapterSequence(next),
  };
}

export function mergeChapterWithNextInProject(
  project: SkyxBookProject,
  chapterId: string
): SkyxBookProject {
  const idx = project.chapters.findIndex((c) => c.id === chapterId);
  if (idx < 0 || idx >= project.chapters.length - 1) return project;

  const first = project.chapters[idx];
  const second = project.chapters[idx + 1];

  const pageStart =
    first.pageStart != null && second.pageStart != null
      ? Math.min(first.pageStart, second.pageStart)
      : first.pageStart ?? second.pageStart;
  const pageEnd =
    first.pageEnd != null && second.pageEnd != null
      ? Math.max(first.pageEnd, second.pageEnd)
      : first.pageEnd ?? second.pageEnd;

  const merged: BookChapterNode = {
    ...first,
    pageStart,
    pageEnd,
    contentMarkdown: [first.contentMarkdown.trim(), second.contentMarkdown.trim()]
      .filter(Boolean)
      .join("\n\n"),
    tags: Array.from(new Set([...first.tags, ...second.tags])),
  };

  const nextChapters = [
    ...project.chapters.slice(0, idx),
    merged,
    ...project.chapters.slice(idx + 2),
  ];

  const nextPages = project.pages.map((p) =>
    p.chapterId === second.id ? { ...p, chapterId: merged.id } : p
  );

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    pages: nextPages,
    chapters: normalizeChapterSequence(nextChapters),
  };
}

export function addChapterToProject(
  project: SkyxBookProject,
  title: string,
  pageStart: number | null,
  pageEnd: number | null,
  level: 1 | 2 | 3 = 1
): SkyxBookProject {
  const newChapter: BookChapterNode = {
    id: createChapterId(),
    orderIndex: project.chapters.length,
    chapterNumber: project.chapters.length + 1,
    title: title.trim() || `Chapter ${project.chapters.length + 1}`,
    level,
    parentId: null,
    pageStart,
    pageEnd,
    contentMarkdown: "",
    tags: [],
    status: "draft",
  };
  return syncChaptersFromPageRanges(project, [...project.chapters, newChapter]);
}
