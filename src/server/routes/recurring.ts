import { Hono } from 'hono'
import { requireSession, type SessionVariables } from '../middleware/require-session'
import { findScheduleOverlap, isMonthInSchedule } from '../../domain/recurring'
import type { MonthStr, RecurringSchedule } from '../../domain/types'
import { get as getMember } from '../db/members'
import {
  addException,
  create,
  get,
  list,
  listForMember,
  remove,
  removeException,
  update,
} from '../db/recurring'
import { get as getSubscription } from '../db/subscriptions'
import { monthValue } from '../validation/prices'
import { createScheduleSchema, patchScheduleSchema } from '../validation/recurring'

const app = new Hono<{ Bindings: Env; Variables: SessionVariables }>()

// Routers are mounted at '/' and own their absolute paths, so middleware does
// not cascade from another router. A module that leaves this out ships
// unauthenticated while every test that sends a cookie still passes.
app.use('/api/subscriptions/*', requireSession)

const OWNER_REFUSAL = 'the owner member is never paid from, so a standing order cannot name them'

function badRequest(message: string, field: string) {
  return { error: message, field } as const
}

function overlapRefusal(conflict: RecurringSchedule) {
  return {
    error:
      'two standing orders for one participant may not cover the same month, and two that touch are an overlap rather than a continuation',
    conflict: { id: conflict.id, startMonth: conflict.startMonth, endMonth: conflict.endMonth },
  }
}

app.get('/api/subscriptions/:id/schedules', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)

  return c.json(await list(c.env.DB, subscriptionId, user.id))
})

app.post('/api/subscriptions/:id/schedules', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')

  const body = await c.req.json().catch(() => null)
  const parsed = createScheduleSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid body', field: parsed.error.issues[0]?.path.join('.') },
      400,
    )
  }

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)

  if (parsed.data.start_month < subscription.startMonth) {
    return c.json(badRequest('start_month must not precede the subscription start month', 'start_month'), 400)
  }

  const member = await getMember(c.env.DB, subscriptionId, parsed.data.member_id, user.id)
  if (!member) return c.json({ error: 'not found' }, 404)
  if (member.isOwner) return c.json(badRequest(OWNER_REFUSAL, 'member_id'), 400)

  const existing = await listForMember(c.env.DB, subscriptionId, parsed.data.member_id, user.id)
  const conflict = findScheduleOverlap(existing, {
    id: null,
    memberId: parsed.data.member_id,
    startMonth: parsed.data.start_month,
    endMonth: parsed.data.end_month,
  })
  if (conflict) return c.json(overlapRefusal(conflict), 409)

  const created = await create(c.env.DB, subscriptionId, user.id, parsed.data)
  if (!created) return c.json({ error: 'not found' }, 404)
  return c.json(created, 201)
})

app.get('/api/subscriptions/:id/schedules/:scheduleId', async (c) => {
  const user = c.get('sessionUser')

  const schedule = await get(c.env.DB, c.req.param('id'), c.req.param('scheduleId'), user.id)
  if (!schedule) return c.json({ error: 'not found' }, 404)
  return c.json(schedule)
})

/**
 * Every rule runs against the merged row rather than against the patch body,
 * so an edit is judged on its result. Two of them turn on that: the overlap is
 * read for the member the arrangement ends up on, or a move onto an occupied
 * participant would double-count their months, and the owner refusal re-runs,
 * or the rule could be walked around by creating and then patching.
 */
