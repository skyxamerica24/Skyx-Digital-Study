"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUp,
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  History,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  MonitorOff,
  PhoneOff,
  Radio,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { arrayBufferToBase64, base64ToInt16Array, downsampleTo16k, float32ToInt16 } from "@/lib/reader-live/pcm";
import { getSessionToken } from "@/lib/auth/session-storage";
import { clientActionSchema } from "@/lib/assistant/tools";
import { useApp } from "@/components/context/AppContext";

function historyFetch(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = getSessionToken();
  if (token) headers.set("Authorization", "Bearer " + token);
  return fetch(url, { ...init, headers });
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  modelUsed?: string;
  citations?: { title: string; uri: string }[];
}

interface LiveTranscriptItem {
  id: string;
  role: "user" | "model";
  text: string;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const ROUTE_TITLES: Record<string, string> = {
  dashboard: "Learner Dashboard",
  library: "Book Library",
  "my-library": "My Saved Books",
  reader: "Book Reader",
  lab3d: "3D Diagram Lab",
  exams: "Exam Center",
  "exam-history": "Exam History",
  vault: "Study Vault",
  revision: "Revision & Flashcards",
  membership: "Membership & Plans",
  account: "Settings Hub",
  overview: "Admin · Overview",
  academic: "Admin · Curriculum & Subjects",
  books: "Admin · Books & Importer",
  "book-builder": "Admin · Book Builder",
  processing: "Admin · Book Processing Queue",
  editor: "Admin · Book Content Editor",
  "ai-studio": "Admin · AI Content Studio",
  questions: "Admin · Question Bank",
  "lab-manager": "Admin · 3D Lab Manager",
  "search-ops": "Admin · Search Operations",
  "ai-models": "Admin · AI Models & Live Config",
  learners: "Admin · Students & Plans",
  billing: "Admin · Billing & Subscriptions",
  analytics: "Admin · Analytics",
  operations: "Admin · Operations",
  settings: "Admin · Settings Hub",
};

const LIVE_VOICES = ["Zephyr", "Kore", "Puck", "Fenrir", "Charon", "Aoede"] as const;

function extractVisiblePageText(): string {
  if (typeof document === "undefined") return "";
  const mainEl = document.querySelector("main") || document.body;
  if (!mainEl) return "";
  // Clone lightly or walk text excluding the floating popup itself
  const popupEl = document.querySelector("[data-skyx-ai-popup]");
  const raw = mainEl === document.body && popupEl
    ? Array.from(document.body.children)
        .filter((el) => !el.hasAttribute("data-skyx-ai-popup"))
        .map((el) => (el as HTMLElement).innerText || "")
        .join("\n")
    : (mainEl as HTMLElement).innerText || "";
  return raw
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, 3200);
}

