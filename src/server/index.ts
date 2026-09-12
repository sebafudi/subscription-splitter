import { Hono } from 'hono'
import authRoutes from './routes/auth'

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/', authRoutes)

export default app
