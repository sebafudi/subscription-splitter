import { useEffect, useRef, useState } from 'react'
import { ApiError, SignedOutError, createBreakMonth, deleteBreakMonth } from '../api'
import { formatMonth } from '../format'
import { SKIPPED_MONTHS } from './sections'
import { DisclosurePanel } from './ui/DisclosurePanel'
import { Field } from './ui/Field'
import { breakMonthFieldLabels, labelFor, messageWithLabel } from './ui/fieldLabels'
import { CONNECTION_FAILURE, FormAlert } from './ui/FormAlert'
import { LedgerEntry } from './ui/LedgerEntry'
import { SectionAlert } from './ui/SectionAlert'
import { SectionHeader } from './ui/SectionHeader'
import { StatusLine } from './ui/StatusLine'
import { useSectionStatus } from './ui/useSectionStatus'

const ADD_PANEL_ID = 'break-month-add-panel'
const ADD_BUTTON_ID = 'break-month-add-button'

type Props = {
  subscriptionId: string
  breakMonths: string[]
  locale: string
  onChanged: () => void
  onSignedOut: () => void
}

/** A skipped month costs nobody anything; it is not a price of zero, and the two are kept apart. */
export function BreakMonths({ subscriptionId, breakMonths, locale, onChanged, onSignedOut }: Props) {
  const [sectionError, setSectionError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addAlert, setAddAlert] = useState<string | null>(null)
  const [addKey, setAddKey] = useState(0)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const status = useSectionStatus()

  useEffect(() => {
    if (!focusTarget) return
    document.getElementById(focusTarget)?.focus()
    setFocusTarget(null)
  }, [focusTarget])

  function closeAdd() {
    setAddOpen(false)
    setAddAlert(null)
    setAddKey((key) => key + 1)
    setFocusTarget(ADD_BUTTON_ID)
  }

  /** An unskip happens outside every panel, so its refusal belongs to the section alert. */
  async function unskip(month: string) {
    try {
      await deleteBreakMonth(subscriptionId, month)
      setSectionError(null)
      setFocusTarget(SKIPPED_MONTHS.id)
      status.confirm('Month unskipped', null)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setSectionError(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
    }
  }

  return (
    <section aria-labelledby={SKIPPED_MONTHS.id}>
      <SectionHeader
        id={SKIPPED_MONTHS.id}
        title={SKIPPED_MONTHS.title}
        count={breakMonths.length}
        subtitle={SKIPPED_MONTHS.subtitle}
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
              {SKIPPED_MONTHS.action}
            </button>
          )
        }
      >
        <SectionAlert message={sectionError} onDismiss={() => setSectionError(null)} />
      </SectionHeader>

      <DisclosurePanel
        id={ADD_PANEL_ID}
        open={addOpen}
        title="Skip a month"
        onCancel={closeAdd}
        invalid={addAlert !== null}
      >
        <BreakMonthForm
          key={addKey}
          subscriptionId={subscriptionId}
          alert={addAlert}
          onAlert={setAddAlert}
          onCreated={(month) => {
            closeAdd()
            setSectionError(null)
            status.confirm('Month skipped', month)
            onChanged()
          }}
          onCancel={closeAdd}
          onSignedOut={onSignedOut}
        />
      </DisclosurePanel>

      {breakMonths.length === 0 ? (
        <p className="section-empty t-body soft">No months skipped.</p>
      ) : (
        <ul className="entry-list">
          {breakMonths.map((month) => (
            <li key={month}>
              <LedgerEntry
                highlighted={status.highlightedId === month}
                primary={formatMonth(month, locale)}
                actions={
                  <button type="button" className="btn-link t-small" onClick={() => void unskip(month)}>
                    Unskip
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
  alert: string | null
  onAlert: (message: string | null) => void
  onCreated: (month: string) => void
  onCancel: () => void
  onSignedOut: () => void
}

function BreakMonthForm({ subscriptionId, alert, onAlert, onCreated, onCancel, onSignedOut }: FormProps) {
  const [month, setMonth] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
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
    const named = field && labelFor(breakMonthFieldLabels, field) ? field : undefined
    setFieldError(named ? messageWithLabel(breakMonthFieldLabels, named, message) : null)
    onAlert(named ? null : message)
    setRefusals((count) => count + 1)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFieldError(null)
    onAlert(null)
    setSubmitting(true)
    const trimmed = month.trim()
    try {
      await createBreakMonth(subscriptionId, trimmed)
      onCreated(trimmed)
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      if (err instanceof ApiError) {
        refuse(err.field ?? 'month', err.message)
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
        id="break_month"
        label="Month"
        hint="Month as YYYY-MM, like 2026-01"
        error={fieldError ?? undefined}
      >
        {(control) => (
          <input
            {...control}
            required
            inputMode="numeric"
            pattern="\d{4}-\d{2}"
            autoComplete="off"
            placeholder="2026-02"
            disabled={submitting}
            value={month}
            onChange={(event) => setMonth(event.target.value)}
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
          Mark as skipped
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
