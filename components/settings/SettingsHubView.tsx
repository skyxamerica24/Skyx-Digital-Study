"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  KeyRound,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";
import AccountPreferencesView from "@/components/learner/AccountPreferencesView";
import ReaderAssistantSettings from "./ReaderAssistantSettings";
import type { AiModelCategory, AiModelConfig, CustomAiModel, SettingsTabKey } from "@/lib/types";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const LIVE_VOICE_OPTIONS = [
  { id: "Zephyr", label: "Zephyr" },
  { id: "Kore", label: "Kore" },
  { id: "Puck", label: "Puck" },
  { id: "Fenrir", label: "Fenrir" },
  { id: "Charon", label: "Charon" },
  { id: "Aoede", label: "Aoede" },
];

const SHORT_TOOL_NAMES: Record<string, string> = {
  "cfg-tutor-chat": "Floating AI Chat",
  "cfg-voice-live": "Live Voice & Screen",
  "cfg-summary": "Summary & Study Tabs",
  "cfg-ultrashort": "Quick Hints",
  "cfg-questions": "Question Bank MCQ",
  "cfg-splitter": "Book Auto-Splitter",
  "cfg-tts": "Read-Aloud TTS",
  "cfg-transcribe": "Voice Transcribe",
  "cfg-grounding": "Web Grounding",
};


const DEPRECATED_MODEL_PREFIXES = ["gemini-1.0", "gemini-1.5", "gemini-2.0", "gemini-pro"];

function isSafeGeminiModelId(raw: string): { ok: boolean; reason?: string } {
  const trimmed = raw.trim();
  if (!/^gemini-[a-z0-9][a-z0-9.\-]{1,62}$/i.test(trimmed)) {
    return { ok: false, reason: 'Model ID must start with "gemini-" and use letters, digits, dots, or hyphens.' };
  }
  const lower = trimmed.toLowerCase();
  if (
    DEPRECATED_MODEL_PREFIXES.some(
      (p) => lower === p || lower.startsWith(`${p}-`) || lower.startsWith(`${p}.`)
    )
  ) {
    return { ok: false, reason: "Deprecated Gemini 1.x / 2.0 models are blocked. Use Gemini 3.x or 4.x models." };
  }
  return { ok: true };
}

function getCategoryForTask(taskId: string): AiModelCategory {
  if (taskId === "cfg-voice-live") return "live";
  if (taskId === "cfg-tts") return "tts";
  if (taskId === "cfg-transcribe") return "transcribe";
  return "text";
}

interface RowDraft {
  primaryModel: string;
  voiceName?: string;
  secretSlot: string;
}

interface SettingsHubViewProps {
  defaultTab?: SettingsTabKey;
}

