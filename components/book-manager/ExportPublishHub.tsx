"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Archive,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  HardDrive,
  Layers,
  Loader2,
  Printer,
  Send,
  Server,
  Sparkles,
  X,
} from "lucide-react";
import { persistBookTopics } from "@/lib/actions/book-actions";
import { importBuilderOutline } from "@/lib/actions/book-builder-actions";
import { getSessionToken } from "@/lib/auth/session-storage";
import { useApp } from "@/components/context/AppContext";
import {
  convertProjectToSkyxReaderBook,
  resolveChapterBodyMarkdown,
  exportBookCsv,
  exportChaptersMarkdownZip,
  exportCombinedMarkdown,
  exportPortableSkyxBook,
  exportPrintReadyHtml,
  exportSkyxBookZipBundle,
  exportStructuredDataJson,
  type PrintExportOptions,
} from "@/lib/book-engine/exporters";
import type { SkyxBookProject } from "@/lib/book-engine/types";
import type { AccessTier } from "@/lib/types";

interface ExportPublishHubProps {
  project: SkyxBookProject;
  onNotify: (message: string, tone?: "info" | "success" | "error") => void;
}

interface StorageStatusResponse {
  status: {
    mode: "portable" | "vps-local";
    ready: boolean;
    requiresToken: boolean;
    baseDirConfigured: boolean;
    message: string;
  };
}

const COVER_PRESETS = [
  { id: "indigo", label: "Indigo Royal", value: "from-indigo-600 to-violet-700" },
  { id: "emerald", label: "Emerald Bio", value: "from-emerald-600 to-teal-700" },
  { id: "sky", label: "Sky Physics", value: "from-sky-600 to-indigo-700" },
  { id: "amber", label: "Amber Classic", value: "from-amber-600 to-orange-700" },
  { id: "slate", label: "Executive Dark", value: "from-slate-800 to-slate-950" },
];

const VPS_ENV_SNIPPET = `# Add to your VPS .env (No Docker required)
SKYX_STORAGE_MODE="vps_local"
SKYX_VPS_STORAGE_DIR="/var/skyx-books"
SKYX_VPS_STORAGE_TOKEN="generate-a-long-random-secret-here"`;

