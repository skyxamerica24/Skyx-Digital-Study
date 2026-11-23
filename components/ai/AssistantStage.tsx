"use client";

import { useEffect, useState } from "react";
import type { AssistantAction } from "@/lib/assistant/tools";

type Board = Extract<AssistantAction,{name:"draw_whiteboard"}>["args"];
type Steps = Extract<AssistantAction,{name:"show_concept_animation"}>["args"];
export type AssistantVisual = {kind:"board";data:Board} | {kind:"steps";data:Steps} |
  {kind:"spotlight";target:HTMLElement;zoom:boolean};

export function findReadingBlock(quote:string) {
  const normalize = (text:string) => text.normalize("NFC").replace(/\s+/g," ").trim().toLowerCase();
  const matches = Array.from(document.querySelectorAll<HTMLElement>(
    "[data-assistant-reading-source] :is(p,h1,h2,h3,h4,tr,li,figcaption)",
  )).filter(element=>normalize(element.textContent ?? "").includes(normalize(quote)));
  const unique = matches.filter(element=>!matches.some(other=>other!==element && element.contains(other)));
  return unique.length===1 ? unique[0] : null;
}

export default function AssistantStage({visual,close}: {visual:AssistantVisual;close:()=>void}) {
  const [rect,setRect] = useState<DOMRect | null>(null);
  const [step,setStep] = useState(0);
  useEffect(()=>{
    const onKey = (event:KeyboardEvent) => {if (event.key==="Escape") close();};
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[close]);

  useEffect(()=>{
    if (visual.kind!=="spotlight") return;
    const {target} = visual;
    function update() {
      if (!target.isConnected) close();
      else setRect(target.getBoundingClientRect());
    }
    target.scrollIntoView({block:"center"});
    update();
    window.addEventListener("scroll",update,true);
    window.addEventListener("resize",update);
    return ()=>{
      window.removeEventListener("scroll",update,true);
      window.removeEventListener("resize",update);
    };
  },[visual,close]);

  useEffect(()=>{
    if (visual.kind!=="steps" || step>=visual.data.steps.length-1 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer=window.setTimeout(()=>setStep(step+1),2500);
    return ()=>window.clearTimeout(timer);
  },[step,visual]);

  if (visual.kind==="spotlight" && !visual.zoom) {
    if (!rect) return null;
    return <div className="pointer-events-none fixed z-[66] rounded outline outline-2 outline-indigo-400 shadow-[0_0_0_150vmax_rgba(2,6,23,.58)]"
      style={{top:rect.top,left:rect.left,width:rect.width,height:rect.height}}>
      <button type="button" onClick={close} className="pointer-events-auto absolute bottom-full right-0 rounded bg-white px-3 py-1 text-sm text-slate-900">Close Spotlight</button>
    </div>;
  }
  return <section aria-label="Assistant visual" className="fixed inset-x-3 top-16 z-[66] mx-auto max-h-[66vh] max-w-lg overflow-auto rounded-xl border border-indigo-200 bg-white p-4 text-slate-900 shadow-xl">
    <header className="mb-2 flex items-start justify-between gap-4">
      <h2 className="font-semibold">{visual.kind==="spotlight"?"Enlarged text":visual.data.title}</h2>
      <button type="button" onClick={close} className="text-sm underline">Close</button>
    </header>
    {visual.kind==="spotlight" ? <p className="whitespace-pre-wrap text-xl">{visual.target.innerText.slice(0,4000)}</p> :
      visual.kind==="steps" ? <ol className="list-decimal space-y-1 pl-6">
        {visual.data.steps.map((entry,index)=><li key={index} className={index===step?"rounded bg-indigo-100 font-semibold":""}>
          <button type="button" className="w-full p-1 text-left" aria-current={index===step?"step":undefined} onClick={()=>setStep(index)}>{entry}</button>
        </li>)}
      </ol> : <svg viewBox="0 0 320 200" role="img" aria-label={visual.data.title} className="w-full rounded bg-indigo-50">
        {visual.data.strokes.map((stroke,index)=><polyline key={index} points={stroke.map(point=>point.join(",")).join(" ")}
          fill="none" stroke="#4338ca" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength="1"
          className="assistant-whiteboard-stroke" style={{animationDelay:`${index*150}ms`}} />)}
      </svg>}
  </section>;
}
