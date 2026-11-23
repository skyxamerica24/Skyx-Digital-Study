import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline'
import { loadEnvConfig } from '@next/env'
import { z } from 'zod'
import { hashPassword } from '../lib/db/auth'
import { prisma } from '../lib/db'

function readPassword(prompt: string) {
  // Terminal mode handles backspace without echoing input when output is omitted.
  const input = createInterface({ input: stdin, terminal: true })
  stdout.write(prompt)
  return new Promise<string>((resolve, reject) => {
    input.once('close', () => reject(new Error('Password input cancelled.')))
    input.once('SIGINT', () => input.close())
    input.once('line', password => {
      resolve(password)
      input.close()
    })
  }).finally(() => stdout.write('\n'))
}

async function main() {
  const [emailArg, ...extra] = process.argv.slice(2)
  const email = z.string().email().max(200).safeParse(emailArg?.trim().toLowerCase())
  if (!email.success || extra.length) {
    throw new Error('Usage: npm run admin:create -- admin@example.com')
  }

  loadEnvConfig(process.cwd(), process.env.NODE_ENV === 'development')
  if (!process.env.DATABASE_URL?.trim()) throw new Error('Set DATABASE_URL for your PostgreSQL database first.')
  if (!process.env.JWT_SECRET?.trim()) throw new Error('Set JWT_SECRET on the server before creating an account for sign-in.')
  if (!stdin.isTTY) throw new Error('Run this command in an interactive terminal to enter the password.')

  const password = await readPassword('Administrator password: ')
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Use at least 12 characters and at most 72 UTF-8 bytes.')
  }
  if (password !== await readPassword('Confirm password: ')) throw new Error('Passwords do not match.')

  const passwordHash = await hashPassword(password)
  try {
    await prisma.$transaction(async tx => {
      await tx.user.create({
        data: { email: email.data, passwordHash, displayName: email.data.split('@')[0], role: 'admin' },
      })
      await tx.admin.create({ data: { email: email.data } })
    })
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
    if (code === 'P2002') throw new Error('This email already exists. Choose a new email.')
    if (code === 'P2021') throw new Error('Database tables are missing. Run npm run db:setup first.')
    throw new Error('Could not create the administrator. Check the database connection and confirm its schema is set up.')
  } finally {
    await prisma.$disconnect()
  }
  console.log(`Administrator created for ${email.data}. Use Sign In on the main page.`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Administrator creation failed.')
  process.exitCode = 1
})
