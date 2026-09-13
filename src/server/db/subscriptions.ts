import { validateActiveRanges } from '../../domain/members'
import { currentMonth } from '../../domain/months'
import type { ActiveRange } from '../../domain/types'
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

/** The two fields a settings write can be refused over, named the way the wire names them. */
export type SubscriptionRefusal = { field: 'currency' | 'start_month'; message: string }

/**
 * Why this is a union rather than the `Subscription | null` it used to be:
 * `null` already means "foreign or missing id" here and the route maps it to
 * 404, so a refusal travelling as `null` would turn every 400 into a 404
 * silently. Same shape and same reasoning as `MemberRemoval` in `members.ts`.
 */
export type SubscriptionUpdate =
  | { ok: true; subscription: Subscription }
  | { ok: false; kind: 'not-found' }
  | ({ ok: false; kind: 'refused' } & SubscriptionRefusal)

/** `create` can only be refused over the first-month floor; it has no row to miss. */
export type SubscriptionCreation =
  | { ok: true; subscription: Subscription }
  | ({ ok: false; kind: 'refused' } & SubscriptionRefusal)

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

/**
 * The first month may not sit earlier than January this many years before the
 * current year. The bound is about cost rather than correctness: the summary
 * enumerates every month from the first month on every read, so an unbounded
 * move backwards makes each later read walk an arbitrarily long list. It is
 * the same span the client's month select offers, so the picker path and the
 * select path agree on what can be chosen.
 */
const FLOOR_YEARS = 10

function floorMonth(timeZone: string): string {
  const year = Number(currentMonth(timeZone).slice(0, 4)) - FLOOR_YEARS
  return `${String(year).padStart(4, '0')}-01`
}

const CURRENCY_LOCKED = 'currency cannot change while prices, payments or standing orders are recorded'

type AmountsRow = { has_price: number; has_payment: number; has_schedule: number }

const AMOUNTS_SQL = `select
    exists (select 1 from price_history where subscription_id = ?) as has_price,
    exists (select 1 from payments p join members m on m.id = p.member_id where m.subscription_id = ?) as has_payment,
    exists (select 1 from recurring_schedules r join members m on m.id = r.member_id where m.subscription_id = ?) as has_schedule`

type MinimumsRow = {
  min_joined: string | null
  min_price: string | null
  min_break: string | null
  min_payment: string | null
  min_schedule: string | null
}

/**
 * The earliest month each kind of dependent record occupies. The opening range
 * of the owner is excluded by id when it is about to be shifted with the first
 * month; binding an id no row carries excludes nothing.
 */
const MINIMUMS_SQL = `select
    (select min(ar.joined_month) from active_ranges ar
       join members m on m.id = ar.member_id
      where m.subscription_id = ? and ar.id <> ?) as min_joined,
    (select min(effective_from) from price_history where subscription_id = ?) as min_price,
    (select min(month) from break_months where subscription_id = ?) as min_break,
    (select min(substr(p.date, 1, 7)) from payments p
       join members m on m.id = p.member_id
      where m.subscription_id = ?) as min_payment,
    (select min(r.start_month) from recurring_schedules r
       join members m on m.id = r.member_id
      where m.subscription_id = ?) as min_schedule`

/**
 * Which kind a refusal names when several pin the first month: the earliest
 * month wins, and this order breaks a tie. It is the order the design delta
 * fixes, so the sentence a person reads is stable rather than incidental.
 */
const FIRST_MONTH_KINDS: Array<{ column: keyof MinimumsRow; because: string }> = [
  { column: 'min_joined', because: 'a participant is active from' },
  { column: 'min_price', because: 'a price is recorded from' },
  { column: 'min_break', because: 'a month is skipped in' },
  { column: 'min_payment', because: 'a payment is dated in' },
  { column: 'min_schedule', because: 'a standing order starts in' },
]

/**
 * The earliest month any dependent record pins wins; the order above breaks a
 * tie, with the owner's own opening range last because it is the one kind a
 * person can fix from the same screen. The owner's range is the one exception
 * to the exclusion above: it is left out of the minimums because it moves with
 * the first month, and it returns here as its own kind when the leave month it
 * carries would fall before the month it is moving to.
 */
