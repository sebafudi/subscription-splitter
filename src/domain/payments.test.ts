import { describe, expect, it } from 'vitest'
import { validatePaymentDate } from './payments'

const START = '2026-01'

describe('validatePaymentDate', () => {
  it('accepts a date inside the subscription first month', () => {
    expect(validatePaymentDate('2026-01-01', START)).toBeNull()
    expect(validatePaymentDate('2026-01-31', START)).toBeNull()
  })

  it('accepts a date years in the future, which counts as credit now', () => {
    expect(validatePaymentDate('2031-07-04', START)).toBeNull()
  })

  it('rejects the month before the plan started', () => {
    expect(validatePaymentDate('2025-12-31', START)).not.toBeNull()
  })

  it('rejects a value that is not a real calendar date', () => {
    expect(validatePaymentDate('2026-02-30', START)).not.toBeNull()
  })

  it('names the date field in every message it returns', () => {
    const messages = [
      validatePaymentDate('2025-12-31', START),
      validatePaymentDate('2026-02-30', START),
      validatePaymentDate('not a date', START),
    ]
    expect(messages.every((message) => message !== null && message.startsWith('date'))).toBe(true)
  })
})
