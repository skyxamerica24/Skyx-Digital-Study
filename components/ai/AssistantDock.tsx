"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getSessionToken } from "@/lib/auth/session-storage";
import { listAssistantArtifacts, deleteAssistantArtifact, setAssistantArtifactPinned, reviseAssistantDiagram, listAssistantDiagramVersions } from "@/lib/actions/assistant-artifact-actions";
import { diagramSpec, type ArtifactEntry } from "@/lib/assistant/artifacts";
import { useApp } from "@/components/context/AppContext";

const Diagram = dynamic(()=>import("./AssistantDiagram"),{ssr:false,loading:()=> <p>Loading diagram…</p>});

export default function AssistantDock({latest, reader}: {latest:ArtifactEntry | null;reader:boolean}) {
  const { addAnnotation, notify, openBookReader }=useApp();
  const [items,setItems]=useState<ArtifactEntry[]>([]);
  const [selected,setSelected]=useState<string | null>(null);
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [editor,setEditor]=useState<string | null>(null);
  const [versions,setVersions]=useState<Awaited<ReturnType<typeof listAssistantDiagramVersions>>>([]);
  useEffect(()=>{
    let cancelled=false;
    listAssistantArtifacts(getSessionToken()).then(rows=>{
      if (!cancelled) setItems(previous=>[...previous,...rows.filter(row=>!previous.some(item=>item.id===row.id))]);
    }).catch(()=>{if (!cancelled) notify("Could not load saved results.","error");});
    return ()=>{cancelled=true;};
  },[notify]);
  useEffect(()=>{
    if (!latest) return;
    setItems(previous=>[latest,...previous.filter(item=>item.id!==latest.id)]);
    setSelected(latest.id);
    setOpen(true);
    setEditor(null);
    setVersions([]);
  },[latest]);
  const item=items.find(entry=>entry.id===selected);
  async function work(task:()=>Promise<void>) {
    setBusy(true);
    try { await task(); }
    catch { notify("Could not update the saved result.","error"); }
    finally {setBusy(false);}
  }
  function replace(entry:ArtifactEntry) {setItems(previous=>previous.map(row=>row.id===entry.id?entry:row));}
  if (!items.length && !open) return null;
  const ordered=[...items].sort((a,b)=>Number(b.pinned)-Number(a.pinned));
  return <section aria-label="Assistant results" className={`fixed left-3 z-[63] max-h-[55vh] w-[min(25rem,calc(100vw-5rem))] overflow-auto rounded-xl border border-indigo-200 bg-white p-3 text-sm text-slate-900 shadow-lg ${reader?"bottom-4":"bottom-20"}`}>
    <button type="button" className="font-semibold text-indigo-700" aria-expanded={open} onClick={()=>setOpen(!open)}>Assistant Results ({items.length})</button>
    {open && <>
      <button disabled={busy} type="button" className="ml-3 text-xs underline" onClick={()=>work(async()=>{
        setItems(await listAssistantArtifacts(getSessionToken()));
      })}>Refresh</button>
      <div className="mt-2 flex max-h-24 flex-wrap gap-1 overflow-auto">
        {ordered.map(entry=><button key={entry.id} type="button" aria-pressed={selected===entry.id}
          className="max-w-full truncate rounded border px-2 py-1 text-xs aria-pressed:bg-indigo-100"
          onClick={()=>{setSelected(entry.id);setEditor(null);setVersions([]);}}>{entry.pinned?"Pinned · ":""}{entry.title}</button>)}
      </div>
      {item && <div className="mt-2 space-y-2">
        {item.payload.kind === "diagram" ? <Diagram spec={item.payload.spec} /> :
          item.payload.kind === "references" ? <div className="space-y-2">{item.payload.images.map(image=>(
            <figure key={image.source} className="rounded border p-2">
              <a href={image.source} target="_blank" rel="noreferrer"><img src={image.thumbnail} alt={image.title} loading="lazy" referrerPolicy="no-referrer" className="max-h-36 w-auto rounded" /></a>
              <figcaption className="text-xs">
                <a href={image.source} target="_blank" rel="noreferrer" className="underline">{image.title} · Wikimedia Commons</a>
                {image.creator && <span> · {image.creator}</span>}
                {" · "}{image.licenseUrl ? <a href={image.licenseUrl} target="_blank" rel="noreferrer" className="underline">{image.license}</a> : image.license}
              </figcaption>
            </figure>
          ))}</div> : <p className="whitespace-pre-wrap break-words">{item.payload.text}</p>}
        <div className="flex flex-wrap gap-3 text-xs font-medium text-indigo-700">
          <button disabled={busy} type="button" onClick={()=>work(async()=>replace(await setAssistantArtifactPinned(getSessionToken(),item.id,!item.pinned)))}>{item.pinned?"Unpin":"Pin"}</button>
          <button disabled={busy} type="button" onClick={()=>work(async()=>{
            if (!window.confirm("Delete this saved result?")) return;
            await deleteAssistantArtifact(getSessionToken(),item.id);
            setItems(previous=>previous.filter(entry=>entry.id!==item.id));
            setSelected(null);
          })}>Delete</button>
          {(item.payload.kind === "example" || item.payload.kind === "notes") && <button type="button" onClick={()=>{
            if (item.payload.kind !== "example" && item.payload.kind !== "notes") return;
            void navigator.clipboard.writeText(item.payload.text).then(()=>notify("Copied.","success"),()=>notify("Could not copy.","error"));
          }}>Copy</button>}
          <button type="button" onClick={()=>{
            const payload=item.payload;
            const data=payload.kind==="diagram"?JSON.stringify(payload.spec,null,2):payload.kind==="references"?JSON.stringify(payload.images,null,2):item.title+"\n\n"+payload.text;
            const url=URL.createObjectURL(new Blob([data],{type:"text/plain;charset=utf-8"}));
            const link=document.createElement("a");link.href=url;link.download=item.payload.kind==="diagram"?"skyx-diagram.json":item.payload.kind==="references"?"skyx-sources.json":"skyx-result.txt";
            link.click();
            window.setTimeout(()=>URL.revokeObjectURL(url),1000);
          }}>Download</button>
          {item.payload.kind==="notes" && <>
            <button disabled={busy} type="button" onClick={()=>work(async()=>{
              if (item.payload.kind==="notes" && !await addAnnotation({...item.payload.context,type:"note",color:"indigo",quote:item.title,noteText:item.payload.text})) {
                throw new Error("The note could not be saved.");
              }
            })}>Save to Study Vault</button>
            <button disabled={busy} type="button" onClick={()=>work(async()=>{
              if (item.payload.kind==="notes" && !await openBookReader(item.payload.context.bookId,item.payload.context.topicId)) {
                throw new Error("The topic is unavailable.");
              }
            })}>Open Source Topic</button>
          </>}
          {item.payload.kind==="diagram" && <>
            <button type="button" onClick={()=>{if(item.payload.kind==="diagram")setEditor(JSON.stringify(item.payload.spec,null,2));}}>Edit Diagram</button>
            <button disabled={busy} type="button" onClick={()=>work(async()=>setVersions(await listAssistantDiagramVersions(getSessionToken(),item.id)))}>Version History</button>
          </>}
        </div>
        {editor!==null && <form className="space-y-1" onSubmit={event=>{
          event.preventDefault();
          void work(async()=>{
            const spec=diagramSpec.parse(JSON.parse(editor));
            replace(await reviseAssistantDiagram(getSessionToken(),item.id,item.revision,{kind:"diagram",spec}));
            setEditor(null);setVersions([]);
          });
        }}>
          <label className="block text-xs">Diagram JSON<textarea value={editor} onChange={event=>setEditor(event.target.value)} rows={7} className="block w-full rounded border p-2 font-mono" /></label>
          <button className="rounded border px-2 py-1" disabled={busy} type="submit">Save Revision</button>
          <button className="ml-2" type="button" onClick={()=>setEditor(null)}>Cancel</button>
        </form>}
        {versions.map(version=><button type="button" key={version.revision} className="mr-2 text-xs underline"
          onClick={()=>{if(version.payload.kind==="diagram") setEditor(JSON.stringify(version.payload.spec,null,2));}}>Open Version {version.revision}</button>)}
      </div>}
    </>}
  </section>;
}
