import type { MonthStr } from '../../domain/types'

/** The months of every stored break, in order; empty for a missing or foreign subscription. */
export async function list(db: D1Database, subscriptionId: string, userId: string): Promise<MonthStr[]> {
  const result = await db
    .prepare(
      `select b.month from break_months b
       join subscriptions s on s.id = b.subscription_id
       where s.id = ? and s.user_id = ?
       order by b.month asc`,
    )
    .bind(subscriptionId, userId)
    .all<{ month: string }>()
  return result.results.map((row) => row.month)
}

/**
 * Idempotent: the month is the key, so marking an already-skipped month as
 * skipped stores nothing new and is not an error. Returns false only when the
 * subscription is missing or foreign, which the caller answers with 404.
 */
export async function create(
  db: D1Database,
  subscriptionId: string,
  userId: string,
  month: MonthStr,
): Promise<boolean> {
  const owned = await db
    .prepare('select 1 as ok from subscriptions where id = ? and user_id = ?')
    .bind(subscriptionId, userId)
    .first<{ ok: number }>()
  if (!owned) return false

  await db
    .prepare(
      `insert or ignore into break_months (subscription_id, month)
       select ?, ? where exists (select 1 from subscriptions where id = ? and user_id = ?)`,
    )
    .bind(subscriptionId, month, subscriptionId, userId)
    .run()

  return true
}

/** False for a month that was not stored and for a foreign subscription alike. */
export async function remove(
  db: D1Database,
  subscriptionId: string,
  month: MonthStr,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `delete from break_months where month = ? and subscription_id in (
         select s.id from subscriptions s where s.id = ? and s.user_id = ?
       )`,
    )
    .bind(month, subscriptionId, userId)
    .run()
  return (result.meta.changes ?? 0) > 0
}