export default function ExportPublishHub({
  project,
  onNotify,
}: ExportPublishHubProps) {
  const { curriculums, applyPublishedBook, openBookReader, isAdmin, setActivePanel, setAdminRoute } = useApp();

  const [printOptions, setPrintOptions] = useState<PrintExportOptions>({
    paperTheme: "ivory",
    includeCover: true,
    includeToc: true,
    chapterPageBreaks: true,
  });
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Skyx Book Reader publish bridge state
  const [curriculumId, setCurriculumId] = useState<string>(
    curriculums[0]?.id || ""
  );
  const [accessTier, setAccessTier] = useState<AccessTier>("free");
  const [coverColor, setCoverColor] = useState<string>(COVER_PRESETS[0].value);
  const [publishing, setPublishing] = useState(false);
  const [lastPublishedBook, setLastPublishedBook] = useState<{
    bookId: string;
    firstTopicId: string;
    title: string;
  } | null>(null);

  // VPS storage adapter status
  const [storageStatus, setStorageStatus] = useState<
    StorageStatusResponse["status"] | null
  >(null);
  const [copiedVpsEnv, setCopiedVpsEnv] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/book-engine/storage", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StorageStatusResponse | null) => {
        if (active && data?.status) {
          setStorageStatus(data.status);
        }
      })
      .catch(() => {
        // Keep portable fallback display cleanly
      });
    return () => {
      active = false;
    };
  }, []);

  const sortedChapters = useMemo(
    () => [...project.chapters].sort((a, b) => a.orderIndex - b.orderIndex),
    [project.chapters]
  );

  const activePagesCount = useMemo(
    () => project.pages.filter((p) => p.status !== "skipped").length,
    [project.pages]
  );

  const readyChaptersCount = useMemo(
    () => project.chapters.filter((c) => c.status === "ready").length,
    [project.chapters]
  );

  const handlePublishToReader = async (openAfter: boolean) => {
    setPublishing(true);
    try {
      const { book, topics } = convertProjectToSkyxReaderBook(project, {
        curriculumId: curriculumId || curriculums[0]?.id || "",
        accessTier,
        coverColor,
        isPublished: true,
      });
      const saved = await persistBookTopics(getSessionToken(), book.id, topics, book);
      applyPublishedBook(saved.book, saved.topics);
      const firstTopicId = topics[0]?.id || "";
      setLastPublishedBook({
        bookId: book.id,
        firstTopicId,
        title: book.title,
      });
      onNotify(
        `Published "${book.title}" (${topics.length} chapters). Manage its listing in Admin Books.`,
        "success"
      );
      if (openAfter) {
        openBookReader(book.id, firstTopicId, "reading");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to publish book to Skyx Reader.";
      onNotify(msg, "error");
    } finally {
      setPublishing(false);
    }
  };

  async function createBuilderDraft() {
    setPublishing(true);
    try {
      const outline = sortedChapters.length ? sortedChapters.map(chapter => ({
        key: chapter.id, parentKey: chapter.parentId, title: chapter.title,
        markdown: resolveChapterBodyMarkdown(project, chapter),
      })) : [{
        key: "document", parentKey: null, title: project.title,
        markdown: project.pages.filter(page => page.status !== "skipped").map(page => page.cleanedText).join("\n\n"),
      }];
      const { title, author, subtitle, subject, language } = project;
      await importBuilderOutline(getSessionToken(), {
        title: title.slice(0,195), author:author.slice(0,135), subtitle:subtitle.slice(0,235),
        subject:subject.slice(0,135), language, description:"", accessTier:"free",
      }, outline);
      onNotify("Builder draft created. Open it from Saved Book Drafts.", "success");
      setAdminRoute("books");
      setActivePanel("admin");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Could not create the Builder draft.", "error");
    } finally {
      setPublishing(false);
    }
  }

  const handleCopyVpsSnippet = async () => {
    try {
      await navigator.clipboard.writeText(VPS_ENV_SNIPPET);
      setCopiedVpsEnv(true);
      setTimeout(() => setCopiedVpsEnv(false), 1800);
      onNotify("Copied VPS .env configuration snippet.", "info");
    } catch {
      onNotify("Clipboard unavailable in this browser context.", "error");
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI READINESS STRIP (Global 2-per-row mobile -> 4-per-row xl) */}
      <div className="skyx-grid-kpi">
        <div className="rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">
            Chapters Ready
          </div>
          <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
            {readyChaptersCount}
            <span className="text-xs font-medium text-slate-400 ml-1">
              / {project.chapters.length}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">
            Active Pages
          </div>
          <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
            {activePagesCount}
            <span className="text-xs font-medium text-slate-400 ml-1">
              / {project.pages.length}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">
            Total Words
          </div>
          <div className="font-display text-lg sm:text-xl font-extrabold text-indigo-700 mt-0.5">
            {project.extraction.totalWords.toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">
            Storage Engine
          </div>
          <div className="font-display text-sm sm:text-base font-extrabold text-emerald-700 mt-1 flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {storageStatus?.mode === "vps-local"
                ? "VPS Local Disk"
                : "Portable Mode"}
            </span>
          </div>
        </div>
      </div>

      {/* MULTI-FORMAT EXPORT HUB CARDS (2-per-row mobile -> 3-per-row xl) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
              Multi-Format Export Hub
            </h2>
            <p className="text-[11.5px] text-slate-500">
              Exports download directly to your device.
            </p>
          </div>
        </div>

        <div className="skyx-grid-cards">
          {/* 1. Lossless .skyxbook.json */}
          <div className="rounded-2xl bg-white border border-indigo-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileJson className="w-4.5 h-4.5" />
                </div>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                  MASTER
                </span>
              </div>
              <h3 className="font-display text-xs sm:text-sm font-bold text-slate-900">
                Portable .skyxbook.json
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                A lossless project file for resuming your work.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const name = exportPortableSkyxBook(project);
                onNotify(`Saved portable master "${name}".`, "success");
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save .skyxbook</span>
            </button>
          </div>

          {/* 2. Complete .skyxbook.zip Bundle */}
          <div className="rounded-2xl bg-white border border-violet-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Archive className="w-4.5 h-4.5" />
                </div>
                <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-bold">
                  ALL-IN-ONE
                </span>
              </div>
              <h3 className="font-display text-xs sm:text-sm font-bold text-slate-900">
                Full .skyxbook.zip Bundle
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Archive the master project, chapter Markdown, CSV and printable HTML together.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const name = exportSkyxBookZipBundle(project, printOptions);
                onNotify(`Exported full archive "${name}".`, "success");
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Download .zip</span>
            </button>
          </div>

          {/* 3. Chapter-Wise Markdown ZIP */}
          <div className="rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Layers className="w-4.5 h-4.5" />
                </div>
                <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-bold">
                  {project.chapters.length} MD
                </span>
              </div>
              <h3 className="font-display text-xs sm:text-sm font-bold text-slate-900">
                Chapter-Wise .md ZIP
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Numbered Markdown chapters with a SUMMARY.md table of contents.
              </p>
            </div>
            <button
              type="button"
              disabled={project.chapters.length === 0}
              onClick={() => {
                const name = exportChaptersMarkdownZip(project);
                onNotify(`Exported chapter Markdown ZIP "${name}".`, "success");
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-sky-700 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Chapters .zip</span>
            </button>
          </div>

          {/* 4. Combined Markdown & Structured JSON */}
          <div className="rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <FileCode2 className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-display text-xs sm:text-sm font-bold text-slate-900">
                Single .md &amp; Structured JSON
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Export one Markdown file with YAML front matter or structured JSON.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const name = exportCombinedMarkdown(project);
                  onNotify(`Exported "${name}".`, "success");
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>.md</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = exportStructuredDataJson(project);
                  onNotify(`Exported "${name}".`, "success");
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* 5. Excel-Safe Bangla CSV */}
          <div className="rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-display text-xs sm:text-sm font-bold text-slate-900">
                CSV Dataset (Bangla Excel)
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The CSV includes a UTF-8 BOM for spreadsheet compatibility.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={project.chapters.length === 0}
                onClick={() => {
                  const name = exportBookCsv(project, "chapters");
                  onNotify(`Exported Chapters CSV "${name}".`, "success");
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
              >
                <span>Chapters</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = exportBookCsv(project, "pages");
                  onNotify(`Exported Pages CSV "${name}".`, "success");
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold cursor-pointer"
              >
                <span>Pages</span>
              </button>
            </div>
          </div>

          {/* 6. Print-Ready A4 HTML & Live Paper Preview */}
          <div className="rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Printer className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-display text-xs sm:text-sm font-bold text-slate-900">
                Print-Ready A4 HTML Book
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                A4 layout with a cover, contents and Bengali fonts for print or PDF.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setShowPrintPreview(true)}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-semibold cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = exportPrintReadyHtml(project, printOptions);
                  onNotify(`Exported print-ready HTML "${name}".`, "success");
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.html</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM 2-COLUMN BRIDGE: SKYX READER PUBLISHER + VPS LOCAL DISK ADAPTER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SKYX BOOK READER PUBLISH BRIDGE */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Skyx Book Reader Bridge</span>
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-slate-900">
                Publish and Preview in Skyx Book Reader
              </h3>
              <p className="text-[11.5px] text-slate-500">
                Open the organized chapters as a book in the reader with notes, highlights and AI tutoring.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-[11px] font-semibold text-slate-600">
                Curriculum
              </span>
              <select
                value={curriculumId}
                onChange={(e) => setCurriculumId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
              >
                {curriculums.map((curr) => (
                  <option key={curr.id} value={curr.id}>
                    {curr.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 block">
              <span className="text-[11px] font-semibold text-slate-600">
                Access Tier
              </span>
              <select
                value={accessTier}
                onChange={(e) => setAccessTier(e.target.value as AccessTier)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
              >
                <option value="free">Free</option>
                <option value="pro">Pro Membership</option>
                <option value="elite">Elite Membership</option>
              </select>
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-600">
              Cover Accent Style
            </span>
            <div className="flex flex-wrap gap-2">
              {COVER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setCoverColor(preset.value)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                    coverColor === preset.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${preset.value}`}
                  />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={publishing || !isAdmin}
              onClick={() => void handlePublishToReader(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Publish &amp; Open in Reader</span>
            </button>
            <button
              type="button"
              disabled={publishing || !isAdmin}
              onClick={() => void handlePublishToReader(false)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Save to Library</span>
            </button>
          </div>

          {isAdmin && <button type="button" disabled={publishing} onClick={createBuilderDraft}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
            Create Builder Draft
          </button>}

          {lastPublishedBook && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate font-medium">
                  Published: {lastPublishedBook.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  openBookReader(
                    lastPublishedBook.bookId,
                    lastPublishedBook.firstTopicId,
                    "reading"
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
              >
                Read Now
              </button>
            </div>
          )}
        </div>

        {/* VPS LOCAL DISK STORAGE ADAPTER CARD (NO DOCKER REQUIRED) */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                <Server className="w-3.5 h-3.5 text-indigo-600" />
                <span>VPS Local Disk Storage Adapter</span>
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-slate-900">
                VPS Local Disk Storage
              </h3>
              <p className="text-[11.5px] text-slate-500">
                Configure these environment variables to enable local disk storage on your VPS.
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase shrink-0 ${
                storageStatus?.mode === "vps-local"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-indigo-50 border-indigo-200 text-indigo-700"
              }`}
            >
              {storageStatus?.mode === "vps-local" ? "VPS Active" : "Portable"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11.5px] text-slate-700 leading-relaxed">
            {storageStatus?.message ||
              "Running in Portable Export Mode. Use Save .skyxbook to keep lossless project files on your own device."}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">
                Future VPS Deployment Config (.env)
              </span>
              <button
                type="button"
                onClick={() => void handleCopyVpsSnippet()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-semibold cursor-pointer"
              >
                {copiedVpsEnv ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Config</span>
                  </>
                )}
              </button>
            </div>
            <pre className="rounded-xl bg-slate-950 text-slate-200 p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
              {VPS_ENV_SNIPPET}
            </pre>
          </div>

          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>• Path-confined atomic disk writes</span>
            <span>• Zero cloud storage dependency</span>
            <span>• Standard Node.js (PM2 / systemd)</span>
          </div>
        </div>
      </div>

      {/* IN-APP PRINT / BOOK PAPER PREVIEW MODAL (Safe ReactMarkdown — Zero Raw HTML) */}
      {showPrintPreview && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5"
          onClick={() => setShowPrintPreview(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Header + Paper Controls */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-indigo-600" />
                  <span>Print &amp; Paper Preview</span>
                </span>

                <div className="inline-flex rounded-xl bg-white p-0.5 border border-slate-200 text-[11px]">
                  {(
                    [
                      { id: "ivory", label: "Ivory Book" },
                      { id: "clean", label: "Clean White" },
                      { id: "exam", label: "Exam Print" },
                    ] as const
                  ).map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() =>
                        setPrintOptions((prev) => ({
                          ...prev,
                          paperTheme: theme.id,
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                        printOptions.paperTheme === theme.id
                          ? "bg-indigo-600 text-white"
                          : "text-slate-600"
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printOptions.includeCover}
                    onChange={(e) =>
                      setPrintOptions((prev) => ({
                        ...prev,
                        includeCover: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Cover</span>
                </label>
                <label className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printOptions.includeToc}
                    onChange={(e) =>
                      setPrintOptions((prev) => ({
                        ...prev,
                        includeToc: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>TOC</span>
                </label>
                <label className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printOptions.chapterPageBreaks}
                    onChange={(e) =>
                      setPrintOptions((prev) => ({
                        ...prev,
                        chapterPageBreaks: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Page Breaks</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const name = exportPrintReadyHtml(project, printOptions);
                    onNotify(`Downloaded print-ready "${name}". Open in browser and press Ctrl+P to save PDF!`, "success");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .html</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(false)}
                  className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 cursor-pointer"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Paper Sheet Body */}
            <div className="flex-1 overflow-y-auto bg-slate-200/75 p-3 sm:p-6">
              <div
                className={`max-w-3xl mx-auto rounded-2xl shadow-lg border border-slate-200/80 p-6 sm:p-10 space-y-8 ${
                  printOptions.paperTheme === "ivory"
                    ? "bg-[#FDFBF7]"
                    : "bg-white"
                }`}
              >
                {printOptions.includeCover && (
                  <div className="pb-8 border-b-2 border-slate-200 space-y-3">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase tracking-wider">
                      {project.subject || "Academic Edition"}
                    </span>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-950 leading-snug">
                      {project.title}
                    </h1>
                    {project.subtitle && (
                      <p className="text-sm text-slate-600">{project.subtitle}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2">
                      <span>
                        <strong className="text-slate-700">Author:</strong>{" "}
                        {project.author}
                      </span>
                      <span>
                        <strong className="text-slate-700">Chapters:</strong>{" "}
                        {sortedChapters.length}
                      </span>
                      <span>
                        <strong className="text-slate-700">Words:</strong>{" "}
                        {project.extraction.totalWords.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {printOptions.includeToc && sortedChapters.length > 0 && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 sm:p-5 space-y-2.5">
                    <h2 className="font-display text-sm font-bold text-indigo-900">
                      Table of Contents
                    </h2>
                    <ol className="space-y-1.5 text-xs">
                      {sortedChapters.map((ch) => (
                        <li
                          key={ch.id}
                          className={`flex items-center justify-between gap-2 pb-1 border-b border-dashed border-slate-200 ${
                            ch.level === 2
                              ? "pl-4"
                              : ch.level === 3
                              ? "pl-8"
                              : ""
                          }`}
                        >
                          <span className="font-semibold text-slate-800">
                            {ch.chapterNumber}. {ch.title}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 shrink-0">
                            {ch.pageStart
                              ? `P.${ch.pageStart}${ch.pageEnd && ch.pageEnd !== ch.pageStart ? `–${ch.pageEnd}` : ""}`
                              : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {sortedChapters.map((ch) => (
                  <article
                    key={ch.id}
                    className="space-y-3 pb-6 border-b border-slate-200/80 last:border-b-0"
                  >
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-600">
                      Chapter {ch.chapterNumber}
                    </div>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                      {ch.title}
                    </h2>
                    <div className="skyx-prose text-sm sm:text-[15px] leading-relaxed text-slate-800">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {ch.contentMarkdown || "_(Empty chapter)_"}
                      </ReactMarkdown>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
