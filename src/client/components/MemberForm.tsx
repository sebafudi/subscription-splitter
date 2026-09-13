import { useEffect, useRef, useState } from 'react'
import { ApiError, SignedOutError, createMember, updateMember, type ActiveRangeInput, type Member } from '../api'
import { Field } from './ui/Field'
import { labelFor, messageWithLabel, participantFieldLabels } from './ui/fieldLabels'
import { CONNECTION_FAILURE, FormAlert } from './ui/FormAlert'

type Props = {
  subscriptionId: string
  startMonth: string
  /** Null in the add panel; the participant being edited in an edit panel. */
  editing: Member | null
  /** The panel's own error line, owned by the section so the panel can take its red left rule. */
  alert: string | null
  onAlert: (message: string | null) => void
  onSaved: (member: Member) => void
  onCancel: () => void
  onSignedOut: () => void
}

/** The controls this form renders. A refusal naming anything else becomes the generic error line. */
const RENDERED_FIELDS = new Set(['name', 'joined_month', 'left_month'])

function rangesOf(member: Member | null, startMonth: string): ActiveRangeInput[] {
  if (!member) return [{ joined_month: startMonth, left_month: null }]
  return member.activeRanges.map((range) => ({ joined_month: range.joinedMonth, left_month: range.leftMonth }))
}

/** Adds a participant, or edits the one passed in. Ranges are replaced as a whole set, never merged. */
export function MemberForm({
  subscriptionId,
  startMonth,
  editing,
  alert,
  onAlert,
  onSaved,
  onCancel,
  onSignedOut,
}: Props) {
  const [name, setName] = useState(editing?.name ?? '')
  const [ranges, setRanges] = useState<ActiveRangeInput[]>(rangesOf(editing, startMonth))
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [refusals, setRefusals] = useState(0)
  const form = useRef<HTMLFormElement>(null)
  const alertLine = useRef<HTMLParagraphElement>(null)

  const prefix = editing ? `member_${editing.id}` : 'member_new'

  useEffect(() => {
    if (refusals === 0) return
    const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    ;(invalid ?? alertLine.current)?.focus()
  }, [refusals])

  function setRange(index: number, patch: Partial<ActiveRangeInput>) {
    setRanges((rows) => rows.map((row, position) => (position === index ? { ...row, ...patch } : row)))
  }

  function refuse(field: string | undefined, message: string) {
    const last = field?.split('.').pop()
    const named =
      field && last && RENDERED_FIELDS.has(last) && labelFor(participantFieldLabels, field) ? field : undefined
    setFieldError(named ? { field: named, message: messageWithLabel(participantFieldLabels, named, message) } : null)
    onAlert(named ? null : message)
    setRefusals((count) => count + 1)
  }

  /** A path such as `active_ranges.0.joined_month` marks one end of one range. */
  function rangeError(index: number, key: 'joined_month' | 'left_month'): string | undefined {
    if (!fieldError) return undefined
    const parts = fieldError.field.split('.')
    if (parts[parts.length - 1] !== key) return undefined
    const position = parts.length > 2 ? Number(parts[1]) : 0
    return position === index ? fieldError.message : undefined
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFieldError(null)
    onAlert(null)
    setSubmitting(true)
    try {
      const active_ranges = ranges.map((range) => ({
        joined_month: range.joined_month.trim(),
        left_month: range.left_month?.trim() ? range.left_month.trim() : null,
      }))

      const saved = editing
        ? await updateMember(subscriptionId, editing.id, { name, active_ranges })
        : await createMember(subscriptionId, { name, active_ranges })
      onSaved(saved)
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

      <Field id={`${prefix}_name`} label="Name" error={fieldError?.field === 'name' ? fieldError.message : undefined}>
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

      <fieldset className="ranges field-span">
        <legend className="t-small">Active months</legend>
        {ranges.map((range, index) => (
          <div className="range-grid" key={index}>
            <Field
              id={`${prefix}_joined_${index}`}
              label="From"
              hint="Month as YYYY-MM, like 2026-01"
              span={false}
              error={rangeError(index, 'joined_month')}
            >
              {(control) => (
                <input
                  {...control}
                  required
                  inputMode="numeric"
                  pattern="\d{4}-\d{2}"
                  autoComplete="off"
                  placeholder="2026-01"
                  disabled={submitting}
                  value={range.joined_month}
                  onChange={(event) => setRange(index, { joined_month: event.target.value })}
                />
              )}
            </Field>

            <Field
              id={`${prefix}_left_${index}`}
              label="To"
              hint="Leave empty while still active"
              span={false}
              error={rangeError(index, 'left_month')}
            >
              {(control) => (
                <input
                  {...control}
                  inputMode="numeric"
                  pattern="\d{4}-\d{2}"
                  autoComplete="off"
                  placeholder="2026-06"
                  disabled={submitting}
                  value={range.left_month ?? ''}
                  onChange={(event) => setRange(index, { left_month: event.target.value })}
                />
              )}
            </Field>

            {index > 0 && (
              <div className="range-remove">
                <button
                  type="button"
                  className="btn-link t-small"
                  onClick={() => setRanges((rows) => rows.filter((_, position) => position !== index))}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          className="btn-link t-small"
          onClick={() => setRanges((rows) => [...rows, { joined_month: '', left_month: null }])}
        >
          Add another range
        </button>
      </fieldset>

      <div className="panel-actions">
        <button
          type="submit"
          className="btn-primary"
          aria-busy={submitting || undefined}
          aria-disabled={submitting || undefined}
        >
          {editing ? 'Save changes' : 'Add participant'}
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
