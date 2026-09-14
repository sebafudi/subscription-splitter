import { useEffect, useMemo, useState } from 'react'
import type { MonthStr, Payment, SubscriptionState, Summary } from '../../domain/types'
import { ApiError, SignedOutError, deleteMember, updateMember, type Member, type Schedule } from '../api'
import { MemberForm } from '../components/MemberForm'
import { PARTICIPANTS } from '../components/sections'
import { DisclosurePanel } from '../components/ui/DisclosurePanel'
import { CONNECTION_FAILURE } from '../components/ui/FormAlert'
import { SectionAlert } from '../components/ui/SectionAlert'
import { SectionHeader } from '../components/ui/SectionHeader'
import { StatusLine } from '../components/ui/StatusLine'
import { useSectionStatus } from '../components/ui/useSectionStatus'
import { orderedIds, resolveHighlight } from './interaction'
import { MonthInspector } from './MonthInspector'
import { cellId } from './MonthStrip'
import { PersonBlock } from './PersonBlock'
import { calendarYearRange, futureYearPayments, projectPersonYear, type PersonYear } from './projection'
import { readSelection, resolveSelection, writeSelection } from './selection'
import { YearControl } from './YearControl'

const ADD_PANEL_ID = 'participant-add-panel'
const ADD_BUTTON_ID = 'participant-add-button'

type Props = {
  subscriptionId: string
  startMonth: string
  members: Member[]
  summary: Summary
  timeZone: string
  /** The domain's own state, assembled once by the screen from the records it holds. */
  state: SubscriptionState
  payments: Payment[]
  schedules: Schedule[]
  onChanged: () => void
  onSignedOut: () => void
}

type OpenInspector = { memberId: string; month: MonthStr }

function monthOf(year: number, index: number): MonthStr {
  return `${String(year).padStart(4, '0')}-${String(index).padStart(2, '0')}`
}

function indexOf(month: MonthStr): number {
  return Number(month.slice(5, 7))
}

/**
 * The Participants section: a year control, one person block per participant
 * with twelve month cells, and one month inspector open at a time.
 *
 * The section holds the selected year, the open inspector, the per-strip active
 * month and the frozen order, because each of those crosses more than one
 * block. A block reads none of them for itself.
 */
