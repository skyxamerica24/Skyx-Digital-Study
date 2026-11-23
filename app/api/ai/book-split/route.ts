import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { bookSplitSchema, parseValidatedJson } from "@/lib/api-schemas";
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

    const validated = await parseValidatedJson(req, bookSplitSchema);
    if (validated.errorResponse) return validated.errorResponse;
    const { rawText, bookTitle, subject, model, secretSlot } = validated.data;

    // Resolve channel config — no fallback
    const channel = await resolveChannelConfig("book-split");
    if (!channel) {
      return NextResponse.json({ error: "Book Split channel is not available." }, { status: 503 });
    }

    const ai = getGeminiClient(secretSlot || channel.credentialSlot || undefined);
    const selectedModel = model || channel.modelId || GEMINI_MODELS.GENERAL;

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: `Analyze the following raw textbook or study guide text for "${bookTitle || "Untitled Book"}" (${subject || "General Studies"}).
Automatically detect and split it into well-organized hierarchical Chapters, Sections, and Topics suitable for a digital reading platform.
Preserve all original educational facts, definitions, formulas, and bilingual Bangla/English terms. Clean up formatting into crisp readable Markdown paragraphs with subheadings where helpful.

Raw Text:
---
${rawText.slice(0, 35000)}
---`,
      config: {
        systemInstruction:
          "You are an intelligent digital publishing engine. Convert raw textbook prose into clean, structured Chapter -> Section -> Topic entries with high-readability Markdown.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              chapterNumber: { type: Type.INTEGER, description: "Chapter index starting at 1" },
              chapterTitle: { type: Type.STRING, description: "Clear chapter title" },
              sectionTitle: { type: Type.STRING, description: "Section name inside the chapter" },
              topicTitle: { type: Type.STRING, description: "Specific topic title" },
              readingMinutes: { type: Type.INTEGER, description: "Estimated reading time in minutes (2-20)" },
              contentMarkdown: { type: Type.STRING, description: "Clean, formatted Markdown reading content" },
            },
            required: [
              "chapterNumber",
              "chapterTitle",
              "sectionTitle",
              "topicTitle",
              "readingMinutes",
              "contentMarkdown",
            ],
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "[]").trim());
    const topics = Array.isArray(parsed) ? parsed : [];

    // Record tool run (non-blocking)
    try {
      await createToolRunDirect(user.userId, {
        channelId: "book-split",
        resultType: "book_split",
        inputSummary: `${bookTitle || "Unknown"} (${subject || "General"}) - ${rawText.length} chars`,
        modelUsed: selectedModel,
      });
    } catch {
      // Silent fail — response still returns
    }

    return NextResponse.json({
      topics,
      modelUsed: selectedModel,
    });
  } catch (error) {
    const { message, status } = formatGeminiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
