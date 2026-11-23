"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  BookOpen,
  Box,
  ClipboardCheck,
  Lock,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";

const SPRING_TAB = { type: "spring" as const, stiffness: 420, damping: 32 };
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export default function BookLibraryView() {
  const {
    curriculums,
    books,
    topics,
    readingProgress,
    subscriptionPlans,
    userProfile,
    openBookReader,
    open3dLab,
    setLearnerRoute,
  } = useApp();

  const [selectedCurriculum, setSelectedCurriculum] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [languageFilter, setLanguageFilter] = useState<"all" | "bilingual" | "en" | "bn">("all");

  const activePlan = useMemo(
    () => subscriptionPlans.find((p) => p.id === userProfile.planId) || subscriptionPlans[0],
    [subscriptionPlans, userProfile.planId]
  );

  const filteredBooks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return books.filter((b) => {
      if (selectedCurriculum !== "all" && b.curriculumId !== selectedCurriculum) return false;
      if (languageFilter !== "all" && b.language !== languageFilter) return false;
      if (!q) return true;
      return `${b.title} ${b.subtitle || ""} ${b.subject} ${b.author} ${b.description}`
        .toLowerCase()
        .includes(q);
    });
  }, [books, selectedCurriculum, languageFilter, searchTerm]);

  const totalTopicsCount = topics.length;
  const modelsCount = useMemo(
    () => new Set(topics.filter((t) => t.model3dKey).map((t) => t.model3dKey)).size,
    [topics]
  );

  return (
    <div className="space-y-6">
      {/* Executive Midnight Library Banner — Compact on Mobile */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] bg-[#0B1021] text-white px-4 sm:px-8 py-4 sm:py-7 border border-white/[0.08] shadow-[0_18px_48px_rgba(11,16,33,0.16)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(460px circle at 92% 18%, rgba(124, 92, 248, 0.34), transparent 62%), radial-gradient(360px circle at 10% 90%, rgba(56, 189, 248, 0.16), transparent 58%)",
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-3.5 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-indigo-300 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums text-slate-200">{books.length} books</span>
              <span className="text-slate-500">·</span>
              <span className="font-mono tabular-nums text-slate-300">{totalTopicsCount} topics</span>
              <span className="text-slate-500">·</span>
              <span className="font-mono tabular-nums text-slate-300">{modelsCount} 3D labs</span>
            </div>
            <h1 className="font-display text-xl sm:text-3xl font-bold tracking-tight text-white">
              Digital{" "}
              <span className="bg-gradient-to-r from-[#A5B4FC] via-[#C4B5FD] to-[#7DD3FC] bg-clip-text text-transparent">
                Book Library
              </span>
            </h1>
            <p className="hidden sm:block text-sm text-slate-300/90 leading-relaxed max-w-xl">
              Explore bilingual textbooks engineered with chapter trees, instant AI summaries, interactive 3D models, and exam banks.
            </p>
          </div>

          {/* Search & Language Filter Controls */}
          <div className="grid grid-cols-12 sm:flex sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <div className="relative col-span-7 sm:w-72">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search books..."
                className="w-full pl-8 sm:pl-10 pr-7 py-2 sm:py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.12] text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400/70 focus:bg-white/[0.11] transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value as "all" | "bilingual" | "en" | "bn")}
              aria-label="Filter by language"
              className="col-span-5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.12] text-[11.5px] sm:text-xs font-medium text-slate-100 focus:outline-none focus:border-indigo-400/70 cursor-pointer"
            >
              <option value="all" className="bg-[#0B1021]">All Lang</option>
              <option value="bilingual" className="bg-[#0B1021]">EN + বাংলা</option>
              <option value="en" className="bg-[#0B1021]">English</option>
              <option value="bn" className="bg-[#0B1021]">বাংলা</option>
            </select>
          </div>
        </div>
      </motion.section>

      {/* Spring-Animated Curriculum Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          {[
            { id: "all", label: "All Curriculums", count: books.length },
            ...curriculums.map((curr) => ({
              id: curr.id,
              label: curr.name,
              count: books.filter((b) => b.curriculumId === curr.id).length,
            })),
          ].map((item) => {
            const active = selectedCurriculum === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedCurriculum(item.id)}
                className={`relative px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11.5px] sm:text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active ? "text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="libraryCurriculumPill"
                    transition={SPRING_TAB}
                    className="absolute inset-0 rounded-xl bg-[#0B1021] shadow-sm"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <span>{item.label}</span>
                  <span
                    className={`font-mono tabular-nums text-[10.5px] sm:text-[11px] ${
                      active ? "text-indigo-300" : "text-slate-400"
                    }`}
                  >
                    {item.count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Book Grid — Global 2-Per-Row on Mobile */}
      <AnimatePresence mode="wait">
        {filteredBooks.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-[22px] border border-slate-200/80 p-10 sm:p-12 text-center shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="font-display text-sm font-bold text-slate-800">No books matched your filter</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search or switching curriculums.</p>
            <button
              onClick={() => {
                setSelectedCurriculum("all");
                setLanguageFilter("all");
                setSearchTerm("");
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0B1021] text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Reset all filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={`${selectedCurriculum}-${languageFilter}-${searchTerm}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="skyx-grid-cards"
          >
            {filteredBooks.map((book, idx) => {
              const bookTopics = topics.filter((t) => t.bookId === book.id);
              const chapters = new Set(bookTopics.map((t) => t.chapterTitle)).size;
              const completed = readingProgress.filter(
                (p) => p.bookId === book.id && p.isCompleted
              ).length;
              const progressPct = bookTopics.length
                ? Math.round((completed / bookTopics.length) * 100)
                : 0;
              const first3dTopic = bookTopics.find((t) => t.model3dKey);
              const isLocked =
                activePlan &&
                !activePlan.allowedTiers.includes(book.accessTier) &&
                userProfile.role !== "admin";

              return (
                <motion.article
                  key={book.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(idx * 0.045, 0.25), ease: EASE_OUT }}
                  whileHover={{ y: -4 }}
                  className="group bg-white rounded-[18px] sm:rounded-[22px] border border-slate-200/85 overflow-hidden flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_rgba(15,23,42,0.03)] hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)] hover:border-indigo-300/80 transition-all"
                >
                  {/* Editorial Book Cover Header */}
                  <div
                    className="px-3 py-3 sm:px-5 sm:py-5 text-white relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${book.coverColor || "#4F46E5"} 0%, #0B1021 100%)`,
                    }}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-8 -top-8 w-28 sm:w-32 h-28 sm:h-32 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform duration-500"
                    />
                    <div className="relative z-10 flex items-center justify-between gap-1.5 text-[10px] sm:text-[11px] text-white/80 font-medium">
                      <span className="truncate">{book.subject}</span>
                      <span className="capitalize shrink-0 text-white/95 font-semibold">
                        {book.accessTier}
                      </span>
                    </div>
                    <h2 className="relative z-10 font-display text-[13.5px] sm:text-[17px] font-bold mt-1.5 sm:mt-2.5 leading-snug line-clamp-2 text-balance">
                      {book.title}
                    </h2>
                    {book.subtitle && (
                      <p className="hidden sm:block relative z-10 text-xs text-white/75 mt-1 line-clamp-1">
                        {book.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Body Metadata & Progress */}
                  <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[10.5px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-1 sm:gap-1.5">
                        <span className="hidden sm:inline">
                          By <span className="font-semibold text-slate-700">{book.author}</span>
                        </span>
                        <span className="hidden sm:inline" aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{chapters} ch</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{bookTopics.length} topics</span>
                      </div>
                      <p className="text-[11.5px] sm:text-[13px] text-slate-600 mt-1.5 sm:mt-3 leading-relaxed line-clamp-2 sm:line-clamp-3">
                        {book.description}
                      </p>
                    </div>

                    <div className="mt-3 sm:mt-5 pt-2.5 sm:pt-4 border-t border-slate-100 space-y-2.5 sm:space-y-3.5">
                      <div>
                        <div className="flex items-center justify-between text-[10.5px] sm:text-xs text-slate-500 mb-1">
                          <span>Progress</span>
                          <span className="font-mono tabular-nums font-semibold text-slate-800">
                            {progressPct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.55, ease: EASE_OUT }}
                            className="h-full rounded-full bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {isLocked ? (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setLearnerRoute("membership")}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] sm:text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            <span className="truncate">Unlock</span>
                          </motion.button>
                        ) : (
                          <>
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => openBookReader(book.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8] hover:brightness-110 text-white text-[11px] sm:text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all whitespace-nowrap cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5 shrink-0" />
                              <span className="sm:hidden">Read</span>
                              <span className="hidden sm:inline">Open Reader</span>
                              <ArrowUpRight className="hidden sm:inline w-3.5 h-3.5 opacity-80" />
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={() => openBookReader(book.id, bookTopics[0]?.id, "exam")}
                              className="inline-flex items-center justify-center gap-1 p-2 sm:px-3 sm:py-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                              title="Take chapter MCQ exam"
                              aria-label="Take chapter MCQ exam"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Exam</span>
                            </motion.button>
                            {first3dTopic?.model3dKey && (
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => open3dLab(first3dTopic.model3dKey as "human_heart")}
                                className="hidden sm:inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/70 text-indigo-600 transition-colors cursor-pointer"
                                title="Open 3D Interactive Diagram"
                              >
                                <Box className="w-4 h-4" />
                              </motion.button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
