"use client";

import { importBuilderOutline } from "@/lib/actions/book-builder-actions";
import { getSessionToken as getBuilderSessionToken } from "@/lib/auth/session-storage";
import BookMarketplace from "@/components/store/BookMarketplace";
import ManualBookBuilder from "./ManualBookBuilder";
import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Box,
  Check,
  Cpu,
  FileText,
  HelpCircle,
  Layers,
  Library,
  Loader2,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";
import AdminExtendedSections from "@/components/admin/AdminExtendedSections";
import SettingsHubView from "@/components/settings/SettingsHubView";
import ThreeDiagramLab from "@/components/lab/ThreeDiagramLab";
import { MODEL_3D_CATALOG } from "@/lib/three-models";
import type {
  AccessTier,
  BookLanguage,
  DifficultyLevel,
  Model3DKey,
  Question,
  SubscriptionPlan,
} from "@/lib/types";

const BookManagerWorkspace = dynamic(
  () => import("@/components/book-manager/BookManagerWorkspace"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl bg-white border border-slate-200 p-10 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
        <span>Loading Book Manager Engine...</span>
      </div>
    ),
  }
);

interface SplitPreviewItem {
  chapterNumber: number;
  chapterTitle: string;
  sectionTitle: string;
  topicTitle: string;
  readingMinutes: number;
  contentMarkdown: string;
}

