'use server'

import { z } from 'zod'
import { prisma } from '../db'
import { getCurrentUser } from '../db/user'
import { readableBookFilter, requireStoreUser } from '../book-store-access'

const bookSchema = z.object({
  id: z.string().min(1).optional(),
  curriculumId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  subject: z.string().optional(),
  language: z.string().optional(),
  accessTier: z.string().optional(),
  coverColor: z.string().optional(),
  description: z.string().optional(),
  totalTopics: z.number().optional(),
  isPublished: z.boolean().optional(),
})

const bookTopicSchema = z.object({
  id: z.string().min(1).optional(),
  bookId: z.string().min(1, 'Book ID is required'),
  chapterNumber: z.number().optional(),
  chapterTitle: z.string().optional(),
  sectionTitle: z.string().optional(),
  topicTitle: z.string().min(1, 'Topic title is required'),
  orderIndex: z.number().optional(),
  contentMarkdown: z.string().optional(),
  readingMinutes: z.number().optional(),
  model3dKey: z.string().optional(),
  searchTokens: z.string().optional(),
  isPublished: z.boolean().optional(),
})

async function topicVisibility(token: string | null) {
  return (await getCurrentUser(token))?.role === 'admin'
    ? { OR: [{ builderPath: null }, { isPublished: true }] }
    : { isPublished: true }
}

// Book actions

export async function getBooks(token: string | null = null) {
  return prisma.book.findMany({
    where: { ...(await readableBookFilter(token)), isPublished: true },
    orderBy: { createdAt: 'desc' },
    include: {
      topics: {
        where: { isPublished: true },
        orderBy: { orderIndex: 'asc' },
      }
    }
  })
}

export async function getBook(id: string, token: string | null = null) {
  return prisma.book.findFirst({
    where: { ...(await readableBookFilter(token)), id },
    include: {
      topics: {
        where: await topicVisibility(token),
        orderBy: { orderIndex: 'asc' },
      },
      questions: {
        where: { isPublished: true },
      },
    }
  })
}

export async function getAllBooks(token: string | null = null) {
  return prisma.book.findMany({
    where: await readableBookFilter(token),
    orderBy: { createdAt: 'desc' },
    include: {
      topics: {
        where: await topicVisibility(token),
        orderBy: { orderIndex: 'asc' },
      }
    }
  })
}

export async function createBookAction(token: string | null, data: z.infer<typeof bookSchema>) {
  await requireStoreUser(token, true)
  const parsed = bookSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const book = await prisma.book.create({
    data: { ...parsed.data, curriculumId: parsed.data.curriculumId || undefined }
  })

  return { success: true, book }
}

export async function updateBookAction(token: string | null, id: string, data: Partial<z.infer<typeof bookSchema>>) {
  await requireStoreUser(token, true)
  const book = await prisma.book.update({
    where: { id },
    data: bookSchema.partial().omit({id:true}).parse({...data, curriculumId:data.curriculumId || undefined})
  })

  return { success: true, book }
}

export async function deleteBookAction(token: string | null, id: string) {
  await requireStoreUser(token, true)
  await prisma.book.delete({
    where: { id }
  })

  return { success: true }
}

export async function publishBookAction(token: string | null, id: string) {
  await requireStoreUser(token, true)
  const book = await prisma.book.update({
    where: { id },
    data: { isPublished: true }
  })

  return { success: true, book }
}

export async function unpublishBookAction(token: string | null, id: string) {
  await requireStoreUser(token, true)
  const book = await prisma.book.update({
    where: { id },
    data: { isPublished: false }
  })

  return { success: true, book }
}

// BookTopic actions

export async function getTopics(bookId: string, token: string | null = null) {
  return prisma.bookTopic.findMany({
    where: { book: await readableBookFilter(token), bookId, isPublished: true },
    orderBy: { orderIndex: 'asc' }
  })
}

