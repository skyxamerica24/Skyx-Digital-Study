"use client";

import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  BookMarked,
  CheckCircle2,
  CreditCard,
  FileEdit,
  FileUp,
  FolderTree,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";
import { MODEL_3D_CATALOG } from "@/lib/three-models";
import type { BookLanguage, ImportJobStatus, Model3DKey } from "@/lib/types";

export default function AdminExtendedSections() {
  const {
    adminRoute,
    curriculums,
    subjects,
    syllabi,
    books,
    topics,
    questions,
    importJobs,
    auditLogs,
    subscriptionPlans,
    subscriptions,
    aiModelConfigs,
    allUsers,
    saveCurriculum,
    deleteCurriculum,
    saveSubject,
    deleteSubject,
    saveSyllabus,
    deleteSyllabus,
    saveImportJob,
    saveSingleTopic,
  } = useApp();

  const [currName, setCurrName] = useState("");
  const [currDesc, setCurrDesc] = useState("");
  const [subjCurrId, setSubjCurrId] = useState(curriculums[0]?.id || "");
  const [subjCode, setSubjCode] = useState("");
  const [subjName, setSubjName] = useState("");
  const [subjLang, setSubjLang] = useState<BookLanguage>("bilingual");
  const [sylCurrId] = useState(curriculums[0]?.id || "");
  const [sylSubjId, setSylSubjId] = useState(subjects[0]?.id || "");
  const [sylTitle, setSylTitle] = useState("");
  const [sylTarget, setSylTarget] = useState("HSC + Admission");

  const [jobBookId, setJobBookId] = useState(books[0]?.id || "");
  const [jobFileName, setJobFileName] = useState("");
  const [jobSourceType, setJobSourceType] = useState<"text" | "markdown" | "pdf" | "docx" | "epub">("markdown");

  const [editorTopicId, setEditorTopicId] = useState(topics[0]?.id || "");
  const selectedEditorTopic = useMemo(
    () => topics.find((t) => t.id === editorTopicId) || topics[0] || null,
    [topics, editorTopicId]
  );
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const [draftSection, setDraftSection] = useState<string | null>(null);
  const [draftMarkdown, setDraftMarkdown] = useState<string | null>(null);
  const [draftModel3d, setDraftModel3d] = useState<Model3DKey | null>(null);

  const [testQuery, setTestQuery] = useState("SA Node");

  const selectTopicForEditor = (topicId: string) => {
    setEditorTopicId(topicId);
    setDraftTitle(null);
    setDraftSection(null);
    setDraftMarkdown(null);
    setDraftModel3d(null);
  };

  if (adminRoute === "academic") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Catalog Structure</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage Curriculums, Subjects, and Exam-Targeted Syllabi persisted in PostgreSQL with audit logging.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FolderTree className="w-4 h-4 text-indigo-600" />
              <span>Curriculums ({curriculums.length})</span>
            </div>
            <div className="space-y-2 text-xs">
              <input
                type="text"
                placeholder="Curriculum name (e.g., University Engineering)"
                value={currName}
                onChange={(e) => setCurrName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
              <input
                type="text"
                placeholder="Short description"
                value={currDesc}
                onChange={(e) => setCurrDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
              <button
                onClick={async () => {
                  if (!currName.trim()) return;
                  await saveCurriculum({
                    id: "",
                    slug: currName.toLowerCase().replace(/\s+/g, "-"),
                    name: currName.trim(),
                    description: currDesc.trim() || "Structured curriculum track.",
                    orderIndex: curriculums.length + 1,
                    isPublished: true,
                  });
                  setCurrName("");
                  setCurrDesc("");
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Curriculum
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {curriculums.map((c) => (
                <div key={c.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{c.name}</div>
                    <div className="text-[11px] text-slate-500">{c.description}</div>
                  </div>
                  <button
                    onClick={() => deleteCurriculum(c.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    aria-label="Delete curriculum"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <BookMarked className="w-4 h-4 text-emerald-600" />
              <span>Subjects ({subjects.length})</span>
            </div>
            <div className="space-y-2 text-xs">
              <select
                value={subjCurrId}
                onChange={(e) => setSubjCurrId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                {curriculums.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Code"
                  value={subjCode}
                  onChange={(e) => setSubjCode(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 font-mono"
                />
                <input
                  type="text"
                  placeholder="Subject name"
                  value={subjName}
                  onChange={(e) => setSubjName(e.target.value)}
                  className="col-span-2 px-2.5 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <select
                value={subjLang}
                onChange={(e) => setSubjLang(e.target.value as BookLanguage)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="bilingual">Bilingual (EN + Bangla)</option>
                <option value="en">English</option>
                <option value="bn">Bangla</option>
              </select>
              <button
                onClick={async () => {
                  if (!subjName.trim()) return;
                  await saveSubject({
                    id: "",
                    curriculumId: subjCurrId || curriculums[0]?.id || "curr-academic",
                    code: subjCode.trim() || "SUB-101",
                    name: subjName.trim(),
                    language: subjLang,
                    description: "Core academic subject.",
                    orderIndex: subjects.length + 1,
                    isPublished: true,
                  });
                  setSubjCode("");
                  setSubjName("");
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Subject
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {subjects.map((s) => (
                <div key={s.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      <span className="font-mono text-indigo-600 mr-1.5">{s.code}</span>
                      {s.name}
                    </div>
                    <div className="text-[11px] text-slate-500">{s.description}</div>
                  </div>
                  <button
                    onClick={() => deleteSubject(s.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    aria-label="Delete subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-violet-600" />
              <span>Syllabi ({syllabi.length})</span>
            </div>
            <div className="space-y-2 text-xs">
              <select
                value={sylSubjId}
                onChange={(e) => setSylSubjId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Syllabus title"
                value={sylTitle}
                onChange={(e) => setSylTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
              <input
                type="text"
                placeholder="Exam target (e.g., MBBS / 47th BCS)"
                value={sylTarget}
                onChange={(e) => setSylTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
              <button
                onClick={async () => {
                  if (!sylTitle.trim()) return;
                  await saveSyllabus({
                    id: "",
                    curriculumId: sylCurrId || curriculums[0]?.id || "curr-academic",
                    subjectId: sylSubjId || subjects[0]?.id || "subj-bio",
                    title: sylTitle.trim(),
                    examTarget: sylTarget.trim() || "Board & Competitive",
                    academicYear: "2026-2027",
                    chaptersSummary: "Mapped to Skyx Academy digital textbooks.",
                    isPublished: true,
                  });
                  setSylTitle("");
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Syllabus
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {syllabi.map((syl) => (
                <div key={syl.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{syl.title}</div>
                    <div className="text-[11px] text-indigo-600 font-medium">
                      {syl.examTarget} · {syl.academicYear}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSyllabus(syl.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    aria-label="Delete syllabus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (adminRoute === "processing") {
    const statuses: ImportJobStatus[] = [
      "queued",
      "extracting",
      "ocr_running",
      "ai_splitting",
      "admin_review",
      "published",
      "failed",
    ];
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Book Processing & Ingestion Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track textbook ingestion states from raw upload through AI splitting, editorial review, and publication.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
          <label className="block">
            <span className="font-semibold text-slate-600">Target Book</span>
            <select
              value={jobBookId}
              onChange={(e) => setJobBookId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-semibold text-slate-600">Source Filename</span>
            <input
              type="text"
              placeholder="e.g., hsc_chemistry_ch3.md"
              value={jobFileName}
              onChange={(e) => setJobFileName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-600">Format</span>
            <select
              value={jobSourceType}
              onChange={(e) => setJobSourceType(e.target.value as typeof jobSourceType)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            >
              <option value="markdown">Markdown (.md)</option>
              <option value="text">Plain Text (.txt)</option>
              <option value="pdf">PDF (queued for OCR)</option>
              <option value="docx">DOCX</option>
              <option value="epub">EPUB</option>
            </select>
          </label>
          <button
            onClick={async () => {
              if (!jobFileName.trim()) return;
              const book = books.find((b) => b.id === jobBookId) || books[0];
              await saveImportJob({
                id: "",
                bookId: book?.id || "book-bio-physiology",
                bookTitle: book?.title || "Untitled Book",
                sourceFileName: jobFileName.trim(),
                sourceType: jobSourceType,
                status: "queued",
                progressPercent: 10,
                topicsDetected: 0,
                notes: "Queued from Admin Book Processing Console.",
                createdBy: "admin",
              });
              setJobFileName("");
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
          >
            <FileUp className="w-3.5 h-3.5" />
            Queue Import Job
          </button>
        </div>

        <div className="space-y-3">
          {importJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-[240px]">
                <div className="text-sm font-bold text-slate-900">{job.bookTitle}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {job.sourceFileName} · {job.sourceType.toUpperCase()} · {job.topicsDetected} topics detected
                </div>
                {job.notes && <div className="text-xs text-slate-600">{job.notes}</div>}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-32">
                  <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
                    <span>Progress</span>
                    <span>{job.progressPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${job.progressPercent}%` }}
                    />
                  </div>
                </div>

                <select
                  value={job.status}
                  onChange={(e) => {
                    const nextStatus = e.target.value as ImportJobStatus;
                    const progressMap: Record<ImportJobStatus, number> = {
                      queued: 10,
                      extracting: 30,
                      ocr_running: 50,
                      ai_splitting: 70,
                      admin_review: 85,
                      published: 100,
                      failed: job.progressPercent,
                    };
                    saveImportJob({
                      ...job,
                      status: nextStatus,
                      progressPercent: progressMap[nextStatus],
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                >
                  {statuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (adminRoute === "editor") {
    const activeTitle = draftTitle ?? selectedEditorTopic?.topicTitle ?? "";
    const activeSection = draftSection ?? selectedEditorTopic?.sectionTitle ?? "";
    const activeMarkdown = draftMarkdown ?? selectedEditorTopic?.contentMarkdown ?? "";
    const activeModel3d = draftModel3d ?? selectedEditorTopic?.model3dKey ?? "";

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Split-Pane Book Content Editor</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Edit bilingual Markdown textbook topics side-by-side with live scholarly preview and 3D lab bindings.
            </p>
          </div>
          {selectedEditorTopic && (
            <button
              onClick={async () => {
                await saveSingleTopic({
                  ...selectedEditorTopic,
                  topicTitle: activeTitle.trim() || selectedEditorTopic.topicTitle,
                  sectionTitle: activeSection.trim() || selectedEditorTopic.sectionTitle,
                  contentMarkdown: activeMarkdown,
                  model3dKey: activeModel3d,
                });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5" />
              Save Topic Changes
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-3 rounded-2xl bg-white border border-slate-200 p-4 shadow-xs max-h-[640px] overflow-y-auto space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 pb-2 border-b border-slate-100">
              <FileEdit className="w-3.5 h-3.5 text-indigo-600" />
              <span>Book Topics ({topics.length})</span>
            </div>
            {topics.map((t) => {
              const isSelected = selectedEditorTopic?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTopicForEditor(t.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-900 border border-indigo-200 font-semibold"
                      : "hover:bg-slate-50 text-slate-700 border border-transparent"
                  }`}
                >
                  <div className="truncate">{t.topicTitle}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{t.chapterTitle}</div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-9 space-y-4">
            {selectedEditorTopic ? (
              <>
                <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <label className="block">
                    <span className="font-semibold text-slate-600">Topic Title</span>
                    <input
                      type="text"
                      value={activeTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-slate-600">Section</span>
                    <input
                      type="text"
                      value={activeSection}
                      onChange={(e) => setDraftSection(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-slate-600">Linked 3D Model</span>
                    <select
                      value={activeModel3d}
                      onChange={(e) => setDraftModel3d(e.target.value as Model3DKey)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="">None</option>
                      {MODEL_3D_CATALOG.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col">
                    <div className="text-xs font-bold text-slate-600 mb-2">Markdown Source</div>
                    <textarea
                      value={activeMarkdown}
                      onChange={(e) => setDraftMarkdown(e.target.value)}
                      rows={18}
                      className="w-full flex-1 font-mono text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs max-h-[500px] overflow-y-auto">
                    <div className="text-xs font-bold text-indigo-600 mb-3">Live Reader Preview</div>
                    <div className="prose prose-sm max-w-none prose-slate">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeMarkdown}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl bg-white border border-slate-200 p-8 text-xs text-slate-500">
                Select a topic from the left to begin editing.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (adminRoute === "search-ops") {
    const q = testQuery.trim().toLowerCase();
    const matchedTopics = q
      ? topics.filter(
          (t) =>
            t.topicTitle.toLowerCase().includes(q) ||
            t.contentMarkdown.toLowerCase().includes(q) ||
            t.chapterTitle.toLowerCase().includes(q)
        )
      : topics;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Search & Knowledge Coverage</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Inspect indexed books, topics, and bilingual keyword match quality across the Skyx Academy library.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <div className="text-xs text-slate-500">Indexed Books</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{books.length}</div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <div className="text-xs text-slate-500">Searchable Topics</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{topics.length}</div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <div className="text-xs text-slate-500">Indexed Questions</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{questions.length}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-600" />
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Test bilingual search query (e.g., SA Node, heart, Balmer)"
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div className="text-xs text-slate-500">
            Matched <span className="font-bold text-slate-900">{matchedTopics.length}</span> topics for “{testQuery}”
          </div>
          <div className="divide-y divide-slate-100">
            {matchedTopics.slice(0, 8).map((t) => (
              <div key={t.id} className="py-2.5">
                <div className="text-xs font-bold text-slate-900">{t.topicTitle}</div>
                <div className="text-[11px] text-slate-500">{t.chapterTitle}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (adminRoute === "billing") {
    const mrr = subscriptions
      .filter((s) => s.status === "active")
      .reduce((acc, s) => acc + (s.amount || 0), 0);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Membership & Billing Operations</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor active plans, entitlement tiers, and subscription records across learners.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <div className="text-xs text-slate-500">Configured Plans</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{subscriptionPlans.length}</div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <div className="text-xs text-slate-500">Active Subscriptions</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {subscriptions.filter((s) => s.status === "active").length}
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <div className="text-xs text-slate-500">Recorded Monthly Volume</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">BDT {mrr}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscriptionPlans.map((plan) => (
            <div key={plan.id} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900">{plan.name}</div>
                <CreditCard className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-mono font-bold text-slate-900">
                {plan.currency} {plan.priceMonthly}
                <span className="text-xs text-slate-400 font-normal">/mo</span>
              </div>
              <div className="text-xs text-slate-500">{plan.tagline}</div>
              <div className="pt-2 text-[11px] text-slate-600 space-y-1">
                <div>Daily AI Quota: {plan.dailyAiLimit} calls</div>
                <div>3D Visual Lab: {plan.has3dLab ? "Included" : "Locked"}</div>
                <div>Live Voice Tutor: {plan.hasVoiceTutor ? "Included" : "Locked"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (adminRoute === "analytics") {
    const aiChartData = aiModelConfigs.map((cfg) => ({
      name: cfg.id.replace("cfg-", ""),
      Calls: cfg.usageCount,
    }));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Usage Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track AI endpoint task volume, library growth, and learner coverage metrics.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Registered Users", value: allUsers.length },
            { label: "Published Books", value: books.filter((b) => b.isPublished).length },
            { label: "Total MCQs", value: questions.length },
            { label: "Total AI Task Calls", value: aiModelConfigs.reduce((a, c) => a + c.usageCount, 0) },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
              <div className="text-xs text-slate-500">{m.label}</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">AI Task Usage Distribution</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aiChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip />
                <Bar dataKey="Calls" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations & Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Inspect administrative actions recorded in the immutable audit trail.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldAlert className="w-4 h-4 text-indigo-600" />
          <span>Immutable Admin Audit Trail ({auditLogs.length})</span>
        </div>
        <div className="divide-y divide-slate-100">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-3 flex flex-wrap items-start justify-between gap-2 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {log.resourceType}/{log.resourceId}
                  </span>
                </div>
                <div className="text-slate-700 mt-1">{log.summary}</div>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">{log.actorEmail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
