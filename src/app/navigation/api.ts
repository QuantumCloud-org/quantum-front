import { apiClient } from '@/lib/http'
import {
  MOCK_MENU_ROUTERS,
  warnOnUnpairedMockRoutes,
} from '@/lib/mock/session-fixtures'
import type { ApiResult } from '@/types/api'
import type { BackendMenuRouter } from './types'

function unwrapResult<T>(result: ApiResult<T>) {
  return result.data
}

export async function fetchMenuRouters() {
  // Bare import.meta.env comparison (not a helper call) so a production build —
  // where vite pins the flag to 'false' — folds this to `if (false)` and
  // tree-shakes the fixtures + warn helper out of the bundle. See src/lib/mock.
  if (import.meta.env.VITE_FEATURE_MOCK === 'true') {
    warnOnUnpairedMockRoutes()
    return MOCK_MENU_ROUTERS
  }

  const response =
    await apiClient.get<ApiResult<BackendMenuRouter[]>>('/system/menu/getRouters')

  return unwrapResult(response.data)
}

export function navigationQueryOptions() {
  return {
    queryKey: ['navigation', 'routers'] as const,
    queryFn: fetchMenuRouters,
    staleTime: 5 * 60 * 1000,
  }
}
