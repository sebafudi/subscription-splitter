import type { KeyboardEvent } from 'react'
import type { Member, MonthStr } from '../../domain/types'
import { formatMonthName } from '../format'
import { CellMark, type CellMarkName } from './CellMark'
import { cellAccessibleName, stripAccessibleName } from './cellText'
import { stripKeyAction } from './interaction'
import type { MonthCell } from './projection'

type Props = {
  memberId: string
  member: Member
  cells: MonthCell[]
  locale: string
  currency: string
  currentMonth: MonthStr
  /** The month whose inspector is open for this person, or null. */
  selectedMonth: MonthStr | null
  /** The month a just-finished action changed, when it landed in this person's year. */
  highlightedMonth: MonthStr | null
  /** The one cell that carries `tabIndex={0}`, so the strip is a single tab stop. */
  activeMonth: MonthStr
  onSelect: (month: MonthStr) => void
  onActiveMonthChange: (month: MonthStr) => void
  onLeaveVertically: (direction: 'up' | 'down', month: MonthStr) => void
  /** Escape on a cell closes this person's open inspector, which the cell is outside of. */
  onCloseInspector: () => void
}

/** The id `MemberCalendar` and `MonthInspector` both return focus to. */
export function cellId(memberId: string, month: MonthStr): string {
  return `calendar-cell-${memberId}-${month}`
}

/**
 * The state mark, or null when the cell's state is drawn by its ground and
 * border rather than by a glyph. Precedence is the domain's own: the reason it
 * returned is the outermost failing condition, and nothing here re-derives one.
 * `excepted` belongs to the standing order, so it is read off the assumed
 * status rather than the charge.
 */
function stateMark(cell: MonthCell): CellMarkName | null {
  if (cell.chargeStatus.reason === 'break-month') return 'paused'
  if (cell.chargeStatus.reason === 'unpriced') return 'unpriced'
  if (cell.assumedStatus?.reason === 'excepted') return 'excepted'
  return null
}

/** `off-plan`, future and before-start are cell ground and border, never marks. */
function cellClass(cell: MonthCell, selected: boolean, current: boolean, highlighted: boolean): string {
  const reason = cell.chargeStatus.reason
  const names = ['calendar-cell']
  if (reason === 'outside-active-range') names.push('calendar-cell-offplan')
  if (reason === 'not-yet-elapsed' || reason === 'before-start-month') names.push('calendar-cell-future')
  if (selected) names.push('calendar-cell-selected')
  if (current) names.push('calendar-cell-current')
  if (highlighted) names.push('calendar-cell-highlight')
  return names.join(' ')
}

/**
 * Twelve cells for one person and one year: a `role="grid"` holding one
 * `role="row"` of twelve `role="gridcell"` buttons, in calendar order January
 * to December whatever the locale. The two visual rows below 640px are a CSS
 * wrap, not a second ARIA row.
 *
 * Exactly one cell carries `tabIndex={0}` and it is the one whose month equals
 * `activeMonth`, so tabbing away and back returns to the cell the reader left.
 * Every arrow, Home and End key raises `onActiveMonthChange` before moving
 * focus, so the tab stop and the focus never disagree.
 */
export function MonthStrip({
  memberId,
  member,
  cells,
  locale,
  currency,
  currentMonth,
  selectedMonth,
  highlightedMonth,
  activeMonth,
  onSelect,
  onActiveMonthChange,
  onLeaveVertically,
  onCloseInspector,
}: Props) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, month: MonthStr) {
    // Enter leaves focus on the cell, so Escape has to be answered here too:
    // the cell sits outside the panel that handles it for everything within.
    if (event.key === 'Escape' && selectedMonth !== null) {
      event.preventDefault()
      onCloseInspector()
      return
    }
    const action = stripKeyAction(event.key, month)
    if (!action) return
    event.preventDefault()

    if (action.type === 'leave') {
      onLeaveVertically(action.direction, action.month)
      return
    }
    if (action.type === 'select') {
      onSelect(action.month)
      return
    }
    onActiveMonthChange(action.month)
    document.getElementById(cellId(memberId, action.month))?.focus()
  }

  return (
    <div className="calendar-strip" role="grid" aria-label={stripAccessibleName(member)}>
      <div className="calendar-row" role="row">
        {cells.map((cell) => {
          const selected = cell.month === selectedMonth
          const marks: CellMarkName[] = []
          if (cell.manualReceipts.length > 0) marks.push('recorded')
          if (cell.assumed !== null) marks.push('assumed')
          const state = stateMark(cell)
          if (state) marks.push(state)

          // The count shares the recorded disc's slot, so it is dropped from
          // the cell when all three marks are present and stays in the
          // accessible name and in the inspector's "Recorded (N)".
          const count = cell.manualReceipts.length
          const showCount = count >= 2 && marks.length <= 2

          return (
            <button
              key={cell.month}
              type="button"
              role="gridcell"
              id={cellId(memberId, cell.month)}
              className={cellClass(cell, selected, cell.month === currentMonth, cell.month === highlightedMonth)}
              tabIndex={cell.month === activeMonth ? 0 : -1}
              aria-label={cellAccessibleName(cell, member, locale, currency)}
              aria-selected={selected}
              aria-current={cell.month === currentMonth ? 'date' : undefined}
              onFocus={() => onActiveMonthChange(cell.month)}
              onKeyDown={(event) => handleKeyDown(event, cell.month)}
              onClick={() => onSelect(cell.month)}
            >
              <span className="calendar-cell-month t-small">{formatMonthName(cell.month, locale)}</span>
              <span className="calendar-cell-marks" aria-hidden="true">
                {marks.map((name) => (
                  <CellMark key={name} name={name} />
                ))}
                {showCount && <span className="calendar-cell-count t-small tnum">×{count}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
