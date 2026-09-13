import { useState } from 'react'
import { ApiError, SignedOutError, createBreakMonth, deleteBreakMonth } from '../api'
import { SKIPPED_MONTHS } from './sections'

type Props = {
  subscriptionId: string
  breakMonths: string[]
  onChanged: () => void
  onSignedOut: () => void
}

/** A skipped month costs nobody anything; it is not a price of zero, and the two are kept apart. */
export function BreakMonths({ subscriptionId, breakMonths, onChanged, onSignedOut }: Props) {
  const [month, setMonth] = useState('')
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) return onSignedOut()
      setError(
        err instanceof ApiError ? { field: err.field, message: err.message } : { message: 'That did not work.' },
      )
    }
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    await run(async () => {
      await createBreakMonth(subscriptionId, month.trim())
      setMonth('')
    })
  }

  return (
    <section>
      <h3 id={SKIPPED_MONTHS.id} className="section-anchor">
        {SKIPPED_MONTHS.title}
      </h3>

      {breakMonths.length === 0 ? (
        <p>No months skipped.</p>
      ) : (
        <ul className="row-list">
          {breakMonths.map((value) => (
            <li key={value} className="row">
              <div>
                <strong>{value}</strong>
                <div className="row-detail">costs nobody anything</div>
              </div>
              <div className="button-row">
                <button type="button" onClick={() => run(() => deleteBreakMonth(subscriptionId, value))}>
                  Unskip
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} noValidate className="panel-form">
        <label htmlFor="break_month">Skip a month (YYYY-MM)</label>
        <input
          id="break_month"
          required
          placeholder="2026-02"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />

        {error && (
          <p role="alert" className="field-error">
            {error.field ? `${error.field}: ${error.message}` : error.message}
          </p>
        )}

        <button type="submit">Mark as skipped</button>
      </form>
    </section>
  )
}
