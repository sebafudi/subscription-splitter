import type { MonthStr, RecurringException, RecurringSchedule } from '../../domain/types'
import type { CreateScheduleInput } from '../validation/recurring'

type ScheduleRow = {
  id: string
  member_id: string
  amount: number
  start_month: string
  end_month: string | null
}

type ExceptionRow = {
  schedule_id: string
  month: string
}

/**
 * What the screen reads: the arrangement plus the months marked as not
 * received, so one call fills both the block and its toggles. The domain's
 * `RecurringSchedule` and `RecurringException` are unchanged, and `loadState`
 * still hands the calculation the two collections separately, because that is
 * how `recurringReceived` reads them.
 */
export type ScheduleView = RecurringSchedule & { exceptionMonths: MonthStr[] }

/**
 * The ownership predicate for an arrangement, which sits two levels below the
 * account exactly as a payment does: schedule to member to subscription to
 * user. One statement carries the whole chain.
 */
const OWNED_SCHEDULE_IDS = `select r.id from recurring_schedules r
    join members m on m.id = r.member_id
    join subscriptions s on s.id = m.subscription_id
    where r.id = ? and s.id = ? and s.user_id = ?`

const OWNED_MEMBER_EXISTS = `select 1 from members m
    join subscriptions s on s.id = m.subscription_id
    where m.id = ? and s.id = ? and s.user_id = ?`

function toSchedule(row: ScheduleRow): RecurringSchedule {
  return {
    id: row.id,
    memberId: row.member_id,
    amount: row.amount,
    startMonth: row.start_month,
    endMonth: row.end_month,
  }
}

/**
 * The column is `schedule_id` and the domain field is `recurringId`, which
 * `src/domain/calc.ts` matches on. A list that keeps the column name matches
 * nothing, and a participant whose corrections are all silently ignored looks
 * exactly like one who never missed a month, so the mapping stops here.
 */
function toException(row: ExceptionRow): RecurringException {
  return { recurringId: row.schedule_id, month: row.month }
}

async function readSchedules(db: D1Database, subscriptionId: string, userId: string): Promise<ScheduleRow[]> {
  const result = await db
    .prepare(
      `select r.id, r.member_id, r.amount, r.start_month, r.end_month from recurring_schedules r
       join members m on m.id = r.member_id
       join subscriptions s on s.id = m.subscription_id
       where s.id = ? and s.user_id = ?
       order by r.member_id asc, r.start_month asc`,
    )
    .bind(subscriptionId, userId)
    .all<ScheduleRow>()
  return result.results
}

async function readExceptions(db: D1Database, subscriptionId: string, userId: string): Promise<ExceptionRow[]> {
  const result = await db
    .prepare(
      `select e.schedule_id, e.month from recurring_exceptions e
       join recurring_schedules r on r.id = e.schedule_id
       join members m on m.id = r.member_id
       join subscriptions s on s.id = m.subscription_id
       where s.id = ? and s.user_id = ?
       order by e.month asc`,
    )
    .bind(subscriptionId, userId)
    .all<ExceptionRow>()
  return result.results
}

function attach(rows: ScheduleRow[], exceptions: ExceptionRow[]): ScheduleView[] {
  return rows.map((row) => ({
    ...toSchedule(row),
    exceptionMonths: exceptions.filter((e) => e.schedule_id === row.id).map((e) => e.month),
  }))
}

/**
 * Ordered by member then start month, so the screen draws one block per
 * participant and sorts nothing itself. Neither table carries `created_at`, so
 * entry order is neither available nor wanted, and an order that came from the
 * current query plan rather than from an `ORDER BY` would be stable only until
 * an index or a row count changed.
 */
export async function list(db: D1Database, subscriptionId: string, userId: string): Promise<ScheduleView[]> {
  const [rows, exceptions] = await Promise.all([
    readSchedules(db, subscriptionId, userId),
    readExceptions(db, subscriptionId, userId),
  ])
  return attach(rows, exceptions)
}

/** The two collections the calculation reads, with the exception key mapped to the domain field. */
export async function listForState(
  db: D1Database,
  subscriptionId: string,
  userId: string,
): Promise<{ schedules: RecurringSchedule[]; exceptions: RecurringException[] }> {
  const [rows, exceptions] = await Promise.all([
    readSchedules(db, subscriptionId, userId),
    readExceptions(db, subscriptionId, userId),
  ])
  return { schedules: rows.map(toSchedule), exceptions: exceptions.map(toException) }
}

/** Null for a missing arrangement, a foreign one, and one reached through the wrong subscription alike. */
export async function get(
  db: D1Database,
  subscriptionId: string,
  scheduleId: string,
  userId: string,
): Promise<ScheduleView | null> {
  const row = await db
    .prepare(
      `select r.id, r.member_id, r.amount, r.start_month, r.end_month from recurring_schedules r
       join members m on m.id = r.member_id
       join subscriptions s on s.id = m.subscription_id
       where r.id = ? and s.id = ? and s.user_id = ?`,
    )
    .bind(scheduleId, subscriptionId, userId)
    .first<ScheduleRow>()
  if (!row) return null

  const exceptions = await db
    .prepare(
      `select e.schedule_id, e.month from recurring_exceptions e
       where e.schedule_id = ? order by e.month asc`,
    )
    .bind(scheduleId)
    .all<ExceptionRow>()

  return { ...toSchedule(row), exceptionMonths: exceptions.results.map((e) => e.month) }
}

