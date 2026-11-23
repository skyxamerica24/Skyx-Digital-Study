/**
 * Firebase → PostgreSQL Migration Script
 * 
 * This script exports all data from Firestore collections and imports them into PostgreSQL via Prisma.
 * Run with: npx tsx scripts/migrate-from-firebase.ts
 * 
 * Prerequisites:
 * - Firebase Admin SDK configured with service account
 * - PostgreSQL database running and accessible via DATABASE_URL
 * - Prisma schema generated
 */

import { prisma } from '../lib/db'
import { hashPassword } from '../lib/db/auth'
import { encrypt } from '../lib/db/encryption'

// Firebase Admin SDK (install if needed: npm install firebase-admin)
// @ts-ignore - firebase-admin may not be installed
let admin: typeof import('firebase-admin') | null = null

async function initFirebase() {
  try {
    // @ts-ignore - firebase-admin may not be installed
    const mod = await import('firebase-admin')
    admin = mod
    
    if (!mod.apps.length) {
      mod.initializeApp({
        credential: mod.credential.applicationDefault(),
      })
    }
  } catch (error) {
    console.error('Firebase Admin SDK not installed. Install with: npm install firebase-admin')
    console.error('Or set FIREBASE_SERVICE_ACCOUNT env var with service account JSON')
    throw error
  }
}

const db = () => admin!.db()

interface FirestoreDoc {
  id: string
  data: Record<string, unknown>
}

async function exportCollection(collectionName: string): Promise<FirestoreDoc[]> {
  if (!admin) return []
  
  const snapshot = await db().collection(collectionName).get()
  const docs: FirestoreDoc[] = []
  
  snapshot.forEach((doc: { id: string; data: () => Record<string, unknown> }) => {
    docs.push({
      id: doc.id,
      data: doc.data() as Record<string, unknown>,
    })
  })
  
  console.log(`  Exported ${docs.length} documents from ${collectionName}`)
  return docs
}

async function migrateUsers(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    const email = (d.email as string) || ''
    const passwordHash = (d.passwordHash as string) || '$2a$12$defaultHash'
    
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        id: doc.id,
        email,
        passwordHash,
        displayName: d.displayName as string || null,
        photoURL: d.photoURL as string || null,
        role: (d.role as string) || 'learner',
        planId: d.planId as string || null,
        studyStreakDays: (d.studyStreakDays as number) || 0,
        dailyAiCalls: (d.dailyAiCalls as number) || 0,
        weeklyGoalMinutes: (d.weeklyGoalMinutes as number) || 30,
      }
    })
  }
  console.log(`  Migrated ${docs.length} users`)
}

async function migrateAdmins(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.admin.upsert({
      where: { email: (d.email as string) || doc.id },
      update: {},
      create: {
        uid: doc.id,
        email: (d.email as string) || doc.id,
      }
    })
  }
  console.log(`  Migrated ${docs.length} admins`)
}

async function migrateCurriculums(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.curriculum.upsert({
      where: { slug: (d.slug as string) || doc.id },
      update: {},
      create: {
        id: doc.id,
        slug: (d.slug as string) || doc.id,
        name: (d.name as string) || '',
        description: d.description as string || null,
        orderIndex: (d.orderIndex as number) || 0,
        isPublished: (d.isPublished as boolean) || false,
      }
    })
  }
  console.log(`  Migrated ${docs.length} curriculums`)
}

async function migrateSubjects(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.subject.create({
      data: {
        id: doc.id,
        curriculumId: (d.curriculumId as string) || '',
        code: (d.code as string) || '',
        name: (d.name as string) || '',
        language: (d.language as string) || 'en',
        description: d.description as string || null,
        orderIndex: (d.orderIndex as number) || 0,
        isPublished: (d.isPublished as boolean) || false,
      }
    })
  }
  console.log(`  Migrated ${docs.length} subjects`)
}

async function migrateSyllabi(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.syllabus.create({
      data: {
        id: doc.id,
        curriculumId: (d.curriculumId as string) || '',
        subjectId: (d.subjectId as string) || null,
        title: (d.title as string) || '',
        examTarget: d.examTarget as string || null,
        academicYear: d.academicYear as string || null,
        chaptersSummary: d.chaptersSummary as string || null,
        isPublished: (d.isPublished as boolean) || false,
      }
    })
  }
  console.log(`  Migrated ${docs.length} syllabi`)
}

