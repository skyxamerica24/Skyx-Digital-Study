"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Flag,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";
import type { Question } from "@/lib/types";

type ExamPhase = "builder" | "running" | "results";

export default function ExamCenterView() {
  const {
    books,
    topics,
    questions,
    examAttempts,
    saveExamAttempt,
    saveQuestionsBatch,
    getModelForTask,
    getSecretSlotForTask,
    notify,
  } = useApp();

  const attemptId = useRef("");
  const submitting = useRef(false);
  const [resultStatus, setResultStatus] = useState<"saving" | "failed" | "saved">("saving");
  const [phase, setPhase] = useState<ExamPhase>("builder");

  // Builder controls
  const [selectedBookId, setSelectedBookId] = useState<string>("all");
  const [selectedChapter, setSelectedChapter] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [negativeMarking, setNegativeMarking] = useState<boolean>(false);
  const [prioritizeUnseen, setPrioritizeUnseen] = useState<boolean>(true);
  const [generatingAi, setGeneratingAi] = useState<boolean>(false);

  // Active exam runner state
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [activeExamTitle, setActiveExamTitle] = useState<string>("");
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flaggedIds, setFlaggedIds] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(600);
  const [initialDurationSeconds, setInitialDurationSeconds] = useState<number>(600);

  // Computed result summary
  const [lastResult, setLastResult] = useState<{
    correct: number;
    wrong: number;
    skipped: number;
    netScore: number;
    accuracy: number;
    timeSpent: number;
  } | null>(null);

  const previouslySeenIds = useMemo(() => {
    const seen = new Set<string>();
    for (const att of examAttempts) {
      for (const qId of att.questionIds || []) {
        seen.add(qId);
      }
    }
    return seen;
  }, [examAttempts]);

  const availableChapters = useMemo(() => {
    const list =
      selectedBookId === "all"
        ? questions
        : questions.filter((q) => q.bookId === selectedBookId);
    return Array.from(new Set(list.map((q) => q.chapterTitle))).filter(Boolean);
  }, [questions, selectedBookId]);

  const filteredPool = useMemo(() => {
    return questions.filter((q) => {
      if (selectedBookId !== "all" && q.bookId !== selectedBookId) return false;
      if (selectedChapter !== "all" && q.chapterTitle !== selectedChapter) return false;
      return true;
    });
  }, [questions, selectedBookId, selectedChapter]);

  const unseenCount = useMemo(
    () => filteredPool.filter((q) => !previouslySeenIds.has(q.id)).length,
    [filteredPool, previouslySeenIds]
  );

  // Finish and grade exam
  const finalizeExam = React.useCallback(async () => {
    if (activeQuestions.length === 0 || submitting.current) return;
    submitting.current = true;
    setResultStatus("saving");

    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    for (const q of activeQuestions) {
      const ans = answers[q.id];
      if (ans === undefined) skipped++;
      else if (ans === q.correctIndex) correct++;
      else wrong++;
    }

    const penalty = negativeMarking ? wrong * 0.25 : 0;
    const netScore = Math.max(0, Number((correct - penalty).toFixed(2)));
    const accuracy = Math.round((correct / activeQuestions.length) * 100);
    const timeSpent = Math.max(1, initialDurationSeconds - secondsLeft);

    setLastResult({ correct, wrong, skipped, netScore, accuracy, timeSpent });
    setPhase("results");

    const saved = await saveExamAttempt({
      bookId: selectedBookId === "all" ? activeQuestions[0]?.bookId || "all" : selectedBookId,
      examTitle: activeExamTitle || "Skyx Timed Mock Exam",
      totalQuestions: activeQuestions.length,
      correctCount: correct,
      wrongCount: wrong,
      skippedCount: skipped,
      accuracyPercent: accuracy,
      durationSeconds: timeSpent,
      questionIds: activeQuestions.map((q) => q.id),
    }, attemptId.current);
    submitting.current = false;
    setResultStatus(saved ? "saved" : "failed");
    if (saved) notify(`Exam submitted! Accuracy: ${accuracy}%`, "success");
  }, [
    activeQuestions,
    answers,
    negativeMarking,
    initialDurationSeconds,
    secondsLeft,
    saveExamAttempt,
    selectedBookId,
    activeExamTitle,
    notify,
  ]);

  // Live countdown timer
  useEffect(() => {
    if (phase !== "running") return;
    if (secondsLeft <= 0) {
      const id = window.setTimeout(() => {
        finalizeExam();
      }, 0);
      return () => window.clearTimeout(id);
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, secondsLeft, finalizeExam]);

  const handleStartExam = () => {
    if (filteredPool.length === 0) {
      notify("No questions available in this selection. Generate fresh AI questions first.", "error");
      return;
    }

    const unseen = filteredPool.filter((q) => !previouslySeenIds.has(q.id));
    const seen = filteredPool.filter((q) => previouslySeenIds.has(q.id));

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
    const ordered = prioritizeUnseen
      ? [...shuffle(unseen), ...shuffle(seen)]
      : shuffle(filteredPool);

    const chosen = ordered.slice(0, Math.min(questionCount, ordered.length));
    const bookName =
      selectedBookId === "all"
        ? "All Curriculums Mixed"
        : books.find((b) => b.id === selectedBookId)?.title || "Book Mock";

    const totalSec = durationMinutes * 60;
    setActiveQuestions(chosen);
    setActiveExamTitle(`${bookName} (${chosen.length}Q)`);
    setCurrentIdx(0);
    setAnswers({});
    setFlaggedIds({});
    setInitialDurationSeconds(totalSec);
    setSecondsLeft(totalSec);
    attemptId.current = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
    setLastResult(null);
    setPhase("running");
  };

  // Generate fresh non-duplicate questions via Gemini AI
  const handleGenerateFreshQuestions = async () => {
    const targetBook =
      selectedBookId === "all"
        ? books[0]
        : books.find((b) => b.id === selectedBookId) || books[0];
    if (!targetBook) return;

    const targetTopics = topics.filter((t) => t.bookId === targetBook.id);
    const targetTopic =
      selectedChapter !== "all"
        ? targetTopics.find((t) => t.chapterTitle === selectedChapter) || targetTopics[0]
        : targetTopics[Math.floor(Math.random() * targetTopics.length)] || topics[0];

    if (!targetTopic) {
      notify("No topic content available to generate questions from.", "error");
      return;
    }

    setGeneratingAi(true);
    try {
      const existingStems = questions
        .filter((q) => q.bookId === targetBook.id)
        .map((q) => q.stem);

      const res = await fetch("/api/ai/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: targetBook.title,
          chapterTitle: targetTopic.chapterTitle,
          topicTitle: targetTopic.topicTitle,
          contentMarkdown: targetTopic.contentMarkdown,
          count: 5,
          difficulty: "mixed",
          excludeStems: existingStems,
          model: getModelForTask("cfg-questions"),
          secretSlot: getSecretSlotForTask("cfg-questions"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate questions.");

      const newQuestions: Omit<Question, "createdAt">[] = (data.questions || []).map(
        (q: {
          stem: string;
          options: [string, string, string, string];
          correctIndex: number;
          explanation: string;
          difficulty: "easy" | "medium" | "hard";
        }, idx: number) => ({
          id: `q-ai-${Date.now()}-${idx}`,
          bookId: targetBook.id,
          topicId: targetTopic.id,
          chapterTitle: targetTopic.chapterTitle,
          stem: q.stem,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          difficulty: q.difficulty,
          isPublished: true,
        })
      );

      if (newQuestions.length === 0) {
        throw new Error("AI did not return valid questions. Please try again.");
      }

      await saveQuestionsBatch(newQuestions);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not generate fresh questions.", "error");
    } finally {
      setGeneratingAi(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  // --- PHASE 2: LIVE TIMED EXAM RUNNER ---
  if (phase === "running" && activeQuestions[currentIdx]) {
    const q = activeQuestions[currentIdx];
    const progressPct = Math.round(((initialDurationSeconds - secondsLeft) / initialDurationSeconds) * 100);
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="space-y-5">
        {/* Sticky Exam Telemetry Header */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="text-xs font-semibold text-indigo-600">Live Timed Assessment</div>
            <h2 className="text-base font-bold text-slate-900">{activeExamTitle}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Answered</div>
              <div className="text-sm font-bold font-mono tabular-nums text-slate-900">
                {answeredCount} / {activeQuestions.length}
              </div>
            </div>

            <div
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border font-mono tabular-nums text-sm font-bold ${
                secondsLeft < 60
                  ? "bg-rose-50 border-rose-300 text-rose-700"
                  : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <Clock className="w-4 h-4" />
              {formatTimer(secondsLeft)}
            </div>

            <button
              onClick={finalizeExam}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap"
            >
              Submit Exam
            </button>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-500"
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Question Card */}
          <div className="lg:col-span-8 rounded-2xl bg-white border border-slate-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-500">
                Question <span className="font-mono tabular-nums text-slate-900">{currentIdx + 1}</span> of{" "}
                <span className="font-mono tabular-nums">{activeQuestions.length}</span>
                <span className="mx-2">·</span>
                <span className="capitalize">{q.difficulty}</span>
              </div>
              <button
                onClick={() =>
                  setFlaggedIds((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                  flaggedIds[q.id]
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                {flaggedIds[q.id] ? "Flagged" : "Flag for Review"}
              </button>
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
              {q.stem}
            </h3>

            <div className="space-y-2.5">
              {q.options.map((opt, idx) => {
                const selected = answers[q.id] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all flex items-start gap-3 ${
                      selected
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold"
                        : "border-slate-200 hover:border-indigo-300 text-slate-700"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                        selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {currentIdx < activeQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={finalizeExam}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Finish & Grade
                </button>
              )}
            </div>
          </div>

          {/* Question Palette Sidebar */}
          <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 p-5 space-y-4 h-fit shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Question Palette</h4>
            <div className="grid grid-cols-5 gap-2">
              {activeQuestions.map((item, idx) => {
                const isAns = answers[item.id] !== undefined;
                const isFlag = !!flaggedIds[item.id];
                const isCurr = idx === currentIdx;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-lg font-mono text-xs font-bold border transition-all ${
                      isCurr
                        ? "ring-2 ring-indigo-500 border-indigo-600 bg-indigo-600 text-white"
                        : isFlag
                          ? "bg-amber-100 border-amber-400 text-amber-900"
                          : isAns
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span>Answered: {answeredCount}</span>
              <span>·</span>
              <span>Flagged: {Object.values(flaggedIds).filter(Boolean).length}</span>
              <span>·</span>
              <span>Unanswered: {activeQuestions.length - answeredCount}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE 3: INSTANT RESULTS & DETAILED EXPLANATION REVIEW ---
  if (phase === "results" && lastResult) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#131C3A] to-[#1E1B4B] p-6 text-white flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              Assessment Complete
            </div>
            <h2 className="text-2xl font-bold mt-1">{activeExamTitle}</h2>
            <p className="text-xs text-slate-300 mt-1">
              Completed in {formatTimer(lastResult.timeSpent)} ·{" "}
              {negativeMarking ? "Negative marking (-0.25) applied" : "Standard scoring"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-[11px] text-slate-400">Net Score</div>
              <div className="text-3xl font-bold font-mono tabular-nums text-white">
                {lastResult.netScore} / {activeQuestions.length}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Accuracy</div>
              <div className="text-3xl font-bold font-mono tabular-nums text-emerald-400">
                {lastResult.accuracy}%
              </div>
            </div>
            <button
              disabled={resultStatus === "saving"}
              onClick={() => setPhase("builder")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Mock Exam
            </button>
          </div>
        </div>

        {resultStatus === "saving" && <p role="status">Saving result…</p>}
        {resultStatus === "failed" && (
          <button type="button" onClick={finalizeExam} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
            Retry Saving Result
          </button>
        )}

        {/* Breakdown Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900">{lastResult.correct}</div>
              <div className="text-xs text-slate-500">Correct Answers</div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-rose-500" />
            <div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900">{lastResult.wrong}</div>
              <div className="text-xs text-slate-500">Wrong Answers</div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900">{lastResult.skipped}</div>
              <div className="text-xs text-slate-500">Skipped Questions</div>
            </div>
          </div>
        </div>

        {/* Per-Question Detailed Review */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-900">Detailed Answer Explanations</h3>
          {activeQuestions.map((q, idx) => {
            const userAns = answers[q.id];
            const isCorrect = userAns === q.correctIndex;
            return (
              <div key={q.id} className="pb-5 border-b border-slate-100 last:border-b-0 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {idx + 1}. {q.stem}
                  </p>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      userAns === undefined
                        ? "text-amber-600"
                        : isCorrect
                          ? "text-emerald-600"
                          : "text-rose-600"
                    }`}
                  >
                    {userAns === undefined ? "Skipped" : isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oIdx) => {
                    const isRight = oIdx === q.correctIndex;
                    const isUserPick = oIdx === userAns;
                    return (
                      <div
                        key={oIdx}
                        className={`px-3 py-2 rounded-xl border text-xs ${
                          isRight
                            ? "border-emerald-400 bg-emerald-50 text-emerald-950 font-semibold"
                            : isUserPick
                              ? "border-rose-400 bg-rose-50 text-rose-900"
                              : "border-slate-200 text-slate-600"
                        }`}
                      >
                        <span className="font-mono font-bold mr-1.5">{String.fromCharCode(65 + oIdx)}.</span>
                        {opt}
                      </div>
                    );
                  })}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                  <span className="font-semibold text-indigo-700">Explanation: </span>
                  {q.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- PHASE 1: EXAM BUILDER + HISTORY ---
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Exam & Practice Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Build custom timed exams (10–100 MCQs) with automatic unseen-question prioritization and instant AI explanations.
          </p>
        </div>
        <button
          onClick={handleGenerateFreshQuestions}
          disabled={generatingAi}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm disabled:opacity-60 whitespace-nowrap"
        >
          {generatingAi ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating 5 Fresh MCQs...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate 5 Fresh AI Questions
            </>
          )}
        </button>
      </div>

      {/* Exam Builder Panel */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Book Scope</label>
            <select
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(e.target.value);
                setSelectedChapter("all");
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400"
            >
              <option value="all">All Books ({questions.length} MCQs)</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Chapter Filter</label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400"
            >
              <option value="all">All Chapters</option>
              {availableChapters.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Question Count</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 20, 50, 100].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  className={`py-2 rounded-xl border text-xs font-mono font-bold transition-colors ${
                    questionCount === n
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Timer ({durationMinutes} mins)
            </label>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full accent-indigo-600 mt-2"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={prioritizeUnseen}
                onChange={(e) => setPrioritizeUnseen(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              <span>Prioritize unseen questions ({unseenCount} fresh in pool)</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              <span>Medical/BCS negative marking (-0.25)</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Pool ready:{" "}
              <span className="font-mono font-bold text-slate-900">{filteredPool.length}</span> MCQs
            </span>
            <button
              onClick={handleStartExam}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-sm whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              Start Timed Exam
            </button>
          </div>
        </div>
      </div>

      {/* Exam History Table */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Exam Attempt History</h2>
            <p className="text-xs text-slate-500">All completed assessments tracked across sessions.</p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            {examAttempts.length} total attempts
          </span>
        </div>

        {examAttempts.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No exam attempts yet. Launch your first timed mock above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pr-4">Exam Title</th>
                  <th className="py-2.5 px-3">Questions</th>
                  <th className="py-2.5 px-3">Correct / Wrong</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 pl-3 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {examAttempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-semibold text-slate-900 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                      {att.examTitle}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-slate-700">
                      {att.totalQuestions}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      <span className="text-emerald-600 font-semibold">{att.correctCount}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-rose-500 font-semibold">{att.wrongCount}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono tabular-nums font-bold text-indigo-700">
                        {att.accuracyPercent}%
                      </span>
                    </td>
                    <td className="py-3 pl-3 text-right font-mono tabular-nums text-slate-500">
                      {formatTimer(att.durationSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
