"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSessionToken } from "@/lib/auth/session-storage";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileUp,
  Layers,
  ListTree,
  Loader2,
  Merge,
  PanelLeftOpen,
  RefreshCw,
  Scissors,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";
import ExportPublishHub from "@/components/book-manager/ExportPublishHub";
import PageCleanupPanel from "@/components/book-manager/PageCleanupPanel";
import TocOrganizerPanel from "@/components/book-manager/TocOrganizerPanel";
import {
  mergePageWithNextInProject,
  splitPageAtIndexInProject,
} from "@/lib/book-engine/cleanup";
import {
  exportCombinedMarkdown,
  exportPortableSkyxBook,
  exportStructuredDataJson,
} from "@/lib/book-engine/exporters";
import {
  appendExtractedClipToProject,
  type ExtractedPageClip,
  type ReaderDocumentItem,
} from "@/lib/book-engine/reader-helpers";
import type {
  BookPageRecord,
  BookProjectLanguage,
  SkyxBookProject,
} from "@/lib/book-engine/types";

type WorkspaceMode = "reader" | "studio";
type StudioTab = "ingest" | "pages" | "toc" | "editor" | "export";
type PageFilter = "all" | "active" | "skipped" | "scanned";

const SmartDocumentReader = dynamic(
  () => import("@/components/book-manager/SmartDocumentReader"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center space-y-2.5">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-600">
          Initializing Modern Reader Engine...
        </p>
      </div>
    ),
  }
);

const VisualBookEditor = dynamic(
  () => import("@/components/book-manager/VisualBookEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center space-y-2.5">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-600">
          Loading Visual Book Studio...
        </p>
      </div>
    ),
  }
);

const PAGES_PER_SLICE = 20;

