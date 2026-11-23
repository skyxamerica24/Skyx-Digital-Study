'use server'

import { z } from 'zod'
import { prisma } from '../db'

const annotationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
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

export async function getAnnotations(userId: string) {
  return prisma.learnerAnnotation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
}

export async function createAnnotationAction(data: z.infer<typeof annotationSchema>) {
  const parsed = annotationSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const annotation = await prisma.learnerAnnotation.create({
    data: parsed.data
  })

  return { success: true, annotation }
}

export async function updateAnnotationAction(id: string, data: Partial<z.infer<typeof annotationSchema>>) {
  const annotation = await prisma.learnerAnnotation.update({
    where: { id },
    data
  })

  return { success: true, annotation }
}

export async function deleteAnnotationAction(id: string) {
  await prisma.learnerAnnotation.delete({
    where: { id }
  })

  return { success: true }
}

// Reading Progress actions

export async function getReadingProgress(userId: string) {
  return prisma.readingProgress.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' }
  })
}

export async function updateReadingProgressAction(userId: string, data: {
  bookId?: string
  topicId?: string
  bookTitle?: string
  topicTitle?: string
  percentComplete?: number
  timeSpentSeconds?: number
  isCompleted?: boolean
}) {
  // Find existing progress record
  let progress = await prisma.readingProgress.findFirst({
    where: {
      userId,
      bookId: data.bookId || undefined,
      topicId: data.topicId || undefined,
    }
  })

  if (progress) {
    progress = await prisma.readingProgress.update({
      where: { id: progress.id },
      data
    })
  } else {
    progress = await prisma.readingProgress.create({
      data: {
        userId,
        ...data
      }
    })
  }

  return { success: true, progress }
}
