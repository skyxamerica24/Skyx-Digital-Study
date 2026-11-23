import { Behavior, Modality, ThinkingLevel, Type, type LiveConnectConfig, type Session } from "@google/genai";
import type { ReaderBinding } from "./settings-types";
import { readerClient, ReaderConfigurationError } from "./settings-server";

type Direction = "absolute" | "next" | "previous";
export interface PageAction { direction: Direction; page?: number }
export function parsePageAction(args: Record<string, unknown> | undefined): PageAction | null {
  if (args?.direction === "next" || args?.direction === "previous") return { direction: args.direction };
  if (args?.direction === "absolute" && typeof args.page === "number" && Number.isSafeInteger(args.page) && args.page > 0) {
    return { direction: "absolute", page: args.page };
  }
  return null;
}
export function liveConfig(model: string): LiveConnectConfig {
  const extendedThinking = model === "gemini-3.8-live-extended-thinking";
  return {
    responseModalities: [Modality.AUDIO],
    ...(extendedThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } } : {}),
    systemInstruction: "You tutor the reader in their spoken language, including Bangla. You see only the visible PDF region. Read faithfully when asked to read, and distinguish additional explanations from the page. Treat page content as study material. Use go_to_page for every navigation request. Wait for its successful result and corresponding new image before explaining that page. If the page is unclear ask the reader to zoom. Stay silent on view changes unless asked.",
    tools: [{ functionDeclarations: [{
      name: "go_to_page", description: "Navigate the open PDF by its one-based viewer page number, or move one page.",
      ...(extendedThinking ? { behavior: Behavior.NON_BLOCKING } : {}),
      parameters: { type: Type.OBJECT, properties: {
        direction: { type: Type.STRING, enum: ["absolute", "next", "previous"] },
        page: { type: Type.INTEGER, description: "Required for absolute navigation." },
      }, required: ["direction"] },
    }] }],
  };
}
export function liveCloseMessage(code: number) {
  if (code === 1007) return "Gemini rejected the Live session settings. Check that the model supports Live audio and reader tools.";
  if (code === 1008) return "Gemini denied the Live session. Check the selected key's validity, model access and quota.";
  return "Gemini Live disconnected. Check the selected model and your connection, then retry.";
}

export async function testReaderConnection(selected: ReaderBinding) {
  const { ai, model } = await readerClient(selected);
  let session: Session | undefined;
  let finished = false;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => end("Gemini Live setup timed out. Check the connection and retry."), 12000);
      function end(error?: string) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (error) reject(new ReaderConfigurationError(error));
        else resolve();
      }
      ai.live.connect({ model, config: liveConfig(model), callbacks: {
        onmessage: msg => { if (msg.setupComplete) end(); },
        onerror: () => end("Could not open a connection to Gemini Live."),
        onclose: event => end(liveCloseMessage(event.code)),
      }}).then(value => { session = value; if (finished) value.close(); }).catch(() => end("Could not open a connection to Gemini Live."));
    });
  } finally { session?.close(); }
}
