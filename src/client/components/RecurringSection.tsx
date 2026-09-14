import { useEffect, useState } from 'react'
import { formatMoney } from '../../domain/money'
import type { MemberMonthInputs } from '../../domain/month-status'
import { scheduleMonthStatuses } from '../../domain/recurring'
import { ApiError, SignedOutError, deleteSchedule, type Member, type MonthStr, type Schedule } from '../api'
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
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
