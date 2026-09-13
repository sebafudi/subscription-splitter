import { useEffect, useState } from 'react'
import { formatMoney } from '../../domain/money'
import {
  ApiError,
  SignedOutError,
  deletePayment,
  listPayments,
  type Member,
  type Payment,
} from '../api'
import { PaymentForm } from './PaymentForm'
import { PAYMENTS_RECEIVED } from './sections'

type Props = {
  subscriptionId: string
  payments: Payment[]
  members: Member[]
  currency: string
  locale: string
  onChanged: () => void
  onSignedOut: () => void
}

const KIND_LABEL: Record<Payment['kind'], string> = {
  manual: 'One-off',
  annual: 'Yearly lump sum',
}

/**
 * Recorded money, newest first, which is the order the repository returns. A
 * recorded receipt is what the organizer saw arrive, so every row here is
 * confirmed; the assumed half of the ledger is the standing-order section, and
 * the two are separate blocks with separate words for that reason (FR-026).
 */
export function PaymentList({
  subscriptionId,
  payments,
  members,
  currency,
  locale,
  onChanged,
  onSignedOut,
}: Props) {
  const [filterMemberId, setFilterMemberId] = useState('')
  const [filtered, setFiltered] = useState<Payment[] | null>(null)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The filter is the server's own, so one participant's history is the answer
  // the ownership rule gives rather than a slice taken in the browser.
  useEffect(() => {
    if (!filterMemberId) {
      setFiltered(null)
      return
    }
    let current = true
    listPayments(subscriptionId, filterMemberId)
      .then((rows) => {
        if (current) setFiltered(rows)
      })
      .catch((err) => {
        if (err instanceof SignedOutError) return onSignedOut()
        if (current) setError('Could not filter the payments.')
      })
    return () => {
      current = false
    }
  }, [subscriptionId, filterMemberId, payments, onSignedOut])

  const visible = filtered ?? payments
  const nameOf = (memberId: string) => members.find((member) => member.id === memberId)?.name ?? 'Unknown participant'
  const money = (minor: number) => formatMoney(minor, locale, currency)

  async function handleDelete(payment: Payment) {
    setError(null)
    try {
      await deletePayment(subscriptionId, payment.id)
      setPendingDelete(null)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) return onSignedOut()
      setError(err instanceof ApiError ? err.message : 'Could not delete that payment.')
    }
  }

  return (
    <section>
      <h3 id={PAYMENTS_RECEIVED.id} className="section-anchor">
        {PAYMENTS_RECEIVED.title}
      </h3>
      <p className="row-detail">Money you saw arrive. Every amount here is recorded, not assumed.</p>

      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}

      <div className="filter-row">
        <label htmlFor="payment_filter">Show</label>
        <select
          id="payment_filter"
          value={filterMemberId}
          onChange={(event) => setFilterMemberId(event.target.value)}
        >
          <option value="">Everyone</option>
          {members
            .filter((member) => !member.isOwner)
            .map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p>No payments recorded yet.</p>
      ) : (
        <ul className="row-list">
          {visible.map((payment) => (
            <li key={payment.id} className="row">
              <div className="row-main">
                <strong>
                  {money(payment.amount)} from {nameOf(payment.memberId)}
                </strong>
                <div className="row-detail">
                  {payment.date}, {KIND_LABEL[payment.kind]}
                  {payment.note && `, ${payment.note}`}
                </div>

                {pendingDelete === payment.id && (
                  <div role="alert" className="inline-confirm">
                    <p>
                      Delete the {money(payment.amount)} recorded on {payment.date} from{' '}
                      {nameOf(payment.memberId)}? Their balance moves back by that amount.
                    </p>
                    <div className="button-row">
                      <button type="button" onClick={() => handleDelete(payment)}>
                        Delete it
                      </button>
                      <button type="button" onClick={() => setPendingDelete(null)}>
                        Keep it
                      </button>
                    </div>
                  </div>
                )}

                {editing?.id === payment.id && (
                  <PaymentForm
                    subscriptionId={subscriptionId}
                    members={members}
                    editing={payment}
                    onSaved={() => {
                      setEditing(null)
                      onChanged()
                    }}
                    onCancelEdit={() => setEditing(null)}
                    onSignedOut={onSignedOut}
                  />
                )}
              </div>

              <div className="button-row">
                <button
                  type="button"
                  onClick={() => setEditing(editing?.id === payment.id ? null : payment)}
                >
                  {editing?.id === payment.id ? 'Close' : 'Edit'}
                </button>
                <button type="button" onClick={() => setPendingDelete(payment.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PaymentForm
        subscriptionId={subscriptionId}
        members={members}
        editing={null}
        onSaved={onChanged}
        onSignedOut={onSignedOut}
      />
    </section>
  )
}
