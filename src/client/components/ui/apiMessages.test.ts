import { describe, expect, it } from 'vitest'
import { withoutApiInstruction } from './apiMessages'

describe('withoutApiInstruction', () => {
  it('drops the instruction sentence and keeps the organizer-facing one', () => {
    const message =
      'Deleting this price leaves 2026-01 and 2026-02 without one. Repeat the request with confirm=true to delete it anyway.'
    expect(withoutApiInstruction(message)).toBe(
      'Deleting this price leaves 2026-01 and 2026-02 without one.',
    )
  })

  it('leaves a refusal that carries no instruction untouched', () => {
    const message = 'Deleting this price leaves 2026-01 without one.'
    expect(withoutApiInstruction(message)).toBe(message)
  })

  it('keeps the whole message when the refusal is one unpunctuated sentence', () => {
    const message =
      'Deleting this price leaves 2026-01 without one, repeat with confirm=true to delete it anyway'
    expect(withoutApiInstruction(message)).toBe(message)
  })

  it('keeps the whole message when every sentence carries the instruction', () => {
    const message = 'Repeat the request with confirm=true. Pass confirm=true to delete it anyway.'
    expect(withoutApiInstruction(message)).toBe(message)
  })
})
