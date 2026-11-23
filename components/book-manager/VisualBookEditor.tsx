"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table";
import {
  Bold,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Columns3,
  Copy,
  FileCode2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  PlusSquare,
  Quote,
  Redo2,
  Replace,
  Rows3,
  Search,
  Sparkles,
  Strikethrough,
  Table as TableIcon,
  Tag,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from "lucide-react";
import {
  BOOK_BLOCK_TEMPLATES,
  htmlToCleanMarkdown,
  markdownToSafeHtml,
  type BookBlockTemplate,
} from "@/lib/book-engine/markdown-bridge";
import { addChapterToProject } from "@/lib/book-engine/toc-engine";
import type { BookChapterNode, SkyxBookProject } from "@/lib/book-engine/types";

interface VisualBookEditorProps {
  project: SkyxBookProject;
  selectedChapterId?: string | null;
  onSelectChapterId?: (chapterId: string | null) => void;
  onUpdateProject: (next: SkyxBookProject) => void;
  onNotify: (message: string, tone?: "info" | "success" | "error") => void;
  onJumpToPage?: (pageNumber: number) => void;
}

type EditorMode = "visual" | "markdown";
type MobileSheet = "none" | "chapters" | "blocks" | "source";

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function escapeLiteralReplacement(str: string): string {
  return str;
}

function replaceAllLiteral(
  source: string,
  find: string,
  replacement: string,
  caseSensitive: boolean
): { result: string; count: number } {
  if (!find) return { result: source, count: 0 };
  if (caseSensitive) {
    const parts = source.split(find);
    return {
      result: parts.join(escapeLiteralReplacement(replacement)),
      count: parts.length - 1,
    };
  }
  const lowerSource = source.toLowerCase();
  const lowerFind = find.toLowerCase();
  let cursor = 0;
  let matchIdx = lowerSource.indexOf(lowerFind, cursor);
  let count = 0;
  const chunks: string[] = [];
  while (matchIdx !== -1) {
    chunks.push(source.slice(cursor, matchIdx));
    chunks.push(replacement);
    cursor = matchIdx + find.length;
    count += 1;
    matchIdx = lowerSource.indexOf(lowerFind, cursor);
  }
  chunks.push(source.slice(cursor));
  return { result: chunks.join(""), count };
}

export default function VisualBookEditor({
  project,
  selectedChapterId: controlledChapterId,
  onSelectChapterId,
  onUpdateProject,
  onNotify,
  onJumpToPage,
}: VisualBookEditorProps) {
  const [internalChapterId, setInternalChapterId] = useState<string | null>(
    controlledChapterId || project.chapters[0]?.id || null
  );
  const selectedChapterId =
    controlledChapterId !== undefined ? controlledChapterId : internalChapterId;
  const setSelectedChapterId = useCallback(
    (nextId: string | null) => {
      if (onSelectChapterId) {
        onSelectChapterId(nextId);
      } else {
        setInternalChapterId(nextId);
      }
    },
    [onSelectChapterId]
  );

  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const [focusMode, setFocusMode] = useState(false);

  // Desktop collapsible rails
  const [showLeftRail, setShowLeftRail] = useState(true);
  const [showRightRail, setShowRightRail] = useState(true);
  const [chapterSearch, setChapterSearch] = useState("");

  // Mobile bottom sheets
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>("none");

  // Desktop quick block dropdown
  const [showDesktopBlocks, setShowDesktopBlocks] = useState(false);

  // Inline Find & Replace bar
  const [showFindBar, setShowFindBar] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);

  // Source inspector toggle
  const [sourceInspectType, setSourceInspectType] = useState<"cleaned" | "raw">(
    "cleaned"
  );
  const [copiedPageId, setCopiedPageId] = useState<string | null>(null);
  const [chapterTagInput, setChapterTagInput] = useState("");

  // Sync guards for Tiptap
  const loadedChapterIdRef = useRef<string | null>(null);
  const isInternalChangeRef = useRef(false);
  const projectRef = useRef(project);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const activeChapterIndex = useMemo(() => {
    if (project.chapters.length === 0) return -1;
    const idx = project.chapters.findIndex((c) => c.id === selectedChapterId);
    return idx >= 0 ? idx : 0;
  }, [project.chapters, selectedChapterId]);

  const activeChapter: BookChapterNode | null =
    activeChapterIndex >= 0 ? project.chapters[activeChapterIndex] : null;

  const activeChapterId = activeChapter?.id ?? null;

  const filteredChapters = useMemo(() => {
    const q = chapterSearch.trim().toLowerCase();
    if (!q) return project.chapters;
    return project.chapters.filter(
      (ch) =>
        ch.title.toLowerCase().includes(q) ||
        String(ch.chapterNumber).includes(q)
    );
  }, [project.chapters, chapterSearch]);

  const mappedSourcePages = useMemo(() => {
    if (!activeChapter) return [];
    const byId = project.pages.filter((p) => p.chapterId === activeChapter.id);
    if (byId.length > 0) return byId;
    if (activeChapter.pageStart && activeChapter.pageEnd) {
      return project.pages.filter(
        (p) =>
          p.pageNumber >= activeChapter.pageStart! &&
          p.pageNumber <= activeChapter.pageEnd!
      );
    }
    return [];
  }, [project.pages, activeChapter]);

  const commitChapterPatch = useCallback(
    (chapterId: string, patch: Partial<BookChapterNode>) => {
      const current = projectRef.current;
      const nextChapters = current.chapters.map((ch) =>
        ch.id === chapterId ? { ...ch, ...patch } : ch
      );
      onUpdateProject({
        ...current,
        updatedAt: new Date().toISOString(),
        chapters: nextChapters,
      });
    },
    [onUpdateProject]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
      }),
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({
        placeholder:
          "এখানে অধ্যায়টি সাজানো শুরু করুন অথবা '+ Block' বাটন থেকে সংজ্ঞা, নোট, সূত্র, টেবিল বা প্রশ্ন যোগ করুন...",
      }),
      TableKit.configure({
        table: {
          resizable: false,
          HTMLAttributes: {
            class: "skyx-editor-table",
          },
        },
      }),
    ],
    content: activeChapter
      ? markdownToSafeHtml(activeChapter.contentMarkdown)
      : "<p></p>",
    editorProps: {
      attributes: {
        class:
          "focus:outline-none text-[16px] sm:text-[15.5px] leading-relaxed font-sans",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!activeChapterId) return;
      isInternalChangeRef.current = true;
      const html = ed.getHTML();
      const md = htmlToCleanMarkdown(html);
      commitChapterPatch(activeChapterId, {
        contentMarkdown: md,
        contentHtml: html,
      });
      queueMicrotask(() => {
        isInternalChangeRef.current = false;
      });
    },
  });

  // Load chapter into Tiptap cleanly whenever active chapter changes or returning to visual mode
  useEffect(() => {
    if (!editor || !activeChapter) return;
    if (editorMode !== "visual") return;
    if (isInternalChangeRef.current && loadedChapterIdRef.current === activeChapter.id) {
      return;
    }
    if (loadedChapterIdRef.current !== activeChapter.id) {
      const safeHtml = markdownToSafeHtml(activeChapter.contentMarkdown);
      editor.commands.setContent(safeHtml, { emitUpdate: false });
      loadedChapterIdRef.current = activeChapter.id;
    }
  }, [editor, activeChapter, editorMode]);

  // Escape key exits Focus Mode
  useEffect(() => {
    if (!focusMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocusMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusMode]);

  const handleToggleMode = (nextMode: EditorMode) => {
    if (nextMode === editorMode) return;
    if (nextMode === "visual" && editor && activeChapter) {
      const safeHtml = markdownToSafeHtml(activeChapter.contentMarkdown);
      editor.commands.setContent(safeHtml, { emitUpdate: false });
      loadedChapterIdRef.current = activeChapter.id;
    }
    setEditorMode(nextMode);
  };

  const handleSelectChapter = (chapterId: string) => {
    loadedChapterIdRef.current = null;
    setSelectedChapterId(chapterId);
    setMobileSheet("none");
  };

  const handlePrevChapter = () => {
    if (activeChapterIndex > 0) {
      handleSelectChapter(project.chapters[activeChapterIndex - 1].id);
    }
  };

  const handleNextChapter = () => {
    if (
      activeChapterIndex >= 0 &&
      activeChapterIndex < project.chapters.length - 1
    ) {
      handleSelectChapter(project.chapters[activeChapterIndex + 1].id);
    }
  };

  const handleCreateQuickChapter = () => {
    const updated = addChapterToProject(
      project,
      `অধ্যায় ${project.chapters.length + 1} — নতুন অধ্যায়`,
      null,
      null,
      1
    );
    onUpdateProject(updated);
    const created = updated.chapters[updated.chapters.length - 1];
    if (created) {
      loadedChapterIdRef.current = null;
      setSelectedChapterId(created.id);
    }
    setMobileSheet("none");
    onNotify("নতুন অধ্যায় তৈরি হয়েছে।", "success");
  };

  const handleInsertBlock = (template: BookBlockTemplate) => {
    if (!activeChapter) return;
    if (editorMode === "visual" && editor) {
      editor.chain().focus().insertContent(template.html).run();
    } else {
      const nextMd = `${activeChapter.contentMarkdown.trimEnd()}\n${template.markdown}`;
      commitChapterPatch(activeChapter.id, { contentMarkdown: nextMd });
    }
    setShowDesktopBlocks(false);
    setMobileSheet("none");
    onNotify(`"${template.bnLabel}" ব্লক যুক্ত করা হয়েছে।`, "success");
  };

  const handleInsertSourceText = (text: string, pageNum: number) => {
    if (!activeChapter || !text.trim()) return;
    if (editorMode === "visual" && editor) {
      const safeHtml = markdownToSafeHtml(text);
      editor.chain().focus().insertContent(safeHtml).run();
    } else {
      const nextMd = `${activeChapter.contentMarkdown.trimEnd()}\n\n${text.trim()}\n`;
      commitChapterPatch(activeChapter.id, { contentMarkdown: nextMd });
    }
    setMobileSheet("none");
    onNotify(`Page ${pageNum} থেকে লেখা এডিটরে যুক্ত হয়েছে।`, "success");
  };

  const handleCopySourcePage = async (pageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPageId(pageId);
      setTimeout(() => setCopiedPageId(null), 1600);
      onNotify("Source text copied to clipboard.", "info");
    } catch {
      onNotify("Clipboard unavailable in this browser context.", "error");
    }
  };

  const handleChapterFindReplaceAll = () => {
    if (!activeChapter || !findQuery) return;
    const { result, count } = replaceAllLiteral(
      activeChapter.contentMarkdown,
      findQuery,
      replaceQuery,
      caseSensitive
    );
    if (count === 0) {
      onNotify(`"${findQuery}" এই অধ্যায়ে পাওয়া যায়নি।`, "info");
      return;
    }
    commitChapterPatch(activeChapter.id, { contentMarkdown: result });
    if (editorMode === "visual" && editor) {
      const safeHtml = markdownToSafeHtml(result);
      editor.commands.setContent(safeHtml, { emitUpdate: false });
      loadedChapterIdRef.current = activeChapter.id;
    }
    onNotify(`এই অধ্যায়ে ${count} টি জায়গায় পরিবর্তন করা হয়েছে।`, "success");
  };

  const handleCycleStatus = () => {
    if (!activeChapter) return;
    const nextStatus: BookChapterNode["status"] =
      activeChapter.status === "draft"
        ? "reviewed"
        : activeChapter.status === "reviewed"
        ? "ready"
        : "draft";
    commitChapterPatch(activeChapter.id, { status: nextStatus });
  };

  const handleAddChapterTag = () => {
    if (!activeChapter) return;
    const clean = chapterTagInput.trim().toLowerCase();
    if (!clean) return;
    if (!activeChapter.tags.includes(clean)) {
      commitChapterPatch(activeChapter.id, {
        tags: [...activeChapter.tags, clean],
      });
    }
    setChapterTagInput("");
  };

  const handleRemoveChapterTag = (tag: string) => {
    if (!activeChapter) return;
    commitChapterPatch(activeChapter.id, {
      tags: activeChapter.tags.filter((t) => t !== tag),
    });
  };

  const activeWordCount = activeChapter
    ? countWords(activeChapter.contentMarkdown)
    : 0;
  const activeCharCount = activeChapter ? activeChapter.contentMarkdown.length : 0;
  const estReadMinutes = Math.max(1, Math.ceil(activeWordCount / 180));
  const isInTable = editor?.isActive("table") ?? false;

  // Empty state if book has 0 chapters yet
  if (project.chapters.length === 0 || !activeChapter) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-base font-bold text-slate-900">
            Visual Book Studio প্রস্তুত — কিন্তু এখনো কোনো অধ্যায় (Chapter) নেই
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Tab 3 (TOC &amp; Chapters) থেকে Auto-Detect/Batch Paste দিয়ে অধ্যায় তৈরি করুন অথবা সরাসরি নিচের বাটনে ক্লিক করে প্রথম অধ্যায় শুরু করুন।
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateQuickChapter}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>প্রথম অধ্যায় তৈরি করুন</span>
        </button>
      </div>
    );
  }

  const statusBadgeTone =
    activeChapter.status === "ready"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : activeChapter.status === "reviewed"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  const toolbarBtnClass = (active: boolean) =>
    `inline-flex items-center justify-center min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] px-2 rounded-xl sm:rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
      active
        ? "bg-indigo-600 text-white shadow-xs"
        : "text-slate-700 hover:bg-slate-100 active:bg-slate-200"
    }`;

  // Reusable Source Page Inspector Body (used in Desktop Right Rail AND Mobile Bottom Sheet)
  const renderSourceInspectorBody = () => (
    <div className="space-y-4">
      {/* Chapter Metadata & Tags */}
      <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            Chapter Status
          </span>
          <button
            type="button"
            onClick={handleCycleStatus}
            className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-bold uppercase cursor-pointer ${statusBadgeTone}`}
          >
            {activeChapter.status}
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
            <Tag className="w-3 h-3 text-indigo-500" />
            <span>Chapter Tags</span>
          </span>
          <div className="flex flex-wrap gap-1">
            {activeChapter.tags.map((tg) => (
              <button
                key={tg}
                type="button"
                onClick={() => handleRemoveChapterTag(tg)}
                className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10.5px] font-medium hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                title="Remove tag"
              >
                #{tg}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={chapterTagInput}
              onChange={(e) => setChapterTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddChapterTag();
                }
              }}
              placeholder="e.g. mcq, board-2025"
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={handleAddChapterTag}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Mapped Source Pages */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Source Pages ({mappedSourcePages.length})</span>
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setSourceInspectType("cleaned")}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer ${
                sourceInspectType === "cleaned"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500"
              }`}
            >
              Cleaned
            </button>
            <button
              type="button"
              onClick={() => setSourceInspectType("raw")}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer ${
                sourceInspectType === "raw"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500"
              }`}
            >
              Raw
            </button>
          </div>
        </div>

        {mappedSourcePages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-500">
            এই অধ্যায়ে কোনো পেজ রেঞ্জ ম্যাপ করা নেই। Tab 3 (TOC &amp; Chapters) থেকে পেজ রেঞ্জ সেট করলে এখানে মূল বইয়ের পেজগুলো দেখাবে।
          </div>
        ) : (
          <div className="space-y-2.5">
            {mappedSourcePages.map((pg) => {
              const displayText =
                sourceInspectType === "cleaned" ? pg.cleanedText : pg.rawText;
              return (
                <div
                  key={pg.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-bold text-slate-900">
                      Page {pg.pageNumber}
                      {pg.label ? ` · ${pg.label.slice(0, 18)}` : ""}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleCopySourcePage(pg.id, displayText)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-700 cursor-pointer"
                        title="Copy page text"
                      >
                        {copiedPageId === pg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleInsertSourceText(displayText, pg.pageNumber)
                        }
                        className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10.5px] font-semibold cursor-pointer"
                        title="Insert page text at cursor"
                      >
                        + Insert
                      </button>
                      {onJumpToPage && (
                        <button
                          type="button"
                          onClick={() => onJumpToPage(pg.pageNumber)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-semibold cursor-pointer"
                        >
                          Inspect
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto bg-slate-50/70 rounded-lg p-2 border border-slate-100">
                    {displayText || "(Empty page)"}
                  </p>
                </div>
              );
            })}
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
          : "rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden flex flex-col"
      }
    >
      {/* MOBILE COMPACT CHAPTER SWITCHER BAR (< lg) */}
      <div className="lg:hidden flex items-center justify-between gap-1.5 px-2.5 py-2 bg-slate-50 border-b border-slate-200">
        <button
          type="button"
          onClick={handlePrevChapter}
          disabled={activeChapterIndex <= 0}
          aria-label="Previous chapter"
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-35 shrink-0 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setMobileSheet("chapters")}
          className="flex-1 min-w-0 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-left cursor-pointer"
        >
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold text-indigo-600 leading-tight">
              Ch {activeChapter.chapterNumber}/{project.chapters.length} ·{" "}
              {activeChapter.status.toUpperCase()}
            </div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {activeChapter.title}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        <button
          type="button"
          onClick={handleNextChapter}
          disabled={activeChapterIndex >= project.chapters.length - 1}
          aria-label="Next chapter"
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-35 shrink-0 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* MAIN STUDIO BODY (Desktop 3-Column / Mobile Single-Column) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* DESKTOP LEFT RAIL: CHAPTER NAVIGATOR (lg+) */}
        {showLeftRail && !focusMode && (
          <aside className="hidden lg:flex w-[250px] shrink-0 border-r border-slate-200 bg-slate-50/70 flex-col">
            <div className="p-3 border-b border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                  Chapters ({project.chapters.length})
                </span>
                <button
                  type="button"
                  onClick={handleCreateQuickChapter}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-semibold cursor-pointer"
                  title="Add new chapter"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder="Filter chapters..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11.5px] focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[680px]">
              {filteredChapters.map((ch) => {
                const isSelected = ch.id === activeChapter.id;
                const indent =
                  ch.level === 2 ? "pl-5" : ch.level === 3 ? "pl-8" : "pl-2.5";
                const dotColor =
                  ch.status === "ready"
                    ? "bg-emerald-500"
                    : ch.status === "reviewed"
                    ? "bg-sky-500"
                    : "bg-slate-300";
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleSelectChapter(ch.id)}
                    className={`w-full text-left ${indent} pr-2.5 py-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white border-indigo-400 shadow-xs"
                        : "bg-transparent border-transparent hover:bg-white/80 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <span
                        className={`text-xs truncate ${
                          isSelected
                            ? "font-bold text-indigo-950"
                            : "font-medium text-slate-700"
                        }`}
                      >
                        {ch.title}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-0.5 pl-3.5">
                      <span>
                        {ch.pageStart
                          ? `P.${ch.pageStart}${ch.pageEnd && ch.pageEnd !== ch.pageStart ? `–${ch.pageEnd}` : ""}`
                          : `H${ch.level}`}
                      </span>
                      <span>{countWords(ch.contentMarkdown)}w</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* CENTER COLUMN: TOOLBAR + EDITOR CANVAS */}
        <div className="flex-1 min-w-0 flex flex-col bg-white overflow-hidden">
          {/* STICKY SINGLE-ROW TOUCH-FRIENDLY FORMATTING TOOLBAR */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-2 sm:px-3 py-1.5">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {/* Desktop Left Rail Toggle */}
              {!focusMode && (
                <button
                  type="button"
                  onClick={() => setShowLeftRail((v) => !v)}
                  className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 shrink-0 cursor-pointer"
                  title={showLeftRail ? "Hide Chapter Rail" : "Show Chapter Rail"}
                >
                  {showLeftRail ? (
                    <PanelLeftClose className="w-4 h-4" />
                  ) : (
                    <PanelLeftOpen className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Visual Mode Formatting Controls */}
              {editorMode === "visual" && editor && (
                <>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className={`${toolbarBtnClass(false)} disabled:opacity-30`}
                    title="Undo"
                    aria-label="Undo"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className={`${toolbarBtnClass(false)} disabled:opacity-30`}
                    title="Redo"
                    aria-label="Redo"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>

                  <span className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

                  <button
                    type="button"
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                    className={toolbarBtnClass(
                      editor.isActive("heading", { level: 1 })
                    )}
                    title="Heading 1"
                    aria-label="Heading 1"
                  >
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    className={toolbarBtnClass(
                      editor.isActive("heading", { level: 2 })
                    )}
                    title="Heading 2"
                    aria-label="Heading 2"
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                    className={toolbarBtnClass(
                      editor.isActive("heading", { level: 3 })
                    )}
                    title="Heading 3"
                    aria-label="Heading 3"
                  >
                    <Heading3 className="w-4 h-4" />
                  </button>

                  <span className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={toolbarBtnClass(editor.isActive("bold"))}
                    title="Bold"
                    aria-label="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={toolbarBtnClass(editor.isActive("italic"))}
                    title="Italic"
                    aria-label="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={toolbarBtnClass(editor.isActive("underline"))}
                    title="Underline"
                    aria-label="Underline"
                  >
                    <UnderlineIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={toolbarBtnClass(editor.isActive("strike"))}
                    title="Strikethrough"
                    aria-label="Strikethrough"
                  >
                    <Strikethrough className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    className={toolbarBtnClass(editor.isActive("highlight"))}
                    title="Highlight Key Phrase"
                    aria-label="Highlight"
                  >
                    <Highlighter className="w-4 h-4" />
                  </button>

                  <span className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={toolbarBtnClass(editor.isActive("bulletList"))}
                    title="Bullet List"
                    aria-label="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editor.chain().focus().toggleOrderedList().run()
                    }
                    className={toolbarBtnClass(editor.isActive("orderedList"))}
                    title="Numbered List"
                    aria-label="Numbered List"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editor.chain().focus().toggleBlockquote().run()
                    }
                    className={toolbarBtnClass(editor.isActive("blockquote"))}
                    title="Callout / Definition Quote"
                    aria-label="Callout Quote"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={toolbarBtnClass(editor.isActive("codeBlock"))}
                    title="Formula / Code Block"
                    aria-label="Formula Block"
                  >
                    <Code2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editor
                        .chain()
                        .focus()
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run()
                    }
                    className={toolbarBtnClass(isInTable)}
                    title="Insert 3×3 Table"
                    aria-label="Insert Table"
                  >
                    <TableIcon className="w-4 h-4" />
                  </button>
                </>
              )}

              <span className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

              {/* + Block Inserter (Mobile opens Bottom Sheet, Desktop toggles popover) */}
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setMobileSheet("blocks");
                  } else {
                    setShowDesktopBlocks((v) => !v);
                  }
                }}
                className="inline-flex items-center gap-1 min-h-[38px] sm:min-h-[32px] px-2.5 rounded-xl sm:rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold shrink-0 cursor-pointer"
                title="Insert Textbook Block (Definition, Note, Formula, Table, MCQ)"
              >
                <PlusSquare className="w-3.5 h-3.5" />
                <span>+ Block</span>
              </button>

              {/* Find & Replace Toggle */}
              <button
                type="button"
                onClick={() => setShowFindBar((v) => !v)}
                className={toolbarBtnClass(showFindBar)}
                title="Find & Replace in Chapter"
                aria-label="Find and Replace"
              >
                <Replace className="w-4 h-4" />
              </button>

              {/* Visual <-> Markdown Toggle */}
              <div className="inline-flex rounded-xl sm:rounded-lg bg-slate-100 p-0.5 border border-slate-200 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => handleToggleMode("visual")}
                  className={`px-2.5 py-1 rounded-lg sm:rounded-md text-[11px] font-semibold cursor-pointer ${
                    editorMode === "visual"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  Visual
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode("markdown")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg sm:rounded-md text-[11px] font-semibold cursor-pointer ${
                    editorMode === "markdown"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  <FileCode2 className="w-3 h-3" />
                  <span>MD</span>
                </button>
              </div>

              {/* Mobile Source Sheet Button */}
              <button
                type="button"
                onClick={() => setMobileSheet("source")}
                className="lg:hidden inline-flex items-center gap-1 min-h-[38px] px-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold shrink-0 cursor-pointer"
                title="View Mapped Source Pages"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Source</span>
              </button>

              {/* Focus / Fullscreen Mode Button */}
              <button
                type="button"
                onClick={() => setFocusMode((v) => !v)}
                className={toolbarBtnClass(focusMode)}
                title={focusMode ? "Exit Focus Mode (Esc)" : "Fullscreen Focus Mode"}
                aria-label="Toggle Focus Mode"
              >
                {focusMode ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              {/* Desktop Right Rail Toggle */}
              {!focusMode && (
                <button
                  type="button"
                  onClick={() => setShowRightRail((v) => !v)}
                  className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 shrink-0 cursor-pointer"
                  title={showRightRail ? "Hide Source Rail" : "Show Source Rail"}
                >
                  {showRightRail ? (
                    <PanelRightClose className="w-4 h-4" />
                  ) : (
                    <PanelRightOpen className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {/* DESKTOP INLINE BLOCK GALLERY DRAWER */}
            {showDesktopBlocks && (
              <div className="hidden lg:block mt-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Smart Textbook Blocks — ক্লিক করলেই কার্সরে যুক্ত হবে</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDesktopBlocks(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {BOOK_BLOCK_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleInsertBlock(tpl)}
                      className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer"
                    >
                      <div className="text-xs font-bold text-slate-900">
                        {tpl.bnLabel}{" "}
                        <span className="text-[10.5px] font-medium text-indigo-600">
                          · {tpl.label}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-0.5 line-clamp-1">
                        {tpl.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CONTEXTUAL TABLE CONTROLS (Only visible when cursor is inside a table) */}
            {editorMode === "visual" && editor && isInTable && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                <span className="font-bold text-indigo-700 px-1.5 shrink-0">
                  Table:
                </span>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 font-semibold shrink-0 cursor-pointer"
                >
                  <Rows3 className="w-3 h-3" />
                  <span>+ Row</span>
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 font-semibold shrink-0 cursor-pointer"
                >
                  <Columns3 className="w-3 h-3" />
                  <span>+ Col</span>
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold shrink-0 cursor-pointer"
                >
                  - Row
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold shrink-0 cursor-pointer"
                >
                  - Col
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Table</span>
                </button>
              </div>
            )}

            {/* INLINE SAFE LITERAL FIND & REPLACE BAR */}
            {showFindBar && (
              <div className="mt-1.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  placeholder="Find exact text..."
                  className="flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-400"
                />
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace with..."
                  className="flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-400"
                />
                <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Aa</span>
                </label>
                <button
                  type="button"
                  disabled={!findQuery}
                  onClick={handleChapterFindReplaceAll}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Replace All
                </button>
                <button
                  type="button"
                  onClick={() => setShowFindBar(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Close Find bar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* EDITABLE CHAPTER TITLE STRIP + SCROLLABLE CANVAS */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 bg-slate-50/35">
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Chapter Title & Meta Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                <input
                  type="text"
                  value={activeChapter.title}
                  onChange={(e) =>
                    commitChapterPatch(activeChapter.id, {
                      title: e.target.value,
                    })
                  }
                  placeholder="Chapter Title..."
                  className="flex-1 min-w-[200px] bg-transparent font-display text-lg sm:text-xl font-extrabold text-slate-900 focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={handleCycleStatus}
                  className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-bold uppercase cursor-pointer ${statusBadgeTone}`}
                  title="Cycle status: Draft -> Reviewed -> Ready"
                >
                  {activeChapter.status}
                </button>
              </div>

              {/* Editor Surface */}
              {editorMode === "visual" ? (
                <div className="skyx-tiptap rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-7 shadow-xs min-h-[420px]">
                  <EditorContent editor={editor} />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Clean Portable GFM Markdown (syncs losslessly back to Visual Studio)
                    </span>
                    <span className="font-mono text-indigo-600">
                      ==text== for Highlight
                    </span>
                  </div>
                  <textarea
                    value={activeChapter.contentMarkdown}
                    onChange={(e) =>
                      commitChapterPatch(activeChapter.id, {
                        contentMarkdown: e.target.value,
                      })
                    }
                    rows={20}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 p-4 sm:p-5 text-[15px] sm:text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-400 resize-y"
                    placeholder="# অধ্যায়ের শিরোনাম&#10;&#10;এখানে Markdown লিখুন..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* COMPACT STUDIO FOOTER BAR */}
          <div className="px-3 sm:px-5 py-2 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auto-synced</span>
              </span>
              <span className="font-mono">
                {activeWordCount.toLocaleString()} words ·{" "}
                {activeCharCount.toLocaleString()} chars
              </span>
              <span className="hidden sm:inline font-mono text-slate-400">
                ~{estReadMinutes} min read
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeChapter.pageStart && (
                <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  Pages {activeChapter.pageStart}–
                  {activeChapter.pageEnd ?? activeChapter.pageStart}
                </span>
              )}
              {focusMode && (
                <button
                  type="button"
                  onClick={() => setFocusMode(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold cursor-pointer"
                >
                  Exit Focus
                </button>
              )}
            </div>
          </div>
        </div>

        {/* DESKTOP RIGHT RAIL: SOURCE PAGE REFERENCE & CHAPTER INSPECTOR (lg+) */}
        {showRightRail && !focusMode && (
          <aside className="hidden lg:flex w-[290px] shrink-0 border-l border-slate-200 bg-slate-50/60 flex-col">
            <div className="px-3.5 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                Inspector &amp; Source
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Ref View
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 max-h-[680px]">
              {renderSourceInspectorBody()}
            </div>
          </aside>
        )}
      </div>

      {/* =====================================================================
          MOBILE SLIDE-UP BOTTOM SHEETS (Thumb-Friendly, z-[70] above PWA Nav)
         ===================================================================== */}
      {mobileSheet !== "none" && (
        <div
          className="lg:hidden fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-[2px] flex items-end"
          onClick={() => setMobileSheet("none")}
        >
          <div
            className="w-full max-h-[82vh] bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 flex flex-col pb-safe overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Pill + Sheet Header */}
            <div className="pt-2.5 pb-2 px-4 border-b border-slate-100 space-y-2">
              <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto" />
              <div className="flex items-center justify-between">
                <h4 className="font-display text-sm font-bold text-slate-900">
                  {mobileSheet === "chapters" &&
                    `Chapters (${project.chapters.length})`}
                  {mobileSheet === "blocks" && "Smart Textbook Blocks"}
                  {mobileSheet === "source" && "Source Pages & Chapter Info"}
                </h4>
                <button
                  type="button"
                  onClick={() => setMobileSheet("none")}
                  className="p-1.5 rounded-xl bg-slate-100 text-slate-600 cursor-pointer"
                  aria-label="Close sheet"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sheet Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {mobileSheet === "chapters" && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleCreateQuickChapter}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ নতুন অধ্যায় যোগ করুন</span>
                  </button>

                  <div className="space-y-1.5">
                    {project.chapters.map((ch) => {
                      const isSel = ch.id === activeChapter.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => handleSelectChapter(ch.id)}
                          className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                            isSel
                              ? "bg-indigo-50 border-indigo-400"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {ch.chapterNumber}. {ch.title}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 shrink-0">
                              {ch.status}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center justify-between">
                            <span>
                              {ch.pageStart
                                ? `Pages ${ch.pageStart}–${ch.pageEnd ?? ch.pageStart}`
                                : `Depth H${ch.level}`}
                            </span>
                            <span>{countWords(ch.contentMarkdown)} words</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {mobileSheet === "blocks" && (
                <div className="skyx-grid-two">
                  {BOOK_BLOCK_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleInsertBlock(tpl)}
                      className="text-left p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 active:bg-indigo-50 active:border-indigo-400 space-y-1 cursor-pointer"
                    >
                      <div className="text-xs font-bold text-slate-900">
                        {tpl.bnLabel}
                      </div>
                      <div className="text-[10.5px] font-semibold text-indigo-600">
                        {tpl.label}
                      </div>
                      <p className="text-[10.5px] text-slate-500 leading-snug">
                        {tpl.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {mobileSheet === "source" && renderSourceInspectorBody()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
