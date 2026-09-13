import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '../../domain/money'
import { ApiError, SignedOutError, createPrice, deletePrice, type PriceEntry } from '../api'
import { formatMonth } from '../format'
import { PRICE_HISTORY } from './sections'
import { withoutApiInstruction } from './ui/apiMessages'
import { ConfirmStrip } from './ui/ConfirmStrip'
import { DisclosurePanel } from './ui/DisclosurePanel'
import { Field } from './ui/Field'
import { labelFor, messageWithLabel, priceFieldLabels } from './ui/fieldLabels'
import { MonthField } from './ui/MonthField'
import { CONNECTION_FAILURE, FormAlert } from './ui/FormAlert'
import { LedgerEntry } from './ui/LedgerEntry'
import { Money } from './ui/Money'
import { SectionAlert } from './ui/SectionAlert'
import { SectionHeader } from './ui/SectionHeader'
import { StatusLine } from './ui/StatusLine'
import { useSectionStatus } from './ui/useSectionStatus'

const ADD_PANEL_ID = 'price-add-panel'
const ADD_BUTTON_ID = 'price-add-button'

type Props = {
  subscriptionId: string
  prices: PriceEntry[]
  currency: string
  locale: string
  startMonth: string
  timeZone: string
  onChanged: () => void
  onSignedOut: () => void
}

/** Major units in the field, minor units over the wire; the conversion happens here and nowhere else. */
function toMinor(value: string): number {
  return Math.round(Number.parseFloat(value) * 100)
}

/**
 * The second step of a price deletion, which only the server can reach: it
 * answers 409 with the months that would lose their price, and that message
 * becomes the strip's own question.
 */
type PendingDelete = {
  entry: PriceEntry
  /** Null on the first step; the server's refusal once it has named the months. */
  refusal: string | null
}

