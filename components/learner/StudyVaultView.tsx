"use client";

import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Clock,
  Highlighter,
  Loader2,
  Mic,
  Pin,
  Plus,
  Search,
  Square,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";

type VaultTab = "all" | "highlights" | "notes" | "keypoints" | "bookmarks" | "history";

const SPRING_TAB = { type: "spring" as const, stiffness: 420, damping: 32 };
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export default function StudyVaultView() {
  const {
    books,
    topics,
    annotations,
    readingProgress,
    addAnnotation,
    deleteAnnotation,
    openBookReader,
    getModelForTask,
    getSecretSlotForTask,
    notify,
  } = useApp();

  const [activeTab, setActiveTab] = useState<VaultTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<string>("all");

  // Quick note / key point composer with voice dictation
  const [composerBookId, setComposerBookId] = useState<string>(books[0]?.id || "");
  const [composerType, setComposerType] = useState<"note" | "keypoint">("note");
  const [composerQuote, setComposerQuote] = useState("");
  const [composerNote, setComposerNote] = useState("");

  // Voice dictation using gemini-3.5-transcribe
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleToggleVoiceDictation = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setIsTranscribing(true);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = String(reader.result || "");
              resolve(res.split(",")[1] || "");
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const resp = await fetch("/api/ai/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: base64,
              mimeType,
              model: getModelForTask("cfg-transcribe"),
              secretSlot: getSecretSlotForTask("cfg-transcribe"),
            }),
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || "Transcription failed.");
          if (data.transcript) {
            setComposerNote((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
            notify("Voice note transcribed successfully.", "success");
          }
        } catch (err) {
          notify(err instanceof Error ? err.message : "Could not transcribe voice note.", "error");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      notify("Microphone permission is required for voice dictation.", "error");
    }
  };

  const handleSavePersonalItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerQuote.trim() && !composerNote.trim()) return;
    const book = books.find((b) => b.id === composerBookId) || books[0];
    const topic = topics.find((t) => t.bookId === book?.id) || topics[0];
    if (!book || !topic) return;

    await addAnnotation({
      bookId: book.id,
      topicId: topic.id,
      bookTitle: book.title,
      topicTitle: topic.topicTitle,
      type: composerType,
      color: composerType === "keypoint" ? "indigo" : "amber",
      quote: composerQuote.trim() || composerNote.trim().slice(0, 120),
      noteText: composerNote.trim(),
    });
    setComposerQuote("");
    setComposerNote("");
  };

  const filteredAnnotations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return annotations.filter((a) => {
      if (activeTab === "highlights" && a.type !== "highlight" && a.type !== "underline") return false;
      if (activeTab === "notes" && a.type !== "note") return false;
      if (activeTab === "keypoints" && a.type !== "keypoint") return false;
      if (activeTab === "bookmarks" && a.type !== "bookmark") return false;
      if (colorFilter !== "all" && a.color !== colorFilter) return false;
      if (
        q &&
        !a.quote.toLowerCase().includes(q) &&
        !a.noteText.toLowerCase().includes(q) &&
        !a.bookTitle.toLowerCase().includes(q) &&
        !a.topicTitle.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [annotations, activeTab, colorFilter, searchQuery]);

  const colorDot: Record<string, string> = {
    amber: "bg-amber-400",
    emerald: "bg-emerald-400",
    rose: "bg-rose-400",
    sky: "bg-sky-400",
    indigo: "bg-indigo-500",
  };

  const tabs: { id: VaultTab; label: string; count: number }[] = [
    { id: "all", label: "All Saved", count: annotations.length },
    {
      id: "highlights",
      label: "Highlights",
      count: annotations.filter((a) => a.type === "highlight" || a.type === "underline").length,
    },
    { id: "notes", label: "Notes", count: annotations.filter((a) => a.type === "note").length },
    { id: "keypoints", label: "Key Points", count: annotations.filter((a) => a.type === "keypoint").length },
    { id: "bookmarks", label: "Bookmarks", count: annotations.filter((a) => a.type === "bookmark").length },
    { id: "history", label: "Reading History", count: readingProgress.length },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: EASE_OUT }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
            Personal Study Vault
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your highlights, underlines, personal key points, voice-dictated notes, bookmarks, and reading log.
          </p>
        </div>
      </motion.div>

      {/* Voice-Enabled Personal Note & Key Point Composer */}
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.04, ease: EASE_OUT }}
        onSubmit={handleSavePersonalItem}
        className="rounded-[22px] bg-white border border-slate-200/85 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-xs font-bold text-slate-900">Quick Capture</span>
            <span className="text-slate-300">·</span>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setComposerType("note")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  composerType === "note" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Study Note
              </button>
              <button
                type="button"
                onClick={() => setComposerType("keypoint")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  composerType === "keypoint" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Personal Key Point
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={composerBookId}
              onChange={(e) => setComposerBookId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>

            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleToggleVoiceDictation}
              disabled={isTranscribing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isRecording
                  ? "bg-rose-600 text-white"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              }`}
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Transcribing...
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  Voice Dictate (BN/EN)
                </>
              )}
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            type="text"
            value={composerQuote}
            onChange={(e) => setComposerQuote(e.target.value)}
            placeholder="Headline or key quote..."
            className="md:col-span-5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
          />
          <input
            type="text"
            value={composerNote}
            onChange={(e) => setComposerNote(e.target.value)}
            placeholder="Detailed note or speak via microphone..."
            className="md:col-span-5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="md:col-span-2 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8] hover:brightness-110 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Save
          </motion.button>
        </div>
      </motion.form>

      {/* Spring-Animated Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-slate-200/85 overflow-x-auto max-w-full shadow-xs">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? "text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="vaultFilterTabPill"
                    transition={SPRING_TAB}
                    className="absolute inset-0 rounded-xl bg-[#0B1021]"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono tabular-nums text-[11px] ${
                      active ? "text-indigo-300" : "text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {activeTab !== "history" && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter saved items..."
                className="pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200/90 text-xs text-slate-700 w-52 focus:outline-none focus:border-indigo-400"
              />
            </div>

            {activeTab === "highlights" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200">
                <button
                  onClick={() => setColorFilter("all")}
                  className={`text-[11px] font-semibold px-1.5 cursor-pointer ${
                    colorFilter === "all" ? "text-indigo-600" : "text-slate-500"
                  }`}
                >
                  All
                </button>
                {["amber", "emerald", "rose", "sky"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColorFilter(c)}
                    className={`w-4 h-4 rounded-full cursor-pointer ${colorDot[c]} ${
                      colorFilter === c ? "ring-2 ring-offset-1 ring-slate-900" : ""
                    }`}
                    aria-label={`Filter by ${c}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Animated Content View */}
      <AnimatePresence mode="wait">
        {activeTab === "history" ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-[22px] bg-white border border-slate-200/85 divide-y divide-slate-100 shadow-xs overflow-hidden"
          >
            {readingProgress.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                No reading history recorded yet. Open any book from the Library to start tracking!
              </div>
            ) : (
              readingProgress.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-indigo-600">{item.bookTitle}</div>
                    <div className="font-display text-sm font-bold text-slate-900 mt-0.5">
                      {item.topicTitle}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        {Math.max(1, Math.round(item.timeSpentSeconds / 60))} min
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-700">
                        {item.percentComplete}%
                      </span>
                      {item.isCompleted && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-600 font-semibold">Completed</span>
                        </>
                      )}
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openBookReader(item.bookId, item.topicId, "reading")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B1021] hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Resume Topic
                  </motion.button>
                </div>
              ))
            )}
          </motion.div>
        ) : filteredAnnotations.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[22px] bg-white border border-slate-200/85 p-12 text-center space-y-2"
          >
            <p className="font-display text-sm font-bold text-slate-800">
              No saved items match this filter
            </p>
            <p className="text-xs text-slate-500">
              Highlight passages in the Book Reader or capture a voice-dictated study note above.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`${activeTab}-${colorFilter}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="skyx-grid-two"
          >
            {filteredAnnotations.map((ann, idx) => {
              const Icon =
                ann.type === "highlight" || ann.type === "underline"
                  ? Highlighter
                  : ann.type === "keypoint"
                    ? Pin
                    : ann.type === "bookmark"
                      ? Bookmark
                      : StickyNote;
              return (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(idx * 0.035, 0.2) }}
                  whileHover={{ y: -2 }}
                  className="rounded-[18px] sm:rounded-[20px] bg-white border border-slate-200/85 p-3.5 sm:p-5 flex flex-col justify-between gap-2.5 sm:gap-3 shadow-xs hover:border-indigo-300/80 transition-all"
                >
                  <div className="space-y-2 sm:space-y-2.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-600 min-w-0">
                        <Icon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="capitalize shrink-0">{ann.type}</span>
                        <span className="hidden sm:inline text-slate-300">·</span>
                        <span className="hidden sm:inline text-slate-500 truncate">{ann.bookTitle}</span>
                      </div>
                      <button
                        onClick={() => deleteAnnotation(ann.id)}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        aria-label="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm font-medium text-slate-900 leading-relaxed line-clamp-3">
                      &ldquo;{ann.quote}&rdquo;
                    </p>

                    {ann.noteText && (
                      <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200/70 line-clamp-2">
                        {ann.noteText}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 sm:pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <span className="text-[10.5px] sm:text-[11px] text-slate-500 truncate">{ann.topicTitle}</span>
                    <button
                      onClick={() => openBookReader(ann.bookId, ann.topicId, "reading")}
                      className="inline-flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span className="sm:hidden">Open</span>
                      <span className="hidden sm:inline">Open in Reader</span>
                      <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
