/**
 * Migration script to create the new AI channel and history tables.
 * Run with: npx tsx scripts/migrate-ai-history.ts
 */

import { prisma } from '../lib/db'

async function main() {
  console.log('=== Creating AI Channel & History Tables ===\n')

  // 1. AiChannelConfig
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AiChannelConfig" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "channelId" text NOT NULL,
      "label" text NOT NULL,
      "modelId" text,
      "credentialSlot" text,
      "voiceName" text,
      "isEnabled" boolean NOT NULL DEFAULT true,
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "AiChannelConfig_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "AiChannelConfig_channelId_key" UNIQUE ("channelId")
    )
  `)
  console.log('✓ AiChannelConfig table created')

  // Indexes for AiChannelConfig
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiChannelConfig_channelId" ON "AiChannelConfig" ("channelId")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiChannelConfig_isEnabled" ON "AiChannelConfig" ("isEnabled")
  `)

  // 2. AiConversation
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AiConversation" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "userId" text NOT NULL,
      "channelId" text NOT NULL,
      "title" text,
      "bookId" text,
      "topicId" text,
      "messageCount" integer NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
    )
  `)
  console.log('✓ AiConversation table created')

  // Indexes for AiConversation
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiConversation_userId" ON "AiConversation" ("userId")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiConversation_channelId" ON "AiConversation" ("channelId")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiConversation_userId_channelId" ON "AiConversation" ("userId", "channelId")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiConversation_updatedAt" ON "AiConversation" ("updatedAt")
  `)

  // 3. AiConversationMessage
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AiConversationMessage" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "conversationId" text NOT NULL,
      "role" text NOT NULL,
      "content" text NOT NULL,
      "modelUsed" text,
      "inputTokens" integer,
      "outputTokens" integer,
      "position" integer NOT NULL,
      "clientOpId" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "AiConversationMessage_pkey" PRIMARY KEY ("id")
    )
  `)
  console.log('✓ AiConversationMessage table created')

  // Indexes for AiConversationMessage
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiConversationMessage_conversationId" ON "AiConversationMessage" ("conversationId")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiConversationMessage_position" ON "AiConversationMessage" ("position")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiConversationMessage_clientOpId" ON "AiConversationMessage" ("clientOpId")
  `)

  // 4. AiToolRun
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AiToolRun" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "userId" text NOT NULL,
      "channelId" text NOT NULL,
      "resultType" text,
      "status" text NOT NULL DEFAULT 'completed',
      "inputSummary" text,
      "outputReference" text,
      "modelUsed" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "AiToolRun_pkey" PRIMARY KEY ("id")
    )
  `)
  console.log('✓ AiToolRun table created')

  // Indexes for AiToolRun
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiToolRun_userId" ON "AiToolRun" ("userId")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiToolRun_channelId" ON "AiToolRun" ("channelId")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AiToolRun_userId_channelId" ON "AiToolRun" ("userId", "channelId")
  `)

  console.log('\n=== All tables created successfully ===\n')

  // Seed the 9 channel configs
  console.log('=== Seeding Channel Configs ===\n')

  const channels = [
    { channelId: 'chat', label: 'Floating AI Chat', modelId: 'gemini-4-hydrogen', credentialSlot: null, voiceName: null },
    { channelId: 'live-voice', label: 'Floating Live Voice', modelId: 'gemini-3.8-live', credentialSlot: null, voiceName: 'Zephyr' },
    { channelId: 'study-content', label: 'Study Content Generator', modelId: 'gemini-4-hydrogen', credentialSlot: null, voiceName: null },
    { channelId: 'questions', label: 'Question Bank & Exam Generator', modelId: 'gemini-4-hydrogen', credentialSlot: null, voiceName: null },
    { channelId: 'book-split', label: 'Book Auto-Splitter', modelId: 'gemini-4-hydrogen', credentialSlot: null, voiceName: null },
    { channelId: 'tts', label: 'Text-to-Speech (Read-Aloud)', modelId: 'gemini-3.8-flash-lite-tts', credentialSlot: null, voiceName: null },
    { channelId: 'transcribe', label: 'Voice Transcription', modelId: 'gemini-3.5-transcribe', credentialSlot: null, voiceName: null },
    { channelId: 'grounding', label: 'Web Search Grounding', modelId: 'gemini-4-hydrogen', credentialSlot: null, voiceName: null },
    { channelId: 'book-reader', label: 'Book Reader Voice Assistant', modelId: 'gemini-3.8-live', credentialSlot: null, voiceName: 'Zephyr' },
  ]

  for (const ch of channels) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "AiChannelConfig" ("channelId", "label", "modelId", "credentialSlot", "voiceName", "isEnabled", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, true, now())
      ON CONFLICT ("channelId") DO UPDATE SET
        "label" = EXCLUDED."label",
        "modelId" = EXCLUDED."modelId",
        "voiceName" = EXCLUDED."voiceName",
        "updatedAt" = now()
    `, ch.channelId, ch.label, ch.modelId, ch.credentialSlot, ch.voiceName)
    console.log(`✓ Seeded channel: ${ch.channelId} (${ch.label})`)
  }

  console.log('\n=== Migration Complete ===')
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
