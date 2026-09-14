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
import { highlightFor, type Highlight } from './interaction'
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
  onConfirm: (message: string, tint: Highlight | null) => void
  onClearStatus: () => void
  onChanged: () => void
  onSignedOut: () => void
  onClose: () => void
}

export function inspectorHeadingId(memberId: string, month: MonthStr): string {
  return `inspector-heading-${memberId}-${month}`
}

/**
 * Every id inside the inspector is scoped: to the person and the month for the
 * inspector's own controls, because a closing inspector stays mounted for the
 * length of its motion and would otherwise share its ids with the one opening;
 * and by an `inspector-` prefix for a receipt's Edit and Delete, because the
 * payments section renders its own pair for the same receipt and the two must
 * never answer each other's `getElementById`.
 */
function scopedId(part: string, memberId: string, month: MonthStr): string {
  return `inspector-${part}-${memberId}-${month}`
}

function paymentEditId(paymentId: string): string {
  return `inspector-payment-edit-${paymentId}`
}

function paymentDeleteId(paymentId: string): string {
  return `inspector-payment-delete-${paymentId}`
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

  const headingId = inspectorHeadingId(member.id, cell.month)

  /**
   * Focuses an element id once the control holding it exists. A control the
   * close or the reload is about to render is not in the tree when the target
   * is set, so the effect re-runs on the reprojected cell and, when the target
   * never arrives, falls back to the heading. That fallback is the
   * entry-left-the-month case `design-spec.md` §8 reserves the heading for, and
   * it is decided here rather than guessed at click time.
   */
  useEffect(() => {
    if (!focusTarget) return
    const element = document.getElementById(focusTarget)
    if (element) {
      element.focus()
      setFocusTarget(null)
      return
    }
    const timer = setTimeout(() => {
      document.getElementById(headingId)?.focus()
      setFocusTarget(null)
    }, 1000)
    return () => clearTimeout(timer)
  }, [focusTarget, headingId, cell])
  const longMonth = formatLongMonth(cell.month, locale)
  const money = (minor: number) => formatMoney(minor, locale, currency)
  const charge = chargeSentence(cell, locale, currency)
  const recordedCount = cell.manualReceipts.length
  const recordButtonId = scopedId('record', member.id, cell.month)
  const recordPanelId = scopedId('record-panel', member.id, cell.month)
  const scheduleEditId = scopedId('schedule-edit', member.id, cell.month)
  const scheduleDeleteId = scopedId('schedule-delete', member.id, cell.month)

  /**
   * Escape anywhere inside closes the inspector. An open form or confirm strip
   * stops the key before it reaches here, so only the outer case arrives.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    onClose()
  }

  /**
   * `landedIn` is the month the receipt now belongs to. A receipt that stayed
   * returns focus to its own Edit button; one that was edited into another
   * month has no entry here to return to, so focus goes to the inspector
   * heading, which is what `design-spec.md` §8 reserves it for.
   */
  function closePaymentEdit(paymentId: string, landedIn: MonthStr = cell.month) {
    setEditingPaymentId(null)
    setEditAlert(null)
    setFocusTarget(landedIn === cell.month ? paymentEditId(paymentId) : headingId)
  }

  function closeRecord() {
    setRecordOpen(false)
    setRecordAlert(null)
    setRecordKey((key) => key + 1)
    setFocusTarget(recordButtonId)
  }

  function closeScheduleEdit() {
    setScheduleEditing(false)
    setScheduleAlert(null)
    setFocusTarget(scheduleEditId)
  }

  /** Every action outside a panel lands its refusal in the inspector's own alert. */
  async function run(action: () => Promise<unknown>, confirmation: string, tint: Highlight | null) {
    try {
      await action()
      setAlert(null)
      onConfirm(confirmation, tint)
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
      onConfirm('Payment deleted', highlightFor(member.id, cell.month))
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setAlert(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
      setFocusTarget(paymentDeleteId(payment.id))
    }
  }

  async function confirmScheduleDelete(scheduleId: string) {
    setSchedulePendingDelete(false)
    try {
      await deleteSchedule(subscriptionId, scheduleId)
      setAlert(null)
      setFocusTarget(headingId)
      onConfirm('Standing order deleted', highlightFor(member.id))
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setAlert(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
      setFocusTarget(scheduleDeleteId)
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
                closePaymentEdit(saved.id, saved.date.slice(0, 7))
                setAlert(null)
                onConfirm('Changes saved', highlightFor(member.id, saved.date))
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
                  setFocusTarget(paymentDeleteId(payment.id))
                }}
              />
            ) : undefined
          }
          actions={
            <>
              <button
                type="button"
                className="btn-link t-small"
                id={paymentEditId(payment.id)}
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
                id={paymentDeleteId(payment.id)}
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
    const assumedReason = cell.assumedStatus?.reason ?? null
    const excepted = assumedReason === 'excepted'
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
          {!counted && !excepted && assumedReason !== null && (
            <span className="soft">Not assumed: {exclusionPhrase(assumedReason)}.</span>
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
                  highlightFor(member.id, cell.month),
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
              onSaved={() => {
                closeScheduleEdit()
                setAlert(null)
                onConfirm('Changes saved', highlightFor(member.id))
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
              setFocusTarget(scheduleDeleteId)
            }}
          />
        ) : (
          <div className="calendar-assumed-actions">
            <button
              type="button"
              className="btn-link t-small"
              id={scheduleEditId}
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
              id={scheduleDeleteId}
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
        {recordedCount === 0 ? 'Recorded' : `Recorded (${recordedCount})`}
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
          id={recordButtonId}
          aria-expanded={recordOpen}
          aria-controls={recordPanelId}
          onClick={() => {
            onClearStatus()
            setRecordAlert(null)
            setRecordOpen(true)
          }}
        >
          Record a payment for {longMonth}
        </button>
      )}

      <DisclosurePanel
        id={recordPanelId}
        open={recordOpen}
        title={`Record a payment for ${longMonth}`}
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
            onConfirm('Payment recorded', highlightFor(member.id, saved.date))
            onChanged()
            setFocusTarget(paymentEditId(saved.id))
          }}
          onCancel={closeRecord}
          onSignedOut={onSignedOut}
        />
      </DisclosurePanel>
    </div>
  )
}
