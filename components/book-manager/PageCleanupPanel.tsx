"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eraser,
  EyeOff,
  Replace,
  ScanSearch,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  applyBulkCleanupToProject,
  detectRepeatedHeadersFooters,
  skipLowTextPagesInProject,
  type BulkCleanupOptions,
} from "@/lib/book-engine/cleanup";
import type { SkyxBookProject } from "@/lib/book-engine/types";

interface PageCleanupPanelProps {
  project: SkyxBookProject;
  onUpdateProject: (next: SkyxBookProject) => void;
  onNotify: (message: string, tone?: "info" | "success" | "error") => void;
}

export default function PageCleanupPanel({
  project,
  onUpdateProject,
  onNotify,
}: PageCleanupPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const [stripPageNumbers, setStripPageNumbers] = useState(true);
  const [fixHyphenLineWraps, setFixHyphenLineWraps] = useState(true);
  const [normalizeBanglaUnicode, setNormalizeBanglaUnicode] = useState(true);
  const [joinBrokenParagraphs, setJoinBrokenParagraphs] = useState(false);
  const [selectedLinesToRemove, setSelectedLinesToRemove] = useState<string[]>([]);
  const [customRemoveLine, setCustomRemoveLine] = useState("");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  const detectedRunningLines = useMemo(
    () => detectRepeatedHeadersFooters(project.pages),
    [project.pages]
  );

  const toggleDetectedLine = (line: string) => {
    setSelectedLinesToRemove((prev) =>
      prev.includes(line) ? prev.filter((item) => item !== line) : [...prev, line]
    );
  };

  const handleRunBulkCleanup = () => {
    const extraLines = customRemoveLine
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const options: BulkCleanupOptions = {
      stripPageNumbers,
      fixHyphenLineWraps,
      normalizeBanglaUnicode,
      joinBrokenParagraphs,
      removeLinesExact: Array.from(new Set([...selectedLinesToRemove, ...extraLines])),
      findText: findText || undefined,
      replaceText,
    };

    const { project: updated, modifiedCount } = applyBulkCleanupToProject(project, options);
    onUpdateProject(updated);

    if (modifiedCount > 0) {
      onNotify(`Cleaned ${modifiedCount} active page(s) successfully.`, "success");
    } else {
      onNotify("All active pages already look clean for the selected rules.", "info");
    }
  };

  const handleSkipLowText = () => {
    const { project: updated, skippedCount } = skipLowTextPagesInProject(project);
    onUpdateProject(updated);
    if (skippedCount > 0) {
      onNotify(`Marked ${skippedCount} low-text / likely scanned page(s) as Skipped.`, "success");
    } else {
      onNotify("No unskipped low-text pages found.", "info");
    }
  };

  const handleQuickAutoClean = () => {
    const autoLines = detectedRunningLines.map((d) => d.text);
    const { project: updated, modifiedCount } = applyBulkCleanupToProject(project, {
      stripPageNumbers: true,
      fixHyphenLineWraps: true,
      normalizeBanglaUnicode: true,
      joinBrokenParagraphs: false,
      removeLinesExact: autoLines,
    });
    onUpdateProject(updated);
    onNotify(
      modifiedCount > 0
        ? `Smart Auto-Clean updated ${modifiedCount} page(s)${autoLines.length ? ` & stripped ${autoLines.length} running header/footer pattern(s)` : ""}.`
        : "Pages are already clean.",
      "success"
    );
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
      {/* Compact Top Control Bar */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 bg-gradient-to-r from-slate-50/90 to-indigo-50/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Wand2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Smart Bulk Page Cleanup Engine</span>
              {detectedRunningLines.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold">
                  {detectedRunningLines.length} repeated header/footer detected
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Strip page numbers, headers/footers, fix Bangla spacing & hyphen wraps across all active pages.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleQuickAutoClean}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Smart Clean</span>
          </button>

          {project.extraction.scannedPageCount > 0 && (
            <button
              type="button"
              onClick={handleSkipLowText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Skip {project.extraction.scannedPageCount} Low-Text</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>{expanded ? "Hide Rules" : "Custom Rules & Find/Replace"}</span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Granular Cleanup Studio */}
      {expanded && (
        <div className="p-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Column 1: Cleanup Rules Checkboxes */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Text Normalization Rules
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={stripPageNumbers}
                onChange={(e) => setStripPageNumbers(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600"
              />
              <span>
                <strong className="text-slate-900">Strip standalone page numbers</strong>
                <span className="block text-[11px] text-slate-500">
                  Removes standalone page number lines such as &quot;12&quot; and &quot;Page 5&quot;.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={normalizeBanglaUnicode}
                onChange={(e) => setNormalizeBanglaUnicode(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600"
              />
              <span>
                <strong className="text-slate-900">Bangla Unicode & Danda (।) fix</strong>
                <span className="block text-[11px] text-slate-500">
                  NFC normalization, zero-width char removal & punctuation spacing
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={fixHyphenLineWraps}
                onChange={(e) => setFixHyphenLineWraps(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600"
              />
              <span>
                <strong className="text-slate-900">Rejoin hyphenated line wraps</strong>
                <span className="block text-[11px] text-slate-500">
                  Joins broken words split across PDF line ends
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={joinBrokenParagraphs}
                onChange={(e) => setJoinBrokenParagraphs(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600"
              />
              <span>
                <strong className="text-slate-900">Reflow broken PDF paragraphs</strong>
                <span className="block text-[11px] text-slate-500">
                  Merges hard-wrapped lines while preserving headings & bullet lists
                </span>
              </span>
            </label>
          </div>

          {/* Column 2: Detected Running Headers & Footers */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ScanSearch className="w-3.5 h-3.5 text-indigo-500" />
              <span>Repeated Headers / Footers</span>
            </div>

            {detectedRunningLines.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {detectedRunningLines.map((item) => {
                  const checked = selectedLinesToRemove.includes(item.text);
                  return (
                    <button
                      key={item.text}
                      type="button"
                      onClick={() => toggleDetectedLine(item.text)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        checked
                          ? "bg-rose-50 border-rose-300 text-rose-800"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300"
                      }`}
                    >
                      <span className="truncate font-medium">{item.text}</span>
                      <span className="font-mono text-[10px] shrink-0 opacity-80">
                        {item.occurrences}× ({item.position})
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5">
                No repeated top/bottom lines detected across pages (requires 3+ active pages).
              </p>
            )}

            <textarea
              value={customRemoveLine}
              onChange={(e) => setCustomRemoveLine(e.target.value)}
              rows={2}
              placeholder="Custom exact header/footer lines to remove (1 per line)..."
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px] focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Column 3: Bulk Find & Replace + Apply */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Replace className="w-3.5 h-3.5 text-indigo-500" />
                <span>Bulk Find & Replace (All Active Pages)</span>
              </div>
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="Find exact text (e.g. broken watermark or symbol)..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-400"
              />
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace with (leave empty to delete)..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-400"
              />
            </div>

            <button
              type="button"
              onClick={handleRunBulkCleanup}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Apply Selected Cleanup Rules to All Pages</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
