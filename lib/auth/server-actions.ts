'use server'

import { z } from 'zod'
import { prisma } from '../db'
import { hashPassword, verifyPassword, createSessionToken } from '../db/auth'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(1, 'Display name is required'),
})

/**
 * Login a user with email and password
 */
export async function loginAction(data: { email: string; password: string }) {
  const parsed = loginSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  if (!process.env.DATABASE_URL?.trim() || !process.env.JWT_SECRET?.trim()) {
    return { error: 'Sign in requires PostgreSQL and a server session secret.' }
  }
  const { password } = parsed.data
  const email = parsed.data.email.toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return { error: 'Invalid email or password' }
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return { error: 'Invalid email or password' }
  }

  const token = createSessionToken(user.id, user.email, user.role)

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    }
  }
}

/**
 * Register a new user
 */
export async function registerAction(data: { email: string; password: string; displayName: string }) {
  const parsed = registerSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  if (!process.env.JWT_SECRET?.trim()) {
    return { error: 'Account registration is unavailable until the server is configured.' }
  }
  const { password, displayName } = parsed.data
  const email = parsed.data.email.toLowerCase()

  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    return { error: 'Email already registered' }
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      role: 'learner',
    }
  })

  const token = createSessionToken(user.id, user.email, user.role)

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    }
  }
}

/**
 * Logout a user (client-side token removal)
 */
export async function logoutAction() {
  return { success: true }
}
