import { describe, expect, it } from 'vitest'
import { highlightFor, orderedIds, stripKeyAction } from './interaction'

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

describe('highlightFor', () => {
  it('reads the month out of a receipt date', () => {
    expect(highlightFor('alice', '2026-03-14')).toEqual({ memberId: 'alice', month: '2026-03' })
  })

  it('follows a receipt edited into another month', () => {
    expect(highlightFor('alice', '2027-09-02')).toEqual({ memberId: 'alice', month: '2027-09' })
  })

  it('takes a month unchanged, which is what a delete names', () => {
    expect(highlightFor('alice', '2026-03')).toEqual({ memberId: 'alice', month: '2026-03' })
  })

  it('tints the block alone when no single month changed', () => {
    expect(highlightFor('alice')).toEqual({ memberId: 'alice', month: null })
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
