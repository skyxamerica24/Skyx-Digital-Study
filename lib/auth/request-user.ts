import { verifySessionToken } from '../db/auth'

/**
 * Authenticate a user from a NextRequest cookie (for API routes).
 * Returns null if not authenticated.
 *
 * Lives outside any 'use server' module: it is a synchronous helper, and
 * Next.js requires every export of a 'use server' file to be async.
 */
export function getUserFromRequestCookie(req: { headers: { get: (name: string) => string | null } }) {
  try {
    const cookieHeader = req.headers.get('cookie');
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';').map(c => c.trim());
    let sessionToken: string | undefined;
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.split('=');
      if (name.trim() === 'skyx-session') {
        sessionToken = rest.join('=').trim();
        break;
      }
    }
    if (!sessionToken) return null;
    const decoded = verifySessionToken(sessionToken);
    return decoded;
  } catch {
    return null;
  }
}