export function MemberCalendar({
  subscriptionId,
  startMonth,
  members,
  summary,
  timeZone,
  state,
  payments,
  schedules,
  onChanged,
  onSignedOut,
}: Props) {
  const currentMonth = summary.currentMonth
  const defaultYear = Number(currentMonth.slice(0, 4))

  const [year, setYear] = useState(defaultYear)
  const [openInspector, setOpenInspector] = useState<OpenInspector | null>(null)
  const [restored, setRestored] = useState(false)
  const [showSettledArchived, setShowSettledArchived] = useState(false)
  const [sectionError, setSectionError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addAlert, setAddAlert] = useState<string | null>(null)
  const [addKey, setAddKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAlert, setEditAlert] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  // One month index per person, so the strip's single tab stop survives a
  // re-render and keeps its position when the year changes.
  const [activeIndex, setActiveIndex] = useState<Record<string, number>>({})
  const [frozenIds, setFrozenIds] = useState<string[] | null>(null)
  const status = useSectionStatus()

  const range = useMemo(() => calendarYearRange(state, currentMonth), [state, currentMonth])

  // Restores the year and the inspector once per subscription, and only if the
  // year is still inside the range and the member still exists.
  useEffect(() => {
    if (restored) return
    setRestored(true)
    const stored = readSelection(subscriptionId)
    const resolved = resolveSelection(stored, range, members, defaultYear)
    if (resolved.memberId && resolved.month) {
      setYear(resolved.year)
      setOpenInspector({ memberId: resolved.memberId, month: resolved.month })
      return
    }
    // A stored selection with no inspector carries no member for
    // `resolveSelection` to find, so the year alone is restored here on the
    // same range test it applies (`design-spec.md` §3 retains both).
    const inRange = stored !== null && stored.year >= range.first && stored.year <= range.last
    setYear(inRange ? stored.year : defaultYear)
  }, [restored, subscriptionId, range, members, defaultYear])

  useEffect(() => {
    if (!restored) return
    writeSelection(subscriptionId, {
      year,
      memberId: openInspector?.memberId ?? '',
      month: openInspector?.month ?? '',
    })
  }, [restored, subscriptionId, year, openInspector])

  useEffect(() => {
    if (!focusTarget) return
    document.getElementById(focusTarget)?.focus()
    setFocusTarget(null)
  }, [focusTarget])

  const byId = new Map(members.map((member) => [member.id, member]))
  const rows = summary.members.map((row) => ({ row, member: byId.get(row.memberId) }))
  const settledArchived = rows.filter(({ row }) => row.archived && row.balance === 0)
  const listedRows = rows.filter(({ row }) => !(row.archived && row.balance === 0))

  // The order freezes while any inspector, edit panel or confirm strip is open,
  // so a balance that changes underneath moves no block, and is reapplied as
  // the last one closes.
  const anyOpen = openInspector !== null || editingId !== null || pendingDelete !== null
  useEffect(() => {
    if (anyOpen) {
      setFrozenIds((frozen) => frozen ?? summary.members.map((row) => row.memberId))
      return
    }
    setFrozenIds(null)
  }, [anyOpen, summary.members])

  const order = orderedIds(
    listedRows.map(({ row }) => row.memberId),
    frozenIds,
  )
  const listed = order
    .map((memberId) => listedRows.find(({ row }) => row.memberId === memberId))
    .filter((entry): entry is (typeof listedRows)[number] => entry !== undefined)

  const yearsByMember = useMemo(() => {
    const projected = new Map<string, PersonYear>()
    for (const member of members) {
      if (member.isOwner) continue
      projected.set(member.id, projectPersonYear(state, member, year, currentMonth))
    }
    return projected
  }, [state, members, year, currentMonth])

  const highlight = resolveHighlight(
    status.highlightedId,
    payments,
    schedules,
    members.map((member) => member.id),
  )

  function activeMonthFor(memberId: string): MonthStr {
    const stored = activeIndex[memberId]
    if (stored) return monthOf(year, stored)
    if (openInspector?.memberId === memberId) return monthOf(year, indexOf(openInspector.month))
    if (Number(currentMonth.slice(0, 4)) === year) return monthOf(year, indexOf(currentMonth))
    return monthOf(year, 1)
  }

  function setActiveMonth(memberId: string, month: MonthStr) {
    setActiveIndex((current) => ({ ...current, [memberId]: indexOf(month) }))
  }

  function closeAdd() {
    setAddOpen(false)
    setAddAlert(null)
    setAddKey((key) => key + 1)
    setFocusTarget(ADD_BUTTON_ID)
  }

  function closeEdit(memberId: string) {
    setEditingId(null)
    setEditAlert(null)
    setFocusTarget(`participant-edit-${memberId}`)
  }

  /**
   * Changing the year re-renders every strip in place and keeps the open
   * inspector on the same person and the same calendar month, which is the one
   * thing that moves with the year (`design-spec.md` §3).
   */
  function selectYear(next: number) {
    setYear(next)
    setOpenInspector((open) => (open === null ? null : { ...open, month: monthOf(next, indexOf(open.month)) }))
  }

  function openMonth(memberId: string, month: MonthStr) {
    status.clear()
    setActiveMonth(memberId, month)
    setOpenInspector({ memberId, month })
  }

  /** The inspector returns focus to its own cell, or to the heading when that cell is gone. */
  function closeInspector() {
    if (!openInspector) return
    const target = cellId(openInspector.memberId, openInspector.month)
    setOpenInspector(null)
    setFocusTarget(document.getElementById(target) ? target : PARTICIPANTS.id)
  }

  /** Up and Down carry the same month into the adjacent block's strip. */
  function leaveVertically(memberId: string, direction: 'up' | 'down', month: MonthStr) {
    const position = listed.findIndex((entry) => entry.row.memberId === memberId)
    const next = listed[direction === 'up' ? position - 1 : position + 1]
    if (!next) return
    setActiveMonth(next.row.memberId, month)
    document.getElementById(cellId(next.row.memberId, month))?.focus()
  }

  /** Every action outside a panel lands its refusal in the section alert. */
  async function run(action: () => Promise<unknown>, confirmation: string, highlightedId: string | null) {
    try {
      await action()
      setSectionError(null)
      status.confirm(confirmation, highlightedId)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setSectionError(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
    }
  }

  async function confirmDelete(memberId: string) {
    setPendingDelete(null)
    try {
      await deleteMember(subscriptionId, memberId)
      setSectionError(null)
      if (openInspector?.memberId === memberId) setOpenInspector(null)
      setFocusTarget(PARTICIPANTS.id)
      status.confirm('Participant deleted', null)
      onChanged()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setSectionError(err instanceof ApiError ? err.message : CONNECTION_FAILURE)
      setFocusTarget(`participant-delete-${memberId}`)
    }
  }

  function blockFor({ row, member }: (typeof rows)[number]) {
    if (editingId === row.memberId && member) {
      return (
        <div key={row.memberId} className="calendar-block">
          <DisclosurePanel
            id={`participant-edit-panel-${member.id}`}
            open
            title={`Edit ${member.name}`}
            onCancel={() => closeEdit(member.id)}
            invalid={editAlert !== null}
          >
            <MemberForm
              subscriptionId={subscriptionId}
              startMonth={startMonth}
              locale={summary.locale}
              timeZone={timeZone}
              editing={member}
              alert={editAlert}
              onAlert={setEditAlert}
              onSaved={(saved) => {
                closeEdit(saved.id)
                setSectionError(null)
                status.confirm('Changes saved', saved.id)
                onChanged()
              }}
              onCancel={() => closeEdit(member.id)}
              onSignedOut={onSignedOut}
            />
          </DisclosurePanel>
        </div>
      )
    }

    const personYear = yearsByMember.get(row.memberId) ?? null
    const open = openInspector?.memberId === row.memberId ? openInspector : null
    const cell = open && personYear ? personYear.cells.find((candidate) => candidate.month === open.month) : undefined

    return (
      <PersonBlock
        key={row.memberId}
        row={row}
        member={member}
        personYear={personYear}
        year={year}
        locale={summary.locale}
        currency={summary.currency}
        currentMonth={currentMonth}
        selectedMonth={open?.month ?? null}
        highlighted={highlight?.memberId === row.memberId}
        highlightedMonth={highlight?.memberId === row.memberId ? highlight.month : null}
        pendingDelete={pendingDelete === row.memberId}
        activeMonth={activeMonthFor(row.memberId)}
        onSelectMonth={(month) => openMonth(row.memberId, month)}
        onActiveMonthChange={(month) => setActiveMonth(row.memberId, month)}
        onLeaveVertically={(direction, month) => leaveVertically(row.memberId, direction, month)}
        onCloseInspector={closeInspector}
        onEdit={() => {
          status.clear()
          setEditAlert(null)
          setEditingId(row.memberId)
        }}
        onArchiveToggle={() => {
          if (!member) return
          void run(
            () => updateMember(subscriptionId, member.id, { archived: !member.archived }),
            member.archived ? 'Participant unarchived' : 'Participant archived',
            member.id,
          )
        }}
        onRequestDelete={() => {
          status.clear()
          setPendingDelete(row.memberId)
        }}
        onConfirmDelete={() => void confirmDelete(row.memberId)}
        onCancelDelete={() => {
          setPendingDelete(null)
          setFocusTarget(`participant-delete-${row.memberId}`)
        }}
      >
        {member && cell && (
          <MonthInspector
            // Remounts when the selected month changes, so a form opened for
            // one month never carries its presets into the next.
            key={`${row.memberId}-${cell.month}`}
            subscriptionId={subscriptionId}
            member={member}
            cell={cell}
            schedule={schedules.find((candidate) => candidate.id === cell.schedule?.id) ?? null}
            members={members}
            locale={summary.locale}
            currency={summary.currency}
            startMonth={startMonth}
            timeZone={timeZone}
            currentMonth={currentMonth}
            onConfirm={status.confirm}
            onClearStatus={status.clear}
            onChanged={onChanged}
            onSignedOut={onSignedOut}
            onClose={closeInspector}
          />
        )}
      </PersonBlock>
    )
  }

  return (
    <section aria-labelledby={PARTICIPANTS.id}>
      <SectionHeader
        id={PARTICIPANTS.id}
        title={PARTICIPANTS.title}
        subtitle={PARTICIPANTS.subtitle}
        status={<StatusLine message={status.message} />}
        action={
          !addOpen && (
            <button
              type="button"
              className="btn-primary"
              id={ADD_BUTTON_ID}
              aria-expanded={addOpen}
              aria-controls={ADD_PANEL_ID}
              onClick={() => {
                status.clear()
                setAddOpen(true)
              }}
            >
              {PARTICIPANTS.action}
            </button>
          )
        }
      >
        <SectionAlert message={sectionError} onDismiss={() => setSectionError(null)} />
      </SectionHeader>

      <DisclosurePanel
        id={ADD_PANEL_ID}
        open={addOpen}
        title="Add a participant"
        onCancel={closeAdd}
        invalid={addAlert !== null}
      >
        <MemberForm
          key={addKey}
          subscriptionId={subscriptionId}
          startMonth={startMonth}
          locale={summary.locale}
          timeZone={timeZone}
          editing={null}
          alert={addAlert}
          onAlert={setAddAlert}
          onSaved={(member) => {
            closeAdd()
            setSectionError(null)
            status.confirm('Participant added', member.id)
            onChanged()
          }}
          onCancel={closeAdd}
          onSignedOut={onSignedOut}
        />
      </DisclosurePanel>

      {listed.length === 0 && settledArchived.length === 0 ? (
        <p className="section-empty t-body soft">No participants yet.</p>
      ) : (
        <>
          <YearControl
            year={year}
            range={range}
            locale={summary.locale}
            futureYears={futureYearPayments(state, year)}
            onSelectYear={selectYear}
          />
          <div className="calendar-blocks">{listed.map(blockFor)}</div>
        </>
      )}

      {settledArchived.length > 0 && (
        <>
          <div className="disclosure" data-open={showSettledArchived}>
            <div className="disclosure-inner" inert={!showSettledArchived}>
              <div className="calendar-blocks-archived">{settledArchived.map(blockFor)}</div>
            </div>
          </div>
          <button
            type="button"
            className="btn-link t-small settled-archived-toggle"
            aria-expanded={showSettledArchived}
            onClick={() => setShowSettledArchived((shown) => !shown)}
          >
            {showSettledArchived
              ? `Hide settled archived participant${settledArchived.length === 1 ? '' : 's'}`
              : `Show ${settledArchived.length} settled archived participant${settledArchived.length === 1 ? '' : 's'}`}
          </button>
        </>
      )}
    </section>
  )
}
