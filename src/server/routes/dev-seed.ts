import { Hono } from 'hono'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { isSeedRequestAllowed } from '../seed-gate'

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

  const body = await c.req.json<{ email: string; password: string; name: string }>()

  const seedingAuth = betterAuth({
    baseURL: new URL(c.req.url).origin,
    database: c.env.DB,
    emailAndPassword: { enabled: true, disableSignUp: false },
  })

  try {
    const result = await seedingAuth.api.signUpEmail({
      body: { email: body.email, password: body.password, name: body.name },
    })
    return c.json({ email: result.user.email, created: true })
  } catch (error) {
    if (error instanceof APIError && error.status === 'UNPROCESSABLE_ENTITY') {
      return c.json({ email: body.email, created: false })
    }
    throw error
  }
})

export default app