const SUPPORTED_ENGINE_ITEMS = [
  { format: "PDF", engine: "PDF.js + unpdf", icon: FileText },
  { format: "EPUB", engine: "fflate + XML", icon: BookOpen },
  { format: "DOCX", engine: "mammoth", icon: FileCode2 },
  { format: "CSV", engine: "papaparse", icon: FileSpreadsheet },
  { format: "MD / TXT", engine: "Smart Chunker", icon: Layers },
  { format: ".skyxbook", engine: "Lossless Resume", icon: FileJson },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function countWordsClient(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function createSampleBookProject(): SkyxBookProject {
  const now = new Date().toISOString();
  const ch1Id = "ch-sample-1";
  const ch2Id = "ch-sample-2";
  const samplePages: BookPageRecord[] = [
    {
      id: "pg-sample-1",
      pageNumber: 1,
      label: "অধ্যায় ১ — কোষ ও এর গঠন",
      rawText:
        "অধ্যায় ১: কোষ ও এর গঠন (Cell Structure)\n\nজীবদেহের গঠন ও কাজের একককে কোষ (Cell) বলে। ১৬৬৫ সালে রবার্ট হুক প্রথম কোষ আবিষ্কার করেন।\n\nপ্রধান অঙ্গাণু:\n1. মাইটোকন্ড্রিয়া (Powerhouse of Cell)\n2. রাইবোজোম (Protein Factory)\n3. নিউক্লিয়াস (Control Center)",
      cleanedText:
        "# অধ্যায় ১: কোষ ও এর গঠন (Cell Structure)\n\nজীবদেহের গঠন ও কাজের একককে কোষ (Cell) বলে। ১৬৬৫ সালে রবার্ট হুক প্রথম কোষ আবিষ্কার করেন।\n\n## প্রধান অঙ্গাণু\n- **মাইটোকন্ড্রিয়া:** কোষের পাওয়ারহাউস (ATP উৎপাদন করে)।\n- **রাইবোজোম:** প্রোটিন সংশ্লেষণের কারখানা।\n- **নিউক্লিয়াস:** কোষের সকল জৈবিক কাজের নিয়ন্ত্রণ কেন্দ্র।",
      wordCount: 44,
      charCount: 318,
      isLikelyScanned: false,
      status: "cleaned",
      chapterId: ch1Id,
      tags: ["biology", "hsc"],
    },
    {
      id: "pg-sample-2",
      pageNumber: 2,
      label: "অধ্যায় ২ — কোষ বিভাজন",
      rawText:
        "অধ্যায় ২: কোষ বিভাজন (Cell Division)\n\nযে প্রক্রিয়ায় একটি মাতৃকোষ বিভাজিত হয়ে দুটি বা চারটি অপত্য কোষ সৃষ্টি করে তাকে কোষ বিভাজন বলে।\n\nমাইটোসিস ধাপসমূহ: প্রোফেজ, প্রো-মেটাফেজ, মেটাফেজ, অ্যানাফেজ, টেলোফেজ।",
      cleanedText:
        "# অধ্যায় ২: কোষ বিভাজন (Cell Division)\n\nযে প্রক্রিয়ায় একটি মাতৃকোষ বিভাজিত হয়ে দুটি বা চারটি অপত্য কোষ সৃষ্টি করে তাকে কোষ বিভাজন বলে।\n\n## মাইটোসিস ধাপসমূহ\n1. প্রোফেজ (Prophase)\n2. প্রো-মেটাফেজ (Pro-metaphase)\n3. মেটাফেজ (Metaphase)\n4. অ্যানাফেজ (Anaphase)\n5. টেলোফেজ (Telophase)",
      wordCount: 38,
      charCount: 284,
      isLikelyScanned: false,
      status: "cleaned",
      chapterId: ch2Id,
      tags: ["mitosis"],
    },
  ];

  return {
    schemaVersion: "1.0",
    id: "book-sample-bio",
    title: "HSC Biology 1st Paper — Bilingual Sample",
    subtitle: "Portable Book Manager Demo Project",
    author: "Skyx Editorial",
    subject: "Biology",
    language: "bilingual",
    tags: ["hsc", "biology", "sample"],
    createdAt: now,
    updatedAt: now,
    storageRef: { mode: "portable" },
    extraction: {
      fileName: "hsc_biology_sample.md",
      format: "md",
      fileSizeBytes: 1240,
      sha256: "sample-demo-fingerprint-v1",
      engineUsed: "Markdown Structure Parser",
      extractedAt: now,
      totalPages: 2,
      totalWords: 82,
      totalChars: 602,
      scannedPageCount: 0,
      detectedOutlineCount: 2,
      warnings: [],
    },
    pages: samplePages,
    chapters: [
      {
        id: ch1Id,
        orderIndex: 0,
        chapterNumber: 1,
        title: "অধ্যায় ১: কোষ ও এর গঠন (Cell Structure)",
        level: 1,
        parentId: null,
        pageStart: 1,
        pageEnd: 1,
        contentMarkdown: samplePages[0].cleanedText,
        tags: ["biology"],
        status: "reviewed",
      },
      {
        id: ch2Id,
        orderIndex: 1,
        chapterNumber: 2,
        title: "অধ্যায় ২: কোষ বিভাজন (Cell Division)",
        level: 1,
        parentId: null,
        pageStart: 2,
        pageEnd: 2,
        contentMarkdown: samplePages[1].cleanedText,
        tags: ["mitosis"],
        status: "draft",
      },
    ],
  };
}

export default function BookManagerWorkspace() {
  const { notify, sidebarCollapsed, setSidebarCollapsed } = useApp();

  // Default Mode = Smart Reader (Mode 1), Extract Studio (Mode 2)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("reader");
  const [rightReaderPanelOpen, setRightReaderPanelOpen] = useState<boolean>(true);

  // Smart Reader Session Shelf & Clips
  const [readerDocs, setReaderDocs] = useState<ReaderDocumentItem[]>([]);
  const [activeReaderDocId, setActiveReaderDocId] = useState<string | null>(null);
  const [readerClips, setReaderClips] = useState<ExtractedPageClip[]>([]);
  const [readerUploading, setReaderUploading] = useState<boolean>(false);

  // Extract Studio State (5-Tab Pipeline)
  const [project, setProject] = useState<SkyxBookProject | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>("ingest");
  const [forceOcr, setForceOcr] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [savedPdfs, setSavedPdfs] = useState<{ id: string; fileName: string }[]>([]);
  const [archiveMessage, setArchiveMessage] = useState("");
  const loadArchive = async (id?: string) => {
    setExtracting(true);
    setArchiveMessage("");
    try {
      const res = await fetch("/api/book-engine/imports" + (id ? "?id=" + encodeURIComponent(id) : ""), {
        headers: { Authorization: "Bearer " + (getSessionToken() || "") },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (id) {
        const restored: SkyxBookProject = data.project;
        setProject(restored);
        setSelectedPageId(restored.pages[0]?.id ?? null);
        setPageSliceIndex(0);
        setPageSearch("");
        setPageFilter("all");
        setActiveTab("pages");
      } else {
        setSavedPdfs(data.items);
        if (!data.enabled) setArchiveMessage("PDF archiving is available in VPS storage mode.");
        else if (!data.items.length) setArchiveMessage("No saved PDF imports yet.");
      }
    } catch (error) {
      setArchiveMessage(error instanceof Error ? error.message : "Could not open the archive.");
    } finally {
      setExtracting(false);
    }
  };
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [pageSearch, setPageSearch] = useState("");
  const [pageFilter, setPageFilter] = useState<PageFilter>("all");
  const [pageSliceIndex, setPageSliceIndex] = useState(0);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [activeEditorChapterId, setActiveEditorChapterId] = useState<string | null>(null);
  const [inspectMode, setInspectMode] = useState<"cleaned" | "raw">("cleaned");
  const [tagInput, setTagInput] = useState("");

  const studioFileInputRef = useRef<HTMLInputElement | null>(null);
  const pageTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoCollapsedModeRef = useRef<WorkspaceMode | null>(null);

  // Auto-collapse main left sidebar once whenever entering Smart Reader mode (user can still expand anytime)
  useEffect(() => {
    if (workspaceMode === "reader" && autoCollapsedModeRef.current !== "reader") {
      setSidebarCollapsed(true);
      autoCollapsedModeRef.current = "reader";
    } else if (workspaceMode !== "reader") {
      autoCollapsedModeRef.current = workspaceMode;
    }
  }, [workspaceMode, setSidebarCollapsed]);

  const activeReaderDoc = useMemo(
    () =>
      readerDocs.find((d) => d.id === activeReaderDocId) ?? readerDocs[0] ?? null,
    [readerDocs, activeReaderDocId]
  );

  // --- SMART READER HANDLERS ---

  const handleAddBookToReader = async (file: File) => {
    setReaderUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const baseTitle = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");

      if (ext === "pdf") {
        // Pure client-side zero-wait PDF open (handles 300+ pages without uploading to server!)
        const arrayBuf = await file.arrayBuffer();
        const pdfBytes = new Uint8Array(arrayBuf);
        const newDoc: ReaderDocumentItem = {
          id: `rdoc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: baseTitle || file.name,
          fileName: file.name,
          format: "pdf",
          fileSizeBytes: file.size,
          totalPages: 1, // Updated automatically as soon as PDF.js opens the header
          currentPage: 1,
          bookmarks: [],
          addedAt: new Date().toISOString(),
          pdfBytes,
        };
        setReaderDocs((prev) => [newDoc, ...prev]);
        setActiveReaderDocId(newDoc.id);
        notify(`Opened "${newDoc.title}" in Smart Reader.`, "success");
        return;
      }

      // Non-PDF formats (EPUB, DOCX, MD, TXT, CSV, .skyxbook.json) parse cleanly via server extractor
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/book-engine/extract", {
        method: "POST",
        headers: { Authorization: "Bearer " + (getSessionToken() || "") },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Could not open this document.");
      }

      const extracted = data.project as SkyxBookProject;
      const newDoc: ReaderDocumentItem = {
        id: `rdoc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: extracted.title,
        fileName: extracted.extraction.fileName,
        format: extracted.extraction.format,
        fileSizeBytes: extracted.extraction.fileSizeBytes,
        totalPages: Math.max(1, extracted.pages.length),
        currentPage: 1,
        bookmarks: [],
        addedAt: new Date().toISOString(),
        textPages: extracted.pages,
        linkedProject: extracted,
      };
      setReaderDocs((prev) => [newDoc, ...prev]);
      setActiveReaderDocId(newDoc.id);
      if (!project) {
        setProject(extracted);
        setSelectedPageId(extracted.pages[0]?.id ?? null);
      }
      notify(
        `Opened "${newDoc.title}" (${newDoc.totalPages} pages) in Smart Reader.`,
        "success"
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to open document in Reader.";
      notify(msg, "error");
    } finally {
      setReaderUploading(false);
    }
  };

  const handleLoadSampleInReader = () => {
    const sample = createSampleBookProject();
    const existing = readerDocs.find((d) => d.id === "rdoc-sample-bio");
    if (existing) {
      setActiveReaderDocId(existing.id);
      return;
    }
    const sampleDoc: ReaderDocumentItem = {
      id: "rdoc-sample-bio",
      title: sample.title,
      fileName: sample.extraction.fileName,
      format: "md",
      fileSizeBytes: sample.extraction.fileSizeBytes,
      totalPages: sample.pages.length,
      currentPage: 1,
      bookmarks: [1],
      addedAt: new Date().toISOString(),
      textPages: sample.pages,
      linkedProject: sample,
    };
    setReaderDocs((prev) => [sampleDoc, ...prev]);
    setActiveReaderDocId(sampleDoc.id);
    if (!project) {
      setProject(sample);
      setSelectedPageId(sample.pages[0]?.id ?? null);
    }
    notify("Opened bilingual sample book in Smart Reader.", "success");
  };

  const handleRemoveReaderDoc = (docId: string) => {
    setReaderDocs((prev) => {
      const next = prev.filter((d) => d.id !== docId);
      if (activeReaderDocId === docId) {
        setActiveReaderDocId(next[0]?.id ?? null);
      }
      return next;
    });
    notify("Closed book and freed session memory.", "info");
  };

  const handleUpdateReaderDoc = (
    docId: string,
    patch: Partial<ReaderDocumentItem>
  ) => {
    setReaderDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, ...patch } : d))
    );
  };

  const handleSendClipToProject = (
    doc: ReaderDocumentItem,
    pageLabel: string,
    text: string,
    clipId?: string
  ) => {
    const updatedProject = appendExtractedClipToProject(
      project,
      doc,
      pageLabel,
      text
    );
    setProject(updatedProject);
    const addedPage = updatedProject.pages[updatedProject.pages.length - 1];
    if (addedPage) {
      setSelectedPageId(addedPage.id);
    }
    if (clipId) {
      setReaderClips((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, sentToProject: true } : c))
      );
    }
    notify(
      `Added "${pageLabel}" into Book Manager (${updatedProject.pages.length} total pages).`,
      "success"
    );
  };

  // --- EXTRACT STUDIO HANDLERS ---

  const handleStudioFileUpload = async (file: File) => {
    setErrorMsg(null);
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (forceOcr) formData.append("ocr", "force");

      const res = await fetch("/api/book-engine/extract", {
        method: "POST",
        headers: { Authorization: "Bearer " + (getSessionToken() || "") },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Document extraction failed.");
      }

      const extracted = data.project as SkyxBookProject;
      setProject(extracted);
      setSelectedPageId(extracted.pages[0]?.id ?? null);
      setPageSliceIndex(0);
      setPageSearch("");
      setPageFilter("all");
      setActiveTab("pages");
      notify(
        `${data.archived ? "Saved PDF and extracted pages for" : "Extracted"} "${extracted.title}" (${extracted.pages.length} pages · ${extracted.chapters.length} chapters)`,
        "success"
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to extract document.";
      setErrorMsg(msg);
      notify(msg, "error");
    } finally {
      setExtracting(false);
    }
  };

  const handleLoadSampleStudio = () => {
    const sample = createSampleBookProject();
    setProject(sample);
    setSelectedPageId(sample.pages[0].id);
    setPageSliceIndex(0);
    setActiveTab("pages");
    notify("Loaded bilingual sample book project.", "success");
  };

  const handleDropStudio = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleStudioFileUpload(file);
    }
  };

  const filteredPages = useMemo(() => {
    if (!project) return [];
    const q = pageSearch.trim().toLowerCase();
    return project.pages.filter((p) => {
      if (pageFilter === "active" && p.status === "skipped") return false;
      if (pageFilter === "skipped" && p.status !== "skipped") return false;
      if (pageFilter === "scanned" && !p.isLikelyScanned) return false;
      if (!q) return true;
      return (
        String(p.pageNumber).includes(q) ||
        (p.label?.toLowerCase().includes(q) ?? false) ||
        p.cleanedText.toLowerCase().includes(q)
      );
    });
  }, [project, pageSearch, pageFilter]);

  const totalSlices = Math.max(
    1,
    Math.ceil(filteredPages.length / PAGES_PER_SLICE)
  );
  const safeSliceIndex = Math.min(pageSliceIndex, totalSlices - 1);
  const visiblePages = useMemo(() => {
    const start = safeSliceIndex * PAGES_PER_SLICE;
    return filteredPages.slice(start, start + PAGES_PER_SLICE);
  }, [filteredPages, safeSliceIndex]);

  const selectedPage = useMemo(() => {
    if (!project) return null;
    return (
      project.pages.find((p) => p.id === selectedPageId) ??
      filteredPages[0] ??
      null
    );
  }, [project, selectedPageId, filteredPages]);

  const updateProjectMeta = (
    field: "title" | "subtitle" | "author" | "subject" | "language",
    value: string
  ) => {
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: field === "language" ? (value as BookProjectLanguage) : value,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const addProjectTag = () => {
    const clean = tagInput.trim().toLowerCase();
    if (!clean || !project) return;
    if (!project.tags.includes(clean)) {
      setProject({
        ...project,
        tags: [...project.tags, clean],
        updatedAt: new Date().toISOString(),
      });
    }
    setTagInput("");
  };

  const removeProjectTag = (tag: string) => {
    if (!project) return;
    setProject({
      ...project,
      tags: project.tags.filter((t) => t !== tag),
      updatedAt: new Date().toISOString(),
    });
  };

  const updatePageCleanedText = (pageId: string, nextText: string) => {
    setProject((prev) => {
      if (!prev) return prev;
      const nextPages: BookPageRecord[] = prev.pages.map((p) => {
        if (p.id !== pageId) return p;
        const nextStatus: BookPageRecord["status"] =
          p.status === "skipped" ? "skipped" : "cleaned";
        return {
          ...p,
          cleanedText: nextText,
          wordCount: countWordsClient(nextText),
          charCount: nextText.length,
          status: nextStatus,
        };
      });
      const totalWords = nextPages.reduce((sum, p) => sum + p.wordCount, 0);
      const totalChars = nextPages.reduce((sum, p) => sum + p.charCount, 0);
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        extraction: {
          ...prev.extraction,
          totalWords,
          totalChars,
        },
        pages: nextPages,
      };
    });
  };

  const toggleSkipPage = (pageId: string) => {
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        pages: prev.pages.map((p) =>
          p.id === pageId
            ? { ...p, status: p.status === "skipped" ? "cleaned" : "skipped" }
            : p
        ),
      };
    });
  };

  const handleSplitSelectedPage = () => {
    if (!project || !selectedPage) return;
    const cursorPos = pageTextareaRef.current?.selectionStart ?? 0;
    const result = splitPageAtIndexInProject(project, selectedPage.id, cursorPos);
    if (!result) {
      notify("Page text is too short to split.", "info");
      return;
    }
    setProject(result.project);
    setSelectedPageId(result.secondPageId);
    notify(
      cursorPos > 5
        ? `Split Page ${selectedPage.pageNumber} at cursor into 2 sequential pages.`
        : `Split Page ${selectedPage.pageNumber} cleanly at midpoint into 2 pages.`,
      "success"
    );
  };

  const handleMergeSelectedWithNext = () => {
    if (!project || !selectedPage) return;
    const result = mergePageWithNextInProject(project, selectedPage.id);
    if (!result) {
      notify("This is the last page — nothing below to merge.", "info");
      return;
    }
    setProject(result.project);
    setSelectedPageId(result.mergedPageId);
    notify(
      `Merged Page ${selectedPage.pageNumber} with Page ${selectedPage.pageNumber + 1}.`,
      "success"
    );
  };

  const handleJumpToPageNumber = (pageNumber: number) => {
    if (!project) return;
    const targetIdx = project.pages.findIndex((p) => p.pageNumber === pageNumber);
    if (targetIdx === -1) return;
    setPageSearch("");
    setPageFilter("all");
    setPageSliceIndex(Math.floor(targetIdx / PAGES_PER_SLICE));
    setSelectedPageId(project.pages[targetIdx].id);
    setActiveTab("pages");
    setWorkspaceMode("studio");
  };

  const handleOpenChapterInEditor = (chapterId: string) => {
    setActiveEditorChapterId(chapterId);
    setActiveTab("editor");
    setWorkspaceMode("studio");
  };

  const handleExportSkyxBook = () => {
    if (!project) return;
    const fileName = exportPortableSkyxBook(project);
    notify(`Saved portable project "${fileName}".`, "success");
  };

  const handleExportMarkdown = () => {
    if (!project) return;
    const fileName = exportCombinedMarkdown(project);
    notify(`Exported Markdown "${fileName}".`, "success");
  };

  const handleExportJson = () => {
    if (!project) return;
    const fileName = exportStructuredDataJson(project);
    notify(`Exported structured JSON "${fileName}".`, "success");
  };

  const activePageCount = project
    ? project.pages.filter((p) => p.status !== "skipped").length
    : 0;
  const skippedPageCount = project ? project.pages.length - activePageCount : 0;

  return (
    <div className="space-y-3">
      {workspaceMode === "studio" && (
        <div className="flex items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 overflow-x-auto no-scrollbar">
          {/* Left: Primary Dual-Mode Switcher (Smart Reader First, Extract Studio Second) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setWorkspaceMode("reader")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Smart Reader</span>
              </button>
              <span
                aria-current="true"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap bg-indigo-600 text-white shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Extract Studio</span>
              </span>
            </div>

            {/* Quiet Unboxed Active Context Metadata (Zero Pill Clutter) */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 min-w-0 max-w-[340px]">
              {project ? (
                <>
                  <span className="font-semibold text-slate-800 truncate">
                    {project.title}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums whitespace-nowrap">
                    {project.pages.length}p / {project.chapters.length}ch
                  </span>
                </>
              ) : (
                <span className="whitespace-nowrap text-slate-400">
                  Portable Book Manager
                </span>
              )}
            </div>
          </div>

          {/* Right: Contextual Actions (No Duplicate Upload Button!) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                title="Expand main left sidebar"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
                <span>Menu</span>
              </button>
            )}

            {project && (
              <>
                <button
                  type="button"
                  onClick={handleExportSkyxBook}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save .skyxbook</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>.md</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProject(null);
                    setSelectedPageId(null);
                    setActiveEditorChapterId(null);
                    setActiveTab("ingest");
                    notify("Project cleared from memory.", "info");
                  }}
                  title="Clear current project from memory"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 1 (DEFAULT): SMART DOCUMENT & PDF READER STUDIO
         ===================================================================== */}
      {workspaceMode === "reader" && (
        <SmartDocumentReader
          documents={readerDocs}
          activeDocId={activeReaderDoc?.id ?? null}
          clips={readerClips}
          rightPanelOpen={rightReaderPanelOpen}
          onSetRightPanelOpen={setRightReaderPanelOpen}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          onSwitchToStudio={() => setWorkspaceMode("studio")}
          onSaveProject={handleExportSkyxBook}
          onSelectDoc={setActiveReaderDocId}
          onAddFile={handleAddBookToReader}
          onLoadSample={handleLoadSampleInReader}
          onRemoveDoc={handleRemoveReaderDoc}
          onUpdateDoc={handleUpdateReaderDoc}
          onAddClip={(clip) => setReaderClips((prev) => [clip, ...prev])}
          onSendClipToProject={handleSendClipToProject}
          onOpenStudio={() => {
            setWorkspaceMode("studio");
            setActiveTab("pages");
          }}
          onNotify={notify}
          uploadingFile={readerUploading}
          activeProject={project}
        />
      )}

      {/* =====================================================================
          MODE 2: STREAMLINED EXTRACT STUDIO (5-TAB PIPELINE)
         ===================================================================== */}
      {workspaceMode === "studio" && (
        <div className="space-y-4">
          {/* Hidden single file input for Extract Studio */}
          <input
            ref={studioFileInputRef}
            type="file"
            accept=".pdf,.epub,.docx,.csv,.md,.markdown,.txt,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleStudioFileUpload(file);
              e.target.value = "";
            }}
          />

          {/* Compact 5-Stage Pipeline Bar */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: "ingest", label: "1. Import & Meta", icon: FileUp },
                {
                  id: "pages",
                  label: `2. Pages${project ? ` (${project.pages.length})` : ""}`,
                  icon: Layers,
                },
                {
                  id: "toc",
                  label: `3. TOC${project ? ` (${project.chapters.length})` : ""}`,
                  icon: ListTree,
                },
                { id: "editor", label: "4. Visual Editor", icon: BookMarked },
                { id: "export", label: "5. Export & Publish", icon: Send },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* TAB 1: SINGLE CLEAN BULK IMPORT & METADATA */}
          {activeTab === "ingest" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDropStudio}
                className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50/60"
                    : "border-slate-300 bg-white hover:border-indigo-300"
                }`}
              >
                <div className="w-11 h-11 mx-auto rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  {extracting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileUp className="w-5 h-5" />
                  )}
                </div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  {extracting
                    ? "Extracting Full Document on Server Engine..."
                    : "Bulk Extract a Book or Resume a .skyxbook.json Project"}
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto">
                  Upload up to 25 MB for automatic full-document extraction into pages &amp; chapters, or resume a saved{" "}
                  <span className="font-mono text-indigo-600">.skyxbook.json</span>.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    disabled={extracting}
                    onClick={() => studioFileInputRef.current?.click()}
                    className="min-h-[40px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{project ? "Upload New / Resume" : "Choose Document"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={extracting}
                    onClick={handleLoadSampleStudio}
                    className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Load Bilingual Sample</span>
                  </button>
                </div>

                <label className="mt-3 block text-sm">
                  <input type="checkbox" checked={forceOcr} onChange={e => setForceOcr(e.target.checked)} /> বাংলা লেখা বিকৃত হলে PDF-এর সব পৃষ্ঠায় OCR চালান
                </label>
                <button type="button" disabled={extracting} className="mt-3 text-sm text-indigo-700 underline" onClick={() => loadArchive()}>
                  Open saved PDF imports
                </button>
                {archiveMessage && <p role="status">{archiveMessage}</p>}
                {savedPdfs.map(item => (
                  <div key={item.id}><button type="button" disabled={extracting} onClick={() => loadArchive(item.id)} className="text-sm underline">{item.fileName}</button></div>
                ))}

                {/* Clean Unboxed Supported Engine Strip */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
                  {SUPPORTED_ENGINE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <span
                        key={item.format}
                        className="inline-flex items-center gap-1"
                      >
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                        <strong className="text-slate-700">{item.format}</strong>
                        <span className="text-slate-400">({item.engine})</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {project && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-slate-900">
                        Book Project Metadata
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500">
                        {project.storageRef.mode === "portable"
                          ? "Portable Mode"
                          : "VPS Local"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="space-y-1 block">
                        <span className="text-[11px] font-semibold text-slate-600">
                          Book Title
                        </span>
                        <input
                          type="text"
                          value={project.title}
                          onChange={(e) =>
                            updateProjectMeta("title", e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-[11px] font-semibold text-slate-600">
                          Author / Publisher
                        </span>
                        <input
                          type="text"
                          value={project.author}
                          onChange={(e) =>
                            updateProjectMeta("author", e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-[11px] font-semibold text-slate-600">
                          Subject / Category
                        </span>
                        <input
                          type="text"
                          value={project.subject}
                          onChange={(e) =>
                            updateProjectMeta("subject", e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-[11px] font-semibold text-slate-600">
                          Language
                        </span>
                        <select
                          value={project.language}
                          onChange={(e) =>
                            updateProjectMeta("language", e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-indigo-400"
                        >
                          <option value="bn">Bangla (বাংলা)</option>
                          <option value="en">English</option>
                          <option value="bilingual">
                            Bilingual (Bangla + English)
                          </option>
                        </select>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Project Tags</span>
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {project.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => removeProjectTag(tag)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Click to remove tag"
                          >
                            <span>#{tag}</span>
                          </button>
                        ))}
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addProjectTag();
                              }
                            }}
                            placeholder="Add tag..."
                            className="w-28 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] focus:outline-none focus:border-indigo-400"
                          />
                          <button
                            type="button"
                            onClick={addProjectTag}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      Extraction Summary
                    </h3>
                    <dl className="space-y-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Source File</dt>
                        <dd
                          className="font-medium text-slate-900 truncate max-w-[160px]"
                          title={project.extraction.fileName}
                        >
                          {project.extraction.fileName}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Engine</dt>
                        <dd className="font-mono text-[11px] text-indigo-700 text-right">
                          {project.extraction.engineUsed}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">File Size</dt>
                        <dd className="font-mono tabular-nums text-slate-800">
                          {formatBytes(project.extraction.fileSizeBytes)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Pages (Active / Skip)</dt>
                        <dd className="font-mono tabular-nums text-slate-800">
                          {activePageCount} / {skippedPageCount}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Total Words</dt>
                        <dd className="font-mono tabular-nums text-slate-800">
                          {project.extraction.totalWords.toLocaleString()}
                        </dd>
                      </div>
                    </dl>

                    {project.extraction.warnings.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Extraction Notes</span>
                        </div>
                        {project.extraction.warnings.map((w, i) => (
                          <p key={i} className="leading-relaxed">
                            • {w}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAGES INSPECTOR & CLEANUP */}
          {activeTab === "pages" && (
            <>
              {!project ? (
                <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    No extracted pages yet. Extract a page manually in Smart Reader or upload a book in Tab 1.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode("reader")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Open Smart Reader</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("ingest")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Bulk Import</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <PageCleanupPanel
                    project={project}
                    onUpdateProject={setProject}
                    onNotify={notify}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 p-4 flex flex-col gap-3">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={pageSearch}
                          onChange={(e) => {
                            setPageSearch(e.target.value);
                            setPageSliceIndex(0);
                          }}
                          placeholder="Search page number or text..."
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-400"
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-1">
                        {(
                          [
                            { id: "all", label: `All (${project.pages.length})` },
                            { id: "active", label: `Active (${activePageCount})` },
                            { id: "skipped", label: `Skip (${skippedPageCount})` },
                            {
                              id: "scanned",
                              label: `Low (${project.extraction.scannedPageCount})`,
                            },
                          ] as const
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setPageFilter(f.id);
                              setPageSliceIndex(0);
                            }}
                            className={`px-2 py-1.5 rounded-lg text-[10.5px] font-semibold transition-colors cursor-pointer ${
                              pageFilter === f.id
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                        {visiblePages.map((pg) => {
                          const isSelected = selectedPage?.id === pg.id;
                          const isSkipped = pg.status === "skipped";
                          return (
                            <button
                              key={pg.id}
                              type="button"
                              onClick={() => setSelectedPageId(pg.id)}
                              className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-50 border-indigo-400"
                                  : "bg-white border-slate-200/80 hover:border-slate-300"
                              } ${isSkipped ? "opacity-55" : ""}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  Page {pg.pageNumber}
                                  {pg.label ? ` · ${pg.label}` : ""}
                                </span>
                                <span className="text-[10px] font-mono tabular-nums text-slate-500 shrink-0">
                                  {pg.wordCount}w
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                                {pg.cleanedText || "(Empty or image-only page)"}
                              </p>
                            </button>
                          );
                        })}

                        {visiblePages.length === 0 && (
                          <div className="text-center py-8 text-xs text-slate-400">
                            No matching pages found.
                          </div>
                        )}
                      </div>

                      {totalSlices > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <button
                            type="button"
                            disabled={safeSliceIndex === 0}
                            onClick={() =>
                              setPageSliceIndex((i) => Math.max(0, i - 1))
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Prev</span>
                          </button>
                          <span className="text-[11px] font-mono tabular-nums text-slate-500">
                            Batch {safeSliceIndex + 1} / {totalSlices}
                          </span>
                          <button
                            type="button"
                            disabled={safeSliceIndex >= totalSlices - 1}
                            onClick={() =>
                              setPageSliceIndex((i) =>
                                Math.min(totalSlices - 1, i + 1)
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 cursor-pointer"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-8 rounded-2xl bg-white border border-slate-200 p-5 flex flex-col gap-3">
                      {selectedPage ? (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <h3 className="font-display text-sm font-bold text-slate-900">
                                Page {selectedPage.pageNumber}
                                {selectedPage.label
                                  ? ` — ${selectedPage.label}`
                                  : ""}
                              </h3>
                              <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                                {selectedPage.wordCount} words ·{" "}
                                {selectedPage.charCount} chars ·{" "}
                                {selectedPage.status}
                                {selectedPage.layout && <> · {selectedPage.layout.source} · {selectedPage.layout.kind} · {selectedPage.layout.rows.length} rows × {selectedPage.layout.columns} columns</>}
                              </p>
                            </div>

                            {selectedPage.layout?.kind === "table" && (
                              <details className="w-full overflow-x-auto text-sm">
                                <summary>শনাক্ত করা সারি ও কলাম দেখুন</summary>
                                <table className="mt-2 border-collapse"><tbody>{selectedPage.layout.rows.map((row, i) => (
                                  <tr key={i}>{row.map((cell, j) => <td key={j} className="border px-2 py-1">{cell}</td>)}</tr>
                                ))}</tbody></table>
                              </details>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => setInspectMode("cleaned")}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                                    inspectMode === "cleaned"
                                      ? "bg-white text-slate-900 shadow-xs"
                                      : "text-slate-500"
                                  }`}
                                >
                                  Cleaned
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInspectMode("raw")}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                                    inspectMode === "raw"
                                      ? "bg-white text-slate-900 shadow-xs"
                                      : "text-slate-500"
                                  }`}
                                >
                                  Raw
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={handleSplitSelectedPage}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                              >
                                <Scissors className="w-3.5 h-3.5" />
                                <span>Split</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleMergeSelectedWithNext}
                                disabled={
                                  selectedPage.pageNumber >= project.pages.length
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40 cursor-pointer"
                              >
                                <Merge className="w-3.5 h-3.5" />
                                <span>Merge Next</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleSkipPage(selectedPage.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border cursor-pointer ${
                                  selectedPage.status === "skipped"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-amber-50"
                                }`}
                              >
                                {selectedPage.status === "skipped" ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Restore</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5" />
                                    <span>Skip</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {inspectMode === "cleaned" ? (
                            <textarea
                              ref={pageTextareaRef}
                              value={selectedPage.cleanedText}
                              onChange={(e) =>
                                updatePageCleanedText(
                                  selectedPage.id,
                                  e.target.value
                                )
                              }
                              rows={18}
                              className="w-full flex-1 rounded-xl border border-slate-200 bg-slate-50/40 p-4 text-sm leading-relaxed text-slate-800 font-sans focus:outline-none focus:bg-white focus:border-indigo-400 resize-y"
                              placeholder="Extracted page text..."
                            />
                          ) : (
                            <pre className="w-full max-h-[460px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 text-slate-200 p-4 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                              {selectedPage.rawText ||
                                "(No raw text extracted for this page)"}
                            </pre>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Single-page rendering active
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updatePageCleanedText(
                                  selectedPage.id,
                                  selectedPage.rawText
                                )
                              }
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Reset to Raw</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="py-16 text-center text-xs text-slate-400">
                          Select a page on the left to inspect or clean its extracted text.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 3: INTERACTIVE TOC & CHAPTER ORGANIZER */}
          {activeTab === "toc" && (
            <>
              {!project ? (
                <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    Import a book or extract pages from Smart Reader first to organize chapters.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ingest")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Go to Import</span>
                  </button>
                </div>
              ) : (
                <TocOrganizerPanel
                  project={project}
                  onUpdateProject={setProject}
                  onNotify={notify}
                  onJumpToPage={handleJumpToPageNumber}
                  onOpenInEditor={handleOpenChapterInEditor}
                />
              )}
            </>
          )}

          {/* TAB 4: TIPTAP V3 VISUAL BOOK & BLOCK STUDIO */}
          {activeTab === "editor" && (
            <>
              {!project ? (
                <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    Import a book or load the bilingual sample to edit chapters in Visual Studio.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("ingest")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Go to Import</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleStudio}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Load Sample</span>
                    </button>
                  </div>
                </div>
              ) : (
                <VisualBookEditor
                  project={project}
                  selectedChapterId={activeEditorChapterId}
                  onSelectChapterId={setActiveEditorChapterId}
                  onUpdateProject={setProject}
                  onNotify={notify}
                  onJumpToPage={handleJumpToPageNumber}
                />
              )}
            </>
          )}

          {/* TAB 5: MULTI-FORMAT EXPORT HUB, READER BRIDGE & VPS ADAPTER */}
          {activeTab === "export" && (
            <>
              {!project ? (
                <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    Load a book project first to export .skyxbook.zip, Markdown, CSV, or Print HTML.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ingest")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Go to Import</span>
                  </button>
                </div>
              ) : (
                <ExportPublishHub project={project} onNotify={notify} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
