"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  SlidersHorizontal,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileCode2,
  FilePlus2,
  FileText,
  FolderPlus,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Moon,
  PanelRightClose,
  PanelLeftOpen,
  PanelLeftClose,
  Plus,
  RotateCw,
  Scissors,
  Send,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  PDFDocumentProxy,
  RenderTask,
  TextLayer as PdfTextLayerType,
} from "pdfjs-dist";
import {
  countWordsQuick,
  downloadSingleTextFile,
  extractStructuredTextFromPdfItems,
  normalizeBanglaDigits,
  parseManualPageRange,
  type ExtractedPageClip,
  type ReaderDocumentItem,
} from "@/lib/book-engine/reader-helpers";
import ReaderLiveControl from "./ReaderLiveControl";
import ReaderShortcutRail from "./ReaderShortcutRail";
import type { SkyxBookProject } from "@/lib/book-engine/types";

type PaperTheme = "paper" | "ivory" | "night";
type DockTab = "books" | "extract" | "pages";

interface SmartDocumentReaderProps {
  documents: ReaderDocumentItem[];
  activeDocId: string | null;
  clips: ExtractedPageClip[];
  rightPanelOpen: boolean;
  onSetRightPanelOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onSwitchToStudio: () => void;
  onOpenFileManager: () => void;
  onSaveProject: () => void;
  onSelectDoc: (docId: string) => void;
  onAddFile: (file: File) => Promise<void>;
  onLoadSample: () => void;
  onRemoveDoc: (docId: string) => void;
  onUpdateDoc: (docId: string, patch: Partial<ReaderDocumentItem>) => void;
  onAddClip: (clip: ExtractedPageClip) => void;
  onSendClipToProject: (
    doc: ReaderDocumentItem,
    pageLabel: string,
    text: string,
    clipId?: string
  ) => void;
  onOpenStudio: () => void;
  onNotify: (message: string, tone?: "info" | "success" | "error") => void;
  uploadingFile: boolean;
  activeProject: SkyxBookProject | null;
}

