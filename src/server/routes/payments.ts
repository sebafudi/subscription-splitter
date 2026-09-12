import { Hono } from 'hono'
import { requireSession, type SessionVariables } from '../middleware/require-session'
import { validatePaymentDate } from '../../domain/payments'
import { get as getMember } from '../db/members'
import { create, get, list, remove, update } from '../db/payments'
import { get as getSubscription } from '../db/subscriptions'
import { createPaymentSchema, patchPaymentSchema } from '../validation/payments'

const app = new Hono<{ Bindings: Env; Variables: SessionVariables }>()

// Routers are mounted at '/' and own their absolute paths, so middleware does
// not cascade from another router. A module that leaves this out ships
// unauthenticated while every test that sends a cookie still passes.
app.use('/api/subscriptions/*', requireSession)

const OWNER_REFUSAL = 'the owner member is never owed from, so money cannot be recorded against them'

function badRequest(message: string, field: string) {
  return { error: message, field } as const
}

app.get('/api/subscriptions/:id/payments', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)

  // Resolved through the subscription first, so a member id from elsewhere is
  // a 404 rather than an empty list that reads as "this participant paid nothing".
  const memberId = c.req.query('memberId')
  if (memberId !== undefined) {
    const member = await getMember(c.env.DB, subscriptionId, memberId, user.id)
    if (!member) return c.json({ error: 'not found' }, 404)
  }

  return c.json(await list(c.env.DB, subscriptionId, user.id, memberId))
})

app.post('/api/subscriptions/:id/payments', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')

  const body = await c.req.json().catch(() => null)
  const parsed = createPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid body', field: parsed.error.issues[0]?.path.join('.') },
      400,
    )
  }

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)

  const violation = validatePaymentDate(parsed.data.date, subscription.startMonth)
  if (violation) return c.json(badRequest(violation, 'date'), 400)

  const member = await getMember(c.env.DB, subscriptionId, parsed.data.member_id, user.id)
  if (!member) return c.json({ error: 'not found' }, 404)
  if (member.isOwner) return c.json(badRequest(OWNER_REFUSAL, 'member_id'), 400)

  const created = await create(c.env.DB, subscriptionId, user.id, parsed.data)
  if (!created) return c.json({ error: 'not found' }, 404)
  return c.json(created, 201)
})

app.get('/api/subscriptions/:id/payments/:paymentId', async (c) => {
  const user = c.get('sessionUser')

  const payment = await get(c.env.DB, c.req.param('id'), c.req.param('paymentId'), user.id)
  if (!payment) return c.json({ error: 'not found' }, 404)
  return c.json(payment)
})

app.patch('/api/subscriptions/:id/payments/:paymentId', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')
  const paymentId = c.req.param('paymentId')

  const body = await c.req.json().catch(() => null)
  const parsed = patchPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid body', field: parsed.error.issues[0]?.path.join('.') },
      400,
    )
  }

  if (parsed.data.date !== undefined) {
    const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
    if (!subscription) return c.json({ error: 'not found' }, 404)

    const violation = validatePaymentDate(parsed.data.date, subscription.startMonth)
    if (violation) return c.json(badRequest(violation, 'date'), 400)
  }

  if (parsed.data.member_id !== undefined) {
    const member = await getMember(c.env.DB, subscriptionId, parsed.data.member_id, user.id)
    if (!member) return c.json({ error: 'not found' }, 404)
    if (member.isOwner) return c.json(badRequest(OWNER_REFUSAL, 'member_id'), 400)
  }

  const updated = await update(c.env.DB, subscriptionId, paymentId, user.id, parsed.data)
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

app.delete('/api/subscriptions/:id/payments/:paymentId', async (c) => {
  const user = c.get('sessionUser')

  const deleted = await remove(c.env.DB, c.req.param('id'), c.req.param('paymentId'), user.id)
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.body(null, 204)
})

export default app
