import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODELS = {
  GENERAL: "gemini-4-hydrogen",
  FAST: "gemini-3.1-flash-lite",
  LIVE_VOICE: "gemini-3.8-live",
  LIVE_THINKING: "gemini-3.8-live-extended-thinking",
  TTS_FLAGSHIP: "gemini-3.8-flash-tts",
  TTS_LITE: "gemini-3.8-flash-lite-tts",
  TRANSCRIBE: "gemini-3.5-transcribe",
  EMBEDDING: "gemini-embedding-2",
} as const;

const DEPRECATED_PREFIXES = [
  "gemini-1.0",
  "gemini-1.5",
  "gemini-2.0",
  "gemini-pro",
];

const MODEL_ID_REGEX = /^gemini-[a-z0-9][a-z0-9.\-]{1,62}$/i;

export function isValidCustomGeminiModelId(model?: string): boolean {
  if (!model) return false;
  const trimmed = model.trim();
  if (!MODEL_ID_REGEX.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (DEPRECATED_PREFIXES.some((prefix) => lower === prefix || lower.startsWith(`${prefix}-`) || lower.startsWith(`${prefix}.`))) {
    return false;
  }
  return true;
}

export function resolveTextModel(requested?: string): string | null {
  if (requested && isValidCustomGeminiModelId(requested)) {
    const lower = requested.trim().toLowerCase();
    if (!lower.includes("-live") && !lower.endsWith("-tts") && !lower.includes("embedding")) {
      return requested.trim();
    }
  }
  return null;
}

export function resolveLiveModel(requested?: string): string | null {
  if (requested && isValidCustomGeminiModelId(requested)) {
    const lower = requested.trim().toLowerCase();
    if (lower.includes("live")) {
      return requested.trim();
    }
  }
  return null;
}

export function resolveTtsModel(requested?: string): string | null {
  if (requested && isValidCustomGeminiModelId(requested)) {
    const lower = requested.trim().toLowerCase();
    if (lower.includes("tts")) {
      return requested.trim();
    }
  }
  return null;
}

export function resolveTranscribeModel(requested?: string): string | null {
  if (requested && isValidCustomGeminiModelId(requested)) {
    const lower = requested.trim().toLowerCase();
    if (!lower.includes("-live") && !lower.endsWith("-tts") && !lower.includes("embedding")) {
      return requested.trim();
    }
  }
  return null;
}

const SAFE_SECRET_SLOT_REGEX = /^(?:GEMINI|GOOGLE)(?:_[A-Z0-9]+)*_KEY(?:_[A-Z0-9]+)*$/;

export interface ServerSecretSlot {
  id: string;
  label: string;
  isDefault: boolean;
}

export function isValidSecretSlotName(slot?: string): slot is string {
  return Boolean(slot && SAFE_SECRET_SLOT_REGEX.test(slot.trim()));
}

export function getAvailableSecretSlots(): ServerSecretSlot[] {
  const foundKeys = Object.keys(process.env)
    .filter((k) => SAFE_SECRET_SLOT_REGEX.test(k) && Boolean(process.env[k]?.trim()))
    .sort((a, b) => {
      if (a === "GEMINI_API_KEY") return -1;
      if (b === "GEMINI_API_KEY") return 1;
      return a.localeCompare(b);
    });

  return foundKeys.map((keyName, idx) => ({
    id: keyName,
    label:
      keyName === "GEMINI_API_KEY"
        ? "From Secret · Default"
        : `From Secret · ${keyName}`,
    isDefault: idx === 0,
  }));
}

export function isGeminiConfigured(): boolean {
  return Object.keys(process.env).some(
    (k) => SAFE_SECRET_SLOT_REGEX.test(k) && Boolean(process.env[k]?.trim())
  );
}

export function getGeminiClient(secretSlot?: string): GoogleGenAI {
  let apiKey: string | undefined;
  // Use the explicitly provided slot first
  if (secretSlot && isValidSecretSlotName(secretSlot)) {
    const candidate = process.env[secretSlot.trim()]?.trim();
    if (candidate) {
      apiKey = candidate;
    }
  }
  // Fall back to default GEMINI_API_KEY only (no implicit scan of all env keys)
  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY?.trim();
  }
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please check Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export function formatGeminiError(error: unknown): { message: string; status: number } {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("PERMISSION_DENIED") || raw.includes("API_KEY_INVALID") || raw.includes("403")) {
    return {
      message: "Gemini API authorization failed. Please verify your API key in Settings > Secrets.",
      status: 403,
    };
  }
  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("429")) {
    return {
      message: "API quota exceeded. Try switching to gemini-4-hydrogen or gemini-3.1-flash-lite, or check your billing tier.",
      status: 429,
    };
  }
  return {
    message: raw || "Gemini AI request failed. Please try again.",
    status: 500,
  };
}
