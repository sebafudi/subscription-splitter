/**
 * The three decidable rules the calendar's components would otherwise hide
 * inside an event handler: which cell a key moves to, which record a
 * confirmation's one highlighted id belongs to, and what order the blocks keep
 * while a panel is open. Pure, so the node unit environment reaches all of it.
 */

import type { MonthStr } from '../../domain/types'
import { monthsOfYear } from './projection'

export type StripKeyAction =
  /** Move focus and the strip's tab stop to `month` in the same strip. */
  | { type: 'move'; month: MonthStr }
  /** Leave this strip for the same month in the adjacent person's strip. */
  | { type: 'leave'; direction: 'up' | 'down'; month: MonthStr }
  /** Open the inspector for the focused cell. */
  | { type: 'select'; month: MonthStr }

/**
 * What a key press on the cell holding `month` means. Left and Right wrap
 * December to January and back, Home and End go to the ends of the year, Up and
 * Down carry the same month out of the strip, Enter and Space open. Any other
 * key is null and the component lets the browser have it.
 */
export function stripKeyAction(key: string, month: MonthStr): StripKeyAction | null {
  const year = Number(month.slice(0, 4))
  const months = monthsOfYear(year)
  const index = months.indexOf(month)
  if (index < 0) return null

  switch (key) {
    case 'ArrowLeft':
      return { type: 'move', month: months[(index + 11) % 12] }
    case 'ArrowRight':
      return { type: 'move', month: months[(index + 1) % 12] }
    case 'Home':
      return { type: 'move', month: months[0] }
    case 'End':
      return { type: 'move', month: months[11] }
    case 'ArrowUp':
      return { type: 'leave', direction: 'up', month }
    case 'ArrowDown':
      return { type: 'leave', direction: 'down', month }
    case 'Enter':
    case ' ':
      return { type: 'select', month }
    default:
      return null
  }
}

export type Highlight = { memberId: string; month: MonthStr | null }

/**
 * The tint a finished action lands on, decided where the action happens rather
 * than looked up afterwards. `useSectionStatus` carries one id, and a deleted
 * record has none, so a delete could never name the cell it emptied; the person
 * and the month are both known at the moment the request is made, before the
 * reload, and they stay true whatever the reload returns.
 *
 * `monthOrDate` takes a receipt's date as readily as a month, because a receipt
 * tints the cell its date names. Null tints the person's block alone, which is
 * what a participant or a standing order changes.
 */
export function highlightFor(memberId: string, monthOrDate: string | null = null): Highlight {
  return { memberId, month: monthOrDate === null ? null : monthOrDate.slice(0, 7) }
}

/**
 * The order the blocks render in. `current` is the summary's own most-owing
 * first order; `frozen` is the order captured when the first inspector, edit
 * panel or confirm strip opened, and while it stands a changed balance moves no
 * block. A participant added while the order is frozen joins at the end rather
 * than jumping into place, and one that left is simply absent.
 */
export function orderedIds(current: string[], frozen: string[] | null): string[] {
  if (frozen === null) return current
  const kept = frozen.filter((id) => current.includes(id))
  return [...kept, ...current.filter((id) => !kept.includes(id))]
}
