import { z } from "zod";
import { diagramSpec } from "./artifacts";

export const destinations = ["dashboard", "library", "my-library", "exams", "exam-history", "vault", "revision", "book-manager"] as const;
export const diagrams = ["human_heart", "eukaryotic_cell", "atomic_structure", "molecular_geometry"] as const;
const label = z.string().trim().min(1).max(120);
const boardPoint = z.tuple([z.number().min(0).max(320),z.number().min(0).max(200)]);
export const whiteboardArgs = z.object({
  title:label,strokes:z.array(z.array(boardPoint).min(2).max(40)).min(1).max(16),
});

export const clientActionSchema = z.discriminatedUnion("name", [
  z.object({name:z.literal("spotlight_element"),args:z.object({quote:label,zoom:z.boolean()})}),
  z.object({name:z.literal("show_concept_animation"),args:z.object({title:label,steps:z.array(label).min(2).max(6)})}),
  z.object({name:z.literal("draw_whiteboard"),args:whiteboardArgs}),
  z.object({name:z.literal("go_to_page"),args:z.object({page:z.number().int().min(1).max(100000)})}),
  z.object({name:z.literal("find_reference_image"),args:z.object({query:z.string().trim().min(2).max(120)})}),
  z.object({name:z.literal("edit_custom_diagram"),args:z.object({spec:diagramSpec})}),
  z.object({name:z.literal("build_custom_diagram"),args:z.object({title:z.string().trim().min(1).max(120),spec:diagramSpec})}),
  z.object({ name: z.literal("navigate_app"), args: z.object({ destination: z.enum(destinations) }) }),
  z.object({ name: z.literal("open_diagram_3d"), args: z.object({ model: z.enum(diagrams) }) }),
  z.object({ name: z.literal("control_reader"), args: z.object({
    setting: z.enum(["paper", "sepia", "midnight", "larger-text", "smaller-text"]),
  }) }),
  z.object({ name: z.literal("open_topic"), args: z.object({ topicId: z.string().min(1).max(200) }) }),
  z.object({ name: z.literal("show_example_card"), args: z.object({ title: z.string().trim().min(1).max(120), text: z.string().trim().min(1).max(1800) }) }),
  z.object({ name: z.literal("make_structured_notes"), args: z.object({
    topicId: z.string().min(1).max(200), title: z.string().trim().min(1).max(120),
    points: z.array(z.string().trim().min(1).max(700)).min(1).max(12),
  }) }),
]);

export type AssistantAction = z.infer<typeof clientActionSchema>;

export const backgroundNotesArgs = z.object({
  topicId:z.string().min(1).max(200),
  language:z.enum(["bn","en","bilingual"]),
});

export const serverToolSchema = z.discriminatedUnion("name", [
  z.object({ name: z.literal("get_my_progress"), args: z.object({}) }),
  z.object({ name: z.literal("find_books_by_author"), args: z.object({ author: z.string().trim().min(1).max(120) }) }),
  z.object({ name: z.literal("get_book_toc"), args: z.object({ bookId: z.string().min(1).max(200) }) }),
  z.object({ name: z.literal("find_topic"), args: z.object({ query: z.string().trim().min(1).max(120) }) }),
  z.object({ name: z.literal("get_topic_content"), args: z.object({ topicId: z.string().min(1).max(200) }) }),
]);
export type ServerTool = z.infer<typeof serverToolSchema>;
