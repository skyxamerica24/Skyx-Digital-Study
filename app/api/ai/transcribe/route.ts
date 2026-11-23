import { NextRequest, NextResponse } from "next/server";
import { parseValidatedJson, transcribeSchema } from "@/lib/api-schemas";
import { getGeminiClient, GEMINI_MODELS, formatGeminiError } from "@/lib/gemini-server";
import { resolveChannelConfig, createToolRunDirect } from "@/lib/actions/ai-history-actions";
import { getUserFromRequestCookie } from "@/lib/auth/request-user";

export async function POST(req: NextRequest) {
  try {
    // Authenticate user from session cookie
    const user = getUserFromRequestCookie(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 });
    }

    const validated = await parseValidatedJson(req, transcribeSchema);
    if (validated.errorResponse) return validated.errorResponse;
    const { audioBase64, mimeType, model, secretSlot } = validated.data;

    // Resolve channel config — no fallback
    const channel = await resolveChannelConfig("transcribe");
    if (!channel) {
      return NextResponse.json({ error: "Transcribe channel is not available." }, { status: 503 });
    }

    const ai = getGeminiClient(secretSlot || channel.credentialSlot || undefined);
    const selectedModel = model || channel.modelId || GEMINI_MODELS.TRANSCRIBE;
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text: "Transcribe this spoken study audio accurately. Preserve English and Bangla words naturally as spoken. Return only the clean transcript.",
          },
        ],
      },
    });

    const transcript = (response.text || "").trim();

    // Record tool run (non-blocking)
    try {
      await createToolRunDirect(user.userId, {
        channelId: "transcribe",
        resultType: "transcript",
        inputSummary: `Transcribe: ${mimeType} (${audioBase64.length} bytes)`,
        modelUsed: selectedModel,
      });
    } catch {
      // Silent fail — response still returns
    }

    return NextResponse.json({
      transcript,
      modelUsed: selectedModel,
    });
  } catch (error) {
    const { message, status } = formatGeminiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
