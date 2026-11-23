"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import { getCurrentUser } from "../db/user";
import { bookDraftSchema, nodeKinds, orderBookNodes, type BookDraft } from "../book-builder";

async function requireAdmin(token: string | null) {
  if ((await getCurrentUser(token))?.role !== "admin") throw new Error("Administrator access is required.");
}

export async function listBookDrafts(token: string | null) {
  await requireAdmin(token);
  return (await prisma.manualBookDraft.findMany({ orderBy: { updatedAt: "desc" } })).map(row => ({
    id: row.id, revision: row.revision, publishedRevision: row.publishedRevision,
    document: bookDraftSchema.parse(row.document),
  }));
}

export async function saveBookDraft(token: string | null, id: string | null, revision: number, input: BookDraft, publish = false) {
  await requireAdmin(token);
  const document = bookDraftSchema.parse(input);
  if (!document.title) throw new Error("Enter a book title.");
  const ordered = orderBookNodes(document.nodes);
  const published = ordered.filter(item => item.visible);
  if (publish && !published.length) throw new Error("Add at least one visible section before publishing.");

  return prisma.$transaction(async tx => {
    let draft;
    if (id) {
      const changed = await tx.manualBookDraft.updateMany({
        where: { id, revision },
        data: { document, revision: { increment: 1 }, ...(publish && { publishedRevision: revision + 1 }) },
      });
      if (!changed.count) throw new Error("The draft changed in another session. Reload before saving again.");
      draft = { id, revision: revision + 1 };
    } else {
      draft = await tx.manualBookDraft.create({
        data: { document, ...(publish && { publishedRevision: 1 }) },
        select: { id: true, revision: true },
      });
    }
    if (!publish) return { ...draft, catalog: null };

    const { nodes: _nodes, ...metadata } = document;
    const values = { ...metadata, isPublished: true, totalTopics: published.length };
    const book = await tx.book.upsert({
      where: { id: draft.id },
      create: { id: draft.id, ...values, listing: { create: {} } },
      update: values,
    });
    await tx.bookTopic.updateMany({
      where: { bookId: book.id, builderPath: { not: null }, isPublished: true },
      data: { isPublished: false },
    });
    const topics = [];
    for (const [orderIndex, { node, path, chapter }] of published.entries()) {
      const topicId = book.id + "-" + node.id;
      const data = {
        bookId: book.id, chapterNumber: chapter, chapterTitle: path[0],
        sectionTitle: path.slice(1, -1).join(" / "), topicTitle: node.title,
        builderPath: path.join(" / "), builderParentId: node.parentId ? book.id + "-" + node.parentId : null,
        orderIndex, contentMarkdown: node.markdown, readingMinutes: Math.max(1, Math.ceil(node.markdown.trim().split(/\s+/).length / 220)),
        isPublished: true,
      };
      topics.push(await tx.bookTopic.upsert({ where: { id: topicId }, create: { id: topicId, ...data }, update: data }));
    }
    return { ...draft, catalog: { book, topics } };
  }, { timeout: 30000 });
}

export async function importBuilderOutline(token: string | null, metadata: Omit<BookDraft, "nodes">,
  outline: { key: string; parentKey: string | null; title: string; markdown: string }[]) {
  await requireAdmin(token);
  const ids = new Map(outline.map(item => [item.key, randomUUID()]));
  if (ids.size !== outline.length) throw new Error("The outline contains duplicate sections.");
  const nodes = outline.map(item => {
    const parentId = item.parentKey ? ids.get(item.parentKey) : null;
    if (parentId === undefined) throw new Error("An outline parent is missing.");
    return { id: ids.get(item.key)!, parentId, title: item.title.trim().slice(0, 195),
      kind: parentId ? "topic" as const : "chapter" as const, markdown: item.markdown, visible: true };
  });
  const ordered = orderBookNodes(nodes);
  return saveBookDraft(token, null, 0, {...metadata, nodes:ordered.map(({node,depth}) =>
    ({...node,kind:nodeKinds[Math.min(depth,nodeKinds.length-1)]})) });
}
