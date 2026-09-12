import type { ActiveRange, Member } from '../../domain/types'
import { existsForMember as paymentExistsForMember } from './payments'
import { existsForMember as scheduleExistsForMember } from './recurring'
import type { CreateMemberInput, PatchMemberInput } from '../validation/members'

type MemberRow = {
  id: string
  name: string
  is_owner: number
  archived: number
}

type RangeRow = {
  member_id: string
  joined_month: string
  left_month: string | null
}

/**
 * The ownership predicate, in one place. Keeping `s.user_id` and dropping
 * `s.id` still passes every cross-account test while letting one account read
 * its first subscription's members through its second subscription's id, so
 * the two halves are never separated.
 *
 * Every statement that reads or writes a member row carries both halves. The
 * one exception is the range inserts, which bind a member id alone: they only
 * ever run in the same batch as a statement that did carry the predicate, and
 * a range row is meaningless without the member row that batch just wrote or
 * proved. Anything added to this module outside that pairing carries the
 * predicate itself.
 */
const OWNED_MEMBER_IDS = `select m.id from members m
    join subscriptions s on s.id = m.subscription_id
    where m.id = ? and s.id = ? and s.user_id = ?`

function toMember(row: MemberRow, ranges: ActiveRange[]): Member {
  return {
    id: row.id,
    name: row.name,
    isOwner: row.is_owner === 1,
    archived: row.archived === 1,
    activeRanges: ranges,
  }
}

function toRange(row: RangeRow): ActiveRange {
  return { joinedMonth: row.joined_month, leftMonth: row.left_month }
}

function rangeInserts(db: D1Database, memberId: string, ranges: CreateMemberInput['active_ranges']) {
  return ranges.map((range) =>
    db
      .prepare('insert into active_ranges (id, member_id, joined_month, left_month) values (?, ?, ?, ?)')
      .bind(crypto.randomUUID(), memberId, range.joined_month, range.left_month),
  )
}

/** The members of one subscription, in creation order, empty for a missing or foreign subscription. */
export async function list(db: D1Database, subscriptionId: string, userId: string): Promise<Member[]> {
  const members = await db
    .prepare(
      `select m.id, m.name, m.is_owner, m.archived from members m
       join subscriptions s on s.id = m.subscription_id
       where s.id = ? and s.user_id = ?
       order by m.created_at asc, m.id asc`,
    )
    .bind(subscriptionId, userId)
    .all<MemberRow>()

  const ranges = await db
    .prepare(
      `select r.member_id, r.joined_month, r.left_month from active_ranges r
       join members m on m.id = r.member_id
       join subscriptions s on s.id = m.subscription_id
       where s.id = ? and s.user_id = ?
       order by r.joined_month asc`,
    )
    .bind(subscriptionId, userId)
    .all<RangeRow>()

  return members.results.map((row) =>
    toMember(
      row,
      ranges.results.filter((range) => range.member_id === row.id).map(toRange),
    ),
  )
}

/** Null for a missing member, a foreign one, and one reached through the wrong subscription alike. */
export async function get(
  db: D1Database,
  subscriptionId: string,
  memberId: string,
  userId: string,
): Promise<Member | null> {
  const row = await db
    .prepare(
      `select m.id, m.name, m.is_owner, m.archived from members m
       join subscriptions s on s.id = m.subscription_id
       where m.id = ? and s.id = ? and s.user_id = ?`,
    )
    .bind(memberId, subscriptionId, userId)
    .first<MemberRow>()
  if (!row) return null

  const ranges = await db
    .prepare(
      `select r.member_id, r.joined_month, r.left_month from active_ranges r
       join members m on m.id = r.member_id
       join subscriptions s on s.id = m.subscription_id
       where m.id = ? and s.id = ? and s.user_id = ?
       order by r.joined_month asc`,
    )
    .bind(memberId, subscriptionId, userId)
    .all<RangeRow>()

  return toMember(row, ranges.results.map(toRange))
}

/**
 * Writes the member and all its ranges in one batch, so a member can never
 * land without the ranges it was created with. Returns null when the
 * subscription is missing or foreign: the insert itself carries the ownership
 * predicate, so no separate check can race it.
 */
