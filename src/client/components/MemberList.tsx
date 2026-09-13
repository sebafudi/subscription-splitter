import { useEffect, useState } from 'react'
import { formatMoney } from '../../domain/money'
import { ApiError, SignedOutError, deleteMember, updateMember, type Member, type Summary } from '../api'
import { PARTICIPANTS } from './sections'
import { MemberForm } from './MemberForm'
import { ConfirmStrip } from './ui/ConfirmStrip'
import { DisclosurePanel } from './ui/DisclosurePanel'
import { CONNECTION_FAILURE } from './ui/FormAlert'
import { LedgerEntry } from './ui/LedgerEntry'
import { Balance, type BalanceState } from './ui/Money'
import { SectionAlert } from './ui/SectionAlert'
import { SectionHeader } from './ui/SectionHeader'
import { StatusLine } from './ui/StatusLine'
import { useSectionStatus } from './ui/useSectionStatus'

const ADD_PANEL_ID = 'participant-add-panel'
const ADD_BUTTON_ID = 'participant-add-button'

type Props = {
  subscriptionId: string
  startMonth: string
  members: Member[]
  summary: Summary
  onChanged: () => void
  onSignedOut: () => void
}

/**
 * Participants most-owing first, which is the order the summary already
 * returns. The owner is not a row here: they are the account holder, shown
 * above with their own share of the month rather than with a balance. The
 * heading carries no count for the same reason: the API's active count includes
 * the organizer, so it could never agree with the rows beneath it.
 *
 * An archived participant whose balance is zero is settled and hidden by
 * default; one who still owes or is still ahead stays visible, because hiding
 * a live balance is how money goes missing from a screen.
 */
export function MemberList({ subscriptionId, startMonth, members, summary, onChanged, onSignedOut }: Props) {
  const [showSettledArchived, setShowSettledArchived] = useState(false)
  const [sectionError, setSectionError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addAlert, setAddAlert] = useState<string | null>(null)
  const [addKey, setAddKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAlert, setEditAlert] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  // An element id, focused once the control that owned it has remounted.
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const status = useSectionStatus()

  useEffect(() => {
    if (!focusTarget) return
    document.getElementById(focusTarget)?.focus()
    setFocusTarget(null)
  }, [focusTarget])

  const byId = new Map(members.map((member) => [member.id, member]))
  const rows = summary.members.map((row) => ({ row, member: byId.get(row.memberId) }))
  const settledArchived = rows.filter(({ row }) => row.archived && row.balance === 0)
  const listed = rows.filter(({ row }) => !(row.archived && row.balance === 0))

  function money(minor: number): string {
    return formatMoney(minor, summary.locale, summary.currency)
  }

  function balanceState(balance: number): BalanceState {
    if (balance < 0) return 'owes'
    return balance > 0 ? 'ahead' : 'settled'
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

  /** Every action outside a panel lands its refusal in the section alert, never in a panel. */
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

  /**
   * A completed delete takes the row that held focus with it, so focus moves to
   * the section's heading. A refused one leaves the row standing, so it goes
   * back to the Delete button that opened the strip.
   */
  async function confirmDelete(memberId: string) {
    setPendingDelete(null)
    try {
      await deleteMember(subscriptionId, memberId)
      setSectionError(null)
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

  /** One row shape for both lists, so a settled archived participant keeps every action. */
  function entryFor({ row, member }: { row: Summary['members'][number]; member: Member | undefined }) {
    if (editingId === row.memberId && member) {
      return (
        <li key={row.memberId}>
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
        </li>
      )
    }

    return (
      <li key={row.memberId}>
        <LedgerEntry
          highlighted={status.highlightedId === row.memberId}
          primary={
            <>
              {row.name}
              {row.archived && <span className="entry-tag t-small soft"> archived</span>}
              {!row.activeThisMonth && <span className="entry-tag t-small soft"> not active this month</span>}
            </>
          }
          figure={
            <Balance
              state={balanceState(row.balance)}
              value={money(row.balance < 0 ? -row.balance : row.balance)}
            />
          }
          confirm={
            pendingDelete === row.memberId ? (
              <ConfirmStrip
                question={`Delete ${row.name}? Their payments stay recorded.`}
                onConfirm={() => void confirmDelete(row.memberId)}
                onKeep={() => {
                  setPendingDelete(null)
                  setFocusTarget(`participant-delete-${row.memberId}`)
                }}
              />
            ) : undefined
          }
          actions={
            <>
              {member && (
                <button
                  type="button"
                  className="btn-link t-small"
                  id={`participant-edit-${member.id}`}
                  onClick={() => {
                    status.clear()
                    setEditAlert(null)
                    setEditingId(member.id)
                  }}
                >
                  Edit
                </button>
              )}
              {member && (
                <button
                  type="button"
                  className="btn-link t-small"
                  onClick={() =>
                    void run(
                      () => updateMember(subscriptionId, member.id, { archived: !member.archived }),
                      member.archived ? 'Participant unarchived' : 'Participant archived',
                      member.id,
                    )
                  }
                >
                  {member.archived ? 'Unarchive' : 'Archive'}
                </button>
              )}
              <button
                type="button"
                className="btn-link t-small"
                id={`participant-delete-${row.memberId}`}
                onClick={() => {
                  status.clear()
                  setPendingDelete(row.memberId)
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <div className="entry-cells t-small tnum">
            <span>
              Owed <b>{money(row.owed)}</b>
            </span>
            <span>
              Paid <b>{money(row.paid)}</b>
            </span>
            <span>
              This month <b>{money(row.currentShare)}</b>
            </span>
          </div>
        </LedgerEntry>
      </li>
    )
  }

  return (
    <section aria-labelledby={PARTICIPANTS.id}>
      <SectionHeader
        id={PARTICIPANTS.id}
        title={PARTICIPANTS.title}
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
        <ul className="entry-list">{listed.map(entryFor)}</ul>
      )}

      {settledArchived.length > 0 && (
        <>
          <div className="disclosure" data-open={showSettledArchived}>
            <div className="disclosure-inner" inert={!showSettledArchived}>
              <ul className="entry-list">{settledArchived.map(entryFor)}</ul>
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
