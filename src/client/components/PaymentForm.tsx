import { useState } from 'react'
import {
  ApiError,
  SignedOutError,
  createPayment,
  updatePayment,
  type Member,
  type Payment,
  type PaymentKind,
} from '../api'

type Props = {
  subscriptionId: string
  /** Participants only; the owner is never owed from, so the server refuses money recorded against them. */
  members: Member[]
  editing: Payment | null
  onSaved: () => void
  onCancelEdit?: () => void
  onSignedOut: () => void
}

/** Major units in the field, minor units over the wire; the conversion happens here and nowhere else. */
function toMinor(value: string): number {
  return Math.round(Number.parseFloat(value) * 100)
}

function toMajor(minor: number): string {
  return (minor / 100).toFixed(2)
}

export function PaymentForm({ subscriptionId, members, editing, onSaved, onCancelEdit, onSignedOut }: Props) {
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
  const [date, setDate] = useState(editing?.date ?? '')
  const [amount, setAmount] = useState(editing ? toMajor(editing.amount) : '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [kind, setKind] = useState<PaymentKind>(editing?.kind ?? 'manual')
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const idPrefix = editing ? `edit_payment_${editing.id}` : 'new_payment'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const minor = toMinor(amount)
    if (!Number.isFinite(minor)) {
      setError({ field: 'amount', message: 'Enter an amount such as 20.00' })
      return
    }

    setSaving(true)
    try {
      const body = { member_id: selectedMemberId, date: date.trim(), amount: minor, note: note.trim(), kind }
      if (editing) {
        await updatePayment(subscriptionId, editing.id, body)
      } else {
        await createPayment(subscriptionId, body)
        setDate('')
        setAmount('')
        setNote('')
        setKind('manual')
      }
      onSaved()
    } catch (err) {
      if (err instanceof SignedOutError) return onSignedOut()
      setError(
        err instanceof ApiError
          ? { field: err.field, message: err.message }
          : { message: 'Could not save that payment.' },
      )
    } finally {
      setSaving(false)
    }
  }

  if (participants.length === 0) {
    return <p>Add a participant before recording a payment.</p>
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

      <label htmlFor={`${idPrefix}_date`}>Date received (YYYY-MM-DD)</label>
      <input
        id={`${idPrefix}_date`}
        required
        placeholder="2026-01-15"
        value={date}
        onChange={(event) => setDate(event.target.value)}
      />
      {error?.field === 'date' && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}

      <label htmlFor={`${idPrefix}_amount`}>Amount</label>
      <input
        id={`${idPrefix}_amount`}
        required
        inputMode="decimal"
        placeholder="20.00"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      {error?.field === 'amount' && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}

      <label htmlFor={`${idPrefix}_kind`}>Kind</label>
      <select
        id={`${idPrefix}_kind`}
        value={kind}
        onChange={(event) => setKind(event.target.value as PaymentKind)}
      >
        <option value="manual">One-off</option>
        <option value="annual">Yearly lump sum</option>
      </select>

      <label htmlFor={`${idPrefix}_note`}>Note (optional)</label>
      <input id={`${idPrefix}_note`} value={note} onChange={(event) => setNote(event.target.value)} />

      {error && !error.field && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}

      <div className="button-row">
        <button type="submit" disabled={saving}>
          {editing ? 'Save this payment' : 'Record this payment'}
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
