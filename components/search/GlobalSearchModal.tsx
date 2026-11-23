"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, FileText, HelpCircle, Search, Sparkles, X } from "lucide-react";
import { createSearchIndex } from "@/lib/search-index";
import { useApp } from "@/components/context/AppContext";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export default function GlobalSearchModal() {
  const { isSearchOpen, setIsSearchOpen, books, topics, questions, openBookReader, openAiTutor } =
    useApp();
  const [queryText, setQueryText] = useState("");

  useEffect(() => {
    if (!isSearchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSearchOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  const bookSearch = useMemo(() => createSearchIndex(books, b =>
    [b.title, [b.subtitle, b.subject, b.author, b.description].join(" ")]), [books]);
  const topicSearch = useMemo(() => createSearchIndex(topics, t =>
    [t.topicTitle, [t.chapterTitle, t.sectionTitle, t.builderPath, t.searchTokens, t.contentMarkdown].join(" ")]), [topics]);
  const questionSearch = useMemo(() => createSearchIndex(questions, q =>
    [q.stem, [q.chapterTitle, q.explanation].join(" ")]), [questions]);
  const results = useMemo(() => ({
    books: bookSearch(queryText, queryText.trim() ? 5 : 4),
    topics: topicSearch(queryText, queryText.trim() ? 8 : 5),
    questions: questionSearch(queryText, queryText.trim() ? 5 : 3),
  }), [bookSearch, topicSearch, questionSearch, queryText]);

  const totalCount = results.books.length + results.topics.length + results.questions.length;

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[80] bg-slate-950/55 backdrop-blur-[2px] flex items-start justify-center pt-16 px-4"
          onClick={() => setIsSearchOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="w-full max-w-2xl bg-white rounded-[22px] border border-slate-200/90 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80">
              <Search className="w-5 h-5 text-indigo-600 shrink-0" />
              <input
                autoFocus
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Search books, chapters, topics, Bangla terms, or exam questions..."
                className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
              />
              {queryText && (
                <button
                  onClick={() => setQueryText("")}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instant Results */}
            <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
              {totalCount === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-600">
                    No direct library matches for &ldquo;{queryText}&rdquo;.
                  </p>
                  <button
                    onClick={() => {
                      const q = queryText;
                      setIsSearchOpen(false);
                      openAiTutor({ mode: "chat", prefill: `Explain "${q}" with accurate academic details.` });
                    }}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8] text-white text-xs font-semibold hover:brightness-110 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask Skyx AI Tutor with Web Grounding
                  </button>
                </div>
              ) : (
                <>
                  {results.books.length > 0 && (
                    <div>
                      <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Digital Books
                      </div>
                      <div className="space-y-1">
                        {results.books.map((book) => (
                          <button
                            key={book.id}
                            onClick={() => {
                              openBookReader(book.id);
                              setIsSearchOpen(false);
                            }}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: book.coverColor }}
                              >
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-display text-sm font-semibold text-slate-900 truncate">
                                  {book.title}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {book.subject} · {book.author}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-indigo-600 font-semibold shrink-0">Open</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.topics.length > 0 && (
                    <div>
                      <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Chapters & Topics
                      </div>
                      <div className="space-y-1">
                        {results.topics.map((topic) => {
                          const parentBook = books.find((b) => b.id === topic.bookId);
                          return (
                            <button
                              key={topic.id}
                              onClick={() => {
                                openBookReader(topic.bookId, topic.id, "reading");
                                setIsSearchOpen(false);
                              }}
                              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-slate-900 truncate">
                                    {topic.topicTitle}
                                  </div>
                                  <div className="text-xs text-slate-500 truncate">
                                    {parentBook?.title} · {topic.builderPath || topic.chapterTitle}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-slate-500 font-mono tabular-nums shrink-0">
                                {topic.readingMinutes}m
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {results.questions.length > 0 && (
                    <div>
                      <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Question Bank
                      </div>
                      <div className="space-y-1">
                        {results.questions.map((q) => (
                          <button
                            key={q.id}
                            onClick={() => {
                              openBookReader(q.bookId, q.topicId, "exam");
                              setIsSearchOpen(false);
                            }}
                            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm text-slate-800 line-clamp-1">{q.stem}</div>
                              <div className="text-xs text-slate-500 mt-0.5 capitalize">
                                {q.chapterTitle} · {q.difficulty}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span>Full-text bilingual search across Books, Topics & Questions</span>
              <span className="font-mono">ESC to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
