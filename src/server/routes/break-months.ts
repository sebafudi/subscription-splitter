import { Hono } from 'hono'
import { requireSession, type SessionVariables } from '../middleware/require-session'
import { create, list, remove } from '../db/break-months'
import { get as getSubscription } from '../db/subscriptions'
import { createBreakMonthSchema, monthValue } from '../validation/prices'

const app = new Hono<{ Bindings: Env; Variables: SessionVariables }>()

// Routers are mounted at '/' and own their absolute paths, so middleware does
// not cascade from another router.
app.use('/api/subscriptions/*', requireSession)

app.get('/api/subscriptions/:id/break-months', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)

  return c.json(await list(c.env.DB, subscriptionId, user.id))
})

/** Idempotent: marking an already-skipped month as skipped is not an error, so it answers 201 either way. */
app.post('/api/subscriptions/:id/break-months', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')

  const body = await c.req.json().catch(() => null)
  const parsed = createBreakMonthSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid body', field: parsed.error.issues[0]?.path.join('.') },
      400,
    )
  }

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)

  if (parsed.data.month < subscription.startMonth) {
    return c.json({ error: 'month must not precede the subscription start month', field: 'month' }, 400)
  }

  const stored = await create(c.env.DB, subscriptionId, user.id, parsed.data.month)
  if (!stored) return c.json({ error: 'not found' }, 404)
  return c.json({ month: parsed.data.month }, 201)
})

app.delete('/api/subscriptions/:id/break-months/:month', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')

  // A month arrives here in the path rather than in a body, so it passes the
  // same rule before it reaches SQL.
  const month = monthValue.safeParse(c.req.param('month'))
  if (!month.success) {
    return c.json({ error: month.error.issues[0]?.message ?? 'invalid month', field: 'month' }, 400)
  }

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)

  const deleted = await remove(c.env.DB, subscriptionId, month.data, user.id)
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.body(null, 204)
})

export default app
