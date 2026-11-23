import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32
const KEY_DERIVATION_ITERATIONS = 100000

// Get encryption key from environment or derive a default
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.ENCRYPTION_KEY
  if (keyEnv) {
    const key = Buffer.from(keyEnv, 'hex')
    if (key.length === KEY_LENGTH) {
      return key
    }
  }
  // Fallback: derive from a salt (not secure for production, set ENCRYPTION_KEY)
  const salt = Buffer.from('skyx-academy-default-salt-for-dev', 'utf-8')
  return crypto.pbkdf2Sync(salt, salt, KEY_DERIVATION_ITERATIONS, KEY_LENGTH, 'sha256')
}

const ENCRYPTION_KEY = getEncryptionKey()

/**
 * Encrypt a plaintext value using AES-256-GCM
 * Returns: iv:tag:ciphertext (base64 encoded)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, 'utf-8', 'base64')
  encrypted += cipher.final('base64')
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt a value encrypted with the encrypt function
 * Expects: iv:tag:ciphertext (base64 encoded)
 */
export function decrypt(encryptedText: string): string {
  const [ivStr, tagStr, encrypted] = encryptedText.split(':')
  if (!ivStr || !tagStr || !encrypted) {
    throw new Error('Invalid encrypted data format')
  }
  const iv = Buffer.from(ivStr, 'base64')
  const tag = Buffer.from(tagStr, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(encrypted, 'base64', 'utf-8')
  decrypted += decipher.final('utf-8')
  return decrypted
}