async function migrateBooks(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.book.create({
      data: {
        id: doc.id,
        curriculumId: (d.curriculumId as string) || null,
        title: (d.title as string) || '',
        subtitle: d.subtitle as string || null,
        author: d.author as string || null,
        subject: d.subject as string || null,
        language: (d.language as string) || 'en',
        accessTier: (d.accessTier as string) || 'free',
        coverColor: d.coverColor as string || null,
        description: d.description as string || null,
        totalTopics: (d.totalTopics as number) || 0,
        isPublished: (d.isPublished as boolean) || false,
      }
    })
  }
  console.log(`  Migrated ${docs.length} books`)
}

async function migrateTopics(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.bookTopic.create({
      data: {
        id: doc.id,
        bookId: (d.bookId as string) || '',
        chapterNumber: (d.chapterNumber as number) || 1,
        chapterTitle: d.chapterTitle as string || null,
        sectionTitle: d.sectionTitle as string || null,
        topicTitle: (d.topicTitle as string) || '',
        orderIndex: (d.orderIndex as number) || 0,
        contentMarkdown: d.contentMarkdown as string || null,
        readingMinutes: (d.readingMinutes as number) || 5,
        model3dKey: d.model3dKey as string || null,
        searchTokens: d.searchTokens as string || null,
        isPublished: (d.isPublished as boolean) || false,
      }
    })
  }
  console.log(`  Migrated ${docs.length} topics`)
}

async function migrateQuestions(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.question.create({
      data: {
        id: doc.id,
        bookId: (d.bookId as string) || '',
        topicId: (d.topicId as string) || null,
        chapterTitle: d.chapterTitle as string || null,
        stem: (d.stem as string) || '',
        options: (d.options as string) || '[]',
        correctIndex: (d.correctIndex as number) || 0,
        explanation: d.explanation as string || null,
        difficulty: (d.difficulty as string) || 'medium',
        isPublished: (d.isPublished as boolean) || false,
      }
    })
  }
  console.log(`  Migrated ${docs.length} questions`)
}

async function migrateFlashcards(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.flashcard.create({
      data: {
        id: doc.id,
        userId: (d.userId as string) || '',
        bookId: (d.bookId as string) || null,
        topicId: (d.topicId as string) || null,
        bookTitle: d.bookTitle as string || null,
        topicTitle: d.topicTitle as string || null,
        front: (d.front as string) || '',
        back: (d.back as string) || '',
        intervalDays: (d.intervalDays as number) || 1,
        easeFactor: (d.easeFactor as number) || 2.5,
        repetitions: (d.repetitions as number) || 0,
        nextReviewAt: d.nextReviewAt instanceof Date ? d.nextReviewAt : new Date(),
      }
    })
  }
  console.log(`  Migrated ${docs.length} flashcards`)
}

async function migrateAnnotations(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.learnerAnnotation.create({
      data: {
        id: doc.id,
        userId: (d.userId as string) || '',
        bookId: (d.bookId as string) || null,
        topicId: (d.topicId as string) || null,
        bookTitle: d.bookTitle as string || null,
        topicTitle: d.topicTitle as string || null,
        type: (d.type as string) || 'highlight',
        color: d.color as string || null,
        quote: d.quote as string || null,
        noteText: d.noteText as string || null,
      }
    })
  }
  console.log(`  Migrated ${docs.length} annotations`)
}

async function migrateReadingProgress(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.readingProgress.create({
      data: {
        id: doc.id,
        userId: (d.userId as string) || '',
        bookId: (d.bookId as string) || null,
        topicId: (d.topicId as string) || null,
        bookTitle: d.bookTitle as string || null,
        topicTitle: d.topicTitle as string || null,
        percentComplete: (d.percentComplete as number) || 0,
        timeSpentSeconds: (d.timeSpentSeconds as number) || 0,
        isCompleted: (d.isCompleted as boolean) || false,
      }
    })
  }
  console.log(`  Migrated ${docs.length} reading progress records`)
}

