import { Hono } from 'hono'
import { APIError } from 'better-auth/api'
import { createAuth } from '../auth'
import { isSeedRequestAllowed } from '../seed-gate'
import { seedRequestSchema } from '../validation/dev-seed'

const app = new Hono<{ Bindings: Env }>()

/**
 * Registered unconditionally: in this runtime bindings and variables exist
 * only inside a request, so a route cannot be mounted conditionally on an
 * environment variable's value. Both gates are evaluated inside the handler,
 * and both failures answer 404, so the response is never an oracle for
 * either the route's existence or the token's correctness (decision D-005).
 */
app.post('/api/dev/seed', async (c) => {
  const providedToken = c.req.header('x-seed-token') ?? null
  if (!isSeedRequestAllowed(c.env.SEED_ENABLED, c.env.SEED_TOKEN, providedToken)) {
    return c.json({ error: 'not found' }, 404)
  }

  const body = await c.req.json().catch(() => null)
  const parsed = seedRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'invalid body', field: parsed.error.issues[0]?.path.join('.') }, 400)
  }

  const seedingAuth = createAuth(c.env, new URL(c.req.url).origin, { disableSignUp: false })

  try {
    const result = await seedingAuth.api.signUpEmail({
      body: { email: parsed.data.email, password: parsed.data.password, name: parsed.data.name },
    })
    return c.json({ email: result.user.email, created: true })
  } catch (error) {
    if (error instanceof APIError && error.status === 'UNPROCESSABLE_ENTITY') {
      return c.json({ email: parsed.data.email, created: false })
    }
    throw error
  }
})

export default app
