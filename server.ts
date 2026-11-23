import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { serveReader } from "./lib/reader-live/socket";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import {
  getAvailableSecretSlots,
  getGeminiClient,
  isGeminiConfigured,
} from "./lib/gemini-server";
import { verifySessionToken } from "./lib/db/auth";
import { prisma } from "./lib/db";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.SKYX_BIND_HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface LivePageContextPayload {
  panel?: string;
  route?: string;
  pageTitle?: string;
  visibleText?: string;
}

interface LiveInitPayload {
  type: "init";
  token?: string;
  mode?: "explain" | "quiz" | "viva";
  model?: string;
  secretSlot?: string;
  bookTitle?: string;
  topicTitle?: string;
  topicExcerpt?: string;
  voiceName?: string;
  pageContext?: LivePageContextPayload;
}

interface LiveAudioPayload {
  type: "audio";
  audio: string;
}

interface LiveVideoPayload {
  type: "video";
  data: string;
  mimeType?: string;
}

interface LiveContextUpdatePayload {
  type: "context";
  pageContext?: LivePageContextPayload;
  bookTitle?: string;
  topicTitle?: string;
}

interface LiveTextPayload {
  type: "text";
  text: string;
}

type ClientLiveMessage =
  | LiveInitPayload
  | LiveAudioPayload
  | LiveVideoPayload
  | LiveContextUpdatePayload
  | LiveTextPayload;

const ALLOWED_VOICES = new Set([
  "Zephyr",
  "Kore",
  "Puck",
  "Fenrir",
  "Charon",
  "Aoede",
  "Leda",
  "Orus",
]);

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

interface LiveChannelConfig {
  modelId: string | null;
  credentialSlot: string | null;
  voiceName: string | null;
  isEnabled: boolean;
}

async function resolveLiveVoiceChannel(): Promise<LiveChannelConfig | null> {
  const channel = await prisma.aiChannelConfig.findUnique({
    where: { channelId: "live-voice" },
    select: { modelId: true, credentialSlot: true, voiceName: true, isEnabled: true },
  });
  if (!channel || !channel.isEnabled) return null;
  return channel;
}

function resolveServerLiveModel(channelConfig: LiveChannelConfig | null, requested?: string): string {
  // Prefer the channel config model, then the client-requested model, then a default
  if (channelConfig?.modelId) return channelConfig.modelId;
  if (requested) return requested;
  return "gemini-3.8-live";
}

