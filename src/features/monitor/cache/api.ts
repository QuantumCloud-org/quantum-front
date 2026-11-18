import type { ApiResult } from '@/types/api'
import { apiClient } from '@/lib/http'
import {
  normalizeCacheDetail,
  normalizeCacheStat,
  type CacheDetail,
  type CacheStat,
} from './model'

export async function fetchCacheStats(): Promise<CacheStat[]> {
  const response = await apiClient.get<ApiResult<unknown[]>>(
    '/monitor/cache/list'
  )
  const records = response.data.data
  return Array.isArray(records) ? records.map(normalizeCacheStat) : []
}

export async function fetchCacheDetail(
  cacheName: string
): Promise<CacheDetail> {
  const response = await apiClient.get<ApiResult<unknown>>(
    `/monitor/cache/${encodeURIComponent(cacheName)}`
  )
  return normalizeCacheDetail(response.data.data)
}
