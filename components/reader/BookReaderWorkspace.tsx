"use client";

import ReadAlong from "./ReadAlong";
import React, { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookMarked,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FolderHeart,
  Headphones,
  Highlighter,
  LayoutDashboard,
  Library,
  Loader2,
  Menu,
  MessageSquarePlus,
  Mic,
  Pin,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Underline,
  UserCog,
  Volume2,
  X,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";
import ThreeDiagramLab from "@/components/lab/ThreeDiagramLab";
import { READER_FONT_OPTIONS, resolveReaderFont } from "@/lib/reader-fonts";
import type { BookTopic, Model3DKey } from "@/lib/types";

interface SelectionPopup {
  text: string;
  top: number;
  left: number;
}

const SPRING_FAST = { type: "spring" as const, stiffness: 420, damping: 32 };
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export default function BookReaderWorkspace() {
  const {
    books,
    topics,
    studyTabTypes,
    topicStudyTabs,
    annotations,
    readingProgress,
    questions,
    activeBookId,
    activeTopicId,
    activeReaderTab,
    setActiveReaderTab,
    openBookReader,
    setLearnerRoute,
    comfort,
    updateComfort,
    addAnnotation,
    deleteAnnotation,
    updateTopicProgress,
    openAiTutor,
    saveTopicStudyTab,
    isAdmin,
    getModelForTask,
    getSecretSlotForTask,
    notify,
  } = useApp();

  const [sidebarSearch, setSidebarSearch] = useState("");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});
  const [comfortOpen, setComfortOpen] = useState(false);
  const [vaultDrawerOpen, setVaultDrawerOpen] = useState(false);
  const [bottomSettingsOpen, setBottomSettingsOpen] = useState(false);

  // Selection toolbar & note modal
  const readAlongContent = useRef<HTMLDivElement | null>(null);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(null);
  const [noteModal, setNoteModal] = useState<{
    open: boolean;
    type: "note" | "keypoint" | "highlight";
    quote: string;
    color: string;
  }>({ open: false, type: "note", quote: "", color: "amber" });
  const [noteInput, setNoteInput] = useState("");

  // Personal Key Point inline composer (on Key Points tab)
  const [personalKpTitle, setPersonalKpTitle] = useState("");
  const [personalKpNote, setPersonalKpNote] = useState("");

  // On-demand AI study tab generation cache
  const [aiGeneratedTabs, setAiGeneratedTabs] = useState<Record<string, { content: string; model: string }>>({});
  const [generatingTabKey, setGeneratingTabKey] = useState<string | null>(null);

  // Audio Read-Aloud & Dual-Speaker Podcast via gemini-3.8-flash-tts
  const [audioLoadingMode, setAudioLoadingMode] = useState<"single" | "podcast" | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioModeLabel, setAudioModeLabel] = useState<string>("");

  // Quick inline practice quiz inside the Exam tab
  const [quickQuizAnswers, setQuickQuizAnswers] = useState<Record<string, number>>({});
  const [quickQuizSubmitted, setQuickQuizSubmitted] = useState(false);

  const activeBook = useMemo(
    () => books.find((b) => b.id === activeBookId) || books[0],
    [books, activeBookId]
  );

  const bookTopics = useMemo(
    () =>
      topics
        .filter((t) => t.bookId === activeBook?.id)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [topics, activeBook]
  );

  const manualToc = useMemo(() => {
    const depth = new Map<string, number>();
    const hidden = new Set<string>();
    const children = new Set(bookTopics.flatMap(topic => topic.builderParentId ? [topic.builderParentId] : []));
    return bookTopics.filter(topic => topic.builderPath).flatMap(topic => {
      const parent = topic.builderParentId;
      const level = parent ? (depth.get(parent) ?? 0) + 1 : 0;
      depth.set(topic.id, level);
      if (parent && (hidden.has(parent) || collapsedChapters[parent])) hidden.add(topic.id);
      if (sidebarSearch.trim()) {
        if (!topic.builderPath!.toLowerCase().includes(sidebarSearch.trim().toLowerCase())) return [];
      } else if (hidden.has(topic.id)) return [];
      return [{ topic, level, hasChildren: children.has(topic.id) }];
    });
  }, [bookTopics, collapsedChapters, sidebarSearch]);

  const activeTopic = useMemo(
    () => bookTopics.find((t) => t.id === activeTopicId) || bookTopics[0],
    [bookTopics, activeTopicId]
  );

  const activeFont = useMemo(() => resolveReaderFont(comfort.fontFamily), [comfort.fontFamily]);

  // Reset audio & quick quiz when switching topics
  const [prevTopicId, setPrevTopicId] = useState<string | undefined>(activeTopic?.id);
  if (activeTopic?.id !== prevTopicId) {
    setPrevTopicId(activeTopic?.id);
    setAudioSrc(null);
    setAudioModeLabel("");
    setSelectionPopup(null);
    setQuickQuizAnswers({});
    setQuickQuizSubmitted(false);
  }

  // Group topics hierarchically: Chapter -> Section -> Topic[]
  const chapterTree = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    const filtered = q
      ? bookTopics.filter(
          (t) =>
            t.topicTitle.toLowerCase().includes(q) ||
            t.chapterTitle.toLowerCase().includes(q) ||
            t.sectionTitle.toLowerCase().includes(q)
        )
      : bookTopics;

    const chapters = new Map<
      string,
      { chapterNumber: number; chapterTitle: string; sections: Map<string, BookTopic[]> }
    >();

    for (const topic of filtered) {
      const chKey = `${topic.chapterNumber}-${topic.chapterTitle}`;
      if (!chapters.has(chKey)) {
        chapters.set(chKey, {
          chapterNumber: topic.chapterNumber,
          chapterTitle: topic.chapterTitle,
          sections: new Map(),
        });
      }
      const ch = chapters.get(chKey)!;
      if (!ch.sections.has(topic.sectionTitle)) {
        ch.sections.set(topic.sectionTitle, []);
      }
      ch.sections.get(topic.sectionTitle)!.push(topic);
    }

    return Array.from(chapters.entries()).map(([key, value]) => ({
      key,
      chapterNumber: value.chapterNumber,
      chapterTitle: value.chapterTitle,
      sections: Array.from(value.sections.entries()).map(([secTitle, items]) => ({
        sectionTitle: secTitle,
        topics: items,
      })),
    }));
  }, [bookTopics, sidebarSearch]);

  const completedTopicIds = useMemo(
    () => new Set(readingProgress.filter((p) => p.isCompleted).map((p) => p.topicId)),
    [readingProgress]
  );

  const bookCompletionPct = useMemo(() => {
    if (bookTopics.length === 0) return 0;
    const done = bookTopics.filter((t) => completedTopicIds.has(t.id)).length;
    return Math.round((done / bookTopics.length) * 100);
  }, [bookTopics, completedTopicIds]);

  const currentTopicIndex = bookTopics.findIndex((t) => t.id === activeTopic?.id);
  const prevTopic = currentTopicIndex > 0 ? bookTopics[currentTopicIndex - 1] : null;
  const nextTopic =
    currentTopicIndex >= 0 && currentTopicIndex < bookTopics.length - 1
      ? bookTopics[currentTopicIndex + 1]
      : null;

  const topicAnnotations = useMemo(
    () => annotations.filter((a) => a.topicId === activeTopic?.id),
    [annotations, activeTopic]
  );

  const personalKeyPoints = useMemo(
    () => topicAnnotations.filter((a) => a.type === "keypoint"),
    [topicAnnotations]
  );

  const isTopicBookmarked = useMemo(
    () => topicAnnotations.some((a) => a.type === "bookmark"),
    [topicAnnotations]
  );

  const isTopicCompleted = activeTopic ? completedTopicIds.has(activeTopic.id) : false;

  const topicQuestions = useMemo(() => {
    if (!activeTopic || !activeBook) return [];
    const exact = questions.filter((q) => q.topicId === activeTopic.id);
    if (exact.length > 0) return exact;
    return questions.filter((q) => q.bookId === activeBook.id).slice(0, 5);
  }, [questions, activeTopic, activeBook]);

  // Text selection detection inside reading area
  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !articleRef.current) {
      setSelectionPopup(null);
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 4) {
      setSelectionPopup(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!articleRef.current.contains(range.commonAncestorContainer)) {
      setSelectionPopup(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const containerRect = articleRef.current.getBoundingClientRect();
    setSelectionPopup({
      text: text.slice(0, 1200),
      top: Math.max(8, rect.top - containerRect.top - 54),
      left: Math.min(Math.max(24, rect.left - containerRect.left + rect.width / 2), containerRect.width - 24),
    });
  };

  const quickAnnotate = async (type: "highlight" | "underline", color: string) => {
    if (!selectionPopup || !activeBook || !activeTopic) return;
    await addAnnotation({
      bookId: activeBook.id,
      topicId: activeTopic.id,
      bookTitle: activeBook.title,
      topicTitle: activeTopic.topicTitle,
      type,
      color,
      quote: selectionPopup.text,
      noteText: "",
    });
    window.getSelection()?.removeAllRanges();
    setSelectionPopup(null);
  };

  const openNoteDialog = (type: "note" | "keypoint" | "highlight", quote: string, color = "amber") => {
    setNoteModal({ open: true, type, quote, color });
    setNoteInput("");
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
  };

  const submitNoteDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook || !activeTopic) return;
    if (!noteModal.quote.trim() && !noteInput.trim()) return;
    await addAnnotation({
      bookId: activeBook.id,
      topicId: activeTopic.id,
      bookTitle: activeBook.title,
      topicTitle: activeTopic.topicTitle,
      type: noteModal.type,
      color: noteModal.color,
      quote: noteModal.quote.trim() || noteInput.trim().slice(0, 180),
      noteText: noteInput.trim(),
    });
    setNoteModal({ open: false, type: "note", quote: "", color: "amber" });
    setNoteInput("");
  };

  const handleAddPersonalKeyPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook || !activeTopic || !personalKpTitle.trim()) return;
    await addAnnotation({
      bookId: activeBook.id,
      topicId: activeTopic.id,
      bookTitle: activeBook.title,
      topicTitle: activeTopic.topicTitle,
      type: "keypoint",
      color: "indigo",
      quote: personalKpTitle.trim(),
      noteText: personalKpNote.trim(),
    });
    setPersonalKpTitle("");
    setPersonalKpNote("");
  };

  const handleToggleBookmark = async () => {
    if (!activeBook || !activeTopic) return;
    const existing = topicAnnotations.find((a) => a.type === "bookmark");
    if (existing) {
      await deleteAnnotation(existing.id);
    } else {
      await addAnnotation({
        bookId: activeBook.id,
        topicId: activeTopic.id,
        bookTitle: activeBook.title,
        topicTitle: activeTopic.topicTitle,
        type: "bookmark",
        color: "indigo",
        quote: activeTopic.topicTitle,
        noteText: `Bookmarked from ${activeTopic.chapterTitle}`,
      });
    }
  };

  const handleToggleComplete = async () => {
    if (!activeBook || !activeTopic) return;
    const nextCompleted = !isTopicCompleted;
    await updateTopicProgress(activeBook, activeTopic, nextCompleted ? 100 : 50, nextCompleted);
    notify(nextCompleted ? "Topic marked as completed." : "Topic marked as in progress.", "success");
  };

  // Generate AI study content on demand for any tab
  const handleGenerateStudyTab = async (tabKey: string) => {
    if (!activeBook || !activeTopic) return;
    const tabMeta = studyTabTypes.find((t) => t.key === tabKey);
    setGeneratingTabKey(tabKey);
    try {
      const taskId = tabKey === "ultra_short" ? "cfg-ultrashort" : "cfg-summary";
      const res = await fetch("/api/ai/study-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: activeBook.title,
          topicTitle: activeTopic.topicTitle,
          contentMarkdown: activeTopic.contentMarkdown,
          tabKey,
          tabLabel: tabMeta?.label || tabKey,
          customPrompt: tabMeta?.promptTemplate,
          language: activeBook.language,
          model: getModelForTask(taskId),
          secretSlot: getSecretSlotForTask(taskId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate study content.");
      const cacheKey = `${activeTopic.id}:${tabKey}`;
      setAiGeneratedTabs((prev) => ({
        ...prev,
        [cacheKey]: { content: data.contentMarkdown, model: data.modelUsed || "gemini-4-hydrogen" },
      }));
      notify(`Generated ${tabMeta?.label || tabKey} with Gemini AI.`, "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "AI generation failed.", "error");
    } finally {
      setGeneratingTabKey(null);
    }
  };

  // Audio Read-Aloud or 2-Speaker Podcast
  const handleGenerateAudio = async (mode: "single" | "podcast") => {
    if (!activeTopic) return;
    setAudioLoadingMode(mode);
    try {
      const curated = topicStudyTabs.find(
        (t) => t.topicId === activeTopic.id && t.tabKey === activeReaderTab
      );
      const sourceText =
        activeReaderTab === "reading"
          ? activeTopic.contentMarkdown
          : curated?.contentMarkdown || activeTopic.contentMarkdown;

      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          mode,
          topicTitle: activeTopic.topicTitle,
          model: getModelForTask("cfg-tts"),
          secretSlot: getSecretSlotForTask("cfg-tts"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audio synthesis failed.");
      setAudioSrc(`data:${data.mimeType || "audio/wav"};base64,${data.audioBase64}`);
      setAudioModeLabel(mode === "podcast" ? "2-Speaker Study Podcast" : "AI Read-Aloud");
      notify(
        mode === "podcast" ? "2-Speaker Study Podcast ready!" : "Audio narration ready!",
        "success"
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not synthesize audio.", "error");
    } finally {
      setAudioLoadingMode(null);
    }
  };

  // Adaptive theme styles for reading canvas & top bar
  const themeStyles = {
    paper: {
      canvas: "bg-[#F9FAFD] text-[#172033]",
      sheet: "bg-white border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_12px_32px_rgba(15,23,42,0.04)]",
      header: "bg-white/92 border-slate-200/80 text-slate-900",
      tabTrack: "bg-slate-100/90 border-slate-200/70",
      tabActive: "bg-white text-indigo-700 shadow-xs",
      tabInactive: "text-slate-600 hover:text-slate-900",
      utilBtn: "bg-white border-slate-200/90 text-slate-700 hover:border-indigo-300 hover:text-indigo-700",
      utilBtnActive: "bg-indigo-50 border-indigo-300 text-indigo-700",
      card: "bg-white border-slate-200/85",
      muted: "text-slate-500",
      divider: "border-slate-200/80",
      actionGhost: "bg-white border-slate-200/90 text-slate-700 hover:border-indigo-300 hover:text-indigo-700",
    },
    sepia: {
      canvas: "bg-[#F3ECD9] text-[#2B2117]",
      sheet: "bg-[#FAF5E8] border-[#E4D7BC] shadow-[0_8px_28px_rgba(74,52,24,0.06)]",
      header: "bg-[#F5EFE0]/95 border-[#E2D6BC] text-[#2B2117]",
      tabTrack: "bg-[#E9DFC7] border-[#DDD0B2]",
      tabActive: "bg-[#FDFBF4] text-[#5B4326] shadow-xs",
      tabInactive: "text-[#6D5942] hover:text-[#2B2117]",
      utilBtn: "bg-[#FAF5E8] border-[#DFD2B7] text-[#4E3E2D] hover:border-[#B69B74]",
      utilBtnActive: "bg-[#ECE2CA] border-[#B69B74] text-[#3B2A1A]",
      card: "bg-[#FCF8EE] border-[#E4D7BC]",
      muted: "text-[#715E49]",
      divider: "border-[#E4D7BC]",
      actionGhost: "bg-[#FCF8EE] border-[#DFD2B7] text-[#4E3E2D] hover:border-[#B69B74]",
    },
    midnight: {
      canvas: "bg-[#090E1C] text-[#E2E8F0]",
      sheet: "bg-[#0F172A] border-white/[0.08] shadow-[0_16px_44px_rgba(2,6,23,0.45)]",
      header: "bg-[#0B1120]/95 border-white/[0.08] text-slate-100",
      tabTrack: "bg-white/[0.05] border-white/[0.08]",
      tabActive: "bg-indigo-500/20 text-indigo-200 border border-indigo-400/25",
      tabInactive: "text-slate-400 hover:text-slate-200",
      utilBtn: "bg-white/[0.04] border-white/[0.09] text-slate-300 hover:border-indigo-400/40 hover:text-white",
      utilBtnActive: "bg-indigo-500/20 border-indigo-400/40 text-indigo-200",
      card: "bg-[#131C31] border-white/[0.08]",
      muted: "text-slate-400",
      divider: "border-white/[0.08]",
      actionGhost: "bg-white/[0.04] border-white/[0.1] text-slate-200 hover:border-indigo-400/50 hover:text-white",
    },
  }[comfort.theme];

  const widthClass =
    comfort.measureWidth === "compact"
      ? "max-w-[62ch]"
      : comfort.measureWidth === "wide"
        ? "max-w-[84ch]"
        : "max-w-[72ch]";

  const sortedTabTypes = useMemo(
    () => [...studyTabTypes].filter((t) => t.isPublished).sort((a, b) => a.orderIndex - b.orderIndex),
    [studyTabTypes]
  );

  // Curated or freshly generated study content for active tab
  const activeTabContent = useMemo(() => {
    if (!activeTopic) return null;
    const cacheKey = `${activeTopic.id}:${activeReaderTab}`;
    if (aiGeneratedTabs[cacheKey]) {
      return {
        contentMarkdown: aiGeneratedTabs[cacheKey].content,
        modelUsed: aiGeneratedTabs[cacheKey].model,
        isUnsavedDraft: true,
      };
    }
    const stored = topicStudyTabs.find(
      (t) => t.topicId === activeTopic.id && t.tabKey === activeReaderTab
    );
    if (stored) {
      return {
        contentMarkdown: stored.contentMarkdown,
        modelUsed: stored.generatedByModel,
        isUnsavedDraft: false,
      };
    }
    return null;
  }, [activeTopic, activeReaderTab, topicStudyTabs, aiGeneratedTabs]);

  const renderSidebarContent = (isMobile = false) => (
    <div className="relative flex flex-col h-full bg-[#070B16] text-slate-200 border-r border-white/[0.07] select-none overflow-hidden">
      {/* Ambient midnight cosmic glow matching Executive Dashboard */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(260px circle at 15% 6%, rgba(99, 102, 241, 0.17), transparent 62%), radial-gradient(220px circle at 85% 92%, rgba(56, 189, 248, 0.1), transparent 60%)",
        }}
      />

      {/* Minimal Top Brand + Active Book Selector */}
      <div className="relative z-10 px-4 pt-4 pb-3.5 border-b border-white/[0.07] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366F1] via-[#7C5CF8] to-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-[0_6px_18px_rgba(99,102,241,0.45)]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm font-bold text-white tracking-tight truncate">
                Skyx Reader
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {activeBook?.subject || "Interactive Studio"}
              </div>
            </div>
          </div>

          {isMobile && (
            <button
              onClick={() => setMobileTocOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Close chapters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Active Book Selector */}
        <div className="relative">
          <select
            value={activeBook?.id || ""}
            onChange={(e) => openBookReader(e.target.value)}
            aria-label="Select active book"
            className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.09] text-xs font-medium text-slate-100 focus:outline-none focus:border-indigo-400/60 transition-colors cursor-pointer"
          >
            {books.map((b) => (
              <option key={b.id} value={b.id} className="bg-[#0B1120] text-slate-100">
                {b.title}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Reading Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Course progress</span>
            <span className="font-mono tabular-nums font-semibold text-indigo-300">
              {bookCompletionPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#38BDF8]"
              initial={{ width: 0 }}
              animate={{ width: `${bookCompletionPct}%` }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            />
          </div>
        </div>

        {/* Dark Glass Chapter Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder="Find chapter or topic..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400/60 focus:bg-white/[0.06] transition-colors"
          />
        </div>
      </div>

      {/* Chapter -> Section -> Topic Tree (Theme-Matched Dark Midnight) */}
      <div className="relative z-10 flex-1 overflow-y-auto sidebar-scroll px-3 py-3 space-y-2.5">
        {bookTopics.some(topic => topic.builderPath) ? (
          manualToc.length ? manualToc.map(({ topic, level, hasChildren }) => (
            <div key={topic.id} className="flex items-start gap-1" style={{ paddingInlineStart: Math.min(level, 10) * 9 }}>
              {hasChildren && <button type="button" className="px-1.5 py-2 text-indigo-300"
                disabled={Boolean(sidebarSearch.trim())} aria-label={collapsedChapters[topic.id] ? "Expand section" : "Collapse section"}
                aria-expanded={!collapsedChapters[topic.id]}
                onClick={() => setCollapsedChapters(previous => ({ ...previous, [topic.id]: !previous[topic.id] }))}>
                {collapsedChapters[topic.id] ? "+" : "−"}
              </button>}
              <button type="button" aria-current={topic.id === activeTopic?.id ? "page" : undefined}
                className="min-w-0 flex-1 break-words rounded px-2 py-2 text-left text-xs text-slate-100 hover:bg-white/10 aria-[current=page]:bg-indigo-500/30"
                onClick={() => { openBookReader(topic.bookId, topic.id, "reading"); setMobileTocOpen(false); }}>
                {completedTopicIds.has(topic.id) && <span aria-label="Completed">✓ </span>}{topic.topicTitle}
              </button>
            </div>
          )) : <p className="text-sm text-slate-300">No matching sections.</p>
        ) : chapterTree.length === 0 ? (
          <div className="text-center py-10 px-4 text-xs text-slate-500">
            No topics match &ldquo;{sidebarSearch}&rdquo;
          </div>
        ) : (
          chapterTree.map((ch) => {
            const isCollapsed = !!collapsedChapters[ch.key];
            const chTopicCount = ch.sections.reduce((acc, s) => acc + s.topics.length, 0);
            const chDoneCount = ch.sections.reduce(
              (acc, s) => acc + s.topics.filter((t) => completedTopicIds.has(t.id)).length,
              0
            );
            return (
              <div
                key={ch.key}
                className="rounded-2xl bg-white/[0.025] border border-white/[0.06] overflow-hidden"
              >
                <button
                  onClick={() =>
                    setCollapsedChapters((prev) => ({ ...prev, [ch.key]: !prev[ch.key] }))
                  }
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {String(ch.chapterNumber).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-100 leading-snug">
                      {ch.chapterTitle}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400 font-mono tabular-nums">
                      {chDoneCount}/{chTopicCount} completed
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: isCollapsed ? -90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-slate-500 mt-1 shrink-0"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: EASE_OUT }}
                      className="overflow-hidden border-t border-white/[0.05]"
                    >
                      <div className="p-2 space-y-2.5">
                        {ch.sections.map((sec) => (
                          <div key={sec.sectionTitle} className="space-y-1">
                            <div className="px-2 pt-0.5 text-[10.5px] font-medium text-slate-400 truncate">
                              {sec.sectionTitle}
                            </div>
                            <div className="space-y-1">
                              {sec.topics.map((topic) => {
                                const isCurrent = topic.id === activeTopic?.id;
                                const done = completedTopicIds.has(topic.id);
                                return (
                                  <motion.button
                                    key={topic.id}
                                    whileHover={{ x: 2 }}
                                    whileTap={{ scale: 0.985 }}
                                    transition={SPRING_FAST}
                                    onClick={() => {
                                      openBookReader(activeBook.id, topic.id, activeReaderTab);
                                      setMobileTocOpen(false);
                                    }}
                                    className="relative w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs cursor-pointer group"
                                  >
                                    {isCurrent && (
                                      <motion.div
                                        layoutId={isMobile ? "readerActiveTopicMobile" : "readerActiveTopicDesktop"}
                                        transition={SPRING_FAST}
                                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#6366F1]/25 via-[#6366F1]/14 to-[#38BDF8]/10 border border-indigo-400/30 shadow-[0_0_20px_rgba(99,102,241,0.18)]"
                                      >
                                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-[#818CF8] via-[#A78BFA] to-[#38BDF8] shadow-[0_0_10px_#818CF8]" />
                                      </motion.div>
                                    )}
                                    <CheckCircle2
                                      className={`relative z-10 w-3.5 h-3.5 mt-0.5 shrink-0 transition-colors ${
                                        isCurrent
                                          ? done
                                            ? "text-emerald-300"
                                            : "text-indigo-300"
                                          : done
                                            ? "text-emerald-400"
                                            : "text-slate-600 group-hover:text-slate-400"
                                      }`}
                                    />
                                    <div className="relative z-10 min-w-0 flex-1">
                                      <div
                                        className={`leading-snug line-clamp-2 transition-colors ${
                                          isCurrent
                                            ? "text-white font-semibold"
                                            : "text-slate-300 group-hover:text-white"
                                        }`}
                                      >
                                        {topic.topicTitle}
                                      </div>
                                      <div
                                        className={`mt-1 flex items-center gap-1.5 text-[10px] ${
                                          isCurrent ? "text-indigo-200/90" : "text-slate-500"
                                        }`}
                                      >
                                        <span className="font-mono tabular-nums">{topic.readingMinutes} min</span>
                                        {topic.model3dKey && (
                                          <>
                                            <span aria-hidden="true">·</span>
                                            <span className="text-sky-300/90">3D Lab</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Expand-Upward Settings & Workspace Menu */}
      <div className="relative z-20 p-3 border-t border-white/[0.07] bg-[#070B16]/95">
        <AnimatePresence>
          {bottomSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="absolute left-3 right-3 bottom-[calc(100%+8px)] rounded-2xl bg-[#0E1529] border border-white/[0.12] shadow-[0_-14px_40px_rgba(2,6,23,0.75)] p-3 space-y-3"
            >
              {/* Workspace Navigation */}
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Workspace Menu
                </div>
                {[
                  { label: "Dashboard", icon: LayoutDashboard, route: "dashboard" as const },
                  { label: "Book Library", icon: Library, route: "library" as const },
                  { label: "My Library", icon: BookMarked, route: "my-library" as const },
                  { label: "Study Vault", icon: FolderHeart, route: "vault" as const },
                  { label: "Account Settings", icon: UserCog, route: "account" as const },
                ].map((nav) => {
                  const Icon = nav.icon;
                  return (
                    <motion.button
                      key={nav.route}
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setBottomSettingsOpen(false);
                        setMobileTocOpen(false);
                        setLearnerRoute(nav.route);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/[0.07] hover:text-white transition-colors cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                      <span>{nav.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="h-px bg-white/[0.08]" />

              {/* Quick Reader Surface Switcher */}
              <div className="space-y-1.5">
                <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Paper Surface
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "paper", label: "White" },
                      { id: "sepia", label: "Sepia" },
                      { id: "midnight", label: "Dark" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => updateComfort({ theme: t.id })}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        comfort.theme === t.id
                          ? "bg-indigo-500 text-white shadow-sm"
                          : "bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Font Switcher */}
              <div className="space-y-1.5">
                <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Reading Font
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {READER_FONT_OPTIONS.slice(0, 4).map((f) => {
                    const active = activeFont.key === f.key;
                    return (
                      <button
                        key={f.key}
                        onClick={() => updateComfort({ fontFamily: f.key })}
                        className={`px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                          active
                            ? "bg-indigo-500/25 border border-indigo-400/50 text-white"
                            : "bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="text-[11px] font-semibold truncate">{f.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Voice Tutor Launch */}
              <button
                onClick={() => {
                  setBottomSettingsOpen(false);
                  openAiTutor({
                    mode: "voice",
                    prefill: activeTopic
                      ? `Explain "${activeTopic.topicTitle}" from ${activeBook?.title} clearly with exam tips.`
                      : undefined,
                  });
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-[#5B52F5] via-[#6D55F7] to-[#7C5CF8] hover:brightness-110 text-white text-xs font-semibold shadow-[0_8px_20px_rgba(99,102,241,0.35)] transition-all cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>AI Voice Tutor</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Settings Toggle Trigger */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setBottomSettingsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
            bottomSettingsOpen
              ? "bg-indigo-500/20 border-indigo-400/40 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]"
              : "bg-white/[0.04] border-white/[0.08] text-slate-200 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/30 border border-indigo-400/25 flex items-center justify-center shrink-0">
              <Settings className="w-3.5 h-3.5 text-indigo-300" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-semibold leading-none">Settings & Menu</div>
              <div className="text-[10px] text-slate-400 mt-1 truncate">
                Navigation, fonts & themes
              </div>
            </div>
          </div>
          <motion.span
            animate={{ rotate: bottomSettingsOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-400 shrink-0"
          >
            <ChevronUp className="w-4 h-4" />
          </motion.span>
        </motion.button>
      </div>
    </div>
  );

  if (!activeBook || !activeTopic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F5FA] p-6">
        <div className="text-center max-w-md space-y-4 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#5B52F5] to-[#7C5CF8] text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <BookOpen className="w-7 h-7" />
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">Select a Book to Start Reading</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Choose any academic, medical, BCS, or IELTS textbook from your Skyx Academy library.
          </p>
          <button
            onClick={() => setLearnerRoute("library")}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8] hover:brightness-110 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            Browse Book Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F2F5FA] text-slate-900">
      {/* Desktop Midnight Chapter Sidebar */}
      <aside className="hidden lg:block w-[296px] shrink-0 sticky top-0 h-screen">
        {renderSidebarContent(false)}
      </aside>

      {/* Slimmer Animated Mobile Chapter Drawer */}
      <AnimatePresence>
        {mobileTocOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden flex">
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.24, ease: EASE_OUT }}
              className="w-[244px] max-w-[78vw] h-full shadow-2xl relative z-10 rounded-r-[24px] overflow-hidden"
            >
              {renderSidebarContent(true)}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 bg-slate-950/55 backdrop-blur-[2px]"
              onClick={() => setMobileTocOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Focused Reading Area */}
      <div className={`flex-1 min-w-0 flex flex-col transition-colors duration-300 ${themeStyles.canvas}`}>
        {/* Adaptive Sticky Study Tab Header */}
        <header
          className={`sticky top-0 z-30 backdrop-blur-md border-b px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 transition-colors duration-300 ${themeStyles.header}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setMobileTocOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-current/15 hover:bg-current/5 transition-colors"
              aria-label="Open book table of contents"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="font-display text-[13px] font-bold truncate max-w-[200px] sm:max-w-[260px]">
                {activeBook.title}
              </div>
              <div className={`text-[11px] font-medium truncate ${themeStyles.muted}`}>
                Ch. {activeTopic.chapterNumber} · {activeTopic.sectionTitle}
              </div>
            </div>
          </div>

          {/* Spring-Animated Segmented Study Tab Bar */}
          <div
            className={`flex items-center gap-0.5 p-1 rounded-xl border overflow-x-auto max-w-full ${themeStyles.tabTrack}`}
          >
            {sortedTabTypes.map((tab) => {
              const isSelected = activeReaderTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveReaderTab(tab.key)}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected ? "" : themeStyles.tabInactive
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="readerStudyTabPill"
                      transition={SPRING_FAST}
                      className={`absolute inset-0 rounded-lg ${themeStyles.tabActive}`}
                    />
                  )}
                  <span
                    className={`relative z-10 ${
                      isSelected
                        ? comfort.theme === "midnight"
                          ? "text-indigo-200"
                          : comfort.theme === "sepia"
                            ? "text-[#4A351D]"
                            : "text-indigo-700"
                        : ""
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Utility Actions: Listen, Podcast, Vault, Multi-Font Comfort Studio */}
          <div className="flex items-center gap-1.5 shrink-0 relative">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => handleGenerateAudio("single")}
              disabled={audioLoadingMode !== null}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium disabled:opacity-50 whitespace-nowrap transition-colors cursor-pointer ${themeStyles.utilBtn}`}
              title="AI Read-Aloud Narration"
            >
              {audioLoadingMode === "single" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span className="hidden xl:inline">Listen</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => handleGenerateAudio("podcast")}
              disabled={audioLoadingMode !== null}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium disabled:opacity-50 whitespace-nowrap transition-colors cursor-pointer ${themeStyles.utilBtn}`}
              title="2-Speaker AI Study Podcast"
            >
              {audioLoadingMode === "podcast" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
              ) : (
                <Headphones className="w-3.5 h-3.5 text-violet-500" />
              )}
              <span className="hidden xl:inline">Podcast</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setVaultDrawerOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                vaultDrawerOpen ? themeStyles.utilBtnActive : themeStyles.utilBtn
              }`}
              title="Topic Highlights & Notes"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{topicAnnotations.length}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setComfortOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                comfortOpen ? themeStyles.utilBtnActive : themeStyles.utilBtn
              }`}
              title="Fonts & Reading Comfort Studio"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aa</span>
            </motion.button>

            {/* Animated Multi-Font Reading Comfort Studio Popover */}
            <AnimatePresence>
              {comfortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                  className="absolute right-0 top-12 z-40 w-[min(332px,calc(100vw-24px))] rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/15 p-4 space-y-4 text-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="font-display text-xs font-bold text-slate-900">
                        Typography & Comfort Studio
                      </span>
                    </div>
                    <button
                      onClick={() => setComfortOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Paper Surface */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Paper Surface</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: "paper", label: "White", cls: "bg-white text-slate-900 border-slate-300" },
                          { id: "sepia", label: "Sepia", cls: "bg-[#F8F3E6] text-[#2F2418] border-[#D8CCA8]" },
                          { id: "midnight", label: "Midnight", cls: "bg-[#0F172A] text-slate-100 border-slate-700" },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => updateComfort({ theme: t.id })}
                          className={`py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${t.cls} ${
                            comfort.theme === t.id ? "ring-2 ring-indigo-500 ring-offset-1" : "opacity-85 hover:opacity-100"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 6 Curated Multi-Font Picker (English + Bangla) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Reader Font (EN + Bangla)
                      </span>
                      <span className="text-[10px] font-medium text-indigo-600">{activeFont.category}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {READER_FONT_OPTIONS.map((font) => {
                        const selected = activeFont.key === font.key;
                        return (
                          <button
                            key={font.key}
                            onClick={() => updateComfort({ fontFamily: font.key })}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              selected
                                ? "bg-indigo-50/90 border-indigo-400 text-indigo-950 ring-1 ring-indigo-400/40"
                                : "bg-slate-50/60 border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-baseline justify-between gap-1">
                              <span
                                className="text-sm font-semibold leading-none"
                                style={{ fontFamily: font.cssFontFamily }}
                              >
                                {font.sample}
                              </span>
                              <span className="text-[10px] text-slate-400">{font.category}</span>
                            </div>
                            <div className="text-[11px] font-semibold mt-1 truncate">{font.label}</div>
                            <div className="text-[10px] text-slate-500 truncate">{font.subtitle}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Font Size & Line Spacing */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Size</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-800">
                          {comfort.fontSize}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={15}
                        max={24}
                        step={1}
                        value={comfort.fontSize}
                        onChange={(e) => updateComfort({ fontSize: Number(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Spacing</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-800">
                          {comfort.lineHeight.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1.6}
                        max={2.1}
                        step={0.05}
                        value={comfort.lineHeight}
                        onChange={(e) => updateComfort({ lineHeight: Number(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Measure Width */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Reading Width</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["compact", "optimal", "wide"] as const).map((w) => (
                        <button
                          key={w}
                          onClick={() => updateComfort({ measureWidth: w })}
                          className={`py-1.5 rounded-xl border text-xs font-medium capitalize transition-colors cursor-pointer ${
                            comfort.measureWidth === w
                              ? "bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Animated Audio Player Banner */}
        <AnimatePresence>
          {audioSrc && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-[#0B1120] text-white border-b border-white/10"
            >
              <div className="px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <Headphones className="w-4 h-4 text-indigo-400" />
                  <span>{audioModeLabel}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300 truncate max-w-xs">{activeTopic.topicTitle}</span>
                </div>
                <div className="flex items-center gap-3">
                  <audio controls autoPlay src={audioSrc} className="h-8 max-w-[280px]" />
                  <button
                    onClick={() => setAudioSrc(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Close audio player"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Canvas + Optional Animated Right Annotations Drawer */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
            <div className={`mx-auto w-full ${activeReaderTab === "diagram_3d" ? "max-w-5xl" : widthClass}`}>
              <motion.div
                key={`${activeTopic.id}-${activeReaderTab}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className={`rounded-[20px] sm:rounded-[24px] border px-4 sm:px-10 py-5 sm:py-9 transition-colors duration-300 ${themeStyles.sheet}`}
              >
                {/* Clean Editorial Topic Header */}
                <div className={`pb-6 mb-7 border-b ${themeStyles.divider}`}>
                  <div className={`flex flex-wrap items-center gap-2 text-xs font-medium ${themeStyles.muted}`}>
                    <span>Chapter {activeTopic.chapterNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeTopic.chapterTitle}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{activeTopic.readingMinutes} min read</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeFont.label}</span>
                  </div>

                  <h1
                    className="text-2xl sm:text-[30px] font-semibold tracking-tight mt-2.5 leading-[1.35] text-balance"
                    style={{ fontFamily: activeFont.headingFontFamily }}
                  >
                    {activeTopic.topicTitle}
                  </h1>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleToggleComplete}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        isTopicCompleted
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20"
                          : "bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8] hover:brightness-110 text-white shadow-sm shadow-indigo-500/25"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isTopicCompleted ? "Completed" : "Mark Completed"}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleToggleBookmark}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        isTopicBookmarked
                          ? "bg-amber-50 border-amber-300 text-amber-800"
                          : themeStyles.actionGhost
                      }`}
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 ${isTopicBookmarked ? "fill-amber-500 text-amber-600" : ""}`}
                      />
                      {isTopicBookmarked ? "Bookmarked" : "Bookmark"}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => openNoteDialog("note", activeTopic.topicTitle, "indigo")}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${themeStyles.actionGhost}`}
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      Add Note
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() =>
                        openAiTutor({
                          mode: "chat",
                          prefill: `Help me deeply understand "${activeTopic.topicTitle}" from ${activeBook.title}.`,
                        })
                      }
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${themeStyles.actionGhost}`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Ask AI Tutor
                    </motion.button>
                  </div>
                </div>

                {/* TAB 1: ORIGINAL READING VIEW */}
                {activeReaderTab === "reading" && (
                  <div ref={articleRef} onMouseUp={handleTextSelection} className="relative">
                    {/* Floating Text Selection Annotation Toolbar */}
                    <AnimatePresence>
                      {selectionPopup && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          transition={{ duration: 0.14 }}
                          style={{ top: selectionPopup.top, left: selectionPopup.left }}
                          className="absolute -translate-x-1/2 z-30 flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-[#0B1120] text-white shadow-2xl border border-white/15"
                        >
                          <button
                            onClick={() => quickAnnotate("highlight", "amber")}
                            className="w-5 h-5 rounded-full bg-amber-400 hover:scale-110 transition-transform cursor-pointer"
                            title="Highlight Amber"
                          />
                          <button
                            onClick={() => quickAnnotate("highlight", "emerald")}
                            className="w-5 h-5 rounded-full bg-emerald-400 hover:scale-110 transition-transform cursor-pointer"
                            title="Highlight Green"
                          />
                          <button
                            onClick={() => quickAnnotate("highlight", "rose")}
                            className="w-5 h-5 rounded-full bg-rose-400 hover:scale-110 transition-transform cursor-pointer"
                            title="Highlight Pink"
                          />
                          <span className="w-px h-4 bg-white/15 mx-1" />
                          <button
                            onClick={() => quickAnnotate("underline", "sky")}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
                            title="Underline"
                          >
                            <Underline className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openNoteDialog("note", selectionPopup.text, "amber")}
                            className="px-2 py-1 rounded-lg hover:bg-white/10 text-xs font-medium whitespace-nowrap cursor-pointer"
                          >
                            Note
                          </button>
                          <button
                            onClick={() => openNoteDialog("keypoint", selectionPopup.text, "indigo")}
                            className="px-2 py-1 rounded-lg hover:bg-white/10 text-xs font-medium whitespace-nowrap cursor-pointer"
                          >
                            Key Point
                          </button>
                          <button
                            onClick={() => {
                              openAiTutor({
                                mode: "chat",
                                prefill: `Explain this excerpt from "${activeTopic.topicTitle}": "${selectionPopup.text}"`,
                              });
                              setSelectionPopup(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-xs font-semibold whitespace-nowrap cursor-pointer"
                          >
                            Ask AI
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <ReadAlong content={readAlongContent} topicId={activeTopic.id} language={activeBook.language} />
                    <div
                      ref={readAlongContent}
                      className="skyx-prose"
                      style={{
                        fontFamily: activeFont.cssFontFamily,
                        fontSize: `${comfort.fontSize}px`,
                        lineHeight: comfort.lineHeight,
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeTopic.contentMarkdown}
                      </ReactMarkdown>
                      {bookTopics.some(topic => topic.builderParentId === activeTopic.id) && (
                        <nav aria-label="Child sections">
                          <h3>In This Section</h3>
                          <ul>{bookTopics.filter(topic => topic.builderParentId === activeTopic.id).map(topic => (
                            <li key={topic.id}><button type="button" className="underline" onClick={() => openBookReader(topic.bookId, topic.id)}>
                              {topic.topicTitle}
                            </button></li>
                          ))}</ul>
                        </nav>
                      )}
                    </div>

                    <div className={`mt-8 pt-4 border-t text-xs ${themeStyles.divider} ${themeStyles.muted}`}>
                      Select any sentence above to highlight, underline, pin a key point, or ask Skyx AI Tutor.
                    </div>
                  </div>
                )}

                {/* TAB: 3D DIAGRAM */}
                {activeReaderTab === "diagram_3d" && (
                  <div className="space-y-4">
                    <ThreeDiagramLab
                      modelKey={(activeTopic.model3dKey || "human_heart") as Exclude<Model3DKey, "">}
                      embedded
                      onAskAiPart={(partName, modelTitle) =>
                        openAiTutor({
                          mode: "chat",
                          prefill: `Explain the role and exam-important details of "${partName}" in the ${modelTitle} 3D model.`,
                        })
                      }
                    />
                  </div>
                )}

                {/* TAB: INLINE TOPIC EXAM */}
                {activeReaderTab === "exam" && (
                  <div className="space-y-6">
                    <div
                      className={`rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4 ${themeStyles.card}`}
                    >
                      <div>
                        <h2 className="font-display text-base font-bold">Topic Quick Practice</h2>
                        <p className={`text-xs mt-0.5 ${themeStyles.muted}`}>
                          Test your mastery of this topic or launch a full timed mock exam with 10–100 questions.
                        </p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setLearnerRoute("exams")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8] hover:brightness-110 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Open Full Timed Exam Center
                      </motion.button>
                    </div>

                    {topicQuestions.length === 0 ? (
                      <div className={`rounded-2xl border p-8 text-center ${themeStyles.card}`}>
                        <p className="text-sm font-medium">No MCQs linked to this topic yet.</p>
                        <button
                          onClick={() => setLearnerRoute("exams")}
                          className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          Generate Fresh AI Questions in Exam Center
                        </button>
                      </div>
                    ) : (
                      <div className={`rounded-2xl border p-6 space-y-5 ${themeStyles.card}`}>
                        {topicQuestions.map((q, idx) => {
                          const chosen = quickQuizAnswers[q.id];
                          return (
                            <div
                              key={q.id}
                              className={`pb-5 border-b last:border-b-0 last:pb-0 space-y-3 ${themeStyles.divider}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold leading-relaxed">
                                  {idx + 1}. {q.stem}
                                </p>
                                <span className={`text-[11px] font-medium capitalize shrink-0 ${themeStyles.muted}`}>
                                  {q.difficulty}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.options.map((opt, oIdx) => {
                                  const isPicked = chosen === oIdx;
                                  const isCorrect = q.correctIndex === oIdx;
                                  let btnStyle = "border-current/15 hover:border-indigo-400";
                                  if (quickQuizSubmitted) {
                                    if (isCorrect) btnStyle = "border-emerald-500 bg-emerald-500/15 font-semibold";
                                    else if (isPicked && !isCorrect) btnStyle = "border-rose-500 bg-rose-500/15";
                                  } else if (isPicked) {
                                    btnStyle = "border-indigo-500 bg-indigo-500/10 font-semibold";
                                  }
                                  return (
                                    <button
                                      key={oIdx}
                                      disabled={quickQuizSubmitted}
                                      onClick={() =>
                                        setQuickQuizAnswers((prev) => ({ ...prev, [q.id]: oIdx }))
                                      }
                                      className={`text-left px-3.5 py-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${btnStyle}`}
                                    >
                                      <span className="font-mono font-bold mr-2">
                                        {String.fromCharCode(65 + oIdx)}.
                                      </span>
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                              {quickQuizSubmitted && (
                                <div className="p-3 rounded-xl bg-indigo-500/10 text-xs leading-relaxed">
                                  <span className="font-semibold">Explanation: </span>
                                  {q.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="pt-2 flex items-center justify-between">
                          <div className="text-xs font-medium">
                            {quickQuizSubmitted ? (
                              <span className="text-emerald-600 font-semibold font-mono tabular-nums">
                                Score:{" "}
                                {topicQuestions.filter((q) => quickQuizAnswers[q.id] === q.correctIndex).length} /{" "}
                                {topicQuestions.length}
                              </span>
                            ) : (
                              <span className={themeStyles.muted}>
                                Answered {Object.keys(quickQuizAnswers).length} of {topicQuestions.length}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {quickQuizSubmitted ? (
                              <button
                                onClick={() => {
                                  setQuickQuizAnswers({});
                                  setQuickQuizSubmitted(false);
                                }}
                                className="px-4 py-2 rounded-xl border border-current/20 text-xs font-semibold cursor-pointer"
                              >
                                Retry Quiz
                              </button>
                            ) : (
                              <button
                                onClick={() => setQuickQuizSubmitted(true)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                              >
                                Check Answers
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AI STUDY TABS (Summary, Ultra Short, Key Points, Memorize, Q&A, Custom Tabs) */}
                {activeReaderTab !== "reading" &&
                  activeReaderTab !== "diagram_3d" &&
                  activeReaderTab !== "exam" && (
                    <div className="space-y-6">
                      {activeTabContent ? (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className={themeStyles.muted}>
                              Prepared with{" "}
                              <span className="font-mono font-semibold">{activeTabContent.modelUsed}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleGenerateStudyTab(activeReaderTab)}
                                disabled={generatingTabKey === activeReaderTab}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium disabled:opacity-50 cursor-pointer ${themeStyles.actionGhost}`}
                              >
                                {generatingTabKey === activeReaderTab ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                )}
                                Regenerate
                              </button>
                              {isAdmin && activeTabContent.isUnsavedDraft && (
                                <button
                                  onClick={() =>
                                    saveTopicStudyTab({
                                      id: `tst-${activeTopic.id}-${activeReaderTab}`,
                                      bookId: activeBook.id,
                                      topicId: activeTopic.id,
                                      tabKey: activeReaderTab,
                                      contentMarkdown: activeTabContent.contentMarkdown,
                                      generatedByModel: activeTabContent.modelUsed,
                                      isPublished: true,
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Publish to All Learners
                                </button>
                              )}
                            </div>
                          </div>

                          <div
                            className="skyx-prose"
                            style={{
                              fontFamily: activeFont.cssFontFamily,
                              fontSize: `${comfort.fontSize}px`,
                              lineHeight: comfort.lineHeight,
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {activeTabContent.contentMarkdown}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className={`rounded-2xl border p-8 text-center space-y-3 ${themeStyles.card}`}>
                          <div className="w-11 h-11 mx-auto rounded-xl bg-indigo-500/12 text-indigo-500 flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <h3 className="font-display text-base font-bold">
                            Generate{" "}
                            {sortedTabTypes.find((t) => t.key === activeReaderTab)?.label || activeReaderTab}
                          </h3>
                          <p className={`text-xs max-w-md mx-auto leading-relaxed ${themeStyles.muted}`}>
                            This topic does not have a pre-published guide for this tab yet. Generate a structured,
                            high-readability study sheet instantly using Skyx Gemini AI.
                          </p>
                          <button
                            onClick={() => handleGenerateStudyTab(activeReaderTab)}
                            disabled={generatingTabKey === activeReaderTab}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8] hover:brightness-110 text-white text-xs font-semibold disabled:opacity-60 cursor-pointer"
                          >
                            {generatingTabKey === activeReaderTab ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating Study Guide...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate Instant Study Guide
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Personal Key Points section inside Key Points tab */}
                      {activeReaderTab === "key_points" && (
                        <div className={`rounded-2xl border p-5 space-y-4 ${themeStyles.card}`}>
                          <div>
                            <h3 className="font-display text-sm font-bold flex items-center gap-2">
                              <Pin className="w-4 h-4 text-indigo-500" />
                              My Personal Key Points ({personalKeyPoints.length})
                            </h3>
                            <p className={`text-xs mt-0.5 ${themeStyles.muted}`}>
                              Add your own memory bullets or exam traps for this topic. Synced to your Study Vault.
                            </p>
                          </div>

                          <form onSubmit={handleAddPersonalKeyPoint} className="space-y-2.5">
                            <input
                              type="text"
                              value={personalKpTitle}
                              onChange={(e) => setPersonalKpTitle(e.target.value)}
                              placeholder="Key point headline (e.g., SA Node fires 70–75 impulses/min)..."
                              className="w-full px-3.5 py-2 rounded-xl border border-current/15 bg-transparent text-xs focus:outline-none focus:border-indigo-500"
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={personalKpNote}
                                onChange={(e) => setPersonalKpNote(e.target.value)}
                                placeholder="Optional short note or Bangla cue..."
                                className="flex-1 px-3.5 py-2 rounded-xl border border-current/15 bg-transparent text-xs focus:outline-none focus:border-indigo-500"
                              />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Save Point
                              </button>
                            </div>
                          </form>

                          {personalKeyPoints.length > 0 && (
                            <div className="space-y-2 pt-2">
                              {personalKeyPoints.map((kp) => (
                                <div
                                  key={kp.id}
                                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-current/10"
                                >
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold">{kp.quote}</div>
                                    {kp.noteText && (
                                      <div className={`text-xs mt-0.5 ${themeStyles.muted}`}>{kp.noteText}</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => deleteAnnotation(kp.id)}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-500 cursor-pointer"
                                    aria-label="Delete key point"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                {/* Bottom Prev / Next Topic Navigation */}
                <div
                  className={`mt-10 pt-6 border-t flex flex-wrap items-center justify-between gap-3 ${themeStyles.divider}`}
                >
                  {prevTopic ? (
                    <motion.button
                      whileHover={{ x: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openBookReader(activeBook.id, prevTopic.id, "reading")}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors max-w-[46%] cursor-pointer ${themeStyles.actionGhost}`}
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                      <span className="truncate">{prevTopic.topicTitle}</span>
                    </motion.button>
                  ) : (
                    <div />
                  )}

                  {nextTopic ? (
                    <motion.button
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openBookReader(activeBook.id, nextTopic.id, "reading")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8] hover:brightness-110 text-white text-xs font-semibold shadow-sm shadow-indigo-500/25 transition-all max-w-[46%] cursor-pointer"
                    >
                      <span className="truncate">{nextTopic.topicTitle}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </motion.button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setLearnerRoute("exams")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      Take Book Mock Exam
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Animated Right Drawer: Topic Highlights & Notes */}
          <AnimatePresence>
            {vaultDrawerOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.24, ease: EASE_OUT }}
                className="shrink-0 border-l border-slate-200/80 bg-white text-slate-800 overflow-hidden hidden md:block"
              >
                <div className="w-80 h-full overflow-y-auto p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display text-xs font-bold text-slate-900">
                        Topic Notes & Highlights
                      </h3>
                      <p className="text-[11px] text-slate-500">{topicAnnotations.length} saved items</p>
                    </div>
                    <button
                      onClick={() => setVaultDrawerOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {topicAnnotations.length === 0 ? (
                    <div className="text-xs text-slate-500 py-8 text-center leading-relaxed">
                      Select any text in the reading canvas to create highlights, underlines, or study notes.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topicAnnotations.map((ann) => (
                        <div
                          key={ann.id}
                          className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                              {ann.type}
                            </span>
                            <button
                              onClick={() => deleteAnnotation(ann.id)}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer"
                              aria-label="Delete annotation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs font-medium text-slate-800 leading-relaxed">
                            &ldquo;{ann.quote}&rdquo;
                          </p>
                          {ann.noteText && (
                            <p className="text-xs text-slate-500 leading-relaxed pt-1.5 border-t border-slate-200/70">
                              {ann.noteText}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTopic.model3dKey && (
                    <button
                      onClick={() => setActiveReaderTab("diagram_3d")}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#0B1120] text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Box className="w-3.5 h-3.5 text-indigo-300" />
                      Inspect 3D Model
                    </button>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Animated Add Note / Key Point Modal */}
      <AnimatePresence>
        {noteModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-4"
            onClick={() => setNoteModal((prev) => ({ ...prev, open: false }))}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 text-slate-900"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-bold capitalize">Add {noteModal.type}</h3>
                <button
                  onClick={() => setNoteModal((prev) => ({ ...prev, open: false }))}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {noteModal.quote && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-slate-700 mb-3 line-clamp-3">
                  &ldquo;{noteModal.quote}&rdquo;
                </div>
              )}
              <form onSubmit={submitNoteDialog} className="space-y-3">
                <textarea
                  rows={4}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Write your study note, Bangla reminder, or exam cue..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNoteModal((prev) => ({ ...prev, open: false }))}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8] hover:brightness-110 text-white text-xs font-semibold cursor-pointer"
                  >
                    Save to Vault
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
