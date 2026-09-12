import { useState } from 'react'
import { ApiError, SignedOutError, createMember, updateMember, type ActiveRangeInput, type Member } from '../api'

type Props = {
  subscriptionId: string
  startMonth: string
  editing: Member | null
  onSaved: () => void
  onCancelEdit: () => void
  onSignedOut: () => void
}

function rangesOf(member: Member | null, startMonth: string): ActiveRangeInput[] {
  if (!member) return [{ joined_month: startMonth, left_month: null }]
  return member.activeRanges.map((range) => ({ joined_month: range.joinedMonth, left_month: range.leftMonth }))
}

/** Adds a participant, or edits the one passed in. Ranges are replaced as a whole set, never merged. */
export function MemberForm({ subscriptionId, startMonth, editing, onSaved, onCancelEdit, onSignedOut }: Props) {
  const [name, setName] = useState(editing?.name ?? '')
  const [ranges, setRanges] = useState<ActiveRangeInput[]>(rangesOf(editing, startMonth))
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function setRange(index: number, patch: Partial<ActiveRangeInput>) {
    setRanges((rows) => rows.map((row, position) => (position === index ? { ...row, ...patch } : row)))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const active_ranges = ranges.map((range) => ({
        joined_month: range.joined_month.trim(),
        left_month: range.left_month?.trim() ? range.left_month.trim() : null,
      }))

      if (editing) {
        await updateMember(subscriptionId, editing.id, { name, active_ranges })
      } else {
        await createMember(subscriptionId, { name, active_ranges })
        setName('')
        setRanges([{ joined_month: startMonth, left_month: null }])
      }
      onSaved()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setError(
        err instanceof ApiError
          ? { field: err.field, message: err.message }
          : { message: 'Could not save the participant.' },
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="panel-form">
      <h4>{editing ? `Edit ${editing.name}` : 'Add a participant'}</h4>

      <label htmlFor="member_name">Name</label>
      <input id="member_name" required value={name} onChange={(event) => setName(event.target.value)} />

      <fieldset className="ranges">
        <legend>Active months</legend>
        {ranges.map((range, index) => (
          <div className="range-row" key={index}>
            <label htmlFor={`joined_${index}`}>From</label>
            <input
              id={`joined_${index}`}
              required
              placeholder="2026-01"
              value={range.joined_month}
              onChange={(event) => setRange(index, { joined_month: event.target.value })}
            />
            <label htmlFor={`left_${index}`}>To (blank if still active)</label>
            <input
              id={`left_${index}`}
              placeholder="2026-06"
              value={range.left_month ?? ''}
              onChange={(event) => setRange(index, { left_month: event.target.value })}
            />
            {ranges.length > 1 && (
              <button
                type="button"
                onClick={() => setRanges((rows) => rows.filter((_, position) => position !== index))}
              >
                Remove this range
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRanges((rows) => [...rows, { joined_month: '', left_month: null }])}
        >
          Add another range
        </button>
      </fieldset>

      {error && (
        <p role="alert" className="field-error">
          {error.field ? `${error.field}: ${error.message}` : error.message}
        </p>
      )}

      <div className="button-row">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add participant'}
        </button>
        {editing && (
          <button type="button" onClick={onCancelEdit}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
