import type { MonthStr } from '../../domain/types'

export type StoredSelection = {
  year: number
  memberId: string
  month: MonthStr
}

export type YearRange = { first: number; last: number }

/** The one thing `readSelection`/`writeSelection` touch; `window.sessionStorage` by default, injectable for tests. */
export type SelectionStorage = Pick<Storage, 'getItem' | 'setItem'>

function storageKey(subscriptionId: string): string {
  return `calendar:${subscriptionId}`
}

function isStoredSelection(value: unknown): value is StoredSelection {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.year === 'number' &&
    typeof candidate.memberId === 'string' &&
    typeof candidate.month === 'string'
  )
}

/**
 * A stored selection, or null when nothing was stored, the value could not be
 * parsed, its shape does not match, or the storage itself threw. Every one of
 * those cases is a plain absence: `resolveSelection` applies the default.
 */
export function readSelection(
  subscriptionId: string,
  storage: SelectionStorage | undefined = typeof window === 'undefined' ? undefined : window.sessionStorage,
): StoredSelection | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(storageKey(subscriptionId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isStoredSelection(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Selection never writes to the ledger; a throwing or absent storage is silently ignored. */
export function writeSelection(
  subscriptionId: string,
  value: StoredSelection,
  storage: SelectionStorage | undefined = typeof window === 'undefined' ? undefined : window.sessionStorage,
): void {
  if (!storage) return
  try {
    storage.setItem(storageKey(subscriptionId), JSON.stringify(value))
  } catch {
    // Selection is a convenience, not a record: a storage failure is never surfaced.
  }
}

export type ResolvedSelection = {
  year: number
  memberId: string | null
  month: MonthStr | null
}

/**
 * Whether a restored selection still applies: its year must fall inside the
 * current range and its member must still exist. Either failing discards the
 * whole restored selection, including the inspector, and falls back to
 * `defaultYear` with no inspector open (`design-spec.md` §3).
 */
export function resolveSelection(
  stored: StoredSelection | null,
  range: YearRange,
  members: { id: string }[],
  defaultYear: number,
): ResolvedSelection {
  if (stored && stored.year >= range.first && stored.year <= range.last && members.some((m) => m.id === stored.memberId)) {
    return { year: stored.year, memberId: stored.memberId, month: stored.month }
  }
  return { year: defaultYear, memberId: null, month: null }
}
