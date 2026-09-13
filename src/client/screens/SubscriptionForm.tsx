import { useEffect, useRef, useState } from 'react'
import { ApiError, SignedOutError, createSubscription, type Subscription } from '../api'
import { Field } from '../components/ui/Field'
import { subscriptionFieldLabels, labelFor, messageWithLabel } from '../components/ui/fieldLabels'
import { CONNECTION_FAILURE, FormAlert } from '../components/ui/FormAlert'
import { MonthField } from '../components/ui/MonthField'
import { usableLocale, usableTimeZone } from '../components/ui/monthControl'
import { currentMonth } from '../../domain/months'

const DEFAULT_LOCALE = 'pl-PL'
const DEFAULT_TIME_ZONE = 'Europe/Warsaw'

/** The floor the server applies on create: January ten years before the current year. */
function firstMonthFloor(timeZone: string): string {
  return `${String(Number(currentMonth(timeZone).slice(0, 4)) - 10).padStart(4, '0')}-01`
}

type Props = {
  /** The panel's own error line, owned by the screen so the panel can take its red left rule. */
  alert: string | null
  onAlert: (message: string | null) => void
  onCreated: (subscription: Subscription) => void
  onCancel: () => void
  onSignedOut: () => void
}

export function SubscriptionForm({ alert, onAlert, onCreated, onCancel, onSignedOut }: Props) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('PLN')
  const [locale, setLocale] = useState(DEFAULT_LOCALE)
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE)
  const [startMonth, setStartMonth] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Counts refusals rather than holding one, so a second identical failure still moves focus.
  const [refusals, setRefusals] = useState(0)
  const form = useRef<HTMLFormElement>(null)
  const alertLine = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (refusals === 0) return
    const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    ;(invalid ?? alertLine.current)?.focus()
  }, [refusals])

  // Both settings are free text until the form is submitted, so the month
  // control reads them through the fallback rather than on trust.
  const formLocale = usableLocale(locale, DEFAULT_LOCALE)
  const formTimeZone = usableTimeZone(timeZone, DEFAULT_TIME_ZONE)

  function errorFor(wireName: string): string | undefined {
    return fieldError?.field === wireName ? fieldError.message : undefined
  }

  function refuse(field: string | undefined, message: string) {
    const named = field && labelFor(subscriptionFieldLabels, field) ? field : undefined
    setFieldError(named ? { field: named, message: messageWithLabel(subscriptionFieldLabels, named, message) } : null)
    onAlert(named ? null : message)
    setRefusals((count) => count + 1)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFieldError(null)
    onAlert(null)
    setSubmitting(true)
    try {
      const created = await createSubscription({
        name,
        currency,
        locale,
        time_zone: timeZone,
        start_month: startMonth,
        ...(ownerName.trim() ? { owner_name: ownerName.trim() } : {}),
      })
      onCreated(created)
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      if (err instanceof ApiError) {
        refuse(err.field, err.message)
      } else {
        refuse(undefined, CONNECTION_FAILURE)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      ref={form}
      onSubmit={handleSubmit}
      noValidate
      className="panel-grid"
      aria-busy={submitting || undefined}
    >
      <FormAlert message={alert} ref={alertLine} />

      <Field id="sub_name" label="Name" error={errorFor('name')}>
        {(control) => (
          <input
            {...control}
            required
            disabled={submitting}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </Field>

      <Field id="sub_currency" label="Currency" span={false} error={errorFor('currency')}>
        {(control) => (
          <input
            {...control}
            required
            disabled={submitting}
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
        )}
      </Field>

      <Field id="sub_locale" label="Locale" span={false} error={errorFor('locale')}>
        {(control) => (
          <input
            {...control}
            required
            disabled={submitting}
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          />
        )}
      </Field>

      <Field id="sub_time_zone" label="Time zone" error={errorFor('time_zone')}>
        {(control) => (
          <input
            {...control}
            required
            disabled={submitting}
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
          />
        )}
      </Field>

      <Field
        id="sub_start_month"
        label="First month"
        error={errorFor('start_month')}
      >
        {(control) => (
          <MonthField
            {...control}
            required
            min={firstMonthFloor(formTimeZone)}
            locale={formLocale}
            timeZone={formTimeZone}
            disabled={submitting}
            value={startMonth}
            onChange={setStartMonth}
          />
        )}
      </Field>

      <Field
        id="sub_owner_name"
        label="Your name on this plan"
        hint="How you appear in the participant list"
        error={errorFor('owner_name')}
      >
        {(control) => (
          <input
            {...control}
            placeholder="Me"
            disabled={submitting}
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
          />
        )}
      </Field>

      <div className="panel-actions">
        <button
          type="submit"
          className="btn-primary"
          aria-busy={submitting || undefined}
          aria-disabled={submitting || undefined}
        >
          Create subscription
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
