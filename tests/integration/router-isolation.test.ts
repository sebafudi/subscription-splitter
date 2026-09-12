import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import breakMonthsRoutes from '../../src/server/routes/break-months'
import membersRoutes from '../../src/server/routes/members'
import pricesRoutes from '../../src/server/routes/prices'
import summaryRoutes from '../../src/server/routes/summary'

/**
 * Each router is asked on its own, with nothing else mounted, so the 401 can
 * only have come from its own `requireSession` registration.
 *
 * The per-route cases in the other files go through `SELF`, which is the
 * composed app: every router there is mounted at `'/'` and several of them own
 * `/api/subscriptions/*`, so Hono answers from whichever registration survives
 * and those cases stay green even when a module loses its own line. They pin
 * the contract a caller sees. This file pins the property the plan actually
 * wanted, which is that no module depends on a neighbour for its session
 * check, and it fails the moment one does.
 */
const routers = [
  { name: 'members', router: membersRoutes, url: 'http://example.com/api/subscriptions/any/members' },
  { name: 'prices', router: pricesRoutes, url: 'http://example.com/api/subscriptions/any/prices' },
  { name: 'break-months', router: breakMonthsRoutes, url: 'http://example.com/api/subscriptions/any/break-months' },
  { name: 'summary', router: summaryRoutes, url: 'http://example.com/api/subscriptions/any/summary' },
]

describe('each new router carries its own session middleware', () => {
  it.each(routers)('$name answers 401 on its own, with no other router mounted', async ({ router, url }) => {
    const res = await router.fetch(new Request(url), env)
    expect(res.status).toBe(401)
  })

  it.each(routers)('$name answers 401 on its own for a write as well as a read', async ({ router, url }) => {
    const res = await router.fetch(
      new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }),
      env,
    )
    expect(res.status).toBe(401)
  })
})
