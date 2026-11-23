'use server'

import { prisma } from '../db'
import { verifySessionToken } from '../db/auth'
import { cookies } from 'next/headers'

/**
 * Get the current user from the session cookie (server-only, no caller-supplied ID).
 */
async function getCurrentUserFromSession() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('skyx-session')?.value
  if (!sessionToken) return null
  const decoded = verifySessionToken(sessionToken)
  if (!decoded) return null
  return decoded
}

/**
 * Resolve a channel config by channel ID. Returns null if not found or disabled.
 * No fallback to another channel or model.
 */
export async function resolveChannelConfig(channelId: string) {
  const channel = await prisma.aiChannelConfig.findUnique({
    where: { channelId },
  })
  if (!channel || !channel.isEnabled) {
    return null
  }
  return channel
}

/**
 * Get all enabled channel configs (for admin UI).
 */
export async function getAllChannelConfigs() {
  return prisma.aiChannelConfig.findMany({
    orderBy: { channelId: 'asc' },
  })
}

/**
 * Update a channel config (admin only).
 */
export async function updateChannelConfigAction(channelId: string, data: {
  modelId?: string | null
  credentialSlot?: string | null
  voiceName?: string | null
  isEnabled?: boolean
  label?: string
}) {
  const user = await getCurrentUserFromSession()
  if (!user || user.role !== 'admin') {
    throw new Error('Administrator access is required.')
  }

  const channel = await prisma.aiChannelConfig.update({
    where: { channelId },
    data,
  })
  return channel
}

// --- Conversation History Actions ---

interface CreateConversationInput {
  channelId: string
  title?: string
  bookId?: string
  topicId?: string
}

/**
 * Create a new conversation for the current user.
 */
export async function createConversationAction(input: CreateConversationInput) {
  const user = await getCurrentUserFromSession()
  if (!user) throw new Error('Authentication required.')

  // Validate channel exists and is enabled
  const channel = await resolveChannelConfig(input.channelId)
  if (!channel) {
    throw new Error(`Channel "${input.channelId}" is not available.`)
  }

  const conversation = await prisma.aiConversation.create({
    data: {
      userId: user.userId,
      channelId: input.channelId,
      title: input.title || null,
      bookId: input.bookId || null,
      topicId: input.topicId || null,
      messageCount: 0,
    },
  })
  return conversation
}

/**
 * List conversations for the current user, scoped to a channel.
 */
export async function listConversationsAction(channelId: string, limit = 20) {
  const user = await getCurrentUserFromSession()
  if (!user) throw new Error('Authentication required.')

  return prisma.aiConversation.findMany({
    where: {
      userId: user.userId,
      channelId,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      channelId: true,
      messageCount: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

/**
 * Load a conversation with its messages.
 */
export async function loadConversationAction(conversationId: string) {
  const user = await getCurrentUserFromSession()
  if (!user) throw new Error('Authentication required.')

  // Verify ownership
  const conversation = await prisma.aiConversation.findFirst({
    where: {
      id: conversationId,
      userId: user.userId,
    },
    include: {
      messages: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          modelUsed: true,
          inputTokens: true,
          outputTokens: true,
          position: true,
          createdAt: true,
        },
      },
    },
  })

  if (!conversation) {
    throw new Error('Conversation not found.')
  }

  return conversation
}

/**
 * Save a message to a conversation. Creates the conversation if it doesn't exist.
 * Uses clientOpId for idempotency.
 */
export async function saveMessageAction(input: {
  conversationId?: string
  channelId: string
  role: 'user' | 'model'
  content: string
  modelUsed?: string
  inputTokens?: number
  outputTokens?: number
  clientOpId?: string
  bookId?: string
  topicId?: string
  title?: string
}) {
  const user = await getCurrentUserFromSession()
  if (!user) throw new Error('Authentication required.')

  // Check for idempotent duplicate
  if (input.clientOpId) {
    const existing = await prisma.aiConversationMessage.findFirst({
      where: { clientOpId: input.clientOpId },
    })
    if (existing) {
      return { message: existing, duplicate: true }
    }
  }

  let conversationId = input.conversationId

  // If no conversation ID, create one
  if (!conversationId) {
    const conv = await prisma.aiConversation.create({
      data: {
        userId: user.userId,
        channelId: input.channelId,
        title: input.title || null,
        bookId: input.bookId || null,
        topicId: input.topicId || null,
        messageCount: 0,
      },
    })
    conversationId = conv.id
  } else {
    // Verify ownership
    const conv = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId: user.userId },
    })
    if (!conv) {
      throw new Error('Conversation not found.')
    }
  }

  // Get the next position
  const lastMsg = await prisma.aiConversationMessage.findFirst({
    where: { conversationId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  const position = (lastMsg?.position ?? -1) + 1

  const message = await prisma.aiConversationMessage.create({
    data: {
      conversationId,
      role: input.role,
      content: input.content,
      modelUsed: input.modelUsed || null,
      inputTokens: input.inputTokens || null,
      outputTokens: input.outputTokens || null,
      position,
      clientOpId: input.clientOpId || null,
    },
  })

  // Update message count
  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: {
      messageCount: { increment: 1 },
      updatedAt: new Date(),
    },
  })

  return { message, conversationId, duplicate: false }
}

