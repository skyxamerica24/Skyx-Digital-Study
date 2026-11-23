'use server'

import { z } from 'zod'
import { prisma } from '../db'

const subscriptionPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  tagline: z.string().optional(),
  priceMonthly: z.number().optional(),
  currency: z.string().optional(),
  allowedTiers: z.string().optional(),
  dailyAiLimit: z.number().optional(),
  has3dLab: z.boolean().optional(),
  hasVoiceTutor: z.boolean().optional(),
  orderIndex: z.number().optional(),
  isPublished: z.boolean().optional(),
})

// Subscription Plan actions

export async function getSubscriptionPlans() {
  return prisma.subscriptionPlan.findMany({
    where: { isPublished: true },
    orderBy: { orderIndex: 'asc' }
  })
}

export async function getAllSubscriptionPlans() {
  return prisma.subscriptionPlan.findMany({
    orderBy: { orderIndex: 'asc' }
  })
}

export async function createSubscriptionPlanAction(data: z.infer<typeof subscriptionPlanSchema>) {
  const parsed = subscriptionPlanSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const plan = await prisma.subscriptionPlan.create({
    data: parsed.data
  })

  return { success: true, plan }
}

export async function updateSubscriptionPlanAction(id: string, data: Partial<z.infer<typeof subscriptionPlanSchema>>) {
  const plan = await prisma.subscriptionPlan.update({
    where: { id },
    data
  })

  return { success: true, plan }
}

export async function deleteSubscriptionPlanAction(id: string) {
  await prisma.subscriptionPlan.delete({
    where: { id }
  })

  return { success: true }
}

// Subscription Record actions

export async function getSubscriptionRecords(userId?: string) {
  if (userId) {
    return prisma.subscriptionRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
  }
  return prisma.subscriptionRecord.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createSubscriptionRecord(data: {
  userId: string
  planId?: string
  planName?: string
  amount?: number
  currency?: string
  status?: string
}) {
  const record = await prisma.subscriptionRecord.create({
    data
  })

  return { success: true, record }
}

export async function updateSubscriptionRecordAction(id: string, data: {
  status?: string
}) {
  const record = await prisma.subscriptionRecord.update({
    where: { id },
    data
  })

  return { success: true, record }
}
