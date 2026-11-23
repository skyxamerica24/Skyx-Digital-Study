import { z } from "zod";
import { referenceImages } from "./reference-images";

const coordinate = z.number().finite().min(-20).max(20);
const vector = z.tuple([coordinate,coordinate,coordinate]);
const color = z.string().regex(/^#[a-f\d]{6}$/i);
const diagramPart = z.object({
  id:z.string().regex(/^[a-z0-9_-]{1,40}$/i), label:z.string().trim().min(1).max(100),
  shape:z.enum(["sphere","box","cylinder","cone","torus"]), position:vector,
  rotation:vector.optional(), size:z.number().finite().min(0.05).max(8), color,
});
export const diagramSpec = z.object({
  parts:z.array(diagramPart).min(1).max(48),
  connections:z.array(z.object({from:z.string(),to:z.string(),color})).max(80),
}).superRefine((spec,ctx) => {
  const ids = new Set(spec.parts.map(part => part.id));
  if (ids.size !== spec.parts.length) ctx.addIssue({code:"custom",message:"Part IDs must be unique."});
  if (spec.connections.some(edge => edge.from === edge.to || !ids.has(edge.from) || !ids.has(edge.to))) {
    ctx.addIssue({code:"custom",message:"Connections must reference two different existing parts."});
  }
});
export type DiagramSpec = z.infer<typeof diagramSpec>;
const topicContext = z.object({
  bookId:z.string().min(1).max(200),topicId:z.string().min(1).max(200),
  bookTitle:z.string().max(250),topicTitle:z.string().max(250),
});
export const artifactPayload = z.discriminatedUnion("kind",[
  z.object({kind:z.literal("example"),text:z.string().trim().min(1).max(1800)}),
  z.object({kind:z.literal("notes"),text:z.string().trim().min(1).max(9000),context:topicContext}),
  z.object({kind:z.literal("diagram"),spec:diagramSpec}),
  z.object({kind:z.literal("references"),images:referenceImages}),
]);
export type ArtifactPayload = z.infer<typeof artifactPayload>;
export const artifactEntry = z.object({
  id:z.string(),title:z.string(),payload:artifactPayload,pinned:z.boolean(),revision:z.number().int().positive(),
});
export type ArtifactEntry = z.infer<typeof artifactEntry>;
