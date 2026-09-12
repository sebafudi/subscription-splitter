import type { Payment } from '../../domain/types'
import type { CreatePaymentInput, PatchPaymentInput } from '../validation/payments'

type PaymentRow = {
  id: string
  member_id: string
  date: string
  amount: number
  note: string
  tag: 'manual' | 'annual'
}

/**
 * The ownership predicate for a payment, which sits two levels below the
 * account: payment to member to subscription to user. One statement carries
 * the whole chain, so a foreign payment, a payment reached through a foreign
 * member and a payment reached through a foreign subscription are one answer.
 */
const OWNED_PAYMENT_IDS = `select p.id from payments p
    join members m on m.id = p.member_id
    join subscriptions s on s.id = m.subscription_id
    where p.id = ? and s.id = ? and s.user_id = ?`

/** The same chain for a member, used to resolve the target of a write before it happens. */
const OWNED_MEMBER_EXISTS = `select 1 from members m
    join subscriptions s on s.id = m.subscription_id
    where m.id = ? and s.id = ? and s.user_id = ?`

/** `tag` is the column and `kind` is the domain field; the mapping stops here. */
function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    memberId: row.member_id,
    date: row.date,
    amount: row.amount,
    note: row.note,
    kind: row.tag,
  }
}

/**
 * Newest first, so the screen does no sorting of its own. `created_at` breaks
 * the tie because two payments can share a date. Empty for a missing or
 * foreign subscription, which is the same answer as a subscription with no
 * payments; the route checks the parent separately so the two are told apart.
 */
export async function list(
  db: D1Database,
  subscriptionId: string,
  userId: string,
  memberId?: string,
): Promise<Payment[]> {
  const filter = memberId ? 'and p.member_id = ?' : ''
  const bindings = memberId ? [subscriptionId, userId, memberId] : [subscriptionId, userId]

  const result = await db
    .prepare(
      `select p.id, p.member_id, p.date, p.amount, p.note, p.tag from payments p
       join members m on m.id = p.member_id
       join subscriptions s on s.id = m.subscription_id
       where s.id = ? and s.user_id = ? ${filter}
       order by p.date desc, p.created_at desc`,
    )
    .bind(...bindings)
    .all<PaymentRow>()

  return result.results.map(toPayment)
}

/** Null for a missing payment, a foreign one, and one reached through the wrong subscription alike. */
export async function get(
  db: D1Database,
  subscriptionId: string,
  paymentId: string,
  userId: string,
): Promise<Payment | null> {
  const row = await db
    .prepare(
      `select p.id, p.member_id, p.date, p.amount, p.note, p.tag from payments p
       join members m on m.id = p.member_id
       join subscriptions s on s.id = m.subscription_id
       where p.id = ? and s.id = ? and s.user_id = ?`,
    )
    .bind(paymentId, subscriptionId, userId)
    .first<PaymentRow>()

  return row ? toPayment(row) : null
}

/**
 * Null when the member is missing, foreign, or belongs to another
 * subscription: the insert carries the ownership predicate itself, so no
 * separate check can race it and a member id from elsewhere is
 * indistinguishable from one that does not exist.
 */
export async function create(
  db: D1Database,
  subscriptionId: string,
  userId: string,
  input: CreatePaymentInput,
): Promise<Payment | null> {
  const id = crypto.randomUUID()

  const result = await db
    .prepare(
      `insert into payments (id, member_id, date, amount, note, tag, created_at)
       select ?, ?, ?, ?, ?, ?, ?
       where exists (${OWNED_MEMBER_EXISTS})`,
    )
    .bind(
      id,
      input.member_id,
      input.date,
      input.amount,
      input.note,
      input.kind,
      new Date().toISOString(),
      input.member_id,
      subscriptionId,
      userId,
    )
    .run()

  if ((result.meta.changes ?? 0) === 0) return null

  return {
    id,
    memberId: input.member_id,
    date: input.date,
    amount: input.amount,
    note: input.note,
    kind: input.kind,
  }
}

/**
 * Merges the patch over the stored row and writes it back. The statement
 * carries two predicates, one for the payment and one for the member it ends
 * up naming, so a move onto a member from another subscription changes nothing
 * and answers null rather than relocating the row out of its own account.
 */
export async function update(
  db: D1Database,
  subscriptionId: string,
  paymentId: string,
  userId: string,
  patch: PatchPaymentInput,
): Promise<Payment | null> {
  const existing = await get(db, subscriptionId, paymentId, userId)
  if (!existing) return null

  const next: Payment = {
    ...existing,
    memberId: patch.member_id ?? existing.memberId,
    date: patch.date ?? existing.date,
    amount: patch.amount ?? existing.amount,
    note: patch.note ?? existing.note,
    kind: patch.kind ?? existing.kind,
  }

  const result = await db
    .prepare(
      `update payments set member_id = ?, date = ?, amount = ?, note = ?, tag = ?
       where id in (${OWNED_PAYMENT_IDS}) and exists (${OWNED_MEMBER_EXISTS})`,
    )
    .bind(
      next.memberId,
      next.date,
      next.amount,
      next.note,
      next.kind,
      paymentId,
      subscriptionId,
      userId,
      next.memberId,
      subscriptionId,
      userId,
    )
    .run()

  if ((result.meta.changes ?? 0) === 0) return null
  return get(db, subscriptionId, paymentId, userId)
}

/** False when the payment is missing, foreign or reached through the wrong subscription. */
export async function remove(
  db: D1Database,
  subscriptionId: string,
  paymentId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare(`delete from payments where id in (${OWNED_PAYMENT_IDS})`)
    .bind(paymentId, subscriptionId, userId)
    .run()
  return (result.meta.changes ?? 0) > 0
}

/** Whether any payment names this member, for the member delete refusal. */
export async function existsForMember(
  db: D1Database,
  subscriptionId: string,
  memberId: string,
  userId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `select 1 as ok from payments p
       join members m on m.id = p.member_id
       join subscriptions s on s.id = m.subscription_id
       where m.id = ? and s.id = ? and s.user_id = ?
       limit 1`,
    )
    .bind(memberId, subscriptionId, userId)
    .first<{ ok: number }>()
  return row !== null
}
