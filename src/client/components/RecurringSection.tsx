import { useState } from 'react'
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
import { ScheduleForm } from './ScheduleForm'
import { STANDING_ORDERS } from './sections'

type Props = {
  subscriptionId: string
  schedules: Schedule[]
  members: Member[]
  /** Exactly what `memberMonthStatus` reads, taken from reads the screen already makes. */
  monthInputs: MemberMonthInputs
  currentMonth: MonthStr
  currency: string
  locale: string
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
  onChanged,
  onSignedOut,
}: Props) {
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const money = (minor: number) => formatMoney(minor, locale, currency)

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) return onSignedOut()
      setError(err instanceof ApiError ? err.message : 'That did not work.')
    }
  }

  return (
    <section>
      <h3 id={STANDING_ORDERS.id} className="section-anchor">
        {STANDING_ORDERS.title}
      </h3>
      <p className="row-detail">
        Money assumed received each month, without further entry. Nothing here is a recorded receipt.
      </p>

      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}

      {schedules.length === 0 ? (
        <p>No standing orders yet.</p>
      ) : (
        <ul className="row-list">
          {schedules.map((schedule) => {
            const member = members.find((candidate) => candidate.id === schedule.memberId)
            if (!member) return null

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
              <li key={schedule.id} className="row schedule">
                <div className="row-main">
                  <strong>
                    {money(schedule.amount)} a month from {member.name}
                  </strong>
                  <div className="row-detail">
                    from {schedule.startMonth}
                    {schedule.endMonth ? ` until ${schedule.endMonth}` : ', still running'}
                  </div>
                  <div className="row-detail">
                    <strong>{money(assumedTotal)}</strong> assumed received so far, over{' '}
                    {countedMonths.length} of {statuses.length} elapsed month(s).
                  </div>

                  {statuses.length > 0 && (
                    <ul className="month-grid">
                      {statuses.map((status) => {
                        const togglable = status.counts || status.reason === 'excepted'
                        return (
                          <li
                            key={status.month}
                            className={status.counts ? 'month-chip counted' : 'month-chip not-counted'}
                          >
                            <span className="month-name">{status.month}</span>
                            <span className="month-state">
                              {status.counts
                                ? `${money(schedule.amount)} assumed received`
                                : `not counted${status.reason ? `, ${REASON_PHRASE[status.reason]}` : ''}`}
                            </span>
                            {togglable && (
                              <button
                                type="button"
                                onClick={() =>
                                  run(() =>
                                    status.counts
                                      ? markMonthNotReceived(subscriptionId, schedule.id, status.month)
                                      : clearMonthNotReceived(subscriptionId, schedule.id, status.month),
                                  )
                                }
                              >
                                {status.counts ? 'Mark not received' : 'Mark received'}
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {pendingDelete === schedule.id && (
                    <div role="alert" className="inline-confirm">
                      <p>
                        Delete this standing order for {member.name}? Their assumed receipts of{' '}
                        {money(assumedTotal)} go with it, and so do the months marked as not received.
                      </p>
                      <div className="button-row">
                        <button
                          type="button"
                          onClick={() =>
                            run(async () => {
                              await deleteSchedule(subscriptionId, schedule.id)
                              setPendingDelete(null)
                            })
                          }
                        >
                          Delete it
                        </button>
                        <button type="button" onClick={() => setPendingDelete(null)}>
                          Keep it
                        </button>
                      </div>
                    </div>
                  )}

                  {editing?.id === schedule.id && (
                    <ScheduleForm
                      subscriptionId={subscriptionId}
                      members={members}
                      editing={schedule}
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
                    onClick={() => setEditing(editing?.id === schedule.id ? null : schedule)}
                  >
                    {editing?.id === schedule.id ? 'Close' : 'Edit'}
                  </button>
                  <button type="button" onClick={() => setPendingDelete(schedule.id)}>
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ScheduleForm
        subscriptionId={subscriptionId}
        members={members}
        editing={null}
        onSaved={onChanged}
        onSignedOut={onSignedOut}
      />
    </section>
  )
}
