'use server'

import { z } from 'zod'
import { prisma } from '../db'
import { readableBookFilter, requireStoreUser } from '../book-store-access'
import { getCurrentUser } from '../db/user'

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

export async function getQuestions(bookId?: string, token: string | null = null) {
  return prisma.question.findMany({
    where: { bookId, isPublished: true, book: await readableBookFilter(token) },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getAllQuestions(token: string | null = null, bookId?: string) {
  if ((await getCurrentUser(token))?.role !== 'admin') return getQuestions(bookId, token)
  return prisma.question.findMany({ where: { bookId }, orderBy: { createdAt: 'desc' } })
}

export async function getQuestion(id: string, token: string | null = null) {
  if ((await getCurrentUser(token))?.role === 'admin') return prisma.question.findUnique({ where: { id } })
  return prisma.question.findFirst({ where: { id, isPublished: true, book: await readableBookFilter(token) } })
}

export async function createQuestionAction(token: string | null, data: z.infer<typeof questionSchema>) {
  await requireStoreUser(token, true)
  const parsed = questionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const question = await prisma.question.create({
    data: parsed.data
  })

  return { success: true, question }
}

export async function updateQuestionAction(token: string | null, id: string, data: Partial<z.infer<typeof questionSchema>>) {
  await requireStoreUser(token, true)
  const question = await prisma.question.update({
    where: { id },
    data
  })

  return { success: true, question }
}

export async function deleteQuestionAction(token: string | null, id: string) {
  await requireStoreUser(token, true)
  await prisma.question.delete({
    where: { id }
  })

  return { success: true }
}

const questionBatchSchema = z.array(questionSchema.extend({id:z.string().min(1)})).min(1).max(500);

export async function persistQuestions(token: string | null, input: z.infer<typeof questionBatchSchema>) {
  await requireStoreUser(token, true);
  const data = questionBatchSchema.parse(input);
  return prisma.$transaction(async tx => {
    await tx.question.createMany({data, skipDuplicates:true});
    return tx.question.findMany({where:{id:{in:data.map(question => question.id)}}});
  });
}
