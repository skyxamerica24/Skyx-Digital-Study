import { NextRequest, NextResponse } from "next/server";
import { parseValidatedJson, testModelSchema } from "@/lib/api-schemas";
import {
  formatGeminiError,
  getGeminiClient,
  isValidCustomGeminiModelId,
} from "@/lib/gemini-server";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const validated = await parseValidatedJson(req, testModelSchema);
    if (validated.errorResponse) return validated.errorResponse;
    const { model, category, secretSlot } = validated.data;

    if (!isValidCustomGeminiModelId(model)) {
      return NextResponse.json(
        { ok: false, error: `Unsupported or deprecated model ID: ${model}` },
        { status: 400 }
      );
    }

    const ai = getGeminiClient(secretSlot);

    if (category === "text") {
      const response = await ai.models.generateContent({
        model,
        contents: "Reply with OK.",
      });
      const latencyMs = Date.now() - startedAt;
      return NextResponse.json({
        ok: true,
        modelUsed: model,
        latencyMs,
        reply: (response.text || "OK").trim().slice(0, 40),
      });
    }

    // For live, tts, and transcribe models, verify model metadata & authorization via models.get
    const info = await ai.models.get({ model });
    const latencyMs = Date.now() - startedAt;
    return NextResponse.json({
      ok: true,
      modelUsed: info.name || model,
      latencyMs,
    });
  } catch (error) {
    const { message, status } = formatGeminiError(error);
    return NextResponse.json(
      { ok: false, error: message, latencyMs: Date.now() - startedAt },
      { status }
    );
  }
}
