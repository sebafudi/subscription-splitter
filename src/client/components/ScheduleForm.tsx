import { useState } from 'react'
import {
  ApiError,
  SignedOutError,
  createSchedule,
  updateSchedule,
  type Member,
  type Schedule,
} from '../api'

type Props = {
  subscriptionId: string
  members: Member[]
  editing: Schedule | null
  onSaved: () => void
  onCancelEdit?: () => void
  onSignedOut: () => void
}

function toMinor(value: string): number {
  return Math.round(Number.parseFloat(value) * 100)
}

function toMajor(minor: number): string {
  return (minor / 100).toFixed(2)
}

export function ScheduleForm({ subscriptionId, members, editing, onSaved, onCancelEdit, onSignedOut }: Props) {
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
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const idPrefix = editing ? `edit_schedule_${editing.id}` : 'new_schedule'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const minor = toMinor(amount)
    if (!Number.isFinite(minor)) {
      setError({ field: 'amount', message: 'Enter an amount such as 10.00' })
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
      if (editing) {
        await updateSchedule(subscriptionId, editing.id, body)
      } else {
        await createSchedule(subscriptionId, body)
        setAmount('')
        setStartMonth('')
        setEndMonth('')
      }
      onSaved()
    } catch (err) {
      if (err instanceof SignedOutError) return onSignedOut()
      setError(
        err instanceof ApiError
          ? { field: err.field, message: err.message }
          : { message: 'Could not save that standing order.' },
      )
    } finally {
      setSaving(false)
    }
  }

  if (participants.length === 0) {
    return <p>Add a participant before recording a standing order.</p>
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={editing ? 'inline-edit' : 'panel-form'}>
      <label htmlFor={`${idPrefix}_member`}>From</label>
      <select id={`${idPrefix}_member`} value={selectedMemberId} onChange={(event) => setMemberId(event.target.value)}>
        {participants.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
      {error?.field === 'member_id' && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}

      <label htmlFor={`${idPrefix}_amount`}>Amount each month</label>
      <input
        id={`${idPrefix}_amount`}
        required
        inputMode="decimal"
        placeholder="10.00"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      {error?.field === 'amount' && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}

      <label htmlFor={`${idPrefix}_start`}>First month (YYYY-MM)</label>
      <input
        id={`${idPrefix}_start`}
        required
        placeholder="2026-01"
        value={startMonth}
        onChange={(event) => setStartMonth(event.target.value)}
      />
      {error?.field === 'start_month' && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}

      <label htmlFor={`${idPrefix}_end`}>Last month (optional, leave empty while it is still running)</label>
      <input
        id={`${idPrefix}_end`}
        placeholder="2026-12"
        value={endMonth}
        onChange={(event) => setEndMonth(event.target.value)}
      />
      {error?.field === 'end_month' && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}

      {error && !error.field && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}

      <div className="button-row">
        <button type="submit" disabled={saving}>
          {editing ? 'Save this standing order' : 'Record this standing order'}
        </button>
        {editing && onCancelEdit && (
          <button type="button" onClick={onCancelEdit}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
