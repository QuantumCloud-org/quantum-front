import type { ApiResult } from '@/types/api'
import { apiClient } from '@/lib/http'
import { normalizeOnlineUser, type OnlineUser } from './model'

export async function fetchOnlineUsers(): Promise<OnlineUser[]> {
  const response = await apiClient.get<ApiResult<unknown[]>>(
    '/monitor/online/list'
  )
  const records = response.data.data
  return Array.isArray(records) ? records.map(normalizeOnlineUser) : []
}

export async function forceLogoutByTokenId(tokenId: string): Promise<void> {
  await apiClient.delete<ApiResult<null>>(
    `/monitor/online/${encodeURIComponent(tokenId)}`
  )
}