export async function create(
  db: D1Database,
  subscriptionId: string,
  userId: string,
  input: CreateMemberInput,
): Promise<Member | null> {
  const owned = await db
    .prepare('select 1 as ok from subscriptions where id = ? and user_id = ?')
    .bind(subscriptionId, userId)
    .first<{ ok: number }>()
  if (!owned) return null

  const id = crypto.randomUUID()

  const [inserted] = await db.batch([
    db
      .prepare(
        `insert into members (id, subscription_id, name, is_owner, archived, created_at)
         select ?, ?, ?, ?, ?, ?
         where exists (select 1 from subscriptions where id = ? and user_id = ?)`,
      )
      .bind(
        id,
        subscriptionId,
        input.name,
        input.is_owner ? 1 : 0,
        input.archived ? 1 : 0,
        new Date().toISOString(),
        subscriptionId,
        userId,
      ),
    ...rangeInserts(db, id, input.active_ranges),
  ])

  if (inserted.meta.changes === 0) return null

  return {
    id,
    name: input.name,
    isOwner: input.is_owner,
    archived: input.archived,
    activeRanges: input.active_ranges.map((range) => ({
      joinedMonth: range.joined_month,
      leftMonth: range.left_month,
    })),
  }
}

/**
 * Applies the member row update, and when the patch carries ranges, replaces
 * the whole set in the same batch. A partial replacement would leave a member
 * holding rows from two different edits, which is the one way this table can
 * invent liability.
 */
export async function update(
  db: D1Database,
  subscriptionId: string,
  memberId: string,
  userId: string,
  patch: PatchMemberInput,
): Promise<Member | null> {
  const existing = await get(db, subscriptionId, memberId, userId)
  if (!existing) return null

  const next = {
    name: patch.name ?? existing.name,
    archived: (patch.archived ?? existing.archived) ? 1 : 0,
  }

  const statements = [
    db
      .prepare(`update members set name = ?, archived = ? where id in (${OWNED_MEMBER_IDS})`)
      .bind(next.name, next.archived, memberId, subscriptionId, userId),
  ]

  if (patch.active_ranges) {
    statements.push(
      db
        .prepare(`delete from active_ranges where member_id in (${OWNED_MEMBER_IDS})`)
        .bind(memberId, subscriptionId, userId),
      ...rangeInserts(db, memberId, patch.active_ranges),
    )
  }

  await db.batch(statements)

  return get(db, subscriptionId, memberId, userId)
}

/**
 * Why this is a union rather than the boolean its three siblings return: both
 * `payments.member_id` and `recurring_schedules.member_id` cascade on delete,
 * so a member delete that reaches SQL has already destroyed the history the
 * refusal exists to protect. Returning `'has-dependents'` from here rather than
 * checking it in the caller makes the refusal unskippable by construction, so a
 * second call site cannot cascade past it.
 */
export type MemberRemoval = 'deleted' | 'has-dependents' | 'not-found'

/**
 * `'not-found'` when the member is missing, foreign or reached through the
 * wrong subscription; `'has-dependents'` when a payment or a standing order
 * names it, which the route answers with 409; `'deleted'` otherwise.
 */
export async function remove(
  db: D1Database,
  subscriptionId: string,
  memberId: string,
  userId: string,
): Promise<MemberRemoval> {
  if (await hasDependents(db, subscriptionId, memberId, userId)) return 'has-dependents'

  const result = await db
    .prepare(`delete from members where id in (${OWNED_MEMBER_IDS})`)
    .bind(memberId, subscriptionId, userId)
    .run()
  return (result.meta.changes ?? 0) > 0 ? 'deleted' : 'not-found'
}

/**
 * Whether anything else in the subscription would lose its parent if this
 * member were deleted: a recorded payment or a standing order, which is
 * everything the requirements call history. `remove` applies it itself, so the
 * refusal does not depend on a caller remembering to ask first; the export
 * stays so a caller that wants to explain the refusal before attempting it can.
 */
export async function hasDependents(
  db: D1Database,
  subscriptionId: string,
  memberId: string,
  userId: string,
): Promise<boolean> {
  const [payments, schedules] = await Promise.all([
    paymentExistsForMember(db, subscriptionId, memberId, userId),
    scheduleExistsForMember(db, subscriptionId, memberId, userId),
  ])
  return payments || schedules
}
