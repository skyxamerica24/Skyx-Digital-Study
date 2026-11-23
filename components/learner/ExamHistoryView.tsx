"use client";

import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Target,
  XCircle,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";

export default function ExamHistoryView() {
  const { examAttempts, books, questions, openBookReader, setLearnerRoute } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(examAttempts[0]?.id || null);

  const summary = useMemo(() => {
    if (examAttempts.length === 0) {
      return { avgAccuracy: 0, bestAccuracy: 0, totalAnswered: 0, totalMinutes: 0 };
    }
    const avgAccuracy = Math.round(
      examAttempts.reduce((acc, a) => acc + a.accuracyPercent, 0) / examAttempts.length
    );
    const bestAccuracy = Math.max(...examAttempts.map((a) => a.accuracyPercent));
    const totalAnswered = examAttempts.reduce((acc, a) => acc + a.totalQuestions, 0);
    const totalMinutes = Math.round(
      examAttempts.reduce((acc, a) => acc + a.durationSeconds, 0) / 60
    );
    return { avgAccuracy, bestAccuracy, totalAnswered, totalMinutes };
  }, [examAttempts]);

  const chartData = useMemo(() => {
    return [...examAttempts]
      .reverse()
      .map((attempt, idx) => ({
        label: `#${idx + 1}`,
        title: attempt.examTitle,
        Accuracy: attempt.accuracyPercent,
        Correct: attempt.correctCount,
      }));
  }, [examAttempts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Exam History & Review</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track score trends across mock exams, inspect question explanations, and jump to weak topics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLearnerRoute("revision")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-600" />
            Practice SRS Flashcards
          </button>
          <button
            onClick={() => setLearnerRoute("exams")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Start New Mock Exam
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Attempts Completed", value: String(examAttempts.length), icon: ClipboardCheck },
          { label: "Average Accuracy", value: `${summary.avgAccuracy}%`, icon: Target },
          { label: "Best Score", value: `${summary.bestAccuracy}%`, icon: Award },
          { label: "Total Questions Practiced", value: String(summary.totalAnswered), icon: Clock },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex items-center justify-between"
            >
              <div>
                <div className="text-xs text-slate-500 font-medium">{kpi.label}</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{kpi.value}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-indigo-600 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Accuracy Progression</h2>
            <p className="text-xs text-slate-500">Chronological performance across your timed attempts</p>
          </div>
          <span className="text-xs font-mono text-slate-500">{summary.totalMinutes} min total exam time</span>
        </div>
        {chartData.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-slate-400">
            Complete your first exam in Exam Center to see your performance chart.
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="examAccuracyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="Accuracy"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  fill="url(#examAccuracyGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Detailed Attempt Review</h2>
        {examAttempts.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-xs text-slate-500">
            No exam attempts recorded yet.
          </div>
        ) : (
          examAttempts.map((attempt) => {
            const book = books.find((b) => b.id === attempt.bookId);
            const isOpen = expandedId === attempt.id;
            const attemptQuestions = attempt.questionIds
              .map((qid) => questions.find((q) => q.id === qid))
              .filter((q): q is NonNullable<typeof q> => Boolean(q));

            return (
              <div key={attempt.id} className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                <button
                  onClick={() => setExpandedId(isOpen ? null : attempt.id)}
                  className="w-full p-5 flex flex-wrap items-center justify-between gap-4 text-left hover:bg-slate-50/70 transition-colors"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{attempt.examTitle}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {book?.title || "Mixed Books"} · {Math.max(1, Math.round(attempt.durationSeconds / 60))} min
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {attempt.correctCount}
                      </span>
                      <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        {attempt.wrongCount}
                      </span>
                      <span className="font-mono font-bold text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100">
                        {attempt.accuracyPercent}%
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-3 bg-slate-50/50">
                    {attemptQuestions.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Question details unavailable for this archived attempt.
                      </p>
                    ) : (
                      attemptQuestions.map((q, i) => (
                        <div key={q.id} className="rounded-xl bg-white border border-slate-200 p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-xs font-bold text-slate-900">
                              Q{i + 1}. {q.stem}
                            </div>
                            <button
                              onClick={() => openBookReader(q.bookId, q.topicId)}
                              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-500"
                            >
                              <BookOpen className="w-3 h-3" />
                              Review Topic
                            </button>
                          </div>
                          <div className="text-xs text-emerald-700 font-medium">
                            Correct Answer: {q.options[q.correctIndex]}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{q.explanation}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
