import type { Context, Next } from 'hono'
import { createAuth } from '../auth'

type SessionUser = { id: string; email: string; name: string }
type SessionVariables = { sessionUser: SessionUser }

/** One place that decides whether a request has a session, so every protected route inherits the same answer. */
export async function requireSession(c: Context<{ Bindings: Env; Variables: SessionVariables }>, next: Next) {
  const auth = createAuth(c.env, new URL(c.req.url).origin)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  c.set('sessionUser', session.user)
  await next()
}

export type { SessionUser, SessionVariables }
