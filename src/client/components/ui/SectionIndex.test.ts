import { describe, expect, it } from 'vitest'
import { currentItemId } from './SectionIndex'

const line = 117

const headings = [
  { id: 'overview', top: -900 },
  { id: 'participants', top: -300 },
  { id: 'payments', top: 400 },
]

describe('currentItemId', () => {
  it('takes the last heading whose top has reached the line', () => {
    expect(currentItemId(headings, line, false)).toBe('participants')
  })

  it('takes a heading sitting exactly on the line', () => {
    expect(currentItemId([{ id: 'overview', top: line }], line, false)).toBe('overview')
  })

  it('keeps the first heading while none has reached the line', () => {
    expect(currentItemId([{ id: 'overview', top: 200 }], line, false)).toBe('overview')
  })

  it('takes the last heading once the document is scrolled to its end', () => {
    expect(currentItemId(headings, line, true)).toBe('payments')
  })

  it('returns no id when no heading exists', () => {
    expect(currentItemId([], line, true)).toBe('')
  })
})