app.patch('/api/subscriptions/:id/schedules/:scheduleId', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')
  const scheduleId = c.req.param('scheduleId')

  const body = await c.req.json().catch(() => null)
  const parsed = patchScheduleSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid body', field: parsed.error.issues[0]?.path.join('.') },
      400,
    )
  }

  const stored = await get(c.env.DB, subscriptionId, scheduleId, user.id)
  if (!stored) return c.json({ error: 'not found' }, 404)

  const merged = {
    id: stored.id,
    memberId: parsed.data.member_id ?? stored.memberId,
    amount: parsed.data.amount ?? stored.amount,
    startMonth: parsed.data.start_month ?? stored.startMonth,
    endMonth: parsed.data.end_month !== undefined ? parsed.data.end_month : stored.endMonth,
  }

  if (merged.endMonth !== null && merged.endMonth < merged.startMonth) {
    return c.json(badRequest('end_month must not precede start_month', 'end_month'), 400)
  }

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)
  if (merged.startMonth < subscription.startMonth) {
    return c.json(badRequest('start_month must not precede the subscription start month', 'start_month'), 400)
  }

  const member = await getMember(c.env.DB, subscriptionId, merged.memberId, user.id)
  if (!member) return c.json({ error: 'not found' }, 404)
  if (member.isOwner) return c.json(badRequest(OWNER_REFUSAL, 'member_id'), 400)

  const existing = await listForMember(c.env.DB, subscriptionId, merged.memberId, user.id)
  const conflict = findScheduleOverlap(existing, {
    id: merged.id,
    memberId: merged.memberId,
    startMonth: merged.startMonth,
    endMonth: merged.endMonth,
  })
  if (conflict) return c.json(overlapRefusal(conflict), 409)

  const updated = await update(c.env.DB, subscriptionId, scheduleId, user.id, parsed.data)
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

app.delete('/api/subscriptions/:id/schedules/:scheduleId', async (c) => {
  const user = c.get('sessionUser')

  const deleted = await remove(c.env.DB, c.req.param('id'), c.req.param('scheduleId'), user.id)
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.body(null, 204)
})

type ToggleTarget =
  | { ok: true; month: MonthStr }
  | { ok: false; status: 400; body: { error: string; field: string } }
  | { ok: false; status: 404; body: { error: string } }

/**
 * What both ends of the unpaid toggle have to establish before they write: the
 * month is a real month, the arrangement exists and belongs to the caller, and
 * the month falls inside the arrangement's own range. A month in a path
 * parameter goes through the same schema as one in a body, so a malformed
 * month is a 400 rather than a write that silently matches nothing.
 */
async function toggleTarget(
  db: D1Database,
  subscriptionId: string,
  scheduleId: string,
  userId: string,
  rawMonth: string,
): Promise<ToggleTarget> {
  const month = monthValue.safeParse(rawMonth)
  if (!month.success) {
    return { ok: false, status: 400, body: badRequest(month.error.issues[0]?.message ?? 'invalid month', 'month') }
  }

  const schedule = await get(db, subscriptionId, scheduleId, userId)
  if (!schedule) return { ok: false, status: 404, body: { error: 'not found' } }

  if (!isMonthInSchedule(schedule, month.data)) {
    return {
      ok: false,
      status: 400,
      body: badRequest('month must fall inside the range of the arrangement', 'month'),
    }
  }

  return { ok: true, month: month.data }
}

/**
 * Both ends answer 204 whichever state they leave the month in: each is one end
 * of a toggle, and an organizer clicking twice has not made an error.
 */
app.put('/api/subscriptions/:id/schedules/:scheduleId/exceptions/:month', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')
  const scheduleId = c.req.param('scheduleId')

  const target = await toggleTarget(c.env.DB, subscriptionId, scheduleId, user.id, c.req.param('month'))
  if (!target.ok) return c.json(target.body, target.status)

  await addException(c.env.DB, subscriptionId, scheduleId, user.id, target.month)
  return c.body(null, 204)
})

app.delete('/api/subscriptions/:id/schedules/:scheduleId/exceptions/:month', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')
  const scheduleId = c.req.param('scheduleId')

  const target = await toggleTarget(c.env.DB, subscriptionId, scheduleId, user.id, c.req.param('month'))
  if (!target.ok) return c.json(target.body, target.status)

  await removeException(c.env.DB, subscriptionId, scheduleId, user.id, target.month)
  return c.body(null, 204)
})

export default app
