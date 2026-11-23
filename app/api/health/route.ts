import { NextResponse } from "next/server";
import { isGeminiConfigured } from "@/lib/gemini-server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "skyx-academy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    services: {
      geminiGatewayConfigured: isGeminiConfigured(),
      zodValidationEnabled: true,
      liveVoiceWsPath: "/api/live-ws",
    },
  });
}
