'use server'

import { prisma } from '../db'

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: {
  actorUid?: string
  actorEmail?: string
  action: string
  resourceType?: string
  resourceId?: string
  summary?: string
}) {
  const log = await prisma.auditLog.create({
    data
  })
  return log
}

/**
 * Get audit logs with optional filtering
 */
export async function getAuditLogs(options?: {
  actorEmail?: string
  resourceType?: string
  limit?: number
  offset?: number
}) {
  const where: Record<string, unknown> = {}
  
  if (options?.actorEmail) {
    where.actorEmail = options.actorEmail
  }
  if (options?.resourceType) {
    where.resourceType = options.resourceType
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  })
}

/**
 * Get audit log count
 */
export async function getAuditLogCount() {
  return prisma.auditLog.count()
}
