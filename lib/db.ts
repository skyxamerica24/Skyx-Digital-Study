import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let client = globalForPrisma.prisma

function getPrismaClient() {
  if (client) return client
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) throw new Error('Set DATABASE_URL to connect to PostgreSQL.')
  client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
  return client
}

// Initialize only when a request or script actually needs PostgreSQL.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = getPrismaClient()
    const value = Reflect.get(instance, property)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