/** One member's arrangements, ascending by start month, which is what the overlap check reads. */
export async function listForMember(
  db: D1Database,
  subscriptionId: string,
  memberId: string,
  userId: string,
): Promise<RecurringSchedule[]> {
  const result = await db
    .prepare(
      `select r.id, r.member_id, r.amount, r.start_month, r.end_month from recurring_schedules r
       join members m on m.id = r.member_id
       join subscriptions s on s.id = m.subscription_id
       where m.id = ? and s.id = ? and s.user_id = ?
       order by r.start_month asc`,
    )
    .bind(memberId, subscriptionId, userId)
    .all<ScheduleRow>()
  return result.results.map(toSchedule)
}

/** Null when the member is missing, foreign, or belongs to another subscription. */
export async function create(
  db: D1Database,
  subscriptionId: string,
  userId: string,
  input: CreateScheduleInput,
): Promise<ScheduleView | null> {
  const id = crypto.randomUUID()

  const result = await db
    .prepare(
      `insert into recurring_schedules (id, member_id, amount, start_month, end_month)
       select ?, ?, ?, ?, ?
       where exists (${OWNED_MEMBER_EXISTS})`,
    )
    .bind(id, input.member_id, input.amount, input.start_month, input.end_month, input.member_id, subscriptionId, userId)
    .run()

  if ((result.meta.changes ?? 0) === 0) return null

  return {
    id,
    memberId: input.member_id,
    amount: input.amount,
    startMonth: input.start_month,
    endMonth: input.end_month,
    exceptionMonths: [],
  }
}

/**
 * Writes the row it is given and, in the same batch, drops every exception that
 * row's range no longer contains. The merge happens once, in the route, and
 * this function writes exactly what the route validated: deriving it a second
 * time here would let every rule be checked against one row while a different
 * row was written, with the exception bounds taken from the unchecked one. Leaving them would make the row inert while the
 * range is narrow and bring it back if the organizer later widened the
 * arrangement, applying a correction made against a different set of months.
 * D1 has no interactive transaction, so the batch is what makes the two one
 * write.
 */
export async function update(
  db: D1Database,
  subscriptionId: string,
  scheduleId: string,
  userId: string,
  next: RecurringSchedule,
): Promise<ScheduleView | null> {
  const memberOwned = await db
    .prepare(`select 1 as ok from (${OWNED_MEMBER_EXISTS})`)
    .bind(next.memberId, subscriptionId, userId)
    .first<{ ok: number }>()
  if (!memberOwned) return null

  const statements = [
    db
      .prepare(
        `update recurring_schedules set member_id = ?, amount = ?, start_month = ?, end_month = ?
         where id in (${OWNED_SCHEDULE_IDS})`,
      )
      .bind(next.memberId, next.amount, next.startMonth, next.endMonth, scheduleId, subscriptionId, userId),
    db
      .prepare(`delete from recurring_exceptions where schedule_id in (${OWNED_SCHEDULE_IDS}) and month < ?`)
      .bind(scheduleId, subscriptionId, userId, next.startMonth),
  ]

  if (next.endMonth !== null) {
    statements.push(
      db
        .prepare(`delete from recurring_exceptions where schedule_id in (${OWNED_SCHEDULE_IDS}) and month > ?`)
        .bind(scheduleId, subscriptionId, userId, next.endMonth),
    )
  }

  await db.batch(statements)
  return get(db, subscriptionId, scheduleId, userId)
}

/** False when the arrangement is missing, foreign or reached through the wrong subscription. */
export async function remove(
  db: D1Database,
  subscriptionId: string,
  scheduleId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare(`delete from recurring_schedules where id in (${OWNED_SCHEDULE_IDS})`)
    .bind(scheduleId, subscriptionId, userId)
    .run()
  return (result.meta.changes ?? 0) > 0
}

/** One end of the unpaid toggle. An existing mark is success, not a conflict. */
export async function addException(
  db: D1Database,
  subscriptionId: string,
  scheduleId: string,
  userId: string,
  month: MonthStr,
): Promise<void> {
  await db
    .prepare(
      `insert or ignore into recurring_exceptions (schedule_id, month)
       select ?, ? where exists (${OWNED_SCHEDULE_IDS})`,
    )
    .bind(scheduleId, month, scheduleId, subscriptionId, userId)
    .run()
}

/** The other end. A month that was not marked is success too; clicking twice is not an error. */
export async function removeException(
  db: D1Database,
  subscriptionId: string,
  scheduleId: string,
  userId: string,
  month: MonthStr,
): Promise<void> {
  await db
    .prepare(`delete from recurring_exceptions where schedule_id in (${OWNED_SCHEDULE_IDS}) and month = ?`)
    .bind(scheduleId, subscriptionId, userId, month)
    .run()
}

/** Whether any arrangement names this member, for the member delete refusal. */
export async function existsForMember(
  db: D1Database,
  subscriptionId: string,
  memberId: string,
  userId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `select 1 as ok from recurring_schedules r
       join members m on m.id = r.member_id
       join subscriptions s on s.id = m.subscription_id
       where m.id = ? and s.id = ? and s.user_id = ?
       limit 1`,
    )
    .bind(memberId, subscriptionId, userId)
    .first<{ ok: number }>()
  return row !== null
}
