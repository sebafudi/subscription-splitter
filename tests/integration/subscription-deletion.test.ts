import { SELF, env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { deletionStatements } from '../../src/server/db/subscriptions'
import { signedInCookie as signedInCookieWithPrefix } from './accounts'

/** This file's slice of the rate limiter's client-address space; see `accounts.ts`. */
function signedInCookie(testId: string, email: string): Promise<string> {
  return signedInCookieWithPrefix('10.9.0', testId, email)
}

const base = 'http://example.com/api/subscriptions'

function jsonHeaders(cookie: string): Record<string, string> {
  return { 'content-type': 'application/json', cookie }
}

async function send(cookie: string, path: string, body: unknown, expected: number): Promise<Response> {
  const res = await SELF.fetch(`http://example.com${path}`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify(body),
  })
  expect(res.status, await res.clone().text()).toBe(expected)
  return res
}

type Ledger = { id: string; breakMonth: string }

/**
 * One subscription carrying at least one row of every child kind the deletion
 * has to reach: the owner and a participant, their active ranges, a price, a
 * skipped month, a payment, a standing order and one month marked on it.
 */
async function createLedger(cookie: string, name: string): Promise<Ledger> {
  const createRes = await send(cookie, '/api/subscriptions', {
    name,
    currency: 'PLN',
    locale: 'pl-PL',
    time_zone: 'Europe/Warsaw',
    start_month: '2026-01',
  }, 201)
  const { id } = await createRes.json<{ id: string }>()

  const memberRes = await send(cookie, `/api/subscriptions/${id}/members`, {
    name: 'Ada',
    active_ranges: [{ joined_month: '2026-01' }],
  }, 201)
  const member = await memberRes.json<{ id: string }>()

  await send(cookie, `/api/subscriptions/${id}/prices`, { effective_from: '2026-01', amount: 4999 }, 201)
  await send(cookie, `/api/subscriptions/${id}/break-months`, { month: '2026-02' }, 201)
  await send(cookie, `/api/subscriptions/${id}/payments`, { member_id: member.id, date: '2026-01-15', amount: 2500 }, 201)

  const scheduleRes = await send(cookie, `/api/subscriptions/${id}/schedules`, {
    member_id: member.id,
    amount: 2500,
    start_month: '2026-01',
  }, 201)
  const schedule = await scheduleRes.json<{ id: string }>()

  const exceptionRes = await SELF.fetch(
    `${base}/${id}/schedules/${schedule.id}/exceptions/2026-03`,
    { method: 'PUT', headers: jsonHeaders(cookie) },
  )
  expect(exceptionRes.status).toBe(204)

  return { id, breakMonth: '2026-02' }
}

type Counts = Record<string, number>

/** One row count per table the deletion touches, all eight reached by ownership. */
async function countsFor(id: string): Promise<Counts> {
  const row = await env.DB.prepare(
    `select
       (select count(*) from subscriptions where id = ?1) as subscriptions,
       (select count(*) from members where subscription_id = ?1) as members,
       (select count(*) from active_ranges ar join members m on m.id = ar.member_id
         where m.subscription_id = ?1) as active_ranges,
       (select count(*) from price_history where subscription_id = ?1) as price_history,
       (select count(*) from break_months where subscription_id = ?1) as break_months,
       (select count(*) from payments p join members m on m.id = p.member_id
         where m.subscription_id = ?1) as payments,
       (select count(*) from recurring_schedules r join members m on m.id = r.member_id
         where m.subscription_id = ?1) as recurring_schedules,
       (select count(*) from recurring_exceptions e
          join recurring_schedules r on r.id = e.schedule_id
          join members m on m.id = r.member_id
         where m.subscription_id = ?1) as recurring_exceptions`,
  )
    .bind(id)
    .first<Counts>()
  return row!
}

const EMPTY: Counts = {
  subscriptions: 0,
  members: 0,
  active_ranges: 0,
  price_history: 0,
  break_months: 0,
  payments: 0,
  recurring_schedules: 0,
  recurring_exceptions: 0,
}

async function userIdFor(cookie: string): Promise<string> {
  const res = await SELF.fetch('http://example.com/api/me', { headers: { cookie } })
  const body = await res.json<{ user: { id: string } }>()
  return body.user.id
}

