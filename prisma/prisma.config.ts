import { loadEnvConfig } from '@next/env'
import type { PrismaConfig } from 'prisma/config'

loadEnvConfig(process.cwd(), process.env.NODE_ENV === 'development')

const url = process.env.DATABASE_URL?.trim()
const config: PrismaConfig = {
  schema: 'schema.prisma',
  ...(url ? { datasource: { url } } : {}),
}

export default config