async function migrateExamAttempts(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.examAttempt.create({
      data: {
        id: doc.id,
        userId: (d.userId as string) || '',
        bookId: (d.bookId as string) || null,
        examTitle: d.examTitle as string || null,
        totalQuestions: (d.totalQuestions as number) || 0,
        correctCount: (d.correctCount as number) || 0,
        wrongCount: (d.wrongCount as number) || 0,
        skippedCount: (d.skippedCount as number) || 0,
        accuracyPercent: (d.accuracyPercent as number) || 0,
        durationSeconds: (d.durationSeconds as number) || 0,
        status: (d.status as string) || 'in_progress',
        questionIds: d.questionIds as string || null,
      }
    })
  }
  console.log(`  Migrated ${docs.length} exam attempts`)
}

async function migrateImportJobs(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.importJob.create({
      data: {
        id: doc.id,
        bookId: (d.bookId as string) || null,
        bookTitle: d.bookTitle as string || null,
        sourceFileName: d.sourceFileName as string || null,
        sourceType: d.sourceType as string || null,
        status: (d.status as string) || 'pending',
        progressPercent: (d.progressPercent as number) || 0,
        topicsDetected: (d.topicsDetected as number) || 0,
        ocrConfidence: d.ocrConfidence as number || null,
        notes: d.notes as string || null,
        createdBy: d.createdBy as string || null,
      }
    })
  }
  console.log(`  Migrated ${docs.length} import jobs`)
}

async function migrateSubscriptionPlans(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.subscriptionPlan.create({
      data: {
        id: doc.id,
        name: (d.name as string) || '',
        tagline: d.tagline as string || null,
        priceMonthly: (d.priceMonthly as number) || 0,
        currency: (d.currency as string) || 'USD',
        allowedTiers: d.allowedTiers as string || null,
        dailyAiLimit: (d.dailyAiLimit as number) || 10,
        has3dLab: (d.has3dLab as boolean) || false,
        hasVoiceTutor: (d.hasVoiceTutor as boolean) || false,
        orderIndex: (d.orderIndex as number) || 0,
        isPublished: (d.isPublished as boolean) || false,
      }
    })
  }
  console.log(`  Migrated ${docs.length} subscription plans`)
}

async function migrateSubscriptionRecords(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.subscriptionRecord.create({
      data: {
        id: doc.id,
        userId: (d.userId as string) || '',
        planId: (d.planId as string) || null,
        planName: d.planName as string || null,
        amount: (d.amount as number) || 0,
        currency: (d.currency as string) || 'USD',
        status: (d.status as string) || 'active',
      }
    })
  }
  console.log(`  Migrated ${docs.length} subscription records`)
}

async function migrateCustomAiModels(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.customAiModel.create({
      data: {
        id: doc.id,
        modelId: (d.modelId as string) || doc.id,
        displayName: (d.displayName as string) || '',
        category: d.category as string || null,
        tier: d.tier as string || null,
        voiceName: d.voiceName as string || null,
        notes: d.notes as string || null,
        isEnabled: (d.isEnabled as boolean) ?? true,
      }
    })
  }
  console.log(`  Migrated ${docs.length} custom AI models`)
}

async function migrateAiModelConfigs(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.aiModelConfig.create({
      data: {
        id: doc.id,
        taskName: (d.taskName as string) || doc.id,
        primaryModel: d.primaryModel as string || null,
        fallbackModel: d.fallbackModel as string || null,
        priority: (d.priority as number) || 0,
        isEnabled: (d.isEnabled as boolean) ?? true,
        usageCount: (d.usageCount as number) || 0,
        voiceName: d.voiceName as string || null,
        secretSlot: d.secretSlot as string || null,
      }
    })
  }
  console.log(`  Migrated ${docs.length} AI model configs`)
}

async function migrateAiCredentials(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    const apiKey = (d.apiKey as string) || (d.encryptedKey as string) || ''
    const encryptedKey = apiKey ? encrypt(apiKey) : ''
    
    await prisma.aiCredential.create({
      data: {
        id: doc.id,
        slotName: (d.slotName as string) || doc.id,
        encryptedKey,
      }
    })
  }
  console.log(`  Migrated ${docs.length} AI credentials`)
}

