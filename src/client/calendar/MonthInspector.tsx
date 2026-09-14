import { useEffect, useState, type KeyboardEvent } from 'react'
import { formatMoney } from '../../domain/money'
import type { Member, MonthStr, Payment } from '../../domain/types'
import {
  ApiError,
  SignedOutError,
  clearMonthNotReceived,
  deletePayment,
  deleteSchedule,
  markMonthNotReceived,
  type Schedule,
} from '../api'
import { PaymentForm } from '../components/PaymentForm'
import { ScheduleForm } from '../components/ScheduleForm'
import { ConfirmStrip } from '../components/ui/ConfirmStrip'
import { DisclosurePanel } from '../components/ui/DisclosurePanel'
import { CONNECTION_FAILURE } from '../components/ui/FormAlert'
import { LedgerEntry } from '../components/ui/LedgerEntry'
import { Money } from '../components/ui/Money'
import { SectionAlert } from '../components/ui/SectionAlert'
import { formatDate, formatLongMonth, formatMonth } from '../format'
import { chargeSentence, exclusionPhrase } from './cellText'
import { cellId } from './MonthStrip'
import type { MonthCell } from './projection'

const KIND_LABEL: Record<Payment['kind'], string> = {
  manual: 'One-off',
  annual: 'Yearly lump sum',
}

type Props = {
  subscriptionId: string
  member: Member
  cell: MonthCell
  /** The client schedule behind `cell.schedule`, which the forms need whole. */
  schedule: Schedule | null
  /** Every participant plus the owner, exactly as the shipped forms take them. */
  members: Member[]
  locale: string
  currency: string
  startMonth: string
  timeZone: string
  currentMonth: MonthStr
  /** The section's own status line: the confirmation is shown in the Participants heading. */
  onConfirm: (message: string, highlightedId: string | null) => void
  onClearStatus: () => void
  onChanged: () => void
  onSignedOut: () => void
  onClose: () => void
}

export function inspectorHeadingId(memberId: string, month: MonthStr): string {
  return `inspector-heading-${memberId}-${month}`
}

/**
 * The date a receipt recorded from this month starts on: the first of the
 * month, or today when the month is the current one. Today is read in the
 * subscription's own time zone, never from the runtime's local date parts.
 */
function presetDate(month: MonthStr, currentMonth: MonthStr, timeZone: string): string {
  if (month !== currentMonth) return `${month}-01`
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return today.startsWith(month) ? today : `${month}-01`
}

/**
 * One person's one month: what was charged, what was recorded, what a standing
 * order assumed, and the actions that change any of it.
 *
 * The panel is this component's own markup rather than `DisclosurePanel`.  It
 * reproduces `.disclosure` / `.disclosure-inner` / `.panel` and `data-open` so
 * it inherits the same motion, but it moves no focus on open, which
 * `DisclosurePanel` does and `design-spec.md` §8 forbids here, and it renders a
 * heading that carries an id and `tabIndex={-1}` so focus can land on it after
 * a delete. `DisclosurePanel` itself is therefore untouched and the seven forms
 * that use it keep today's behaviour.
 */
