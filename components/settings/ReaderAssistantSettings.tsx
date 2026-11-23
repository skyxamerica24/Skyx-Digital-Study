"use client";

import { useEffect, useState } from "react";
import { AudioLines, KeyRound, Loader2, Plus, Save } from "lucide-react";
import type { ReaderBinding, ReaderSettings } from "@/lib/reader-live/settings-types";
import { getSessionToken } from "@/lib/auth/session-storage";

const field = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500";
const button = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-45";
const primary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-45";

async function request(body?: object, signal?: AbortSignal): Promise<ReaderSettings> {
  const token = getSessionToken();
  if (!token) throw new Error("Log in as Administrator first to manage reader settings.");
  const response = await fetch("/api/ai/reader-settings", {
    method: body ? "POST" : "GET", signal, cache: "no-store",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to load reader settings.");
  return data;
}

export default function ReaderAssistantSettings({ section, models = [] }: { section: "keys" | "tools"; models?: string[] }) {
  const [data, setData] = useState<ReaderSettings | null>(null);
  const [draft, setDraft] = useState<ReaderBinding>({ enabled: true, modelId: "", credentialId: "" });
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    request(undefined, abort.signal).then(result => {
      if (abort.signal.aborted) return;
      setData(result); setDraft(result.binding); setMessage(""); setFailed(false);
    }).catch(error => {
      if (!abort.signal.aborted) { setFailed(true); setMessage(error.message); }
    });
    return () => abort.abort();
  }, [reload]);
  async function apply(body: object, success: string) {
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const result = await request(body);
      setData(result); setMessage(success); setSecret(""); setLabel(""); setEditing(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Request failed."); setFailed(true); }
    finally { setBusy(false); }
  }
  const keys = section === "keys";
  const Icon = keys ? KeyRound : AudioLines;
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <header className="mb-4 flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Icon className="size-5" /></span>
      <div><h2 className="font-display text-base font-bold text-slate-900">{keys ? "Gemini API keys" : "Book Reader Assistant"}</h2>
        <p className="text-xs text-slate-500">{keys ? "Server credentials available to the reader assistant." : "Live voice and navigation inside the PDF reader."}</p></div>
    </header>
    {!data && !message && <Loader2 aria-label="Loading settings" className="size-4 animate-spin" />}
    {data && keys && <>
      <ul className="divide-y divide-slate-100">{data.credentials.map(item =>
        <li key={item.id} className="flex flex-wrap items-center gap-2 py-2">
          <div className="mr-auto"><span className="text-sm font-semibold text-slate-800">{item.label}</span>
            <p className="text-xs text-slate-500">{item.source === "server" ? "Server environment" : "Encrypted reader settings"} · ••••{item.suffix} · {item.enabled ? "Enabled" : "Disabled"}</p></div>
          {item.source === "managed" && <>
            <button type="button" disabled={busy} className={button} onClick={() => { setEditing(item.id); setSecret(""); }}>Replace</button>
            <button type="button" disabled={busy} className={button} onClick={() => void apply({ action: "enable", credentialId: item.id, enabled: !item.enabled }, "Credential updated.")}>{item.enabled ? "Disable" : "Enable"}</button>
          </>}
        </li>)}</ul>
      {!data.credentials.length && <p className="my-2 text-sm text-slate-600">No Gemini keys configured.</p>}
      {!data.canStoreSecrets && <p className="my-3 text-xs text-amber-800">Set SKYX_READER_MASTER_KEY on the server to store keys entered here. Environment keys can already be selected.</p>}
      {editing === null ? <button type="button" className={primary} disabled={!data.canStoreSecrets || busy} onClick={() => setEditing("new")}><Plus className="size-4" />Add API key</button>
        : <form className="mt-3 grid gap-3 border-t border-slate-100 pt-3" onSubmit={e => {
          e.preventDefault();
          void apply(editing === "new" ? { action: "add", label, key: secret } : { action: "replace", credentialId: editing, key: secret }, "Key saved.");
        }}>
          {editing === "new" && <label className="text-xs font-semibold">Key name<input className={field} required maxLength={60} value={label} onChange={e => setLabel(e.target.value)} /></label>}
          <label className="text-xs font-semibold">Gemini API key<input className={field} type="password" autoComplete="new-password" required minLength={16} maxLength={512} value={secret} onChange={e => setSecret(e.target.value)} /></label>
          <div className="flex gap-2"><button className={primary} disabled={busy}>Save key</button><button type="button" className={button} onClick={() => { setEditing(null); setSecret(""); }}>Cancel</button></div>
        </form>}
    </>}
    {data && !keys && <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      <p className="text-xs text-slate-500 sm:col-span-2">
        {data.bindingSource === "managed" ? "Active selection saved in Reader settings." : "Active selection comes from the server environment until you save here."}
      </p>
      <label className="space-y-1 text-xs font-semibold">Gemini API key<select className={field} value={draft.credentialId} onChange={e => setDraft({ ...draft, credentialId: e.target.value })}>
        <option value="">Select a key</option>
        {draft.credentialId && !data.credentials.some(c => c.id === draft.credentialId) && <option value={draft.credentialId}>Unavailable key</option>}
        {data.credentials.map(c => <option key={c.id} value={c.id} disabled={!c.enabled}>{c.label} ({c.source === "server" ? "environment" : "saved key"}{c.enabled ? "" : ", disabled"})</option>)}
      </select></label>
      <label className="space-y-1 text-xs font-semibold">Live model ID<input className={field} list="reader-live-models" placeholder="Select or enter a Live model ID" value={draft.modelId} onChange={e => setDraft({ ...draft, modelId: e.target.value })} />
        <datalist id="reader-live-models">{models.map(id => <option key={id} value={id} />)}</datalist></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })} />Enable Start Live</label>
      <div className="flex gap-2 sm:justify-end">
        <button className={button} disabled={!draft.modelId || !draft.credentialId || !draft.enabled} onClick={() => void apply({ action: "test", binding: draft }, "Live handshake successful.")}>Test Live</button>
        <button className={primary} disabled={!draft.modelId || !draft.credentialId} onClick={() => void apply({ action: "bind", binding: draft }, "Saved for the next reader session.")}><Save className="size-4" />Save</button>
      </div>
    </fieldset>}
    {message && <p role="status" className={`mt-3 text-sm ${failed ? "text-rose-700" : "text-teal-700"}`}>{message} {!data && <button className="underline" onClick={() => setReload(v => v + 1)}>Retry</button>}</p>}
  </section>;
}