export async function getAllTopics(bookId: string, token: string | null = null) {
  return prisma.bookTopic.findMany({
    where: { book: await readableBookFilter(token), bookId, ...(await topicVisibility(token)) },
    orderBy: { orderIndex: 'asc' }
  })
}

export async function getTopic(id: string, token: string | null = null) {
  return prisma.bookTopic.findFirst({
    where: { book: await readableBookFilter(token), id, ...(await topicVisibility(token)) }
  })
}

export async function createTopicAction(token: string | null, data: z.infer<typeof bookTopicSchema>) {
  await requireStoreUser(token, true)
  const parsed = bookTopicSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const topic = await prisma.bookTopic.create({
    data: parsed.data
  })

  // Update book totalTopics count
  const count = await prisma.bookTopic.count({
    where: { bookId: parsed.data.bookId }
  })
  await prisma.book.update({
    where: { id: parsed.data.bookId },
    data: { totalTopics: count }
  })

  return { success: true, topic }
}

export async function updateTopicAction(token: string | null, id: string, data: Partial<z.infer<typeof bookTopicSchema>>) {
  await requireStoreUser(token, true)
  const topic = await prisma.bookTopic.update({
    where: { id },
    data
  })

  return { success: true, topic }
}

export async function deleteTopicAction(token: string | null, id: string) {
  await requireStoreUser(token, true)
  const topic = await prisma.bookTopic.findUnique({
    where: { id }
  })

  await prisma.bookTopic.delete({
    where: { id }
  })

  // Update book totalTopics count
  if (topic) {
    const count = await prisma.bookTopic.count({
      where: { bookId: topic.bookId }
    })
    await prisma.book.update({
      where: { id: topic.bookId },
      data: { totalTopics: count }
    })
  }

  return { success: true }
}

// IDs are supplied by the editor and reused when the same project is published again.
const stableTopicSchema = bookTopicSchema.extend({ id: z.string().min(1) });
const topicsSchema = z.array(stableTopicSchema).min(1).max(5000);

export async function persistBookTopics(token: string | null, bookId: string, input: z.infer<typeof topicsSchema>,
  importedBook?: z.infer<typeof bookSchema>) {
  await requireStoreUser(token, true);
  const topics = topicsSchema.parse(input);
  if (topics.some(topic => topic.bookId !== bookId)) throw new Error("The topics must belong to the same book.");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${bookId}, 0))`;
    if (importedBook) {
      const data = bookSchema.omit({id:true}).parse({ ...importedBook, curriculumId: importedBook.curriculumId || undefined });
      if (!data.curriculumId) {
        const existing = await tx.book.findUnique({where:{id:bookId},select:{curriculumId:true}});
        if (existing?.curriculumId) data.curriculumId = existing.curriculumId;
      }
      await tx.book.upsert({where:{id:bookId},create:{id:bookId,...data,listing:{create:{}}},update:data});
    }
    if (importedBook) {
      // Keep IDs referenced by progress and notes when a later edition removes a section.
      await tx.bookTopic.updateMany({
        where: {bookId, id: { startsWith: "topic-" + bookId + "-", notIn: topics.map(topic => topic.id) }},
        data: {isPublished:false},
      });
    }
    await tx.bookTopic.createMany({data:topics,skipDuplicates:true});
    for (const {id, bookId: _bookId, ...data} of topics) {
      const updated = await tx.bookTopic.updateMany({where:{id,bookId},data});
      if (!updated.count) throw new Error("A topic already belongs to another book.");
    }
    const savedTopics = await tx.bookTopic.findMany({
      where:{id:{in:topics.map(topic => topic.id)},bookId},
      orderBy:{orderIndex:"asc"},
    });
    const totalTopics = await tx.bookTopic.count({where:{bookId,isPublished:true}});
    const book = await tx.book.update({where:{id:bookId},data:{totalTopics}});
    return {book,topics:savedTopics};
  }, {timeout:30000});
}
