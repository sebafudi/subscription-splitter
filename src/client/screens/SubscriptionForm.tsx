import { useState } from 'react'
import { ApiError, SignedOutError, createSubscription, type Subscription } from '../api'

type Props = {
  onCreated: (subscription: Subscription) => void
  onSignedOut: () => void
}

export function SubscriptionForm({ onCreated, onSignedOut }: Props) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('PLN')
  const [locale, setLocale] = useState('pl-PL')
  const [timeZone, setTimeZone] = useState('Europe/Warsaw')
  const [startMonth, setStartMonth] = useState('')
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const created = await createSubscription({
        name,
        currency,
        locale,
        time_zone: timeZone,
        start_month: startMonth,
      })
      onCreated(created)
      setName('')
      setStartMonth('')
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setError(err instanceof ApiError ? { field: err.field, message: err.message } : { message: 'Could not create the subscription.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="subscription-form">
      <h2>New subscription</h2>

      <label htmlFor="name">Name</label>
      <input id="name" required value={name} onChange={(event) => setName(event.target.value)} />

      <label htmlFor="currency">Currency</label>
      <input id="currency" required value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />

      <label htmlFor="locale">Locale</label>
      <input id="locale" required value={locale} onChange={(event) => setLocale(event.target.value)} />

      <label htmlFor="time_zone">Time zone</label>
      <input id="time_zone" required value={timeZone} onChange={(event) => setTimeZone(event.target.value)} />

      <label htmlFor="start_month">Start month (YYYY-MM)</label>
      <input
        id="start_month"
        required
        placeholder="2026-01"
        value={startMonth}
        onChange={(event) => setStartMonth(event.target.value)}
      />

      {error && (
        <p role="alert" className="field-error">
          {error.field ? `${error.field}: ${error.message}` : error.message}
        </p>
      )}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create subscription'}
      </button>
    </form>
  )
}
