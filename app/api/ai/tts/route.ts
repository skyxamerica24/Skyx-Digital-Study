import { NextRequest, NextResponse } from "next/server";
import { parseValidatedJson, ttsSchema } from "@/lib/api-schemas";
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

    const validated = await parseValidatedJson(req, ttsSchema);
    if (validated.errorResponse) return validated.errorResponse;
    const { text, mode, voiceName, topicTitle, model, secretSlot } = validated.data;

    // Resolve channel config — no fallback
    const channel = await resolveChannelConfig("tts");
    if (!channel) {
      return NextResponse.json({ error: "TTS channel is not available." }, { status: 503 });
    }

    const ai = getGeminiClient(secretSlot || channel.credentialSlot || undefined);
    const selectedTtsModel = model || channel.modelId || GEMINI_MODELS.TTS_LITE;
    const cleanText = text
      .replace(/[#*_`>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2600);

    if (mode === "podcast") {
      const scriptResp = await ai.models.generateContent({
        model: GEMINI_MODELS.FAST,
        contents: `Convert this study material on "${topicTitle}" into a crisp, engaging 4-line educational mini-podcast dialogue between two speakers: "Dr. Nora" (warm professor) and "Rafi" (curious student). Keep total length under 120 words. Format each line strictly as:
Dr. Nora: ...
Rafi: ...

Material:
${cleanText}`,
      });

      const lines = (scriptResp.text || "")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("Dr. Nora:") || l.startsWith("Rafi:"));

      const parts =
        lines.length >= 2
          ? lines.map((line) => {
              const isNora = line.startsWith("Dr. Nora:");
              return {
                text: line,
                speechMetadata: {
                  speaker: isNora ? "Dr. Nora" : "Rafi",
                  style: isNora ? "Warm, clear academic lecturer" : "Engaged, curious honors student",
                },
              };
            })
          : [
              {
                text: `Dr. Nora: Let's review ${topicTitle}. ${cleanText.slice(0, 350)}`,
                speechMetadata: { speaker: "Dr. Nora", style: "Warm, clear academic lecturer" },
              },
              {
                text: "Rafi: That makes the core mechanism much easier to remember for exams!",
                speechMetadata: { speaker: "Rafi", style: "Engaged, curious honors student" },
              },
            ];

      const ttsResponse = await ai.models.generateContent({
        model: selectedTtsModel,
        contents: [{ role: "user", parts }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: "Dr. Nora", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
                { speaker: "Rafi", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } },
              ],
            },
          },
        },
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return NextResponse.json({ error: "No audio returned by TTS model." }, { status: 502 });
      }
      return NextResponse.json({
        audioBase64: base64Audio,
        mimeType: "audio/wav",
        modelUsed: selectedTtsModel,
      });
    }

    const response = await ai.models.generateContent({
      model: selectedTtsModel,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: "Clear, calm, articulate academic audiobook narrator",
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return NextResponse.json({ error: "No audio generated from TTS model." }, { status: 502 });
    }

    // Record tool run (non-blocking)
    try {
      await createToolRunDirect(user.userId, {
        channelId: "tts",
        resultType: (mode as string) === "podcast" ? "podcast_audio" : "audio",
        inputSummary: topicTitle ? `TTS: ${topicTitle} (${mode})` : `TTS: ${text.slice(0, 80)}... (${mode})`,
        modelUsed: selectedTtsModel,
      });
    } catch {
      // Silent fail — response still returns
    }

    return NextResponse.json({
      audioBase64: base64Audio,
      mimeType: "audio/wav",
      modelUsed: selectedTtsModel,
    });
  } catch (error) {
    const { message, status } = formatGeminiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
