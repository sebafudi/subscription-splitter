import { useEffect, useState, type ReactNode } from 'react'
import { formatMoney } from '../../domain/money'
import type { Member, MemberSummary, MonthStr } from '../../domain/types'
import { ConfirmStrip } from '../components/ui/ConfirmStrip'
import { LedgerEntry } from '../components/ui/LedgerEntry'
import { Balance, Money, type BalanceState } from '../components/ui/Money'
import { MonthStrip } from './MonthStrip'
import type { PersonYear } from './projection'

const CLOSE_MS = 140

type Props = {
  row: MemberSummary
  member: Member | undefined
  personYear: PersonYear | null
  year: number
  locale: string
  currency: string
  currentMonth: MonthStr
  /** The month whose inspector is open for this person, or null. */
  selectedMonth: MonthStr | null
  /** Elapsed months of the whole membership the domain could not price. */
  lifetimeUnpricedMonths: number
  highlighted: boolean
  highlightedMonth: MonthStr | null
  pendingDelete: boolean
  activeMonth: MonthStr
  onSelectMonth: (month: MonthStr) => void
  onActiveMonthChange: (month: MonthStr) => void
  onLeaveVertically: (direction: 'up' | 'down', month: MonthStr) => void
  onCloseInspector: () => void
  onEdit: () => void
  onArchiveToggle: () => void
  /** Opens the confirm strip. */
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  /** The inspector, when this person's is the one open. */
  children?: ReactNode
}

function balanceState(balance: number): BalanceState {
  if (balance < 0) return 'owes'
  return balance > 0 ? 'ahead' : 'settled'
}

/**
 * Holds the last content for the length of the closing motion, so the panel
 * collapses with something inside it rather than emptying in one frame. The
 * held copy is inert and is dropped as soon as the motion is over.
 */
function useClosing(children: ReactNode): ReactNode {
  const [held, setHeld] = useState<ReactNode>(children)

  useEffect(() => {
    if (children) {
      setHeld(children)
      return
    }
    const timer = setTimeout(() => setHeld(null), CLOSE_MS)
    return () => clearTimeout(timer)
  }, [children])

  return children ?? held
}

/**
 * One participant: the header line and balance, the lifetime cells, the year
 * cells, the actions, the twelve-cell strip and the inspector slot beneath it.
 * Every block is a participant's; the owner has no block, and their share stays
 * in the summary above the sections.
 *
 * The action row is rendered as the block's own child rather than through
 * `LedgerEntry`'s `actions` slot, which the row draws after its children: the
 * actions have to precede the strip and the inspector in the DOM, because that
 * is the order `design-spec.md` §4 draws and §8 tabs through. It keeps the
 * shipped `.entry-actions` and `.entry-confirm` classes, so the shared row
 * component is not modified and no other section is touched.
 *
 * The block never reads the section's status hook. `highlighted` is the
 * section's own resolution of its one confirmation, so the tint on the block
 * and the tint on the changed cell come from the same answer.
 */
export function PersonBlock({
  row,
  member,
  personYear,
  year,
  locale,
  currency,
  currentMonth,
  selectedMonth,
  lifetimeUnpricedMonths,
  highlighted,
  highlightedMonth,
  pendingDelete,
  activeMonth,
  onSelectMonth,
  onActiveMonthChange,
  onLeaveVertically,
  onCloseInspector,
  onEdit,
  onArchiveToggle,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  children,
}: Props) {
  const inspector = useClosing(children)
  const money = (minor: number) => formatMoney(minor, locale, currency)

  return (
    <div className="calendar-block">
      <LedgerEntry
        highlighted={highlighted}
        primary={
          <>
            {row.name}
            {row.archived && <span className="entry-tag t-small soft"> archived</span>}
            {!row.activeThisMonth && <span className="entry-tag t-small soft"> not active this month</span>}
          </>
        }
        figure={
          // A participant with no membership range is not settled, whatever the
          // figures say, so the slot names the reason instead of the word. A
          // non-zero balance is a real balance and keeps its usual treatment.
          personYear !== null && !personYear.hasActiveRange && row.balance === 0 ? (
            <span className="calendar-red t-entry">no membership range</span>
          ) : (
            <Balance
              state={balanceState(row.balance)}
              value={money(row.balance < 0 ? -row.balance : row.balance)}
            />
          )
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

        {lifetimeUnpricedMonths > 0 && (
          <p className="calendar-red t-small">
            {lifetimeUnpricedMonths} month{lifetimeUnpricedMonths === 1 ? ' has' : 's have'} no price,
            so owed and the balance are incomplete.
          </p>
        )}

        {personYear !== null &&
          (personYear.hasActiveRange ? (
            <div className="entry-cells calendar-year-cells t-small tnum">
              <span>
                Recorded in {year} <Money value={money(personYear.recorded)} />
              </span>
              <span>
                Assumed in {year} <Money value={money(personYear.assumed)} treatment="assumed" />
              </span>
              <span>
                Charged in {year} <b>{money(personYear.charged)}</b>
                {personYear.unpricedMonths > 0 && (
                  <span className="calendar-red t-small">
                    , {personYear.unpricedMonths} month{personYear.unpricedMonths === 1 ? '' : 's'} without a price
                  </span>
                )}
              </span>
            </div>
          ) : (
            <p className="calendar-red t-small">
              No membership range recorded, so nothing was charged. Recorded payments still show.
            </p>
          ))}

        {pendingDelete ? (
          <div className="entry-confirm">
            <ConfirmStrip
              question={`Delete ${row.name}? Their payments stay recorded.`}
              onConfirm={onConfirmDelete}
              onKeep={onCancelDelete}
            />
          </div>
        ) : (
          <div className="entry-actions">
            {member && (
              <button type="button" className="btn-link t-small" id={`participant-edit-${member.id}`} onClick={onEdit}>
                Edit
              </button>
            )}
            {member && (
              <button type="button" className="btn-link t-small" onClick={onArchiveToggle}>
                {member.archived ? 'Unarchive' : 'Archive'}
              </button>
            )}
            <button
              type="button"
              className="btn-link t-small"
              id={`participant-delete-${row.memberId}`}
              onClick={onRequestDelete}
            >
              Delete
            </button>
          </div>
        )}

        {member && personYear !== null && (
          <MonthStrip
            memberId={row.memberId}
            member={member}
            cells={personYear.cells}
            year={year}
            locale={locale}
            currency={currency}
            currentMonth={currentMonth}
            selectedMonth={selectedMonth}
            highlightedMonth={highlightedMonth}
            activeMonth={activeMonth}
            onSelect={onSelectMonth}
            onActiveMonthChange={onActiveMonthChange}
            onLeaveVertically={onLeaveVertically}
            onCloseInspector={onCloseInspector}
          />
        )}

        <div className="disclosure" data-open={children !== undefined && children !== null}>
          <div className="disclosure-inner" inert={!children}>
            {inspector}
          </div>
        </div>
      </LedgerEntry>
    </div>
  )
}
