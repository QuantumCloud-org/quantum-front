import { expect, test } from 'bun:test'
import { sanitizeRedirect } from './sanitize-redirect'

test('only absolute same-site paths are accepted as sign-in destinations', () => {
  expect(sanitizeRedirect('/system/users?page=2#detail')).toBe(
    '/system/users?page=2#detail'
  )
  for (const invalid of [
    'https://example.test',
    '//example.test',
    '/\\example.test',
    'relative',
    1,
  ]) {
    expect(sanitizeRedirect(invalid)).toBeUndefined()
  }
})
