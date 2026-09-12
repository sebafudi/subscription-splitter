import type { PriceEntry } from '../../domain/types'
import type { CreatePriceInput } from '../validation/prices'

type PriceRow = {
  id: string
  effective_from: string
  amount: number
}

function toEntry(row: PriceRow): PriceEntry {
  return { id: row.id, effectiveFrom: row.effective_from, amount: row.amount }
}

/** Empty for a missing or foreign subscription, which is the same answer as an empty history. */
export async function list(db: D1Database, subscriptionId: string, userId: string): Promise<PriceEntry[]> {
  const result = await db
    .prepare(
      `select p.id, p.effective_from, p.amount from price_history p
       join subscriptions s on s.id = p.subscription_id
       where s.id = ? and s.user_id = ?
       order by p.effective_from asc`,
    )
    .bind(subscriptionId, userId)
    .all<PriceRow>()
  return result.results.map(toEntry)
}

/**
 * Null when the subscription is missing or foreign. A second entry for a month
 * already priced violates the unique constraint and throws; the route turns
 * that into 409 rather than letting it become a 500.
 */
export async function create(
  db: D1Database,
  subscriptionId: string,
  userId: string,
  input: CreatePriceInput,
): Promise<PriceEntry | null> {
  const id = crypto.randomUUID()

  const result = await db
    .prepare(
      `insert into price_history (id, subscription_id, effective_from, amount)
       select ?, ?, ?, ?
       where exists (select 1 from subscriptions where id = ? and user_id = ?)`,
    )
    .bind(id, subscriptionId, input.effective_from, input.amount, subscriptionId, userId)
    .run()

  if ((result.meta.changes ?? 0) === 0) return null
  return { id, effectiveFrom: input.effective_from, amount: input.amount }
}

/** False for a missing entry, a foreign one, and one reached through the wrong subscription alike. */
export async function remove(
  db: D1Database,
  subscriptionId: string,
  priceId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `delete from price_history where id = ? and subscription_id in (
         select s.id from subscriptions s where s.id = ? and s.user_id = ?
       )`,
    )
    .bind(priceId, subscriptionId, userId)
    .run()
  return (result.meta.changes ?? 0) > 0
}
