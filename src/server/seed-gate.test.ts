import { describe, expect, it } from 'vitest'
import { isSeedRequestAllowed } from './seed-gate'

describe('isSeedRequestAllowed', () => {
  it('refuses when the flag is off', () => {
    expect(isSeedRequestAllowed(undefined, 'right-token', 'right-token')).toBe(false)
    expect(isSeedRequestAllowed('false', 'right-token', 'right-token')).toBe(false)
  })

  it('refuses when the flag is on but the token is missing or wrong', () => {
    expect(isSeedRequestAllowed('true', 'right-token', null)).toBe(false)
    expect(isSeedRequestAllowed('true', 'right-token', 'wrong-token')).toBe(false)
  })

  it('allows when the flag is on and the token matches', () => {
    expect(isSeedRequestAllowed('true', 'right-token', 'right-token')).toBe(true)
  })
})
