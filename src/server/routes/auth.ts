import { Hono } from 'hono'
import { APIError } from 'better-auth/api'
import { createAuth } from '../auth'

const app = new Hono<{ Bindings: Env }>()

/**
 * Sign-in, sign-out and every other Better Auth endpoint are the library's
 * own mounted handler. Rate limiting, origin validation and CSRF live in the
 * router's request hook, which only this handler reaches; a thin wrapper
 * route calling `auth.api.*` directly would bypass all three.
 */
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  const auth = createAuth(c.env, new URL(c.req.url).origin)
  return auth.handler(c.req.raw)
})

/**
 * Read-only convenience so the client has one shape to read. Passes both
 * `headers` and `request` so the guards that apply to a direct `auth.api`
 * call can still run.
 */
app.get('/api/me', async (c) => {
  const auth = createAuth(c.env, new URL(c.req.url).origin)
  try {
    // asResponse must be forced false: the installed version defaults it to
    // true whenever `request` is passed (`isRequestLike(context?.request)` in
    // to-auth-endpoints.mjs), which would return a Response object here
    // instead of the parsed session data.
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
      request: c.req.raw,
      asResponse: false,
    })
    if (!session) {
      return c.json({ error: 'unauthorized' }, 401)
    }
    return c.json({ user: session.user })
  } catch (error) {
    if (error instanceof APIError) {
      return c.json({ error: error.message }, error.statusCode as 401)
    }
    throw error
  }
})

/**
 * The one thing the login screen needs before it has a session: whether this
 * deployment can offer Google at all. `/api/me` answers 401 signed out and
 * `/api/health` carries nothing, so neither can say it, and reading the 404
 * from the social call would only tell the user after they had clicked.
 *
 * The body is exactly one boolean. The client id never leaves the Worker, and
 * the answer reveals nothing the rendered login screen does not already show.
 */
app.get('/api/auth-config', (c) => {
  return c.json({ google: Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET) })
})

export default app