export function MonthInspector({
  subscriptionId,
  member,
  cell,
  schedule,
  members,
  locale,
  currency,
  startMonth,
  timeZone,
  currentMonth,
  onConfirm,
  onClearStatus,
  onChanged,
  onSignedOut,
  onClose,
}: Props) {
  const [alert, setAlert] = useState<string | null>(null)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [editAlert, setEditAlert] = useState<string | null>(null)
  const [pendingDeletePaymentId, setPendingDeletePaymentId] = useState<string | null>(null)
  const [scheduleEditing, setScheduleEditing] = useState(false)
  const [scheduleAlert, setScheduleAlert] = useState<string | null>(null)
  const [schedulePendingDelete, setSchedulePendingDelete] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [recordAlert, setRecordAlert] = useState<string | null>(null)
  const [recordKey, setRecordKey] = useState(0)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)

  /**
   * Focuses an element id once the control holding it exists. A target created
   * by the reload after a mutation is not in the tree when the target is set,
   * so the effect re-runs on the reprojected cell and gives up after a second
   * rather than holding a target that will never arrive.
   */
  useEffect(() => {
    if (!focusTarget) return
    const element = document.getElementById(focusTarget)
    if (element) {
      element.focus()
      setFocusTarget(null)
      return
    }
    const timer = setTimeout(() => setFocusTarget(null), 1000)
    return () => clearTimeout(timer)
  }, [focusTarget, cell])

  const headingId = inspectorHeadingId(member.id, cell.month)
  const longMonth = formatLongMonth(cell.month, locale)
  const money = (minor: number) => formatMoney(minor, locale, currency)
  const charge = chargeSentence(cell, locale, currency)
  const recordedCount = cell.manualReceipts.length

  /**
   * Escape anywhere inside closes the inspector. An open form or confirm strip
   * stops the key before it reaches here, so only the outer case arrives.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    onClose()
  }

  function closePaymentEdit(paymentId: string) {
    setEditingPaymentId(null)
    setEditAlert(null)
    setFocusTarget(
      document.getElementById(`payment-edit-${paymentId}`) ? `payment-edit-${paymentId}` : headingId,
    )
  }

  function closeRecord() {
    setRecordOpen(false)
    setRecordAlert(null)
    setRecordKey((key) => key + 1)
    setFocusTarget('inspector-record')
  }

  function closeScheduleEdit() {
    setScheduleEditing(false)
    setScheduleAlert(null)
    setFocusTarget('inspector-schedule-edit')
  }

  /** Every action outside a panel lands its refusal in the inspector's own alert. */
  async function run(action: () => Promise<unknown>, confirmation: string, highlightedId: string | null) {
    try {
      await action()
      setAlert(null)
      onConfirm(confirmation, highlightedId)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setAlert(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
    }
  }

  /**
   * A completed receipt delete takes the entry that held focus with it, so
   * focus moves to the inspector heading and the inspector stays open. A
   * refused one leaves the entry standing, so focus returns to its Delete.
   */
  async function confirmPaymentDelete(payment: Payment) {
    setPendingDeletePaymentId(null)
    try {
      await deletePayment(subscriptionId, payment.id)
      setAlert(null)
      setFocusTarget(headingId)
      onConfirm('Payment deleted', null)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setAlert(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
      setFocusTarget(`payment-delete-${payment.id}`)
    }
  }

  async function confirmScheduleDelete(scheduleId: string) {
    setSchedulePendingDelete(false)
    try {
      await deleteSchedule(subscriptionId, scheduleId)
      setAlert(null)
      setFocusTarget(headingId)
      onConfirm('Standing order deleted', null)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setAlert(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
      setFocusTarget('inspector-schedule-delete')
    }
  }

  function recordedEntry(payment: Payment) {
    if (editingPaymentId === payment.id) {
      return (
        <li key={payment.id}>
          <DisclosurePanel
            id={`inspector-payment-edit-panel-${payment.id}`}
            open
            title="Edit payment"
            onCancel={() => closePaymentEdit(payment.id)}
            invalid={editAlert !== null}
          >
            <PaymentForm
              subscriptionId={subscriptionId}
              members={members}
              startMonth={startMonth}
              editing={payment}
              alert={editAlert}
              onAlert={setEditAlert}
              onSaved={(saved) => {
                closePaymentEdit(saved.id)
                setAlert(null)
                onConfirm('Changes saved', saved.id)
                onChanged()
              }}
              onCancel={() => closePaymentEdit(payment.id)}
              onSignedOut={onSignedOut}
            />
          </DisclosurePanel>
        </li>
      )
    }

    return (
      <li key={payment.id}>
        <LedgerEntry
          primary={<Money value={money(payment.amount)} />}
          secondary={
            <>
              {KIND_LABEL[payment.kind]}
              {payment.note && `, ${payment.note}`}
            </>
          }
          figure={<span className="t-small soft tnum">{formatDate(payment.date, locale)}</span>}
          confirm={
            pendingDeletePaymentId === payment.id ? (
              <ConfirmStrip
                question={`Delete the ${money(payment.amount)} payment from ${member.name}?`}
                onConfirm={() => void confirmPaymentDelete(payment)}
                onKeep={() => {
                  setPendingDeletePaymentId(null)
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
                  onClearStatus()
                  setEditAlert(null)
                  setEditingPaymentId(payment.id)
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn-link t-small"
                id={`payment-delete-${payment.id}`}
                onClick={() => {
                  onClearStatus()
                  setPendingDeletePaymentId(payment.id)
                }}
              >
                Delete
              </button>
            </>
          }
        />
      </li>
    )
  }

  function assumedGroup() {
    if (cell.schedule === null || schedule === null) {
      return <p className="t-body soft">No standing order for this month.</p>
    }

    const counted = cell.assumed !== null
    const excepted = cell.assumedStatus?.reason === 'excepted'
    const window = schedule.endMonth
      ? `until ${formatMonth(schedule.endMonth, locale)}`
      : `from ${formatMonth(schedule.startMonth, locale)}, still running`

    return (
      <>
        <p className="t-body">
          <Money value={money(schedule.amount)} treatment="assumed" /> a month from a standing order,{' '}
          <span className="t-small soft">{window}</span>
        </p>

        <p className="calendar-assumed-status t-body">
          {counted && <span>Assumed received for {longMonth}.</span>}
          {!counted && excepted && (
            <span className="calendar-red">Marked as not received for {longMonth}.</span>
          )}
          {!counted && !excepted && (
            <span className="soft">{exclusionPhrase(cell.assumedStatus?.reason ?? 'outside-active-range')}</span>
          )}
          {(counted || excepted) && (
            <button
              type="button"
              className="btn-link t-small"
              onClick={() =>
                void run(
                  () =>
                    counted
                      ? markMonthNotReceived(subscriptionId, schedule.id, cell.month)
                      : clearMonthNotReceived(subscriptionId, schedule.id, cell.month),
                  counted ? 'Marked not received' : 'Marked received',
                  schedule.id,
                )
              }
            >
              {counted ? 'Mark not received' : 'Mark received'}
            </button>
          )}
        </p>

        {scheduleEditing ? (
          <DisclosurePanel
            id={`inspector-schedule-edit-panel-${schedule.id}`}
            open
            title="Edit standing order"
            onCancel={closeScheduleEdit}
            invalid={scheduleAlert !== null}
          >
            <ScheduleForm
              subscriptionId={subscriptionId}
              members={members}
              subscriptionStartMonth={startMonth}
              locale={locale}
              timeZone={timeZone}
              editing={schedule}
              alert={scheduleAlert}
              onAlert={setScheduleAlert}
              onSaved={(saved) => {
                closeScheduleEdit()
                setAlert(null)
                onConfirm('Changes saved', saved.id)
                onChanged()
              }}
              onCancel={closeScheduleEdit}
              onSignedOut={onSignedOut}
            />
          </DisclosurePanel>
        ) : schedulePendingDelete ? (
          <ConfirmStrip
            question={`Delete ${member.name}'s standing order? Its assumed receipts and not-received marks go with it. Recorded payments stay.`}
            onConfirm={() => void confirmScheduleDelete(schedule.id)}
            onKeep={() => {
              setSchedulePendingDelete(false)
              setFocusTarget('inspector-schedule-delete')
            }}
          />
        ) : (
          <div className="calendar-assumed-actions">
            <button
              type="button"
              className="btn-link t-small"
              id="inspector-schedule-edit"
              onClick={() => {
                onClearStatus()
                setScheduleAlert(null)
                setScheduleEditing(true)
              }}
            >
              Edit standing order
            </button>
            <button
              type="button"
              className="btn-link t-small"
              id="inspector-schedule-delete"
              onClick={() => {
                onClearStatus()
                setSchedulePendingDelete(true)
              }}
            >
              Delete standing order
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="panel calendar-inspector" onKeyDown={handleKeyDown}>
      <div className="calendar-inspector-head">
        <h3 id={headingId} tabIndex={-1}>
          {member.name}, {longMonth}
        </h3>
        <button type="button" className="btn-quiet" onClick={onClose}>
          Close
        </button>
      </div>

      <SectionAlert message={alert} onDismiss={() => setAlert(null)} />

      <p className={charge.tone === 'red' ? 't-body calendar-red' : 't-body'}>{charge.text}</p>

      <h4 className="calendar-group-heading t-small soft">
        Recorded ({recordedCount})
      </h4>
      {recordedCount === 0 ? (
        <p className="t-body soft">Nothing recorded for {longMonth}.</p>
      ) : (
        <ul className="entry-list">{cell.manualReceipts.map(recordedEntry)}</ul>
      )}

      <h4 className="calendar-group-heading t-small soft">Assumed</h4>
      {assumedGroup()}

      {!recordOpen && (
        <button
          type="button"
          className="btn-primary"
          id="inspector-record"
          aria-expanded={recordOpen}
          aria-controls="inspector-record-panel"
          onClick={() => {
            onClearStatus()
            setRecordAlert(null)
            setRecordOpen(true)
          }}
        >
          Record a payment for {formatMonth(cell.month, locale)}
        </button>
      )}

      <DisclosurePanel
        id="inspector-record-panel"
        open={recordOpen}
        title={`Record a payment for ${formatMonth(cell.month, locale)}`}
        onCancel={closeRecord}
        invalid={recordAlert !== null}
      >
        <PaymentForm
          key={recordKey}
          subscriptionId={subscriptionId}
          members={members}
          startMonth={startMonth}
          editing={null}
          presetMemberId={member.id}
          presetDate={presetDate(cell.month, currentMonth, timeZone)}
          alert={recordAlert}
          onAlert={setRecordAlert}
          onSaved={(saved) => {
            setRecordOpen(false)
            setRecordAlert(null)
            setRecordKey((key) => key + 1)
            setAlert(null)
            onConfirm('Payment recorded', saved.id)
            onChanged()
            setFocusTarget(`payment-edit-${saved.id}`)
          }}
          onCancel={closeRecord}
          onSignedOut={onSignedOut}
        />
      </DisclosurePanel>
    </div>
  )
}

/** Where focus returns when the inspector closes: its own cell, else the section heading. */
export function closeTarget(memberId: string, month: MonthStr, fallback: string): string {
  return document.getElementById(cellId(memberId, month)) ? cellId(memberId, month) : fallback
}
