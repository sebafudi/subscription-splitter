import { describe, expect, it } from 'vitest'
import type { Payment } from '../../domain/types'
import { orderedIds, resolveHighlight, stripKeyAction } from './interaction'

const SCHEDULES = [{ id: 'sch-1', memberId: 'alice' }]

function payment(over: Partial<Payment> = {}): Payment {
  return { id: 'pay-1', memberId: 'alice', date: '2026-03-14', amount: 2500, note: '', kind: 'manual', ...over }
}

describe('stripKeyAction', () => {
  it('moves by one month in each direction', () => {
    expect(stripKeyAction('ArrowRight', '2026-03')).toEqual({ type: 'move', month: '2026-04' })
    expect(stripKeyAction('ArrowLeft', '2026-03')).toEqual({ type: 'move', month: '2026-02' })
  })

  it('wraps December to January and back inside the same year', () => {
    expect(stripKeyAction('ArrowRight', '2026-12')).toEqual({ type: 'move', month: '2026-01' })
    expect(stripKeyAction('ArrowLeft', '2026-01')).toEqual({ type: 'move', month: '2026-12' })
  })

  it('sends Home and End to January and December', () => {
    expect(stripKeyAction('Home', '2026-07')).toEqual({ type: 'move', month: '2026-01' })
    expect(stripKeyAction('End', '2026-07')).toEqual({ type: 'move', month: '2026-12' })
  })

  it('carries the same month out of the strip on Up and Down', () => {
    expect(stripKeyAction('ArrowUp', '2026-07')).toEqual({ type: 'leave', direction: 'up', month: '2026-07' })
    expect(stripKeyAction('ArrowDown', '2026-07')).toEqual({ type: 'leave', direction: 'down', month: '2026-07' })
  })

  it('opens on Enter and Space and ignores every other key', () => {
    expect(stripKeyAction('Enter', '2026-07')).toEqual({ type: 'select', month: '2026-07' })
    expect(stripKeyAction(' ', '2026-07')).toEqual({ type: 'select', month: '2026-07' })
    expect(stripKeyAction('Tab', '2026-07')).toBeNull()
    expect(stripKeyAction('a', '2026-07')).toBeNull()
  })
})

describe('resolveHighlight', () => {
  it('resolves a payment id to its member and its receipt month', () => {
    expect(resolveHighlight('pay-1', [payment()], SCHEDULES, ['alice'])).toEqual({
      memberId: 'alice',
      month: '2026-03',
    })
  })

  it('follows a receipt edited into another month', () => {
    expect(resolveHighlight('pay-1', [payment({ date: '2027-09-02' })], SCHEDULES, ['alice'])).toEqual({
      memberId: 'alice',
      month: '2027-09',
    })
  })

  it('resolves a schedule id to its member and no single month', () => {
    expect(resolveHighlight('sch-1', [], SCHEDULES, ['alice'])).toEqual({ memberId: 'alice', month: null })
  })

  it('resolves a participant id to that participant', () => {
    expect(resolveHighlight('alice', [], [], ['alice'])).toEqual({ memberId: 'alice', month: null })
  })

  it('is null for no confirmation and for an id no record claims', () => {
    expect(resolveHighlight(null, [payment()], SCHEDULES, ['alice'])).toBeNull()
    expect(resolveHighlight('gone', [payment()], SCHEDULES, ['alice'])).toBeNull()
  })
})

describe('orderedIds', () => {
  it('takes the summary order when nothing is frozen', () => {
    expect(orderedIds(['b', 'a', 'c'], null)).toEqual(['b', 'a', 'c'])
  })

  it('keeps the frozen order while a panel is open', () => {
    expect(orderedIds(['c', 'b', 'a'], ['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('drops a participant that is gone and appends one that arrived', () => {
    expect(orderedIds(['c', 'a', 'd'], ['a', 'b', 'c'])).toEqual(['a', 'c', 'd'])
  })
})
