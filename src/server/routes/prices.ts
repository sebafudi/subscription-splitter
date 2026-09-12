import { Hono } from 'hono'
import { requireSession, type SessionVariables } from '../middleware/require-session'
import { currentMonth } from '../../domain/months'
import { monthsLosingTheirPrice } from '../../domain/prices'
import { create, list, remove } from '../db/prices'
import { loadState } from '../db/subscription-state'
import { get as getSubscription } from '../db/subscriptions'
import { createPriceSchema } from '../validation/prices'

const app = new Hono<{ Bindings: Env; Variables: SessionVariables }>()

// Routers are mounted at '/' and own their absolute paths, so middleware does
// not cascade from another router.
app.use('/api/subscriptions/*', requireSession)

app.get('/api/subscriptions/:id/prices', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)

  return c.json(await list(c.env.DB, subscriptionId, user.id))
})

app.post('/api/subscriptions/:id/prices', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')

  const body = await c.req.json().catch(() => null)
  const parsed = createPriceSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid body', field: parsed.error.issues[0]?.path.join('.') },
      400,
    )
  }

  const subscription = await getSubscription(c.env.DB, subscriptionId, user.id)
  if (!subscription) return c.json({ error: 'not found' }, 404)

  if (parsed.data.effective_from < subscription.startMonth) {
    return c.json(
      { error: 'effective_from must not precede the subscription start month', field: 'effective_from' },
      400,
    )
  }

  try {
    const created = await create(c.env.DB, subscriptionId, user.id, parsed.data)
    if (!created) return c.json({ error: 'not found' }, 404)
    return c.json(created, 201)
  } catch (error) {
    if (error instanceof Error && /unique constraint failed: price_history/i.test(error.message)) {
      return c.json(
        { error: 'this subscription already has a price entry for that month', field: 'effective_from' },
        409,
      )
    }
    throw error
  }
})

/**
 * Deleting the earliest entry rewrites every month it covered to cost nothing,
 * which moves the plan total, the organizer's net cost and every balance with
 * no trace. The refusal names those months so the caller can see what they
 * would lose, and `?confirm=true` is how they say they meant it.
 */
app.delete('/api/subscriptions/:id/prices/:priceId', async (c) => {
  const user = c.get('sessionUser')
  const subscriptionId = c.req.param('id')
  const priceId = c.req.param('priceId')

  const state = await loadState(c.env.DB, subscriptionId, user.id)
  if (!state) return c.json({ error: 'not found' }, 404)
  if (!state.priceHistory.some((entry) => entry.id === priceId)) return c.json({ error: 'not found' }, 404)

  if (c.req.query('confirm') !== 'true') {
    const months = monthsLosingTheirPrice(state, priceId, currentMonth(state.settings.timeZone))
    if (months.length > 0) {
      return c.json(
        {
          error: `deleting this entry leaves ${months.length} month(s) with no price: ${months.join(', ')}. Repeat the request with confirm=true to go ahead.`,
          months,
        },
        409,
      )
    }
  }

  const deleted = await remove(c.env.DB, subscriptionId, priceId, user.id)
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.body(null, 204)
})

export default app
