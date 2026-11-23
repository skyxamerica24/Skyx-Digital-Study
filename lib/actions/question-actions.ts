'use server'

import { z } from 'zod'
import { prisma } from '../db'

const questionSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
  topicId: z.string().optional(),
  chapterTitle: z.string().optional(),
  stem: z.string().min(1, 'Question stem is required'),
  options: z.string().min(1, 'Options are required'),
  correctIndex: z.number().min(0, 'Correct index must be 0 or greater'),
  explanation: z.string().optional(),
  difficulty: z.string().optional(),
  isPublished: z.boolean().optional(),
})

// Question actions

export async function getQuestions(bookId?: string) {
  if (bookId) {
    return prisma.question.findMany({
      where: { bookId, isPublished: true },
      orderBy: { createdAt: 'desc' }
    })
  }
  return prisma.question.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getAllQuestions(bookId?: string) {
  if (bookId) {
    return prisma.question.findMany({
      where: { bookId },
      orderBy: { createdAt: 'desc' }
    })
  }
  return prisma.question.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function getQuestion(id: string) {
  return prisma.question.findUnique({
    where: { id }
  })
}

export async function createQuestionAction(data: z.infer<typeof questionSchema>) {
  const parsed = questionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const question = await prisma.question.create({
    data: parsed.data
  })

  return { success: true, question }
}

export async function updateQuestionAction(id: string, data: Partial<z.infer<typeof questionSchema>>) {
  const question = await prisma.question.update({
    where: { id },
    data
  })

  return { success: true, question }
}

export async function deleteQuestionAction(id: string) {
  await prisma.question.delete({
    where: { id }
  })

  return { success: true }
}
