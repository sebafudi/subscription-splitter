/**
 * The declared shape the calculation reads and returns. Repositories and the
 * summary route produce `SubscriptionState`; nothing here imports D1 or Hono.
 */

/** `YYYY-MM`, zero-padded so it compares chronologically as a plain string. */
export type MonthStr = string

/** An integer amount in minor units (for example grosze). */
export type Minor = number

export type ActiveRange = {
  joinedMonth: MonthStr
  leftMonth: MonthStr | null
}

export type Member = {
  id: string
  name: string
  isOwner: boolean
  archived: boolean
  activeRanges: ActiveRange[]
}

export type PriceEntry = {
  id: string
  effectiveFrom: MonthStr
  amount: Minor
}

/** Typed now, filled by S-03; this slice always passes an empty array. */
export type RecurringSchedule = {
  id: string
  memberId: string
  amount: Minor
  startMonth: MonthStr
  endMonth: MonthStr | null
}

/** Typed now, filled by S-03; this slice always passes an empty array. */
export type RecurringException = {
  recurringId: string
  month: MonthStr
}

/** Typed now, filled by S-03; this slice always passes an empty array. */
export type Payment = {
  id: string
  memberId: string
  date: string
  amount: Minor
  note: string
  kind: 'manual' | 'annual'
}

export type SubscriptionSettings = {
  startMonth: MonthStr
  currency: string
  locale: string
  timeZone: string
}

export type SubscriptionState = {
  settings: SubscriptionSettings
  priceHistory: PriceEntry[]
  breakMonths: MonthStr[]
  members: Member[]
  recurring: RecurringSchedule[]
  recurringExceptions: RecurringException[]
  payments: Payment[]
}

export type MemberSummary = {
  memberId: string
  name: string
  archived: boolean
  activeThisMonth: boolean
  currentShare: Minor
  owed: Minor
  paid: Minor
  balance: Minor
}

export type Summary = {
  currentMonth: MonthStr
  currency: string
  locale: string
  currentMonthly: Minor
  currentActiveCount: number
  currentPerPersonShare: Minor
  ownerShareThisMonth: Minor
  owedToYouNow: Minor
  creditOutstanding: Minor
  expectedThisMonth: Minor
  collectedThisMonth: Minor
  totalPlanCost: Minor
  totalCollected: Minor
  ownerNetCost: Minor
  members: MemberSummary[]
}
