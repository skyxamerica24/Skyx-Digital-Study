import { NextRequest, NextResponse } from "next/server";
import { parseValidatedJson, tutorChatSchema } from "@/lib/api-schemas";
import { getGeminiClient, GEMINI_MODELS, formatGeminiError } from "@/lib/gemini-server";
import { resolveChannelConfig } from "@/lib/actions/ai-history-actions";

export async function POST(req: NextRequest) {
  try {
    const validated = await parseValidatedJson(req, tutorChatSchema);
    if (validated.errorResponse) return validated.errorResponse;
    const {
      message,
      history,
      bookTitle,
      topicTitle,
      topicContent,
      librarySummary,
      useSearchGrounding,
      tutorMode,
      model,
      secretSlot,
      pageContext,
    } = validated.data;

    // Resolve channel config — no fallback
    const channel = await resolveChannelConfig(useSearchGrounding ? "grounding" : "chat");
    if (!channel) {
      return NextResponse.json(
        { error: `Channel "${useSearchGrounding ? "grounding" : "chat"}" is not available.` },
        { status: 503 }
      );
    }

    const ai = getGeminiClient(secretSlot || channel.credentialSlot || undefined);
    const selectedModel = model || channel.modelId || GEMINI_MODELS.GENERAL;

    const modeDirective =
      tutorMode === "quiz"
        ? "SOCRATIC QUIZ MODE: Evaluate the student's answer if they responded to a question, explain clearly if wrong, and follow up with one targeted conceptual question."
        : tutorMode === "viva"
          ? "VIVA EXAMINER MODE: Grade the student's response concisely (Correct / Partially Correct / Needs Review), give the crisp textbook key point, and ask the next viva question."
          : "CLEAR ASSISTANT MODE: Give crisp, well-structured, helpful answers in clean Markdown. Match the user's language (English or Bangla) naturally.";

    const pageSummaryBlock = pageContext
      ? [
          pageContext.panel ? `Active Workspace Panel: ${pageContext.panel}` : "",
          pageContext.route ? `Active Screen / Route: ${pageContext.route}` : "",
          pageContext.pageTitle ? `Visible Screen Title: ${pageContext.pageTitle}` : "",
          pageContext.visibleText
            ? `Live On-Screen Content Snapshot:\n${pageContext.visibleText.slice(0, 3800)}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const contextSection = [
      pageSummaryBlock ? `CURRENT LIVE PAGE CONTEXT:\n${pageSummaryBlock}` : "",
      bookTitle ? `Active Book: ${bookTitle}` : "",
      topicTitle ? `Active Topic: ${topicTitle}` : "",
      topicContent ? `Active Topic Excerpt:\n${topicContent.slice(0, 6000)}` : "",
      librarySummary ? `Other Books Available in Skyx Academy Library:\n${librarySummary.slice(0, 1800)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const systemInstruction = `You are Skyx AI Assistant inside Skyx Academy, a bilingual (English & Bangla) digital learning and management platform.
${modeDirective}
You can read the user's current screen context below (whether they are on the Learner Dashboard, Book Reader, 3D Lab, Exam Center, Settings, or Admin Workspace) AND also answer general knowledge or study questions beyond the current page.
Keep answers clean, concise, scannable, and directly useful.

${contextSection}`;

    const contents = [
      ...history.slice(-12).map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
      {
        role: "user" as const,
        parts: [{ text: message.trim() }],
      },
    ];

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
        ...(useSearchGrounding ? { tools: [{ googleSearch: {} }] } : {}),
      },
    });

    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const citations: { title: string; uri: string }[] = [];
    for (const chunk of rawChunks) {
      if (chunk.web?.uri) {
        citations.push({
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri,
        });
      }
    }

    return NextResponse.json({
      text: response.text || "",
      modelUsed: selectedModel,
      citations,
    });
  } catch (error) {
    const { message, status } = formatGeminiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