/**
 * Save a batch of messages (user + model pair) in a transaction.
 */
export async function saveMessagePairAction(input: {
  conversationId?: string
  channelId: string
  userContent: string
  modelContent: string
  modelUsed?: string
  inputTokens?: number
  outputTokens?: number
  userClientOpId?: string
  modelClientOpId?: string
  bookId?: string
  topicId?: string
  title?: string
}) {
  const user = await getCurrentUserFromSession()
  if (!user) throw new Error('Authentication required.')

  let conversationId = input.conversationId

  if (!conversationId) {
    const conv = await prisma.aiConversation.create({
      data: {
        userId: user.userId,
        channelId: input.channelId,
        title: input.title || null,
        bookId: input.bookId || null,
        topicId: input.topicId || null,
        messageCount: 0,
      },
    })
    conversationId = conv.id
  } else {
    const conv = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId: user.userId },
    })
    if (!conv) {
      throw new Error('Conversation not found.')
    }
  }

  const lastMsg = await prisma.aiConversationMessage.findFirst({
    where: { conversationId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  const userPosition = (lastMsg?.position ?? -1) + 1
  const modelPosition = userPosition + 1

  await prisma.$transaction(async (tx) => {
    await tx.aiConversationMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: input.userContent,
        position: userPosition,
        clientOpId: input.userClientOpId || null,
      },
    })
    await tx.aiConversationMessage.create({
      data: {
        conversationId,
        role: 'model',
        content: input.modelContent,
        modelUsed: input.modelUsed || null,
        inputTokens: input.inputTokens || null,
        outputTokens: input.outputTokens || null,
        position: modelPosition,
        clientOpId: input.modelClientOpId || null,
      },
    })
    await tx.aiConversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 2 },
        updatedAt: new Date(),
      },
    })
  })

  return { conversationId }
}

/**
 * Delete a conversation.
 */
export async function deleteConversationAction(conversationId: string) {
  const user = await getCurrentUserFromSession()
  if (!user) throw new Error('Authentication required.')

  // Verify ownership
  const conv = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId: user.userId },
  })
  if (!conv) {
    throw new Error('Conversation not found.')
  }

  // Delete messages first, then conversation
  await prisma.$transaction(async (tx) => {
    await tx.aiConversationMessage.deleteMany({
      where: { conversationId },
    })
    await tx.aiConversation.delete({
      where: { id: conversationId },
    })
  })

  return { success: true }
}

/**
 * Update conversation title.
 */
export async function updateConversationTitleAction(conversationId: string, title: string) {
  const user = await getCurrentUserFromSession()
  if (!user) throw new Error('Authentication required.')

  const conv = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId: user.userId },
  })
  if (!conv) {
    throw new Error('Conversation not found.')
  }

  const updated = await prisma.aiConversation.update({
    where: { id: conversationId },
    data: { title },
  })
  return updated
}

// --- Tool Run Tracking ---

/**
 * Record a tool run in the database for audit/history purposes.
 * This is a server action — userId is derived from the session cookie.
 */
export async function createToolRunAction(input: {
  channelId: string
  resultType?: string
  status?: string
  inputSummary?: string
  outputReference?: string
  modelUsed?: string
}) {
  const user = await getCurrentUserFromSession()
  if (!user) throw new Error('Authentication required.')

  return createToolRunDirect(user.userId, input)
}

/**
 * Direct tool run creation — accepts userId explicitly (for API routes where
 * the user is already authenticated via request cookies).
 */
export async function createToolRunDirect(userId: string, input: {
  channelId: string
  resultType?: string
  status?: string
  inputSummary?: string
  outputReference?: string
  modelUsed?: string
}) {
  const toolRun = await prisma.aiToolRun.create({
    data: {
      userId,
      channelId: input.channelId,
      resultType: input.resultType || null,
      status: input.status || 'completed',
      inputSummary: input.inputSummary || null,
      outputReference: input.outputReference || null,
      modelUsed: input.modelUsed || null,
    },
  })
  return toolRun
}

/**
 * List tool runs for the current user, scoped to a channel.
 */
export async function listToolRunsAction(channelId: string, limit = 20) {
  const user = await getCurrentUserFromSession()
  if (!user) throw new Error('Authentication required.')

  return prisma.aiToolRun.findMany({
    where: {
      userId: user.userId,
      channelId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * getUserFromRequestCookie moved to lib/auth/request-user.ts — it is a
 * synchronous helper and cannot be exported from this 'use server' module
 * (Next.js build: "Server Actions must be async functions").
 */
