import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const BCRYPT_ROUNDS = 12
const JWT_EXPIRATION = '7d'

function sessionSecret() {
  return process.env.JWT_SECRET?.trim()
}

/**
 * Hash a password using bcrypt with cost 12
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Verify a password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Create a JWT session token for a user
 */
export function createSessionToken(userId: string, email: string, role: string): string {
  const secret = sessionSecret()
  if (!secret) throw new Error('Set JWT_SECRET on the server before enabling login.')
  return jwt.sign(
    { userId, email, role },
    secret,
    { expiresIn: JWT_EXPIRATION }
  )
}

/**
 * Verify and decode a JWT session token on the server
 */
export function verifySessionToken(token: string): { userId: string; email: string; role: string } | null {
  const secret = sessionSecret()
  if (!secret) return null
  try {
    const decoded = jwt.verify(token, secret) as { userId: string; email: string; role: string }
    return decoded
  } catch {
    return null
  }
}

/**
 * Check if user is admin
 */
export function isAdmin(role: string): boolean {
  return role === 'admin'
}
