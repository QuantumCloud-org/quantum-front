import type { ApiResult } from '@/types/api'
import { apiClient } from '@/lib/http'
import { normalizeServerInfo, type ServerInfo } from './model'

export async function fetchServerInfo(): Promise<ServerInfo> {
  const response = await apiClient.get<ApiResult<unknown>>('/monitor/server')
  return normalizeServerInfo(response.data.data)
}
