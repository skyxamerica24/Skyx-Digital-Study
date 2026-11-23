'use server'

import { z } from 'zod'
import { prisma } from '../db'
import { getCurrentUser } from '../db/user'

const curriculumSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  orderIndex: z.number().optional(),
  isPublished: z.boolean().optional(),
})

const subjectSchema = z.object({
  curriculumId: z.string().min(1, 'Curriculum ID is required'),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  language: z.string().optional(),
  description: z.string().optional(),
  orderIndex: z.number().optional(),
  isPublished: z.boolean().optional(),
})

const syllabusSchema = z.object({
  curriculumId: z.string().min(1, 'Curriculum ID is required'),
  subjectId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  examTarget: z.string().optional(),
  academicYear: z.string().optional(),
  chaptersSummary: z.string().optional(),
  isPublished: z.boolean().optional(),
})

// Curriculum actions

export async function getCurriculums() {
  return prisma.curriculum.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      subjects: { orderBy: { orderIndex: 'asc' } },
      syllabi: { orderBy: { createdAt: 'desc' } },
    }
  })
}

export async function getCurriculum(id: string) {
  return prisma.curriculum.findUnique({
    where: { id },
    include: {
      subjects: { orderBy: { orderIndex: 'asc' } },
      syllabi: { orderBy: { createdAt: 'desc' } },
      books: { where: { isPublished: true }, orderBy: { createdAt: 'desc' } },
    }
  })
}

export async function createCurriculumAction(data: z.infer<typeof curriculumSchema>) {
  const parsed = curriculumSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const curriculum = await prisma.curriculum.create({
    data: parsed.data
  })

  return { success: true, curriculum }
}

export async function updateCurriculumAction(id: string, data: Partial<z.infer<typeof curriculumSchema>>) {
  const curriculum = await prisma.curriculum.update({
    where: { id },
    data
  })

  return { success: true, curriculum }
}

export async function deleteCurriculumAction(id: string) {
  await prisma.curriculum.delete({
    where: { id }
  })

  return { success: true }
}

// Subject actions

export async function getSubjects(curriculumId?: string) {
  if (curriculumId) {
    return prisma.subject.findMany({
      where: { curriculumId },
      orderBy: { orderIndex: 'asc' }
    })
  }
  return prisma.subject.findMany({
    orderBy: { orderIndex: 'asc' }
  })
}

export async function createSubjectAction(data: z.infer<typeof subjectSchema>) {
  const parsed = subjectSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const subject = await prisma.subject.create({
    data: parsed.data
  })

  return { success: true, subject }
}

export async function updateSubjectAction(id: string, data: Partial<z.infer<typeof subjectSchema>>) {
  const subject = await prisma.subject.update({
    where: { id },
    data
  })

  return { success: true, subject }
}

export async function deleteSubjectAction(id: string) {
  await prisma.subject.delete({
    where: { id }
  })

  return { success: true }
}

// Syllabus actions

export async function getSyllabi(curriculumId?: string) {
  if (curriculumId) {
    return prisma.syllabus.findMany({
      where: { curriculumId },
      orderBy: { createdAt: 'desc' }
    })
  }
  return prisma.syllabus.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createSyllabusAction(data: z.infer<typeof syllabusSchema>) {
  const parsed = syllabusSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const syllabus = await prisma.syllabus.create({
    data: parsed.data
  })

  return { success: true, syllabus }
}

export async function updateSyllabusAction(id: string, data: Partial<z.infer<typeof syllabusSchema>>) {
  const syllabus = await prisma.syllabus.update({
    where: { id },
    data
  })

  return { success: true, syllabus }
}

export async function deleteSyllabusAction(id: string) {
  await prisma.syllabus.delete({
    where: { id }
  })

  return { success: true }
}