function buildTutorInstruction(payload: LiveInitPayload): string {
  const mode = payload.mode || "explain";
  const pageCtx = payload.pageContext;
  const pageContextBlock = pageCtx
    ? [
        pageCtx.panel ? `Workspace Panel: ${pageCtx.panel}` : "",
        pageCtx.route ? `Current Screen: ${pageCtx.route}` : "",
        pageCtx.pageTitle ? `Page Title: ${pageCtx.pageTitle}` : "",
        pageCtx.visibleText ? `Visible On-Screen Snapshot:\n${pageCtx.visibleText.slice(0, 2200)}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const bookContextLine = payload.topicTitle
    ? `Active Book: "${payload.bookTitle || "Skyx Academy Library"}". Active Topic: "${payload.topicTitle}".\nTopic Excerpt:\n${(payload.topicExcerpt || "").slice(0, 2400)}`
    : "";

  const modeRules =
    mode === "quiz"
      ? "TEACHING MODE — SOCRATIC QUIZ: Proactively ask the user one clear, thoughtful question at a time based on the current page or topic. Wait for their spoken answer. Praise briefly if right, or gently explain if wrong."
      : mode === "viva"
        ? "TEACHING MODE — EXAM VIVA SIMULATOR: Act as a friendly yet thorough Medical/Academic viva examiner. Ask rapid conceptual questions, evaluate accuracy concisely, and highlight exam traps."
        : "TEACHING MODE — LIVE ASSISTANT & TUTOR: Explain concepts clearly, warmly, and concisely. You can see shared screen frames in real time when the user shares their screen, read their active Skyx Academy page context, and answer any study or platform questions.";

  return `You are Skyx AI Live Assistant inside Skyx Academy, a bilingual (English & Bangla) AI digital learning platform.
${modeRules}
Speak naturally and concisely (2-4 sentences per turn unless asked for deeper detail). Match the language the user speaks (English or Bangla).
If the user is sharing their screen, describe or help directly with what you visibly see on their screen.
${pageContextBlock ? `\nLIVE PAGE CONTEXT:\n${pageContextBlock}` : ""}
${bookContextLine ? `\nBOOK READER CONTEXT:\n${bookContextLine}` : ""}`;
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });
  const readerWss = new WebSocketServer({ noServer: true, maxPayload: 2_000_000 });
  readerWss.on("connection", serveReader);
  const syncWss = new WebSocketServer({ noServer: true });
  const syncClients = new Set<WebSocket>();
  const ALLOWED_SYNC_ENTITIES = new Set([
    "customAiModels",
    "aiModelConfigs",
    "users",
    "books",
    "topics",
    "questions",
    "studyTabs",
  ]);

  syncWss.on("connection", (clientWs: WebSocket) => {
    syncClients.add(clientWs);

    // Immediately push currently available server secret slots (names only, never values)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: "secrets",
          slots: getAvailableSecretSlots(),
          timestamp: Date.now(),
        })
      );
    }

    clientWs.on("message", (rawData) => {
      try {
        const text = rawData.toString();
        if (text.length > 24_000) return;
        const msg = JSON.parse(text) as {
          type?: string;
          entity?: string;
          action?: string;
          payload?: unknown;
        };

        if (msg.type === "refresh_secrets") {
          const slotsPayload = JSON.stringify({
            type: "secrets",
            slots: getAvailableSecretSlots(),
            timestamp: Date.now(),
          });
          for (const peer of syncClients) {
            if (peer.readyState === WebSocket.OPEN) {
              peer.send(slotsPayload);
            }
          }
          return;
        }

        if (msg.type === "broadcast" && msg.entity && ALLOWED_SYNC_ENTITIES.has(msg.entity)) {
          const outbound = JSON.stringify({
            type: "sync",
            entity: msg.entity,
            action: msg.action === "delete" ? "delete" : "upsert",
            payload: msg.payload ?? null,
            timestamp: Date.now(),
          });
          for (const peer of syncClients) {
            if (peer !== clientWs && peer.readyState === WebSocket.OPEN) {
              peer.send(outbound);
            }
          }
        }
      } catch {
        // Ignore malformed sync frames
      }
    });

    clientWs.on("close", () => {
      syncClients.delete(clientWs);
    });
  });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url || "/", true);
    if (pathname === "/api/reader-live-ws") {
      readerWss.handleUpgrade(request, socket, head, ws => readerWss.emit("connection", ws));
    } else if (pathname === "/api/live-ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else if (pathname === "/api/sync-ws") {
      syncWss.handleUpgrade(request, socket, head, (ws) => {
        syncWss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (clientWs: WebSocket) => {
    let liveSession: Awaited<ReturnType<GoogleGenAI["live"]["connect"]>> | null = null;
    let isClosing = false;
    let authenticatedUser: AuthenticatedUser | null = null;
    let conversationId: string | null = null;
    // Buffer transcripts for batch persistence
    let pendingUserTranscript = "";
    let pendingModelTranscript = "";
    let lastModelUsed: string | null = null;

    const sendSafe = (obj: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(obj));
      }
    };

    // Persist a transcript pair to the database (non-blocking)
    async function persistTranscriptPair(userText: string, modelText: string, modelUsed?: string) {
      if (!authenticatedUser || !conversationId || !userText.trim() || !modelText.trim()) return;
      try {
        await prisma.aiConversationMessage.create({
          data: {
            conversationId,
            role: "user",
            content: userText.trim(),
            position: (await prisma.aiConversationMessage.count({ where: { conversationId } })),
          },
        });
        await prisma.aiConversationMessage.create({
          data: {
            conversationId,
            role: "model",
            content: modelText.trim(),
            modelUsed: modelUsed || null,
            position: (await prisma.aiConversationMessage.count({ where: { conversationId } })),
          },
        });
        await prisma.aiConversation.update({
          where: { id: conversationId },
          data: { messageCount: { increment: 2 }, updatedAt: new Date() },
        });
      } catch {
        // Silent fail — voice session continues
      }
    }

    // Flush any pending transcript pair
    async function flushTranscripts() {
      if (pendingUserTranscript && pendingModelTranscript) {
        await persistTranscriptPair(pendingUserTranscript, pendingModelTranscript, lastModelUsed || undefined);
        pendingUserTranscript = "";
        pendingModelTranscript = "";
      }
    }

    clientWs.on("message", async (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString()) as ClientLiveMessage;

        if (msg.type === "init") {
          // --- 1. Authenticate the user ---
          if (!msg.token) {
            sendSafe({ type: "error", message: "Authentication required. Please log in to use Voice Assistant." });
            return;
          }
          const decoded = verifySessionToken(msg.token);
          if (!decoded) {
            sendSafe({ type: "error", message: "Invalid or expired session. Please log in again." });
            return;
          }
          authenticatedUser = decoded;

          // --- 2. Check Gemini configuration ---
          if (!isGeminiConfigured()) {
            sendSafe({
              type: "error",
              message: "GEMINI_API_KEY is not configured on the server. Please set it in Settings > Secrets.",
            });
            return;
          }

          // --- 3. Resolve channel config from database ---
          const channelConfig = await resolveLiveVoiceChannel();
          if (!channelConfig) {
            sendSafe({ type: "error", message: "Live Voice channel is not available. Please contact an administrator." });
            return;
          }

          // --- 4. Close any existing session ---
          if (liveSession) {
            try {
              await flushTranscripts();
              liveSession.close();
            } catch {
              // ignore previous session close error
            }
            liveSession = null;
          }

          // --- 5. Create a new conversation for this session ---
          const conv = await prisma.aiConversation.create({
            data: {
              userId: authenticatedUser.userId,
              channelId: "live-voice",
              messageCount: 0,
            },
          });
          conversationId = conv.id;
          pendingUserTranscript = "";
          pendingModelTranscript = "";
          lastModelUsed = null;

          // --- 6. Resolve model and voice from channel config ---
          const credentialSlot = channelConfig.credentialSlot || msg.secretSlot;
          const ai = getGeminiClient(credentialSlot);
          const selectedModel = resolveServerLiveModel(channelConfig, msg.model);
          const defaultVoice = channelConfig.voiceName && ALLOWED_VOICES.has(channelConfig.voiceName)
            ? channelConfig.voiceName
            : "Zephyr";
          const voiceName = msg.voiceName && ALLOWED_VOICES.has(msg.voiceName) ? msg.voiceName : defaultVoice;
          const systemInstruction = buildTutorInstruction(msg);

          liveSession = await ai.live.connect({
            model: selectedModel,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              systemInstruction,
            },
            callbacks: {
              onopen: () => {
                lastModelUsed = selectedModel;
                sendSafe({ type: "ready", model: selectedModel, voiceName, conversationId });
              },
              onmessage: (message: LiveServerMessage) => {
                const content = message.serverContent;
                if (content?.inputTranscription?.text) {
                  pendingUserTranscript += content.inputTranscription.text;
                  sendSafe({ type: "inputTranscript", text: content.inputTranscription.text });
                }
                if (content?.outputTranscription?.text) {
                  pendingModelTranscript += content.outputTranscription.text;
                  sendSafe({ type: "outputTranscript", text: content.outputTranscription.text });
                }
                if (content?.modelTurn?.parts) {
                  for (const part of content.modelTurn.parts) {
                    if (part.inlineData?.data) {
                      sendSafe({ type: "audio", data: part.inlineData.data });
                    }
                  }
                }
                if (content?.interrupted) {
                  sendSafe({ type: "interrupted" });
                }
                if (content?.turnComplete) {
                  // Flush transcript pair when the model finishes a turn
                  void flushTranscripts();
                  sendSafe({ type: "turnComplete" });
                }
              },
              onerror: (err: unknown) => {
                const errMsg = err instanceof Error ? err.message : "Live voice session error.";
                sendSafe({ type: "error", message: errMsg });
              },
              onclose: () => {
                // Flush any remaining transcripts on close
                void flushTranscripts();
                if (!isClosing) {
                  sendSafe({ type: "closed" });
                }
              },
            },
          });

          if (msg.mode === "quiz" || msg.mode === "viva") {
            liveSession.sendRealtimeInput({
              text:
                msg.mode === "quiz"
                  ? "Greet the user warmly in one sentence and ask your first conceptual question from the current page or topic."
                  : "Begin the viva session briefly and ask your first sharp exam question from the current topic.",
            });
          }
          return;
        }

        if (msg.type === "audio" && liveSession && msg.audio) {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
          return;
        }

        if (msg.type === "video" && liveSession && msg.data) {
          const safeMime = msg.mimeType === "image/png" ? "image/png" : "image/jpeg";
          liveSession.sendRealtimeInput({
            video: {
              data: msg.data,
              mimeType: safeMime,
            },
          });
          return;
        }

        if (msg.type === "context" && liveSession && msg.pageContext) {
          const summary = [
            `[Page context updated — Panel: ${msg.pageContext.panel || "workspace"}, Screen: ${msg.pageContext.pageTitle || msg.pageContext.route || "unknown"}]`,
            msg.topicTitle ? `Active Topic: ${msg.topicTitle}` : "",
            msg.pageContext.visibleText ? `Visible Content:\n${msg.pageContext.visibleText.slice(0, 1400)}` : "",
          ]
            .filter(Boolean)
            .join("\n");
          liveSession.sendRealtimeInput({
            text: `${summary}\n(Note: Silently remember this updated page context for future questions; do not speak unless the user asks.)`,
          });
          return;
        }

        if (msg.type === "text" && liveSession && msg.text) {
          liveSession.sendRealtimeInput({
            text: msg.text,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to process live session message.";
        sendSafe({ type: "error", message });
      }
    });

    clientWs.on("close", () => {
      isClosing = true;
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // ignore
        }
        liveSession = null;
      }
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Skyx Academy server ready on http://${hostname}:${port}`);
  });
});
