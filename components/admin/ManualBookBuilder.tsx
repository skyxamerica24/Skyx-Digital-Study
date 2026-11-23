"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { listBookDrafts, saveBookDraft } from "@/lib/actions/book-builder-actions";
import { getSessionToken } from "@/lib/auth/session-storage";
import { nodeKinds, orderBookNodes, parseBookOutline, type BookDraft, type DraftNode } from "@/lib/book-builder";
import { useApp } from "@/components/context/AppContext";

const empty: BookDraft = {
  title: "", author: "", subtitle: "", subject: "", description: "",
  language: "en", accessTier: "free", nodes: [],
};
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50";
function newNodeId() {
  // getRandomValues also works when the development server is opened over HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}
type SavedDraft = Awaited<ReturnType<typeof listBookDrafts>>[number];

export default function ManualBookBuilder() {
  const { applyPublishedBook } = useApp();
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  const [document, setDocument] = useState<BookDraft>(empty);
  const [id, setId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(true);
  const [outline, setOutline] = useState("");
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState("");
  const ordered = useMemo(() => orderBookNodes(document.nodes), [document.nodes]);
  const selected = document.nodes.find(node => node.id === selectedId);
  const selectedEntry = ordered.find(entry => entry.node.id === selectedId);
  const siblings = document.nodes.filter(node => node.parentId === selected?.parentId);
  const siblingIndex = siblings.findIndex(node => node.id === selectedId);
  const descendants = new Set<string>(selectedId ? [selectedId] : []);
  for (const { node } of ordered) {
    if (node.parentId && descendants.has(node.parentId)) descendants.add(node.id);
  }

  useEffect(() => {
    listBookDrafts(getSessionToken()).then(setDrafts).catch(() => setStatus("Saved drafts could not be loaded."))
      .finally(() => setBusy(false));
  }, []);

  function update(next: BookDraft) {
    setDocument(next);
    setDirty(true);
    setStatus("");
  }
  function openDraft(row?: SavedDraft) {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setDocument(row?.document ?? empty);
    setId(row?.id ?? null);
    setRevision(row?.revision ?? 0);
    setSelectedId(row?.document.nodes[0]?.id ?? null);
    setOutline("");
    setPreview(false);
    setDirty(false);
    setStatus("");
  }
  function updateNode(patch: Partial<DraftNode>) {
    update({ ...document, nodes: document.nodes.map(node => node.id === selectedId ? { ...node, ...patch } : node) });
  }
  function addNode(parentId: string | null) {
    const depth = parentId && selectedEntry ? selectedEntry.depth + 1 : 0;
    const kind = nodeKinds[Math.min(depth, nodeKinds.length - 1)];
    const node = { id: newNodeId(), parentId, kind, title: "Untitled " + kind, markdown: "", visible: true };
    update({ ...document, nodes: [...document.nodes, node] });
    setSelectedId(node.id);
  }
  function move(offset: number) {
    const other = siblings[siblingIndex + offset];
    if (!other || !selected) return;
    update({ ...document, nodes: document.nodes.map(node => node.id === selected.id ? other : node.id === other.id ? selected : node) });
  }
  async function save(publish: boolean) {
    setBusy(true);
    setStatus("");
    try {
      const saved = await saveBookDraft(getSessionToken(), id, revision, document, publish);
      const previous = drafts.find(row => row.id === saved.id);
      const row = { id: saved.id, revision: saved.revision, document,
        publishedRevision: publish ? saved.revision : previous?.publishedRevision ?? null };
      setDrafts(list => [row, ...list.filter(draft => draft.id !== row.id)]);
      setId(row.id);
      setRevision(row.revision);
      setDirty(false);
      if (saved.catalog) applyPublishedBook(saved.catalog.book, saved.catalog.topics);
      setStatus(publish ? "Published to the Reader and Search." : "Draft saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The book could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const autosave = useEffectEvent(() => { void save(false); });

  useEffect(() => {
    if (!id || !dirty || busy || status || !document.title.trim()) return;
    const timer = window.setTimeout(() => autosave(), 1500);
    return () => window.clearTimeout(timer);
  }, [id, dirty, busy, status, document]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 sm:p-6">
      <h2 className="mb-4 text-lg font-bold">Build Manually</h2>
      <fieldset disabled={busy} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Saved book drafts" className={button} value={id ?? ""} onChange={event => {
            const draft = drafts.find(row => row.id === event.target.value);
            openDraft(draft);
          }}>
            <option value="">New book draft</option>
            {drafts.map(draft => <option key={draft.id} value={draft.id}>{draft.document.title}</option>)}
          </select>
          <button className={button} onClick={() => openDraft()}>New Book</button>
          <button className={button} onClick={() => {
            setBusy(true);
            listBookDrafts(getSessionToken()).then(setDrafts)
              .catch(() => setStatus("Could not refresh saved drafts.")).finally(() => setBusy(false));
          }}>Refresh Drafts</button>
          <button className={button} disabled={!document.title.trim()} onClick={() => save(false)}>Save Draft</button>
          <button className={button + " bg-indigo-700 text-white"} disabled={!document.title.trim() || !document.nodes.length} onClick={() => save(true)}>Publish</button>
          {dirty && <span className="text-sm text-slate-600">Unsaved changes</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["title", "author", "subtitle", "subject", "description"] as const).map(key => (
            <label key={key} className="text-sm capitalize">{key}
              <input className={field} value={document[key]} onChange={e => update({ ...document, [key]: e.target.value })} />
            </label>
          ))}
          <label className="text-sm">Book Language
            <select className={field} value={document.language} onChange={e => update({ ...document, language: e.target.value as BookDraft["language"] })}>
              <option value="en">English</option><option value="bn">Bangla</option><option value="bilingual">Bilingual</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(235px,1fr)_2fr]">
          <div>
            <h3 className="mb-2 font-semibold">Structure</h3>
            <button className={button} onClick={() => addNode(null)}>Add Chapter</button>
            <div className="my-2 max-h-80 overflow-y-auto">
              {ordered.map(({ node, depth, visible }) => (
                <button key={node.id} onClick={() => setSelectedId(node.id)} aria-pressed={selectedId === node.id}
                  style={{ paddingInlineStart: 8 + Math.min(depth, 10) * 12 }}
                  className="block w-full break-words rounded py-2 text-left text-sm aria-pressed:bg-indigo-100">
                  {node.title} <span className="text-xs capitalize text-slate-500">({node.kind}{visible ? "" : ", hidden"})</span>
                </button>
              ))}
            </div>
            <details>
              <summary className="cursor-pointer text-sm font-medium">Paste Outline</summary>
              <label className="text-sm">Indent child sections with spaces or tabs
                <textarea className={field} rows={4} value={outline} onChange={e => setOutline(e.target.value)} />
              </label>
              <button className={button} disabled={!outline.trim()} onClick={() => {
                const nodes = parseBookOutline(outline, newNodeId);
                update({ ...document, nodes: [...document.nodes, ...nodes] });
                setSelectedId(nodes[0]?.id ?? null);
                setOutline("");
              }}>Add Outline</button>
            </details>
          </div>
          {selected && <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button className={button} onClick={() => addNode(selected.id)}>Add Child</button>
              <button className={button} disabled={siblingIndex < 1} onClick={() => move(-1)}>Move Up</button>
              <button className={button} disabled={siblingIndex >= siblings.length - 1} onClick={() => move(1)}>Move Down</button>
              <button className={button} onClick={() => {
                if (!window.confirm("Remove this section and its children from the draft?")) return;
                update({ ...document, nodes: document.nodes.filter(node => !descendants.has(node.id)) });
                setSelectedId(selected.parentId);
              }}>Remove Section</button>
            </div>
            <p className="break-words text-sm text-slate-600">{selectedEntry?.path.join(" / ")}</p>
            <label className="block text-sm">Section Title
              <input className={field} value={selected.title} onChange={e => updateNode({ title: e.target.value })} />
            </label>
            <label className="block text-sm">Section Type
              <select className={field} value={selected.kind} onChange={e => updateNode({ kind: e.target.value as DraftNode["kind"] })}>
                {nodeKinds.map(kind => <option key={kind} value={kind}>{kind[0].toUpperCase() + kind.slice(1)}</option>)}
              </select>
            </label>
            <label className="block text-sm">Parent Section
              <select className={field} value={selected.parentId ?? ""} onChange={e => updateNode({ parentId: e.target.value || null })}>
                <option value="">Book Root</option>
                {ordered.filter(item => !descendants.has(item.node.id)).map(item => (
                  <option key={item.node.id} value={item.node.id}>{item.path.join(" / ")}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.visible} onChange={e => updateNode({ visible: e.target.checked })} />
              Include this section and its visible children when publishing
            </label>
            <button className={button} onClick={() => setPreview(value => !value)}>{preview ? "Edit Markdown" : "Reader Preview"}</button>
            {preview ? <article className="prose max-w-none rounded-lg border p-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.markdown}</ReactMarkdown>
            </article> : <label className="block text-sm">Section Content
              <textarea className={field} rows={12} value={selected.markdown} onChange={e => updateNode({ markdown: e.target.value })} />
            </label>}
          </div>}
        </div>
      </fieldset>
      {status && <p role="status" className="mt-3 text-sm">{status}</p>}
    </section>
  );
}
