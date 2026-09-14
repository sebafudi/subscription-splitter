import { useEffect, useRef, useState } from 'react'
import {
  ApiError,
  SignedOutError,
  createPayment,
  updatePayment,
  type Member,
  type Payment,
  type PaymentKind,
} from '../api'
import { DateField } from './ui/DateField'
import { Field } from './ui/Field'
import { labelFor, messageWithLabel, paymentFieldLabels } from './ui/fieldLabels'
import { CONNECTION_FAILURE, FormAlert } from './ui/FormAlert'

type Props = {
  subscriptionId: string
  /** Participants only; the owner is never owed from, so the server refuses money recorded against them. */
  members: Member[]
  /** The subscription's first month; no payment may be dated before it begins. */
  startMonth: string
  editing: Payment | null
  /**
   * What an empty form starts from when it is opened for one participant and
   * one month, as the month inspector opens it. Ignored while editing, and the
   * organizer may change either before saving.
   */
  presetMemberId?: string
  presetDate?: string
  /** The panel's own error line, owned by the section so the panel can take its red left rule. */
  alert: string | null
  onAlert: (message: string | null) => void
  onSaved: (payment: Payment) => void
  onCancel: () => void
  onSignedOut: () => void
}

/** Major units in the field, minor units over the wire; the conversion happens here and nowhere else. */
function toMinor(value: string): number {
  return Math.round(Number.parseFloat(value) * 100)
}

function toMajor(minor: number): string {
  return (minor / 100).toFixed(2)
}

export function PaymentForm({
  subscriptionId,
  members,
  startMonth,
  editing,
  presetMemberId,
  presetDate,
  alert,
  onAlert,
  onSaved,
  onCancel,
  onSignedOut,
}: Props) {
  const participants = members.filter((member) => !member.isOwner)
  const [memberId, setMemberId] = useState(editing?.memberId ?? presetMemberId ?? '')

  // The participants arrive after this form first renders, so an initial value
  // taken from an empty list would stick and the select would show a name while
  // submitting nothing. The choice falls back to the first participant until the
  // organizer picks one, and the same value is what the select shows and what is
  // sent.
  const selectedMemberId = participants.some((member) => member.id === memberId)
    ? memberId
    : (participants[0]?.id ?? '')
  const [date, setDate] = useState(editing?.date ?? presetDate ?? '')
  const [amount, setAmount] = useState(editing ? toMajor(editing.amount) : '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [kind, setKind] = useState<PaymentKind>(editing?.kind ?? 'manual')
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [refusals, setRefusals] = useState(0)
  const form = useRef<HTMLFormElement>(null)
  const alertLine = useRef<HTMLParagraphElement>(null)

  const prefix = editing ? `payment_${editing.id}` : 'payment_new'

  useEffect(() => {
    if (refusals === 0) return
    const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    ;(invalid ?? alertLine.current)?.focus()
  }, [refusals])

  function errorFor(wireName: string): string | undefined {
    return fieldError?.field === wireName ? fieldError.message : undefined
  }

  function refuse(field: string | undefined, message: string) {
    const named = field && labelFor(paymentFieldLabels, field) ? field : undefined
    setFieldError(named ? { field: named, message: messageWithLabel(paymentFieldLabels, named, message) } : null)
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
      refuse('amount', 'Enter an amount such as 20.00')
      return
    }

    setSaving(true)
    try {
      const body = { member_id: selectedMemberId, date: date.trim(), amount: minor, note: note.trim(), kind }
      const saved = editing
        ? await updatePayment(subscriptionId, editing.id, body)
        : await createPayment(subscriptionId, body)
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

      <Field id={`${prefix}_member`} label="From" span={false} error={errorFor('member_id')}>
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
        id={`${prefix}_date`}
        label="Date received"
        span={false}
        error={errorFor('date')}
      >
        {(control) => (
          <DateField
            {...control}
            required
            min={`${startMonth}-01`}
            disabled={saving}
            value={date}
            onChange={setDate}
          />
        )}
      </Field>

      <Field
        id={`${prefix}_amount`}
        label="Amount"
        hint="Amount, like 100.00"
        span={false}
        error={errorFor('amount')}
      >
        {(control) => (
          <input
            {...control}
            required
            inputMode="decimal"
            placeholder="20.00"
            disabled={saving}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        )}
      </Field>

      <Field id={`${prefix}_kind`} label="Kind" span={false} error={errorFor('kind')}>
        {(control) => (
          <select
            {...control}
            disabled={saving}
            value={kind}
            onChange={(event) => setKind(event.target.value as PaymentKind)}
          >
            <option value="manual">One-off</option>
            <option value="annual">Yearly lump sum</option>
          </select>
        )}
      </Field>

      <Field id={`${prefix}_note`} label="Note" hint="Optional" error={errorFor('note')}>
        {(control) => (
          <input
            {...control}
            disabled={saving}
            value={note}
            onChange={(event) => setNote(event.target.value)}
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
          {editing ? 'Save changes' : 'Record this payment'}
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
