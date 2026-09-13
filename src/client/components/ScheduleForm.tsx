import { useEffect, useRef, useState } from 'react'
import { ApiError, SignedOutError, createSchedule, updateSchedule, type Member, type Schedule } from '../api'
import { Field } from './ui/Field'
import { labelFor, messageWithLabel, scheduleFieldLabels } from './ui/fieldLabels'
import { CONNECTION_FAILURE, FormAlert } from './ui/FormAlert'
import { MonthField } from './ui/MonthField'
import { pairedMonthMin } from './ui/monthControl'

type Props = {
  subscriptionId: string
  members: Member[]
  /** The subscription's first month, the lower bound every schedule month shares. */
  subscriptionStartMonth: string
  locale: string
  timeZone: string
  editing: Schedule | null
  /** The panel's own error line, owned by the section so the panel can take its red left rule. */
  alert: string | null
  onAlert: (message: string | null) => void
  onSaved: (schedule: Schedule) => void
  onCancel: () => void
  onSignedOut: () => void
}

function toMinor(value: string): number {
  return Math.round(Number.parseFloat(value) * 100)
}

function toMajor(minor: number): string {
  return (minor / 100).toFixed(2)
}

export function ScheduleForm({
  subscriptionId,
  members,
  subscriptionStartMonth,
  locale,
  timeZone,
  editing,
  alert,
  onAlert,
  onSaved,
  onCancel,
  onSignedOut,
}: Props) {
  const participants = members.filter((member) => !member.isOwner)
  const [memberId, setMemberId] = useState(editing?.memberId ?? '')

  // The participants arrive after this form first renders, so an initial value
  // taken from an empty list would stick and the select would show a name while
  // submitting nothing. The choice falls back to the first participant until the
  // organizer picks one, and the same value is what the select shows and what is
  // sent.
  const selectedMemberId = participants.some((member) => member.id === memberId)
    ? memberId
    : (participants[0]?.id ?? '')
  const [amount, setAmount] = useState(editing ? toMajor(editing.amount) : '')
  const [startMonth, setStartMonth] = useState(editing?.startMonth ?? '')
  const [endMonth, setEndMonth] = useState(editing?.endMonth ?? '')
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [refusals, setRefusals] = useState(0)
  const form = useRef<HTMLFormElement>(null)
  const alertLine = useRef<HTMLParagraphElement>(null)

  const prefix = editing ? `schedule_${editing.id}` : 'schedule_new'

  useEffect(() => {
    if (refusals === 0) return
    const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    ;(invalid ?? alertLine.current)?.focus()
  }, [refusals])

  function errorFor(wireName: string): string | undefined {
    return fieldError?.field === wireName ? fieldError.message : undefined
  }

  function refuse(field: string | undefined, message: string) {
    const named = field && labelFor(scheduleFieldLabels, field) ? field : undefined
    setFieldError(named ? { field: named, message: messageWithLabel(scheduleFieldLabels, named, message) } : null)
    onAlert(named ? null : message)
    setRefusals((count) => count + 1)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setFieldError(null)
    onAlert(null)

    const minor = toMinor(amount)
    if (!Number.isFinite(minor)) {
      refuse('amount', 'Enter an amount such as 10.00')
      return
    }

    setSaving(true)
    try {
      // An empty end month is the open-ended arrangement, and clearing a stored
      // one is how the organizer reopens an arrangement they had ended.
      const body = {
        member_id: selectedMemberId,
        amount: minor,
        start_month: startMonth.trim(),
        end_month: endMonth.trim() === '' ? null : endMonth.trim(),
      }
      const saved = editing
        ? await updateSchedule(subscriptionId, editing.id, body)
        : await createSchedule(subscriptionId, body)
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
      setSaving(false)
    }
  }

  return (
    <form
      ref={form}
      onSubmit={handleSubmit}
      noValidate
      className="panel-grid"
      aria-busy={saving || undefined}
    >
      <FormAlert message={alert} ref={alertLine} />

      <Field id={`${prefix}_member`} label="From" error={errorFor('member_id')}>
        {(control) => (
          <select
            {...control}
            disabled={saving}
            value={selectedMemberId}
            onChange={(event) => setMemberId(event.target.value)}
          >
            {participants.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id={`${prefix}_amount`}
        label="Amount each month"
        hint="Amount, like 100.00"
        span={false}
        error={errorFor('amount')}
      >
        {(control) => (
          <input
            {...control}
            required
            inputMode="decimal"
            placeholder="10.00"
            disabled={saving}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        )}
      </Field>

      <Field
        id={`${prefix}_start`}
        label="First month"
        span={false}
        error={errorFor('start_month')}
      >
        {(control) => (
          <MonthField
            {...control}
            required
            min={subscriptionStartMonth}
            locale={locale}
            timeZone={timeZone}
            disabled={saving}
            value={startMonth}
            onChange={setStartMonth}
          />
        )}
      </Field>

      <Field
        id={`${prefix}_end`}
        label="Last month"
        hint="Leave empty while it is still running"
        error={errorFor('end_month')}
      >
        {(control) => (
          <MonthField
            {...control}
            min={pairedMonthMin(startMonth)}
            emptyLabel="Still running"
            locale={locale}
            timeZone={timeZone}
            disabled={saving}
            value={endMonth}
            onChange={setEndMonth}
          />
        )}
      </Field>

      <div className="panel-actions">
        <button
          type="submit"
          className="btn-primary"
          aria-busy={saving || undefined}
          aria-disabled={saving || undefined}
        >
          {editing ? 'Save changes' : 'Record this standing order'}
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