function formatBytesShort(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SmartDocumentReader({
  documents,
  activeDocId,
  clips,
  rightPanelOpen,
  onSetRightPanelOpen,
  sidebarCollapsed,
  onToggleSidebar,
  onSwitchToStudio,
  onOpenFileManager,
  onSaveProject,
  onSelectDoc,
  onAddFile,
  onLoadSample,
  onRemoveDoc,
  onUpdateDoc,
  onAddClip,
  onSendClipToProject,
  onOpenStudio,
  onNotify,
  uploadingFile,
  activeProject,
}: SmartDocumentReaderProps) {
  const activeDoc = useMemo(
    () => documents.find((d) => d.id === activeDocId) ?? documents[0] ?? null,
    [documents, activeDocId]
  );

  // Reader view controls
  const [paperTheme, setPaperTheme] = useState<PaperTheme>("paper");
  const [zoomMode, setZoomMode] = useState<"full-page" | "fit-width" | "custom">("full-page");
  const [zoomScale, setZoomScale] = useState<number>(1.1);
  const [rotation, setRotation] = useState<number>(0);
  const [viewToolsOpen, setViewToolsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [pageInputDraft, setPageInputDraft] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  // Right dock / Mobile sheet tabs
  const [dockTab, setDockTab] = useState<DockTab>("books");
  const [mobileSheetOpen, setMobileSheetOpen] = useState<boolean>(false);

  // PDF.js runtime state (derived flags avoid synchronous setState in effects)
  const [pdfLoadState, setPdfLoadState] = useState<{
    docId: string | null;
    status: "idle" | "ready" | "error";
    error: string | null;
  }>({ docId: null, status: "idle", error: null });
  const [renderedPageKey, setRenderedPageKey] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(820);

  const [containerHeight, setContainerHeight] = useState(600);
  const effectiveScale = useRef(1);

  // Manual extraction state
  const [extractingText, setExtractingText] = useState<boolean>(false);
  const [rangeInput, setRangeInput] = useState<string>("");
  const [extractedDraft, setExtractedDraft] = useState<string>("");
  const [extractedLabel, setExtractedLabel] = useState<string>("");
  const [extractedIsLowText, setExtractedIsLowText] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const textLayerInstanceRef = useRef<PdfTextLayerType | null>(null);
  const onUpdateDocRef = useRef(onUpdateDoc);

  useEffect(() => {
    onUpdateDocRef.current = onUpdateDoc;
  }, [onUpdateDoc]);

  const currentPage = activeDoc?.currentPage ?? 1;
  const totalPages = activeDoc?.totalPages ?? 1;
  const activeDocUniqueId = activeDoc?.id ?? null;
  const activeDocFormat = activeDoc?.format ?? null;
  const activePdfBytes = activeDoc?.pdfBytes ?? null;

  const isPdfDoc = Boolean(
    activeDocUniqueId && activeDocFormat === "pdf" && activePdfBytes
  );
  const pdfReadyDocId =
    isPdfDoc &&
    pdfLoadState.docId === activeDocUniqueId &&
    pdfLoadState.status === "ready"
      ? activeDocUniqueId
      : null;
  const pdfError =
    isPdfDoc &&
    pdfLoadState.docId === activeDocUniqueId &&
    pdfLoadState.status === "error"
      ? pdfLoadState.error
      : null;
  const pdfLoading = isPdfDoc && pdfLoadState.docId !== activeDocUniqueId;
  const activeRenderKey = pdfReadyDocId
    ? `${pdfReadyDocId}:${currentPage}:${zoomMode}:${zoomScale}:${rotation}:${containerWidth}:${containerHeight}`
    : null;
  const pageRendering = Boolean(
    activeRenderKey && renderedPageKey !== activeRenderKey && !pdfError
  );

  // Observe reading desk width for crisp Fit Width calculation
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (width && width > 200) {
        setContainerWidth(Math.floor(width));
        setContainerHeight(Math.floor(entries[0].contentRect.height));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeDocUniqueId, focusMode, rightPanelOpen]);

  // Load PDF document handle lazily on client when active PDF changes
  useEffect(() => {
    let cancelled = false;

    const cleanupPdf = async () => {
      try {
        renderTaskRef.current?.cancel();
      } catch {
        // ignore cancel
      }
      renderTaskRef.current = null;
      try {
        textLayerInstanceRef.current?.cancel();
      } catch {
        // ignore cancel
      }
      textLayerInstanceRef.current = null;
      if (pdfDocRef.current) {
        try {
          await pdfDocRef.current.loadingTask.destroy();
        } catch {
          // ignore destroy
        }
        pdfDocRef.current = null;
      }
    };

    if (!activeDocUniqueId || activeDocFormat !== "pdf" || !activePdfBytes) {
      void cleanupPdf();
      return;
    }

    const loadPdf = async () => {
      await cleanupPdf();
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        // Always pass a cloned byte buffer so worker transfer never detaches our session shelf bytes
        const loadingTask = pdfjsLib.getDocument({
          data: activePdfBytes.slice(),
          useSystemFonts: true,
        });
        const loadedDoc = await loadingTask.promise;

        if (cancelled) {
          await loadedDoc.loadingTask.destroy();
          return;
        }

        pdfDocRef.current = loadedDoc;
        setPdfLoadState({
          docId: activeDocUniqueId,
          status: "ready",
          error: null,
        });
        if (loadedDoc.numPages > 0) {
          onUpdateDocRef.current(activeDocUniqueId, {
            totalPages: loadedDoc.numPages,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : "Could not render this PDF document.";
          setPdfLoadState({
            docId: activeDocUniqueId,
            status: "error",
            error: msg,
          });
        }
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;
      void cleanupPdf();
    };
  }, [activeDocUniqueId, activeDocFormat, activePdfBytes]);

  // Render ONLY the active PDF page + aligned selectable TextLayer (keeps 300+ page PDFs fast)
  useEffect(() => {
    const pdfDoc = pdfDocRef.current;
    const canvas = canvasRef.current;
    const textLayerDiv = textLayerRef.current;

    if (
      !pdfDoc ||
      !canvas ||
      !activeDocUniqueId ||
      !activeRenderKey ||
      pdfReadyDocId !== activeDocUniqueId ||
      activeDocFormat !== "pdf"
    ) {
      return;
    }

    let cancelled = false;

    const renderActivePage = async () => {
      try {
        renderTaskRef.current?.cancel();
      } catch {
        // ignore cancel
      }
      try {
        textLayerInstanceRef.current?.cancel();
      } catch {
        // ignore cancel
      }

      try {
        const safePageNum = Math.max(1, Math.min(pdfDoc.numPages, currentPage));
        const page = await pdfDoc.getPage(safePageNum);
        if (cancelled) return;

        setRenderedPageKey(null);
        const baseViewport = page.getViewport({ scale: 1, rotation });
        const availableWidth = Math.max(1, containerWidth - 52);
        const widthScale = availableWidth / baseViewport.width;
        const pageScale = Math.min(widthScale, Math.max(1, containerHeight - 48) / baseViewport.height);
        const computedScale = zoomMode === "custom" ? zoomScale : zoomMode === "full-page" ? pageScale : widthScale;
        effectiveScale.current = computedScale;

        const viewport = page.getViewport({ scale: computedScale, rotation });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2.25);

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform =
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        const task = page.render({
          canvas,
          viewport,
          transform,
        });
        renderTaskRef.current = task;
        await task.promise;
        if (cancelled) return;

        // Render aligned transparent selectable text layer
        if (textLayerDiv) {
          textLayerDiv.replaceChildren();
          textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
          textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;
          textLayerDiv.style.setProperty("--scale-factor", String(viewport.scale));

          const pdfjsLib = await import("pdfjs-dist");
          const textContent = await page.getTextContent();
          if (cancelled) return;

          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          });
          textLayerInstanceRef.current = textLayer;
          await textLayer.render();
        }
        if (!cancelled) {
          canvas.dataset.renderKey = activeRenderKey;
          setRenderedPageKey(activeRenderKey);
        }
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name?: string }).name === "RenderingCancelledException"
        ) {
          return;
        }
        if (!cancelled) {
          setPdfLoadState({
            docId: activeDocUniqueId,
            status: "error",
            error: "Failed to render the selected PDF page.",
          });
        }
      }
    };

    void renderActivePage();

    return () => {
      cancelled = true;
      delete canvas.dataset.renderKey;
      try {
        renderTaskRef.current?.cancel();
      } catch {
        // ignore
      }
      try {
        textLayerInstanceRef.current?.cancel();
      } catch {
        // ignore
      }
    };
  }, [
    activeDocUniqueId,
    activeDocFormat,
    activeRenderKey,
    pdfReadyDocId,
    currentPage,
    zoomMode,
    zoomScale,
    rotation,
    containerWidth,
    containerHeight,
  ]);

  const goToPage = useCallback(
    (nextPage: number) => {
      if (!activeDoc) return;
      const clamped = Math.max(1, Math.min(activeDoc.totalPages, Math.trunc(nextPage)));
      onUpdateDoc(activeDoc.id, { currentPage: clamped });
      if (viewportRef.current) {
        viewportRef.current.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    },
    [activeDoc, onUpdateDoc]
  );

  // Keyboard shortcuts for fluid desktop reading
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isTyping) return;

      if (e.key === "Escape" && focusMode) {
        setFocusMode(false);
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (activeDoc && currentPage < totalPages) {
          e.preventDefault();
          goToPage(currentPage + 1);
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (activeDoc && currentPage > 1) {
          e.preventDefault();
          goToPage(currentPage - 1);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeDoc, currentPage, totalPages, focusMode, goToPage]);

  const handleToggleBookmark = () => {
    if (!activeDoc) return;
    const exists = activeDoc.bookmarks.includes(currentPage);
    const nextBookmarks = exists
      ? activeDoc.bookmarks.filter((b) => b !== currentPage)
      : [...activeDoc.bookmarks, currentPage].sort((a, b) => a - b);
    onUpdateDoc(activeDoc.id, { bookmarks: nextBookmarks });
    onNotify(
      exists
        ? `Removed bookmark on Page ${currentPage}.`
        : `Bookmarked Page ${currentPage}.`,
      "info"
    );
  };

  function openDock(tab: DockTab) {
    setDockTab(tab);
    if (window.matchMedia("(min-width: 64rem)").matches) {
      onSetRightPanelOpen(true);
    } else {
      setMobileSheetOpen(true);
    }
  }

  const handleExtractPages = async (pageNumbers: number[]) => {
    if (!activeDoc || pageNumbers.length === 0) return;
    setExtractingText(true);
    setExtractedIsLowText(false);

    try {
      const parts: string[] = [];
      let totalWordsExtracted = 0;

      if (activeDoc.format === "pdf") {
        const pdfDoc = pdfDocRef.current;
        if (!pdfDoc) {
          throw new Error("PDF is still loading — please wait a second and retry.");
        }
        for (const pNum of pageNumbers) {
          const page = await pdfDoc.getPage(pNum);
          const content = await page.getTextContent();
          const text = extractStructuredTextFromPdfItems(content.items, page.getViewport({ scale: 1 }).transform);
          totalWordsExtracted += countWordsQuick(text);
          if (pageNumbers.length > 1) {
            parts.push(`## Page ${pNum}\n\n${text || "(No selectable text on this page)"}`);
          } else {
            parts.push(text);
          }
        }
      } else {
        const pages = activeDoc.textPages ?? [];
        for (const pNum of pageNumbers) {
          const found = pages[pNum - 1];
          const text = found?.cleanedText ?? "";
          totalWordsExtracted += countWordsQuick(text);
          if (pageNumbers.length > 1) {
            parts.push(`## Page ${pNum}\n\n${text}`);
          } else {
            parts.push(text);
          }
        }
      }

      const combined = parts.join("\n\n").trim();
      const label =
        pageNumbers.length === 1
          ? `Page ${pageNumbers[0]}`
          : `Pages ${pageNumbers[0]}–${pageNumbers[pageNumbers.length - 1]}`;

      setExtractedLabel(label);
      setExtractedDraft(combined);
      setExtractedIsLowText(totalWordsExtracted < 5);

      if (combined) {
        onAddClip({
          id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sourceDocId: activeDoc.id,
          sourceTitle: activeDoc.title,
          pageLabel: label,
          pageNumbers,
          text: combined,
          wordCount: countWordsQuick(combined),
          sentToProject: false,
          createdAt: new Date().toISOString(),
        });
        onNotify(
          `Extracted ${label} (${countWordsQuick(combined)} words). Ready to copy, save, or send to Studio.`,
          "success"
        );
      } else {
        onNotify(
          `${label} appears to be image/scanned only — you can type notes manually below.`,
          "info"
        );
      }

      openDock("extract");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to extract page text.";
      onNotify(msg, "error");
    } finally {
      setExtractingText(false);
    }
  };

  const handleExtractRangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pages = parseManualPageRange(rangeInput, totalPages);
    if (pages.length === 0) {
      onNotify(
        `Enter a valid page or range between 1 and ${totalPages} (e.g. 5 or 12-15).`,
        "error"
      );
      return;
    }
    void handleExtractPages(pages);
  };

  const handleCopyText = async (text: string, idKey: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(idKey);
      setTimeout(() => setCopiedId(null), 1600);
      onNotify("Copied extracted text to clipboard.", "success");
    } catch {
      onNotify("Clipboard access unavailable in this browser.", "error");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void onAddFile(file);
    }
    e.target.value = "";
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void onAddFile(file);
    }
  };

  const isBookmarked = activeDoc?.bookmarks.includes(currentPage) ?? false;

  const deskSurfaceClass =
    paperTheme === "night"
      ? "bg-[#0F1420] text-slate-200"
      : paperTheme === "ivory"
      ? "bg-[#EAE4D7] text-slate-900"
      : "bg-[#EEF2F7] text-slate-900";

  const activeTextPage =
    activeDoc && activeDoc.format !== "pdf"
      ? activeDoc.textPages?.[currentPage - 1] ?? null
      : null;

  // Shared Right Dock Body (Rendered in Desktop Right Panel AND Mobile Slide-Up Bottom Sheet)
  const renderRightDockBody = () => (
    <div className="flex flex-col h-full min-h-0">
      {/* Dock Segmented Tabs */}
      <div className="p-2.5 border-b border-slate-200 bg-white shrink-0">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100">
          {(
            [
              { id: "books", label: `Books (${documents.length})` },
              { id: "extract", label: "Extract" },
              { id: "pages", label: `Clips (${clips.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDockTab(tab.id)}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                dockTab === tab.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dock Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* TAB A: BOOKS SHELF & ADD BOOK */}
        {dockTab === "books" && (
          <div className="space-y-3.5">
            <div className="space-y-2">
              <button
                type="button"
                disabled={uploadingFile}
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-55"
              >
                {uploadingFile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{uploadingFile ? "Opening Book..." : "Add Book (PDF / Any File)"}</span>
              </button>

              {documents.length === 0 && (
                <button
                  type="button"
                  onClick={onLoadSample}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Open Bilingual Sample Book</span>
                </button>
              )}
            </div>

            {/* Session Book Shelf */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>Reading Shelf</span>
                <span className="font-mono tabular-nums">{documents.length} open</span>
              </div>

              {documents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No books opened yet. Add any PDF, EPUB, DOCX, Markdown, or .skyxbook file to start reading.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {documents.map((doc) => {
                    const isSelected = doc.id === activeDoc?.id;
                    return (
                      <div
                        key={doc.id}
                        className={`flex items-start gap-2.5 p-2.5 transition-colors ${
                          isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectDoc(doc.id);
                            setMobileSheetOpen(false);
                          }}
                          className="flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <BookOpen
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? "text-indigo-600" : "text-slate-400"
                              }`}
                            />
                            <span
                              className={`text-xs truncate ${
                                isSelected
                                  ? "font-bold text-indigo-950"
                                  : "font-semibold text-slate-800"
                              }`}
                            >
                              {doc.title}
                            </span>
                          </div>
                          <div className="mt-1 pl-5 text-[11px] text-slate-500 font-mono tabular-nums truncate">
                            {doc.format.toUpperCase()} · P.{doc.currentPage}/{doc.totalPages} ·{" "}
                            {formatBytesShort(doc.fileSizeBytes)}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveDoc(doc.id)}
                          aria-label={`Close ${doc.title}`}
                          title="Close book & free memory"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Book Quick Jump Slider (for 300+ page PDFs) */}
            {activeDoc && activeDoc.totalPages > 1 && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>Quick Page Scrubber</span>
                  <span className="font-mono tabular-nums text-indigo-600">
                    {currentPage} / {totalPages}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => goToPage(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400 tabular-nums">
                  <button
                    type="button"
                    onClick={() => goToPage(1)}
                    className="hover:text-indigo-600 cursor-pointer"
                  >
                    P.1
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(Math.max(1, Math.round(totalPages * 0.25)))}
                    className="hover:text-indigo-600 cursor-pointer"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(Math.max(1, Math.round(totalPages * 0.5)))}
                    className="hover:text-indigo-600 cursor-pointer"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(Math.max(1, Math.round(totalPages * 0.75)))}
                    className="hover:text-indigo-600 cursor-pointer"
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(totalPages)}
                    className="hover:text-indigo-600 cursor-pointer"
                  >
                    P.{totalPages}
                  </button>
                </div>
              </div>
            )}

            {/* Bookmarks List */}
            {activeDoc && activeDoc.bookmarks.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-500">
                  Bookmarked Pages
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeDoc.bookmarks.map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => {
                        goToPage(pg);
                        setMobileSheetOpen(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold tabular-nums cursor-pointer ${
                        pg === currentPage
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                      }`}
                    >
                      P.{pg}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB B: MANUAL SINGLE-PAGE & RANGE EXTRACTOR */}
        {dockTab === "extract" && (
          <div className="space-y-3.5">
            {!activeDoc ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Open a book first to extract individual pages on demand.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={extractingText}
                    onClick={() => void handleExtractPages([currentPage])}
                    className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-55"
                  >
                    {extractingText ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Scissors className="w-4 h-4" />
                    )}
                    <span>
                      {extractingText
                        ? "Extracting..."
                        : `Extract Current Page (P.${currentPage})`}
                    </span>
                  </button>

                  {/* Custom Small Range Extract */}
                  <form
                    onSubmit={handleExtractRangeSubmit}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      placeholder={`Range e.g. ${currentPage}-${Math.min(totalPages, currentPage + 2)}`}
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="submit"
                      disabled={extractingText || !rangeInput.trim()}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold whitespace-nowrap disabled:opacity-40 cursor-pointer"
                    >
                      Extract
                    </button>
                  </form>
                </div>

                {extractedIsLowText && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      This page appears to be scanned/image-only with no embedded text layer. You can type or paste your notes directly below and save them.
                    </span>
                  </div>
                )}

                {/* Editable Extracted Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {extractedLabel ? `Extracted · ${extractedLabel}` : "Extracted Output"}
                    </span>
                    <span className="font-mono tabular-nums">
                      {countWordsQuick(extractedDraft)} words
                    </span>
                  </div>
                  <textarea
                    value={extractedDraft}
                    onChange={(e) => setExtractedDraft(e.target.value)}
                    rows={10}
                    placeholder="Click 'Extract Current Page' above to pull clean text from the active page, then copy, download, or send directly to Book Manager..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[16px] sm:text-xs leading-relaxed text-slate-800 font-sans focus:outline-none focus:border-indigo-400 resize-y"
                  />
                </div>

                {/* Dual-Destination Action Bar */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      disabled={!extractedDraft.trim()}
                      onClick={() => void handleCopyText(extractedDraft, "draft")}
                      className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      {copiedId === "draft" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copy</span>
                    </button>
                    <button
                      type="button"
                      disabled={!extractedDraft.trim()}
                      onClick={() => {
                        const name = downloadSingleTextFile(
                          extractedDraft,
                          `${activeDoc.title}-${extractedLabel || `p${currentPage}`}`,
                          "md"
                        );
                        onNotify(`Saved "${name}".`, "success");
                      }}
                      className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      <FileCode2 className="w-3.5 h-3.5" />
                      <span>.md</span>
                    </button>
                    <button
                      type="button"
                      disabled={!extractedDraft.trim()}
                      onClick={() => {
                        const name = downloadSingleTextFile(
                          extractedDraft,
                          `${activeDoc.title}-${extractedLabel || `p${currentPage}`}`,
                          "txt"
                        );
                        onNotify(`Saved "${name}".`, "success");
                      }}
                      className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>.txt</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!extractedDraft.trim()}
                    onClick={() => {
                      onSendClipToProject(
                        activeDoc,
                        extractedLabel || `Page ${currentPage}`,
                        extractedDraft
                      );
                    }}
                    className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Add to Book Manager Project</span>
                  </button>

                  {activeProject && (
                    <button
                      type="button"
                      onClick={onOpenStudio}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>
                        Open Project in Extract Studio ({activeProject.pages.length} pages)
                      </span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB C: SESSION EXTRACTED CLIPS HISTORY */}
        {dockTab === "pages" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">
                Session Extracted Clips
              </span>
              <span className="font-mono tabular-nums">{clips.length} saved</span>
            </div>

            {clips.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Manually extracted pages will appear here so you can copy, download, or send them to Book Manager anytime.
              </div>
            ) : (
              <div className="space-y-2.5">
                {clips.map((clip) => (
                  <div
                    key={clip.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {clip.pageLabel}
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate">
                          {clip.sourceTitle} · {clip.wordCount}w
                        </div>
                      </div>
                      {clip.sentToProject && (
                        <span className="text-[10px] font-semibold text-emerald-700 shrink-0">
                          In Studio
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                      {clip.text}
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleCopyText(clip.text, clip.id)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-semibold cursor-pointer"
                      >
                        {copiedId === clip.id ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const name = downloadSingleTextFile(
                            clip.text,
                            `${clip.sourceTitle}-${clip.pageLabel}`,
                            "md"
                          );
                          onNotify(`Downloaded "${name}".`, "success");
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-semibold cursor-pointer"
                      >
                        .md
                      </button>
                      {activeDoc && !clip.sentToProject && (
                        <button
                          type="button"
                          onClick={() =>
                            onSendClipToProject(
                              activeDoc,
                              clip.pageLabel,
                              clip.text,
                              clip.id
                            )
                          }
                          className="ml-auto px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10.5px] font-semibold cursor-pointer"
                        >
                          + Studio
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={
        focusMode
          ? "fixed inset-0 z-[60] bg-white flex flex-col pt-safe pb-safe overflow-hidden"
          : "rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col h-[calc(100dvh-9rem)] min-h-[300px]"
      }
    >
      {/* Hidden Unified File Input for Reader */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.epub,.docx,.csv,.md,.markdown,.txt,.json"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* COMPACT FLOATING-STYLE READER CONTROL BAR */}
      {activeDoc && (
        <div className="relative z-20 shrink-0 flex flex-wrap items-center gap-x-2 border-b border-slate-200 bg-white px-2 py-1 sm:px-3">
          {/* Left: Page Stepper + Jump Input */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              aria-label="Previous page"
              className="w-9 h-9 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const rawVal = pageInputDraft ?? String(currentPage);
                const parsed = Number(normalizeBanglaDigits(rawVal));
                if (!Number.isNaN(parsed) && parsed >= 1) {
                  goToPage(parsed);
                }
                setPageInputDraft(null);
              }}
              className="flex items-center gap-1 text-xs font-mono tabular-nums"
            >
              <input
                type="text"
                inputMode="numeric"
                value={pageInputDraft ?? String(currentPage)}
                onFocus={() => setPageInputDraft(String(currentPage))}
                onChange={(e) => setPageInputDraft(e.target.value)}
                onBlur={() => {
                  if (pageInputDraft !== null) {
                    const parsed = Number(normalizeBanglaDigits(pageInputDraft));
                    if (!Number.isNaN(parsed) && parsed >= 1) {
                      goToPage(parsed);
                    }
                    setPageInputDraft(null);
                  }
                }}
                aria-label="Page number"
                className="w-12 text-center py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-indigo-400"
              />
              <span className="text-slate-400 whitespace-nowrap">/ {totalPages}</span>
            </form>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              aria-label="Next page"
              className="w-9 h-9 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button type="button" aria-label="Reading controls" aria-expanded={viewToolsOpen}
            onClick={() => setViewToolsOpen(open => !open)}
            className="ml-auto grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden">
            <SlidersHorizontal className="size-4" />
          </button>
          <div className={`${viewToolsOpen ? "flex" : "hidden"} order-4 w-full flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-1 md:order-none md:flex md:w-auto md:min-w-0 md:flex-1 md:flex-nowrap md:justify-around md:overflow-x-auto md:border-0 md:py-0`}>
          {/* Center: Zoom, Fit, Rotate, Paper Theme */}
          <div className="flex items-center gap-1 shrink-0">
            {activeDoc.format === "pdf" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setZoomMode("custom");
                    setZoomScale(Math.max(0.1, effectiveScale.current - 0.15));
                  }}
                  aria-label="Zoom out"
                  title="Zoom out"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <select aria-label="PDF page fit" value={zoomMode}
                  onChange={(event) => setZoomMode(event.target.value as typeof zoomMode)}
                  className="h-8 rounded-lg bg-indigo-50 px-1.5 text-xs font-semibold text-indigo-800">
                  <option value="full-page">Full page</option>
                  <option value="fit-width">Fit width</option>
                  {zoomMode === "custom" && <option value="custom">{Math.round(zoomScale * 100)}%</option>}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setZoomMode("custom");
                    setZoomScale(Math.min(4, effectiveScale.current + 0.15));
                  }}
                  aria-label="Zoom in"
                  title="Zoom in"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  aria-label="Rotate page"
                  title="Rotate 90°"
                  className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <span className="w-px h-4 bg-slate-200 mx-1" />
              </>
            )}

            {/* Optical Paper Theme Switcher */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100">
              {(
                [
                  { id: "paper", label: "Paper", icon: Sun },
                  { id: "ivory", label: "Ivory", icon: BookOpen },
                  { id: "night", label: "Night", icon: Moon },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPaperTheme(t.id)}
                    title={`${t.label} reading tone`}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      paperTheme === t.id
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden md:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Extract Current Page, Bookmark, Focus, Panel Toggle */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={extractingText}
              onClick={() => void handleExtractPages([currentPage])}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer disabled:opacity-55"
              title="Manually extract text from the current page"
            >
              {extractingText ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Scissors className="w-3.5 h-3.5" />
              )}
              <span>Extract P.{currentPage}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleBookmark}
              aria-label="Bookmark page"
              title={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
              className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                isBookmarked
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Bookmark className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setFocusMode((v) => !v)}
              aria-label="Toggle fullscreen reading"
              title={focusMode ? "Exit Fullscreen (Esc)" : "Fullscreen Reading Mode"}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              {focusMode ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

          </div>
          </div>
          {isPdfDoc && <ReaderLiveControl key={activeDoc.id} page={currentPage} total={totalPages}
            canvas={canvasRef} viewport={viewportRef} navigate={goToPage}
            renderKey={renderedPageKey === activeRenderKey && !pdfError && !mobileSheetOpen ? activeRenderKey : null} />}
        </div>
      )}

      {/* MAIN READING BODY: CENTER READING DESK + RIGHT COLLAPSIBLE PANEL */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        <ReaderShortcutRail
          documentTitle={activeDoc?.title}
          shortcuts={[
            {
              label: "Open File",
              icon: FilePlus2,
              run: () => fileInputRef.current?.click(),
              disabled: uploadingFile,
            },
            { label: "File Manager", icon: BookOpen, run: () => { setFocusMode(false); onOpenFileManager(); } },
            { label: "Extract Studio", icon: Layers, run: onSwitchToStudio },
            { label: "Books", icon: BookOpen, run: () => openDock("books") },
            { label: "Clips", icon: Scissors, run: () => openDock("pages") },
            ...(activeProject ? [{ label: "Save .skyxbook", icon: Download, run: onSaveProject }] : []),
            {
              label: sidebarCollapsed ? "Expand main menu" : "Collapse main menu",
              icon: sidebarCollapsed ? PanelLeftOpen : PanelLeftClose,
              desktopOnly: true,
              run: () => {
                setFocusMode(false);
                onToggleSidebar();
              },
            },
          ]}
        />
        {/* CENTER VIEWPORT */}
        <div
          ref={viewportRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDropFile}
          className={`flex-1 min-w-0 overflow-auto relative transition-colors ${deskSurfaceClass}`}
        >
          {!activeDoc ? (
            /* CALM ZERO-STATE: SINGLE UPLOAD ZONE (NO DUPLICATE UPLOAD BUTTONS) */
            <div className="h-full flex items-center justify-center p-6">
              <div
                className={`w-full max-w-lg rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all bg-white ${
                  dragOver
                    ? "border-indigo-500 bg-indigo-50/40"
                    : "border-slate-300 hover:border-indigo-300"
                }`}
              >
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  {uploadingFile ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <BookOpen className="w-6 h-6" />
                  )}
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {uploadingFile
                    ? "Opening Document..."
                    : "Open Any PDF or Book to Read"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  যেকোনো PDF (৩০০+ পেজ বা স্ক্যান করা বইসহ), EPUB, DOCX, Markdown বা .skyxbook ফাইল ড্রপ করুন — আরামদায়কভাবে পড়ুন এবং প্রয়োজনমতো যেকোনো পেজ ম্যানুয়ালি এক্সট্রাক্ট করে সেভ করুন।
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    disabled={uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-55"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Add Book from Device</span>
                  </button>
                  <button
                    type="button"
                    disabled={uploadingFile}
                    onClick={onLoadSample}
                    className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FilePlus2 className="w-4 h-4 text-indigo-600" />
                    <span>Try Sample Book</span>
                  </button>
                </div>

                <div className="mt-5 text-[11px] text-slate-400">
                  PDF · EPUB · DOCX · Markdown · TXT · CSV · .skyxbook.json
                </div>
              </div>
            </div>
          ) : activeDoc.format === "pdf" ? (
            /* MODERN PDF.JS CANVAS + SELECTABLE TRANSPARENT TEXT LAYER */
            <div className="min-h-full w-max min-w-full flex flex-col items-center justify-center py-5 px-3 sm:px-6">
              {pdfError ? (
                <div className="max-w-md w-full my-auto rounded-2xl bg-white border border-rose-200 p-6 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-900">
                    Unable to Display PDF
                  </div>
                  <p className="text-xs text-slate-600">{pdfError}</p>
                </div>
              ) : (
                <div
                  className={`relative rounded-xl overflow-hidden shadow-[0_12px_36px_-12px_rgba(15,23,42,0.22)] border border-slate-300/60 bg-white transition-opacity ${
                    paperTheme === "ivory"
                      ? "skyx-pdf-paper-ivory"
                      : paperTheme === "night"
                      ? "skyx-pdf-paper-night"
                      : ""
                  }`}
                >
                  {(pdfLoading || pageRendering) && (
                    <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-md">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>
                          {pdfLoading
                            ? "Preparing PDF..."
                            : `Rendering Page ${currentPage}...`}
                        </span>
                      </div>
                    </div>
                  )}

                  <canvas ref={canvasRef} className="block" />
                  <div
                    ref={textLayerRef}
                    className="skyx-pdf-textlayer"
                    aria-label="Selectable PDF text layer"
                  />
                </div>
              )}

            </div>
          ) : (
            /* MODERN EDITORIAL PROSE VIEWER FOR EPUB / DOCX / MD / TXT / CSV / .skyxbook */
            <div className="min-h-full py-5 px-3 sm:px-6 flex flex-col items-center">
              <article
                className={`w-full max-w-3xl rounded-2xl border p-6 sm:p-10 shadow-sm transition-colors ${
                  paperTheme === "night"
                    ? "bg-[#151C2C] border-slate-800 text-slate-100"
                    : paperTheme === "ivory"
                    ? "bg-[#FAF7F0] border-[#E5DEC9] text-slate-900"
                    : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2 pb-3 mb-5 border-b border-current/10 text-xs opacity-70">
                  <span className="font-semibold truncate">
                    {activeTextPage?.label || activeDoc.title}
                  </span>
                  <span className="font-mono tabular-nums shrink-0">
                    Page {currentPage} / {totalPages}
                  </span>
                </div>

                <div className="skyx-prose text-[16px] leading-[1.85] font-serif">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeTextPage?.cleanedText || "_(This page has no text content)_"}
                  </ReactMarkdown>
                </div>
              </article>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className={`min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border font-semibold disabled:opacity-35 cursor-pointer ${
                      paperTheme === "night"
                        ? "bg-slate-900 border-slate-700 text-slate-200"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                    className={`min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border font-semibold disabled:opacity-35 cursor-pointer ${
                      paperTheme === "night"
                        ? "bg-slate-900 border-slate-700 text-slate-200"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DESKTOP RIGHT COLLAPSIBLE READER PANEL (lg+) */}
        {rightPanelOpen && (
          <aside className="hidden lg:flex w-[312px] shrink-0 border-l border-slate-200 bg-slate-50/75 flex-col min-h-0">
            <div className="px-3.5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-display text-xs font-bold text-slate-900 truncate">
                  Reader Studio Dock
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSetRightPanelOpen(false)}
                aria-label="Collapse right panel"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">{renderRightDockBody()}</div>
          </aside>
        )}
      </div>

      {/* MOBILE THUMB-FRIENDLY SLIDE-UP BOTTOM SHEET (z-[70] above PWA Nav) */}
      {mobileSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-[2px] flex items-end"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="w-full h-[80vh] bg-slate-50 rounded-t-3xl shadow-2xl border-t border-slate-200 flex flex-col pb-safe overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-2.5 pb-2 px-4 bg-white border-b border-slate-200 space-y-2 shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto" />
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-slate-900">
                  Reader Books &amp; Extract Tools
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSheetOpen(false)}
                  aria-label="Close reader sheet"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">{renderRightDockBody()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
