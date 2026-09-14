/**
 * Creates one participant and then removes its `active_ranges` rows directly in
 * the local D1, which is the only way to reach the empty-membership state: the
 * members route refuses a member with no range (`plan.md` Phase 5).
 * Local disposable database and synthetic data only.
 */
import { readFileSync } from 'node:fs'
import { parseDevVars } from '../../../scripts/seed-local.mjs'

const base = 'http://localhost:5173'
const vars = parseDevVars(readFileSync('.dev.vars', 'utf8'))
let cookie = ''

async function call(path, init = {}) {
  const headers = { origin: base, ...(init.headers || {}) }
  if (init.body) headers['content-type'] = 'application/json'
  if (cookie) headers.cookie = cookie
  const res = await fetch(base + path, { ...init, headers })
  const set = res.headers.getSetCookie?.() ?? []
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ')
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

await call('/api/auth/sign-in/email', {
  method: 'POST',
  body: JSON.stringify({ email: 's09-calendar@example.invalid', password: 'S09-calendar-fixture-pw' }),
})
const long = (await call('/api/subscriptions')).find((s) => s.name === 'S09 LONG eight years')
const gil = await call(`/api/subscriptions/${long.id}/members`, {
  method: 'POST',
  body: JSON.stringify({ name: 'Gil', active_ranges: [{ joined_month: '2026-01', left_month: null }] }),
})
console.log(JSON.stringify({ subscription: long.id, memberId: gil.id }))
