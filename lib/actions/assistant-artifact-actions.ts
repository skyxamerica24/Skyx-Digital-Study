"use server";

import { z } from "zod";
import { prisma } from "../db";
import { readableBookFilter, requireStoreUser } from "../book-store-access";
import { artifactPayload, type ArtifactEntry, type ArtifactPayload } from "../assistant/artifacts";

function toEntry(row: {id:string;title:string;payload:unknown;pinned:boolean;revision:number}): ArtifactEntry {
  return {...row,payload:artifactPayload.parse(row.payload)};
}
const entryFields = {id:true,title:true,payload:true,pinned:true,revision:true} as const;

export async function listAssistantArtifacts(token: string | null) {
  const user = await requireStoreUser(token);
  const rows = await prisma.assistantArtifact.findMany({
    where:{userId:user.userId},orderBy:[{pinned:"desc"},{updatedAt:"desc"}],take:60,select:entryFields,
  });
  return rows.map(toEntry);
}

export async function saveAssistantArtifact(token: string | null, titleInput: string, input: ArtifactPayload) {
  const user = await requireStoreUser(token);
  const payload = artifactPayload.parse(input);
  const title = z.string().trim().min(1).max(120).parse(titleInput);
  if (payload.kind === "notes") {
    const topic = await prisma.bookTopic.findFirst({
      where:{id:payload.context.topicId,bookId:payload.context.bookId,isPublished:true,
        book:{AND:[await readableBookFilter(token),{isPublished:true}]}},select:{id:true},
    });
    if (!topic) throw new Error("Topic unavailable.");
  }
  return toEntry(await prisma.assistantArtifact.create({
    data:{userId:user.userId,kind:payload.kind,title,payload,
      ...(payload.kind === "diagram" ? {versions:{create:{revision:1,payload}}} : {})},
    select:entryFields,
  }));
}

export async function setAssistantArtifactPinned(token: string | null,id: string,pinned: boolean) {
  const user = await requireStoreUser(token);
  return toEntry(await prisma.assistantArtifact.update({
    where:{id,userId:user.userId},data:{pinned:z.boolean().parse(pinned)},select:entryFields,
  }));
}

export async function deleteAssistantArtifact(token: string | null,id: string) {
  const user = await requireStoreUser(token);
  await prisma.assistantArtifact.deleteMany({where:{id,userId:user.userId}});
}

export async function reviseAssistantDiagram(token: string | null,id: string,revision: number,input: ArtifactPayload) {
  const user = await requireStoreUser(token);
  const payload = artifactPayload.parse(input);
  if (payload.kind !== "diagram") throw new Error("Invalid diagram.");
  return prisma.$transaction(async tx => {
    const row = await tx.assistantArtifact.update({
      where:{id,userId:user.userId,kind:"diagram",revision},
      data:{revision:{increment:1},payload},select:entryFields,
    });
    await tx.assistantArtifactVersion.create({data:{artifactId:id,revision:row.revision,payload}});
    return toEntry(row);
  });
}

export async function listAssistantDiagramVersions(token: string | null,id: string) {
  const user = await requireStoreUser(token);
  const rows = await prisma.assistantArtifactVersion.findMany({
    where:{artifactId:id,artifact:{userId:user.userId}},orderBy:{revision:"desc"},take:50,
    select:{revision:true,payload:true},
  });
  return rows.map(row => ({revision:row.revision,payload:artifactPayload.parse(row.payload)}));
}
