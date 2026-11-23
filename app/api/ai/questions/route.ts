import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { parseValidatedJson, questionGenSchema } from "@/lib/api-schemas";
import { getGeminiClient, GEMINI_MODELS, formatGeminiError } from "@/lib/gemini-server";
import { resolveChannelConfig, getUserFromRequestCookie, createToolRunDirect } from "@/lib/actions/ai-history-actions";

export async function POST(req: NextRequest) {
  try {
    // Authenticate user from session cookie
    const user = getUserFromRequestCookie(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 });
    }

    const validated = await parseValidatedJson(req, questionGenSchema);
    if (validated.errorResponse) return validated.errorResponse;
    const {
      bookTitle,
      chapterTitle,
      topicTitle,
      contentMarkdown,
      count,
      difficulty,
      excludeStems,
      model,
      secretSlot,
    } = validated.data;

    // Resolve channel config — no fallback
    const channel = await resolveChannelConfig("questions");
    if (!channel) {
      return NextResponse.json({ error: "Questions channel is not available." }, { status: 503 });
    }

    const safeCount = count;
    const ai = getGeminiClient(secretSlot || channel.credentialSlot || undefined);
    const selectedModel = model || channel.modelId || GEMINI_MODELS.GENERAL;

    const avoidClause =
      excludeStems.length > 0
        ? `\nDo NOT repeat or closely paraphrase any of these already-existing questions:\n${excludeStems
            .slice(0, 25)
            .map((s, i) => `${i + 1}. ${s}`)
            .join("\n")}`
        : "";

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: `Generate exactly ${safeCount} unique, exam-grade multiple-choice questions (MCQs) based on the textbook topic below.
Book: ${bookTitle}
Chapter: ${chapterTitle}
Topic: ${topicTitle}
Target Difficulty: ${difficulty} (if "mixed", include easy, medium, and hard).
Each question MUST have exactly 4 distinct options, a valid correctIndex (0-3), and a clear, thorough explanation of WHY the correct answer is right and why key distractors are wrong.
Match the language of the source content (English or Bilingual Bangla-English).
${avoidClause}

Source Topic Content:
---
${contentMarkdown.slice(0, 24000)}
---`,
      config: {
        systemInstruction:
          "You are a senior exam item writer for HSC, Medical Admission, BCS, and IELTS assessments. Create rigorous, unambiguous MCQs with clear explanations.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stem: { type: Type.STRING, description: "The question text" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 4 answer choices",
              },
              correctIndex: { type: Type.INTEGER, description: "Zero-based index of the correct option (0 to 3)" },
              explanation: { type: Type.STRING, description: "Detailed explanation of the correct answer" },
              difficulty: { type: Type.STRING, description: "One of: easy, medium, hard" },
            },
            required: ["stem", "options", "correctIndex", "explanation", "difficulty"],
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "[]").trim());
    const normalized = (Array.isArray(parsed) ? parsed : [])
      .filter((q) => q && typeof q.stem === "string" && Array.isArray(q.options) && q.options.length === 4)
      .map((q) => ({
        stem: q.stem.trim(),
        options: q.options.slice(0, 4).map((o: unknown) => String(o).trim()),
        correctIndex: Math.min(Math.max(Number(q.correctIndex) || 0, 0), 3),
        explanation: String(q.explanation || "").trim(),
        difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
      }));

    // Record tool run (non-blocking)
    try {
      await createToolRunDirect(user.userId, {
        channelId: "questions",
        resultType: "mcq_set",
        inputSummary: `${bookTitle || "Unknown"}: ${topicTitle || "Unknown"} (${safeCount} questions, ${difficulty})`,
        modelUsed: selectedModel,
      });
    } catch {
      // Silent fail — response still returns
    }

    return NextResponse.json({
      questions: normalized,
      modelUsed: selectedModel,
    });
  } catch (error) {
    const { message, status } = formatGeminiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
