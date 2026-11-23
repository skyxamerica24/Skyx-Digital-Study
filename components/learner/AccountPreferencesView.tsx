"use client";

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Download, Globe, Save, Shield, Sliders, Smartphone, Type, UserCog } from "lucide-react";
import { useApp } from "@/components/context/AppContext";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { READER_FONT_OPTIONS, resolveReaderFont } from "@/lib/reader-fonts";
import type { BookLanguage } from "@/lib/types";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface AccountPreferencesViewProps {
  embedded?: boolean;
}

export default function AccountPreferencesView({ embedded = false }: AccountPreferencesViewProps) {
  const {
    userProfile,
    user,
    comfort,
    updateComfort,
    updateUserProfile,
    annotations,
    readingProgress,
    examAttempts,
    flashcards,
    notify,
  } = useApp();

  const [displayName, setDisplayName] = useState(userProfile.displayName);
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState(userProfile.weeklyGoalMinutes);

  const activeFont = useMemo(() => resolveReaderFont(comfort.fontFamily), [comfort.fontFamily]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile({ displayName, weeklyGoalMinutes });
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        displayName: userProfile.displayName,
        email: userProfile.email,
        planId: userProfile.planId,
        weeklyGoalMinutes: userProfile.weeklyGoalMinutes,
      },
      comfortSettings: comfort,
      annotations,
      readingProgress,
      examAttempts,
      flashcards,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skyx-academy-study-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Downloaded your personal study data export (JSON).", "success");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {!embedded && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          <h1 className="font-display text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
            Account & Preferences
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your profile, bilingual typography defaults, paper surface themes, and study archive export.
          </p>
        </motion.div>
      )}

      {/* Profile Card */}
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.04, ease: EASE_OUT }}
        onSubmit={handleSaveProfile}
        className="rounded-[22px] bg-white border border-slate-200/85 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-5"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <UserCog className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">Learner Profile</h2>
            <p className="text-[11px] text-slate-500">Synced with your Skyx Academy account</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <label className="block">
            <span className="font-semibold text-slate-600">Display Name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-600">Email Address</span>
            <input
              type="email"
              value={userProfile.email}
              disabled
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-600">Weekly Study Goal (minutes)</span>
            <input
              type="number"
              min={30}
              max={2400}
              value={weeklyGoalMinutes}
              onChange={(e) => setWeeklyGoalMinutes(Number(e.target.value))}
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono tabular-nums text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </label>
          <div className="flex items-end">
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 w-full text-xs text-slate-600">
              Account sync:{" "}
              <span className="font-semibold text-slate-900">
                {user ? "Signed in (Cloud Sync)" : "Local Preview Session"}
              </span>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8] hover:brightness-110 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          Save Profile
        </motion.button>
      </motion.form>

      {/* Multi-Font & Reading Comfort Defaults */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08, ease: EASE_OUT }}
        className="rounded-[22px] bg-white border border-slate-200/85 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-5"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Type className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">
              Reader Typography & Comfort Studio
            </h2>
            <p className="text-[11px] text-slate-500">
              Choose from 6 balanced English + বাংলা typefaces and paper surfaces
            </p>
          </div>
        </div>

        {/* 6 Curated Font Cards — 2 Per Row on Mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {READER_FONT_OPTIONS.map((font) => {
            const selected = activeFont.key === font.key;
            return (
              <motion.button
                key={font.key}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => updateComfort({ fontFamily: font.key })}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selected
                    ? "bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-400/40"
                    : "bg-slate-50/60 border-slate-200/90 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className="text-lg font-semibold text-slate-900"
                    style={{ fontFamily: font.cssFontFamily }}
                  >
                    {font.sample}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">{font.category}</span>
                </div>
                <div className="text-xs font-bold text-slate-900 mt-1.5">{font.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{font.subtitle}</div>
              </motion.button>
            );
          })}
        </div>

        {/* Live Bilingual Typography Preview */}
        <div
          className={`rounded-2xl border p-4 transition-colors ${
            comfort.theme === "midnight"
              ? "bg-[#0F172A] border-slate-800 text-slate-100"
              : comfort.theme === "sepia"
                ? "bg-[#FAF5E8] border-[#E4D7BC] text-[#2B2117]"
                : "bg-[#F8FAFC] border-slate-200/90 text-slate-800"
          }`}
          style={{
            fontFamily: activeFont.cssFontFamily,
            fontSize: `${comfort.fontSize}px`,
            lineHeight: comfort.lineHeight,
          }}
        >
          <div className="font-semibold mb-1">
            Structure of the Human Heart · মানব হৃৎপিণ্ডের গঠন
          </div>
          <p className="opacity-85 text-[0.92em]">
            The human heart pumps oxygen-rich blood through systemic circulation. মানব হৃৎপিণ্ড চারটি প্রকোষ্ঠে বিভক্ত এবং নিরবচ্ছিন্নভাবে রক্ত সঞ্চালন করে।
          </p>
        </div>

        {/* Theme, Language & Size Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div>
            <span className="font-semibold text-slate-600 block mb-1.5">Paper Surface</span>
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
                  type="button"
                  onClick={() => updateComfort({ theme: t.id })}
                  className={`py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    comfort.theme === t.id
                      ? "bg-[#0B1021] border-[#0B1021] text-white"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="font-semibold text-slate-600 block mb-1.5">Preferred Study Language</span>
            <select
              value={comfort.preferredLanguage || "bilingual"}
              onChange={(e) => updateComfort({ preferredLanguage: e.target.value as BookLanguage })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="bilingual">Bilingual (English + বাংলা)</option>
              <option value="en">English Only</option>
              <option value="bn">Bangla (বাংলা)</option>
            </select>
          </label>

          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-600">Default Font Size</span>
              <span className="font-mono tabular-nums font-bold text-indigo-600">
                {comfort.fontSize}px
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={24}
              value={comfort.fontSize}
              onChange={(e) => updateComfort({ fontSize: Number(e.target.value) })}
              className="mt-2 w-full accent-indigo-600 cursor-pointer"
            />
          </label>
        </div>

        <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Reduced Motion Mode</div>
              <div className="text-[11px] text-slate-500">
                Minimize UI animations and auto-rotation effects for calm reading sessions.
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(comfort.reducedMotion)}
            onChange={(e) => updateComfort({ reducedMotion: e.target.checked })}
            className="w-4 h-4 accent-indigo-600 cursor-pointer"
          />
        </label>
      </motion.div>

      {/* Install Mobile & Desktop App (PWA) Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: EASE_OUT }}
        className="rounded-[22px] bg-white border border-slate-200/85 p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3 max-w-xl">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display text-sm font-bold text-slate-900">
              Install Skyx Academy App (PWA)
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Add Skyx Academy to your home screen for a distraction-free full-screen app experience on Android, iOS, and desktop.
            </p>
          </div>
        </div>
        <PWAInstallButton variant="button" />
      </motion.div>

      {/* Data Export Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12, ease: EASE_OUT }}
        className="rounded-[22px] bg-white border border-slate-200/85 p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3 max-w-xl">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Privacy & Personal Study Data Export</span>
              <Globe className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Download a portable JSON archive containing your highlights, notes, reading progress, exam history, and flashcards.
            </p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleExportData}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B1021] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Export Study Data (JSON)
        </motion.button>
      </motion.div>
    </div>
  );
}
