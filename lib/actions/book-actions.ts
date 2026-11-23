'use server'

import { z } from 'zod'
import { prisma } from '../db'

const bookSchema = z.object({
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

// Book actions

export async function getBooks() {
  return prisma.book.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' },
    include: {
      topics: {
        where: { isPublished: true },
        orderBy: { orderIndex: 'asc' },
      }
    }
  })
}

export async function getBook(id: string) {
  return prisma.book.findUnique({
    where: { id },
    include: {
      topics: {
        where: { OR: [{ builderPath: null }, { isPublished: true }] },
        orderBy: { orderIndex: 'asc' },
      },
      questions: {
        where: { isPublished: true },
      },
    }
  })
}

export async function getAllBooks() {
  return prisma.book.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      topics: {
        where: { OR: [{ builderPath: null }, { isPublished: true }] },
        orderBy: { orderIndex: 'asc' },
      }
    }
  })
}

export async function createBookAction(data: z.infer<typeof bookSchema>) {
  const parsed = bookSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const book = await prisma.book.create({
    data: parsed.data
  })

  return { success: true, book }
}

export async function updateBookAction(id: string, data: Partial<z.infer<typeof bookSchema>>) {
  const book = await prisma.book.update({
    where: { id },
    data
  })

  return { success: true, book }
}

export async function deleteBookAction(id: string) {
  await prisma.book.delete({
    where: { id }
  })

  return { success: true }
}

export async function publishBookAction(id: string) {
  const book = await prisma.book.update({
    where: { id },
    data: { isPublished: true }
  })

  return { success: true, book }
}

export async function unpublishBookAction(id: string) {
  const book = await prisma.book.update({
    where: { id },
    data: { isPublished: false }
  })

  return { success: true, book }
}

// BookTopic actions

export async function getTopics(bookId: string) {
  return prisma.bookTopic.findMany({
    where: { bookId, isPublished: true },
    orderBy: { orderIndex: 'asc' }
  })
}

export async function getAllTopics(bookId: string) {
  return prisma.bookTopic.findMany({
    where: { bookId, OR: [{ builderPath: null }, { isPublished: true }] },
    orderBy: { orderIndex: 'asc' }
  })
}

export async function getTopic(id: string) {
  return prisma.bookTopic.findFirst({
    where: { id, OR: [{ builderPath: null }, { isPublished: true }] }
  })
}

export async function createTopicAction(data: z.infer<typeof bookTopicSchema>) {
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

export async function updateTopicAction(id: string, data: Partial<z.infer<typeof bookTopicSchema>>) {
  const topic = await prisma.bookTopic.update({
    where: { id },
    data
  })

  return { success: true, topic }
}

export async function deleteTopicAction(id: string) {
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
