'use server'

import { z } from 'zod'
import { prisma } from '../db'
import {
  buildTree,
  depthOf,
  descendantIds,
  kindForDepth,
  nodesToTopicRows,
  parseOutline,
  walkDfs,
  wouldCreateCycle,
  type FlatNode,
} from '../book-builder/tree'

const kindSchema = z.enum(['chapter', 'topic', 'subtopic', 'point'])

const createNodeSchema = z.object({
  bookId: z.string().min(1),
  parentId: z.string().nullable().optional(),
  kind: kindSchema.optional(),
  title: z.string().min(1, 'Title is required').max(300),
  contentMarkdown: z.string().max(200000).optional(),
})

const updateNodeSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  kind: kindSchema.optional(),
  contentMarkdown: z.string().max(200000).nullable().optional(),
  model3dKey: z.string().max(100).nullable().optional(),
  diagramId: z.string().max(100).nullable().optional(),
  isPublished: z.boolean().optional(),
})

async function flatNodes(bookId: string): Promise<FlatNode[]> {
  const rows = await prisma.bookNode.findMany({
    where: { bookId },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  })
  return rows as FlatNode[]
}

async function nextOrder(bookId: string, parentId: string | null): Promise<number> {
  const siblings = await prisma.bookNode.findMany({
    where: { bookId, parentId },
    select: { orderIndex: true },
    orderBy: { orderIndex: 'desc' },
    take: 1,
  })
  return (siblings[0]?.orderIndex ?? -1) + 1
}

// ---------------------------------------------------------------------------
// Queries (also the data layer for the assistant's book functions, plan §9)
// ---------------------------------------------------------------------------

export async function getBookNodes(bookId: string) {
  return flatNodes(bookId)
}

export async function getBookToc(bookId: string) {
  const nodes = await flatNodes(bookId)
  return buildTree(nodes)
}

export async function getBookNodeStats(bookId: string) {
  const nodes = await flatNodes(bookId)
  const byKind: Record<string, number> = { chapter: 0, topic: 0, subtopic: 0, point: 0 }
  for (const n of nodes) byKind[n.kind] = (byKind[n.kind] ?? 0) + 1
  return { total: nodes.length, byKind }
}

