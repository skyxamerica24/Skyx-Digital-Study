"use client";

import React, { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  ClipboardPaste,
  FileText,
  GitMerge,
  GripVertical,
  ListTree,
  PenSquare,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  addChapterToProject,
  applyBatchRangeToc,
  autoDetectChaptersFromCleanedPages,
  mergeChapterWithNextInProject,
  normalizeChapterSequence,
  parseBatchRangeInput,
  reorderChaptersInProject,
  syncChaptersFromPageRanges,
} from "@/lib/book-engine/toc-engine";
import type { BookChapterNode, SkyxBookProject } from "@/lib/book-engine/types";

interface TocOrganizerPanelProps {
  project: SkyxBookProject;
  onUpdateProject: (next: SkyxBookProject) => void;
  onNotify: (message: string, tone?: "info" | "success" | "error") => void;
  onJumpToPage?: (pageNumber: number) => void;
  onOpenInEditor?: (chapterId: string) => void;
}

interface SortableChapterCardProps {
  chapter: BookChapterNode;
  index: number;
  totalChapters: number;
  maxPage: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<BookChapterNode>) => void;
  onMergeNext: () => void;
  onDelete: () => void;
}

function SortableChapterCard({
  chapter,
  index,
  totalChapters,
  maxPage,
  isSelected,
  onSelect,
  onUpdate,
  onMergeNext,
  onDelete,
}: SortableChapterCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  };

  const levelIndent =
    chapter.level === 2 ? "ml-4" : chapter.level === 3 ? "ml-8" : "";

  const statusTone =
    chapter.status === "ready"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : chapter.status === "reviewed"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : "bg-slate-100 text-slate-600 border-slate-200";

  const cycleLevel = () => {
    const nextLevel: 1 | 2 | 3 =
      chapter.level === 1 ? 2 : chapter.level === 2 ? 3 : 1;
    onUpdate({ level: nextLevel });
  };

  const cycleStatus = () => {
    const nextStatus: BookChapterNode["status"] =
      chapter.status === "draft"
        ? "reviewed"
        : chapter.status === "reviewed"
        ? "ready"
        : "draft";
    onUpdate({ status: nextStatus });
  };

  const wordCount = chapter.contentMarkdown.trim()
    ? chapter.contentMarkdown.trim().split(/\s+/).length
    : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`${levelIndent} rounded-2xl border p-3 transition-all ${
        isDragging
          ? "bg-indigo-50 border-indigo-400 shadow-lg opacity-95"
          : isSelected
          ? "bg-indigo-50/60 border-indigo-400 shadow-xs"
          : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-grab active:cursor-grabbing shrink-0"
          title="Drag to reorder chapter"
          aria-label="Drag to reorder chapter"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Main Editable Row */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cycleLevel();
              }}
              className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-mono text-[10px] font-bold cursor-pointer shrink-0"
              title="Click to cycle heading depth (H1 / H2 / H3)"
            >
              H{chapter.level}
            </button>

            <input
              type="text"
              value={chapter.title}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="flex-1 min-w-[160px] px-2 py-1 rounded-lg border border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
              placeholder="Chapter title..."
            />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cycleStatus();
              }}
              className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase cursor-pointer shrink-0 ${statusTone}`}
              title="Click to cycle status (Draft -> Reviewed -> Ready)"
            >
              {chapter.status}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            {/* Page Range Mapper */}
            <div
              className="flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-slate-500 font-medium">Pages:</span>
              <input
                type="number"
                min={1}
                max={maxPage || 1}
                value={chapter.pageStart ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  onUpdate({ pageStart: val });
                }}
                placeholder="Start"
                className="w-16 px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-mono text-slate-800 focus:outline-none focus:border-indigo-400"
              />
              <span className="text-slate-400">–</span>
              <input
                type="number"
                min={1}
                max={maxPage || 1}
                value={chapter.pageEnd ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  onUpdate({ pageEnd: val });
                }}
                placeholder="End"
                className="w-16 px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-mono text-slate-800 focus:outline-none focus:border-indigo-400"
              />
              <span className="text-[10.5px] font-mono text-slate-400 ml-1">
                {wordCount.toLocaleString()}w
              </span>
            </div>

            {/* Chapter Actions */}
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {index < totalChapters - 1 && (
                <button
                  type="button"
                  onClick={onMergeNext}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-medium text-slate-600 hover:bg-slate-100 hover:text-indigo-700 cursor-pointer"
                  title="Merge with next chapter below"
                >
                  <GitMerge className="w-3 h-3" />
                  <span>Merge</span>
                </button>
              )}
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                title="Delete chapter"
                aria-label="Delete chapter"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TocOrganizerPanel({
  project,
  onUpdateProject,
  onNotify,
  onJumpToPage,
  onOpenInEditor,
}: TocOrganizerPanelProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    project.chapters[0]?.id ?? null
  );
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [newChTitle, setNewChTitle] = useState("");
  const [newChStart, setNewChStart] = useState("");
  const [newChEnd, setNewChEnd] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const batchPreview = useMemo(
    () => parseBatchRangeInput(batchText, project.pages.length),
    [batchText, project.pages.length]
  );

  const activePages = useMemo(
    () => project.pages.filter((p) => p.status !== "skipped"),
    [project.pages]
  );
  const mappedActiveCount = useMemo(
    () => activePages.filter((p) => p.chapterId !== null).length,
    [activePages]
  );
  const coveragePct =
    activePages.length > 0
      ? Math.round((mappedActiveCount / activePages.length) * 100)
      : 0;

  const selectedChapter = useMemo(() => {
    return (
      project.chapters.find((c) => c.id === selectedChapterId) ??
      project.chapters[0] ??
      null
    );
  }, [project.chapters, selectedChapterId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = project.chapters.findIndex((c) => c.id === active.id);
    const newIndex = project.chapters.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const updated = reorderChaptersInProject(project, oldIndex, newIndex);
    onUpdateProject(updated);
    onNotify("Updated TOC chapter order.", "info");
  };

  const handleUpdateChapter = (
    chapterId: string,
    patch: Partial<BookChapterNode>
  ) => {
    const nextChapters = project.chapters.map((c) =>
      c.id === chapterId ? { ...c, ...patch } : c
    );
    const shouldResync = "pageStart" in patch || "pageEnd" in patch;
    if (shouldResync) {
      onUpdateProject(syncChaptersFromPageRanges(project, nextChapters));
    } else {
      onUpdateProject({
        ...project,
        updatedAt: new Date().toISOString(),
        chapters: normalizeChapterSequence(nextChapters),
      });
    }
  };

  const handleDeleteChapter = (chapterId: string) => {
    const nextChapters = normalizeChapterSequence(
      project.chapters.filter((c) => c.id !== chapterId)
    );
    const nextPages = project.pages.map((p) =>
      p.chapterId === chapterId ? { ...p, chapterId: null } : p
    );
    onUpdateProject({
      ...project,
      updatedAt: new Date().toISOString(),
      pages: nextPages,
      chapters: nextChapters,
    });
    if (selectedChapterId === chapterId) {
      setSelectedChapterId(nextChapters[0]?.id ?? null);
    }
    onNotify("Chapter removed from TOC.", "info");
  };

  const handleMergeNext = (chapterId: string) => {
    const updated = mergeChapterWithNextInProject(project, chapterId);
    onUpdateProject(updated);
    onNotify("Merged chapter with the next section below.", "success");
  };

  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    const start = newChStart ? Number(newChStart) : null;
    const end = newChEnd ? Number(newChEnd) : start;
    const updated = addChapterToProject(project, newChTitle, start, end, 1);
    onUpdateProject(updated);
    const created = updated.chapters[updated.chapters.length - 1];
    if (created) setSelectedChapterId(created.id);
    setNewChTitle("");
    setNewChStart("");
    setNewChEnd("");
    onNotify("Added new chapter to TOC.", "success");
  };

  const handleSyncAll = () => {
    const synced = syncChaptersFromPageRanges(project);
    onUpdateProject(synced);
    onNotify(
      `Synced all ${synced.chapters.length} chapter(s) from your cleaned page ranges.`,
      "success"
    );
  };

  const handleAutoDetect = () => {
    const { project: updated, detectedCount } =
      autoDetectChaptersFromCleanedPages(project);
    if (detectedCount === 0) {
      onNotify(
        "No standard chapter headings detected. Try Batch Paste TOC or add page ranges manually.",
        "info"
      );
      return;
    }
    onUpdateProject(updated);
    setSelectedChapterId(updated.chapters[0]?.id ?? null);
    onNotify(
      `Auto-detected ${detectedCount} chapter(s) from cleaned pages.`,
      "success"
    );
  };

  const handleApplyBatchToc = () => {
    const { project: updated, count } = applyBatchRangeToc(project, batchText);
    if (count === 0) {
      onNotify("Could not parse any chapter lines. Example: Chapter 1 | 1-14", "error");
      return;
    }
    onUpdateProject(updated);
    setSelectedChapterId(updated.chapters[0]?.id ?? null);
    setShowBatchPanel(false);
    setBatchText("");
    onNotify(`Created & mapped ${count} chapter(s) from Batch TOC!`, "success");
  };

  return (
    <div className="space-y-4">
      {/* Top Coverage & Smart Organizer Toolbar */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <ListTree className="w-4 h-4 text-indigo-600" />
              <span>Interactive TOC & Chapter Organizer</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                Drag & Drop Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Drag chapters to reorder, assign page ranges (e.g., 10–28), or batch-paste your entire Table of Contents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBatchPanel((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                showBatchPanel
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Batch Paste TOC</span>
            </button>

            <button
              type="button"
              onClick={handleAutoDetect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Auto-Detect</span>
            </button>

            <button
              type="button"
              onClick={handleSyncAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Pages → Chapters</span>
            </button>
          </div>
        </div>

        {/* Mapping Coverage Progress Bar */}
        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-600 shrink-0">
            Mapped: {mappedActiveCount}/{activePages.length} active pages ({coveragePct}%)
          </span>
        </div>
      </div>

      {/* Batch TOC / Page-Range Importer Panel */}
      {showBatchPanel && (
        <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-indigo-950">
                Fast Batch TOC & Page-Range Mapper (Bangla + English)
              </h4>
              <p className="text-[11px] text-indigo-800/85">
                Enter 1 chapter per line: <code className="px-1 py-0.5 rounded bg-white/80 font-mono">অধ্যায় ১: কোষ ও এর গঠন | 1-14</code> or prefix <code className="px-1 py-0.5 rounded bg-white/80 font-mono">--</code> for sub-sections. End pages auto-fill if omitted.
              </p>
            </div>
            <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
              Parsed: {batchPreview.length} entries · Book has {project.pages.length} pages
            </span>
          </div>

          <textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            rows={5}
            placeholder={`অধ্যায় ১: কোষ ও এর গঠন | 1-12\n-- সেকশন ১.১: কোষের অঙ্গাণু | 3-7\nঅধ্যায় ২: কোষ বিভাজন | 13-25\nChapter 3: Cell Chemistry | 26`}
            className="w-full rounded-xl border border-indigo-200 bg-white p-3 text-xs font-sans leading-relaxed focus:outline-none focus:border-indigo-500"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {batchPreview.slice(0, 5).map((item, idx) => (
                <span
                  key={idx}
                  className="text-[10.5px] px-2 py-0.5 rounded-lg bg-white border border-indigo-200 text-indigo-800 font-medium"
                >
                  H{item.level} · {item.title.slice(0, 26)}
                  {item.pageStart ? ` (${item.pageStart}–${item.pageEnd ?? item.pageStart})` : ""}
                </span>
              ))}
              {batchPreview.length > 5 && (
                <span className="text-[10.5px] text-indigo-700 font-semibold self-center">
                  +{batchPreview.length - 5} more
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBatchPanel(false)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={batchPreview.length === 0}
                onClick={handleApplyBatchToc}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-45 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply & Map Pages</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Main Organizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Draggable Sortable TOC Tree + Quick Add */}
        <div className="lg:col-span-7 space-y-3">
          {/* Quick Add Chapter Form */}
          <form
            onSubmit={handleAddChapter}
            className="rounded-2xl bg-white border border-slate-200 p-3 shadow-xs flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={newChTitle}
              onChange={(e) => setNewChTitle(e.target.value)}
              placeholder="New chapter or section title..."
              className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-400"
            />
            <input
              type="number"
              min={1}
              max={project.pages.length || 1}
              value={newChStart}
              onChange={(e) => setNewChStart(e.target.value)}
              placeholder="Start"
              className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-400"
            />
            <input
              type="number"
              min={1}
              max={project.pages.length || 1}
              value={newChEnd}
              onChange={(e) => setNewChEnd(e.target.value)}
              placeholder="End"
              className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          {/* Sortable List */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={project.chapters.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {project.chapters.map((ch, idx) => (
                  <SortableChapterCard
                    key={ch.id}
                    chapter={ch}
                    index={idx}
                    totalChapters={project.chapters.length}
                    maxPage={project.pages.length}
                    isSelected={selectedChapter?.id === ch.id}
                    onSelect={() => setSelectedChapterId(ch.id)}
                    onUpdate={(patch) => handleUpdateChapter(ch.id, patch)}
                    onMergeNext={() => handleMergeNext(ch.id)}
                    onDelete={() => handleDeleteChapter(ch.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {project.chapters.length === 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-xs text-slate-400">
              No chapters yet. Click &quot;Batch Paste TOC&quot;, &quot;Auto-Detect&quot;, or add a chapter above.
            </div>
          )}
        </div>

        {/* Right: Active Chapter Compiled Preview */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col gap-3 h-fit sticky top-20">
          {selectedChapter ? (
            <>
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-600">
                    Chapter {selectedChapter.chapterNumber} · Depth H{selectedChapter.level}
                  </span>
                  <h4 className="font-display text-sm font-bold text-slate-900 truncate">
                    {selectedChapter.title}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onOpenInEditor && (
                    <button
                      type="button"
                      onClick={() => onOpenInEditor(selectedChapter.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      <PenSquare className="w-3 h-3" />
                      <span>Visual Edit</span>
                    </button>
                  )}
                  {selectedChapter.pageStart && onJumpToPage && (
                    <button
                      type="button"
                      onClick={() => onJumpToPage(selectedChapter.pageStart!)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>P.{selectedChapter.pageStart}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>
                  Range:{" "}
                  <strong className="text-slate-800 font-mono">
                    {selectedChapter.pageStart && selectedChapter.pageEnd
                      ? `Pages ${selectedChapter.pageStart}–${selectedChapter.pageEnd}`
                      : "Not mapped"}
                  </strong>
                </span>
                <span className="font-mono">
                  {selectedChapter.contentMarkdown.trim()
                    ? `${selectedChapter.contentMarkdown.trim().split(/\s+/).length.toLocaleString()} words`
                    : "0 words"}
                </span>
              </div>

              <textarea
                value={selectedChapter.contentMarkdown}
                onChange={(e) =>
                  handleUpdateChapter(selectedChapter.id, {
                    contentMarkdown: e.target.value,
                  })
                }
                rows={16}
                placeholder="Click 'Sync Pages -> Chapters' or edit chapter Markdown directly..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs leading-relaxed text-slate-800 font-sans focus:outline-none focus:bg-white focus:border-indigo-400 resize-y"
              />
            </>
          ) : (
            <div className="py-14 text-center text-xs text-slate-400">
              Select any chapter on the left to inspect or edit its compiled content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
