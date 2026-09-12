import { Hono } from 'hono'
import { requireSession, type SessionVariables } from '../middleware/require-session'
import { validateActiveRanges } from '../../domain/members'
import type { ActiveRange } from '../../domain/types'
import { create, get, list, remove, update } from '../db/members'
import { get as getSubscription } from '../db/subscriptions'
import { createMemberSchema, patchMemberSchema } from '../validation/members'

const app = new Hono<{ Bindings: Env; Variables: SessionVariables }>()

// Routers are mounted at '/' and own their absolute paths, so middleware does
// not cascade from another router. A module that leaves this out ships
// unauthenticated while every test that sends a cookie still passes.
app.use('/api/subscriptions/*', requireSession)

type RangeInput = { joined_month: string; left_month: string | null }

function toDomainRanges(ranges: RangeInput[]): ActiveRange[] {
  return ranges.map((range) => ({ joinedMonth: range.joined_month, leftMonth: range.left_month }))
}

/**
 * A second owner arrives as a thrown unique-constraint error from the partial
 * index rather than as a return value. Letting it escape would be a 500 that
 * reads like a server fault instead of a refused write.
 */
function isDuplicateOwner(error: unknown): boolean {
  return error instanceof Error && /unique constraint failed: members\.subscription_id/i.test(error.message)
}

const DUPLICATE_OWNER = 'this subscription already has an owner member'

app.get('/api/subscriptions/:id/members', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)

  return c.json(await list(c.env.DB, subscriptionId, user.id))
})

app.post('/api/subscriptions/:id/members', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')

  const body = await c.req.json().catch(() => null)
  const parsed = createMemberSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid body', field: parsed.error.issues[0]?.path.join('.') },
      400,
    )
  }

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)

  const violation = validateActiveRanges(toDomainRanges(parsed.data.active_ranges), subscription.startMonth)
  if (violation) return c.json({ error: violation, field: 'active_ranges' }, 400)

  try {
    const created = await create(c.env.DB, subscriptionId, user.id, parsed.data)
    if (!created) return c.json({ error: 'not found' }, 404)
    return c.json(created, 201)
  } catch (error) {
    if (isDuplicateOwner(error)) return c.json({ error: DUPLICATE_OWNER, field: 'is_owner' }, 409)
    throw error
  }
})

app.get('/api/subscriptions/:id/members/:memberId', async (c) => {
  const user = c.get('sessionUser')
  const member = await get(c.env.DB, c.req.param('id'), c.req.param('memberId'), user.id)
  if (!member) return c.json({ error: 'not found' }, 404)
  return c.json(member)
})

app.patch('/api/subscriptions/:id/members/:memberId', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')
  const memberId = c.req.param('memberId')

  const body = await c.req.json().catch(() => null)
  const parsed = patchMemberSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid body', field: parsed.error.issues[0]?.path.join('.') },
      400,
    )
  }

  if (parsed.data.active_ranges) {
    const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
    if (!subscription) return c.json({ error: 'not found' }, 404)

    const violation = validateActiveRanges(toDomainRanges(parsed.data.active_ranges), subscription.startMonth)
    if (violation) return c.json({ error: violation, field: 'active_ranges' }, 400)
  }

  const updated = await update(c.env.DB, subscriptionId, memberId, user.id, parsed.data)
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

app.delete('/api/subscriptions/:id/members/:memberId', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')
  const memberId = c.req.param('memberId')

  const member = await get(c.env.DB, subscriptionId, memberId, user.id)
  if (!member) return c.json({ error: 'not found' }, 404)

  if (member.isOwner) {
    return c.json({ error: 'the owner member cannot be deleted; every subscription keeps exactly one' }, 409)
  }

  // The dependents refusal lives inside `remove`, so it cannot be skipped by a
  // path that forgets to ask; this maps its answer to a status code.
  const outcome = await remove(c.env.DB, subscriptionId, memberId, user.id)
  if (outcome === 'has-dependents') {
    return c.json({ error: 'this member has records attached and is archived rather than deleted' }, 409)
  }
  if (outcome === 'not-found') return c.json({ error: 'not found' }, 404)
  return c.body(null, 204)
})

export default app
