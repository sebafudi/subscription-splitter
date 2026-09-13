import { useEffect, useRef, useState } from 'react'
import { ApiError, SignedOutError, patchSubscription, type Subscription } from '../api'
import {
  currencyLockHint,
  firstMonthFloor,
  storedValues,
  subscriptionChanges,
} from '../screens/subscriptionEdits'
import { Field } from './ui/Field'
import { labelFor, messageWithLabel, subscriptionFieldLabels } from './ui/fieldLabels'
import { CONNECTION_FAILURE, FormAlert } from './ui/FormAlert'
import { MonthField } from './ui/MonthField'

type Props = {
  subscription: Subscription
  /** True once the subscription carries a price, a payment or a standing order. */
  currencyLocked: boolean
  /** The panel's own error line, owned by the screen so the panel can take its red left rule. */
  alert: string | null
  onAlert: (message: string | null) => void
  onSaved: (subscription: Subscription) => void
  /** A submit that changes nothing closes the panel as Cancel would, with no request and no sentence. */
  onUnchanged: () => void
  onCancel: () => void
  onSignedOut: () => void
}

/**
 * The five editable settings of a subscription, in the same panel machinery
 * every other form on the screen uses. Only the settings that differ from the
 * stored row travel over the wire, so a save reports itself only when there was
 * something to save.
 */
export function SubscriptionSettings({
  subscription,
  currencyLocked,
  alert,
  onAlert,
  onSaved,
  onUnchanged,
  onCancel,
  onSignedOut,
}: Props) {
  const stored = storedValues(subscription)
  const [name, setName] = useState(stored.name)
  const [currency, setCurrency] = useState(stored.currency)
  const [locale, setLocale] = useState(stored.locale)
  const [timeZone, setTimeZone] = useState(stored.timeZone)
  const [startMonth, setStartMonth] = useState(stored.startMonth)
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

    const changes = subscriptionChanges(subscription, { name, currency, locale, timeZone, startMonth })
    if (!changes) {
      onUnchanged()
      return
    }

    setSubmitting(true)
    try {
      onSaved(await patchSubscription(subscription.id, changes))
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

      <Field id="settings_name" label="Name" error={errorFor('name')}>
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

      <Field
        id="settings_currency"
        label="Currency"
        span={false}
        hint={currencyLocked ? currencyLockHint(subscription.currency) : undefined}
        error={errorFor('currency')}
      >
        {(control) => (
          <input
            {...control}
            required
            disabled={submitting || currencyLocked}
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
        )}
      </Field>

      <Field id="settings_locale" label="Locale" span={false} error={errorFor('locale')}>
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

      <Field
        id="settings_time_zone"
        label="Time zone"
        hint="Decides which month counts as the current one. Balances follow it."
        error={errorFor('time_zone')}
      >
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
        id="settings_start_month"
        label="First month"
        hint="Can move back up to ten years, or later up to the earliest recorded month."
        error={errorFor('start_month')}
      >
        {(control) => (
          <MonthField
            {...control}
            required
            min={firstMonthFloor(subscription.timeZone)}
            locale={subscription.locale}
            timeZone={subscription.timeZone}
            disabled={submitting}
            value={startMonth}
            onChange={setStartMonth}
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
          Save changes
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
