/**
 * Builds the two synthetic calendar fixtures through the app's own HTTP routes.
 * Synthetic names and amounts only; never a remote D1 and never a real ledger.
 *
 * SHORT and LONG hold byte-identical records inside the selected year 2026 and
 * the same lifetime completeness state (each starts two months before its first
 * price entry), so the Phase 5 compactness identity is a property of the
 * fixtures by construction and the only variable left is depth of history:
 * LONG carries 2019-2025, SHORT only November and December 2025.
 */
import { readFileSync } from 'node:fs'
import { parseDevVars } from '../../../scripts/seed-local.mjs'

const base = process.env.BASE_URL || 'http://localhost:5173'
const vars = parseDevVars(readFileSync('.dev.vars', 'utf8'))
const account = { email: 's09-calendar@example.invalid', password: 'S09-calendar-fixture-pw', name: 'S09 fixture' }

let cookie = ''

async function call(path, init = {}) {
  const headers = { ...(init.headers || {}) }
  if (init.body) headers['content-type'] = 'application/json'
  headers.origin = base
  if (cookie) headers.cookie = cookie
  const res = await fetch(base + path, { ...init, headers })
  const set = res.headers.getSetCookie?.() ?? []
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ')
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${text}`)
  return body
}

const member = (subscription, name, ranges) =>
  call(`/api/subscriptions/${subscription}/members`, {
    method: 'POST',
    body: JSON.stringify({ name, active_ranges: ranges }),
  })

const pay = (subscription, memberId, date, amount, note = '', kind = 'manual') =>
  call(`/api/subscriptions/${subscription}/payments`, {
    method: 'POST',
    body: JSON.stringify({ member_id: memberId, date, amount, note, kind }),
  })

const schedule = (subscription, memberId, amount, startMonth, endMonth) =>
  call(`/api/subscriptions/${subscription}/schedules`, {
    method: 'POST',
    body: JSON.stringify({ member_id: memberId, amount, start_month: startMonth, end_month: endMonth }),
  })

/** The records both fixtures share, all dated inside 2026 plus one 2027 receipt. */
async function sharedYear(id, people, adaSchedule2026) {
  await call(`/api/subscriptions/${id}/break-months`, { method: 'POST', body: JSON.stringify({ month: '2026-05' }) })
  await pay(id, people.Ada.id, '2026-03-03', 2500, 'first half')
  await pay(id, people.Ada.id, '2026-03-03', 2500)
  await pay(id, people.Bo.id, '2026-02-10', 1200)
  await pay(id, people.Dev.id, '2026-01-05', 12000, 'year in advance', 'annual')
  await pay(id, people.Bo.id, '2027-05-20', 1500, 'paid ahead')
  await call(`/api/subscriptions/${id}/schedules/${adaSchedule2026}/exceptions/2026-07`, { method: 'PUT' })
}

async function buildShort() {
  const sub = await call('/api/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      name: 'S09 SHORT recent history', currency: 'GBP', locale: 'en-GB',
      time_zone: 'Europe/London', start_month: '2025-11', owner_name: 'Owner',
    }),
  })
  const id = sub.id
  await call(`/api/subscriptions/${id}/prices`, { method: 'POST', body: JSON.stringify({ effective_from: '2026-01', amount: 1200 }) })
  const people = {
    Ada: await member(id, 'Ada', [{ joined_month: '2025-11', left_month: null }]),
    Bo: await member(id, 'Bo', [{ joined_month: '2025-11', left_month: null }]),
    Cleo: await member(id, 'Cleo', [{ joined_month: '2025-11', left_month: '2026-04' }, { joined_month: '2026-09', left_month: null }]),
    Dev: await member(id, 'Dev', [{ joined_month: '2025-11', left_month: null }]),
    Esi: await member(id, 'Esi', [{ joined_month: '2026-06', left_month: null }]),
    Fin: await member(id, 'Fin', [{ joined_month: '2025-11', left_month: '2026-03' }]),
  }
  const ada = await schedule(id, people.Ada.id, 400, '2026-01', null)
  await sharedYear(id, people, ada.id)
  return { id, name: sub.name }
}

async function buildLong() {
  const sub = await call('/api/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      name: 'S09 LONG eight years', currency: 'GBP', locale: 'en-GB',
      time_zone: 'Europe/London', start_month: '2019-01', owner_name: 'Owner',
    }),
  })
  const id = sub.id
  await call(`/api/subscriptions/${id}/prices`, { method: 'POST', body: JSON.stringify({ effective_from: '2019-03', amount: 1200 }) })
  const people = {
    Ada: await member(id, 'Ada', [{ joined_month: '2019-01', left_month: null }]),
    Bo: await member(id, 'Bo', [{ joined_month: '2019-01', left_month: null }]),
    Cleo: await member(id, 'Cleo', [{ joined_month: '2019-01', left_month: '2026-04' }, { joined_month: '2026-09', left_month: null }]),
    Dev: await member(id, 'Dev', [{ joined_month: '2019-01', left_month: null }]),
    Esi: await member(id, 'Esi', [{ joined_month: '2026-06', left_month: null }]),
    Fin: await member(id, 'Fin', [{ joined_month: '2019-01', left_month: '2026-03' }]),
  }
  const adaEarly = await schedule(id, people.Ada.id, 300, '2019-01', '2023-12')
  const ada = await schedule(id, people.Ada.id, 400, '2024-01', null)
  await call(`/api/subscriptions/${id}/break-months`, { method: 'POST', body: JSON.stringify({ month: '2021-05' }) })
  for (const year of [2019, 2020, 2021, 2022, 2023, 2024, 2025]) {
    await pay(id, people.Bo.id, `${year}-04-12`, 1200)
    await pay(id, people.Dev.id, `${year}-11-02`, 2400, 'two months')
  }
  await call(`/api/subscriptions/${id}/schedules/${adaEarly.id}/exceptions/2022-08`, { method: 'PUT' })
  await sharedYear(id, people, ada.id)
  return { id, name: sub.name }
}

async function main() {
  const seeded = await fetch(`${base}/api/dev/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-seed-token': vars.SEED_TOKEN },
    body: JSON.stringify(account),
  })
  console.error('seed', seeded.status, await seeded.text())
  await call('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email: account.email, password: account.password }) })
  for (const existing of await call('/api/subscriptions')) {
    if (existing.name.startsWith('S09 ')) await call(`/api/subscriptions/${existing.id}`, { method: 'DELETE' })
  }
  const short = await buildShort()
  const long = await buildLong()
  console.log(JSON.stringify({ account: account.email, short, long }, null, 2))
}

await main()
