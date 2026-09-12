import { Hono } from 'hono'
import authRoutes from './routes/auth'
import subscriptionsRoutes from './routes/subscriptions'
import membersRoutes from './routes/members'
import pricesRoutes from './routes/prices'
import breakMonthsRoutes from './routes/break-months'
import summaryRoutes from './routes/summary'
import devSeedRoutes from './routes/dev-seed'

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/', authRoutes)
app.route('/', subscriptionsRoutes)
app.route('/', membersRoutes)
app.route('/', pricesRoutes)
app.route('/', breakMonthsRoutes)
app.route('/', summaryRoutes)
app.route('/', devSeedRoutes)

// Any other /api/* path is a JSON 404 rather than falling through to the
// client shell. Non-API paths continue to be served by the assets binding.
app.notFound((c) => {
  if (new URL(c.req.url).pathname.startsWith('/api/')) {
    return c.json({ error: 'not found' }, 404)
  }
  return c.text('not found', 404)
})

export default app
