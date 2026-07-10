import { describe, expect, test } from 'bun:test'
import { parseMockFlag } from './index'

// parseMockFlag is the single testable definition of the mock-flag rule. The
// short-circuit call sites (auth/api.ts, navigation/api.ts) inline the same
// `=== 'true'` comparison directly against import.meta.env for dead-code
// elimination in production builds (see index.ts). The safe-default behaviour
// lives here.
describe('parseMockFlag', () => {
  test('enabled only for the exact string "true"', () => {
    expect(parseMockFlag('true')).toBe(true)
  })

  test('disabled when the flag is undefined (safe default, the prod/no-flag path)', () => {
    expect(parseMockFlag(undefined)).toBe(false)
  })

  test('disabled for any non-"true" value', () => {
    expect(parseMockFlag('false')).toBe(false)
    expect(parseMockFlag('1')).toBe(false)
    expect(parseMockFlag('TRUE')).toBe(false)
    expect(parseMockFlag('yes')).toBe(false)
    expect(parseMockFlag('')).toBe(false)
  })
})
