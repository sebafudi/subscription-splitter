import { describe, expect, it } from 'vitest'
import { remove, update } from './subscriptions'

/**
 * Every repository function here takes `db` as a parameter, so a stub that
 * records what was prepared is enough to pin the two structural claims an
 * integration test against a real binding cannot make: that a write is one
 * batch rather than several statements, and what the repository does when a
 * batched update reports that it changed nothing. D1 runs a batch's statements
 * sequentially and non-concurrently, so the lost race that branch answers has
 * no integration fixture at all.
 */
type StubRow = Record<string, unknown>

type StubOptions = {
  subscriptions?: Array<StubRow | null>
  ownerRanges?: StubRow[]
  amounts?: StubRow
  minimums?: StubRow
  changes?: number
}

class StubStatement {
  bindings: unknown[] = []

  constructor(
    private readonly db: StubDatabase,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]): StubStatement {
    this.bindings = values
    return this
  }

  async first<T>(): Promise<T | null> {
    return this.db.answerFirst(this.sql) as T | null
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.db.answerAll(this.sql) as T[] }
  }

  async run(): Promise<{ meta: { changes: number } }> {
    this.db.runs.push(this)
    return { meta: { changes: 1 } }
  }
}

class StubDatabase {
  readonly prepared: StubStatement[] = []
  readonly batches: StubStatement[][] = []
  readonly runs: StubStatement[] = []
  private subscriptionReads = 0

  constructor(private readonly options: StubOptions) {}

  prepare(sql: string): StubStatement {
    const statement = new StubStatement(this, sql)
    this.prepared.push(statement)
    return statement
  }

  async batch(statements: StubStatement[]): Promise<Array<{ meta: { changes: number } }>> {
    this.batches.push(statements)
    return statements.map(() => ({ meta: { changes: this.options.changes ?? 1 } }))
  }

  answerFirst(sql: string): StubRow | null {
    if (sql.includes('select * from subscriptions')) {
      const answers = this.options.subscriptions ?? []
      const answer = answers[Math.min(this.subscriptionReads, answers.length - 1)] ?? null
      this.subscriptionReads += 1
      return answer
    }
    if (sql.includes('has_price')) return this.options.amounts ?? null
    if (sql.includes('min_joined')) return this.options.minimums ?? null
    return null
  }

  answerAll(sql: string): StubRow[] {
    if (sql.includes('is_owner = 1')) return this.options.ownerRanges ?? []
    return []
  }

  asDatabase(): D1Database {
    return this as unknown as D1Database
  }
}

const storedRow: StubRow = {
  id: 'sub-1',
  user_id: 'user-1',
  name: 'Family plan',
  currency: 'PLN',
  locale: 'pl-PL',
  time_zone: 'Europe/Warsaw',
  start_month: '2026-01',
  created_at: '2026-01-01T00:00:00.000Z',
}

/** The order the deletion walks, deepest first, as the plan documents it. */
const DELETE_ORDER = [
  'delete from recurring_exceptions',
  'delete from recurring_schedules',
  'delete from payments',
  'delete from active_ranges',
  'delete from members',
  'delete from price_history',
  'delete from break_months',
  'delete from subscriptions',
]

describe('remove', () => {
  it('issues exactly one batch of the eight deletes, deepest first, and no other write', async () => {
    const db = new StubDatabase({})

    await remove(db.asDatabase(), 'sub-1', 'user-1')

    expect(db.batches).toHaveLength(1)
    expect(db.runs).toHaveLength(0)

    const statements = db.batches[0]
    expect(statements).toHaveLength(8)
    statements.forEach((statement, index) => {
      expect(statement.sql.startsWith(DELETE_ORDER[index]), `statement ${index + 1}: ${statement.sql}`).toBe(true)
    })
  })

  it('carries the owning account into every statement, so a foreign id deletes nothing anywhere', async () => {
    const db = new StubDatabase({})

    await remove(db.asDatabase(), 'sub-1', 'user-1')

    for (const statement of db.batches[0]) {
      expect(statement.sql).toContain('user_id = ?')
      expect(statement.bindings).toEqual(['sub-1', 'user-1'])
    }
  })

  it('reports whether the subscription itself went, which is the caller 204 or 404', async () => {
    const deleted = new StubDatabase({ changes: 1 }).asDatabase()
    expect(await remove(deleted, 'sub-1', 'user-1')).toBe(true)

    const missing = new StubDatabase({ changes: 0 }).asDatabase()
    expect(await remove(missing, 'sub-1', 'user-1')).toBe(false)
  })
})

describe('update', () => {
  it('issues exactly one batch and no separate write', async () => {
    const db = new StubDatabase({ subscriptions: [storedRow] })

    const result = await update(db.asDatabase(), 'sub-1', 'user-1', { name: 'Renamed plan' })

    expect(result).toEqual({
      ok: true,
      subscription: expect.objectContaining({ id: 'sub-1', name: 'Renamed plan' }),
    })
    expect(db.batches).toHaveLength(1)
    expect(db.batches[0]).toHaveLength(1)
    expect(db.runs).toHaveLength(0)
  })

  it('answers 404 material when a batch that changed nothing is followed by a row that is gone', async () => {
    const db = new StubDatabase({ subscriptions: [storedRow, null], changes: 0 })

    const result = await update(db.asDatabase(), 'sub-1', 'user-1', { currency: 'EUR' })

    expect(result).toEqual({ ok: false, kind: 'not-found' })
  })

  it('answers a refusal naming currency when a batch that changed nothing is followed by a row that stands', async () => {
    const db = new StubDatabase({
      subscriptions: [storedRow, storedRow],
      amounts: { has_price: 0, has_payment: 0, has_schedule: 0 },
      changes: 0,
    })

    const result = await update(db.asDatabase(), 'sub-1', 'user-1', { currency: 'EUR' })

    expect(result).toMatchObject({ ok: false, kind: 'refused' })
  })

  it('gives currency precedence over the first month when the lost race could name either', async () => {
    const db = new StubDatabase({
      subscriptions: [storedRow, storedRow],
      ownerRanges: [{ id: 'range-1', joined_month: '2026-01', left_month: null }],
      amounts: { has_price: 1, has_payment: 0, has_schedule: 0 },
      minimums: {
        min_joined: '2026-02',
        min_price: '2026-02',
        min_break: null,
        min_payment: null,
        min_schedule: null,
      },
      changes: 0,
    })

    const result = await update(db.asDatabase(), 'sub-1', 'user-1', { currency: 'EUR', start_month: '2026-03' })

    expect(result).toEqual({
      ok: false,
      kind: 'refused',
      field: 'currency',
      message: 'currency cannot change while prices, payments or standing orders are recorded',
    })
  })
})