export function PriceHistory({
  subscriptionId,
  prices,
  currency,
  locale,
  startMonth,
  timeZone,
  onChanged,
  onSignedOut,
}: Props) {
  const [sectionError, setSectionError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addAlert, setAddAlert] = useState<string | null>(null)
  const [addKey, setAddKey] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const status = useSectionStatus()

  useEffect(() => {
    if (!focusTarget) return
    document.getElementById(focusTarget)?.focus()
    setFocusTarget(null)
  }, [focusTarget])

  const money = (minor: number) => formatMoney(minor, locale, currency)

  function closeAdd() {
    setAddOpen(false)
    setAddAlert(null)
    setAddKey((key) => key + 1)
    setFocusTarget(ADD_BUTTON_ID)
  }

  /**
   * The first attempt carries no confirmation, so the server refuses it with
   * 409 and the months that would lose their price. The strip stays open and
   * asks again with the server's own words; nothing else on the screen stops
   * working while it is open.
   */
  async function handleDelete(entry: PriceEntry, confirm: boolean) {
    try {
      await deletePrice(subscriptionId, entry.id, confirm)
      setPendingDelete(null)
      setSectionError(null)
      setFocusTarget(PRICE_HISTORY.id)
      status.confirm('Price deleted', null)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      if (err instanceof ApiError && err.status === 409 && err.months) {
        setPendingDelete({ entry, refusal: err.message })
        return
      }
      // The entry is still there, so focus goes back to the button that opened the strip.
      setPendingDelete(null)
      setSectionError(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
      setFocusTarget(`price-delete-${entry.id}`)
    }
  }

  return (
    <section aria-labelledby={PRICE_HISTORY.id}>
      <SectionHeader
        id={PRICE_HISTORY.id}
        title={PRICE_HISTORY.title}
        count={prices.length}
        status={<StatusLine message={status.message} />}
        action={
          !addOpen && (
            <button
              type="button"
              className="btn-primary"
              id={ADD_BUTTON_ID}
              aria-expanded={addOpen}
              aria-controls={ADD_PANEL_ID}
              onClick={() => {
                status.clear()
                setAddOpen(true)
              }}
            >
              {PRICE_HISTORY.action}
            </button>
          )
        }
      >
        <SectionAlert message={sectionError} onDismiss={() => setSectionError(null)} />
      </SectionHeader>

      <DisclosurePanel
        id={ADD_PANEL_ID}
        open={addOpen}
        title="Record a price"
        onCancel={closeAdd}
        invalid={addAlert !== null}
      >
        <PriceForm
          key={addKey}
          subscriptionId={subscriptionId}
          locale={locale}
          startMonth={startMonth}
          timeZone={timeZone}
          alert={addAlert}
          onAlert={setAddAlert}
          onCreated={(created) => {
            closeAdd()
            setSectionError(null)
            status.confirm('Price recorded', created.id)
            onChanged()
          }}
          onCancel={closeAdd}
          onSignedOut={onSignedOut}
        />
      </DisclosurePanel>

      {prices.length === 0 ? (
        <p className="section-empty t-body soft">
          No price recorded yet, so every month currently costs nothing.
        </p>
      ) : (
        <ul className="entry-list">
          {prices.map((entry) => (
            <li key={entry.id}>
              <LedgerEntry
                highlighted={status.highlightedId === entry.id}
                primary={
                  <>
                    <Money value={money(entry.amount)} /> a month
                  </>
                }
                figure={
                  <span className="t-small soft">from {formatMonth(entry.effectiveFrom, locale)}</span>
                }
                confirm={
                  pendingDelete?.entry.id === entry.id ? (
                    <ConfirmStrip
                      key={pendingDelete.refusal === null ? 'ask' : 'anyway'}
                      question={
                        pendingDelete.refusal === null
                          ? `Delete the ${money(entry.amount)} price from ${formatMonth(entry.effectiveFrom, locale)}?`
                          : `${withoutApiInstruction(pendingDelete.refusal)} Delete anyway?`
                      }
                      confirmLabel={pendingDelete.refusal === null ? 'Delete' : 'Delete anyway'}
                      onConfirm={() => void handleDelete(entry, pendingDelete.refusal !== null)}
                      onKeep={() => {
                        setPendingDelete(null)
                        setFocusTarget(`price-delete-${entry.id}`)
                      }}
                    />
                  ) : undefined
                }
                actions={
                  <button
                    type="button"
                    className="btn-link t-small"
                    id={`price-delete-${entry.id}`}
                    onClick={() => {
                      status.clear()
                      setPendingDelete({ entry, refusal: null })
                    }}
                  >
                    Delete
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type FormProps = {
  subscriptionId: string
  locale: string
  startMonth: string
  timeZone: string
  alert: string | null
  onAlert: (message: string | null) => void
  onCreated: (entry: PriceEntry) => void
  onCancel: () => void
  onSignedOut: () => void
}

function PriceForm({
  subscriptionId,
  locale,
  startMonth,
  timeZone,
  alert,
  onAlert,
  onCreated,
  onCancel,
  onSignedOut,
}: FormProps) {
  const [month, setMonth] = useState('')
  const [amount, setAmount] = useState('')
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [refusals, setRefusals] = useState(0)
  const form = useRef<HTMLFormElement>(null)
  const alertLine = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (refusals === 0) return
    const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    ;(invalid ?? alertLine.current)?.focus()
  }, [refusals])

  function refuse(field: string | undefined, message: string) {
    const named = field && labelFor(priceFieldLabels, field) ? field : undefined
    setFieldError(named ? { field: named, message: messageWithLabel(priceFieldLabels, named, message) } : null)
    onAlert(named ? null : message)
    setRefusals((count) => count + 1)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFieldError(null)
    onAlert(null)

    const minor = toMinor(amount)
    if (!Number.isFinite(minor)) {
      refuse('amount', 'Enter an amount such as 100.00')
      return
    }

    setSubmitting(true)
    try {
      onCreated(await createPrice(subscriptionId, month.trim(), minor))
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      if (err instanceof ApiError) {
        // A price already recorded for that month is a rule the server names,
        // so it reads as the whole-form error rather than against a field.
        if (err.status === 409) refuse(undefined, err.message)
        else refuse(err.field, err.message)
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

      <Field
        id="price_effective_from"
        label="Effective from"
        span={false}
        error={fieldError?.field === 'effective_from' ? fieldError.message : undefined}
      >
        {(control) => (
          <MonthField
            {...control}
            required
            min={startMonth}
            locale={locale}
            timeZone={timeZone}
            disabled={submitting}
            value={month}
            onChange={setMonth}
          />
        )}
      </Field>

      <Field
        id="price_amount"
        label="Amount per month"
        hint="Amount, like 100.00"
        span={false}
        error={fieldError?.field === 'amount' ? fieldError.message : undefined}
      >
        {(control) => (
          <input
            {...control}
            required
            inputMode="decimal"
            placeholder="100.00"
            disabled={submitting}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
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
          Record this price
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
