'use server'

import { prisma } from '../db'

// Exam Attempt actions

export async function getExamAttempts(userId: string) {
  return prisma.examAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getExamAttempt(id: string) {
  return prisma.examAttempt.findUnique({
    where: { id }
  })
}

export async function createExamAttempt(data: {
  userId: string
  bookId?: string
  examTitle?: string
  totalQuestions?: number
  correctCount?: number
  wrongCount?: number
  skippedCount?: number
  accuracyPercent?: number
  durationSeconds?: number
  status?: string
  questionIds?: string
}) {
  const attempt = await prisma.examAttempt.create({
    data
  })

  return { success: true, attempt }
}

export async function updateExamAttemptAction(id: string, data: {
  correctCount?: number
  wrongCount?: number
  skippedCount?: number
  accuracyPercent?: number
  durationSeconds?: number
  status?: string
  questionIds?: string
}) {
  const attempt = await prisma.examAttempt.update({
    where: { id },
    data
  })

  return { success: true, attempt }
}

export async function deleteExamAttemptAction(id: string) {
  await prisma.examAttempt.delete({
    where: { id }
  })

  return { success: true }
}
