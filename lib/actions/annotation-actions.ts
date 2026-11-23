'use server'

import { z } from 'zod'
import { prisma } from '../db'
import { getCurrentUser } from '../db/user'

async function requireOwner(token: string | null) {
  const actor = await getCurrentUser(token)
  if (!actor) throw new Error('Sign in to access your study records.')
  return actor.userId
}

const annotationSchema = z.object({
  bookId: z.string().optional(),
  topicId: z.string().optional(),
  bookTitle: z.string().optional(),
  topicTitle: z.string().optional(),
  type: z.string().optional(),
  color: z.string().optional(),
  quote: z.string().optional(),
  noteText: z.string().optional(),
})

// Annotation actions

export async function getAnnotations(token: string | null) {
  const userId = await requireOwner(token)
  return prisma.learnerAnnotation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
}

export async function createAnnotationAction(token: string | null, data: z.infer<typeof annotationSchema>) {
  const userId = await requireOwner(token)
  const parsed = annotationSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const annotation = await prisma.learnerAnnotation.create({
    data: { ...parsed.data, userId }
  })

  return { success: true, annotation }
}

export async function updateAnnotationAction(token: string | null, id: string, data: Partial<z.infer<typeof annotationSchema>>) {
  const userId = await requireOwner(token)
  const annotation = await prisma.learnerAnnotation.update({
    where: { id, userId },
    data: annotationSchema.partial().parse(data)
  })

  return { success: true, annotation }
}

export async function deleteAnnotationAction(token: string | null, id: string) {
  const userId = await requireOwner(token)
  await prisma.learnerAnnotation.delete({
    where: { id, userId }
  })

  return { success: true }
}

// Reading Progress actions

export async function getReadingProgress(token: string | null) {
  const userId = await requireOwner(token)
  return prisma.readingProgress.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' }
  })
}

const progressSchema = z.object({
  bookId: z.string().optional(),
  topicId: z.string().optional(),
  bookTitle: z.string().optional(),
  topicTitle: z.string().optional(),
  percentComplete: z.number().min(0).max(100).optional(),
  timeSpentSeconds: z.number().int().nonnegative().optional(),
  isCompleted: z.boolean().optional(),
})

export async function updateReadingProgressAction(token: string | null, input: z.infer<typeof progressSchema>) {
  const userId = await requireOwner(token)
  const data = progressSchema.parse(input)
  // Serialize writes to the same account, book and topic without requiring a migration of old progress records.
  return prisma.$transaction(async tx => {
    const key = JSON.stringify([userId, data.bookId || null, data.topicId || null])
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`
    const existing = await tx.readingProgress.findFirst({
      where: { userId, bookId: data.bookId || null, topicId: data.topicId || null },
      orderBy: { updatedAt: 'desc' },
    })
    const progress = existing
      ? await tx.readingProgress.update({ where: { id: existing.id, userId }, data })
      : await tx.readingProgress.create({ data: { ...data, userId } })
    return { success: true, progress }
  })
}