export async function findBooksByAuthor(author: string) {
  return prisma.book.findMany({
    where: { author: { contains: author, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, subtitle: true, author: true, subject: true,
      language: true, isPublished: true, totalTopics: true,
    },
  })
}

export async function searchBookNodes(query: string, bookId?: string) {
  const nodes = await prisma.bookNode.findMany({
    where: {
      ...(bookId ? { bookId } : {}),
      title: { contains: query, mode: 'insensitive' },
    },
    orderBy: { orderIndex: 'asc' },
    take: 50,
  })
  // Attach breadcrumbs per book so callers can show Book > Chapter > Topic.
  const bookIds = [...new Set(nodes.map((n) => n.bookId))]
  const results = []
  for (const bid of bookIds) {
    const all = await flatNodes(bid)
    const book = await prisma.book.findUnique({ where: { id: bid }, select: { title: true } })
    for (const n of nodes.filter((x) => x.bookId === bid)) {
      const path = walkDfs(all).find((w) => w.node.id === n.id)?.path ?? [n as FlatNode]
      results.push({
        node: n,
        bookTitle: book?.title ?? '',
        breadcrumb: path.map((p) => p.title),
      })
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createBookNodeAction(data: z.infer<typeof createNodeSchema>) {
  const parsed = createNodeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  const { bookId, title, contentMarkdown } = parsed.data
  const parentId = parsed.data.parentId ?? null

  const nodes = await flatNodes(bookId)
  if (parentId && !nodes.some((n) => n.id === parentId)) {
    return { error: 'Parent node not found in this book.' }
  }
  const kind = parsed.data.kind ?? kindForDepth(parentId ? depthOf(nodes, parentId) + 1 : 0)
  const node = await prisma.bookNode.create({
    data: {
      bookId,
      parentId,
      kind,
      title,
      contentMarkdown: contentMarkdown ?? null,
      orderIndex: await nextOrder(bookId, parentId),
    },
  })
  return { success: true, node }
}

export async function updateBookNodeAction(id: string, data: z.infer<typeof updateNodeSchema>) {
  const parsed = updateNodeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  const node = await prisma.bookNode.update({ where: { id }, data: parsed.data })
  return { success: true, node }
}

export async function deleteBookNodeAction(id: string) {
  const node = await prisma.bookNode.findUnique({ where: { id } })
  if (!node) return { error: 'Node not found.' }
  const nodes = await flatNodes(node.bookId)
  const removed = descendantIds(nodes, id).size
  // Children cascade at the database level (BookNodeTree onDelete: Cascade).
  await prisma.bookNode.delete({ where: { id } })
  return { success: true, removed }
}

export async function moveBookNodeAction(id: string, newParentId: string | null, newOrderIndex: number) {
  const node = await prisma.bookNode.findUnique({ where: { id } })
  if (!node) return { error: 'Node not found.' }
  const nodes = await flatNodes(node.bookId)
  if (newParentId !== null) {
    if (!nodes.some((n) => n.id === newParentId)) return { error: 'Target parent not found in this book.' }
    if (wouldCreateCycle(nodes, id, newParentId)) {
      return { error: 'A node cannot be moved inside itself or one of its children.' }
    }
  }
  const updated = await prisma.bookNode.update({
    where: { id },
    data: { parentId: newParentId, orderIndex: newOrderIndex },
  })
  return { success: true, node: updated }
}

/** Persist a full sibling ordering after drag / move-button operations in the builder. */
export async function reorderBookNodesAction(
  bookId: string,
  moves: Array<{ id: string; parentId: string | null; orderIndex: number }>,
) {
  const nodes = await flatNodes(bookId)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  // Validate every reparenting against cycles before touching the database.
  const simulated = nodes.map((n) => {
    const move = moves.find((m) => m.id === n.id)
    return move ? { ...n, parentId: move.parentId } : n
  })
  for (const move of moves) {
    if (!byId.has(move.id)) return { error: 'A moved node does not belong to this book.' }
    if (move.parentId !== null && wouldCreateCycle(simulated, move.id, move.parentId)) {
      return { error: 'That move would create a cycle in the book structure.' }
    }
  }
  await prisma.$transaction(
    moves.map((m) =>
      prisma.bookNode.update({ where: { id: m.id }, data: { parentId: m.parentId, orderIndex: m.orderIndex } }),
    ),
  )
  return { success: true }
}

export async function duplicateBookNodeAction(id: string) {
  const source = await prisma.bookNode.findUnique({ where: { id } })
  if (!source) return { error: 'Node not found.' }
  const nodes = await flatNodes(source.bookId)
  const ids = descendantIds(nodes, id)
  const subtree = walkDfs(nodes).filter((w) => ids.has(w.node.id)).map((w) => w.node)
  const idMap = new Map<string, string>()
  let rootCopyId = ''
  // walkDfs is parent-before-child, so parents are created before children.
  for (const original of subtree) {
    const isRoot = original.id === id
    const copy = await prisma.bookNode.create({
      data: {
        bookId: original.bookId,
        parentId: isRoot ? original.parentId : idMap.get(original.parentId ?? '') ?? null,
        kind: original.kind,
        title: isRoot ? `${original.title} (Copy)` : original.title,
        orderIndex: isRoot ? original.orderIndex + 1 : original.orderIndex,
        contentMarkdown: original.contentMarkdown,
        model3dKey: original.model3dKey,
        diagramId: original.diagramId,
        isPublished: original.isPublished,
      },
    })
    idMap.set(original.id, copy.id)
    if (isRoot) rootCopyId = copy.id
  }
  return { success: true, nodeId: rootCopyId, copied: subtree.length }
}

export async function importOutlineAction(bookId: string, outlineText: string) {
  const items = parseOutline(outlineText)
  if (items.length === 0) return { error: 'No outline lines found.' }
  if (items.length > 2000) return { error: 'Outline is too large (max 2000 lines at once).' }
  const stack: Array<string | null> = []
  const created: string[] = []
  let currentParentOrder = new Map<string, number>()
  for (const item of items) {
    const parentId = item.depth === 0 ? null : stack[item.depth - 1] ?? null
    const key = parentId ?? '__root__'
    const order = currentParentOrder.get(key) ?? (await nextOrder(bookId, parentId))
    currentParentOrder.set(key, order + 1)
    const node = await prisma.bookNode.create({
      data: {
        bookId,
        parentId,
        kind: kindForDepth(item.depth),
        title: item.title.slice(0, 300),
        orderIndex: order,
      },
    })
    stack[item.depth] = node.id
    stack.length = item.depth + 1
    created.push(node.id)
  }
  currentParentOrder = new Map()
  return { success: true, created: created.length }
}

// ---------------------------------------------------------------------------
// Publish: materialise the tree into BookTopic rows for the existing Reader
// ---------------------------------------------------------------------------

export async function syncBookNodesToTopicsAction(bookId: string) {
  const nodes = await flatNodes(bookId)
  const rows = nodesToTopicRows(nodes)
  await prisma.$transaction([
    prisma.bookTopic.deleteMany({ where: { bookId, sourceNodeId: { not: null } } }),
    ...rows.map((r) =>
      prisma.bookTopic.create({
        data: {
          bookId,
          chapterNumber: r.chapterNumber,
          chapterTitle: r.chapterTitle,
          sectionTitle: r.sectionTitle,
          topicTitle: r.topicTitle,
          orderIndex: r.orderIndex,
          contentMarkdown: r.contentMarkdown,
          readingMinutes: r.readingMinutes,
          model3dKey: r.model3dKey,
          searchTokens: r.searchTokens,
          sourceNodeId: r.sourceNodeId,
          isPublished: true,
        },
      }),
    ),
  ])
  const total = await prisma.bookTopic.count({ where: { bookId } })
  await prisma.book.update({ where: { id: bookId }, data: { totalTopics: total } })
  return { success: true, topicsCreated: rows.length, totalTopics: total }
}

/**
 * One-time conversion of legacy flat BookTopic rows into a BookNode tree:
 * chapterTitle -> Chapter, sectionTitle -> Topic, topicTitle -> Subtopic
 * holding the content. Safe to re-run: books that already have nodes are skipped.
 */
export async function migrateBookTopicsToNodesAction(bookId: string) {
  const existing = await prisma.bookNode.count({ where: { bookId } })
  if (existing > 0) return { error: 'This book already has a builder structure; migration skipped.' }
  const topics = await prisma.bookTopic.findMany({
    where: { bookId, sourceNodeId: null },
    orderBy: { orderIndex: 'asc' },
  })
  if (topics.length === 0) return { error: 'No legacy topics to migrate.' }

  const chapterIds = new Map<string, string>()
  const topicIds = new Map<string, string>()
  const chapterOrder = new Map<string, number>()
  const topicOrder = new Map<string, number>()
  let subOrder = new Map<string, number>()

  for (const t of topics) {
    const chapterTitle = t.chapterTitle || `Chapter ${t.chapterNumber || 1}`
    if (!chapterIds.has(chapterTitle)) {
      const order = chapterOrder.get('__root__') ?? 0
      chapterOrder.set('__root__', order + 1)
      const chapter = await prisma.bookNode.create({
        data: { bookId, parentId: null, kind: 'chapter', title: chapterTitle, orderIndex: order },
      })
      chapterIds.set(chapterTitle, chapter.id)
    }
    const chapterId = chapterIds.get(chapterTitle)!

    const sectionTitle = t.sectionTitle || t.topicTitle
    const topicKey = `${chapterId}::${sectionTitle}`
    if (!topicIds.has(topicKey)) {
      const order = topicOrder.get(chapterId) ?? 0
      topicOrder.set(chapterId, order + 1)
      const topic = await prisma.bookNode.create({
        data: { bookId, parentId: chapterId, kind: 'topic', title: sectionTitle, orderIndex: order },
      })
      topicIds.set(topicKey, topic.id)
    }
    const topicId = topicIds.get(topicKey)!
    const order = subOrder.get(topicId) ?? 0
    subOrder.set(topicId, order + 1)
    await prisma.bookNode.create({
      data: {
        bookId,
        parentId: topicId,
        kind: 'subtopic',
        title: t.topicTitle,
        orderIndex: order,
        contentMarkdown: t.contentMarkdown,
        model3dKey: t.model3dKey,
        isPublished: t.isPublished,
      },
    })
  }
  subOrder = new Map()
  return { success: true, chapters: chapterIds.size, topicsConverted: topics.length }
}
