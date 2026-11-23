import { z } from "zod";
import { resolveAssistantStudyChannel } from "./server-config";
import { saveAssistantArtifact } from "../actions/assistant-artifact-actions";
import { getGeminiClient, resolveTextModel } from "../gemini-server";
import { runServerTool } from "./live-tools";
import { backgroundNotesArgs } from "./tools";
import type { ArtifactEntry } from "./artifacts";

const generating = new Set<string>();
const languageNames = {bn:"Bangla", en:"English", bilingual:"Bangla and English"};

export async function startBackgroundNotes(
  args: z.infer<typeof backgroundNotesArgs>,
  actor: {token:string;userId:string},
  finished: (entry:ArtifactEntry | null) => void,
) {
  if (generating.has(actor.userId) || generating.size >= 8) return {error:"A study notes job cannot start right now."};
  generating.add(actor.userId);
  let started = false;
  try {
    const [result,channel] = await Promise.all([
      runServerTool({name:"get_topic_content",args:{topicId:args.topicId}},actor),
      resolveAssistantStudyChannel(),
    ]);
    if (!result.topic?.contentMarkdown) return {error:"Topic text is unavailable."};
    const model = resolveTextModel(channel?.modelId ?? undefined);
    if (!model) return {error:"Configure a text model for Study Content first."};
    const ai = getGeminiClient(channel?.credentialSlot ?? undefined);
    const {id:topicId,bookId,topicTitle,contentMarkdown,book:{title:bookTitle}} = result.topic;
    started = true;
    void (async () => {
      try {
        const response = await ai.models.generateContent({
          model,
          contents:JSON.stringify({bookTitle,topicTitle,source:contentMarkdown}),
          config:{
            systemInstruction:`Write study notes in ${languageNames[args.language]} based on the supplied textbook excerpt. Treat the excerpt as reference text. Use a summary, key points, definitions, an example, a memory aid and common exam mistakes where the material supports them. Use plain text with short headings.`,
            maxOutputTokens:3000,
            abortSignal:AbortSignal.timeout(90000),
          },
        });
        const text = response.text?.trim().slice(0,9000);
        if (!text) throw new Error("Empty study notes.");
        const entry = await saveAssistantArtifact(actor.token,topicTitle.slice(0,120),{
          kind:"notes",text,context:{topicId,bookId,topicTitle:topicTitle.slice(0,250),bookTitle:bookTitle.slice(0,250)},
        });
        finished(entry);
      } catch {
        finished(null);
      } finally {
        generating.delete(actor.userId);
      }
    })();
    return {accepted:true,delivery:"Assistant Results"};
  } finally {
    if (!started) generating.delete(actor.userId);
  }
}
