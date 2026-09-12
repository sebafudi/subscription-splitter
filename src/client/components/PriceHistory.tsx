import { useState } from 'react'
import { formatMoney } from '../../domain/money'
import { ApiError, SignedOutError, createPrice, deletePrice, type PriceEntry } from '../api'

type Props = {
  subscriptionId: string
  prices: PriceEntry[]
  currency: string
  locale: string
  onChanged: () => void
  onSignedOut: () => void
}

/** Major units in the field, minor units over the wire; the conversion happens here and nowhere else. */
function toMinor(value: string): number {
  return Math.round(Number.parseFloat(value) * 100)
}

export function PriceHistory({ subscriptionId, prices, currency, locale, onChanged, onSignedOut }: Props) {
  const [month, setMonth] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; months: string[]; message: string } | null>(null)

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const minor = toMinor(amount)
    if (!Number.isFinite(minor)) {
      setError({ field: 'amount', message: 'Enter an amount such as 100.00' })
      return
    }
    try {
      await createPrice(subscriptionId, month.trim(), minor)
      setMonth('')
      setAmount('')
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) return onSignedOut()
      setError(
        err instanceof ApiError ? { field: err.field, message: err.message } : { message: 'Could not save the price.' },
      )
    }
  }

  /**
   * The first attempt carries no confirmation, so the server refuses it with
   * 409 and the months that would lose their price. That refusal becomes an
   * inline confirmation in this list rather than a browser dialogue, and
   * nothing else on the screen stops working while it is open.
   */
  async function handleDelete(entry: PriceEntry, confirm: boolean) {
    setError(null)
    try {
      await deletePrice(subscriptionId, entry.id, confirm)
      setPendingDelete(null)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) return onSignedOut()
      if (err instanceof ApiError && err.status === 409 && err.months) {
        setPendingDelete({ id: entry.id, months: err.months, message: err.message })
        return
      }
      setError(err instanceof ApiError ? { message: err.message } : { message: 'Could not delete the price.' })
    }
  }

  return (
    <section>
      <h3>Price history</h3>

      {prices.length === 0 ? (
        <p>No price recorded yet, so every month currently costs nothing.</p>
      ) : (
        <ul className="row-list">
          {prices.map((entry) => (
            <li key={entry.id} className="row">
              <div>
                <strong>{formatMoney(entry.amount, locale, currency)}</strong>
                <div className="row-detail">from {entry.effectiveFrom} onward</div>
                {pendingDelete?.id === entry.id && (
                  <div role="alert" className="inline-confirm">
                    <p>
                      Deleting this entry leaves {pendingDelete.months.length} month(s) with no price:{' '}
                      {pendingDelete.months.join(', ')}. Those months will cost nothing and every total will move.
                    </p>
                    <div className="button-row">
                      <button type="button" onClick={() => handleDelete(entry, true)}>
                        Delete anyway
                      </button>
                      <button type="button" onClick={() => setPendingDelete(null)}>
                        Keep it
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="button-row">
                <button type="button" onClick={() => handleDelete(entry, false)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} noValidate className="panel-form">
        <label htmlFor="price_month">Effective from (YYYY-MM)</label>
        <input
          id="price_month"
          required
          placeholder="2026-01"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />

        <label htmlFor="price_amount">Amount per month</label>
        <input
          id="price_amount"
          required
          inputMode="decimal"
          placeholder="100.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        {error && (
          <p role="alert" className="field-error">
            {error.field ? `${error.field}: ${error.message}` : error.message}
          </p>
        )}

        <button type="submit">Record this price</button>
      </form>
    </section>
  )
}
