import { queryOptions } from '@tanstack/react-query'
import type { ApiResult } from '@/types/api'
import { apiClient } from '@/lib/http'
import {
  MOCK_MENU_ROUTERS,
  warnOnUnpairedMockRoutes,
} from '@/lib/mock/session-fixtures'
import { queryKeys } from '@/lib/query-keys'
import type { BackendMenuRouter } from './types'

async function fetchMenuRouters(signal?: AbortSignal) {
  // Bare import.meta.env comparison (not a helper call) so a production build —
  // where vite pins the flag to 'false' — folds this to `if (false)` and
  // tree-shakes the fixtures + warn helper out of the bundle. See src/lib/mock.
  if (import.meta.env.VITE_FEATURE_MOCK === 'true') {
    warnOnUnpairedMockRoutes()
    return MOCK_MENU_ROUTERS
  }

  const response = await apiClient.get<ApiResult<BackendMenuRouter[]>>(
    '/system/menu/getRouters',
    { signal }
  )

  return response.data.data
}

export function navigationQueryOptions(generation: number) {
  return queryOptions({
    queryKey: queryKeys.navigationRouters(generation),
    queryFn: ({ signal }) => fetchMenuRouters(signal),
    staleTime: 5 * 60 * 1000,
  })
}
