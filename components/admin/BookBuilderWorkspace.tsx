"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowDown,
  ArrowUp,
  BookPlus,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileUp,
  History,
  Loader2,
  Plus,
  Rocket,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { createBookAction, getAllBooks, publishBookAction, unpublishBookAction } from "@/lib/actions/book-actions";
import {
  createBookNodeAction,
  deleteBookNodeAction,
  duplicateBookNodeAction,
  getBookNodes,
  importOutlineAction,
  migrateBookTopicsToNodesAction,
  moveBookNodeAction,
  reorderBookNodesAction,
  syncBookNodesToTopicsAction,
  updateBookNodeAction,
} from "@/lib/actions/book-node-actions";
import {
  breadcrumb,
  buildTree,
  childrenOf,
  descendantIds,
  estimateReadingMinutes,
  kindForDepth,
  type FlatNode,
  type TreeNode,
} from "@/lib/book-builder/tree";

interface BookRow {
  id: string;
  title: string;
  author?: string | null;
  subject?: string | null;
  isPublished: boolean;
  totalTopics: number;
  topics?: Array<{ id: string }>;
}

const KIND_LABEL: Record<string, string> = {
  chapter: "Chapter",
  topic: "Topic",
  subtopic: "Subtopic",
  point: "Point",
};
const KIND_BADGE: Record<string, string> = {
  chapter: "bg-indigo-100 text-indigo-700",
  topic: "bg-sky-100 text-sky-700",
  subtopic: "bg-teal-100 text-teal-700",
  point: "bg-amber-100 text-amber-700",
};
const NEXT_KIND_LABEL: Record<string, string> = {
  chapter: "Topic",
  topic: "Subtopic",
  subtopic: "Point",
  point: "Point",
};

