import { describe, expect, test } from 'bun:test'
import { parseAuthUser } from './api'

const VALID = {
  id: '1',
  username: 'admin',
  nickname: '管理员',
  roles: ['admin'],
  permissions: ['*:*:*'],
}

describe('parseAuthUser', () => {
  test('accepts a well-formed user', () => {
    expect(parseAuthUser(VALID)).toMatchObject({
      id: '1',
      username: 'admin',
      roles: ['admin'],
      permissions: ['*:*:*'],
    })
  })

  // The fail-open this closes: /auth/info answering 200 with an empty body used
  // to yield user=null, which then satisfied every permission-gated route.
  test('rejects a null payload', () => {
    expect(() => parseAuthUser(null)).toThrow()
  })

  test('rejects an empty object', () => {
    expect(() => parseAuthUser({})).toThrow()
  })

  test('rejects a payload missing a username', () => {
    expect(() =>
      parseAuthUser({ id: '1', roles: [], permissions: [] })
    ).toThrow()
  })

  test('coerces a numeric id to string', () => {
    expect(parseAuthUser({ ...VALID, id: 7 }).id).toBe('7')
  })

  test('defaults absent roles and permissions to empty, denying access', () => {
    const user = parseAuthUser({ id: '1', username: 'guest' })

    expect(user.roles).toEqual([])
    expect(user.permissions).toEqual([])
  })

  test('uses the server audit-clear capability and denies access when it is missing', () => {
    expect(parseAuthUser({ ...VALID, canClearAuditLogs: true })).toHaveProperty(
      'canClearAuditLogs',
      true
    )
    expect(
      parseAuthUser({ ...VALID, id: '2', canClearAuditLogs: false })
    ).toHaveProperty('canClearAuditLogs', false)
    expect(parseAuthUser(VALID)).toHaveProperty('canClearAuditLogs', false)
  })

  test('preserves optional backend fields it does not declare', () => {
    const user = parseAuthUser({ ...VALID, deptName: '研发部', sex: 1 })

    expect(user.deptName).toBe('研发部')
    expect(user.sex).toBe(1)
  })
})
