"use server";

import { z } from "zod";
import { prisma } from "../db";
import { getCurrentUser } from "../db/user";
import { readableBookFilter, requireStoreUser } from "../book-store-access";

export async function loadStudyTabs(token: string | null) {
  const admin = (await getCurrentUser(token))?.role === "admin";
  const book = await readableBookFilter(token);
  const [types, tabs] = await Promise.all([
    prisma.studyTabType.findMany({ where: admin ? {} : { isPublished: true }, orderBy: { orderIndex: "asc" } }),
    prisma.topicStudyTab.findMany({ where: admin ? {} : { isPublished: true, book } }),
  ]);
  // Topics are not foreign keys on saved tabs. Exclude tabs for retired or hidden topics.
  if (admin || !tabs.length) return { types, tabs };
  const visible = await prisma.bookTopic.findMany({
    where: { id: { in: [...new Set(tabs.map(tab => tab.topicId))] }, book, isPublished: true },
    select: { id: true },
  });
  const ids = new Set(visible.map(topic => topic.id));
  return { types, tabs: tabs.filter(tab => ids.has(tab.topicId)) };
}

const typeSchema = z.object({
  id: z.string().min(1), key: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().trim().min(1).max(46), promptTemplate: z.string().max(1950),
  orderIndex: z.number().int(), isSystem: z.boolean(), isPublished: z.boolean(),
});

export async function persistStudyTabType(token: string | null, input: z.infer<typeof typeSchema>) {
  await requireStoreUser(token, true);
  const { id, ...data } = typeSchema.parse(input);
  return prisma.studyTabType.upsert({ where: { key: data.key }, create: { id, ...data }, update: data });
}

const tabSchema = z.object({
  id: z.string().min(1), bookId: z.string().min(1), topicId: z.string().min(1),
  tabKey: z.string().regex(/^[a-z0-9_]+$/), contentMarkdown: z.string().trim().min(1).max(39000),
  generatedByModel: z.string(), isPublished: z.boolean(),
});

export async function persistTopicStudyTab(token: string | null, input: z.infer<typeof tabSchema>) {
  await requireStoreUser(token, true);
  const { id, ...data } = tabSchema.parse(input);
  const topic = await prisma.bookTopic.findFirst({where: {id:data.topicId, bookId:data.bookId},select:{id:true}});
  if (!topic) throw new Error("The selected topic was not found in this book.");
  return prisma.topicStudyTab.upsert({ where: { id }, create: { id, ...data }, update: data });
}
