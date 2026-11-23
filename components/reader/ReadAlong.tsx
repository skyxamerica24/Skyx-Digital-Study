"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const highlightName = "skyx-read-along";

export default function ReadAlong({ content, topicId, language, pdf = false }: {
  content: RefObject<HTMLDivElement | null>;
  topicId: string;
  language: string;
  pdf?: boolean;
}) {
  const session = useRef(0);
  const speaking = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [currentSentence, setCurrentSentence] = useState("");
  const [message, setMessage] = useState("");
  const [rate, setRate] = useState(1);

  function stop() {
    session.current++;
    if (speaking.current) window.speechSynthesis?.cancel();
    speaking.current = false;
    globalThis.CSS?.highlights?.delete(highlightName);
  }

  useEffect(() => {
    setPlaying(false);
    setCurrentSentence("");
    setMessage("");
    return stop;
  }, [topicId]);

  function start() {
    const root = content.current;
    if (!root || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setMessage("Read Aloud is unavailable in this browser.");
      return;
    }
    const sentences: { text:string; range:Range }[] = [];
    const blocks = root.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, td, th, pre");
    for (const block of blocks.length ? Array.from(blocks) : [root]) {
      // A nested paragraph, list or table cell will be processed separately.
      if (block.querySelector("p, li, td, th, pre")) continue;
      const walker = document.createTreeWalker(block,NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      const nodes: {node:Text; start:number; end:number}[] = [];
      let text = "";
      for (let child = walker.nextNode(); child; child = walker.nextNode()) {
        if (child.nodeName === "BR") text += "\n";
        if (child.nodeType !== Node.TEXT_NODE) continue;
        const node = child as Text;
        nodes.push({node,start:text.length,end:text.length+node.length});
        text += node.data;
        if (pdf && node.parentElement?.tagName === "SPAN") text += " ";
      }
      for (const match of text.matchAll(/[^।!?\.\n]+[।!?\.]+|[^।!?\.\n]+/gu)) {
        const spoken = match[0].trim();
        if (!spoken) continue;
        const start = match.index + (match[0].length - match[0].trimStart().length);
        const end = start + spoken.length;
        const first = nodes.find(node => node.end > start);
        const last = nodes.find(node => node.end >= end && node.start < end);
        if (!first || !last) continue;
        const range = document.createRange();
        range.setStart(first.node,start-first.start);
        range.setEnd(last.node,end-last.start);
        sentences.push({text:spoken,range});
      }
    }
    if (!sentences.length) { setMessage("There is no text to read."); return; }

    stop();
    setPlaying(true);
    setMessage("");
    const id = session.current;
    function read(index: number) {
      if (id !== session.current) return;
      const sentence = sentences[index];
      if (!sentence) {
        speaking.current = false;
        setPlaying(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(sentence.text);
      utterance.lang = language === "bn" || /[\u0980-\u09ff]/u.test(sentence.text) ? "bn-BD" : "en";
      utterance.rate = rate;
      utterance.onstart = () => {
        if (id !== session.current) return;
        setCurrentSentence(sentence.text);
        if (typeof Highlight !== "undefined") CSS.highlights?.set(highlightName,new Highlight(sentence.range));
        const parent = sentence.range.startContainer.parentElement;
        const bounds = sentence.range.getBoundingClientRect();
        if (bounds.top < 100 || bounds.bottom > window.innerHeight - 75) parent?.scrollIntoView({block:"center"});
      };
      utterance.onend = () => read(index+1);
      utterance.onerror = () => {
        if (id !== session.current) return;
        speaking.current = false;
        setPlaying(false);
        setMessage("The device could not play this voice.");
      };
      speaking.current = true;
      window.speechSynthesis.speak(utterance);
    }
    read(0);
  }

  return <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
    <button type="button" className="rounded-lg bg-indigo-700 px-3 py-1.5 font-semibold text-white" onClick={() => {
      if (playing) { stop(); setPlaying(false); }
      else start();
    }}>{playing ? "Stop Reading" : "Read Aloud"}</button>
    <label className="flex items-center gap-1">Speed
      <select className="rounded border px-1 py-0.5 text-slate-900" disabled={playing} value={rate} onChange={event => setRate(Number(event.target.value))}>
        <option value={0.8}>Slow</option><option value={1}>Normal</option><option value={1.2}>Fast</option>
      </select>
    </label>
    {message && <span role="status">{message}</span>}
    {playing && currentSentence && <p className="basis-full rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-900">{currentSentence}</p>}
  </div>;
}