export default function SettingsHubView({ defaultTab = "preferences" }: SettingsHubViewProps) {
  const [toolsTab, setToolsTab] = useState<"general" | "advanced">("general");
  const {
    isAdmin,
    user,
    allUsers,
    subscriptionPlans,
    auditLogs,
    aiModelConfigs,
    customAiModels,
    availableSecretSlots,
    refreshSecretSlots,
    updateAiModelConfig,
    saveCustomAiModel,
    deleteCustomAiModel,
    updateUserAccess,
    notify,
  } = useApp();

  const [tabOverride, setTabOverride] = useState<{
    forDefault: SettingsTabKey;
    tab: SettingsTabKey;
  } | null>(null);

  const activeTab: SettingsTabKey = !isAdmin
    ? "preferences"
    : tabOverride && tabOverride.forDefault === defaultTab
      ? tabOverride.tab
      : defaultTab;

  const setActiveTab = (tab: SettingsTabKey) => {
    setTabOverride({ forDefault: defaultTab, tab });
  };

  // Users & Access tab state
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "learner">("all");
  const [busyUserUid, setBusyUserUid] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.planId.toLowerCase().includes(q)
      );
    });
  }, [allUsers, userSearch, roleFilter]);

  // AI Models Tab — Row-level draft state, per-row live Test state + Add Model Popup Modal
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [testingRowId, setTestingRowId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; latencyMs?: number; message?: string }>
  >({});
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [showRegistryDrawer, setShowRegistryDrawer] = useState(false);
  const [syncingSecrets, setSyncingSecrets] = useState(false);

  // Add Model Modal form fields
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newCategory, setNewCategory] = useState<AiModelCategory>("text");
  const [savingNewModel, setSavingNewModel] = useState(false);

  const defaultSecretSlot = availableSecretSlots[0]?.id || "GEMINI_API_KEY";

  const getRowValues = (cfg: AiModelConfig): RowDraft => {
    const draft = rowDrafts[cfg.id];
    const savedSlot =
      cfg.secretSlot && availableSecretSlots.some((s) => s.id === cfg.secretSlot)
        ? cfg.secretSlot
        : defaultSecretSlot;
    return {
      primaryModel: draft?.primaryModel ?? cfg.primaryModel,
      voiceName: draft?.voiceName ?? cfg.voiceName ?? "Zephyr",
      secretSlot: draft?.secretSlot ?? savedSlot,
    };
  };

  const isRowDirty = (cfg: AiModelConfig): boolean => {
    const draft = rowDrafts[cfg.id];
    if (!draft) return false;
    const isLive = cfg.id === "cfg-voice-live";
    const savedSlot =
      cfg.secretSlot && availableSecretSlots.some((s) => s.id === cfg.secretSlot)
        ? cfg.secretSlot
        : defaultSecretSlot;
    return (
      draft.primaryModel !== cfg.primaryModel ||
      draft.secretSlot !== savedSlot ||
      (isLive && (draft.voiceName || "Zephyr") !== (cfg.voiceName || "Zephyr"))
    );
  };

  const updateRowDraft = (cfg: AiModelConfig, patch: Partial<RowDraft>) => {
    const current = getRowValues(cfg);
    setRowDrafts((prev) => ({
      ...prev,
      [cfg.id]: { ...current, ...patch },
    }));
  };

  const handleSaveRow = async (cfg: AiModelConfig) => {
    const vals = getRowValues(cfg);
    setSavingRowId(cfg.id);
    try {
      const saved = await updateAiModelConfig({
        ...cfg,
        primaryModel: vals.primaryModel,
        isEnabled: cfg.primaryModel ? cfg.isEnabled : true,
        secretSlot: vals.secretSlot,
        ...(cfg.id === "cfg-voice-live" ? { voiceName: vals.voiceName || "Zephyr" } : {}),
      });
      if (!saved) return;
      setRowDrafts((prev) => {
        const next = { ...prev };
        delete next[cfg.id];
        return next;
      });
      setSavedRowId(cfg.id);
      window.setTimeout(() => {
        setSavedRowId((curr) => (curr === cfg.id ? null : curr));
      }, 1600);
    } finally {
      setSavingRowId(null);
    }
  };

  const handleToggleRow = async (cfg: AiModelConfig) => {
    setSavingRowId(cfg.id);
    try {
      await updateAiModelConfig({ ...cfg, isEnabled: !cfg.isEnabled });
    } finally {
      setSavingRowId(null);
    }
  };

  const handleTestRow = async (cfg: AiModelConfig) => {
    const vals = getRowValues(cfg);
    const category = getCategoryForTask(cfg.id);
    setTestingRowId(cfg.id);
    try {
      const res = await fetch("/api/ai/test-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: vals.primaryModel,
          category,
          secretSlot: vals.secretSlot,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; latencyMs?: number; error?: string };
      if (res.ok && data.ok) {
        setTestResults((prev) => ({
          ...prev,
          [cfg.id]: { ok: true, latencyMs: data.latencyMs },
        }));
        notify(
          `${SHORT_TOOL_NAMES[cfg.id] || cfg.taskName}: ${vals.primaryModel} ready (${data.latencyMs ?? 0}ms).`,
          "success"
        );
      } else {
        setTestResults((prev) => ({
          ...prev,
          [cfg.id]: { ok: false, message: data.error || "Model test failed" },
        }));
        notify(data.error || `Model test failed for ${vals.primaryModel}.`, "error");
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [cfg.id]: { ok: false, message: "Network error" },
      }));
      notify("Unable to reach server to test model.", "error");
    } finally {
      setTestingRowId(null);
    }
  };

  const handleAddCustomModel = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = isSafeGeminiModelId(newModelId);
    if (!check.ok) {
      notify(check.reason || "Invalid Gemini model ID.", "error");
      return;
    }
    setSavingNewModel(true);
    try {
      const cleanId = newModelId.trim();
      const safeDocId = `mdl-${cleanId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`.slice(0, 60);
      await saveCustomAiModel({
        id: safeDocId,
        modelId: cleanId,
        displayName: newDisplayName.trim() || cleanId,
        category: newCategory,
        tier: "custom",
        isEnabled: true,
      });
      setNewDisplayName("");
      setNewModelId("");
      setNewCategory("text");
      setIsAddModelOpen(false);
    } finally {
      setSavingNewModel(false);
    }
  };

  const handleToggleUserRole = async (uid: string, currentRole: "admin" | "learner") => {
    setBusyUserUid(uid);
    try {
      await updateUserAccess(uid, { role: currentRole === "admin" ? "learner" : "admin" });
    } finally {
      setBusyUserUid(null);
    }
  };

  const handlePlanChange = async (uid: string, planId: string) => {
    setBusyUserUid(uid);
    try {
      await updateUserAccess(uid, { planId });
    } finally {
      setBusyUserUid(null);
    }
  };

  const tabs: Array<{
    id: SettingsTabKey;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = useMemo(() => {
    const base: Array<{
      id: SettingsTabKey;
      label: string;
      shortLabel: string;
      icon: React.ComponentType<{ className?: string }>;
    }> = [{ id: "preferences", label: "Account & Preferences", shortLabel: "Account", icon: UserCog }];
    if (isAdmin) {
      base.push(
        { id: "users", label: "Users & Access", shortLabel: "Users", icon: Users },
        { id: "models", label: "AI Models", shortLabel: "AI Models", icon: Cpu },
        { id: "api", label: "API Management", shortLabel: "API", icon: KeyRound }
      );
    }
    return base;
  }, [isAdmin]);

  // All enabled custom models grouped cleanly for dropdown options
  const getModelsForRow = (cfg: AiModelConfig): CustomAiModel[] => {
    const cat = getCategoryForTask(cfg.id);
    const compatible = customAiModels.filter(
      (m) => m.isEnabled && (m.category === cat || (cat === "transcribe" && m.category === "text"))
    );
    return compatible;
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-5xl">
      {/* Compact Header + Segmented Tab Bar */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Settings</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            {activeTab === "preferences"
              ? "Account & Preferences"
              : activeTab === "users"
                ? "Users & Access"
                : activeTab === "api" ? "API Management" : "AI Models & Tools"}
          </h1>
        </div>

        {/* Segmented Tabs */}
        <div className="inline-flex max-w-full flex-wrap items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start md:self-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="settingsHubActiveTab"
                    transition={{ type: "spring", stiffness: 450, damping: 36 }}
                    className="absolute inset-0 rounded-lg bg-white shadow-xs border border-slate-200/80"
                  />
                )}
                <Icon className={`w-3.5 h-3.5 relative z-10 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                <span className="relative z-10 sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ================================================================ */}
      {/* TAB 1: ACCOUNT & PREFERENCES                                     */}
      {/* ================================================================ */}
      {activeTab === "preferences" && <AccountPreferencesView embedded />}
      {activeTab === "api" && isAdmin && <ReaderAssistantSettings section="keys" />}

      {/* ================================================================ */}
      {/* TAB 2: USERS & ACCESS (ADMIN ONLY)                               */}
      {/* ================================================================ */}
      {activeTab === "users" && isAdmin && (
        <motion.div
          key="settings-users"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="space-y-4"
        >
          {/* KPI Strip — 2 Per Row on Mobile */}
          <div className="skyx-grid-kpi">
            <div className="rounded-2xl bg-white border border-slate-200/85 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-xs font-medium">Total Users</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">{allUsers.length}</div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200/85 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-xs font-medium">Admins</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {allUsers.filter((u) => u.role === "admin").length}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200/85 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-xs font-medium">Paid Tiers</span>
                <Sparkles className="w-4 h-4 text-violet-500" />
              </div>
              <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {allUsers.filter((u) => u.planId !== "plan-free").length}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200/85 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-xs font-medium">Audit Events</span>
                <Activity className="w-4 h-4 text-amber-500" />
              </div>
              <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">{auditLogs.length}</div>
            </div>
          </div>

          {/* Search + Role Filter + Directory */}
          <div className="rounded-2xl bg-white border border-slate-200/85 p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by name or email..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/70 self-start">
                {(["all", "admin", "learner"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                      roleFilter === r ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {r === "all" ? "All" : r === "admin" ? "Admins" : "Learners"}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isSelf = user?.uid === u.uid;
                const isBusy = busyUserUid === u.uid;
                const initials = (u.displayName || "U")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={u.uid}
                    className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          u.role === "admin"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                          {u.displayName}
                          {isSelf && <span className="text-indigo-600 font-medium ml-1.5">(You)</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                          <span className="truncate">{u.email}</span>
                          <span aria-hidden="true">·</span>
                          <span className={u.role === "admin" ? "text-emerald-700 font-semibold" : "text-slate-600"}>
                            {u.role === "admin" ? "Admin" : "Learner"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{u.studyStreakDays}d</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={u.planId}
                        disabled={isBusy}
                        onChange={(e) => handlePlanChange(u.uid, e.target.value)}
                        className="h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        {subscriptionPlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={isSelf || isBusy}
                        onClick={() => handleToggleUserRole(u.uid, u.role)}
                        className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                          u.role === "admin"
                            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                        }`}
                      >
                        {u.role === "admin" ? "Revoke Admin" : "Grant Admin"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  No users matched your search filter.
                </div>
              )}
            </div>
          </div>

          {/* Recent Audit Log */}
          <div className="rounded-2xl bg-white border border-slate-200/85 p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Shield className="w-4 h-4 text-indigo-600" />
              <h2 className="font-display text-sm font-bold text-slate-900">Recent Audit Log</h2>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {auditLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 text-slate-700">
                    <span className="font-mono text-[11px] font-semibold text-slate-900 mr-2">
                      {log.action}
                    </span>
                    <span>{log.summary}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{log.actorEmail}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ================================================================ */}
      {/* TAB 3: AI MODELS — CLEAN 3-COLUMN COMPACT ROWS + ADD MODEL MODAL */}
      {/* ================================================================ */}
      {activeTab === "models" && isAdmin && (
        <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["general", "advanced"] as const).map(id => <button key={id} type="button" aria-pressed={toolsTab === id}
            onClick={() => setToolsTab(id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${toolsTab === id ? "bg-white text-indigo-800 shadow-sm" : "text-slate-600"}`}>
            {id === "general" ? "General Tools" : "Advanced Tools"}
          </button>)}
        </div>
      )}
      {activeTab === "models" && isAdmin && toolsTab === "advanced" && (
        <ReaderAssistantSettings section="tools" models={customAiModels.filter(m => m.isEnabled && m.category === "live").map(m => m.modelId)} />
      )}
      {activeTab === "models" && isAdmin && toolsTab === "general" && (
        <motion.div
          key="settings-models"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="space-y-4"
        >
          {/* Clean 4-Column Table: Tool & AI Model | Connection Source (From Secret) | Test | Save */}
          <div className="rounded-2xl bg-white border border-slate-200/85 overflow-hidden">
            {/* Desktop Column Header */}
            <div className="hidden md:grid md:grid-cols-[minmax(220px,1.25fr)_minmax(190px,1.05fr)_96px_84px] items-center gap-3.5 px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500">
              <span>Tool &amp; AI Model</span>
              <span>Connection Source</span>
              <span className="text-center">Test</span>
              <span className="text-right">Save</span>
            </div>

            {/* Mobile Column Header */}
            <div className="grid grid-cols-2 md:hidden items-center gap-2 px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500">
              <span>Tool &amp; AI Model</span>
              <span>Connection Source</span>
            </div>

            {/* Tool Rows */}
            <div className="divide-y divide-slate-100">
              {aiModelConfigs.map((cfg) => {
                const isLiveRow = cfg.id === "cfg-voice-live";
                const vals = getRowValues(cfg);
                const dirty = isRowDirty(cfg);
                const isSaving = savingRowId === cfg.id;
                const justSaved = savedRowId === cfg.id;
                const isTesting = testingRowId === cfg.id;
                const testResult = testResults[cfg.id];
                const rowModels = getModelsForRow(cfg);
                const optionIds = Array.from(
                  new Set([
                    ...rowModels.map((m) => m.modelId),
                    vals.primaryModel,
                  ])
                );
                const shortName = SHORT_TOOL_NAMES[cfg.id] || cfg.taskName;

                return (
                  <div
                    key={cfg.id}
                    className="px-3.5 sm:px-4 py-3 hover:bg-slate-50/40 transition-colors grid grid-cols-2 md:grid-cols-[minmax(220px,1.25fr)_minmax(190px,1.05fr)_96px_84px] items-end gap-2.5 md:gap-3.5"
                  >
                    {/* Column 1: Tool Name + On/Off Toggle stacked above AI Model Dropdown */}
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs sm:text-[13px] font-semibold text-slate-900 truncate">
                          {shortName}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleToggleRow(cfg)}
                          disabled={!cfg.primaryModel || savingRowId !== null}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors shrink-0 cursor-pointer ${
                            cfg.isEnabled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}
                          title={cfg.isEnabled ? "Pause tool" : "Enable tool"}
                        >
                          {cfg.primaryModel ? (cfg.isEnabled ? "On" : "Off") : "Setup required"}
                        </button>
                      </div>
                      <select
                        aria-label={`${shortName} AI Model`}
                        value={vals.primaryModel}
                        onChange={(e) => {
                          updateRowDraft(cfg, { primaryModel: e.target.value });
                          setTestResults((prev) => {
                            const next = { ...prev };
                            delete next[cfg.id];
                            return next;
                          });
                        }}
                        className="h-9 w-full px-2.5 rounded-lg border border-slate-200 bg-white font-mono text-[11px] font-medium text-slate-900 focus:outline-none focus:border-indigo-500 truncate"
                      >
                        {optionIds.map((mId) => (
                          <option key={mId} value={mId}>
                            {mId || "Select a model"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Column 2: Connection Source Dropdown (Live Server Secrets) + Voice Selector for Live Voice */}
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-400 mb-1.5 truncate">
                        {isLiveRow ? "Source & Voice" : "Source"}
                      </div>
                      {isLiveRow ? (
                        <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] gap-1.5">
                          <select
                            aria-label={`${shortName} Connection Source`}
                            value={vals.secretSlot}
                            onChange={(e) => {
                              updateRowDraft(cfg, { secretSlot: e.target.value });
                              setTestResults((prev) => {
                                const next = { ...prev };
                                delete next[cfg.id];
                                return next;
                              });
                            }}
                            className="h-9 w-full px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-700 focus:outline-none focus:border-indigo-500 truncate"
                          >
                            {availableSecretSlots.map((slot) => (
                              <option key={slot.id} value={slot.id}>
                                {slot.label}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label="Live Voice Persona"
                            value={vals.voiceName || "Zephyr"}
                            onChange={(e) => updateRowDraft(cfg, { voiceName: e.target.value })}
                            className="h-9 w-full px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-800 focus:outline-none focus:border-indigo-500 truncate"
                          >
                            {LIVE_VOICE_OPTIONS.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <select
                          aria-label={`${shortName} Connection Source`}
                          value={vals.secretSlot}
                          onChange={(e) => {
                            updateRowDraft(cfg, { secretSlot: e.target.value });
                            setTestResults((prev) => {
                              const next = { ...prev };
                              delete next[cfg.id];
                              return next;
                            });
                          }}
                          className="h-9 w-full px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-700 focus:outline-none focus:border-indigo-500 truncate"
                        >
                          {availableSecretSlots.map((slot) => (
                            <option key={slot.id} value={slot.id}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Columns 3 & 4: Compact Test + Save Buttons */}
                    <div className="col-span-2 md:col-span-1 flex items-center justify-end md:contents gap-2">
                      {/* Column 3: Test Button */}
                      <div className="flex md:justify-center">
                        <button
                          type="button"
                          disabled={isTesting || !vals.primaryModel}
                          onClick={() => handleTestRow(cfg)}
                          title={testResult?.message || `Test ${vals.primaryModel}`}
                          className={`h-9 min-w-[88px] px-2.5 rounded-lg text-xs font-semibold border inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
                            testResult?.ok
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : testResult && !testResult.ok
                                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-indigo-300"
                          }`}
                        >
                          {isTesting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                              <span>Wait</span>
                            </>
                          ) : testResult?.ok ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span className="font-mono text-[11px]">
                                {testResult.latencyMs ? `${testResult.latencyMs}ms` : "OK"}
                              </span>
                            </>
                          ) : testResult && !testResult.ok ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Fail</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 text-indigo-600" />
                              <span>Test</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Column 4: Save Button */}
                      <div className="flex md:justify-end">
                        <button
                          type="button"
                          disabled={savingRowId !== null || !vals.primaryModel}
                          onClick={() => handleSaveRow(cfg)}
                          className={`h-9 min-w-[74px] px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0 ${
                            justSaved
                              ? "bg-emerald-600 text-white"
                              : dirty
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {justSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3 h-3" />
                              <span>{isSaving ? "..." : "Save"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Row: + Add API Model & Collapsible Model Registry */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddModelOpen(true)}
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add API Model</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRegistryDrawer((v) => !v)}
              className="h-10 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Models ({customAiModels.length})</span>
              {showRegistryDrawer ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              disabled={syncingSecrets}
              onClick={async () => {
                setSyncingSecrets(true);
                try {
                  await refreshSecretSlots();
                  notify("Synced latest server secrets via live connection.", "success");
                } finally {
                  setSyncingSecrets(false);
                }
              }}
              className="h-10 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${syncingSecrets ? "animate-spin" : ""}`} />
              <span>Sync Secrets ({availableSecretSlots.length})</span>
            </button>
          </div>

          {/* Collapsible Registered Models Manager */}
          <AnimatePresence>
            {showRegistryDrawer && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="rounded-2xl bg-white border border-slate-200/85 divide-y divide-slate-100 overflow-hidden"
              >
                {customAiModels.map((m) => (
                  <div
                    key={m.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{m.displayName}</div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        {m.modelId} · <span className="font-sans capitalize">{m.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => saveCustomAiModel({ ...m, isEnabled: !m.isEnabled })}
                        className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                          m.isEnabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        {m.isEnabled ? "Active" : "Paused"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCustomAiModel(m.id)}
                        aria-label={`Delete ${m.displayName}`}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ================================================================ */}
      {/* ADD API MODEL POPUP MODAL                                        */}
      {/* ================================================================ */}
      <AnimatePresence>
        {isAddModelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setIsAddModelOpen(false)}
            className="fixed inset-0 z-[80] bg-slate-950/45 backdrop-blur-[2px] flex items-center justify-center p-4"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleAddCustomModel}
              className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-slate-900">Add API Model</h3>
                <button
                  type="button"
                  onClick={() => setIsAddModelOpen(false)}
                  aria-label="Close modal"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3.5 text-xs">
                <label className="block">
                  <span className="font-semibold text-slate-700">Model Name</span>
                  <input
                    type="text"
                    required
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="e.g. Gemini 4 Hydrogen"
                    className="mt-1 h-10 w-full px-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block">
                  <span className="font-semibold text-slate-700">Model ID</span>
                  <input
                    type="text"
                    required
                    value={newModelId}
                    onChange={(e) => setNewModelId(e.target.value)}
                    placeholder="e.g. gemini-4-hydrogen or gemini-3.8-live"
                    className="mt-1 h-10 w-full px-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block">
                  <span className="font-semibold text-slate-700">Tool Category</span>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as AiModelCategory)}
                    className="mt-1 h-10 w-full px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="text">Text &amp; Chat</option>
                    <option value="live">Live Voice &amp; Screen</option>
                    <option value="tts">Text-to-Speech (TTS)</option>
                    <option value="transcribe">Audio Transcribe</option>
                  </select>
                </label>

              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModelOpen(false)}
                  className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewModel || !newModelId.trim()}
                  className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {savingNewModel ? "Saving..." : "Save Model"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
