import { describe, expect, it } from 'vitest'
import { readSelection, resolveSelection, writeSelection, type SelectionStorage, type StoredSelection } from './selection'

const RANGE = { first: 2020, last: 2026 }
const MEMBERS = [{ id: 'alice' }, { id: 'bob' }]

function memoryStorage(initial: Record<string, string> = {}): SelectionStorage {
  const store = { ...initial }
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value
    },
  }
}

function throwingStorage(): SelectionStorage {
  return {
    getItem: () => {
      throw new Error('storage unavailable')
    },
    setItem: () => {
      throw new Error('storage unavailable')
    },
  }
}

describe('resolveSelection', () => {
  it('restores a stored selection whose year is in range and whose member still exists', () => {
    const stored: StoredSelection = { year: 2023, memberId: 'alice', month: '2023-04' }
    expect(resolveSelection(stored, RANGE, MEMBERS, 2026)).toEqual({
      year: 2023,
      memberId: 'alice',
      month: '2023-04',
    })
  })

  it('rejects a stored selection whose year is outside the range', () => {
    const stored: StoredSelection = { year: 2019, memberId: 'alice', month: '2019-04' }
    expect(resolveSelection(stored, RANGE, MEMBERS, 2026)).toEqual({ year: 2026, memberId: null, month: null })
  })

  it('rejects a stored selection whose member no longer exists', () => {
    const stored: StoredSelection = { year: 2023, memberId: 'gone', month: '2023-04' }
    expect(resolveSelection(stored, RANGE, MEMBERS, 2026)).toEqual({ year: 2026, memberId: null, month: null })
  })

  it('defaults when nothing was stored', () => {
    expect(resolveSelection(null, RANGE, MEMBERS, 2026)).toEqual({ year: 2026, memberId: null, month: null })
  })
})

describe('readSelection', () => {
  it('returns null when no storage is available', () => {
    expect(readSelection('sub-1', undefined)).toBeNull()
  })

  it('returns null when the storage throws', () => {
    expect(readSelection('sub-1', throwingStorage())).toBeNull()
  })

  it('returns null when nothing is stored under the key', () => {
    expect(readSelection('sub-1', memoryStorage())).toBeNull()
  })

  it('returns null when the stored value is malformed JSON', () => {
    expect(readSelection('sub-1', memoryStorage({ 'calendar:sub-1': '{not json' }))).toBeNull()
  })

  it('returns null when the stored value does not match the shape', () => {
    expect(readSelection('sub-1', memoryStorage({ 'calendar:sub-1': JSON.stringify({ year: '2023' }) }))).toBeNull()
  })

  it('round-trips a written selection through an injected storage', () => {
    const storage = memoryStorage()
    const value: StoredSelection = { year: 2024, memberId: 'bob', month: '2024-11' }
    writeSelection('sub-1', value, storage)
    expect(readSelection('sub-1', storage)).toEqual(value)
  })
})

describe('writeSelection', () => {
  it('does nothing when no storage is available', () => {
    expect(() => writeSelection('sub-1', { year: 2024, memberId: 'bob', month: '2024-11' }, undefined)).not.toThrow()
  })

  it('does not throw when the storage throws', () => {
    expect(() =>
      writeSelection('sub-1', { year: 2024, memberId: 'bob', month: '2024-11' }, throwingStorage()),
    ).not.toThrow()
  })
})