export default function BookBuilderWorkspace() {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [bookId, setBookId] = useState<string>("");
  const [nodes, setNodes] = useState<FlatNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [showNewBook, setShowNewBook] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [outlineText, setOutlineText] = useState("");
  const [busy, setBusy] = useState(false);
  const dragId = useRef<string | null>(null);

  // New book form
  const [nb, setNb] = useState({ title: "", author: "", subject: "", language: "bn", publisher: "", edition: "", publishYear: "", isbn: "" });

  // Editor draft (kept locally until the server confirms a save)
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftKind, setDraftKind] = useState("topic");
  const [showPreview, setShowPreview] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<number | undefined>(undefined);

  const selectedBook = books.find((b) => b.id === bookId) || null;
  const selectedNode = nodes.find((n) => n.id === selectedId) || null;
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const stats = useMemo(() => {
    const by: Record<string, number> = { chapter: 0, topic: 0, subtopic: 0, point: 0 };
    for (const n of nodes) by[n.kind] = (by[n.kind] ?? 0) + 1;
    return by;
  }, [nodes]);

  const say = (kind: "ok" | "err", text: string) => setNotice({ kind, text });

  const loadBooks = useCallback(async (keepSelection = true) => {
    const rows = (await getAllBooks()) as unknown as BookRow[];
    setBooks(rows);
    setBookId((prev) => (keepSelection && rows.some((b) => b.id === prev) ? prev : rows[0]?.id || ""));
    setLoading(false);
  }, []);

  const loadNodes = useCallback(async (id: string) => {
    if (!id) { setNodes([]); return; }
    setNodesLoading(true);
    const rows = (await getBookNodes(id)) as FlatNode[];
    setNodes(rows);
    setExpanded(new Set(rows.filter((n) => n.parentId === null).map((n) => n.id)));
    setNodesLoading(false);
  }, []);

  useEffect(() => { void loadBooks(false); }, [loadBooks]);
  useEffect(() => { setSelectedId(null); void loadNodes(bookId); }, [bookId, loadNodes]);

  // Load the selected node into the editor draft.
  useEffect(() => {
    if (selectedNode) {
      setDraftTitle(selectedNode.title);
      setDraftContent(selectedNode.contentMarkdown || "");
      setDraftKind(selectedNode.kind);
      setSaveState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const persistDraft = useCallback(async () => {
    if (!selectedNode) return;
    setSaveState("saving");
    const res = await updateBookNodeAction(selectedNode.id, {
      title: draftTitle.trim() || selectedNode.title,
      kind: draftKind as "chapter" | "topic" | "subtopic" | "point",
      contentMarkdown: draftContent,
    });
    if ("error" in res && res.error) {
      setSaveState("error");
      say("err", `Save failed: ${res.error}. Your draft is still here — press Retry.`);
      return;
    }
    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, title: draftTitle.trim() || n.title, kind: draftKind, contentMarkdown: draftContent } : n)));
    setSaveState("saved");
  }, [selectedNode, draftTitle, draftContent, draftKind]);

  // Autosave the draft 900ms after the last change, only when it differs.
  useEffect(() => {
    if (!selectedNode || saveState !== "dirty") return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { void persistDraft(); }, 900);
    return () => window.clearTimeout(saveTimer.current);
  }, [draftTitle, draftContent, draftKind, saveState, selectedNode, persistDraft]);

  const markDirty = () => setSaveState((s) => (s === "saving" ? s : "dirty"));

  async function addNode(parentId: string | null) {
    if (!bookId) return;
    const siblings = childrenOf(nodes, parentId);
    const depth = parentId ? (nodes.find((n) => n.id === parentId) ? breadcrumb(nodes, parentId).length : 0) : 0;
    const kind = kindForDepth(depth);
    const res = await createBookNodeAction({
      bookId,
      parentId,
      kind,
      title: `New ${KIND_LABEL[kind]} ${siblings.length + 1}`,
    });
    if ("error" in res && res.error) { say("err", res.error); return; }
    if ("node" in res && res.node) {
      const node = res.node as unknown as FlatNode;
      setNodes((prev) => [...prev, node]);
      if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
      setSelectedId(node.id);
      say("ok", `${KIND_LABEL[kind]} added. Rename it in the editor.`);
    }
  }

  async function removeNode(node: FlatNode) {
    const count = descendantIds(nodes, node.id).size;
    if (!window.confirm(`Delete "${node.title}"${count > 1 ? ` and its ${count - 1} child item(s)` : ""}? This cannot be undone from here.`)) return;
    const res = await deleteBookNodeAction(node.id);
    if ("error" in res && res.error) { say("err", res.error); return; }
    const ids = descendantIds(nodes, node.id);
    setNodes((prev) => prev.filter((n) => !ids.has(n.id)));
    if (selectedId && ids.has(selectedId)) setSelectedId(null);
    say("ok", `Deleted ${count} item(s).`);
  }

  async function moveSibling(node: FlatNode, dir: -1 | 1) {
    const siblings = childrenOf(nodes, node.parentId);
    const idx = siblings.findIndex((s) => s.id === node.id);
    const swap = siblings[idx + dir];
    if (!swap) return;
    const moves = siblings.map((s) => ({
      id: s.id,
      parentId: s.parentId,
      orderIndex: s.id === node.id ? swap.orderIndex : s.id === swap.id ? node.orderIndex : s.orderIndex,
    }));
    const res = await reorderBookNodesAction(bookId, moves);
    if ("error" in res && res.error) { say("err", res.error); return; }
    setNodes((prev) => prev.map((n) => {
      const m = moves.find((x) => x.id === n.id);
      return m ? { ...n, orderIndex: m.orderIndex } : n;
    }));
  }

  async function reparent(draggedId: string, targetParentId: string | null) {
    if (draggedId === targetParentId) return;
    const order = childrenOf(nodes, targetParentId).length;
    const res = await moveBookNodeAction(draggedId, targetParentId, order);
    if ("error" in res && res.error) { say("err", res.error); return; }
    await loadNodes(bookId);
    if (targetParentId) setExpanded((prev) => new Set(prev).add(targetParentId));
  }

  async function duplicateNode(node: FlatNode) {
    const res = await duplicateBookNodeAction(node.id);
    if ("error" in res && res.error) { say("err", res.error); return; }
    await loadNodes(bookId);
    say("ok", `Duplicated "${node.title}" with its children.`);
  }

  async function togglePublish(node: FlatNode) {
    const res = await updateBookNodeAction(node.id, { isPublished: !node.isPublished });
    if ("error" in res && res.error) { say("err", res.error); return; }
    setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, isPublished: !n.isPublished } : n)));
  }

  async function handleCreateBook(e: React.FormEvent) {
    e.preventDefault();
    if (!nb.title.trim()) return;
    setBusy(true);
    const res = await createBookAction({
      title: nb.title.trim(),
      author: nb.author.trim() || undefined,
      subject: nb.subject.trim() || undefined,
      language: nb.language,
      publisher: nb.publisher.trim() || undefined,
      edition: nb.edition.trim() || undefined,
      publishYear: nb.publishYear ? Number(nb.publishYear) : undefined,
      isbn: nb.isbn.trim() || undefined,
    });
    setBusy(false);
    if ("error" in res && res.error) { say("err", res.error); return; }
    setNb({ title: "", author: "", subject: "", language: "bn", publisher: "", edition: "", publishYear: "", isbn: "" });
    setShowNewBook(false);
    await loadBooks();
    if ("book" in res && res.book) setBookId(res.book.id);
    say("ok", "Book created. Now add chapters from the tree panel.");
  }

  async function handleImportOutline() {
    if (!bookId || !outlineText.trim()) return;
    setBusy(true);
    const res = await importOutlineAction(bookId, outlineText);
    setBusy(false);
    if ("error" in res && res.error) { say("err", res.error); return; }
    setShowOutline(false);
    setOutlineText("");
    await loadNodes(bookId);
    say("ok", `Outline imported: ${"created" in res ? res.created : 0} items created.`);
  }

  async function handleMigrate() {
    if (!bookId) return;
    setBusy(true);
    const res = await migrateBookTopicsToNodesAction(bookId);
    setBusy(false);
    if ("error" in res && res.error) { say("err", res.error); return; }
    await loadNodes(bookId);
    say("ok", `Migrated ${"topicsConverted" in res ? res.topicsConverted : 0} existing topics into the builder tree.`);
  }

  async function handleSyncPublish() {
    if (!bookId) return;
    setBusy(true);
    try {
      const res = await syncBookNodesToTopicsAction(bookId);
      await publishBookAction(bookId);
      await loadBooks();
      say("ok", `Published to Reader: ${res.topicsCreated} reading pages created from the tree. Learners can now read this book.`);
    } catch {
      say("err", "Publishing failed. Your structure is saved — try again.");
    }
    setBusy(false);
  }

  async function handleUnpublish() {
    if (!bookId) return;
    await unpublishBookAction(bookId);
    await loadBooks();
    say("ok", "Book unpublished. It is hidden from learners until you publish again.");
  }

  const renderNode = (node: TreeNode): React.ReactNode => {
    const kids = node.children;
    const isOpen = expanded.has(node.id);
    const matches = !filter || node.title.toLowerCase().includes(filter.toLowerCase());
    const childMatches = kids.some(function deep(n: TreeNode): boolean {
      return n.title.toLowerCase().includes(filter.toLowerCase()) || n.children.some(deep);
    });
    if (filter && !matches && !childMatches) return null;
    return (
      <div key={node.id}>
        <div
          draggable
          onDragStart={() => { dragId.current = node.id; }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (dragId.current) void reparent(dragId.current, node.id); dragId.current = null; }}
          onClick={() => setSelectedId(node.id)}
          className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer text-xs ${selectedId === node.id ? "bg-indigo-50 border border-indigo-200" : "border border-transparent hover:bg-slate-50"} ${node.isPublished ? "" : "opacity-50"}`}
          style={{ marginLeft: node.depth * 14 }}
        >
          <button
            className="shrink-0 text-slate-400"
            onClick={(e) => { e.stopPropagation(); setExpanded((prev) => { const next = new Set(prev); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); return next; }); }}
          >
            {kids.length > 0 ? (isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : <span className="block w-3.5" />}
          </button>
          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${KIND_BADGE[node.kind] || KIND_BADGE.point}`}>
            {KIND_LABEL[node.kind] || node.kind}
          </span>
          <span className="flex-1 truncate font-medium text-slate-800">{node.title}</span>
          <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <button title={`Add ${NEXT_KIND_LABEL[node.kind] || "item"} inside`} onClick={(e) => { e.stopPropagation(); void addNode(node.id); }} className="p-1 rounded hover:bg-indigo-100 text-indigo-600"><Plus className="w-3.5 h-3.5" /></button>
            <button title="Move up" onClick={(e) => { e.stopPropagation(); void moveSibling(node, -1); }} className="p-1 rounded hover:bg-slate-200 text-slate-500"><ArrowUp className="w-3.5 h-3.5" /></button>
            <button title="Move down" onClick={(e) => { e.stopPropagation(); void moveSibling(node, 1); }} className="p-1 rounded hover:bg-slate-200 text-slate-500"><ArrowDown className="w-3.5 h-3.5" /></button>
            <button title="Duplicate (with children)" onClick={(e) => { e.stopPropagation(); void duplicateNode(node); }} className="p-1 rounded hover:bg-slate-200 text-slate-500"><Copy className="w-3.5 h-3.5" /></button>
            <button title={node.isPublished ? "Hide from readers" : "Show to readers"} onClick={(e) => { e.stopPropagation(); void togglePublish(node); }} className="p-1 rounded hover:bg-slate-200 text-slate-500">{node.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
            <button title="Delete" onClick={(e) => { e.stopPropagation(); void removeNode(node); }} className="p-1 rounded hover:bg-rose-100 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </span>
        </div>
        {isOpen && kids.map(renderNode)}
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-slate-500 p-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading Book Builder…</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Book Builder — Manual Custom Books</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Build a book by hand: Add New Book → Add Chapter → Topic → Subtopic → Point, as deep as you like, then write the text in each part.
          Publish sends the whole structure to the learner Reader.
        </p>
      </div>

      {notice && (
        <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-xs font-medium ${notice.kind === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Book picker + new book */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="flex-1 min-w-56 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 bg-slate-50">
          {books.length === 0 && <option value="">No books yet — create your first book</option>}
          {books.map((b) => (
            <option key={b.id} value={b.id}>{b.title}{b.author ? ` — ${b.author}` : ""} {b.isPublished ? "(Published)" : "(Draft)"}</option>
          ))}
        </select>
        <button onClick={() => setShowNewBook((s) => !s)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
          <BookPlus className="w-4 h-4" /> Add New Book
        </button>
        {selectedBook && (
          selectedBook.isPublished ? (
            <button onClick={() => void handleUnpublish()} className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700">Unpublish</button>
          ) : null
        )}
      </div>

      {showNewBook && (
        <form onSubmit={handleCreateBook} className="rounded-2xl bg-white border border-indigo-200 p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Add New Book</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input required value={nb.title} onChange={(e) => setNb({ ...nb, title: e.target.value })} placeholder="Book name (e.g. জীববিজ্ঞান প্রথম পত্র)" className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs" />
            <input value={nb.author} onChange={(e) => setNb({ ...nb, author: e.target.value })} placeholder="Author / লেখক" className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs" />
            <input value={nb.subject} onChange={(e) => setNb({ ...nb, subject: e.target.value })} placeholder="Subject (Biology, Physics…)" className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs" />
            <select value={nb.language} onChange={(e) => setNb({ ...nb, language: e.target.value })} className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50">
              <option value="bn">Bangla</option>
              <option value="en">English</option>
              <option value="bilingual">Bilingual</option>
            </select>
            <input value={nb.publisher} onChange={(e) => setNb({ ...nb, publisher: e.target.value })} placeholder="Publisher (optional)" className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs" />
            <div className="grid grid-cols-3 gap-2">
              <input value={nb.edition} onChange={(e) => setNb({ ...nb, edition: e.target.value })} placeholder="Edition" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" />
              <input value={nb.publishYear} onChange={(e) => setNb({ ...nb, publishYear: e.target.value.replace(/[^0-9]/g, "") })} placeholder="Year" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" />
              <input value={nb.isbn} onChange={(e) => setNb({ ...nb, isbn: e.target.value })} placeholder="ISBN" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            </div>
          </div>
          <button disabled={busy} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold">
            {busy ? "Creating…" : "Create Book"}
          </button>
        </form>
      )}

      {bookId && (
        <>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">{nodes.length} items total</span>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">{stats.chapter} Chapters</span>
            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700">{stats.topic} Topics</span>
            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700">{stats.subtopic} Subtopics</span>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">{stats.point} Points</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Structure tree */}
            <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-slate-900 flex-1">Structure</h2>
                <button onClick={() => void addNode(null)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Add Chapter
                </button>
              </div>
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter structure…" className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs" />
              </div>
              <div
                className="space-y-0.5 max-h-[560px] overflow-y-auto pr-1"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (dragId.current) void reparent(dragId.current, null); dragId.current = null; }}
              >
                {nodesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading structure…</div>
                ) : tree.length === 0 ? (
                  <div className="text-xs text-slate-500 py-6 text-center space-y-2">
                    <p>No structure yet.</p>
                    <p>Press <b>Add Chapter</b> to start, or import an outline / migrate existing topics below.</p>
                  </div>
                ) : tree.map(renderNode)}
              </div>
              <p className="text-[10px] text-slate-400 mt-3">Tip: drag an item onto another to move it inside; drag to empty space to bring it to the top level. Hover for add / reorder / duplicate / delete.</p>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                <button onClick={() => setShowOutline((s) => !s)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700"><FileUp className="w-3.5 h-3.5" /> Import Outline</button>
                {nodes.length === 0 && (selectedBook?.topics?.length ?? 0) > 0 && (
                  <button disabled={busy} onClick={() => void handleMigrate()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700"><History className="w-3.5 h-3.5" /> Migrate Existing Topics</button>
                )}
                <button disabled={busy || nodes.length === 0} onClick={() => void handleSyncPublish()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-semibold"><Rocket className="w-3.5 h-3.5" /> Sync & Publish to Reader</button>
              </div>
              {showOutline && (
                <div className="mt-3 space-y-2">
                  <textarea value={outlineText} onChange={(e) => setOutlineText(e.target.value)} rows={8} placeholder={"Paste an indented outline — 2 spaces per level:\n\nঅধ্যায় ১: কোষ\n  কোষের গঠন\n    কোষ ঝিল্লি\n      গঠন\n      কাজ\nঅধ্যায় ২: টিস্যু"} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono" />
                  <button disabled={busy || !outlineText.trim()} onClick={() => void handleImportOutline()} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-semibold">
                    {busy ? "Importing…" : "Create Structure from Outline"}
                  </button>
                </div>
              )}
            </div>

            {/* Editor */}
            <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
              {!selectedNode ? (
                <div className="text-sm text-slate-500 py-16 text-center">
                  Select an item from the structure tree to write or edit its text.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-400 font-medium truncate">
                    {breadcrumb(nodes, selectedNode.id).join("  ›  ")}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={draftTitle}
                      onChange={(e) => { setDraftTitle(e.target.value); markDirty(); }}
                      className="flex-1 min-w-48 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                      placeholder="Title"
                    />
                    <select value={draftKind} onChange={(e) => { setDraftKind(e.target.value); markDirty(); }} className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-semibold">
                      <option value="chapter">Chapter</option>
                      <option value="topic">Topic</option>
                      <option value="subtopic">Subtopic</option>
                      <option value="point">Point</option>
                    </select>
                    <span className={`text-[11px] font-semibold ${saveState === "error" ? "text-rose-600" : saveState === "saved" ? "text-emerald-600" : "text-slate-400"}`}>
                      {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : saveState === "error" ? "Save failed" : saveState === "dirty" ? "Unsaved changes…" : ""}
                    </span>
                    {saveState === "error" && (
                      <button onClick={() => void persistDraft()} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-semibold">Retry Save</button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowPreview(false)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${!showPreview ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"}`}>Write (Markdown)</button>
                    <button onClick={() => setShowPreview(true)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${showPreview ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"}`}>Preview</button>
                    <span className="text-[11px] text-slate-400 ml-auto">
                      {draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0} words · ~{estimateReadingMinutes(draftContent)} min read
                    </span>
                  </div>

                  {showPreview ? (
                    <div className="prose prose-sm max-w-none border border-slate-200 rounded-xl px-4 py-3 min-h-72 bg-slate-50/50">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{draftContent || "*Nothing written yet.*"}</ReactMarkdown>
                    </div>
                  ) : (
                    <textarea
                      value={draftContent}
                      onChange={(e) => { setDraftContent(e.target.value); markDirty(); }}
                      rows={16}
                      placeholder={"Write the text for this part here (Markdown supported)…\n\n## Heading\nMain explanation…\n\n- Point one\n- Point two"}
                      className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed"
                    />
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => void addNode(selectedNode.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold">
                      <Plus className="w-3.5 h-3.5" /> Add {NEXT_KIND_LABEL[selectedNode.kind] || "Item"} Inside
                    </button>
                    <button onClick={() => void duplicateNode(selectedNode)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700">
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                    <button onClick={() => void togglePublish(selectedNode)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700">
                      {selectedNode.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {selectedNode.isPublished ? "Hide from Readers" : "Show to Readers"}
                    </button>
                    <button onClick={() => void removeNode(selectedNode)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-[11px] font-semibold text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>

                  {childrenOf(nodes, selectedNode.id).length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Inside this part</div>
                      <div className="flex flex-wrap gap-1.5">
                        {childrenOf(nodes, selectedNode.id).map((c) => (
                          <button key={c.id} onClick={() => setSelectedId(c.id)} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-100 text-[11px] font-medium text-slate-700">{c.title}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
