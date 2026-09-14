/**
 * The three decidable rules the calendar's components would otherwise hide
 * inside an event handler: which cell a key moves to, which record a
 * confirmation's one highlighted id belongs to, and what order the blocks keep
 * while a panel is open. Pure, so the node unit environment reaches all of it.
 */

import type { MonthStr, Payment } from '../../domain/types'
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
 * `useSectionStatus` holds one highlighted id and every shipped call site sets
 * it to the id of the record that changed. Resolving it against the reloaded
 * records is what lets one confirmation tint both the person's block and the
 * cell the change landed in: a payment names its member and its receipt month,
 * a schedule and a participant name a member and no single month.
 *
 * An id no record claims resolves to the member of that id, which is how the
 * participant strings ("Participant added", "Changes saved" from a member form)
 * still tint a block.
 */
export function resolveHighlight(
  highlightedId: string | null,
  payments: Payment[],
  schedules: { id: string; memberId: string }[],
  memberIds: string[],
): Highlight | null {
  if (highlightedId === null) return null

  const payment = payments.find((candidate) => candidate.id === highlightedId)
  if (payment) return { memberId: payment.memberId, month: payment.date.slice(0, 7) }

  const schedule = schedules.find((candidate) => candidate.id === highlightedId)
  if (schedule) return { memberId: schedule.memberId, month: null }

  return memberIds.includes(highlightedId) ? { memberId: highlightedId, month: null } : null
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
