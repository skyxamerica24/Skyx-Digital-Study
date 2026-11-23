'use server'

import { prisma } from '../db'
import { verifySessionToken } from './auth'

/**
 * Get current user from token (server-only)
 */
export async function getCurrentUser(token: string | null): Promise<{ userId: string; email: string; role: string } | null> {
  if (!token) return null
  
  const decoded = verifySessionToken(token)
  if (!decoded) return null

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  })

  if (!user) return null

  return {
    userId: user.id,
    email: user.email,
    role: user.role
  }
}
