"use client";

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
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
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Box,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";

const MOMENTUM_DATA = {
  "7D": [
    { day: "Mon", topics: 2, minutes: 45 },
    { day: "Tue", topics: 3, minutes: 62 },
    { day: "Wed", topics: 1, minutes: 30 },
    { day: "Thu", topics: 4, minutes: 85 },
    { day: "Fri", topics: 3, minutes: 58 },
    { day: "Sat", topics: 5, minutes: 95 },
    { day: "Sun", topics: 4, minutes: 74 },
  ],
  "30D": [
    { day: "W1", topics: 9, minutes: 210 },
    { day: "W2", topics: 14, minutes: 320 },
    { day: "W3", topics: 12, minutes: 285 },
    { day: "W4", topics: 18, minutes: 410 },
  ],
  "90D": [
    { day: "M1", topics: 32, minutes: 840 },
    { day: "M2", topics: 46, minutes: 1120 },
    { day: "M3", topics: 58, minutes: 1460 },
  ],
};

function GradientSparkline({
  id,
  color,
  points,
}: {
  id: string;
  color: string;
  points: number[];
}) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = Math.max(max - min, 1);
  const coords = points.map((v, i) => ({
    x: (i / (points.length - 1)) * 100,
    y: 26 - ((v - min) / span) * 20,
  }));

  const linePath = coords
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L100,30 L0,30 Z`;

  return (
    <svg viewBox="0 0 100 30" className="w-full h-6 sm:h-8 mt-2.5 sm:mt-4 overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LearnerDashboard() {
  const {
    userProfile,
    books,
    topics,
    readingProgress,
    annotations,
    examAttempts,
    openBookReader,
    open3dLab,
    setLearnerRoute,
    openAiTutor,
  } = useApp();

  const [range, setRange] = useState<"7D" | "30D" | "90D">("30D");

  const stats = useMemo(() => {
    const completedTopics = readingProgress.filter((p) => p.isCompleted).length;
    const totalTopics = Math.max(topics.length, 1);
    const weeklyPercent = Math.min(
      100,
      Math.round(((completedTopics + examAttempts.length) / totalTopics) * 100)
    );
    const avgAccuracy =
      examAttempts.length > 0
        ? Math.round(
            examAttempts.reduce((acc, a) => acc + a.accuracyPercent, 0) / examAttempts.length
          )
        : 0;
    return {
      completedTopics,
      totalTopics,
      weeklyPercent,
      avgAccuracy,
      totalAnnotations: annotations.length,
    };
  }, [readingProgress, topics.length, examAttempts, annotations.length]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const formattedDateTime = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
      .format(new Date())
      .toUpperCase();
  }, []);

  const ringRadius = 50;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (stats.weeklyPercent / 100) * ringCircumference;

  const kpiCards = [
    {
      id: "kpi-books",
      label: "Active books",
      value: String(books.length),
      trend: `${books.length} live`,
      icon: BookOpen,
      iconBg: "bg-indigo-50 text-indigo-600",
      stroke: "#7C3AED",
      points: [2, 2, 2.4, 3, 3.2, 4.5, books.length],
    },
    {
      id: "kpi-topics",
      label: "Topics done",
      value: String(stats.completedTopics),
      trend: `${stats.completedTopics} done`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
      stroke: "#10B981",
      points: [0, 1, 1, 2, 2, 3, Math.max(stats.completedTopics, 1)],
    },
    {
      id: "kpi-accuracy",
      label: "Exam accuracy",
      value: `${stats.avgAccuracy}%`,
      trend: `${examAttempts.length} exams`,
      icon: Zap,
      iconBg: "bg-sky-50 text-sky-600",
      stroke: "#0EA5E9",
      points: [62, 66, 70, 74, 77, 80, Math.max(stats.avgAccuracy, 60)],
    },
    {
      id: "kpi-vault",
      label: "Vault notes",
      value: String(stats.totalAnnotations),
      trend: "Synced",
      icon: Bookmark,
      iconBg: "bg-amber-50 text-amber-600",
      stroke: "#F59E0B",
      points: [1, 1.5, 2, 2.2, 3, 4.5, Math.max(stats.totalAnnotations, 2)],
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Compact-on-Mobile / Executive-on-Desktop Cosmic Welcome Hero */}
      <section className="relative rounded-[20px] sm:rounded-[24px] bg-gradient-to-br from-[#0A0D22] via-[#131438] to-[#261754] text-white p-4 sm:p-6 lg:p-8 border border-white/[0.08] shadow-[0_18px_42px_-22px_rgba(15,23,42,0.75)] overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-6 w-64 h-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 w-80 h-56 rounded-full bg-cyan-500/12 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-8">
          <div className="space-y-3 sm:space-y-4 max-w-2xl">
            {/* Top row on mobile pairs compact greeting + mini focus ring side by side */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.12em] text-indigo-200/80">
                  {formattedDateTime} · STUDY WORKSPACE
                </div>
                <h1 className="font-display text-xl sm:text-3xl lg:text-[2.5rem] font-extrabold tracking-[-0.03em] leading-[1.12] mt-1 [text-wrap:balance]">
                  {greeting},{" "}
                  <span className="bg-gradient-to-r from-[#A5B4FC] via-[#C4B5FD] to-[#DDD6FE] bg-clip-text text-transparent">
                    {userProfile.displayName.split(" ")[0]}.
                  </span>
                </h1>
              </div>

              {/* Compact Mobile Mini Focus Ring (hidden on lg where full ring shows) */}
              <div className="lg:hidden relative w-16 h-16 rounded-full bg-white/[0.05] ring-1 ring-white/[0.1] flex items-center justify-center shrink-0">
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
                    stroke="url(#focusRingGradientMobile)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    initial={{ strokeDashoffset: ringCircumference }}
                    animate={{ strokeDashoffset: ringOffset }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <defs>
                    <linearGradient id="focusRingGradientMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#818CF8" />
                      <stop offset="100%" stopColor="#38BDF8" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-sm font-extrabold tabular-nums text-white leading-none">
                    {stats.weeklyPercent}%
                  </span>
                  <span className="text-[8px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                    Focus
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl line-clamp-2 sm:line-clamp-none">
              <strong className="text-white font-semibold tabular-nums">
                {books.length} books
              </strong>{" "}
              ready and{" "}
              <strong className="text-white font-semibold tabular-nums">
                {stats.completedTopics} topics
              </strong>{" "}
              mastered ·{" "}
              <span className="text-indigo-200 font-semibold tabular-nums">
                {userProfile.studyStreakDays}d streak
              </span>
            </p>

            {/* Primary + Secondary Glass CTA Row (2-col on mobile, flex on desktop) */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 pt-0.5">
              <motion.button
                type="button"
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openBookReader(books[0]?.id || "book-bio-physiology")}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#5B52F5] via-[#6D55F7] to-[#7C5CF8] hover:brightness-105 text-white text-xs sm:text-sm font-semibold shadow-[0_8px_24px_-6px_rgba(99,102,241,0.65)] transition-all whitespace-nowrap cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Read Now</span>
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setLearnerRoute("exams")}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] backdrop-blur-md text-white text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-200" />
                <span>Start Exam</span>
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => open3dLab("human_heart")}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] backdrop-blur-md text-white text-sm font-medium transition-all whitespace-nowrap cursor-pointer"
              >
                <Box className="w-4 h-4 text-indigo-200" />
                <span>3D Visual Lab</span>
              </motion.button>
            </div>

            {/* Clean Inline Hero Stats (Desktop/Tablet) */}
            <div className="hidden sm:flex pt-2 flex-wrap items-center gap-8">
              <div>
                <div className="font-display text-lg font-bold tabular-nums text-white">
                  {books.length}
                </div>
                <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                  Active Books
                </div>
              </div>
              <div>
                <div className="font-display text-lg font-bold tabular-nums text-white">
                  {stats.completedTopics}
                </div>
                <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                  Topics Completed
                </div>
              </div>
              <div>
                <div className="font-display text-lg font-bold tabular-nums text-white">
                  {userProfile.studyStreakDays}d
                </div>
                <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                  Study Streak
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Concentric Circular Focus Ring */}
          <div className="hidden lg:flex flex-col items-center justify-center shrink-0 pr-3">
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
                  stroke="url(#focusRingGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  initial={{ strokeDashoffset: ringCircumference }}
                  animate={{ strokeDashoffset: ringOffset }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
                <defs>
                  <linearGradient id="focusRingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-3xl font-extrabold tabular-nums text-white">
                  {stats.weeklyPercent}%
                </span>
                <span className="text-[9.5px] font-semibold tracking-[0.12em] uppercase text-slate-400 mt-0.5">
                  Weekly Focus
                </span>
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="text-xs font-semibold text-white tabular-nums">
                {stats.completedTopics} of {stats.totalTopics} complete
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Goal: {userProfile.weeklyGoalMinutes} min/week
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global 2-Per-Row Mobile -> 4-Per-Row Desktop KPI Stat Cards */}
      <section className="skyx-grid-kpi">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
              className="bg-white rounded-[18px] sm:rounded-[20px] border border-slate-200/75 p-3.5 sm:p-5 shadow-[0_6px_22px_-12px_rgba(15,23,42,0.1)] hover:shadow-[0_14px_30px_-14px_rgba(79,70,229,0.18)] transition-shadow"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}
                >
                  <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10.5px] sm:text-xs font-semibold text-emerald-600 tabular-nums truncate">
                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                  <span className="truncate">{card.trend}</span>
                </span>
              </div>
              <div className="mt-3 sm:mt-4 font-display text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 leading-none">
                {card.value}
              </div>
              <div className="text-[11.5px] sm:text-[13px] font-medium text-slate-500 mt-1 truncate">
                {card.label}
              </div>
              <GradientSparkline id={card.id} color={card.stroke} points={card.points} />
            </motion.div>
          );
        })}
      </section>

      {/* Lower Analytics & 2-Column Mobile Focus Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Momentum Overview Chart */}
        <div className="lg:col-span-8 bg-white rounded-[20px] sm:rounded-[22px] border border-slate-200/75 p-4 sm:p-6 shadow-[0_6px_22px_-12px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-5">
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
                Momentum overview
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Study minutes across your textbooks
              </p>
            </div>

            <div className="relative flex items-center gap-0.5 p-1 bg-slate-100 rounded-xl">
              {(["7D", "30D", "90D"] as const).map((r) => {
                const active = range === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`relative z-10 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer ${
                      active ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="momentumRangePill"
                        transition={{ type: "spring", stiffness: 450, damping: 34 }}
                        className="absolute inset-0 -z-10 rounded-lg bg-white shadow-xs"
                      />
                    )}
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-52 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOMENTUM_DATA[range]} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="skyxIndigo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 10px 25px -8px rgba(15,23,42,0.12)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  name="Study Minutes"
                  stroke="#5B52F5"
                  strokeWidth={2.5}
                  fill="url(#skyxIndigo)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Focus for Today (2-per-row on mobile, vertical stack on desktop sidebar column) */}
        <div className="lg:col-span-4 bg-white rounded-[20px] sm:rounded-[22px] border border-slate-200/75 p-4 sm:p-6 shadow-[0_6px_22px_-12px_rgba(15,23,42,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-3.5 sm:mb-5">
              <div>
                <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
                  Focus for today
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {stats.completedTopics} of {stats.totalTopics} topics done
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setLearnerRoute("library")}
                aria-label="Browse all books"
                className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
              {books.slice(0, 4).map((book) => {
                const bookTopics = topics.filter((t) => t.bookId === book.id);
                const doneCount = readingProgress.filter(
                  (p) => p.bookId === book.id && p.isCompleted
                ).length;
                const pct = bookTopics.length
                  ? Math.round((doneCount / bookTopics.length) * 100)
                  : 0;

                return (
                  <motion.button
                    key={book.id}
                    type="button"
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openBookReader(book.id)}
                    className="w-full p-3 sm:p-3.5 rounded-2xl border border-slate-200/75 hover:border-indigo-300/80 hover:bg-indigo-50/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs sm:text-[13.5px] font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                        {book.title}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 mt-1">
                      <span className="truncate">{book.subject}</span>
                      <span className="font-mono tabular-nums font-semibold shrink-0">{pct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#5B52F5] to-[#8B5CF6] transition-all"
                        style={{ width: `${Math.max(pct, 8)}%` }}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openAiTutor({ mode: "voice" })}
            className="mt-4 sm:mt-5 w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Practice 5-Min Voice Viva</span>
          </motion.button>
        </div>
      </section>
    </div>
  );
}
