import type { CreateSubscriptionInput, PatchSubscriptionInput } from '../validation/subscriptions'

export type Subscription = {
  id: string
  userId: string
  name: string
  currency: string
  locale: string
  timeZone: string
  startMonth: string
  createdAt: string
}

type SubscriptionRow = {
  id: string
  user_id: string
  name: string
  currency: string
  locale: string
  time_zone: string
  start_month: string
  created_at: string
}

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    currency: row.currency,
    locale: row.locale,
    timeZone: row.time_zone,
    startMonth: row.start_month,
    createdAt: row.created_at,
  }
}

/** The only place that writes SQL for this resource, and the single enforcement point for ownership. */
export async function list(db: D1Database, userId: string): Promise<Subscription[]> {
  const result = await db
    .prepare('select * from subscriptions where user_id = ? order by created_at asc')
    .bind(userId)
    .all<SubscriptionRow>()
  return result.results.map(toSubscription)
}

export async function create(
  db: D1Database,
  userId: string,
  input: CreateSubscriptionInput,
): Promise<Subscription> {
  const id = crypto.randomUUID()
  const ownerId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  // One atomic unit: a subscription that exists without an owner member has no
  // defined per-person share, so there is no window in which one can be read
  // (decision D-006). The owner's opening range starts at the first month and
  // stays open, which is also why that month can no longer be patched.
  await db.batch([
    db
      .prepare(
        `insert into subscriptions (id, user_id, name, currency, locale, time_zone, start_month, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, userId, input.name, input.currency, input.locale, input.time_zone, input.start_month, createdAt),
    db
      .prepare(
        `insert into members (id, subscription_id, name, is_owner, archived, created_at)
         values (?, ?, ?, 1, 0, ?)`,
      )
      .bind(ownerId, id, input.owner_name, createdAt),
    db
      .prepare('insert into active_ranges (id, member_id, joined_month, left_month) values (?, ?, ?, null)')
      .bind(crypto.randomUUID(), ownerId, input.start_month),
  ])

  return {
    id,
    userId,
    name: input.name,
    currency: input.currency,
    locale: input.locale,
    timeZone: input.time_zone,
    startMonth: input.start_month,
    createdAt,
  }
}

/** Returns null for a foreign or missing id, indistinguishable from each other by design. */
export async function get(db: D1Database, id: string, userId: string): Promise<Subscription | null> {
  const row = await db
    .prepare('select * from subscriptions where id = ? and user_id = ?')
    .bind(id, userId)
    .first<SubscriptionRow>()
  return row ? toSubscription(row) : null
}

export async function update(
  db: D1Database,
  id: string,
  userId: string,
  patch: PatchSubscriptionInput,
): Promise<Subscription | null> {
  const existing = await get(db, id, userId)
  if (!existing) return null

  const next = {
    name: patch.name ?? existing.name,
    currency: patch.currency ?? existing.currency,
    locale: patch.locale ?? existing.locale,
    time_zone: patch.time_zone ?? existing.timeZone,
  }

  await db
    .prepare(
      `update subscriptions set name = ?, currency = ?, locale = ?, time_zone = ?
       where id = ? and user_id = ?`,
    )
    .bind(next.name, next.currency, next.locale, next.time_zone, id, userId)
    .run()

  return { ...existing, name: next.name, currency: next.currency, locale: next.locale, timeZone: next.time_zone }
}