function firstMonthRefusal(
  minimums: MinimumsRow,
  shifted: OwnerRangeRow | null,
  month: string,
): SubscriptionRefusal | null {
  const candidates: Array<{ month: string; message: string }> = []

  for (const kind of FIRST_MONTH_KINDS) {
    const value = minimums[kind.column]
    if (value === null || value >= month) continue
    candidates.push({
      month: value,
      message: `start_month cannot be later than ${value} because ${kind.because} that month`,
    })
  }

  const leave = shifted?.left_month ?? null
  if (leave !== null && leave < month) {
    candidates.push({
      month: leave,
      message: `start_month cannot be later than ${leave} because your own first active range ends then`,
    })
  }

  let binding: { month: string; message: string } | null = null
  for (const candidate of candidates) {
    if (binding === null || candidate.month < binding.month) binding = candidate
  }

  return binding ? { field: 'start_month', message: binding.message } : null
}

type OwnerRangeRow = { id: string; joined_month: string; left_month: string | null }

const OWNER_RANGES_SQL = `select ar.id, ar.joined_month, ar.left_month from active_ranges ar
    join members m on m.id = ar.member_id
    join subscriptions s on s.id = m.subscription_id
   where s.id = ? and s.user_id = ? and m.is_owner = 1
   order by ar.joined_month asc`

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
): Promise<SubscriptionCreation> {
  const floor = floorMonth(input.time_zone)
  if (input.start_month < floor) {
    return { ok: false, kind: 'refused', field: 'start_month', message: `start_month cannot be earlier than ${floor}` }
  }

  const id = crypto.randomUUID()
  const ownerId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  // One atomic unit: a subscription that exists without an owner member has no
  // defined per-person share, so there is no window in which one can be read
  // (decision D-006). The owner's opening range is created at the first month
  // and stays open; when the first month later moves and the range still sits
  // there, `update` carries it along in the same batch as the settings write.
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
    ok: true,
    subscription: {
      id,
      userId,
      name: input.name,
      currency: input.currency,
      locale: input.locale,
      timeZone: input.time_zone,
      startMonth: input.start_month,
      createdAt,
    },
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

/**
 * Applies the settings patch and, when the first month moves and the owner's
 * opening range still sits on the old one, carries that range along in the
 * same batch.
 *
 * Every rule is decided by the write rather than by the read before it. D1 has
 * no interactive transaction, so a rule read first and applied second leaves a
 * window in which a concurrent request can land exactly the record the rule
 * exists to refuse. The bounds therefore travel as `not exists` clauses inside
 * the update's own `where`, in the shape `members.ts` already uses, and the
 * reads above them supply only the sentence a refusal carries. The one rule
 * that needs no clause is the floor: nothing another request can write moves
 * it.
 */
export async function update(
  db: D1Database,
  id: string,
  userId: string,
  patch: PatchSubscriptionInput,
): Promise<SubscriptionUpdate> {
  const existing = await get(db, id, userId)
  if (!existing) return { ok: false, kind: 'not-found' }

  const next = {
    name: patch.name ?? existing.name,
    currency: patch.currency ?? existing.currency,
    locale: patch.locale ?? existing.locale,
    time_zone: patch.time_zone ?? existing.timeZone,
    start_month: patch.start_month ?? existing.startMonth,
  }

  const currencyChanges = next.currency !== existing.currency
  const monthMoves = next.start_month !== existing.startMonth
  const monthMovesLater = next.start_month > existing.startMonth

  // The floor follows the time zone the subscription will hold, so a patch
  // that moves both is judged against the zone it lands in.
  if (monthMoves) {
    const floor = floorMonth(next.time_zone)
    if (next.start_month < floor) {
      return {
        ok: false,
        kind: 'refused',
        field: 'start_month',
        message: `start_month cannot be earlier than ${floor}`,
      }
    }
  }

  const ownerRanges = monthMoves ? await readOwnerRanges(db, id, userId) : []
  const opening = ownerRanges[0]
  const shifted = opening && opening.joined_month === existing.startMonth ? opening : null

  const refusal = await deriveRefusal(db, id, {
    currency: currencyChanges,
    laterMonth: monthMovesLater ? next.start_month : null,
    shifted,
  })
  if (refusal) return { ok: false, kind: 'refused', ...refusal }

  if (shifted) assertOwnerRangesSurvive(ownerRanges, shifted, next.start_month)

  const clauses: string[] = []
  const bindings: unknown[] = []

  if (currencyChanges) {
    clauses.push(
      'not exists (select 1 from price_history where subscription_id = ?)',
      'not exists (select 1 from payments p join members m on m.id = p.member_id where m.subscription_id = ?)',
      'not exists (select 1 from recurring_schedules r join members m on m.id = r.member_id where m.subscription_id = ?)',
    )
    bindings.push(id, id, id)
  }

  if (monthMovesLater) {
    // The `ar.id <> ?` exclusion is the owner's opening range while it is being
    // shifted: without it the clause would refuse the very move the shift
    // exists to perform. An id no row carries excludes nothing.
    clauses.push(
      `not exists (select 1 from active_ranges ar join members m on m.id = ar.member_id
          where m.subscription_id = ? and ar.joined_month < ? and ar.id <> ?)`,
      'not exists (select 1 from price_history where subscription_id = ? and effective_from < ?)',
      'not exists (select 1 from break_months where subscription_id = ? and month < ?)',
      `not exists (select 1 from payments p join members m on m.id = p.member_id
          where m.subscription_id = ? and substr(p.date, 1, 7) < ?)`,
      `not exists (select 1 from recurring_schedules r join members m on m.id = r.member_id
          where m.subscription_id = ? and r.start_month < ?)`,
    )
    bindings.push(
      id,
      next.start_month,
      shifted?.id ?? '',
      id,
      next.start_month,
      id,
      next.start_month,
      id,
      next.start_month,
      id,
      next.start_month,
    )
  }

  const statements = [
    db
      .prepare(
        `update subscriptions set name = ?, currency = ?, locale = ?, time_zone = ?, start_month = ?
         where id = ? and user_id = ?${clauses.map((clause) => `\n           and ${clause}`).join('')}`,
      )
      .bind(next.name, next.currency, next.locale, next.time_zone, next.start_month, id, userId, ...bindings),
  ]

  if (shifted) {
    // A later statement in a batch sees an earlier one's write, so gating the
    // shift on the row already carrying the new first month is what keeps it
    // from applying when the settings update did not.
    statements.push(
      db
        .prepare(
          `update active_ranges set joined_month = ?
           where id = ? and exists (select 1 from subscriptions where id = ? and user_id = ? and start_month = ?)`,
        )
        .bind(next.start_month, shifted.id, id, userId, next.start_month),
    )
  }

  const [applied] = await db.batch(statements)

  if ((applied.meta.changes ?? 0) === 0) {
    // A row `get` proved exists, and a write that changed nothing: a clause
    // that held at read time no longer holds. Either the row is gone, which is
    // the ordinary 404, or a bound now binds, which is the ordinary 400.
    const after = await get(db, id, userId)
    if (!after) return { ok: false, kind: 'not-found' }
    const lost = await deriveRefusal(db, id, {
      currency: next.currency !== after.currency,
      laterMonth: next.start_month > after.startMonth ? next.start_month : null,
      shifted,
    })
    return {
      ok: false,
      kind: 'refused',
      ...(lost ?? { field: 'start_month', message: `start_month cannot be later than ${after.startMonth}` }),
    }
  }

  return {
    ok: true,
    subscription: {
      ...existing,
      name: next.name,
      currency: next.currency,
      locale: next.locale,
      timeZone: next.time_zone,
      startMonth: next.start_month,
    },
  }
}

async function readOwnerRanges(db: D1Database, id: string, userId: string): Promise<OwnerRangeRow[]> {
  const result = await db.prepare(OWNER_RANGES_SQL).bind(id, userId).all<OwnerRangeRow>()
  return result.results
}

/**
 * The owner's ranges are editable through the participant route, so the set
 * that would follow the shift is put through the same rules that route applies
 * before anything is written. The one violation a person can actually ask for,
 * an opening range whose leave month the new first month would pass, is
 * refused above as a named kind. Every other violation the domain can report
 * is either refused earlier by the dependent minimums or made impossible by
 * the non-overlap rule, so reaching one means a stored invariant broke rather
 * than that someone asked for something the product forbids.
 */
function assertOwnerRangesSurvive(ranges: OwnerRangeRow[], shifted: OwnerRangeRow, startMonth: string): void {
  const prospective: ActiveRange[] = ranges.map((range) => ({
    joinedMonth: range.id === shifted.id ? startMonth : range.joined_month,
    leftMonth: range.left_month,
  }))

  const violation = validateActiveRanges(prospective, startMonth)
  if (violation) throw new Error(`owner ranges would not survive the first-month shift: ${violation}`)
}

/**
 * The sentence a refusal carries, never the decision to refuse. Currency comes
 * first: it is the coarser rule and the one the client renders as a disabled
 * field, so when both families bind it is the one worth naming.
 */
async function deriveRefusal(
  db: D1Database,
  id: string,
  intent: { currency: boolean; laterMonth: string | null; shifted: OwnerRangeRow | null },
): Promise<SubscriptionRefusal | null> {
  if (intent.currency) {
    const amounts = await db.prepare(AMOUNTS_SQL).bind(id, id, id).first<AmountsRow>()
    if (amounts && (amounts.has_price || amounts.has_payment || amounts.has_schedule)) {
      return { field: 'currency', message: CURRENCY_LOCKED }
    }
  }

  if (intent.laterMonth) {
    const minimums = await db
      .prepare(MINIMUMS_SQL)
      .bind(id, intent.shifted?.id ?? '', id, id, id, id)
      .first<MinimumsRow>()
    if (minimums) return firstMonthRefusal(minimums, intent.shifted, intent.laterMonth)
  }

  return null
}

/** Every member of one subscription, as a subquery, carrying the whole ownership chain. */
const OWNED_MEMBER_IDS = `select m.id from members m
    join subscriptions s on s.id = m.subscription_id
   where s.id = ? and s.user_id = ?`

const OWNED_SUBSCRIPTION_IDS = `select s.id from subscriptions s where s.id = ? and s.user_id = ?`

/**
 * Removes the subscription and everything reachable from it as one write, or
 * nothing at all. The statements run deepest first, so no intermediate point
 * leaves an orphan and the declared cascades fire on an empty set. Ownership
 * lives inside every statement rather than in a read before them: a foreign or
 * unknown id makes every subquery empty, deletes nothing anywhere, and leaves
 * the final statement reporting no change, which is the caller's 404.
 */
export async function remove(db: D1Database, id: string, userId: string): Promise<boolean> {
  const results = await db.batch(deletionStatements(db, id, userId))

  return (results[results.length - 1].meta.changes ?? 0) > 0
}

/**
 * The eight statements the deletion is, in the order it runs them. Exported so
 * a test can put the real list inside a batch of its own rather than a copy of
 * it that could drift from this one.
 */
export function deletionStatements(db: D1Database, id: string, userId: string): D1PreparedStatement[] {
  return [
    db
      .prepare(
        `delete from recurring_exceptions where schedule_id in (
           select r.id from recurring_schedules r
             join members m on m.id = r.member_id
             join subscriptions s on s.id = m.subscription_id
            where s.id = ? and s.user_id = ?)`,
      )
      .bind(id, userId),
    db.prepare(`delete from recurring_schedules where member_id in (${OWNED_MEMBER_IDS})`).bind(id, userId),
    db.prepare(`delete from payments where member_id in (${OWNED_MEMBER_IDS})`).bind(id, userId),
    db.prepare(`delete from active_ranges where member_id in (${OWNED_MEMBER_IDS})`).bind(id, userId),
    db.prepare(`delete from members where id in (${OWNED_MEMBER_IDS})`).bind(id, userId),
    db.prepare(`delete from price_history where subscription_id in (${OWNED_SUBSCRIPTION_IDS})`).bind(id, userId),
    db.prepare(`delete from break_months where subscription_id in (${OWNED_SUBSCRIPTION_IDS})`).bind(id, userId),
    db.prepare('delete from subscriptions where id = ? and user_id = ?').bind(id, userId),
  ]
}
