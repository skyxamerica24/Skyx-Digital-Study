'use server'

import { z } from 'zod'
import { prisma } from '../db'

const importJobSchema = z.object({
  bookId: z.string().optional(),
  bookTitle: z.string().optional(),
  sourceFileName: z.string().optional(),
  sourceType: z.string().optional(),
  createdBy: z.string().optional(),
})

// Import Job actions

export async function getImportJobs() {
  return prisma.importJob.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function getImportJob(id: string) {
  return prisma.importJob.findUnique({
    where: { id }
  })
}

export async function createImportJobAction(data: z.infer<typeof importJobSchema>) {
  const parsed = importJobSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const job = await prisma.importJob.create({
    data: parsed.data
  })

  return { success: true, job }
}

export async function updateImportJobAction(id: string, data: {
  status?: string
  progressPercent?: number
  topicsDetected?: number
  ocrConfidence?: number
  notes?: string
}) {
  const job = await prisma.importJob.update({
    where: { id },
    data
  })

  return { success: true, job }
}

export async function deleteImportJobAction(id: string) {
  await prisma.importJob.delete({
    where: { id }
  })

  return { success: true }
}
