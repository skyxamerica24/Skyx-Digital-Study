/**
 * PostgreSQL Seed Script
 * 
 * Seeds initial data into PostgreSQL via Prisma.
 * Run with: npx tsx scripts/seed-postgres.ts
 * 
 * Prerequisites:
 * - PostgreSQL database running and accessible via DATABASE_URL
 * - Prisma schema generated
 */

import { prisma } from '../lib/db'
import { encrypt } from '../lib/db/encryption'

async function main() {
  console.log('=== Seeding PostgreSQL Database ===\n')

  // Create default AI credential (empty, to be filled by admin)
  const defaultApiKey = process.env.GEMINI_API_KEY || ''
  if (defaultApiKey) {
    const encryptedKey = encrypt(defaultApiKey)
    await prisma.aiCredential.upsert({
      where: { slotName: 'default' },
      update: {},
      create: {
        slotName: 'default',
        encryptedKey,
      }
    })
    console.log('Created default AI credential')
  }

  // Create default AI model config
  await prisma.aiModelConfig.upsert({
    where: { taskName: 'chat' },
    update: {},
    create: {
      taskName: 'chat',
      primaryModel: 'gemini-2.0-flash',
      priority: 1,
      isEnabled: true,
      secretSlot: 'default',
    }
  })

  console.log('Created default AI model config')

  // Create system bootstrap record
  await prisma.systemBootstrap.upsert({
    where: { id: 'default' },
    update: { initialized: true },
    create: {
      id: 'default',
      initialized: true,
    }
  })

  console.log('System bootstrap record created')

  // Create default subscription plans
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'free' },
    update: {},
    create: {
      id: 'free',
      name: 'Free',
      tagline: 'Get started with basic features',
      priceMonthly: 0,
      currency: 'USD',
      allowedTiers: '["free"]',
      dailyAiLimit: 5,
      has3dLab: false,
      hasVoiceTutor: false,
      orderIndex: 0,
      isPublished: true,
    }
  })

  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'premium' },
    update: {},
    create: {
      id: 'premium',
      name: 'Premium',
      tagline: 'Unlock all features and unlimited AI',
      priceMonthly: 9.99,
      currency: 'USD',
      allowedTiers: '["free", "premium"]',
      dailyAiLimit: 100,
      has3dLab: true,
      hasVoiceTutor: true,
      orderIndex: 1,
      isPublished: true,
    }
  })

  console.log('Created default subscription plans')

  console.log('\n=== Seeding Complete ===')

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Seeding failed:', error)
  process.exit(1)
})
