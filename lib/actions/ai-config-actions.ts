'use server'

import { z } from 'zod'
import { prisma } from '../db'
import { encrypt, decrypt } from '../db/encryption'
import { getCurrentUser } from '../db/user'
import { GENERAL_AI_TOOLS, getToolConfigKeys } from '../ai-tool-config'

const aiCredentialSchema = z.object({
  slotName: z.string().min(1, 'Slot name is required'),
  apiKey: z.string().min(1, 'API key is required'),
})

const toolSettingsSchema = z.object({
  primaryModel: z.string().trim().regex(/^gemini-[a-z0-9.-]{1,70}$/),
  fallbackModel: z.string().trim().regex(/^(?:gemini-[a-z0-9.-]{1,70})?$/),
  priority: z.number().int().min(0).max(100),
  isEnabled: z.boolean(),
  voiceName: z.string().trim().min(1).max(38).nullable(),
  secretSlot: z.string().trim().regex(/^[A-Z0-9_]{1,64}$/).nullable(),
})

const customAiModelSchema = z.object({
  modelId: z.string().min(1, 'Model ID is required'),
  displayName: z.string().min(1, 'Display name is required'),
  category: z.string().optional(),
  tier: z.string().optional(),
  voiceName: z.string().optional(),
  notes: z.string().optional(),
  isEnabled: z.boolean().optional(),
})

// AI Credential actions

export async function getAiCredentials() {
  const credentials = await prisma.aiCredential.findMany({
    orderBy: { createdAt: 'desc' }
  })
  // Return without encrypted keys
  return credentials.map(c => ({
    id: c.id,
    slotName: c.slotName,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }))
}

export async function getAiCredential(slotName: string) {
  return prisma.aiCredential.findUnique({
    where: { slotName }
  })
}

export async function getDecryptedApiKey(slotName: string): Promise<string | null> {
  const credential = await prisma.aiCredential.findUnique({
    where: { slotName }
  })
  if (!credential) return null
  return decrypt(credential.encryptedKey)
}

export async function createAiCredentialAction(data: z.infer<typeof aiCredentialSchema>) {
  const parsed = aiCredentialSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const encryptedKey = encrypt(parsed.data.apiKey)

  const credential = await prisma.aiCredential.create({
    data: {
      slotName: parsed.data.slotName,
      encryptedKey,
    }
  })

  return { success: true, credential: { id: credential.id, slotName: credential.slotName } }
}

export async function updateAiCredentialAction(slotName: string, apiKey: string) {
  const encryptedKey = encrypt(apiKey)

  const credential = await prisma.aiCredential.update({
    where: { slotName },
    data: { encryptedKey }
  })

  return { success: true, credential: { id: credential.id, slotName: credential.slotName } }
}

export async function deleteAiCredentialAction(slotName: string) {
  await prisma.aiCredential.delete({
    where: { slotName }
  })

  return { success: true }
}

// AI Model Config actions

export async function getAiModelConfigs() {
  const rows = await prisma.aiModelConfig.findMany()
  const rowsByKey = new Map(rows.map(row => [row.taskName, row]))

  return GENERAL_AI_TOOLS.map(tool => {
    const row = getToolConfigKeys(tool).map(key => rowsByKey.get(key)).find(Boolean)
    if (!row) return tool
    return {
      ...tool,
      primaryModel: row.primaryModel ?? '',
      fallbackModel: row.fallbackModel ?? '',
      priority: row.priority,
      isEnabled: row.isEnabled,
      usageCount: row.usageCount,
      voiceName: row.voiceName ?? undefined,
      secretSlot: row.secretSlot ?? undefined,
      updatedAt: row.updatedAt,
    }
  }).sort((a, b) => a.priority - b.priority)
}

export async function updateAiModelConfigAction(toolId: string, data: unknown, token: string | null) {
  const actor = await getCurrentUser(token)
  if (actor?.role !== 'admin') throw new Error('Administrator access is required.')
  const tool = GENERAL_AI_TOOLS.find(entry => entry.id === toolId)
  if (!tool) throw new Error('Unknown AI tool.')
  const settings = toolSettingsSchema.parse(data)
  const keys = getToolConfigKeys(tool)

  await prisma.$transaction(async tx => {
    const existing = await tx.aiModelConfig.findMany({
      where: { taskName: { in: keys } },
      select: { taskName: true },
    })
    const storedKey = keys.find(key => existing.some(row => row.taskName === key)) ?? tool.id
    await tx.aiModelConfig.upsert({
      where: { taskName: storedKey },
      create: { taskName: storedKey, ...settings },
      update: settings,
    })
    await tx.auditLog.create({
      data: {
        actorUid: actor.userId,
        actorEmail: actor.email,
        action: 'AI_MODEL_ROUTING_UPDATED',
        resourceType: 'aiModelConfig',
        resourceId: tool.id,
        summary: `${tool.taskName}: ${settings.primaryModel} (${settings.isEnabled ? 'enabled' : 'disabled'})`,
      },
    })
  })
}

// Custom AI Model actions

export async function getCustomAiModels() {
  return prisma.customAiModel.findMany({
    orderBy: { displayName: 'asc' }
  })
}

export async function createCustomAiModelAction(data: z.infer<typeof customAiModelSchema>) {
  const parsed = customAiModelSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const model = await prisma.customAiModel.create({
    data: parsed.data
  })

  return { success: true, model }
}

export async function updateCustomAiModelAction(id: string, data: Partial<z.infer<typeof customAiModelSchema>>) {
  const model = await prisma.customAiModel.update({
    where: { id },
    data
  })

  return { success: true, model }
}

export async function deleteCustomAiModelAction(id: string) {
  await prisma.customAiModel.delete({
    where: { id }
  })

  return { success: true }
}
