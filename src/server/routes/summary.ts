import { Hono } from 'hono'
import { requireSession, type SessionVariables } from '../middleware/require-session'
import { computeSummary } from '../../domain/calc'
import { currentMonth } from '../../domain/months'
import { loadState } from '../db/subscription-state'

const app = new Hono<{ Bindings: Env; Variables: SessionVariables }>()

// Routers are mounted at '/' and own their absolute paths, so middleware does
// not cascade from another router.
app.use('/api/subscriptions/*', requireSession)

/**
 * The one place that asks what month it is, and it asks in the subscription's
 * own time zone rather than the machine's. Everything else in the calculation
 * takes the answer as an argument.
 */
app.get('/api/subscriptions/:id/summary', async (c) => {
  const user = c.get('sessionUser')

  const state = await loadState(c.env.DB, c.req.param('id'), user.id)
  if (!state) return c.json({ error: 'not found' }, 404)

  if (!state.members.some((member) => member.isOwner)) {
    return c.json(
      {
        error:
          'this subscription has no owner member, so it has no defined per-person share. Add one through its members route.',
      },
      409,
    )
  }

  return c.json(computeSummary(state, currentMonth(state.settings.timeZone)))
})

export default app
