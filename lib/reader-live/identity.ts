import { getCurrentUser } from '../db/user';
import { prisma } from '../db';
import { verifyPassword, hashPassword, createSessionToken, isAdmin } from '../db/auth';

export class AccessError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

// ------------------------------------------------------------------
// Admin credentials validation (database-backed)
// ------------------------------------------------------------------

/** Validate admin email + password against database */
export async function validateAdminCredentials(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !isAdmin(user.role)) return false;
  
  return verifyPassword(password, user.passwordHash);
}

/**
 * Register a new admin user in the database
 */
export async function registerAdmin(email: string, password: string): Promise<string> {
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'admin',
      displayName: email.split('@')[0],
    }
  });
  // Also create an Admin record
  await prisma.admin.create({
    data: {
      email,
    }
  });
  return user.id;
}

export function createAdminToken(userId: string, email: string): string {
  return createSessionToken(userId, email, 'admin');
}

export async function verifyAdmin(request: Request) {
  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1] || "";
  const session = await getCurrentUser(token);
  if (!session || !isAdmin(session.role)) {
    throw new AccessError(403, "Sign in as Administrator to manage reader settings.");
  }
  return async (action: string, resourceId: string) => {
    await prisma.auditLog.create({
      data: { actorUid: session.userId, actorEmail: session.email, action, resourceId },
    });
  };
}

export async function verifyReaderToken(token: string) {
  if (!await getCurrentUser(token)) {
    throw new AccessError(401, "Sign in to start the reader assistant.");
  }
}
