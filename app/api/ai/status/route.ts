import { NextResponse } from "next/server";
import { GEMINI_MODELS, getAvailableSecretSlots, isGeminiConfigured } from "@/lib/gemini-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isGeminiConfigured();
  const secretSlots = getAvailableSecretSlots();
  return NextResponse.json({
    configured,
    provider: "Google Gemini",
    managedBy: "Server Environment Secret (Settings > Secrets)",
    liveWsPath: "/api/live-ws",
    syncWsPath: "/api/sync-ws",
    secretSlots,
    defaults: {
      chat: GEMINI_MODELS.GENERAL,
      fast: GEMINI_MODELS.FAST,
      live: GEMINI_MODELS.LIVE_VOICE,
      tts: GEMINI_MODELS.TTS_LITE,
      transcribe: GEMINI_MODELS.TRANSCRIBE,
    },
  });
}
