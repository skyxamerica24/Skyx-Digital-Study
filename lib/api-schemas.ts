import { NextResponse } from "next/server";
import { z } from "zod";

export const bookSplitSchema = z.object({
  rawText: z
    .string()
    .trim()
    .min(40, "Please provide at least 40 characters of book text to structure into chapters and topics.")
    .max(120_000, "Input text exceeds maximum 120,000 character limit."),
  bookTitle: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(120).optional(),
  model: z.string().trim().max(80).optional(),
  secretSlot: z.string().trim().max(64).optional(),
});

export const tutorChatSchema = z.object({
  message: z.string().trim().min(1, "Message is required.").max(8000, "Message is too long."),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        text: z.string().max(8000),
      })
    )
    .max(40)
    .optional()
    .default([]),
  bookTitle: z.string().trim().max(200).optional(),
  topicTitle: z.string().trim().max(240).optional(),
  topicContent: z.string().max(40_000).optional(),
  librarySummary: z.string().max(10_000).optional(),
  useSearchGrounding: z.boolean().optional().default(false),
  tutorMode: z.enum(["explain", "quiz", "viva"]).optional().default("explain"),
  model: z.string().trim().max(80).optional(),
  secretSlot: z.string().trim().max(64).optional(),
  pageContext: z
    .object({
      panel: z.string().trim().max(40).optional(),
      route: z.string().trim().max(80).optional(),
      pageTitle: z.string().trim().max(240).optional(),
      visibleText: z.string().max(4500).optional(),
    })
    .optional(),
});

export const questionGenSchema = z.object({
  bookTitle: z.string().trim().min(1, "bookTitle is required.").max(200),
  chapterTitle: z.string().trim().min(1, "chapterTitle is required.").max(200),
  topicTitle: z.string().trim().min(1, "topicTitle is required.").max(240),
  contentMarkdown: z.string().trim().min(20, "contentMarkdown is required.").max(60_000),
  count: z.coerce.number().int().min(1).max(20).optional().default(5),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).optional().default("mixed"),
  excludeStems: z.array(z.string().max(500)).max(50).optional().default([]),
  model: z.string().trim().max(80).optional(),
  secretSlot: z.string().trim().max(64).optional(),
});

export const studyContentSchema = z.object({
  topicTitle: z.string().trim().min(1, "topicTitle is required.").max(240),
  bookTitle: z.string().trim().max(200).optional().default("Skyx Academy Textbook"),
  contentMarkdown: z.string().trim().min(20, "contentMarkdown is required.").max(60_000),
  tabKey: z.string().trim().min(1, "tabKey is required.").max(64),
  tabLabel: z.string().trim().max(120).optional(),
  customPrompt: z.string().trim().max(4000).optional(),
  language: z.enum(["en", "bn", "bilingual"]).optional().default("bilingual"),
  model: z.string().trim().max(80).optional(),
  secretSlot: z.string().trim().max(64).optional(),
});

export const transcribeSchema = z.object({
  audioBase64: z.string().min(16, "audioBase64 is required.").max(15_000_000, "Audio payload is too large."),
  mimeType: z
    .string()
    .trim()
    .regex(/^audio\/[a-z0-9.+-]+$/i, "Invalid audio MIME type.")
    .optional()
    .default("audio/webm"),
  model: z.string().trim().max(80).optional(),
  secretSlot: z.string().trim().max(64).optional(),
});

export const ttsSchema = z.object({
  text: z.string().trim().min(1, "Text content is required for speech synthesis.").max(20_000),
  mode: z.enum(["single", "podcast"]).optional().default("single"),
  voiceName: z.string().trim().min(1).max(40).optional().default("Kore"),
  topicTitle: z.string().trim().max(200).optional().default("Study Topic"),
  model: z.string().trim().max(80).optional(),
  secretSlot: z.string().trim().max(64).optional(),
});

const credentialId = z.string().trim().min(1).max(128);
export const readerBindingSchema = z.object({
  credentialId,
  modelId: z.string().trim().regex(/^gemini-[a-z0-9.-]{1,90}$/),
  enabled: z.boolean(),
});
export const readerAdminSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), label: z.string().trim().min(1).max(60), key: z.string().trim().min(16).max(512) }),
  z.object({ action: z.literal("replace"), credentialId, key: z.string().trim().min(16).max(512) }),
  z.object({ action: z.literal("enable"), credentialId, enabled: z.boolean() }),
  z.object({ action: z.literal("bind"), binding: readerBindingSchema }),
  z.object({ action: z.literal("test"), binding: readerBindingSchema }),
]);

export const testModelSchema = z.object({
  model: z.string().trim().min(3, "Model ID is required.").max(80),
  category: z.enum(["text", "live", "tts", "transcribe"]).optional().default("text"),
  secretSlot: z.string().trim().max(64).optional(),
});

export async function parseValidatedJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<{ data: z.infer<T>; errorResponse?: never } | { data?: never; errorResponse: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      errorResponse: NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 }),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      errorResponse: NextResponse.json(
        {
          error: firstIssue?.message || "Request validation failed.",
          details: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}
