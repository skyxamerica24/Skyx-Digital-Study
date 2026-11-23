"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Loader2, Mic, Square, X } from "lucide-react";
import { visiblePageFrame } from "@/lib/reader-live/view";
import { getSessionToken } from "@/lib/auth/session-storage";
import { arrayBufferToBase64, base64ToInt16Array, downsampleTo16k, float32ToInt16 } from "@/lib/reader-live/pcm";

interface Props {
  page: number;
  total: number;
  renderKey: string | null;
  viewport: RefObject<HTMLDivElement | null>;
  canvas: RefObject<HTMLCanvasElement | null>;
  navigate: (page: number) => void;
}
interface Controls { stop: () => void; refresh: () => void }
export default function ReaderLiveControl(props: Props) {
  const current = useRef(props);
  const control = useRef<Controls | null>(null);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    current.current = props;
    control.current?.refresh();
  }, [props]);
  useEffect(() => () => control.current?.stop(), []);

  async function start() {
    if (control.current) { control.current.stop(); return; }
    let socket: WebSocket | undefined;
    let stream: MediaStream | undefined;
    let audio: AudioContext | undefined;
    let processor: ScriptProcessorNode | undefined;
    let nextAudio = 0;
    const sources = new Set<AudioBufferSourceNode>();
    let closed = false;
    let ready = false;
    let thinking = false;
    let revision = 0;
    let signature = "";
    let pending: { id: string; page: number; from: number } | undefined;
    let frameTimer: number | undefined;
    const viewport = current.current.viewport.current;
    const observer = new ResizeObserver(refresh);
    function send(value: object) {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
    }
    function interrupt() {
      for (const source of sources) { source.onended = null; source.stop(); source.disconnect(); }
      sources.clear();
      nextAudio = 0;
    }
    function stop() {
      if (closed) return;
      closed = true;
      control.current = null;
      clearTimeout(frameTimer);
      clearTimeout(connectionTimer);
      window.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
      document.removeEventListener("visibilitychange", onHidden);
      observer.disconnect();
      processor?.disconnect();
      stream?.getTracks().forEach(track => track.stop());
      interrupt();
      void audio?.close().catch(() => {});
      socket?.close();
      setStatus("Idle");
    }
    function fail(message: string) { stop(); setError(message); }
    function updateActivity() {
      if (!closed && !sources.size && !pending) setStatus(thinking ? "Thinking" : "Listening");
    }
    function onHidden() {
      if (document.hidden) {
        interrupt();
        for (const track of stream?.getAudioTracks() ?? []) track.enabled = false;
        setStatus("Paused");
      } else {
        for (const track of stream?.getAudioTracks() ?? []) track.enabled = true;
        signature = "";
        updateActivity();
        refresh();
      }
    }
    function refresh() {
      if (!ready || closed) return;
      clearTimeout(frameTimer);
      frameTimer = window.setTimeout(() => {
        const view = current.current;
        if (pending && view.page !== pending.page && view.page !== pending.from) {
          send({ type: "result", id: pending.id, page: view.page, revision, error: "The reader selected a different page." });
          pending = undefined;
          updateActivity();
        }
        if (!view.renderKey || (pending && view.page !== pending.page)) return;
        const frame = visiblePageFrame({ ...view, canvas: view.canvas.current, viewport: view.viewport.current }, pending ? "" : signature);
        if (!frame) return;
        revision++;
        signature = frame.signature;
        send({ type: "frame", page: view.page, revision, data: frame.data });
        if (pending?.page === view.page) {
          send({ type: "result", id: pending.id, page: view.page, revision });
          pending = undefined;
          updateActivity();
        }
      }, 150);
    }
    const connectionTimer = window.setTimeout(() => fail("Could not start Live in time. Please retry."), 30000);
    control.current = { stop, refresh };
    setStatus("Connecting");
    setError("");
    try {
      const token = getSessionToken();
      if (!token) throw new Error("Sign in to start the reader assistant.");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access requires HTTPS or localhost.");
      audio = new AudioContext();
      await audio.resume();
      if (closed) return;
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (closed) { stream.getTracks().forEach(track => track.stop()); return; }
      socket = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/reader-live-ws");
      socket.onopen = () => send({ type: "init", token, total: current.current.total });
      socket.onerror = () => { if (!closed) fail("Live connection failed. Check your network and retry."); };
      socket.onclose = () => { if (!closed) fail("Live session ended. Start Live to reconnect."); };
      socket.onmessage = event => {
        if (closed || !audio) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "ready" && !ready) {
            ready = true;
            clearTimeout(connectionTimer);
            const ctx = audio;
            const source = ctx.createMediaStreamSource(stream!);
            processor = ctx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = event => {
              if (document.hidden || !revision || closed || (socket?.bufferedAmount ?? 0) > 128000) return;
              const samples = downsampleTo16k(event.inputBuffer.getChannelData(0), ctx.sampleRate);
              send({ type: "audio", data: arrayBufferToBase64(float32ToInt16(samples).buffer as ArrayBuffer) });
            };
            source.connect(processor);
            processor.connect(ctx.destination);
            if (viewport) observer.observe(viewport);
            window.addEventListener("scroll", refresh, true);
            window.addEventListener("resize", refresh);
            setStatus("Listening");
            refresh();
          } else if (msg.type === "audio" && !document.hidden) {
            const samples = base64ToInt16Array(msg.data);
            const buffer = audio.createBuffer(1, samples.length, 24000);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < samples.length; i++) output[i] = samples[i] / 32768;
            const source = audio.createBufferSource();
            source.buffer = buffer;
            source.connect(audio.destination);
            nextAudio = Math.max(audio.currentTime + 0.01, nextAudio);
            source.start(nextAudio);
            nextAudio += buffer.duration;
            sources.add(source);
            setStatus("Speaking");
            source.onended = () => {
              sources.delete(source);
              source.disconnect();
              updateActivity();
            };
          } else if (msg.type === "activity") {
            thinking = msg.thinking === true;
            if (ready) updateActivity();
          } else if (msg.type === "interrupted") {
            interrupt();
            updateActivity();
          } else if (msg.type === "navigate") {
            pending = { id: msg.id, page: msg.page, from: current.current.page };
            setStatus("Opening p. " + msg.page);
            current.current.navigate(msg.page);
            refresh();
          } else if (msg.type === "cancel") {
            if (pending?.id === msg.id) pending = undefined;
            updateActivity();
          } else if (msg.type === "error") fail(msg.message);
        } catch { fail("Unable to process the Live session. Please retry."); }
      };
      document.addEventListener("visibilitychange", onHidden);
    } catch (reason) {
      if (!closed) fail(reason instanceof Error ? reason.message : "Microphone unavailable.");
    }
  }
  const active = status !== "Idle";
  const Icon = status === "Connecting" ? Loader2 : active ? Square : Mic;
  return (
    <div className="relative flex shrink-0 items-center border-l border-slate-200 pl-2">
      <button type="button" aria-pressed={active} disabled={!props.renderKey && !active}
        aria-label={active ? "Stop Live" : "Start Live"} onClick={() => void start()}
        title={active ? "Stop Live" : "Talk about the visible PDF page"}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-45 ${active ? "bg-teal-700 hover:bg-teal-800" : "bg-indigo-700 hover:bg-indigo-800"}`}>
        <Icon className={`size-3.5 ${status === "Connecting" ? "animate-spin" : ""}`} aria-hidden="true" />
        <span aria-live="polite">{active ? status : "Start Live"}</span>
      </button>
      {error && <div role="alert" className="absolute right-0 top-full z-30 mt-2 flex w-60 items-start gap-2 rounded-xl border border-rose-200 bg-white p-3 text-xs text-rose-800 shadow-lg">
        <span className="flex-1">{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")}><X className="size-4" /></button>
      </div>}
    </div>
  );
}
