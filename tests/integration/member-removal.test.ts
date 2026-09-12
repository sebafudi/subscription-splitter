import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { seedUser } from './accounts'
import { remove as removeMember } from '../../src/server/db/members'
import { create as createPayment } from '../../src/server/db/payments'
import { create as createSchedule } from '../../src/server/db/recurring'

/**
 * The refusal is asked of the repository directly, with no route in front of
 * it. The integration cases in `payments.test.ts` and `recurring.test.ts` prove
 * the 409 a caller sees, and they would stay green if the guard moved back into
 * the route; this file pins the property the plan actually wanted, which is
 * that `remove` cannot cascade past a member's history however it is reached.
 *
 * Rows are inserted through the repositories rather than through the API, so
 * the fixture is the smallest thing that makes a member have dependents.
 */
/**
 * A real account row, because `subscriptions.user_id` carries a foreign key to
 * the auth table. Seeded through the shared helper rather than signed in,
 * since nothing here goes through a route and the sign-in rate limiter has no
 * reason to see this file at all.
 */
let userId = ''

beforeAll(async () => {
  const seeded = await seedUser('member-removal@example.com')
  userId = seeded.user.id
})

async function seedSubscriptionWithMember(suffix: string): Promise<{ subscriptionId: string; memberId: string }> {
  const subscriptionId = `sub-${suffix}`
  const memberId = `mem-${suffix}`

  await env.DB.batch([
    env.DB.prepare(
      `insert into subscriptions (id, user_id, name, currency, locale, time_zone, start_month, created_at)
       values (?, ?, 'Removal fixture', 'PLN', 'pl-PL', 'Europe/Warsaw', '2026-01', ?)`,
    ).bind(subscriptionId, userId, new Date().toISOString()),
    env.DB.prepare(
      `insert into members (id, subscription_id, name, is_owner, archived, created_at)
       values (?, ?, 'Alice', 0, 0, ?)`,
    ).bind(memberId, subscriptionId, new Date().toISOString()),
    env.DB.prepare(
      `insert into active_ranges (id, member_id, joined_month, left_month) values (?, ?, '2026-01', null)`,
    ).bind(`range-${suffix}`, memberId),
  ])

  return { subscriptionId, memberId }
}

async function memberCount(memberId: string): Promise<number> {
  const row = await env.DB.prepare('select count(*) as n from members where id = ?').bind(memberId).first<{ n: number }>()
  return row?.n ?? 0
}

describe('removing a member through the repository', () => {
  it('deletes one with no history', async () => {
    const { subscriptionId, memberId } = await seedSubscriptionWithMember('clean')

    expect(await removeMember(env.DB, subscriptionId, memberId, userId)).toBe('deleted')
    expect(await memberCount(memberId)).toBe(0)
  })

  it('refuses one with a recorded payment, and the member and the payment both survive', async () => {
    const { subscriptionId, memberId } = await seedSubscriptionWithMember('paid')
    const payment = await createPayment(env.DB, subscriptionId, userId, {
      member_id: memberId,
      date: '2026-01-15',
      amount: 2000,
      note: '',
      kind: 'manual',
    })
    expect(payment).not.toBeNull()

    expect(await removeMember(env.DB, subscriptionId, memberId, userId)).toBe('has-dependents')
    expect(await memberCount(memberId)).toBe(1)
    const rows = await env.DB.prepare('select count(*) as n from payments where member_id = ?')
      .bind(memberId)
      .first<{ n: number }>()
    expect(rows?.n).toBe(1)
  })

  it('refuses one with a standing order, and the arrangement survives', async () => {
    const { subscriptionId, memberId } = await seedSubscriptionWithMember('scheduled')
    const schedule = await createSchedule(env.DB, subscriptionId, userId, {
      member_id: memberId,
      amount: 1000,
      start_month: '2026-01',
      end_month: null,
    })
    expect(schedule).not.toBeNull()

    expect(await removeMember(env.DB, subscriptionId, memberId, userId)).toBe('has-dependents')
    expect(await memberCount(memberId)).toBe(1)
    const rows = await env.DB.prepare('select count(*) as n from recurring_schedules where member_id = ?')
      .bind(memberId)
      .first<{ n: number }>()
    expect(rows?.n).toBe(1)
  })

  it('answers not-found for a member reached through the wrong subscription', async () => {
    const { memberId } = await seedSubscriptionWithMember('wrong-parent')
    const other = await seedSubscriptionWithMember('other-parent')

    expect(await removeMember(env.DB, other.subscriptionId, memberId, userId)).toBe('not-found')
    expect(await memberCount(memberId)).toBe(1)
  })
})
