import { describe, expect, it } from 'vitest'
import { monthControlBranch, monthOptionRange, supportsMonthInput } from './monthControl'

type Probes = { reflectsType: boolean; sanitisesValue: boolean }

/**
 * Stands in for the throwaway input the detection creates. `reflectsType`
 * decides whether the element keeps the assigned type, `sanitisesValue`
 * whether it drops a value that is not a month, which is exactly the pair of
 * behaviours the two probes read.
 */
function stubInput({ reflectsType, sanitisesValue }: Probes): () => HTMLInputElement {
  let type = 'text'
  let value = ''
  const element = {
    get type() {
      return type
    },
    set type(next: string) {
      type = reflectsType ? next : 'text'
    },
    get value() {
      return value
    },
    set value(next: string) {
      value = sanitisesValue && !/^\d{4}-\d{2}$/.test(next) ? '' : next
    },
  }
  return () => element as unknown as HTMLInputElement
}

describe('supportsMonthInput', () => {
  it('accepts a browser that reflects the type and sanitises an invalid value', () => {
    expect(supportsMonthInput(stubInput({ reflectsType: true, sanitisesValue: true }))).toBe(true)
  })

  it('refuses a browser that does not reflect the type', () => {
    expect(supportsMonthInput(stubInput({ reflectsType: false, sanitisesValue: true }))).toBe(false)
  })

  it('refuses a browser that reflects the type but keeps an invalid value', () => {
    expect(supportsMonthInput(stubInput({ reflectsType: true, sanitisesValue: false }))).toBe(false)
  })

  it('refuses without touching the default factory where there is no document', () => {
    expect(typeof document).toBe('undefined')
    expect(supportsMonthInput()).toBe(false)
  })
})

describe('monthControlBranch', () => {
  it('renders the native input where a picker exists', () => {
    expect(monthControlBranch(true)).toBe('input')
  })

  it('renders the fallback select where it does not', () => {
    expect(monthControlBranch(false)).toBe('select')
  })
})

describe('monthOptionRange', () => {
  it('spans January ten years back to December of next year when the field has no bounds', () => {
    const months = monthOptionRange({ currentMonth: '2026-09' })
    expect(months[0]).toBe('2016-01')
    expect(months[months.length - 1]).toBe('2027-12')
    expect(months).toHaveLength(144)
  })

  it('starts at min when the field has a lower bound', () => {
    const months = monthOptionRange({ min: '2025-04', currentMonth: '2026-09' })
    expect(months[0]).toBe('2025-04')
    expect(months[months.length - 1]).toBe('2027-12')
  })

  it('ends at max when the field has an upper bound', () => {
    const months = monthOptionRange({ max: '2026-12', currentMonth: '2026-09' })
    expect(months[0]).toBe('2016-01')
    expect(months[months.length - 1]).toBe('2026-12')
  })

  it('stretches below min to keep an earlier held value selectable', () => {
    const months = monthOptionRange({ min: '2025-04', value: '2024-11', currentMonth: '2026-09' })
    expect(months[0]).toBe('2024-11')
    expect(months).toContain('2025-04')
  })

  it('stretches above max to keep a later held value selectable', () => {
    const months = monthOptionRange({ max: '2026-12', value: '2029-03', currentMonth: '2026-09' })
    expect(months[months.length - 1]).toBe('2029-03')
  })

  it('lists months ascending with no gap', () => {
    const months = monthOptionRange({ min: '2025-10', max: '2026-03', currentMonth: '2026-09' })
    expect(months).toEqual(['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'])
  })

  it('returns the held value as the same string it was given', () => {
    const months = monthOptionRange({ value: '2026-02', currentMonth: '2026-09' })
    expect(months.filter((month) => month === '2026-02')).toEqual(['2026-02'])
  })

  it('builds the range without constructing a Date from the value', () => {
    const realDate = globalThis.Date
    globalThis.Date = new Proxy(realDate, {
      construct() {
        throw new Error('the month control constructed a Date')
      },
    }) as DateConstructor
    try {
      expect(monthOptionRange({ min: '2026-01', value: '2025-07', currentMonth: '2026-09' })).toContain('2025-07')
    } finally {
      globalThis.Date = realDate
    }
  })
})
