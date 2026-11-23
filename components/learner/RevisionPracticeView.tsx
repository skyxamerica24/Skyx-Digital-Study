"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";

export default function RevisionPracticeView() {
  const {
    flashcards,
    books,
    topics,
    examAttempts,
    addFlashcard,
    reviewFlashcard,
    deleteFlashcard,
    openBookReader,
    notify,
  } = useApp();

  const [revealed, setRevealed] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(books[0]?.id || "");
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");

  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [now, setNow] = useState(0);

  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  useEffect(() => {
    const init = setTimeout(() => setNow(Date.now()), 0);
    const ticker = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(init);
      clearInterval(ticker);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          if (mode === "focus") {
            setSessionsCompleted((s) => s + 1);
            notifyRef.current("Focus sprint complete! Take a 5-minute break.", "success");
            setMode("break");
            return 5 * 60;
          } else {
            notifyRef.current("Break finished! Ready for your next focus sprint.", "info");
            setMode("focus");
            return 25 * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, mode]);

  const dueCards = useMemo(
    () =>
      (now === 0 ? flashcards : flashcards.filter((c) => c.nextReviewAt <= now)).sort(
        (a, b) => a.nextReviewAt - b.nextReviewAt
      ),
    [flashcards, now]
  );
  const activeCard = dueCards[0] || flashcards[0] || null;

  const weakBooks = useMemo(() => {
    const map = new Map<string, { bookId: string; title: string; attempts: number; avg: number }>();
    for (const attempt of examAttempts) {
      const book = books.find((b) => b.id === attempt.bookId);
      const curr = map.get(attempt.bookId) || {
        bookId: attempt.bookId,
        title: book?.title || attempt.examTitle,
        attempts: 0,
        avg: 0,
      };
      const nextAttempts = curr.attempts + 1;
      const nextAvg = Math.round((curr.avg * curr.attempts + attempt.accuracyPercent) / nextAttempts);
      map.set(attempt.bookId, { ...curr, attempts: nextAttempts, avg: nextAvg });
    }
    return Array.from(map.values()).sort((a, b) => a.avg - b.avg);
  }, [examAttempts, books]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontText.trim() || !backText.trim()) return;
    const book = books.find((b) => b.id === selectedBookId) || books[0];
    const topic = topics.find((t) => t.bookId === book?.id) || topics[0];
    await addFlashcard({
      bookId: book?.id || "book-bio-physiology",
      topicId: topic?.id || "topic-bio-heart",
      bookTitle: book?.title || "Skyx Academy Textbook",
      topicTitle: topic?.topicTitle || "General Revision",
      front: frontText.trim(),
      back: backText.trim(),
    });
    setFrontText("");
    setBackText("");
    setShowNewForm(false);
  };

  const handleRate = async (quality: 1 | 3 | 4 | 5) => {
    if (!activeCard) return;
    await reviewFlashcard(activeCard.id, quality);
    setRevealed(false);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Revision & Spaced Repetition</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Master high-yield textbook facts with SM-2 flashcards, weak-topic drills, and Pomodoro focus sprints.
          </p>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          New Flashcard
        </button>
      </div>

      {showNewForm && (
        <form
          onSubmit={handleCreateCard}
          className="rounded-2xl bg-white border border-indigo-200 p-5 shadow-xs space-y-3"
        >
          <div className="text-sm font-bold text-slate-900">Create SRS Flashcard</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block text-xs">
              <span className="font-semibold text-slate-600">Book</span>
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs md:col-span-2">
              <span className="font-semibold text-slate-600">Front (Question / Concept)</span>
              <input
                type="text"
                required
                value={frontText}
                onChange={(e) => setFrontText(e.target.value)}
                placeholder="e.g., What is the duration of one complete cardiac cycle?"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </label>
          </div>
          <label className="block text-xs">
            <span className="font-semibold text-slate-600">Back (Answer / Mnemonic)</span>
            <textarea
              required
              rows={2}
              value={backText}
              onChange={(e) => setBackText(e.target.value)}
              placeholder="e.g., 0.8 seconds at 75 bpm (Atrial systole 0.1s + Ventricular systole 0.3s + Joint diastole 0.4s)"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              Save Card
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">SM-2 Flashcard Queue</h2>
                <p className="text-xs text-slate-500">
                  {dueCards.length} due now · {flashcards.length} total cards in your deck
                </p>
              </div>
            </div>
            {activeCard && (
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold">
                Interval: {activeCard.intervalDays}d · EF {activeCard.easeFactor}
              </span>
            )}
          </div>

          {activeCard ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 min-h-[190px] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-indigo-600">{activeCard.bookTitle}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{activeCard.topicTitle}</div>
                  <div className="text-lg font-bold text-slate-900 mt-4 leading-relaxed">
                    {activeCard.front}
                  </div>
                </div>

                {revealed ? (
                  <div className="mt-5 pt-4 border-t border-slate-200 text-sm text-slate-700 leading-relaxed">
                    {activeCard.back}
                  </div>
                ) : (
                  <button
                    onClick={() => setRevealed(true)}
                    className="mt-5 self-start px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Reveal Answer
                  </button>
                )}
              </div>

              {revealed && (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { q: 1 as const, label: "Again", sub: "1 day", cls: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" },
                    { q: 3 as const, label: "Hard", sub: "Short", cls: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
                    { q: 4 as const, label: "Good", sub: "SM-2", cls: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" },
                    { q: 5 as const, label: "Easy", sub: "Boost", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      onClick={() => handleRate(btn.q)}
                      className={`p-2.5 rounded-xl border text-center transition-colors ${btn.cls}`}
                    >
                      <div className="text-xs font-bold">{btn.label}</div>
                      <div className="text-[10px] opacity-80">{btn.sub}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All flashcards reviewed! Create a new card above to keep growing your memory deck.
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl bg-[#0B1120] text-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Pomodoro Focus Timer
                </span>
              </div>
              <span className="text-xs text-slate-400">{sessionsCompleted} sprints today</span>
            </div>

            <div className="text-5xl font-mono font-bold tracking-tight text-center py-2">
              {mm}:{ss}
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setRunning((r) => !r)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
              >
                {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {running ? "Pause" : "Start Sprint"}
              </button>
              <button
                onClick={() => {
                  setRunning(false);
                  setSecondsLeft(mode === "focus" ? 25 * 60 : 5 * 60);
                }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200"
                aria-label="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const next = mode === "focus" ? "break" : "focus";
                  setRunning(false);
                  setMode(next);
                  setSecondsLeft(next === "focus" ? 25 * 60 : 5 * 60);
                }}
                className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold"
              >
                {mode === "focus" ? "5m Break" : "25m Focus"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Weak-Topic Remediation Queue</h2>
            {weakBooks.length === 0 ? (
              <p className="text-xs text-slate-500">
                Take a mock exam to automatically surface lower-accuracy topics here.
              </p>
            ) : (
              weakBooks.map((wb) => (
                <div
                  key={wb.bookId}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{wb.title}</div>
                    <div className="text-[11px] text-slate-500">
                      Avg accuracy: <span className="font-mono font-bold text-slate-800">{wb.avg}%</span> ({wb.attempts} attempt{wb.attempts > 1 ? "s" : ""})
                    </div>
                  </div>
                  <button
                    onClick={() => openBookReader(wb.bookId)}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-semibold"
                  >
                    <BookOpen className="w-3 h-3" />
                    Study
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Your Flashcard Deck ({flashcards.length})</h2>
        <div className="divide-y divide-slate-100">
          {flashcards.map((fc) => (
            <div key={fc.id} className="py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900">{fc.front}</div>
                <div className="text-xs text-slate-500 mt-0.5">{fc.back}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {fc.bookTitle} · Next review in {fc.intervalDays}d
                </div>
              </div>
              <button
                onClick={() => deleteFlashcard(fc.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                aria-label="Delete flashcard"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
