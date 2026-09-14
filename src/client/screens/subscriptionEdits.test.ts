import { describe, expect, it } from 'vitest'
import type { Subscription } from '../api'
import {
  currencyLockHint,
  currencyLocked,
  firstMonthFloor,
  headerActions,
  loadFailure,
  REFRESH_FAILURE,
  storedValues,
  subscriptionChanges,
} from './subscriptionEdits'

const stored: Subscription = {
  id: 'sub_1',
  userId: 'user_1',
  name: 'Payments walkthrough',
  currency: 'PLN',
  locale: 'pl-PL',
  timeZone: 'Europe/Warsaw',
  startMonth: '2026-07',
  createdAt: '2026-07-01T00:00:00.000Z',
}

describe('subscriptionChanges', () => {
  it('sends nothing when every value matches the stored row', () => {
    expect(subscriptionChanges(stored, storedValues(stored))).toBeNull()
  })

  it('sends only the one setting that differs', () => {
    const changes = subscriptionChanges(stored, { ...storedValues(stored), name: 'Streaming plan' })
    expect(changes).toEqual({ name: 'Streaming plan' })
  })

  it('sends every differing setting under its wire name', () => {
    const changes = subscriptionChanges(stored, {
      name: 'Streaming plan',
      currency: 'EUR',
      locale: 'en-GB',
      timeZone: 'Europe/Lisbon',
      startMonth: '2026-03',
    })
    expect(changes).toEqual({
      name: 'Streaming plan',
      currency: 'EUR',
      locale: 'en-GB',
      time_zone: 'Europe/Lisbon',
      start_month: '2026-03',
    })
  })

  it('keeps a cleared first month out of the body when it did not move', () => {
    const changes = subscriptionChanges(stored, { ...storedValues(stored), startMonth: '2026-08' })
    expect(changes).toEqual({ start_month: '2026-08' })
  })
})

describe('headerActions', () => {
  it('disables both verbs during the first load', () => {
    expect(headerActions('loading')).toEqual({ edit: false, remove: false })
  })

  it('enables both verbs once the load settles', () => {
    expect(headerActions('ready')).toEqual({ edit: true, remove: true })
  })

  it('disables both verbs when the load failed', () => {
    expect(headerActions('error')).toEqual({ edit: false, remove: false })
  })

  it('leaves deletion as the one live verb on a subscription with no owner', () => {
    expect(headerActions('no-owner')).toEqual({ edit: false, remove: true })
  })
})

describe('currencyLocked', () => {
  it('stays open while no amount is recorded at all', () => {
    expect(currencyLocked({ prices: [], payments: [], schedules: [] })).toBe(false)
  })

  it('locks on a price, on a payment and on a standing order alike', () => {
    expect(currencyLocked({ prices: [{}], payments: [], schedules: [] })).toBe(true)
    expect(currencyLocked({ prices: [], payments: [{}], schedules: [] })).toBe(true)
    expect(currencyLocked({ prices: [], payments: [], schedules: [{}] })).toBe(true)
  })

  it('names the currency every amount is already stored in', () => {
    expect(currencyLockHint('EUR')).toContain('Every amount is stored in EUR.')
  })
})

describe('firstMonthFloor', () => {
  it('is January of the tenth year back, as a plain month string', () => {
    const floor = firstMonthFloor('Europe/Warsaw')
    expect(floor).toMatch(/^\d{4}-01$/)
  })
})

describe('loadFailure', () => {
  const CONNECTION = 'Could not save. Check your connection and try again.'
  const transport = { signedOut: false, status: null, message: null }
  const refused = { signedOut: false, status: 403, message: 'this subscription is not yours' }

  it('hands a signed-out failure on whatever is on screen', () => {
    expect(loadFailure({ signedOut: true, status: 401, message: null }, false, CONNECTION)).toEqual({
      kind: 'signed-out',
    })
    expect(loadFailure({ signedOut: true, status: 401, message: null }, true, CONNECTION)).toEqual({
      kind: 'signed-out',
    })
  })

  it('replaces the screen when the first load fails, because there is nothing to keep', () => {
    expect(loadFailure(transport, false, CONNECTION)).toEqual({ kind: 'replace', message: CONNECTION })
    expect(loadFailure(refused, false, CONNECTION)).toEqual({
      kind: 'replace',
      message: 'this subscription is not yours',
    })
  })

  it('keeps the records when a refresh fails after a successful load', () => {
    expect(loadFailure(transport, true, CONNECTION)).toEqual({ kind: 'keep', message: REFRESH_FAILURE })
  })

  it('speaks its own sentence on a refresh, never the save sentence or the server words', () => {
    expect(REFRESH_FAILURE).toBe(
      'Could not refresh. The records shown may be out of date. Check your connection and reload the page.',
    )
    expect(loadFailure(refused, true, CONNECTION)).toEqual({ kind: 'keep', message: REFRESH_FAILURE })
    expect(REFRESH_FAILURE).not.toContain('save')
  })

  it('still reaches the no-owner screen, which is a state rather than a failure', () => {
    const noOwner = { signedOut: false, status: 409, message: 'this subscription has no owner row' }
    expect(loadFailure(noOwner, false, CONNECTION)).toEqual({
      kind: 'no-owner',
      message: 'this subscription has no owner row',
    })
    expect(loadFailure(noOwner, true, CONNECTION)).toEqual({
      kind: 'no-owner',
      message: 'this subscription has no owner row',
    })
  })
})