async function migrateStudyTabTypes(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.studyTabType.create({
      data: {
        id: doc.id,
        key: (d.key as string) || doc.id,
        label: (d.label as string) || '',
        promptTemplate: d.promptTemplate as string || null,
        orderIndex: (d.orderIndex as number) || 0,
        isSystem: (d.isSystem as boolean) || false,
        isPublished: (d.isPublished as boolean) || false,
      }
    })
  }
  console.log(`  Migrated ${docs.length} study tab types`)
}

async function migrateTopicStudyTabs(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.topicStudyTab.create({
      data: {
        id: doc.id,
        bookId: (d.bookId as string) || '',
        topicId: (d.topicId as string) || '',
        tabKey: (d.tabKey as string) || '',
        contentMarkdown: d.contentMarkdown as string || null,
        generatedByModel: d.generatedByModel as string || null,
        isPublished: (d.isPublished as boolean) || false,
      }
    })
  }
  console.log(`  Migrated ${docs.length} topic study tabs`)
}

async function migrateAuditLogs(docs: FirestoreDoc[]) {
  for (const doc of docs) {
    const d = doc.data
    await prisma.auditLog.create({
      data: {
        id: doc.id,
        actorUid: d.actorUid as string || null,
        actorEmail: d.actorEmail as string || null,
        action: (d.action as string) || '',
        resourceType: d.resourceType as string || null,
        resourceId: d.resourceId as string || null,
        summary: d.summary as string || null,
      }
    })
  }
  console.log(`  Migrated ${docs.length} audit logs`)
}

// Main migration function
async function main() {
  console.log('=== Firebase → PostgreSQL Migration ===\n')
  
  try {
    await initFirebase()
  } catch (error) {
    console.log('Firebase not available. Skipping Firebase migration.')
    console.log('Run this script after installing firebase-admin and configuring credentials.')
    return
  }
  
  const collections: { name: string; migrate: (docs: FirestoreDoc[]) => Promise<void> }[] = [
    { name: 'users', migrate: migrateUsers },
    { name: 'admins', migrate: migrateAdmins },
    { name: 'curriculums', migrate: migrateCurriculums },
    { name: 'subjects', migrate: migrateSubjects },
    { name: 'syllabi', migrate: migrateSyllabi },
    { name: 'books', migrate: migrateBooks },
    { name: 'topics', migrate: migrateTopics },
    { name: 'questions', migrate: migrateQuestions },
    { name: 'flashcards', migrate: migrateFlashcards },
    { name: 'learnerAnnotations', migrate: migrateAnnotations },
    { name: 'readingProgress', migrate: migrateReadingProgress },
    { name: 'examAttempts', migrate: migrateExamAttempts },
    { name: 'importJobs', migrate: migrateImportJobs },
    { name: 'subscriptionPlans', migrate: migrateSubscriptionPlans },
    { name: 'subscriptionRecords', migrate: migrateSubscriptionRecords },
    { name: 'customAiModels', migrate: migrateCustomAiModels },
    { name: 'aiModelConfigs', migrate: migrateAiModelConfigs },
    { name: 'aiCredentials', migrate: migrateAiCredentials },
    { name: 'studyTabTypes', migrate: migrateStudyTabTypes },
    { name: 'topicStudyTabs', migrate: migrateTopicStudyTabs },
    { name: 'auditLogs', migrate: migrateAuditLogs },
  ]
  
  let totalMigrated = 0
  
  for (const collection of collections) {
    console.log(`\nMigrating ${collection.name}...`)
    try {
      const docs = await exportCollection(collection.name)
      await collection.migrate(docs)
      totalMigrated += docs.length
    } catch (error) {
      console.error(`  Error migrating ${collection.name}:`, error)
    }
  }
  
  console.log(`\n=== Migration Complete ===`)
  console.log(`Total records migrated: ${totalMigrated}`)
  
  // Mark system as initialized
  await prisma.systemBootstrap.upsert({
    where: { id: 'default' },
    update: { initialized: true },
    create: {
      id: 'default',
      initialized: true,
    }
  })
  
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
