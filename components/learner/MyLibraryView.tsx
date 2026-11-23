"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock,
  Library,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";

const SPRING_TAB = { type: "spring" as const, stiffness: 420, damping: 32 };
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export default function MyLibraryView() {
  const {
    books,
    topics,
    readingProgress,
    annotations,
    openBookReader,
    setLearnerRoute,
  } = useApp();

  const [tab, setTab] = useState<"reading" | "completed" | "bookmarks">("reading");

  const bookStats = useMemo(() => {
    return books.map((book) => {
      const bookTopics = topics.filter((t) => t.bookId === book.id);
      const bookProgress = readingProgress.filter((p) => p.bookId === book.id);
      const completedCount = bookProgress.filter((p) => p.isCompleted).length;
      const totalCount = Math.max(bookTopics.length, 1);
      const percent = Math.round((completedCount / totalCount) * 100);
      const lastEntry = bookProgress[0];
      const nextTopic =
        bookTopics.find((t) => !bookProgress.some((p) => p.topicId === t.id && p.isCompleted)) ||
        bookTopics[0];
      const totalMinutes = Math.round(
        bookProgress.reduce((acc, p) => acc + (p.timeSpentSeconds || 0), 0) / 60
      );

      return {
        book,
        bookTopics,
        completedCount,
        totalTopics: bookTopics.length,
        percent,
        started: bookProgress.length > 0,
        finished: bookTopics.length > 0 && completedCount >= bookTopics.length,
        lastTopicId: lastEntry?.topicId || nextTopic?.id,
        nextTopicTitle: nextTopic?.topicTitle || "Start reading",
        totalMinutes,
      };
    });
  }, [books, topics, readingProgress]);

  const inProgressBooks = bookStats.filter((s) => s.started && !s.finished);
  const completedBooks = bookStats.filter((s) => s.finished);
  const bookmarks = useMemo(
    () => annotations.filter((a) => a.type === "bookmark" || a.type === "keypoint"),
    [annotations]
  );

  const statCards = [
    {
      label: "Active Reading",
      value: inProgressBooks.length,
      icon: BookOpen,
      tile: "bg-indigo-50 text-indigo-600",
      sub: "Textbooks in progress",
    },
    {
      label: "Completed Books",
      value: completedBooks.length,
      icon: CheckCircle2,
      tile: "bg-emerald-50 text-emerald-600",
      sub: "100% syllabus finished",
    },
    {
      label: "Saved Bookmarks",
      value: bookmarks.length,
      icon: Bookmark,
      tile: "bg-amber-50 text-amber-600",
      sub: "Pinned topics & key points",
    },
  ];

  const displayedBooks =
    tab === "completed"
      ? completedBooks
      : inProgressBooks.length > 0
        ? inProgressBooks
        : bookStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
            My Personal Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Resume active textbooks, review completed courses, and jump straight to bookmarked topics.
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setLearnerRoute("library")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8] hover:brightness-110 text-white text-xs font-semibold shadow-sm shadow-indigo-500/25 cursor-pointer"
        >
          <Library className="w-3.5 h-3.5" />
          Browse Full Catalog
        </motion.button>
      </motion.div>

      {/* Elevated 3-Column KPI Strip — Compact Row on Mobile */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: idx * 0.05, ease: EASE_OUT }}
              whileHover={{ y: -2 }}
              className="rounded-[16px] sm:rounded-[20px] bg-white border border-slate-200/85 p-3 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-[10.5px] sm:text-xs font-medium text-slate-500 truncate">
                  {card.label}
                </div>
                <div className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1 font-mono tabular-nums">
                  {card.value}
                </div>
                <div className="hidden sm:block text-[11px] text-slate-400 mt-0.5">{card.sub}</div>
              </div>
              <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${card.tile}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Spring-Animated Segmented Tab Switcher */}
      <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white border border-slate-200/85 shadow-xs overflow-x-auto max-w-full">
        {[
          { id: "reading" as const, label: "Continue Reading", count: inProgressBooks.length || bookStats.length },
          { id: "completed" as const, label: "Completed", count: completedBooks.length },
          { id: "bookmarks" as const, label: "Bookmarks", count: bookmarks.length },
        ].map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`relative px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11.5px] sm:text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                active ? "text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="myLibraryTabPill"
                  transition={SPRING_TAB}
                  className="absolute inset-0 rounded-xl bg-[#0B1021] shadow-sm"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <span>{item.label}</span>
                <span className={`font-mono tabular-nums text-[10.5px] sm:text-[11px] ${active ? "text-indigo-300" : "text-slate-400"}`}>
                  {item.count}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Animated Tab Panel */}
      <AnimatePresence mode="wait">
        {tab === "bookmarks" ? (
          <motion.div
            key="bookmarks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            {bookmarks.length === 0 ? (
              <div className="rounded-[22px] bg-white border border-slate-200/85 p-10 sm:p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <BookMarked className="w-6 h-6" />
                </div>
                <div className="font-display text-sm font-bold text-slate-800 mt-3">
                  No bookmarks saved yet
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Bookmark any topic or save key points inside the Book Reader to pin them here.
                </p>
              </div>
            ) : (
              <div className="skyx-grid-two">
                {bookmarks.map((bm, idx) => (
                  <motion.div
                    key={bm.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: Math.min(idx * 0.04, 0.2) }}
                    whileHover={{ y: -2 }}
                    className="rounded-[18px] sm:rounded-[20px] bg-white border border-slate-200/85 p-3.5 sm:p-5 shadow-xs hover:border-indigo-300/80 transition-all flex flex-col justify-between gap-2.5 sm:gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-1.5 text-[10px] sm:text-[11px]">
                        <span className="font-semibold capitalize text-indigo-600 shrink-0">{bm.type}</span>
                        <span className="text-slate-400 truncate">{bm.bookTitle}</span>
                      </div>
                      <h3 className="font-display text-[13px] sm:text-sm font-bold text-slate-900 mt-1.5 leading-snug line-clamp-2">
                        {bm.topicTitle}
                      </h3>
                      {bm.quote && (
                        <p className="mt-2 p-2 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] sm:text-xs text-slate-600 leading-relaxed line-clamp-2">
                          &ldquo;{bm.quote}&rdquo;
                        </p>
                      )}
                      {bm.noteText && (
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 line-clamp-2">
                          {bm.noteText}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => openBookReader(bm.bookId, bm.topicId)}
                      className="self-start inline-flex items-center gap-1 text-[11.5px] sm:text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      <span className="sm:hidden">Open</span>
                      <span className="hidden sm:inline">Open in Reader</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            {displayedBooks.length === 0 ? (
              <div className="rounded-[22px] bg-white border border-slate-200/85 p-10 sm:p-12 text-center">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="font-display text-sm font-bold text-slate-800 mt-3">
                  No completed books yet
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Finish all topics in a textbook to earn your completion record here.
                </p>
              </div>
            ) : (
              <div className="skyx-grid-cards">
                {displayedBooks.map((entry, idx) => (
                  <motion.div
                    key={entry.book.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.045, 0.22) }}
                    whileHover={{ y: -3 }}
                    className="rounded-[18px] sm:rounded-[22px] bg-white border border-slate-200/85 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)] hover:border-indigo-300/80 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div
                        className="h-1.5 sm:h-2 w-full"
                        style={{
                          background: `linear-gradient(90deg, ${entry.book.coverColor || "#5B52F5"}, #0B1021)`,
                        }}
                      />
                      <div className="p-3 sm:p-5 space-y-2.5 sm:space-y-3.5">
                        <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-medium text-slate-500">
                          <span className="truncate">{entry.book.subject}</span>
                          <span className="capitalize font-semibold text-indigo-600 shrink-0">
                            {entry.book.accessTier}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-display text-[13.5px] sm:text-base font-bold text-slate-900 leading-snug line-clamp-2">
                            {entry.book.title}
                          </h3>
                          <p className="hidden sm:block text-xs text-slate-500 mt-0.5 truncate">
                            {entry.book.author}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="text-slate-600 font-medium font-mono tabular-nums">
                              {entry.completedCount}/{entry.totalTopics}
                              <span className="hidden sm:inline"> topics</span>
                            </span>
                            <span className="font-mono tabular-nums font-bold text-indigo-600">
                              {entry.percent}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(entry.percent, entry.started ? 8 : 0)}%` }}
                              transition={{ duration: 0.55, ease: EASE_OUT }}
                              className="h-full rounded-full bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] text-slate-500 pt-0.5">
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono tabular-nums shrink-0">{entry.totalMinutes}m</span>
                          <span className="hidden sm:inline" aria-hidden="true">·</span>
                          <span className="hidden sm:inline truncate">Next: {entry.nextTopicTitle}</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-2.5 sm:px-5 sm:py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1.5 sm:gap-2">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => openBookReader(entry.book.id, entry.lastTopicId)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#0B1021] hover:bg-slate-800 text-white text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="sm:hidden">{entry.started ? "Resume" : "Start"}</span>
                        <span className="hidden sm:inline">
                          {entry.started ? "Resume Reading" : "Start Reading"}
                        </span>
                      </motion.button>
                      <button
                        onClick={() => openBookReader(entry.book.id, entry.lastTopicId, "summary")}
                        className="inline-flex items-center justify-center gap-1 p-1.5 sm:p-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer shrink-0"
                        title="Open AI Summary"
                        aria-label="Open AI Summary"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Summary</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