export default function AdminWorkspace() {
  const {
    userProfile,
    adminRoute,
    setAdminRoute,
    curriculums,
    books,
    topics,
    studyTabTypes,
    topicStudyTabs,
    questions,
    subscriptionPlans,
    aiModelConfigs,
    allUsers,
    isCloudSynced,
    saveBook,
    deleteBook,
    saveTopicsBatch,
    saveSingleTopic,
    deleteTopic,
    saveStudyTabType,
    saveTopicStudyTab,
    saveQuestionsBatch,
    deleteQuestion,
    updateAiModelConfig,
    updateSubscriptionPlan,
    getModelForTask,
    getSecretSlotForTask,
    openBookReader,
    notify,
  } = useApp();

  // --- BOOKS & AUTO-SPLITTER STATE ---
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookSubtitle, setNewBookSubtitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("Skyx Editorial Board");
  const [newBookSubject, setNewBookSubject] = useState("Biology");
  const [newBookCurriculum, setNewBookCurriculum] = useState(curriculums[0]?.id || "");
  const [newBookLang, setNewBookLang] = useState<BookLanguage>("bilingual");
  const [newBookTier, setNewBookTier] = useState<AccessTier>("free");
  const [newBookDesc, setNewBookDesc] = useState("");

  const [splitterBookId, setSplitterBookId] = useState(books[0]?.id || "");
  const [rawBookText, setRawBookText] = useState("");
  const [splitting, setSplitting] = useState(false);
  const [splitPreview, setSplitPreview] = useState<SplitPreviewItem[]>([]);

  // --- AI CONTENT STUDIO STATE ---
  const [studioBookId, setStudioBookId] = useState(books[0]?.id || "");
  const studioBookTopics = useMemo(
    () => topics.filter((t) => t.bookId === studioBookId).sort((a, b) => a.orderIndex - b.orderIndex),
    [topics, studioBookId]
  );
  const [studioTopicId, setStudioTopicId] = useState(topics[0]?.id || "");
  const [studioTabKey, setStudioTabKey] = useState("summary");
  const [studioDraft, setStudioDraft] = useState("");
  const [studioModelUsed, setStudioModelUsed] = useState("gemini-4-hydrogen");
  const [studioGenerating, setStudioGenerating] = useState(false);

  // Custom Study Tab Type Creator
  const [newTabLabel, setNewTabLabel] = useState("");
  const [newTabPrompt, setNewTabPrompt] = useState("");

  // --- QUESTION BANK STATE ---
  const [qFilterBookId, setQFilterBookId] = useState("all");
  const [qGenBookId, setQGenBookId] = useState(books[0]?.id || "");
  const [qGenTopicId, setQGenTopicId] = useState(topics[0]?.id || "");
  const [qGenCount, setQGenCount] = useState(5);
  const [qGenDifficulty, setQGenDifficulty] = useState<"mixed" | DifficultyLevel>("mixed");
  const [qGenerating, setQGenerating] = useState(false);
  const [qDrafts, setQDrafts] = useState<
    {
      stem: string;
      options: [string, string, string, string];
      correctIndex: number;
      explanation: string;
      difficulty: DifficultyLevel;
    }[]
  >([]);

  // Manual MCQ Form
  const [manualStem, setManualStem] = useState("");
  const [manualOptA, setManualOptA] = useState("");
  const [manualOptB, setManualOptB] = useState("");
  const [manualOptC, setManualOptC] = useState("");
  const [manualOptD, setManualOptD] = useState("");
  const [manualCorrect, setManualCorrect] = useState(0);
  const [manualExpl, setManualExpl] = useState("");

  // --- 3D LAB MANAGER STATE ---
  const [preview3dKey, setPreview3dKey] = useState<Exclude<Model3DKey, "">>("human_heart");

  // --- PLAN EDITOR STATE ---
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const selectedStudioTopic = useMemo(
    () => studioBookTopics.find((t) => t.id === studioTopicId) || studioBookTopics[0],
    [studioBookTopics, studioTopicId]
  );

  const selectedStudioBook = useMemo(
    () => books.find((b) => b.id === studioBookId) || books[0],
    [books, studioBookId]
  );

  // Handlers
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim()) return;
    const palette = ["#4F46E5", "#0EA5E9", "#10B981", "#7C3AED", "#D97706", "#E11D48"];
    const saved = await saveBook({
      id: `book-${Date.now()}`,
      curriculumId: newBookCurriculum,
      title: newBookTitle.trim(),
      subtitle: newBookSubtitle.trim() || `${newBookSubject} Digital Edition`,
      author: newBookAuthor.trim() || "Skyx Academy Editorial",
      subject: newBookSubject.trim() || "General",
      language: newBookLang,
      accessTier: newBookTier,
      coverColor: palette[books.length % palette.length],
      description: newBookDesc.trim() || `Structured digital textbook for ${newBookTitle.trim()}.`,
      totalTopics: 0,
      isPublished: true,
    });
    if (!saved) return;
    setNewBookTitle("");
    setNewBookSubtitle("");
    setNewBookDesc("");
  };

  const handleUploadTextFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawBookText(text.slice(0, 35000));
    notify(`Loaded "${file.name}" into AI Book Splitter.`, "info");
  };

  const handleRunBookSplitter = async () => {
    const book = books.find((b) => b.id === splitterBookId) || books[0];
    if (!book || rawBookText.trim().length < 40) {
      notify("Paste at least 40 characters of textbook text to auto-split.", "error");
      return;
    }
    setSplitting(true);
    try {
      const res = await fetch("/api/ai/book-split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: rawBookText,
          bookTitle: book.title,
          subject: book.subject,
          model: getModelForTask("cfg-splitter"),
          secretSlot: getSecretSlotForTask("cfg-splitter"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Book auto-split failed.");
      setSplitPreview(data.topics || []);
      notify(`Detected ${(data.topics || []).length} structured topics.`, "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Auto-splitter failed.", "error");
    } finally {
      setSplitting(false);
    }
  };

  const handleCommitSplitTopics = async () => {
    const book = books.find((b) => b.id === splitterBookId) || books[0];
    if (!book || splitPreview.length === 0) return;
    const existingCount = topics.filter((t) => t.bookId === book.id).length;

    const saved = await saveTopicsBatch(
      book.id,
      splitPreview.map((item, idx) => ({
        id: `topic-${book.id}-${Date.now()}-${idx}`,
        bookId: book.id,
        chapterNumber: item.chapterNumber || 1,
        chapterTitle: item.chapterTitle || "Chapter 1",
        sectionTitle: item.sectionTitle || "Section 1",
        topicTitle: item.topicTitle || `Topic ${idx + 1}`,
        orderIndex: existingCount + idx + 1,
        contentMarkdown: item.contentMarkdown,
        readingMinutes: Math.max(2, item.readingMinutes || 5),
        model3dKey: "",
        isPublished: true,
      }))
    );
    if (saved) {
      setSplitPreview([]);
      setRawBookText("");
    }
  };

  const [savingSplitterDraft, setSavingSplitterDraft] = useState(false);

  async function saveSplitterDraft() {
    const book = books.find(item => item.id === splitterBookId) || books[0];
    if (!book || !splitPreview.length || savingSplitterDraft) return;
    setSavingSplitterDraft(true);
    try {
      const outline = new Map<string, {key:string; parentKey:string | null; title:string; markdown:string}>();
      splitPreview.forEach((item, index) => {
        const chapter = JSON.stringify([item.chapterNumber, item.chapterTitle]);
        const section = JSON.stringify([chapter, item.sectionTitle]);
        if (!outline.has(chapter)) outline.set(chapter, {key:chapter,parentKey:null,title:item.chapterTitle || "Chapter",markdown:""});
        if (!outline.has(section)) outline.set(section, {key:section,parentKey:chapter,title:item.sectionTitle || "Section",markdown:""});
        const key = "topic-" + index;
        outline.set(key,{key,parentKey:section,title:item.topicTitle || "Topic",markdown:item.contentMarkdown});
      });
      await importBuilderOutline(getBuilderSessionToken(), {
        title: book.title, subtitle: book.subtitle || "", author: book.author,
        subject: book.subject, description: book.description, language: book.language,
        accessTier: "free",
      }, [...outline.values()]);
      notify("Builder draft created. Refresh Saved Book Drafts to open it.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not create the Builder draft.", "error");
    } finally {
      setSavingSplitterDraft(false);
    }
  }

  const handleStudioGenerate = async () => {
    if (!selectedStudioBook || !selectedStudioTopic) return;
    const tabMeta = studyTabTypes.find((t) => t.key === studioTabKey);
    setStudioGenerating(true);
    try {
      const taskId = studioTabKey === "ultra_short" ? "cfg-ultrashort" : "cfg-summary";
      const res = await fetch("/api/ai/study-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: selectedStudioBook.title,
          topicTitle: selectedStudioTopic.topicTitle,
          contentMarkdown: selectedStudioTopic.contentMarkdown,
          tabKey: studioTabKey,
          tabLabel: tabMeta?.label || studioTabKey,
          customPrompt: tabMeta?.promptTemplate,
          language: selectedStudioBook.language,
          model: getModelForTask(taskId),
          secretSlot: getSecretSlotForTask(taskId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI Studio generation failed.");
      setStudioDraft(data.contentMarkdown || "");
      setStudioModelUsed(data.modelUsed || "gemini-4-hydrogen");
      notify("Study content generated! Review and click Publish.", "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to generate content.", "error");
    } finally {
      setStudioGenerating(false);
    }
  };

  const handlePublishStudioContent = async () => {
    if (!selectedStudioBook || !selectedStudioTopic || !studioDraft.trim()) return;
    await saveTopicStudyTab({
      id: `tst-${selectedStudioTopic.id}-${studioTabKey}`,
      bookId: selectedStudioBook.id,
      topicId: selectedStudioTopic.id,
      tabKey: studioTabKey,
      contentMarkdown: studioDraft,
      generatedByModel: studioModelUsed,
      isPublished: true,
    });
  };

  const handleCreateCustomTabType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTabLabel.trim() || !newTabPrompt.trim()) return;
    const key = newTabLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const saved = await saveStudyTabType({
      id: `tab-${key}`,
      key,
      label: newTabLabel.trim(),
      promptTemplate: newTabPrompt.trim(),
      orderIndex: studyTabTypes.length + 1,
      isSystem: false,
      isPublished: true,
    });
    if (!saved) return;
    setNewTabLabel("");
    setNewTabPrompt("");
  };

  const handleGenerateBulkQuestions = async () => {
    const book = books.find((b) => b.id === qGenBookId) || books[0];
    const bookT = topics.filter((t) => t.bookId === book?.id);
    const topic = bookT.find((t) => t.id === qGenTopicId) || bookT[0];
    if (!book || !topic) {
      notify("Select a book and topic first.", "error");
      return;
    }
    setQGenerating(true);
    try {
      const excludeStems = questions.filter((q) => q.bookId === book.id).map((q) => q.stem);
      const res = await fetch("/api/ai/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: book.title,
          chapterTitle: topic.chapterTitle,
          topicTitle: topic.topicTitle,
          contentMarkdown: topic.contentMarkdown,
          count: qGenCount,
          difficulty: qGenDifficulty,
          excludeStems,
          model: getModelForTask("cfg-questions"),
          secretSlot: getSecretSlotForTask("cfg-questions"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk generation failed.");
      setQDrafts(data.questions || []);
      notify(`Generated ${(data.questions || []).length} unique MCQs for review.`, "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Question generation failed.", "error");
    } finally {
      setQGenerating(false);
    }
  };

  const handleSaveGeneratedQuestions = async () => {
    const book = books.find((b) => b.id === qGenBookId) || books[0];
    const bookT = topics.filter((t) => t.bookId === book?.id);
    const topic = bookT.find((t) => t.id === qGenTopicId) || bookT[0];
    if (!book || !topic || qDrafts.length === 0) return;

    const batch: Omit<Question, "createdAt">[] = qDrafts.map((q, idx) => ({
      id: `q-adm-${Date.now()}-${idx}`,
      bookId: book.id,
      topicId: topic.id,
      chapterTitle: topic.chapterTitle,
      stem: q.stem,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      difficulty: q.difficulty,
      isPublished: true,
    }));
    if (await saveQuestionsBatch(batch)) setQDrafts([]);
  };

  const handleSaveManualQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const book = books.find((b) => b.id === qGenBookId) || books[0];
    const bookT = topics.filter((t) => t.bookId === book?.id);
    const topic = bookT.find((t) => t.id === qGenTopicId) || bookT[0];
    if (!book || !topic || !manualStem.trim() || !manualOptA.trim() || !manualOptB.trim()) return;

    const saved = await saveQuestionsBatch([
      {
        id: `q-man-${Date.now()}`,
        bookId: book.id,
        topicId: topic.id,
        chapterTitle: topic.chapterTitle,
        stem: manualStem.trim(),
        options: [
          manualOptA.trim(),
          manualOptB.trim(),
          manualOptC.trim() || "None of the above",
          manualOptD.trim() || "All of the above",
        ],
        correctIndex: manualCorrect,
        explanation: manualExpl.trim() || "Verified by Skyx Academy editorial board.",
        difficulty: "medium",
        isPublished: true,
      },
    ]);
    if (!saved) return;
    setManualStem("");
    setManualOptA("");
    setManualOptB("");
    setManualOptC("");
    setManualOptD("");
    setManualExpl("");
  };

  // --- OVERVIEW ANALYTICS DATA ---
  const chartData = useMemo(() => {
    return books.map((b) => ({
      name: b.subject,
      Topics: topics.filter((t) => t.bookId === b.id).length,
      MCQs: questions.filter((q) => q.bookId === b.id).length,
      Tabs: topicStudyTabs.filter((t) => t.bookId === b.id).length,
    }));
  }, [books, topics, questions, topicStudyTabs]);

  if (
    adminRoute === "academic" ||
    adminRoute === "processing" ||
    adminRoute === "editor" ||
    adminRoute === "search-ops" ||
    adminRoute === "billing" ||
    adminRoute === "analytics" ||
    adminRoute === "operations"
  ) {
    return <AdminExtendedSections />;
  }

  // =========================================================================
  // ROUTE 1: ADMIN OVERVIEW (Executive Reference-Matched Layout)
  // =========================================================================
  if (adminRoute === "overview") {
    const totalAiCalls = aiModelConfigs.reduce((acc, c) => acc + c.usageCount, 0);
    const publishedBooks = books.filter((b) => b.isPublished).length;
    const catalogReadiness = Math.min(
      100,
      Math.round(
        ((publishedBooks + Math.min(topics.length, 20) + Math.min(questions.length, 20)) /
          Math.max(books.length + 40, 1)) *
          100
      )
    );
    const ringRadius = 50;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - (catalogReadiness / 100) * ringCircumference;
    const hour = new Date().getHours();
    const adminGreeting =
      hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const dateLine = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
      .format(new Date())
      .toUpperCase();

    const adminKpis = [
      {
        id: "adm-books",
        label: "Active books",
        value: String(books.length),
        trend: `${curriculums.length} tracks`,
        icon: Library,
        iconBg: "bg-indigo-50 text-indigo-600",
        stroke: "#7C3AED",
        points: [1, 2, 2, 3, 3.5, 4, books.length],
      },
      {
        id: "adm-topics",
        label: "Structured topics",
        value: String(topics.length),
        trend: `${topicStudyTabs.length} AI tabs`,
        icon: FileText,
        iconBg: "bg-emerald-50 text-emerald-600",
        stroke: "#10B981",
        points: [2, 4, 5, 7, 9, 11, Math.max(topics.length, 2)],
      },
      {
        id: "adm-mcqs",
        label: "Question bank MCQs",
        value: String(questions.length),
        trend: "Verified bank",
        icon: Zap,
        iconBg: "bg-sky-50 text-sky-600",
        stroke: "#0EA5E9",
        points: [5, 8, 12, 16, 20, 24, Math.max(questions.length, 6)],
      },
      {
        id: "adm-members",
        label: "Workspace members",
        value: String(allUsers.length),
        trend: `${totalAiCalls} AI calls`,
        icon: Users,
        iconBg: "bg-amber-50 text-amber-600",
        stroke: "#F59E0B",
        points: [1, 1, 2, 2, 2.5, 3, Math.max(allUsers.length, 1)],
      },
    ];

    return (
      <div className="space-y-6">
        {/* Executive Cosmic Hero Banner */}
        <section className="relative rounded-[20px] sm:rounded-[24px] bg-gradient-to-br from-[#0A0D22] via-[#131438] to-[#261754] p-4 sm:p-6 lg:p-9 text-white border border-white/[0.08] shadow-[0_16px_40px_-20px_rgba(15,23,42,0.7)] overflow-hidden">
          <div className="pointer-events-none absolute -top-24 right-10 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 w-96 h-64 rounded-full bg-cyan-500/12 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-8">
            <div className="space-y-3 sm:space-y-4 lg:space-y-5 max-w-2xl">
              {/* Mobile Compact Header + Mini Catalog Score Ring */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1 sm:space-y-2">
                  <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.1em] sm:tracking-[0.12em] text-indigo-200/80 uppercase truncate">
                    {dateLine}
                    <span className="hidden sm:inline"> · EXECUTIVE CONTROL CENTER</span>
                  </div>
                  <h1 className="font-display text-[22px] sm:text-3xl lg:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.12] [text-wrap:balance]">
                    {adminGreeting},{" "}
                    <span className="bg-gradient-to-r from-[#A5B4FC] via-[#C4B5FD] to-[#DDD6FE] bg-clip-text text-transparent">
                      {userProfile.displayName.split(" ")[0] || "Administrator"}.
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                    <strong className="text-white font-semibold tabular-nums">
                      {publishedBooks} published books
                    </strong>{" "}
                    &amp;{" "}
                    <strong className="text-white font-semibold tabular-nums">
                      {questions.length} verified MCQs
                    </strong>{" "}
                    <span className="hidden sm:inline">are live across your digital learning workspace.</span>
                    <span className="sm:hidden">live now.</span>
                  </p>
                </div>

                {/* Compact Mobile Mini Ring (< lg) */}
                <div className="lg:hidden relative w-16 h-16 shrink-0 rounded-full bg-white/[0.05] ring-1 ring-white/[0.1] flex items-center justify-center">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r={ringRadius}
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="10"
                    />
                    <motion.circle
                      cx="60"
                      cy="60"
                      r={ringRadius}
                      fill="none"
                      stroke="url(#adminRingGradientMobile)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      initial={{ strokeDashoffset: ringCircumference }}
                      animate={{ strokeDashoffset: ringOffset }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <defs>
                      <linearGradient id="adminRingGradientMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#818CF8" />
                        <stop offset="100%" stopColor="#38BDF8" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-sm font-extrabold tabular-nums text-white leading-none">
                      {catalogReadiness}%
                    </span>
                    <span className="text-[7.5px] font-semibold tracking-wider uppercase text-slate-400 mt-0.5">
                      Score
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 pt-0.5">
                <motion.button
                  type="button"
                  whileHover={{ y: -1.5 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAdminRoute("books")}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#5B52F5] via-[#6D55F7] to-[#7C5CF8] hover:brightness-105 text-white text-xs sm:text-sm font-semibold shadow-[0_10px_28px_-6px_rgba(99,102,241,0.65)] transition-all whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>New book</span>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ y: -1.5 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAdminRoute("ai-studio")}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs sm:text-sm font-medium border border-white/[0.14] backdrop-blur-md transition-all whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-200" />
                  <span>AI Studio</span>
                </motion.button>
              </div>

              <div className="pt-2.5 sm:pt-4 border-t border-white/[0.08] sm:border-t-0 grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-3 sm:gap-9">
                <div>
                  <div className="font-display text-base sm:text-xl font-bold tabular-nums text-white">
                    {books.length}
                  </div>
                  <div className="text-[9.5px] sm:text-[10.5px] font-semibold tracking-wider uppercase text-slate-400 mt-0.5">
                    Active Books
                  </div>
                </div>
                <div>
                  <div className="font-display text-base sm:text-xl font-bold tabular-nums text-white">
                    {topics.length}
                  </div>
                  <div className="text-[9.5px] sm:text-[10.5px] font-semibold tracking-wider uppercase text-slate-400 mt-0.5">
                    Topics Live
                  </div>
                </div>
                <div>
                  <div className="font-display text-base sm:text-xl font-bold tabular-nums text-white">
                    {allUsers.length}
                  </div>
                  <div className="text-[9.5px] sm:text-[10.5px] font-semibold tracking-wider uppercase text-slate-400 mt-0.5">
                    Members
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Concentric Readiness Ring */}
            <div className="hidden lg:flex flex-col items-center justify-center shrink-0 lg:pr-3">
              <div className="relative w-36 h-36 rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] flex items-center justify-center shadow-[0_0_40px_-8px_rgba(99,102,241,0.4)]">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r={ringRadius}
                    fill="none"
                    stroke="url(#adminRingGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    initial={{ strokeDashoffset: ringCircumference }}
                    animate={{ strokeDashoffset: ringOffset }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <defs>
                    <linearGradient id="adminRingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#818CF8" />
                      <stop offset="100%" stopColor="#38BDF8" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-3xl font-extrabold tabular-nums text-white">
                    {catalogReadiness}%
                  </span>
                  <span className="text-[9.5px] font-semibold tracking-[0.12em] uppercase text-slate-400 mt-0.5">
                    Catalog Score
                  </span>
                </div>
              </div>
              <div className="mt-3.5 text-center">
                <div className="text-xs font-semibold text-white tabular-nums">
                  {publishedBooks} of {books.length} published
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {isCloudSynced ? "Cloud sync connected" : "Local preview"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Crisp KPI Sparkline Cards — Always 2 Per Row on Mobile */}
        <div className="skyx-grid-kpi">
          {adminKpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            const max = Math.max(...kpi.points, 1);
            const min = Math.min(...kpi.points, 0);
            const span = Math.max(max - min, 1);
            const coords = kpi.points.map((v, i) => ({
              x: (i / (kpi.points.length - 1)) * 100,
              y: 26 - ((v - min) / span) * 20,
            }));
            const linePath = coords
              .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(" ");
            const areaPath = `${linePath} L100,30 L0,30 Z`;

            return (
              <motion.div
                key={kpi.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -2 }}
                className="rounded-[18px] sm:rounded-[20px] bg-white border border-slate-200/75 p-3.5 sm:p-5 shadow-[0_6px_22px_-12px_rgba(15,23,42,0.1)] hover:shadow-[0_14px_30px_-14px_rgba(79,70,229,0.18)] transition-shadow"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
                    <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-[10.5px] sm:text-xs font-semibold text-emerald-600 tabular-nums truncate">
                    <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="truncate">{kpi.trend}</span>
                  </span>
                </div>
                <div className="font-display text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 mt-3 sm:mt-4">
                  {kpi.value}
                </div>
                <div className="text-[11.5px] sm:text-[13px] font-medium text-slate-500 mt-0.5 truncate">
                  {kpi.label}
                </div>
                <svg
                  viewBox="0 0 100 30"
                  className="w-full h-6 sm:h-8 mt-2.5 sm:mt-4 overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id={kpi.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={kpi.stroke} stopOpacity="0.26" />
                      <stop offset="100%" stopColor={kpi.stroke} stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill={`url(#${kpi.id})`} />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={kpi.stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            );
          })}
        </div>

        {/* Content Coverage Chart + Quick Jump Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          <div className="lg:col-span-8 rounded-[20px] sm:rounded-[22px] bg-white border border-slate-200/75 p-4 sm:p-6 shadow-[0_6px_22px_-12px_rgba(15,23,42,0.08)]">
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
              Library coverage by subject
            </h2>
            <p className="text-[11.5px] sm:text-xs text-slate-500 mb-4 sm:mb-5 mt-0.5">
              Topics, verified MCQs, and published AI study tabs per subject
            </p>
            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 10px 25px -8px rgba(15,23,42,0.12)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="Topics" fill="#5B52F5" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="MCQs" fill="#0EA5E9" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Tabs" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-[20px] sm:rounded-[22px] bg-white border border-slate-200/75 p-4 sm:p-6 shadow-[0_6px_22px_-12px_rgba(15,23,42,0.08)] space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">Quick workflows</h2>
                <p className="text-[11.5px] sm:text-xs text-slate-500 mt-0.5">Jump directly to editorial tools</p>
              </div>
              <button
                type="button"
                onClick={() => setAdminRoute("books")}
                className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Add new book"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3">
              {[
                {
                  route: "books" as const,
                  title: "AI Book Splitter",
                  desc: "PDF/text into Chapters & Topics",
                },
                {
                  route: "ai-studio" as const,
                  title: "AI Tab Studio",
                  desc: "Summary, Memorize & Q&A tabs",
                },
                {
                  route: "questions" as const,
                  title: "Bulk MCQ Bank",
                  desc: "Auto-author unique topic MCQs",
                },
                {
                  route: "settings" as const,
                  title: "Settings & AI Models",
                  desc: "Users, preferences & tool models",
                },
              ].map((item) => (
                <motion.button
                  key={item.route}
                  type="button"
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setAdminRoute(item.route)}
                  className="w-full text-left p-3 sm:p-3.5 rounded-2xl border border-slate-200/75 hover:border-indigo-300/80 hover:bg-indigo-50/30 transition-all group flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-[12.5px] sm:text-[13px] font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                      {item.title}
                    </div>
                    <div className="text-[10.5px] sm:text-[11.5px] text-slate-500 mt-0.5 line-clamp-2 lg:line-clamp-1">
                      {item.desc}
                    </div>
                  </div>
                  <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ROUTE 2: BOOKS & AI BOOK AUTO-SPLITTER
  // =========================================================================
  if (adminRoute === "books") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Books & AI Chapter Auto-Splitter</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create digital books and automatically structure raw textbook chapters, sections, and topics using Gemini AI.
          </p>
        </div>

        <ManualBookBuilder />
        <BookMarketplace manage />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add New Book Form */}
          <form
            onSubmit={handleCreateBook}
            className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3.5 h-fit"
          >
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Add New Digital Book
            </h2>

            <input
              type="text"
              required
              value={newBookTitle}
              onChange={(e) => setNewBookTitle(e.target.value)}
              placeholder="Book Title (e.g., Organic Chemistry Master Guide)"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              value={newBookSubtitle}
              onChange={(e) => setNewBookSubtitle(e.target.value)}
              placeholder="Subtitle (English or Bangla)"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                value={newBookAuthor}
                onChange={(e) => setNewBookAuthor(e.target.value)}
                placeholder="Author"
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                value={newBookSubject}
                onChange={(e) => setNewBookSubject(e.target.value)}
                placeholder="Subject (Biology, Physics...)"
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={newBookCurriculum}
                onChange={(e) => setNewBookCurriculum(e.target.value)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
              >
                {curriculums.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={newBookLang}
                onChange={(e) => setNewBookLang(e.target.value as BookLanguage)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
              >
                <option value="bilingual">Bilingual</option>
                <option value="en">English</option>
                <option value="bn">Bangla</option>
              </select>
              <select
                value={newBookTier}
                onChange={(e) => setNewBookTier(e.target.value as AccessTier)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="elite">Elite</option>
              </select>
            </div>

            <textarea
              rows={2}
              value={newBookDesc}
              onChange={(e) => setNewBookDesc(e.target.value)}
              placeholder="Short book description..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Create Book in Catalog
            </button>
          </form>

          {/* AI Book Auto-Splitter */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-violet-600" />
                AI Book Auto-Splitter (Raw Text / File → Chapters & Topics)
              </h2>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:border-indigo-300 text-xs font-semibold text-slate-700 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Upload .txt / .md
                <input type="file" accept=".txt,.md" onChange={handleUploadTextFile} className="hidden" />
              </label>
            </div>

            <select
              value={splitterBookId}
              onChange={(e) => setSplitterBookId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  Target Book: {b.title}
                </option>
              ))}
            </select>

            <textarea
              rows={6}
              value={rawBookText}
              onChange={(e) => setRawBookText(e.target.value)}
              placeholder="Paste extracted PDF book text, lecture notes, or chapters (Bangla or English). Gemini will automatically detect Chapter -> Section -> Topic hierarchy and format readable Markdown..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                {rawBookText.length} characters ready
              </span>
              <button
                type="button"
                onClick={handleRunBookSplitter}
                disabled={splitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold disabled:opacity-60"
              >
                {splitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Structuring Chapters...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Split with Gemini AI
                  </>
                )}
              </button>
            </div>

            {splitPreview.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700">
                    Preview: {splitPreview.length} Structured Topics Ready
                  </span>
                  <button
                    onClick={handleCommitSplitTopics}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save All to Library
                  </button>
                  <button type="button" onClick={saveSplitterDraft} disabled={savingSplitterDraft}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
                    Create Builder Draft
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {splitPreview.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="font-semibold text-indigo-700">
                        Ch. {item.chapterNumber}: {item.chapterTitle} · {item.sectionTitle}
                      </div>
                      <div className="font-bold text-slate-900 mt-0.5">{item.topicTitle}</div>
                      <div className="text-slate-500 line-clamp-2 mt-1">{item.contentMarkdown}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Existing Books Catalog Table */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">Digital Library Catalog ({books.length} Books)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pr-4">Book</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Tier</th>
                  <th className="py-2.5 px-3">Topics</th>
                  <th className="py-2.5 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map((b) => {
                  const count = topics.filter((t) => t.bookId === b.id).length;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-4">
                        <div className="font-bold text-slate-900">{b.title}</div>
                        <div className="text-[11px] text-slate-500">{b.author}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{b.subject}</td>
                      <td className="py-3 px-3 uppercase font-mono font-semibold text-indigo-700">{b.accessTier}</td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-700">{count}</td>
                      <td className="py-3 pl-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openBookReader(b.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => deleteBook(b.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 align-middle"
                          aria-label="Delete book"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ROUTE 3: AI CONTENT STUDIO & CUSTOM TAB BUILDER
  // =========================================================================
  if (adminRoute === "ai-studio") {
    const existingStored = selectedStudioTopic
      ? topicStudyTabs.find(
          (t) => t.topicId === selectedStudioTopic.id && t.tabKey === studioTabKey
        )
      : null;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Study Content Studio</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pre-generate Summary, Ultra Short, Key Points, Memorize Tricks, Q&A, or invent brand-new custom tabs for the Learner Reader.
          </p>
        </div>

        {/* Selector Bar */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Book</label>
              <select
                value={studioBookId}
                onChange={(e) => {
                  setStudioBookId(e.target.value);
                  const first = topics.find((t) => t.bookId === e.target.value);
                  if (first) setStudioTopicId(first.id);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Topic</label>
              <select
                value={selectedStudioTopic?.id || ""}
                onChange={(e) => setStudioTopicId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
              >
                {studioBookTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    Ch.{t.chapterNumber} — {t.topicTitle}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Study Tab</label>
              <select
                value={studioTabKey}
                onChange={(e) => setStudioTabKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
              >
                {studyTabTypes
                  .filter((t) => !["reading", "diagram_3d", "exam"].includes(t.key))
                  .map((t) => (
                    <option key={t.id} value={t.key}>
                      {t.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {existingStored ? (
                <button
                  type="button"
                  onClick={() => setStudioDraft(existingStored.contentMarkdown)}
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  Load existing published content
                </button>
              ) : (
                <span>No published guide for this tab yet.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStudioGenerate}
                disabled={studioGenerating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-60"
              >
                {studioGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate with Gemini AI
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePublishStudioContent}
                disabled={!studioDraft.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" />
                Publish to Learners
              </button>
            </div>
          </div>

          {/* Split Markdown Editor + Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <textarea
              rows={12}
              value={studioDraft}
              onChange={(e) => setStudioDraft(e.target.value)}
              placeholder="Generated Markdown study guide will appear here. You can edit any line before publishing to all learners..."
              className="w-full p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
            />
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 overflow-y-auto max-h-[300px]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Learner Reader Preview
              </div>
              {studioDraft ? (
                <div className="skyx-prose text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{studioDraft}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-10 text-center">
                  Click &ldquo;Generate with Gemini AI&rdquo; to preview formatted study content.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Custom Study Tab Builder */}
        <form
          onSubmit={handleCreateCustomTabType}
          className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3"
        >
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Create New Custom Study Tab Type (Extends Learner Reader Dynamically)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <input
              type="text"
              required
              value={newTabLabel}
              onChange={(e) => setNewTabLabel(e.target.value)}
              placeholder="Tab Label (e.g., Clinical Pearls, Formula Sheet, Viva Traps)"
              className="md:col-span-4 px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              required
              value={newTabPrompt}
              onChange={(e) => setNewTabPrompt(e.target.value)}
              placeholder="AI Prompt Template for this tab..."
              className="md:col-span-6 px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <button
              type="submit"
              className="md:col-span-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Add Tab Type
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // ROUTE 4: QUESTION BANK & AI BULK GENERATOR
  // =========================================================================
  if (adminRoute === "questions") {
    const filteredQuestions =
      qFilterBookId === "all"
        ? questions
        : questions.filter((q) => q.bookId === qFilterBookId);
    const qTopicsForBook = topics.filter((t) => t.bookId === qGenBookId);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Question Bank & AI Authoring</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bulk-generate unique exam MCQs with automatic duplicate avoidance or add curated questions manually.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* AI Bulk Generator */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              AI Bulk Question Generator (Zero Duplicates)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={qGenBookId}
                onChange={(e) => {
                  setQGenBookId(e.target.value);
                  const first = topics.find((t) => t.bookId === e.target.value);
                  if (first) setQGenTopicId(first.id);
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>

              <select
                value={qGenTopicId}
                onChange={(e) => setQGenTopicId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
              >
                {qTopicsForBook.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.topicTitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5">
                  <span className="text-slate-500">Count:</span>
                  <select
                    value={qGenCount}
                    onChange={(e) => setQGenCount(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg border border-slate-200 font-mono font-semibold"
                  >
                    {[3, 5, 10, 15].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-1.5">
                  <span className="text-slate-500">Difficulty:</span>
                  <select
                    value={qGenDifficulty}
                    onChange={(e) => setQGenDifficulty(e.target.value as "mixed" | DifficultyLevel)}
                    className="px-2 py-1 rounded-lg border border-slate-200 font-semibold capitalize"
                  >
                    <option value="mixed">Mixed</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={handleGenerateBulkQuestions}
                disabled={qGenerating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-60"
              >
                {qGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate Questions
              </button>
            </div>

            {qDrafts.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700">
                    {qDrafts.length} Fresh MCQs Ready
                  </span>
                  <button
                    onClick={handleSaveGeneratedQuestions}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Publish to Question Bank
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {qDrafts.map((q, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="font-semibold text-slate-900">
                        {idx + 1}. {q.stem}
                      </div>
                      <div className="text-emerald-700 font-medium">
                        Answer: {String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Manual MCQ Entry */}
          <form
            onSubmit={handleSaveManualQuestion}
            className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-2.5"
          >
            <h2 className="text-sm font-bold text-slate-900">Add Curated MCQ Manually</h2>
            <input
              type="text"
              required
              value={manualStem}
              onChange={(e) => setManualStem(e.target.value)}
              placeholder="Question stem..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={manualOptA}
                onChange={(e) => setManualOptA(e.target.value)}
                placeholder="Option A"
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
              <input
                type="text"
                required
                value={manualOptB}
                onChange={(e) => setManualOptB(e.target.value)}
                placeholder="Option B"
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
              <input
                type="text"
                value={manualOptC}
                onChange={(e) => setManualOptC(e.target.value)}
                placeholder="Option C"
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
              <input
                type="text"
                value={manualOptD}
                onChange={(e) => setManualOptD(e.target.value)}
                placeholder="Option D"
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Correct Option:</span>
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setManualCorrect(i)}
                  className={`w-7 h-7 rounded-lg font-mono font-bold border ${
                    manualCorrect === i
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={manualExpl}
              onChange={(e) => setManualExpl(e.target.value)}
              placeholder="Answer explanation..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Save Question
            </button>
          </form>
        </div>

        {/* Question List */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              Verified Question Bank ({filteredQuestions.length})
            </h2>
            <select
              value={qFilterBookId}
              onChange={(e) => setQFilterBookId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
            >
              <option value="all">All Books</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredQuestions.slice(0, 25).map((q) => (
              <div key={q.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-900">{q.stem}</div>
                  <div className="text-[11px] text-slate-500">
                    {q.chapterTitle} · Correct:{" "}
                    <span className="text-emerald-700 font-semibold">{q.options[q.correctIndex]}</span> ·{" "}
                    <span className="capitalize">{q.difficulty}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                  aria-label="Delete question"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ROUTE 5: 3D DIAGRAM MANAGER
  // =========================================================================
  if (adminRoute === "lab-manager") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">3D Scientific Diagram Manager</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Preview interactive Three.js PBR models and link them directly to any book topic&rsquo;s 3D Diagram tab.
          </p>
        </div>

        <ThreeDiagramLab
          modelKey={preview3dKey}
          onModelChange={setPreview3dKey}
          embedded
        />

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Box className="w-4 h-4 text-indigo-600" />
            Topic-to-3D Model Bindings
          </h2>
          <div className="divide-y divide-slate-100 text-xs">
            {topics.map((topic) => {
              const book = books.find((b) => b.id === topic.bookId);
              return (
                <div key={topic.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{topic.topicTitle}</div>
                    <div className="text-[11px] text-slate-500">
                      {book?.title} · Ch. {topic.chapterNumber}
                    </div>
                  </div>
                  <select
                    value={topic.model3dKey || ""}
                    onChange={(e) =>
                      saveSingleTopic({
                        ...topic,
                        model3dKey: e.target.value as Model3DKey,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
                  >
                    <option value="">No 3D Model</option>
                    {MODEL_3D_CATALOG.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ROUTE 6: LEARNERS & SUBSCRIPTION PLANS
  // =========================================================================
  if (adminRoute === "learners") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Students & Subscription Plans</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor learner accounts and configure plan pricing, daily AI quotas, and feature entitlements.
          </p>
        </div>

        {/* Editable Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscriptionPlans.map((plan) => {
            const isEditing = editingPlan?.id === plan.id;
            return (
              <div key={plan.id} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
                {isEditing && editingPlan ? (
                  <div className="space-y-2.5 text-xs">
                    <input
                      type="text"
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-bold"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[11px] text-slate-500">Monthly ({editingPlan.currency})</span>
                        <input
                          type="number"
                          value={editingPlan.priceMonthly}
                          onChange={(e) =>
                            setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] text-slate-500">Daily AI Limit</span>
                        <input
                          type="number"
                          value={editingPlan.dailyAiLimit}
                          onChange={(e) =>
                            setEditingPlan({ ...editingPlan, dailyAiLimit: Number(e.target.value) })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono"
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingPlan.has3dLab}
                        onChange={(e) => setEditingPlan({ ...editingPlan, has3dLab: e.target.checked })}
                      />
                      <span>Enable 3D Lab</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingPlan.hasVoiceTutor}
                        onChange={(e) => setEditingPlan({ ...editingPlan, hasVoiceTutor: e.target.checked })}
                      />
                      <span>Enable Live Voice Tutor</span>
                    </label>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={async () => {
                          await updateSubscriptionPlan(editingPlan);
                          setEditingPlan(null);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold"
                      >
                        Save Plan
                      </button>
                      <button
                        onClick={() => setEditingPlan(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                      <button
                        onClick={() => setEditingPlan(plan)}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                      {plan.currency} {plan.priceMonthly}
                      <span className="text-xs font-sans font-normal text-slate-500">/mo</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div>Daily AI Limit: {plan.dailyAiLimit}</div>
                      <div>3D Lab: {plan.has3dLab ? "Included" : "Locked"}</div>
                      <div>Voice Tutor: {plan.hasVoiceTutor ? "Included" : "Locked"}</div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Learner Directory */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Registered Learners ({allUsers.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Plan</th>
                  <th className="py-2 pl-3 text-right">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{u.displayName}</td>
                    <td className="py-3 px-3 text-slate-600">{u.email}</td>
                    <td className="py-3 px-3 uppercase font-mono font-semibold text-indigo-600">{u.role}</td>
                    <td className="py-3 px-3 text-slate-700">{u.planId}</td>
                    <td className="py-3 pl-3 text-right font-mono tabular-nums text-slate-700">
                      {u.studyStreakDays}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ROUTE 7: AI MODEL ORCHESTRATION & ROUTING (UNIFIED IN SETTINGS HUB)
  // =========================================================================
  if (adminRoute === "ai-models") {
    return <SettingsHubView defaultTab="models" />;
  }

  // =========================================================================
  // ROUTE 7B: BOOK MANAGER ENGINE (LAZY LOADED)
  // =========================================================================
  if (adminRoute === "book-manager") {
    return <BookManagerWorkspace />;
  }

  // =========================================================================
  // ROUTE 8: UNIFIED PLATFORM SETTINGS HUB
  // =========================================================================
  return <SettingsHubView defaultTab="preferences" />;
}
