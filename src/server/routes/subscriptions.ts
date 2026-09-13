import { Hono } from 'hono'
import { requireSession, type SessionVariables } from '../middleware/require-session'
import { create, get, list, remove, update } from '../db/subscriptions'
import { createSubscriptionSchema, patchSubscriptionSchema } from '../validation/subscriptions'

const app = new Hono<{ Bindings: Env; Variables: SessionVariables }>()

app.use('/api/subscriptions/*', requireSession)
app.use('/api/subscriptions', requireSession)

app.get('/api/subscriptions', async (c) => {
  const user = c.get('sessionUser')
  const rows = await list(c.env.DB, user.id)
  return c.json(rows)
})

app.post('/api/subscriptions', async (c) => {
  const user = c.get('sessionUser')
  const body = await c.req.json().catch(() => null)
  const parsed = createSubscriptionSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'invalid body', field: parsed.error.issues[0]?.path.join('.') }, 400)
  }
  const created = await create(c.env.DB, user.id, parsed.data)
  if (!created.ok) return c.json({ error: created.message, field: created.field }, 400)
  return c.json(created.subscription, 201)
})

app.get('/api/subscriptions/:id', async (c) => {
  const user = c.get('sessionUser')
  const row = await get(c.env.DB, c.req.param('id'), user.id)
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json(row)
})

app.patch('/api/subscriptions/:id', async (c) => {
  const user = c.get('sessionUser')
  const body = await c.req.json().catch(() => null)
  const parsed = patchSubscriptionSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'invalid body', field: parsed.error.issues[0]?.path.join('.') }, 400)
  }
  const result = await update(c.env.DB, c.req.param('id'), user.id, parsed.data)
  if (result.ok) return c.json(result.subscription)
  if (result.kind === 'not-found') return c.json({ error: 'not found' }, 404)
  return c.json({ error: result.message, field: result.field }, 400)
})

app.delete('/api/subscriptions/:id', async (c) => {
  const user = c.get('sessionUser')
  const deleted = await remove(c.env.DB, c.req.param('id'), user.id)
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.body(null, 204)
})

export default app
