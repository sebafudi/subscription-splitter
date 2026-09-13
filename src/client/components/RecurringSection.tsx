import { useEffect, useState } from 'react'
import { formatMoney } from '../../domain/money'
import type { MemberMonthInputs, MonthExclusion } from '../../domain/month-status'
import { scheduleMonthStatuses } from '../../domain/recurring'
import {
  ApiError,
  SignedOutError,
  clearMonthNotReceived,
  deleteSchedule,
  markMonthNotReceived,
  type Member,
  type MonthStr,
  type Schedule,
} from '../api'
import { formatMonth } from '../format'
import { ScheduleForm } from './ScheduleForm'
import { STANDING_ORDERS } from './sections'
import { ConfirmStrip } from './ui/ConfirmStrip'
import { DisclosurePanel } from './ui/DisclosurePanel'
import { CONNECTION_FAILURE } from './ui/FormAlert'
import { LedgerEntry } from './ui/LedgerEntry'
import { Money } from './ui/Money'
import { SectionAlert } from './ui/SectionAlert'
import { SectionHeader } from './ui/SectionHeader'
import { StatusLine } from './ui/StatusLine'
import { useSectionStatus } from './ui/useSectionStatus'

const ADD_PANEL_ID = 'schedule-add-panel'
const ADD_BUTTON_ID = 'schedule-add-button'
const REFUSAL_ID = 'schedule-refusal'

type Props = {
  subscriptionId: string
  schedules: Schedule[]
  members: Member[]
  /** Exactly what `memberMonthStatus` reads, taken from reads the screen already makes. */
  monthInputs: MemberMonthInputs
  currentMonth: MonthStr
  currency: string
  locale: string
  startMonth: string
  timeZone: string
  onChanged: () => void
  onSignedOut: () => void
}

/**
 * One phrase per condition, total over the union so the compiler keeps it that
 * way. Only three can reach a row here: the row set stops at the current month,
 * a start month below the plan's first month is refused, and an arrangement
 * naming the owner is refused at both write paths. The other phrases exist so
 * the mapping needs no fallback branch, not because a row can carry them.
 *
 * A row that does not count always carries a reason, so the phrase is looked
 * up only when there is one. Defaulting a missing reason to a named condition
 * would turn an absence into a specific claim about the organizer's own
 * action.
 *
 * The tile that shows a phrase is already dashed, which is what the old
 * "not counted, " prefix said in words, so the prefix is simply not reproduced.
 * The phrases themselves are untouched.
 */
const REASON_PHRASE: Record<MonthExclusion, string> = {
  'break-month': 'the plan was paused that month',
  'outside-active-range': 'the participant was not on the plan that month',
  excepted: 'marked as not received',
  'not-yet-elapsed': 'that month has not arrived yet',
  'before-start-month': 'that month is before the plan started',
  'owner-member': 'the owner is never paid from',
  unpriced: 'that month had no price',
}

