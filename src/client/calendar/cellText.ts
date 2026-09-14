/**
 * Every sentence a calendar cell and its inspector speak, built from the
 * projection alone. Pure: no React, no storage, no clock. Amounts go through
 * `formatMoney` and months through `formatLongMonth`, both in the plan's own
 * locale, so nothing here formats a value itself.
 */

import { formatMoney } from '../../domain/money'
import type { MonthExclusion } from '../../domain/month-status'
import type { Member } from '../../domain/types'
import { formatLongMonth } from '../format'
import type { MonthCell } from './projection'

/**
 * One phrase per exclusion condition, total over the union so the compiler
 * keeps it that way. This is the single definition the standing-orders section
 * and the calendar both read.
 *
 * `owner-member` is present because `MonthExclusion` declares it and the record
 * is exhaustive, not because a cell can reach it: no calendar cell belongs to
 * the owner, so the phrase never renders here.
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

export function exclusionPhrase(reason: MonthExclusion): string {
  return REASON_PHRASE[reason]
}

/**
 * The strip's own accessible name. A grid needs one, and the person's name is
 * the only thing that tells two strips apart when a reader moves between them.
 */
export function stripAccessibleName(member: Member): string {
  return `${member.name}, month by month`
}

function recordedPhrase(cell: MonthCell, locale: string, currency: string): string {
  const count = cell.manualReceipts.length
  if (count === 0) return 'nothing recorded'

  const total = cell.manualReceipts.reduce((sum, payment) => sum + payment.amount, 0)
  const noun = count === 1 ? 'payment' : 'payments'
  return `${count} ${noun} recorded, ${formatMoney(total, locale, currency)} in total`
}

/**
 * The assumed part of the sentence, or null when there is nothing to say about
 * a standing order. `excepted` is spoken here because it is the one condition
 * the charge cannot carry; every other exclusion already reaches the reader
 * through the charge part, so it is not repeated.
 */
function assumedPhrase(cell: MonthCell, locale: string, currency: string): string | null {
  if (cell.assumed !== null) {
    return `${formatMoney(cell.assumed.amount, locale, currency)} assumed from a standing order`
  }
  if (cell.assumedStatus?.reason === 'excepted') return exclusionPhrase('excepted')
  return null
}

/**
 * The cell's one-sentence accessible name: month, what was recorded, what was
 * assumed, then the charge or the reason there was none. Recorded and assumed
 * are never combined into one figure.
 *
 * `member` is part of the contract the strip calls this with; the sentence
 * names no person, because the cell already sits inside that person's block.
 */
export function cellAccessibleName(
  cell: MonthCell,
  _member: Member,
  locale: string,
  currency: string,
): string {
  const parts = [formatLongMonth(cell.month, locale), recordedPhrase(cell, locale, currency)]

  const assumed = assumedPhrase(cell, locale, currency)
  if (assumed !== null) parts.push(assumed)

  const reason = cell.chargeStatus.reason
  parts.push(
    reason === null ? `charged ${formatMoney(cell.charge, locale, currency)}` : exclusionPhrase(reason),
  )

  return parts.join(', ')
}

/**
 * The inspector's charge sentence. A counted month names its charge, a month
 * with no price says the charge is unknown in red, and every other month says
 * what excluded it.
 */
export function chargeSentence(
  cell: MonthCell,
  locale: string,
  currency: string,
): { text: string; tone: 'body' | 'red' } {
  const month = formatLongMonth(cell.month, locale)
  const reason = cell.chargeStatus.reason

  if (reason === null) {
    return { text: `Charged ${formatMoney(cell.charge, locale, currency)} for ${month}.`, tone: 'body' }
  }
  if (reason === 'unpriced') {
    return { text: `No price recorded for ${month}, so the charge is unknown.`, tone: 'red' }
  }
  return { text: `Not charged: ${exclusionPhrase(reason)}.`, tone: 'body' }
}
