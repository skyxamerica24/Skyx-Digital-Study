'use server'

import { z } from 'zod'
import { prisma } from '../db'
import { requireStoreUser, readableBookFilter } from '../book-store-access'

const resultSchema = z.object({
  attemptId: z.string().regex(/^[a-z0-9-]{8,80}$/i),
  bookId: z.string().min(1),
  examTitle: z.string().min(1).max(190),
  totalQuestions: z.number().int().min(1).max(200),
  correctCount: z.number().int().nonnegative(),
  wrongCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  accuracyPercent: z.number().min(0).max(100),
  durationSeconds: z.number().int().nonnegative(),
  questionIds: z.array(z.string().min(1)).max(200),
}).refine(result => result.correctCount + result.wrongCount + result.skippedCount === result.totalQuestions,
  "Exam counts must match the total.")

export async function getExamAttempts(token: string | null) {
  const { userId } = await requireStoreUser(token)
  return prisma.examAttempt.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
}

export async function createExamAttempt(token: string | null, input: z.infer<typeof resultSchema>) {
  const { userId } = await requireStoreUser(token)
  const { attemptId, questionIds, ...data } = resultSchema.parse(input)
  const id = userId + '-' + attemptId
  const existing = await prisma.examAttempt.findFirst({ where: { id, userId } })
  if (existing) return existing
  const book = await prisma.book.findFirst({ where: { AND: [{id:data.bookId}, await readableBookFilter(token)] }, select:{id:true} })
  if (!book) throw new Error('The exam book is unavailable.')
  await prisma.examAttempt.createMany({
    data: { ...data, id, userId, questionIds: JSON.stringify(questionIds), status:'completed' },
    skipDuplicates: true,
  })
  return prisma.examAttempt.findFirstOrThrow({ where: { id, userId } })
}
