import { useEffect, useState } from 'react'
import { formatMoney } from '../../domain/money'
import { ApiError, SignedOutError, deletePayment, listPayments, type Member, type Payment } from '../api'
import { formatDate } from '../format'
import { PaymentForm } from './PaymentForm'
import { PAYMENTS_RECEIVED } from './sections'
import { ConfirmStrip } from './ui/ConfirmStrip'
import { DisclosurePanel } from './ui/DisclosurePanel'
import { CONNECTION_FAILURE } from './ui/FormAlert'
import { LedgerEntry } from './ui/LedgerEntry'
import { Money } from './ui/Money'
import { SectionAlert } from './ui/SectionAlert'
import { SectionHeader } from './ui/SectionHeader'
import { StatusLine } from './ui/StatusLine'
import { useSectionStatus } from './ui/useSectionStatus'

const ADD_PANEL_ID = 'payment-add-panel'
const ADD_BUTTON_ID = 'payment-add-button'
const REFUSAL_ID = 'payment-refusal'

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
  const [sectionError, setSectionError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addAlert, setAddAlert] = useState<string | null>(null)
  const [addKey, setAddKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAlert, setEditAlert] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const status = useSectionStatus()

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
        if (current) setSectionError(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
      })
    return () => {
      current = false
    }
  }, [subscriptionId, filterMemberId, payments, onSignedOut])

  useEffect(() => {
    if (!focusTarget) return
    document.getElementById(focusTarget)?.focus()
    setFocusTarget(null)
  }, [focusTarget])

  const visible = filtered ?? payments
  const participants = members.filter((member) => !member.isOwner)
  const nameOf = (memberId: string) => members.find((member) => member.id === memberId)?.name ?? 'Unknown participant'
  const money = (minor: number) => formatMoney(minor, locale, currency)

  function closeAdd() {
    setAddOpen(false)
    setAddAlert(null)
    setAddKey((key) => key + 1)
    setFocusTarget(ADD_BUTTON_ID)
  }

  function closeEdit(paymentId: string) {
    setEditingId(null)
    setEditAlert(null)
    setFocusTarget(`payment-edit-${paymentId}`)
  }

  async function confirmDelete(payment: Payment) {
    setPendingDelete(null)
    try {
      await deletePayment(subscriptionId, payment.id)
      setSectionError(null)
      setFocusTarget(PAYMENTS_RECEIVED.id)
      status.confirm('Payment deleted', null)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setSectionError(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
      setFocusTarget(`payment-delete-${payment.id}`)
    }
  }

  return (
    <section aria-labelledby={PAYMENTS_RECEIVED.id}>
      <SectionHeader
        id={PAYMENTS_RECEIVED.id}
        title={PAYMENTS_RECEIVED.title}
        count={visible.length}
        subtitle={
          <span className="subtitle-line">
            <span>{PAYMENTS_RECEIVED.subtitle}</span>
            <label className="filter-label" htmlFor="payment_filter">
              Show{' '}
              <select
                id="payment_filter"
                value={filterMemberId}
                onChange={(event) => setFilterMemberId(event.target.value)}
              >
                <option value="">Everyone</option>
                {participants.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </span>
        }
        status={<StatusLine message={status.message} />}
        action={
          !addOpen && (
            <button
              type="button"
              className="btn-primary"
              id={ADD_BUTTON_ID}
              aria-expanded={addOpen}
              aria-controls={ADD_PANEL_ID}
              aria-disabled={participants.length === 0 || undefined}
              aria-describedby={participants.length === 0 ? REFUSAL_ID : undefined}
              onClick={() => {
                if (participants.length === 0) return
                status.clear()
                setAddOpen(true)
              }}
            >
              {PAYMENTS_RECEIVED.action}
            </button>
          )
        }
      >
        {participants.length === 0 && (
          <p id={REFUSAL_ID} className="section-refusal t-small soft">
            Add a participant before recording a payment.
          </p>
        )}
        <SectionAlert message={sectionError} onDismiss={() => setSectionError(null)} />
      </SectionHeader>

      <DisclosurePanel
        id={ADD_PANEL_ID}
        open={addOpen}
        title="Record a payment"
        onCancel={closeAdd}
        invalid={addAlert !== null}
      >
        <PaymentForm
          key={addKey}
          subscriptionId={subscriptionId}
          members={members}
          editing={null}
          alert={addAlert}
          onAlert={setAddAlert}
          onSaved={(saved) => {
            closeAdd()
            setSectionError(null)
            status.confirm('Payment recorded', saved.id)
            onChanged()
          }}
          onCancel={closeAdd}
          onSignedOut={onSignedOut}
        />
      </DisclosurePanel>

      {visible.length === 0 ? (
        <p className="section-empty t-body soft">No payments recorded yet.</p>
      ) : (
        <ul className="entry-list">
          {visible.map((payment) =>
            editingId === payment.id ? (
              <li key={payment.id}>
                <DisclosurePanel
                  id={`payment-edit-panel-${payment.id}`}
                  open
                  title="Edit payment"
                  onCancel={() => closeEdit(payment.id)}
                  invalid={editAlert !== null}
                >
                  <PaymentForm
                    subscriptionId={subscriptionId}
                    members={members}
                    editing={payment}
                    alert={editAlert}
                    onAlert={setEditAlert}
                    onSaved={(saved) => {
                      closeEdit(saved.id)
                      setSectionError(null)
                      status.confirm('Changes saved', saved.id)
                      onChanged()
                    }}
                    onCancel={() => closeEdit(payment.id)}
                    onSignedOut={onSignedOut}
                  />
                </DisclosurePanel>
              </li>
            ) : (
              <li key={payment.id}>
                <LedgerEntry
                  highlighted={status.highlightedId === payment.id}
                  primary={
                    <>
                      <Money value={money(payment.amount)} /> from {nameOf(payment.memberId)}
                    </>
                  }
                  secondary={
                    <>
                      {KIND_LABEL[payment.kind]}
                      {payment.note && `, ${payment.note}`}
                    </>
                  }
                  figure={<span className="t-small soft tnum">{formatDate(payment.date, locale)}</span>}
                  confirm={
                    pendingDelete === payment.id ? (
                      <ConfirmStrip
                        question={`Delete the ${money(payment.amount)} payment from ${nameOf(payment.memberId)}?`}
                        onConfirm={() => void confirmDelete(payment)}
                        onKeep={() => {
                          setPendingDelete(null)
                          setFocusTarget(`payment-delete-${payment.id}`)
                        }}
                      />
                    ) : undefined
                  }
                  actions={
                    <>
                      <button
                        type="button"
                        className="btn-link t-small"
                        id={`payment-edit-${payment.id}`}
                        onClick={() => {
                          status.clear()
                          setEditAlert(null)
                          setEditingId(payment.id)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-link t-small"
                        id={`payment-delete-${payment.id}`}
                        onClick={() => {
                          status.clear()
                          setPendingDelete(payment.id)
                        }}
                      >
                        Delete
                      </button>
                    </>
                  }
                />
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  )
}