describe('deleting a subscription with its whole ledger', () => {
  it('removes every row of every child kind and answers 204', async () => {
    const cookie = await signedInCookie('1', 'delete-full-ledger@example.com')
    const ledger = await createLedger(cookie, 'Disposable plan')

    const before = await countsFor(ledger.id)
    for (const [table, count] of Object.entries(before)) {
      expect(count, `expected a row in ${table} before the delete`).toBeGreaterThan(0)
    }

    const res = await SELF.fetch(`${base}/${ledger.id}`, { method: 'DELETE', headers: { cookie } })
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')

    expect(await countsFor(ledger.id)).toEqual(EMPTY)
  })

  it('leaves another account and the same account second subscription entirely alone', async () => {
    const cookie = await signedInCookie('2', 'delete-preserves-mine@example.com')
    const otherCookie = await signedInCookie('3', 'delete-preserves-theirs@example.com')

    const target = await createLedger(cookie, 'Going away')
    const sibling = await createLedger(cookie, 'Staying put')
    const foreign = await createLedger(otherCookie, 'Someone else plan')

    const siblingBefore = await countsFor(sibling.id)
    const foreignBefore = await countsFor(foreign.id)

    const res = await SELF.fetch(`${base}/${target.id}`, { method: 'DELETE', headers: { cookie } })
    expect(res.status).toBe(204)

    expect(await countsFor(target.id)).toEqual(EMPTY)
    expect(await countsFor(sibling.id)).toEqual(siblingBefore)
    expect(await countsFor(foreign.id)).toEqual(foreignBefore)
  })

  it('answers 404 and deletes nothing for a foreign id, an unknown id and a second delete of the same id', async () => {
    const cookie = await signedInCookie('4', 'delete-404-mine@example.com')
    const otherCookie = await signedInCookie('5', 'delete-404-theirs@example.com')

    const foreign = await createLedger(otherCookie, 'Not yours')
    const foreignBefore = await countsFor(foreign.id)

    const fromWrongAccount = await SELF.fetch(`${base}/${foreign.id}`, { method: 'DELETE', headers: { cookie } })
    expect(fromWrongAccount.status).toBe(404)
    expect(await countsFor(foreign.id)).toEqual(foreignBefore)

    const unknown = await SELF.fetch(`${base}/does-not-exist`, { method: 'DELETE', headers: { cookie } })
    expect(unknown.status).toBe(404)

    const mine = await createLedger(cookie, 'Deleted twice')
    const first = await SELF.fetch(`${base}/${mine.id}`, { method: 'DELETE', headers: { cookie } })
    expect(first.status).toBe(204)
    const second = await SELF.fetch(`${base}/${mine.id}`, { method: 'DELETE', headers: { cookie } })
    expect(second.status).toBe(404)
  })

  /**
   * The deletion is one `db.batch`, so either all eight statements land or none
   * does. Proving the second half needs a batch that fails, and the failure has
   * to come from a row the eight statements do not remove - otherwise statement
   * seven deletes the row the ninth would have collided with and the batch
   * commits after all.
   *
   * The duplicated row is the `break_months` row of the account's *second*
   * subscription. Every statement here is scoped to the first subscription, so
   * that row survives the batch and the appended insert really does collide
   * with the composite primary key on `(subscription_id, month)`. The appended
   * statement is a probe of the platform's atomicity, not a path any route
   * takes: nothing in `src/server/` ever inserts a break month that already
   * exists.
   */
  it('rolls the whole ledger back when any statement in the batch fails', async () => {
    const cookie = await signedInCookie('6', 'delete-atomicity@example.com')
    const target = await createLedger(cookie, 'Survives a failed batch')
    const sibling = await createLedger(cookie, 'Holds the duplicated row')
    const userId = await userIdFor(cookie)

    const before = await countsFor(target.id)
    const siblingBefore = await countsFor(sibling.id)
    // Without this the fixture could go empty and the rollback assertion below
    // would compare all-zero to all-zero while proving nothing.
    for (const [table, count] of Object.entries(before)) {
      expect(count, `expected a row in ${table} before the failed batch`).toBeGreaterThan(0)
    }

    await expect(
      env.DB.batch([
        ...deletionStatements(env.DB, target.id, userId),
        env.DB
          .prepare('insert into break_months (subscription_id, month) values (?, ?)')
          .bind(sibling.id, sibling.breakMonth),
      ]),
    ).rejects.toThrow()

    expect(await countsFor(target.id)).toEqual(before)
    expect(await countsFor(sibling.id)).toEqual(siblingBefore)
  })
})
