import { NextRequest, NextResponse } from "next/server";
import { parseValidatedJson, studyContentSchema } from "@/lib/api-schemas";
import { getGeminiClient, GEMINI_MODELS, formatGeminiError } from "@/lib/gemini-server";
import { resolveChannelConfig, getUserFromRequestCookie, createToolRunDirect } from "@/lib/actions/ai-history-actions";

export async function POST(req: NextRequest) {
  try {
    // Authenticate user from session cookie
    const user = getUserFromRequestCookie(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 });
    }

    const validated = await parseValidatedJson(req, studyContentSchema);
    if (validated.errorResponse) return validated.errorResponse;
    const {
      topicTitle,
      bookTitle,
      contentMarkdown,
      tabKey,
      tabLabel,
      customPrompt,
      language,
      model,
      secretSlot,
    } = validated.data;

    // Resolve channel config — no fallback
    const channel = await resolveChannelConfig("study-content");
    if (!channel) {
      return NextResponse.json({ error: "Study Content channel is not available." }, { status: 503 });
    }

    const ai = getGeminiClient(secretSlot || channel.credentialSlot || undefined);
    const selectedModel = model || channel.modelId || GEMINI_MODELS.GENERAL;

    const taskGuides: Record<string, string> = {
      summary:
        "Create a clear, structured, comprehensive academic summary of this topic so NO critical exam fact, mechanism, formula, or definition is lost. Use clean headings and concise bullet points.",
      ultra_short:
        "Create an Ultra-Short 30-second exam-eve revision sheet. Maximum 6-8 razor-sharp bullet points, bold key terms, and one 2-line takeaway. Zero fluff.",
      key_points:
        "Extract the 8-12 highest-yield Key Points & Exam Facts from this topic. Number each point and bold the core term or number.",
      memorize:
        "Create powerful Memorization Tricks: include catchy mnemonics, acronyms, Bangla-English rhythmic memory hooks, visual analogies, and common exam trap warnings.",
      qa:
        "Generate 6 high-yield Short Q&A / Viva Questions with crisp, accurate, textbook-grade answers directly grounded in this topic.",
    };

    const instruction =
      customPrompt?.trim() ||
      taskGuides[tabKey] ||
      `Create structured educational study content for the "${tabLabel || tabKey}" tab based on the provided topic.`;

    const langNote =
      language === "bn"
        ? "Write primarily in clear academic Bangla, keeping standard scientific terms in English in parentheses."
        : language === "bilingual"
          ? "Match the language style of the source text (provide crisp English with helpful Bangla clarifications where appropriate)."
          : "Write in clear, crisp academic English.";

    const prompt = `Book: ${bookTitle || "Skyx Academy Textbook"}
Topic: ${topicTitle}
Target Study Tab: ${tabLabel || tabKey}

Task: ${instruction}
Language Guideline: ${langNote}

Source Textbook Content:
---
${contentMarkdown.slice(0, 28000)}
---

Return clean, well-formatted Markdown ready for students to read comfortably.`;

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        systemInstruction:
          "You are an expert academic curriculum designer and educator for Skyx Academy. Produce accurate, structured, high-readability Markdown study materials.",
      },
    });

    // Record tool run (non-blocking)
    try {
      await createToolRunDirect(user.userId, {
        channelId: "study-content",
        resultType: tabKey,
        inputSummary: `${bookTitle || "Unknown"}: ${topicTitle || "Unknown"} (${tabKey})`,
        modelUsed: selectedModel,
      });
    } catch {
      // Silent fail — response still returns
    }

    return NextResponse.json({
      contentMarkdown: response.text || "",
      modelUsed: selectedModel,
    });
  } catch (error) {
    const { message, status } = formatGeminiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
