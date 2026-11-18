import { isAxiosError } from 'axios'
import type { ApiResult } from '@/types/api'
import type { AuthUser } from '@/types/auth'

/** Checks the authority returned by the current-user endpoint. */
export function logCleanAccess(
  user: Pick<AuthUser, 'canClearAuditLogs'> | null
) {
  return user?.canClearAuditLogs === true
}

/** Gives a user-facing explanation when log cleanup is denied. */
export function getLogCleanError(error: unknown) {
  const response = isAxiosError<ApiResult<unknown>>(error)
    ? error.response
    : undefined
  if (response?.status === 403 || response?.data?.code === 403) {
    return '只有超级管理员可以清空日志，请联系超级管理员。'
  }
  return response?.data?.message || '清空日志失败，请稍后重试。'
}
