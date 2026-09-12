import { useState } from 'react'
import { formatMoney } from '../../domain/money'
import { ApiError, SignedOutError, deleteMember, updateMember, type Member, type Summary } from '../api'

type Props = {
  subscriptionId: string
  members: Member[]
  summary: Summary
  onEdit: (member: Member) => void
  onChanged: () => void
  onSignedOut: () => void
}

/**
 * Participants most-owing first, which is the order the summary already
 * returns. The owner is not a row here: they are the account holder, shown
 * above with their own share of the month rather than with a balance.
 *
 * An archived participant whose balance is zero is settled and hidden by
 * default; one who still owes or is still ahead stays visible, because hiding
 * a live balance is how money goes missing from a screen.
 */
export function MemberList({ subscriptionId, members, summary, onEdit, onChanged, onSignedOut }: Props) {
  const [showSettledArchived, setShowSettledArchived] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byId = new Map(members.map((member) => [member.id, member]))
  const rows = summary.members.map((row) => ({ row, member: byId.get(row.memberId) }))
  const settledArchived = rows.filter(({ row }) => row.archived && row.balance === 0)
  const visible = showSettledArchived ? rows : rows.filter(({ row }) => !(row.archived && row.balance === 0))

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setError(err instanceof ApiError ? err.message : 'That did not work.')
    }
  }

  function money(minor: number): string {
    return formatMoney(minor, summary.locale, summary.currency)
  }

  return (
    <section>
      <h3>Participants</h3>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p>No participants yet.</p>
      ) : (
        <ul className="row-list">
          {visible.map(({ row, member }) => (
            <li key={row.memberId} className="row">
              <div>
                <strong>{row.name}</strong>
                {row.archived && <span className="tag"> archived</span>}
                {!row.activeThisMonth && <span className="tag"> not active this month</span>}
                <div className="row-detail">
                  {row.balance < 0
                    ? `owes ${money(-row.balance)}`
                    : row.balance > 0
                      ? `ahead by ${money(row.balance)}`
                      : 'settled up'}
                  , this month {money(row.currentShare)}, owed {money(row.owed)} against paid {money(row.paid)}
                </div>
              </div>
              <div className="button-row">
                {member && (
                  <button type="button" onClick={() => onEdit(member)}>
                    Edit
                  </button>
                )}
                {member && (
                  <button
                    type="button"
                    onClick={() =>
                      run(() => updateMember(subscriptionId, member.id, { archived: !member.archived }))
                    }
                  >
                    {member.archived ? 'Unarchive' : 'Archive'}
                  </button>
                )}
                <button type="button" onClick={() => run(() => deleteMember(subscriptionId, row.memberId))}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {settledArchived.length > 0 && (
        <button type="button" onClick={() => setShowSettledArchived((shown) => !shown)}>
          {showSettledArchived
            ? 'Hide settled archived participants'
            : `Show ${settledArchived.length} settled archived participant(s)`}
        </button>
      )}
    </section>
  )
}