export function RecurringSection({
  subscriptionId,
  schedules,
  members,
  monthInputs,
  currentMonth,
  currency,
  locale,
  startMonth,
  timeZone,
  onChanged,
  onSignedOut,
}: Props) {
  const [sectionError, setSectionError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addAlert, setAddAlert] = useState<string | null>(null)
  const [addKey, setAddKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAlert, setEditAlert] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const status = useSectionStatus()

  useEffect(() => {
    if (!focusTarget) return
    document.getElementById(focusTarget)?.focus()
    setFocusTarget(null)
  }, [focusTarget])

  const participants = members.filter((member) => !member.isOwner)
  const money = (minor: number) => formatMoney(minor, locale, currency)

  function closeAdd() {
    setAddOpen(false)
    setAddAlert(null)
    setAddKey((key) => key + 1)
    setFocusTarget(ADD_BUTTON_ID)
  }

  function closeEdit(scheduleId: string) {
    setEditingId(null)
    setEditAlert(null)
    setFocusTarget(`schedule-edit-${scheduleId}`)
  }

  /** A tile toggle happens outside every panel, so its refusal belongs to the section alert. */
  async function toggleMonth(action: () => Promise<unknown>, confirmation: string, scheduleId: string) {
    try {
      await action()
      setSectionError(null)
      status.confirm(confirmation, scheduleId)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setSectionError(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
    }
  }

  async function confirmDelete(schedule: Schedule) {
    setPendingDelete(null)
    try {
      await deleteSchedule(subscriptionId, schedule.id)
      setSectionError(null)
      setFocusTarget(STANDING_ORDERS.id)
      status.confirm('Standing order deleted', null)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setSectionError(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
      setFocusTarget(`schedule-delete-${schedule.id}`)
    }
  }

  return (
    <section aria-labelledby={STANDING_ORDERS.id}>
      <SectionHeader
        id={STANDING_ORDERS.id}
        title={STANDING_ORDERS.title}
        count={schedules.length}
        subtitle={STANDING_ORDERS.subtitle}
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
              {STANDING_ORDERS.action}
            </button>
          )
        }
      >
        {participants.length === 0 && (
          <p id={REFUSAL_ID} className="section-refusal t-small soft">
            Add a participant before adding a standing order.
          </p>
        )}
        <SectionAlert message={sectionError} onDismiss={() => setSectionError(null)} />
      </SectionHeader>

      <DisclosurePanel
        id={ADD_PANEL_ID}
        open={addOpen}
        title="Add a standing order"
        onCancel={closeAdd}
        invalid={addAlert !== null}
      >
        <ScheduleForm
          key={addKey}
          subscriptionId={subscriptionId}
          members={members}
          subscriptionStartMonth={startMonth}
          locale={locale}
          timeZone={timeZone}
          editing={null}
          alert={addAlert}
          onAlert={setAddAlert}
          onSaved={(saved) => {
            closeAdd()
            setSectionError(null)
            status.confirm('Standing order added', saved.id)
            onChanged()
          }}
          onCancel={closeAdd}
          onSignedOut={onSignedOut}
        />
      </DisclosurePanel>

      {schedules.length === 0 ? (
        <p className="section-empty t-body soft">No standing orders yet.</p>
      ) : (
        <ul className="entry-list">
          {schedules.map((schedule) => {
            const member = members.find((candidate) => candidate.id === schedule.memberId)
            if (!member) return null

            if (editingId === schedule.id) {
              return (
                <li key={schedule.id}>
                  <DisclosurePanel
                    id={`schedule-edit-panel-${schedule.id}`}
                    open
                    title="Edit standing order"
                    onCancel={() => closeEdit(schedule.id)}
                    invalid={editAlert !== null}
                  >
                    <ScheduleForm
                      subscriptionId={subscriptionId}
                      members={members}
                      subscriptionStartMonth={startMonth}
                      locale={locale}
                      timeZone={timeZone}
                      editing={schedule}
                      alert={editAlert}
                      onAlert={setEditAlert}
                      onSaved={(saved) => {
                        closeEdit(saved.id)
                        setSectionError(null)
                        status.confirm('Changes saved', saved.id)
                        onChanged()
                      }}
                      onCancel={() => closeEdit(schedule.id)}
                      onSignedOut={onSignedOut}
                    />
                  </DisclosurePanel>
                </li>
              )
            }

            // The one call that decides how every month below is drawn. The
            // screen applies none of the six conditions itself, so a month the
            // server excluded can never appear here as assumed received.
            const statuses = scheduleMonthStatuses(
              monthInputs,
              member,
              schedule,
              schedule.exceptionMonths,
              currentMonth,
            )
            const countedMonths = statuses.filter((status) => status.counts)
            const assumedTotal = countedMonths.length * schedule.amount

            return (
              <li key={schedule.id}>
                <LedgerEntry
                  highlighted={status.highlightedId === schedule.id}
                  primary={
                    <>
                      <Money value={money(schedule.amount)} treatment="assumed" /> a month from {member.name}
                    </>
                  }
                  figure={
                    <span className="t-small soft">
                      {schedule.endMonth
                        ? `until ${formatMonth(schedule.endMonth, locale)}`
                        : `from ${formatMonth(schedule.startMonth, locale)}, still running`}
                    </span>
                  }
                  secondary={
                    <>
                      <Money value={money(assumedTotal)} treatment="assumed" /> assumed received so far, over{' '}
                      {countedMonths.length} of {statuses.length} elapsed months
                    </>
                  }
                  confirm={
                    pendingDelete === schedule.id ? (
                      <ConfirmStrip
                        question={`Delete ${member.name}'s standing order? Its assumed receipts and not-received marks go with it. Recorded payments stay.`}
                        onConfirm={() => void confirmDelete(schedule)}
                        onKeep={() => {
                          setPendingDelete(null)
                          setFocusTarget(`schedule-delete-${schedule.id}`)
                        }}
                      />
                    ) : undefined
                  }
                  actions={
                    <>
                      <button
                        type="button"
                        className="btn-link t-small"
                        id={`schedule-edit-${schedule.id}`}
                        onClick={() => {
                          status.clear()
                          setEditAlert(null)
                          setEditingId(schedule.id)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-link t-small"
                        id={`schedule-delete-${schedule.id}`}
                        onClick={() => {
                          status.clear()
                          setPendingDelete(schedule.id)
                        }}
                      >
                        Delete
                      </button>
                    </>
                  }
                >
                  {statuses.length > 0 && (
                    <ul className="tiles">
                      {statuses.map((monthStatus) => {
                        const notReceived = !monthStatus.counts && monthStatus.reason === 'excepted'
                        const tileClass = monthStatus.counts
                          ? 'tile tile-counted'
                          : notReceived
                            ? 'tile tile-not-received'
                            : 'tile tile-excluded'
                        return (
                          <li key={monthStatus.month} className={tileClass}>
                            <span className="tile-month t-small">{formatMonth(monthStatus.month, locale)}</span>
                            {monthStatus.counts && (
                              <span className="t-small tnum">
                                <Money value={money(schedule.amount)} treatment="assumed" /> assumed received
                              </span>
                            )}
                            {!monthStatus.counts && monthStatus.reason && (
                              <span className={notReceived ? 't-small tile-reason-red' : 't-small soft'}>
                                {REASON_PHRASE[monthStatus.reason]}
                              </span>
                            )}
                            {(monthStatus.counts || notReceived) && (
                              <button
                                type="button"
                                className="btn-link t-small"
                                onClick={() =>
                                  void toggleMonth(
                                    () =>
                                      monthStatus.counts
                                        ? markMonthNotReceived(subscriptionId, schedule.id, monthStatus.month)
                                        : clearMonthNotReceived(subscriptionId, schedule.id, monthStatus.month),
                                    monthStatus.counts ? 'Marked not received' : 'Marked received',
                                    schedule.id,
                                  )
                                }
                              >
                                {monthStatus.counts ? 'Mark not received' : 'Mark received'}
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </LedgerEntry>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
