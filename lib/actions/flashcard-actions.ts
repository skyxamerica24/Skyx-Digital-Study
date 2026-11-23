'use server'

import { z } from 'zod'
import { prisma } from '../db'

const flashcardSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  bookId: z.string().optional(),
  topicId: z.string().optional(),
  bookTitle: z.string().optional(),
  topicTitle: z.string().optional(),
  front: z.string().min(1, 'Front text is required'),
  back: z.string().min(1, 'Back text is required'),
  intervalDays: z.number().optional(),
  easeFactor: z.number().optional(),
  repetitions: z.number().optional(),
  nextReviewAt: z.any().optional(),
})

// Flashcard actions

export async function getFlashcards(userId: string) {
  return prisma.flashcard.findMany({
    where: { userId },
    orderBy: { nextReviewAt: 'asc' }
  })
}

export async function getDueFlashcards(userId: string) {
  const now = new Date()
  return prisma.flashcard.findMany({
    where: {
      userId,
      nextReviewAt: { lte: now }
    },
    orderBy: { nextReviewAt: 'asc' }
  })
}

export async function createFlashcardAction(data: z.infer<typeof flashcardSchema>) {
  const parsed = flashcardSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const flashcard = await prisma.flashcard.create({
    data: parsed.data
  })

  return { success: true, flashcard }
}

export async function updateFlashcardAction(id: string, data: Partial<z.infer<typeof flashcardSchema>>) {
  const flashcard = await prisma.flashcard.update({
    where: { id },
    data
  })

  return { success: true, flashcard }
}

export async function deleteFlashcardAction(id: string) {
  await prisma.flashcard.delete({
    where: { id }
  })

  return { success: true }
}

export async function reviewFlashcardAction(id: string, quality: number) {
  // SRS algorithm (Spaced Repetition System)
  const flashcard = await prisma.flashcard.findUnique({
    where: { id }
  })

  if (!flashcard) {
    return { error: 'Flashcard not found' }
  }

  let newInterval = flashcard.intervalDays
  let newEaseFactor = flashcard.easeFactor
  let newRepetitions = flashcard.repetitions

  if (quality >= 3) {
    // Correct answer
    newRepetitions += 1
    if (newRepetitions === 1) {
      newInterval = 1
    } else if (newRepetitions === 2) {
      newInterval = 6
    } else {
      newInterval = Math.round(newInterval * newEaseFactor)
    }
    newEaseFactor = Math.max(1.3, newEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  } else {
    // Incorrect answer
    newRepetitions = 0
    newInterval = 1
  }

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + newInterval)

  const updated = await prisma.flashcard.update({
    where: { id },
    data: {
      intervalDays: newInterval,
      easeFactor: newEaseFactor,
      repetitions: newRepetitions,
      nextReviewAt: nextReview,
      lastReviewedAt: new Date(),
    }
  })

  return { success: true, flashcard: updated }
}
