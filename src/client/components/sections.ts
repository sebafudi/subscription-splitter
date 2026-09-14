/**
 * The five sections of the detail screen, in the order they are rendered.
 *
 * One table rather than five hard-coded headings, because the section index
 * labels itself from the headings and the first-load skeleton renders every
 * heading, subtitle and disabled action before any data exists. A second copy
 * of any of those strings would be a copy that can drift.
 */

export type SectionDescriptor = {
  /** The heading's id: the section's `aria-labelledby`, and what the index scrolls to. */
  id: string
  title: string
  subtitle?: string
  /** The label on the section's primary action button. */
  action: string
}

export const PARTICIPANTS: SectionDescriptor = {
  id: 'participants',
  title: 'Participants',
  subtitle:
    'One row per person for the selected year. Select a month to see what was recorded, what is assumed and what was charged.',
  action: 'Add participant',
}

export const PRICE_HISTORY: SectionDescriptor = {
  id: 'price-history',
  title: 'Price history',
  action: 'Record a price',
}

export const SKIPPED_MONTHS: SectionDescriptor = {
  id: 'skipped-months',
  title: 'Skipped months',
  subtitle: 'A skipped month costs nobody anything.',
  action: 'Skip a month',
}

export const PAYMENTS_RECEIVED: SectionDescriptor = {
  id: 'payments-received',
  title: 'Payments received',
  subtitle: 'Money you saw arrive. Every amount here is recorded, not assumed.',
  action: 'Record a payment',
}

export const STANDING_ORDERS: SectionDescriptor = {
  id: 'standing-orders',
  title: 'Standing orders',
  subtitle:
    "Money assumed received each month, without further entry. Nothing here is a recorded receipt. Each month's assumed receipt shows in the participant's calendar.",
  action: 'Add a standing order',
}

export const DETAIL_SECTIONS: SectionDescriptor[] = [
  PARTICIPANTS,
  PRICE_HISTORY,
  SKIPPED_MONTHS,
  PAYMENTS_RECEIVED,
  STANDING_ORDERS,
]
