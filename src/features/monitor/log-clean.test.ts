import { AxiosError, AxiosHeaders } from 'axios'
import { parseAuthUser } from '@/app/auth/api'
import { describe, expect, test } from 'bun:test'
import { getLogCleanError, logCleanAccess } from './log-clean'

describe('日志清空', () => {
  test('both clean actions use server authority even when role and permissions disagree', () => {
    const operator = parseAuthUser({
      id: '2',
      username: 'operator',
      roles: ['admin'],
      permissions: ['monitor:loginlog:remove', 'monitor:operlog:remove'],
      canClearAuditLogs: false,
    })
    const administrator = parseAuthUser({
      id: '1',
      username: 'admin',
      roles: [],
      permissions: [],
      canClearAuditLogs: true,
    })
    expect(logCleanAccess(operator)).toBe(false)
    expect(logCleanAccess(administrator)).toBe(true)
    expect(logCleanAccess(null)).toBe(false)
  })

  test('403 给出联系超管的提示', () => {
    const error = new AxiosError('Forbidden', undefined, undefined, undefined, {
      config: { headers: new AxiosHeaders() },
      data: { message: '原始权限异常' },
      headers: {},
      status: 403,
      statusText: 'Forbidden',
    })
    expect(getLogCleanError(error)).toBe(
      '只有超级管理员可以清空日志，请联系超级管理员。'
    )
  })
})
