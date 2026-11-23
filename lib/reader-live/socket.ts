import { WebSocket, type RawData } from "ws";
import { z } from "zod";
import { InteractionStatus, type Session } from "@google/genai";
import { AccessError, verifyReaderToken } from "./identity";
import { readerClient, ReaderConfigurationError } from "./settings-server";
import { liveCloseMessage, liveConfig, parsePageAction } from "./model";

const incoming = z.discriminatedUnion("type", [
  z.object({ type: z.literal("init"), token: z.string().max(12000), total: z.number().int().positive().max(1000000) }),
  z.object({ type: z.literal("audio"), data: z.string().min(1).max(64000) }),
  z.object({ type: z.literal("frame"), data: z.string().min(1).max(1800000), page: z.number().int().positive(), revision: z.number().int().positive() }),
  z.object({ type: z.literal("result"), id: z.string().max(256), page: z.number().int().positive(), revision: z.number().int().nonnegative(), error: z.string().max(140).optional() }),
]);

export function serveReader(ws: WebSocket) {
  let session: Session | undefined;
  let started = false;
  let setup = false;
  let ready = false;
  let total = 0;
  let frame = { page: 0, revision: 0 };
  let pending: { id: string; page: number; timer: ReturnType<typeof setTimeout> } | undefined;
  const completed = new Map<string, Record<string, unknown>>();
  const setupTimer = setTimeout(() => fail("Live connection timed out. Check your connection and retry."), 20000);
  function send(value: object) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(value));
  }
  function fail(message: string) {
    send({ type: "error", message });
    ws.close();
  }
  function notifyReady() {
    if (!ready && setup && session && ws.readyState === WebSocket.OPEN) {
      ready = true;
      clearTimeout(setupTimer);
      send({ type: "ready" });
    }
  }
  function respond(id: string, result: Record<string, unknown>) {
    if (completed.size >= 128) completed.delete(completed.keys().next().value!);
    completed.set(id, result);
    session?.sendToolResponse({ functionResponses: [{ id, name: "go_to_page", response: result }] });
  }
  function finish(result: Record<string, unknown>) {
    if (!pending) return;
    const { id, timer } = pending;
    clearTimeout(timer);
    pending = undefined;
    respond(id, result);
  }
  async function receive(raw: RawData) {
    const msg = incoming.parse(JSON.parse(raw.toString()));
    if (msg.type === "init") {
      if (started) return;
      started = true;
      total = msg.total;
      await verifyReaderToken(msg.token);
      if (ws.readyState !== WebSocket.OPEN) return;
      const { ai, model } = await readerClient();
      session = await ai.live.connect({ model, config: liveConfig(model), callbacks: {
        onmessage: event => {
          if (ws.readyState !== WebSocket.OPEN) return;
          if (event.setupComplete) { setup = true; notifyReady(); }
          const status = event.serverContent?.interactionStatus;
          if (status === InteractionStatus.IN_PROGRESS || status === InteractionStatus.IDLE) {
            send({ type: "activity", thinking: status === InteractionStatus.IN_PROGRESS });
          }
          if (event.serverContent?.interrupted) send({ type: "interrupted" });
          for (const part of event.serverContent?.modelTurn?.parts || []) {
            if (part.inlineData?.data) send({ type: "audio", data: part.inlineData.data });
          }
          if (pending && event.toolCallCancellation?.ids?.includes(pending.id)) {
            send({ type: "cancel", id: pending.id });
            clearTimeout(pending.timer);
            pending = undefined;
          }
          for (const call of event.toolCall?.functionCalls || []) {
            if (call.name !== "go_to_page" || !call.id) continue;
            const id = call.id;
            if (pending?.id === id) continue;
            const prior = completed.get(id);
            if (prior) { respond(id, prior); continue; }
            const action = parsePageAction(call.args);
            if (!action || !frame.page || pending) { respond(id, { error: "Reader is busy or the command is invalid." }); continue; }
            const target = action.direction === "absolute" ? action.page! : frame.page + (action.direction === "next" ? 1 : -1);
            if (target < 1 || target > total) { respond(id, { error: "Page outside this PDF.", total }); continue; }
            pending = { id, page: target, timer: setTimeout(() => {
              send({ type: "cancel", id });
              finish({ error: "Page did not become visible in time." });
            }, 12000) };
            send({ type: "navigate", id, page: target });
          }
        },
        onerror: () => fail("Gemini Live could not continue. Check model access, quota and connection."),
        onclose: event => { if (ws.readyState === WebSocket.OPEN) fail(liveCloseMessage(event.code)); },
      }});
      if (ws.readyState !== WebSocket.OPEN) session.close(); else notifyReady();
      return;
    }
    if (!ready || !session) return;
    if (msg.type === "audio") session.sendRealtimeInput({ audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" } });
    if (msg.type === "frame" && msg.revision > frame.revision && msg.page <= total) {
      session.sendRealtimeInput({ video: { data: msg.data, mimeType: "image/jpeg" } });
      if (msg.page !== frame.page) session.sendRealtimeInput({ text: `Current visible PDF page: ${msg.page} of ${total}. Context update only.` });
      frame = { page: msg.page, revision: msg.revision };
    }
    if (msg.type === "result" && pending?.id === msg.id) {
      if (msg.error) finish({ error: msg.error });
      else if (msg.page === pending.page && msg.page === frame.page && msg.revision === frame.revision) finish({ openedPage: msg.page, total });
      else finish({ error: "The visible page changed." });
    }
  }
  ws.on("message", raw => { void receive(raw).catch(error => {
    fail(error instanceof AccessError || error instanceof ReaderConfigurationError
      ? error.message
      : "Reader Live failed. Check the configured key, model and connection.");
  }); });
  ws.on("error", () => ws.close());
  ws.on("close", () => {
    clearTimeout(setupTimer);
    clearTimeout(pending?.timer);
    session?.close();
  });
}