export default function FloatingAiTutor() {
  const {
    activePanel,
    learnerRoute,
    adminRoute,
    isTutorOpen,
    tutorInitialMode,
    tutorPrefillPrompt,
    openAiTutor,
    closeAiTutor,
    setActivePanel,
    setLearnerRoute,
    open3dLab,
    openBookReader,
    addAnnotation,
    comfort,
    updateComfort,
    books,
    topics,
    activeBookId,
    activeTopicId,
    customAiModels,
    getModelForTask,
    getSecretSlotForTask,
    getLiveModelConfig,
    notify,
  } = useApp();

  type TopicContext = {bookId:string;topicId:string;bookTitle:string;topicTitle:string};
  type Artifact = {title:string;text:string;context?:TopicContext};
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [artifactSaving, setArtifactSaving] = useState(false);
  const runAction = useRef(async (_input: unknown, _context?: TopicContext) => false);
  runAction.current = async (input, context) => {
    const result = clientActionSchema.safeParse(input);
    if (!result.success || document.hidden) return false;
    const action = result.data;
    switch (action.name) {
      case "navigate_app":
        setActivePanel("learner");
        setLearnerRoute(action.args.destination);
        closeAiTutor();
        return true;
      case "control_reader": {
        if (activePanel !== "learner" || learnerRoute !== "reader") return false;
        const setting = action.args.setting;
        if (setting === "larger-text" || setting === "smaller-text") {
          const delta = setting === "larger-text" ? 2 : -2;
          updateComfort({fontSize:Math.min(24,Math.max(15,comfort.fontSize+delta))});
        } else updateComfort({theme:setting});
        return true;
      }
      case "open_diagram_3d":
        open3dLab(action.args.model);
        closeAiTutor();
        return true;
      case "open_topic":
        if (!context || context.topicId !== action.args.topicId || !await openBookReader(context.bookId,context.topicId)) return false;
        closeAiTutor();
        return true;
      case "show_example_card":
        setArtifact({title:action.args.title,text:action.args.text});
        setArtifactOpen(true);
        return true;
      case "make_structured_notes":
        if (!context || context.topicId !== action.args.topicId) return false;
        setArtifact({title:action.args.title,text:action.args.points.map((point,i) => `${i+1}. ${point}`).join("\n"),context});
        setArtifactOpen(true);
        return true;
    }
  };

  const isFocusedReader = activePanel === "learner" && learnerRoute === "reader";
  const currentRouteKey = activePanel === "admin" ? adminRoute : learnerRoute;

  const activeBook = useMemo(
    () => books.find((b) => b.id === activeBookId) || books[0],
    [books, activeBookId]
  );
  const activeTopic = useMemo(
    () => topics.find((t) => t.id === activeTopicId) || topics[0],
    [topics, activeTopicId]
  );

  const pageTitle = useMemo(() => {
    if (isFocusedReader && activeTopic) {
      return `Reader · ${activeTopic.topicTitle}`;
    }
    return ROUTE_TITLES[currentRouteKey] || `${activePanel === "admin" ? "Admin" : "Learner"} · ${currentRouteKey}`;
  }, [isFocusedReader, activeTopic, currentRouteKey, activePanel]);

  const liveSettings = useMemo(() => getLiveModelConfig(), [getLiveModelConfig]);

  const availableTextModels = useMemo(() => {
    const enabled = customAiModels.filter((m) => m.isEnabled && m.category === "text");
    const defaultChat = getModelForTask("cfg-tutor-chat");
    const ids = new Map<string, string>();
    for (const m of enabled) {
      ids.set(m.modelId, m.displayName);
    }
    if (!ids.has(defaultChat)) {
      ids.set(defaultChat, defaultChat);
    }
    return Array.from(ids.entries()).map(([modelId, displayName]) => ({ modelId, displayName }));
  }, [customAiModels, getModelForTask]);

  const availableLiveModels = useMemo(() => {
    const enabled = customAiModels.filter((m) => m.isEnabled && m.category === "live");
    const ids = new Map<string, string>();
    for (const m of enabled) {
      ids.set(m.modelId, m.displayName);
    }
    if (!ids.has(liveSettings.primaryModel)) {
      ids.set(liveSettings.primaryModel, liveSettings.primaryModel);
    }
    return Array.from(ids.entries()).map(([modelId, displayName]) => ({ modelId, displayName }));
  }, [customAiModels, liveSettings.primaryModel]);

  const defaultChatModel = getModelForTask("cfg-tutor-chat");
  const defaultLiveVoice = liveSettings.voiceName || "Zephyr";
  const [tabOverride, setTabOverride] = useState<{
    forInitial: "chat" | "voice";
    forPrefill: string;
    tab: "chat" | "voice";
  } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [readPageContext, setReadPageContext] = useState(true);
  const [tutorMode, setTutorMode] = useState<"explain" | "quiz" | "viva">("explain");
  const [chatModelOverride, setChatModelOverride] = useState<{
    forDefault: string;
    value: string;
  } | null>(null);
  const [liveModelOverride, setLiveModelOverride] = useState<{
    forDefault: string;
    value: string;
  } | null>(null);
  const [voiceNameOverride, setVoiceNameOverride] = useState<{
    forDefault: string;
    value: string;
  } | null>(null);

  const tab: "chat" | "voice" =
    tabOverride &&
    tabOverride.forInitial === tutorInitialMode &&
    tabOverride.forPrefill === tutorPrefillPrompt
      ? tabOverride.tab
      : tutorPrefillPrompt
        ? "chat"
        : tutorInitialMode;

  const setTab = (next: "chat" | "voice") => {
    setTabOverride({ forInitial: tutorInitialMode, forPrefill: tutorPrefillPrompt, tab: next });
  };

  const selectedChatModel =
    chatModelOverride &&
    chatModelOverride.forDefault === defaultChatModel &&
    availableTextModels.some((m) => m.modelId === chatModelOverride.value)
      ? chatModelOverride.value
      : defaultChatModel;
  const setSelectedChatModel = (modelId: string) =>
    setChatModelOverride({ forDefault: defaultChatModel, value: modelId });

  const selectedLiveModel =
    liveModelOverride &&
    liveModelOverride.forDefault === liveSettings.primaryModel &&
    availableLiveModels.some((m) => m.modelId === liveModelOverride.value)
      ? liveModelOverride.value
      : liveSettings.primaryModel;
  const setSelectedLiveModel = (modelId: string) =>
    setLiveModelOverride({ forDefault: liveSettings.primaryModel, value: modelId });

  const voiceName =
    voiceNameOverride && voiceNameOverride.forDefault === defaultLiveVoice
      ? voiceNameOverride.value
      : defaultLiveVoice;
  const setVoiceName = (v: string) =>
    setVoiceNameOverride({ forDefault: defaultLiveVoice, value: v });

  // --- CHAT STATE ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInputState, setChatInputState] = useState<{
    forPrefill: string;
    value: string;
  }>({ forPrefill: tutorPrefillPrompt, value: tutorPrefillPrompt });

  const chatInput =
    chatInputState.forPrefill === tutorPrefillPrompt ? chatInputState.value : tutorPrefillPrompt;
  const setChatInput = (next: string | ((prev: string) => string)) => {
    setChatInputState((prev) => {
      const base = prev.forPrefill === tutorPrefillPrompt ? prev.value : tutorPrefillPrompt;
      const resolved = typeof next === "function" ? next(base) : next;
      return { forPrefill: tutorPrefillPrompt, value: resolved };
    });
  };

  const [chatLoading, setChatLoading] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);

  // --- HISTORY STATE ---
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [savedConversations, setSavedConversations] = useState<
    Array<{ id: string; title: string | null; messageCount: number; updatedAt: string }>
  >([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- VOICE HISTORY STATE ---
  const [voiceConversations, setVoiceConversations] = useState<
    Array<{ id: string; title: string | null; messageCount: number; updatedAt: string }>
  >([]);
  const [voiceHistoryOpen, setVoiceHistoryOpen] = useState(false);
  const [voiceHistoryLoading, setVoiceHistoryLoading] = useState(false);
  const voiceChannelId = "live-voice";

  // --- VOICE HISTORY HELPERS ---
  const fetchVoiceConversations = useCallback(async () => {
    setVoiceHistoryLoading(true);
    try {
      const res = await historyFetch(`/api/ai/conversations?channelId=${voiceChannelId}&limit=20`);
      const data = await res.json();
      if (res.ok && data.conversations) {
        setVoiceConversations(data.conversations);
      }
    } catch {
      // ignore
    } finally {
      setVoiceHistoryLoading(false);
    }
  }, [voiceChannelId]);

  const loadVoiceConversation = useCallback(async (convId: string) => {
    try {
      const res = await historyFetch(`/api/ai/conversations/${convId}`);
      const data = await res.json();
      if (res.ok && data.conversation) {
        const conv = data.conversation;
        const loadedTranscripts: LiveTranscriptItem[] = (conv.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          text: m.content,
        }));
        setLiveTranscripts(loadedTranscripts);
        setVoiceHistoryOpen(false);
        notify(`Loaded voice session: ${conv.title || "Untitled"}`);
      }
    } catch {
      notify("Failed to load voice session.", "error");
    }
  }, [notify]);

  const deleteVoiceConversation = useCallback(async (convId: string) => {
    try {
      const res = await historyFetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", conversationId: convId }),
      });
      if (res.ok) {
        await fetchVoiceConversations();
        notify("Voice session deleted.", "info");
      }
    } catch {
      notify("Failed to delete voice session.", "error");
    }
  }, [fetchVoiceConversations, notify]);

  // --- HISTORY HELPERS ---
  const chatChannelId = "chat";

  const fetchConversations = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await historyFetch(`/api/ai/conversations?channelId=${chatChannelId}&limit=20`);
      const data = await res.json();
      if (res.ok && data.conversations) {
        setSavedConversations(data.conversations);
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [chatChannelId]);

  const loadSavedConversation = useCallback(async (convId: string) => {
    try {
      const res = await historyFetch(`/api/ai/conversations/${convId}`);
      const data = await res.json();
      if (res.ok && data.conversation) {
        const conv = data.conversation;
        const loadedMessages: ChatMessage[] = (conv.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          text: m.content,
          modelUsed: m.modelUsed,
        }));
        setMessages(loadedMessages);
        setConversationId(conv.id);
        setHistoryOpen(false);
        notify(`Loaded conversation: ${conv.title || "Untitled"}`);
      }
    } catch {
      notify("Failed to load conversation.", "error");
    }
  }, [notify]);

  const saveCurrentConversation = useCallback(async () => {
    if (messages.length === 0) {
      notify("Nothing to save.", "info");
      return;
    }
    try {
      const firstUserMsg = messages.find((m) => m.role === "user");
      const title = firstUserMsg?.text?.slice(0, 60) || "Untitled";

      if (!conversationId) {
        const res = await historyFetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            channelId: chatChannelId,
            title,
            bookId: isFocusedReader ? activeBookId : undefined,
            topicId: isFocusedReader ? activeTopicId : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create conversation");
        const newConvId = data.conversation.id;
        setConversationId(newConvId);

        // Save all messages in pairs
        for (let i = 0; i < messages.length; i += 2) {
          const userMsg = messages[i];
          const modelMsg = messages[i + 1];
          if (userMsg && modelMsg && userMsg.role === "user" && modelMsg.role === "model") {
            const response = await historyFetch("/api/ai/conversations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "savePair",
                conversationId: newConvId,
                channelId: chatChannelId,
                userContent: userMsg.text,
                modelContent: modelMsg.text,
                modelUsed: modelMsg.modelUsed,
              }),
            });
            if (!response.ok) throw new Error("Could not save a conversation message.");
          }
        }
      }
      notify("Conversation saved.", "success");
      await fetchConversations();
      setHistoryOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save conversation.";
      notify(msg, "error");
    }
  }, [messages, conversationId, chatChannelId, isFocusedReader, activeBookId, activeTopicId, fetchConversations, notify]);

  const deleteConversation = useCallback(async (convId: string) => {
    try {
      const res = await historyFetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", conversationId: convId }),
      });
      if (res.ok) {
        if (convId === conversationId) {
          setConversationId(null);
          setMessages([]);
        }
        await fetchConversations();
        notify("Conversation deleted.", "info");
      }
    } catch {
      notify("Failed to delete conversation.", "error");
    }
  }, [conversationId, fetchConversations, notify]);

  const startNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setHistoryOpen(false);
  }, []);

  const persistMessagePair = useCallback(async (userText: string, modelText: string, modelUsed?: string) => {
    try {
      const firstUserMsg = messages.find((m) => m.role === "user");
      const title = firstUserMsg?.text?.slice(0, 60) || undefined;

      const res = await historyFetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "savePair",
          conversationId,
          channelId: chatChannelId,
          userContent: userText,
          modelContent: modelText,
          modelUsed,
          bookId: isFocusedReader ? activeBookId : undefined,
          topicId: isFocusedReader ? activeTopicId : undefined,
          title,
        }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
    } catch {
      // Silent fail for persistence — chat still works
    }
  }, [conversationId, chatChannelId, isFocusedReader, activeBookId, activeTopicId, messages]);

  const msgCounterRef = useRef(0);
  const nextId = (prefix: string) => {
    msgCounterRef.current += 1;
    return `${prefix}-${msgCounterRef.current}`;
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // --- LIVE VOICE + SCREEN SHARE STATE ---
  const [liveStatus, setLiveStatus] = useState<"idle" | "connecting" | "listening" | "speaking" | "error">("idle");
  const [liveError, setLiveError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenPreviewUrl, setScreenPreviewUrl] = useState<string | null>(null);
  const [liveTranscripts, setLiveTranscripts] = useState<LiveTranscriptItem[]>([]);
  const [liveQuickText, setLiveQuickText] = useState("");
  const [activeLiveModelUsed, setActiveLiveModelUsed] = useState<string>(liveSettings.primaryModel);
  const [liveConversationId, setLiveConversationId] = useState<string | null>(null);

  // Mutable refs for audio/video callbacks (prevents stale closures)
  const isMutedRef = useRef(false);
  const upstreamReady = useRef(false);
  const startGeneration = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenIntervalRef = useRef<number | null>(null);
  const liveEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  useEffect(() => {
    liveEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveTranscripts]);

  const buildPageContextPayload = useCallback(() => {
    if (!readPageContext) return undefined;
    return {
      panel: activePanel,
      route: currentRouteKey,
      pageTitle,
      visibleText: extractVisiblePageText(),
    };
  }, [readPageContext, activePanel, currentRouteKey, pageTitle]);

  // --- SCREEN SHARE CLEANUP ---
  const stopScreenShare = useCallback((silent = false) => {
    if (screenIntervalRef.current !== null) {
      window.clearInterval(screenIntervalRef.current);
      screenIntervalRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
      screenVideoRef.current = null;
    }
    setIsSharingScreen(false);
    setScreenPreviewUrl(null);
    if (!silent) {
      notify("Screen sharing stopped.", "info");
    }
  }, [notify]);

  const stopLiveSession = useCallback(() => {
    startGeneration.current++;
    upstreamReady.current = false;
    stopScreenShare(true);
    try {
      wsRef.current?.close();
    } catch {
      // ignore
    }
    wsRef.current = null;

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {
        // ignore
      }
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    nextPlayTimeRef.current = 0;
    setLiveStatus("idle");
  }, [stopScreenShare]);

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, [stopLiveSession]);

  useEffect(() => {
    function updateVisibility() {
      for (const track of micStreamRef.current?.getAudioTracks() ?? []) track.enabled = !document.hidden;
      if (!document.hidden) return;
      for (const source of activeSourcesRef.current) {
        try { source.stop(); } catch { /* already ended */ }
      }
      activeSourcesRef.current = [];
      nextPlayTimeRef.current = 0;
    }
    document.addEventListener("visibilitychange",updateVisibility);
    return () => document.removeEventListener("visibilitychange",updateVisibility);
  }, []);

  // Automatically sync updated page context to active Live session when user navigates!
  useEffect(() => {
    if (
      readPageContext &&
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      (liveStatus === "listening" || liveStatus === "speaking")
    ) {
      const timer = window.setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "context",
              pageContext: buildPageContextPayload(),
              bookTitle: isFocusedReader ? activeBook?.title : undefined,
              topicTitle: isFocusedReader ? activeTopic?.topicTitle : undefined,
            })
          );
        }
      }, 450);
      return () => window.clearTimeout(timer);
    }
  }, [
    activePanel,
    currentRouteKey,
    activeTopicId,
    readPageContext,
    liveStatus,
    buildPageContextPayload,
    isFocusedReader,
    activeBook?.title,
    activeTopic?.topicTitle,
  ]);

  const enqueuePcm24kAudio = useCallback((base64Pcm: string) => {
    if (!outputAudioCtxRef.current) {
      outputAudioCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = outputAudioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const int16 = base64ToInt16Array(base64Pcm);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.02, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + audioBuffer.duration;

    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (activeSourcesRef.current.length === 0) {
        setLiveStatus((prev) => (prev === "speaking" ? "listening" : prev));
      }
    };
  }, []);

  const startLiveSession = async () => {
    stopLiveSession();
    setLiveError("");
    setLiveStatus("connecting");
    setLiveTranscripts([]);
    setLiveConversationId(null);
    const attempt = startGeneration.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (attempt !== startGeneration.current) { stream.getTracks().forEach(track => track.stop()); return; }
      micStreamRef.current = stream;
      if (document.hidden) for (const track of stream.getAudioTracks()) track.enabled = false;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live-ws`);
      wsRef.current = ws;

      // Get the session token from localStorage for WebSocket auth
      const sessionToken = typeof window !== "undefined" ? localStorage.getItem("skyx_session_token") : null;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "init",
            token: sessionToken,
            mode: tutorMode,
            model: selectedLiveModel,
            voiceName,
            secretSlot: liveSettings.secretSlot,
            bookTitle: isFocusedReader ? activeBook?.title : undefined,
            topicTitle: isFocusedReader ? activeTopic?.topicTitle : undefined,
            topicExcerpt: isFocusedReader ? activeTopic?.contentMarkdown.slice(0, 2400) : undefined,
            pageContext: buildPageContextPayload(),
          })
        );
      };

      ws.onmessage = (event) => {
        if (wsRef.current !== ws) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "action" && typeof msg.id === "string") {
            const reply = (ok: boolean) => {
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({type:"actionResult",id:msg.id,ok}));
            };
            void runAction.current(msg.action,msg.topicContext).then(reply,() => reply(false));
          } else if (msg.type === "reconnecting") {
            upstreamReady.current = false;
            setLiveStatus("connecting");
          } else if (msg.type === "ready") {
            upstreamReady.current = true;
            setLiveStatus("listening");
            if (msg.model) setActiveLiveModelUsed(msg.model);
            // Store the conversation ID returned by the server
            if (msg.conversationId) {
              setLiveConversationId(msg.conversationId);
            }
            if (inputAudioCtxRef.current) return;
            const AudioCtx =
              window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const inputCtx = new AudioCtx();
            inputAudioCtxRef.current = inputCtx;
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (document.hidden || !upstreamReady.current || isMutedRef.current || ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > 128000) return;
              const raw = e.inputBuffer.getChannelData(0);
              const downsampled = downsampleTo16k(raw, inputCtx.sampleRate);
              const pcm16 = float32ToInt16(downsampled);
              const b64 = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
              ws.send(JSON.stringify({ type: "audio", audio: b64 }));
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          } else if (msg.type === "audio" && msg.data && !document.hidden) {
            setLiveStatus("speaking");
            enqueuePcm24kAudio(msg.data);
          } else if (msg.type === "inputTranscript" && msg.text) {
            setLiveTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === "user") {
                return [...prev.slice(0, -1), { ...last, text: `${last.text}${msg.text}` }];
              }
              return [...prev, { id: nextId("lu"), role: "user", text: msg.text }];
            });
          } else if (msg.type === "outputTranscript" && msg.text) {
            setLiveTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === "model") {
                return [...prev.slice(0, -1), { ...last, text: `${last.text}${msg.text}` }];
              }
              return [...prev, { id: nextId("lm"), role: "model", text: msg.text }];
            });
          } else if (msg.type === "interrupted") {
            activeSourcesRef.current.forEach((s) => {
              try {
                s.stop();
              } catch {
                // ignore
              }
            });
            activeSourcesRef.current = [];
            nextPlayTimeRef.current = 0;
            setLiveStatus("listening");
          } else if (msg.type === "error") {
            stopLiveSession();
            setLiveError(msg.message || "Live session error.");
            setLiveStatus("error");
          } else if (msg.type === "closed") {
            setLiveStatus("idle");
          }
        } catch {
          // ignore malformed frame
        }
      };

      ws.onerror = () => {
        if (wsRef.current !== ws) return;
        stopLiveSession();
        setLiveError("Unable to reach Live WebSocket server.");
        setLiveStatus("error");
      };

      ws.onclose = () => {
        if (wsRef.current === ws) stopLiveSession();
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone permission denied.";
      setLiveError(msg);
      setLiveStatus("error");
      notify(msg, "error");
    }
  };

  // --- REAL-TIME SCREEN SHARE (<= 1 FPS JPEG STREAM TO GEMINI LIVE API) ---
  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      stopScreenShare();
      return;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== "function") {
      notify(
        "Screen sharing is not supported in this mobile browser. Page Context Sync is active so Gemini still reads this screen.",
        "info"
      );
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      notify("Start a Live conversation first, then tap Share Screen.", "info");
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 1, max: 2 },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      screenStreamRef.current = displayStream;
      const video = document.createElement("video");
      video.srcObject = displayStream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      screenVideoRef.current = video;

      if (!screenCanvasRef.current) {
        screenCanvasRef.current = document.createElement("canvas");
      }

      const track = displayStream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          stopScreenShare(true);
        };
      }

      const captureAndSendFrame = () => {
        const v = screenVideoRef.current;
        const canvas = screenCanvasRef.current;
        const ws = wsRef.current;
        if (document.hidden || !upstreamReady.current || !v || !canvas || !ws || ws.readyState !== WebSocket.OPEN || v.videoWidth === 0) return;

        const maxW = 960;
        const scale = Math.min(1, maxW / v.videoWidth);
        const w = Math.max(320, Math.round(v.videoWidth * scale));
        const h = Math.max(180, Math.round(v.videoHeight * scale));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, w, h);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const base64 = dataUrl.split(",")[1];
        if (base64) {
          ws.send(
            JSON.stringify({
              type: "video",
              data: base64,
              mimeType: "image/jpeg",
            })
          );
          setScreenPreviewUrl(dataUrl);
        }
      };

      setIsSharingScreen(true);
      notify("Live Screen Share active — Gemini can now see your screen.", "success");
      // Send initial frame shortly after playback stabilizes, then every 1200ms (< 1 FPS)
      window.setTimeout(captureAndSendFrame, 300);
      screenIntervalRef.current = window.setInterval(captureAndSendFrame, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Screen sharing cancelled.";
      if (!msg.toLowerCase().includes("cancel") && !msg.toLowerCase().includes("denied")) {
        notify(msg, "error");
      }
    }
  };

  const sendManualPageSyncToLive = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: "context",
        pageContext: {
          panel: activePanel,
          route: currentRouteKey,
          pageTitle,
          visibleText: extractVisiblePageText(),
        },
        bookTitle: isFocusedReader ? activeBook?.title : undefined,
        topicTitle: isFocusedReader ? activeTopic?.topicTitle : undefined,
      })
    );
    notify(`Synced "${pageTitle}" to Live AI.`, "success");
  };

  const sendLiveQuickPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = liveQuickText.trim();
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "text", text: trimmed }));
    setLiveTranscripts((prev) => [...prev, { id: nextId("lq"), role: "user", text: trimmed }]);
    setLiveQuickText("");
  };

  // --- CHAT SEND & DICTATION ---
  const sendChatMessage = async (customText?: string) => {
    const text = (customText ?? chatInput).trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMessage = { id: nextId("u"), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setChatInput("");
    setChatLoading(true);

    try {
      const librarySummary = books
        .map((b) => `- ${b.title} (${b.subject}, ${b.language})`)
        .join("\n");

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map((m) => ({ role: m.role, text: m.text })),
          bookTitle: readPageContext && isFocusedReader ? activeBook?.title : undefined,
          topicTitle: readPageContext && isFocusedReader ? activeTopic?.topicTitle : undefined,
          topicContent: readPageContext && isFocusedReader ? activeTopic?.contentMarkdown : undefined,
          librarySummary,
          useSearchGrounding,
          tutorMode,
          model: selectedChatModel,
          secretSlot: getSecretSlotForTask(useSearchGrounding ? "cfg-grounding" : "cfg-tutor-chat"),
          pageContext: buildPageContextPayload(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");

      const modelText = data.text;
      const modelUsed = data.modelUsed;

      setMessages((prev) => [
        ...prev,
        {
          id: nextId("m"),
          role: "model",
          text: modelText,
          modelUsed,
          citations: data.citations || [],
        },
      ]);

      // Persist the message pair to the database (non-blocking)
      persistMessagePair(text, modelText, modelUsed);
      // Refresh the conversation list in background
      fetchConversations();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get AI reply.";
      notify(msg, "error");
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("err"),
          role: "model",
          text: `Sorry, I couldn't complete that request: **${msg}**`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleVoiceDictation = async () => {
    if (isDictating) {
      mediaRecorderRef.current?.stop();
      setIsDictating(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const arrayBuf = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuf);
        try {
          const res = await fetch("/api/ai/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: base64,
              mimeType: blob.type || "audio/webm",
              model: getModelForTask("cfg-transcribe"),
              secretSlot: getSecretSlotForTask("cfg-transcribe"),
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Transcription failed");
          if (data.transcript) {
            setChatInput((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
          }
        } catch (err) {
          notify(err instanceof Error ? err.message : "Voice transcription failed.", "error");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsDictating(true);
    } catch {
      notify("Microphone permission is needed for voice dictation.", "error");
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const isLiveRunning = liveStatus === "listening" || liveStatus === "speaking" || liveStatus === "connecting";

  // Position cleanly above the mobile 60px bottom nav bar when outside focused reader
  const bubblePosClass = isFocusedReader
    ? "bottom-4 right-4"
    : "bottom-[74px] right-3.5 lg:bottom-5 lg:right-5";

  const popupPosClass = isFocusedReader
    ? "bottom-4 right-3 left-3 sm:left-auto sm:right-5"
    : "bottom-[74px] right-3 left-3 sm:left-auto sm:right-5 lg:bottom-5";

  return (
    <div data-skyx-ai-popup="true">
      {/* Global Compact Mini Floating Bubble (Always visible on every page when minimized) */}
      <AnimatePresence>
        {!isTutorOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => openAiTutor({ mode: isLiveRunning ? "voice" : "chat" })}
            aria-label="Open Skyx AI Assistant"
            title="Skyx AI Assistant (Chat & Live)"
            className={`fixed ${bubblePosClass} z-[62] w-12 h-12 rounded-full bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#7C3AED] text-white shadow-[0_10px_28px_rgba(79,70,229,0.42)] ring-2 ring-white/80 flex items-center justify-center cursor-pointer`}
          >
            {isLiveRunning ? (
              <Radio className="w-5 h-5 animate-pulse" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {isLiveRunning && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {artifact && (
        <section aria-label="Assistant result" className={`fixed left-3 z-[63] max-h-[45vh] w-[min(22rem,calc(100vw-5rem))] overflow-auto rounded-xl border border-indigo-200 bg-white p-3 text-sm text-slate-900 shadow-lg ${isFocusedReader ? "bottom-4" : "bottom-20"}`}>
          <div className="flex items-center gap-2">
            <button type="button" className="min-w-0 flex-1 truncate text-left font-semibold text-indigo-700" aria-expanded={artifactOpen}
              onClick={() => setArtifactOpen(!artifactOpen)}>{artifact.title}</button>
            <button type="button" aria-label="Dismiss assistant result" onClick={() => setArtifact(null)}><X className="h-4 w-4" /></button>
          </div>
          {artifactOpen && <>
            <p className="mt-2 whitespace-pre-wrap break-words">{artifact.text}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-indigo-700">
              <button type="button" onClick={() => navigator.clipboard.writeText(artifact.text).then(() => notify("Copied.","success"),() => notify("Could not copy.","error"))}>Copy</button>
              <button type="button" onClick={() => {
                const url = URL.createObjectURL(new Blob([artifact.title+"\n\n"+artifact.text],{type:"text/plain;charset=utf-8"}));
                const anchor = document.createElement("a");
                anchor.href=url;
                anchor.download="skyx-assistant.txt";
                anchor.click();
                window.setTimeout(() => URL.revokeObjectURL(url),1000);
              }}>Download</button>
              {artifact.context && <button type="button" disabled={artifactSaving} onClick={async () => {
                const context = artifact.context;
                if (!context) return;
                setArtifactSaving(true);
                try {
                  if (await addAnnotation({...context,type:"note",color:"indigo",quote:artifact.title,noteText:artifact.text})) setArtifactOpen(false);
                } finally { setArtifactSaving(false); }
              }}>Save to Study Vault</button>}
            </div>
          </>}
        </section>
      )}

      {/* Lightweight Compact Floating Popup (No Full-Screen Dimmer!) */}
      <AnimatePresence>
        {isTutorOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className={`fixed ${popupPosClass} z-[65] ${
              expanded
                ? "sm:w-[540px] h-[640px] max-h-[84vh]"
                : "sm:w-[400px] h-[520px] max-h-[76vh]"
            } rounded-[24px] bg-white border border-slate-200/90 shadow-[0_24px_64px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden transition-[width,height] duration-200`}
          >
            {/* Minimal Gemini-Style Top Bar */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-white shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-display text-sm font-bold text-slate-900 tracking-tight truncate">
                  Skyx AI
                </span>

                {/* Compact Mode Toggle: Chat | Live */}
                <div className="ml-1 inline-flex items-center p-0.5 rounded-full bg-slate-100 border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setTab("chat")}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                      tab === "chat"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("voice")}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                      tab === "voice"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Radio className={`w-3 h-3 ${isLiveRunning ? "text-emerald-500 animate-pulse" : ""}`} />
                    Live
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {tab === "chat" && messages.length > 0 && (
                  <button
                    type="button"
                    onClick={startNewConversation}
                    title="New conversation"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                {tab === "chat" && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryOpen((v) => !v);
                        setVoiceHistoryOpen(false);
                        if (!historyOpen) fetchConversations();
                      }}
                      title="Conversation history"
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        historyOpen
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>

                    {/* History Dropdown */}
                    {historyOpen && (
                      <div className="absolute right-0 top-full mt-1 w-72 max-h-80 overflow-auto bg-white rounded-xl shadow-lg border border-slate-200 z-50 text-[11px]">
                        {/* Dropdown actions */}
                        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-100">
                          <button
                            type="button"
                            onClick={startNewConversation}
                            className="flex-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors cursor-pointer"
                          >
                            New
                          </button>
                          <button
                            type="button"
                            onClick={saveCurrentConversation}
                            className="flex-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors cursor-pointer"
                          >
                            Save Current
                          </button>
                          <button
                            type="button"
                            onClick={fetchConversations}
                            title="Refresh list"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            {historyLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Conversation list */}
                        {savedConversations.length === 0 && !historyLoading ? (
                          <div className="px-3 py-4 text-center text-slate-400">
                            No saved conversations yet.
                          </div>
                        ) : (
                          savedConversations.map((conv) => (
                            <div
                              key={conv.id}
                              className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-50 group cursor-pointer border-b border-slate-50 last:border-0"
                              onClick={() => loadSavedConversation(conv.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="truncate text-slate-800 font-medium">
                                  {conv.title || "Untitled"}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {conv.messageCount} messages ·{" "}
                                  {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConversation(conv.id);
                                }}
                                title="Delete conversation"
                                className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
                {tab === "voice" && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceHistoryOpen((v) => !v);
                        setHistoryOpen(false);
                        if (!voiceHistoryOpen) fetchVoiceConversations();
                      }}
                      title="Voice session history"
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        voiceHistoryOpen
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    {/* Voice History Dropdown */}
                    {voiceHistoryOpen && (
                      <div className="absolute right-0 top-full mt-1 w-72 max-h-80 overflow-auto bg-white rounded-xl shadow-lg border border-slate-200 z-50 text-[11px]">
                        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setLiveTranscripts([]);
                              setLiveConversationId(null);
                              setVoiceHistoryOpen(false);
                            }}
                            className="flex-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={fetchVoiceConversations}
                            title="Refresh list"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            {voiceHistoryLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {voiceConversations.length === 0 && !voiceHistoryLoading ? (
                          <div className="px-3 py-4 text-center text-slate-400">
                            No saved voice sessions yet.
                          </div>
                        ) : (
                          voiceConversations.map((conv) => (
                            <div
                              key={conv.id}
                              className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-50 group cursor-pointer border-b border-slate-50 last:border-0"
                              onClick={() => loadVoiceConversation(conv.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="truncate text-slate-800 font-medium">
                                  Voice Session
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {conv.messageCount} messages ·{" "}
                                  {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteVoiceConversation(conv.id);
                                }}
                                title="Delete session"
                                className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  title={expanded ? "Compact size" : "Expand popup"}
                  className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={closeAiTutor}
                  aria-label="Minimize AI popup"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subtle 1-Line Page Context Strip */}
            <div className="px-3.5 py-1.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2 text-[11px] shrink-0">
              <span className="truncate text-slate-500">
                {readPageContext ? (
                  <>
                    Page: <strong className="font-semibold text-slate-800">{pageTitle}</strong>
                  </>
                ) : (
                  "General Chat"
                )}
              </span>
              <button
                type="button"
                onClick={() => setReadPageContext((v) => !v)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-600 hover:text-indigo-700 hover:bg-white transition-colors shrink-0 cursor-pointer"
                title="Toggle reading active page context"
              >
                {readPageContext ? <Eye className="w-3 h-3 text-indigo-600" /> : <EyeOff className="w-3 h-3" />}
                <span>{readPageContext ? "On" : "Off"}</span>
              </button>
            </div>

            {/* ============================================================ */}
            {/* TAB 1: MINIMAL GEMINI-STYLE CHAT                             */}
            {/* ============================================================ */}
            {tab === "chat" ? (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 bg-white">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col justify-center items-start px-1 py-2">
                      <div className="text-lg font-display font-bold bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#2563EB] bg-clip-text text-transparent">
                        Hello, how can I help?
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Ask anything about <strong className="text-slate-700">{pageTitle}</strong> or chat freely in English or Bangla.
                      </p>

                      <div className="mt-4 w-full space-y-1.5">
                        {[
                          `Summarize what is on "${pageTitle}"`,
                          "Explain this topic simply in Bangla + English",
                          "Quiz me with 3 quick conceptual questions",
                        ].map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => sendChatMessage(prompt)}
                            className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/70 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-800 transition-colors cursor-pointer"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className="group">
                        {m.role === "user" ? (
                          <div className="flex justify-end">
                            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-slate-100 text-slate-900 px-3.5 py-2.5 text-[13.5px] leading-relaxed">
                              {m.text}
                            </div>
                          </div>
                        ) : (
                          /* Borderless clean Gemini-style assistant response */
                          <div className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="prose prose-sm prose-slate max-w-none text-[13.5px] leading-[1.7] prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:text-slate-900 prose-headings:font-display prose-headings:mt-3 prose-headings:mb-1.5 prose-code:text-indigo-700 prose-code:bg-indigo-50/70 prose-code:px-1 prose-code:rounded">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                              </div>

                              {m.citations && m.citations.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                                  {m.citations.slice(0, 4).map((c, idx) => (
                                    <a
                                      key={idx}
                                      href={c.uri}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-[10px] font-medium text-slate-600 hover:text-indigo-700 truncate max-w-[190px]"
                                    >
                                      <Globe className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{c.title}</span>
                                    </a>
                                  ))}
                                </div>
                              )}

                              <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(m.id, m.text)}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-700 cursor-pointer"
                                >
                                  {copiedId === m.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      Copy
                                    </>
                                  )}
                                </button>
                                {m.modelUsed && (
                                  <span className="text-[10px] font-mono text-slate-400">{m.modelUsed}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {chatLoading && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-500">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      </div>
                      <span>Thinking...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Minimal Gemini-Style Bottom Composer */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendChatMessage();
                  }}
                  className="p-2.5 bg-white border-t border-slate-100 shrink-0"
                >
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/90 focus-within:border-indigo-400 focus-within:bg-white transition-colors px-3 pt-2 pb-1.5">
                    <textarea
                      rows={1}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendChatMessage();
                        }
                      }}
                      placeholder="Ask Skyx AI anything..."
                      className="w-full resize-none bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none max-h-24 leading-relaxed"
                    />

                    <div className="flex items-center justify-between gap-2 pt-1.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <select
                          value={selectedChatModel}
                          onChange={(e) => setSelectedChatModel(e.target.value)}
                          aria-label="Select Gemini Chat Model"
                          className="max-w-[148px] truncate px-2 py-1 rounded-lg bg-white border border-slate-200/80 text-[10px] font-mono font-semibold text-slate-700 focus:outline-none focus:border-indigo-400 cursor-pointer"
                        >
                          {availableTextModels.map((m) => (
                            <option key={m.modelId} value={m.modelId}>
                              {m.displayName}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => setUseSearchGrounding((v) => !v)}
                          title="Toggle Live Web Search"
                          className={`p-1.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                            useSearchGrounding
                              ? "bg-indigo-100 text-indigo-700"
                              : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={toggleVoiceDictation}
                          title={isDictating ? "Stop dictation" : "Voice input"}
                          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                            isDictating
                              ? "bg-rose-500 text-white animate-pulse"
                              : "text-slate-500 hover:text-indigo-700 hover:bg-slate-200/60"
                          }`}
                        >
                          {isDictating ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="submit"
                          disabled={chatLoading || !chatInput.trim()}
                          aria-label="Send message"
                          className="w-7 h-7 rounded-full bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              /* ============================================================ */
              /* TAB 2: NEAT & CLEAN GEMINI LIVE (VOICE + SCREEN SHARE)       */
              /* ============================================================ */
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* Single-Row 3-Column Selector Bar: Model | Voice | Mode */}
                <div className="grid grid-cols-3 gap-1.5 px-3 py-2 bg-slate-50/90 border-b border-slate-100 shrink-0">
                  <select
                    aria-label="Live Model"
                    disabled={isLiveRunning}
                    value={selectedLiveModel}
                    onChange={(e) => setSelectedLiveModel(e.target.value)}
                    className="h-8 w-full px-2 rounded-lg bg-white border border-slate-200 font-mono text-[10px] font-semibold text-indigo-700 truncate focus:outline-none focus:border-indigo-400 disabled:opacity-60"
                  >
                    {availableLiveModels.map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.modelId}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Live Voice"
                    disabled={isLiveRunning}
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    className="h-8 w-full px-2 rounded-lg bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 truncate focus:outline-none focus:border-indigo-400 disabled:opacity-60"
                  >
                    {LIVE_VOICES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Live Teaching Mode"
                    disabled={isLiveRunning}
                    value={tutorMode}
                    onChange={(e) => setTutorMode(e.target.value as "explain" | "quiz" | "viva")}
                    className="h-8 w-full px-2 rounded-lg bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 truncate focus:outline-none focus:border-indigo-400 disabled:opacity-60"
                  >
                    <option value="explain">Explain</option>
                    <option value="quiz">Quiz</option>
                    <option value="viva">Viva</option>
                  </select>
                </div>

                {/* Error Alert (only when error occurs) */}
                {liveError && (
                  <div className="mx-3 mt-2.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 shrink-0">
                    {liveError}
                  </div>
                )}

                {/* Center Canvas: Compact Start Box (Idle) OR Clean Transcript Feed */}
                <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 bg-white">
                  {!isLiveRunning && liveTranscripts.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-full max-w-[240px] rounded-2xl border border-slate-200/85 bg-slate-50/70 p-4 text-center space-y-3">
                        <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-sm">
                          <Mic className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Live Voice &amp; Screen</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Speak in English or Bangla
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={startLiveSession}
                          className="w-full h-9 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Start Live</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {liveTranscripts.length === 0 && isLiveRunning && (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4 text-xs text-slate-500 space-y-2">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                              liveStatus === "speaking"
                                ? "bg-indigo-600 text-white scale-105 shadow-md"
                                : liveStatus === "connecting"
                                  ? "bg-amber-500 text-white animate-pulse"
                                  : "bg-emerald-500 text-white"
                            }`}
                          >
                            {liveStatus === "speaking" ? (
                              <Volume2 className="w-5 h-5 animate-pulse" />
                            ) : liveStatus === "connecting" ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Mic className="w-5 h-5" />
                            )}
                          </div>
                          <div className="font-semibold text-slate-800">
                            {liveStatus === "connecting"
                              ? "Connecting..."
                              : liveStatus === "speaking"
                                ? "Gemini Speaking..."
                                : isMuted
                                  ? "Microphone Muted"
                                  : "Listening... Speak now"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {activeLiveModelUsed} · {voiceName}
                          </div>
                        </div>
                      )}

                      {liveTranscripts.map((t) => (
                        <div
                          key={t.id}
                          className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                              t.role === "user"
                                ? "bg-slate-100 text-slate-900 rounded-tr-sm"
                                : "bg-indigo-50/75 text-slate-800 rounded-tl-sm"
                            }`}
                          >
                            <div className="text-[10px] font-semibold text-slate-400 mb-0.5">
                              {t.role === "user" ? "You" : "Skyx AI"}
                            </div>
                            {t.text}
                          </div>
                        </div>
                      ))}
                      <div ref={liveEndRef} />
                    </>
                  )}
                </div>

                {/* Live Screen Share Mini Preview Strip (only when sharing screen) */}
                {isSharingScreen && screenPreviewUrl && (
                  <div className="mx-3 mb-2 flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 text-white shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenPreviewUrl}
                      alt="Shared screen preview"
                      className="w-12 h-8 object-cover rounded-md border border-white/20 shrink-0"
                    />
                    <div className="min-w-0 flex-1 text-[10px]">
                      <div className="font-semibold text-emerald-300 truncate">Screen Live</div>
                      <div className="text-slate-300 truncate">Gemini can see your screen</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => stopScreenShare()}
                      className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-semibold cursor-pointer"
                    >
                      Stop
                    </button>
                  </div>
                )}

                {/* Compact Bottom Live Controls Bar */}
                {(isLiveRunning || liveTranscripts.length > 0) && (
                  <div className="p-2.5 bg-slate-50/90 border-t border-slate-100 space-y-2 shrink-0">
                    <div className="flex items-center justify-between gap-1.5">
                      {!isLiveRunning ? (
                        <button
                          type="button"
                          onClick={startLiveSession}
                          className="flex-1 h-9 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Start Live</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsMuted((m) => !m)}
                            className={`h-9 flex-1 rounded-xl text-[11px] font-semibold inline-flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                              isMuted
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                            <span>{isMuted ? "Muted" : "Mute"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={toggleScreenShare}
                            className={`h-9 flex-1 rounded-xl text-[11px] font-semibold inline-flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                              isSharingScreen
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {isSharingScreen ? (
                              <MonitorOff className="w-3.5 h-3.5" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5" />
                            )}
                            <span>{isSharingScreen ? "Stop" : "Screen"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={sendManualPageSyncToLive}
                            title="Sync current page to Gemini Live"
                            className="h-9 px-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer shrink-0"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={stopLiveSession}
                            className="h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer shrink-0"
                          >
                            <PhoneOff className="w-3.5 h-3.5" />
                            <span>End</span>
                          </button>
                        </>
                      )}
                    </div>

                    {isLiveRunning && (
                      <form onSubmit={sendLiveQuickPrompt} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={liveQuickText}
                          onChange={(e) => setLiveQuickText(e.target.value)}
                          placeholder="Type into live call..."
                          className="h-8 flex-1 px-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
                        />
                        <button
                          type="submit"
                          disabled={!liveQuickText.trim()}
                          className="h-8 w-8 rounded-lg bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 text-white flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
