'use server'

import { z } from 'zod'
import { prisma } from '../db'
import { getCurrentUser } from '../db/user'

const profileSchema = z.object({
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  weeklyGoalMinutes: z.number().optional(),
})

const updateUserSchema = profileSchema.extend({
  role: z.enum(['learner', 'admin']).optional(),
  planId: z.string().optional(),
})

// User actions

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      displayName: true,
      photoURL: true,
      role: true,
      planId: true,
      studyStreakDays: true,
      dailyAiCalls: true,
      weeklyGoalMinutes: true,
      createdAt: true,
      updatedAt: true,
    }
  })
}

export async function getUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      displayName: true,
      photoURL: true,
      role: true,
      planId: true,
      studyStreakDays: true,
      dailyAiCalls: true,
      weeklyGoalMinutes: true,
      createdAt: true,
      updatedAt: true,
    }
  })
}

export async function updateUserAction(id: string, data: z.infer<typeof updateUserSchema>, token: string | null) {
  const parsed = updateUserSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }
  const actor = await getCurrentUser(token)
  if (!actor || (actor.role !== 'admin' && (actor.userId !== id || parsed.data.role !== undefined))) {
    throw new Error('You do not have permission to update this account.')
  }

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      displayName: true,
      photoURL: true,
      role: true,
      planId: true,
      studyStreakDays: true,
      dailyAiCalls: true,
      weeklyGoalMinutes: true,
      createdAt: true,
      updatedAt: true,
    }
  })

  return { success: true, user }
}

export async function deleteUserAction(id: string, token: string | null) {
  const actor = await getCurrentUser(token)
  if (actor?.role !== 'admin' || actor.userId === id) throw new Error('You do not have permission to delete this account.')
  await prisma.user.delete({
    where: { id }
  })

  return { success: true }
}

export async function updateUserProfile(userId: string, data: z.infer<typeof profileSchema>, token: string | null) {
  const actor = await getCurrentUser(token)
  if (actor?.userId !== userId) throw new Error('You do not have permission to update this profile.')
  const profile = profileSchema.parse(data)
  const user = await prisma.user.update({
    where: { id: userId },
    data: profile,
    select: {
      id: true,
      email: true,
      displayName: true,
      photoURL: true,
      role: true,
      weeklyGoalMinutes: true,
    }
  })

  return { success: true, user }
}
