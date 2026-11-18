import { z } from 'zod'
import { queryOptions } from '@tanstack/react-query'
import type { ApiResult } from '@/types/api'
import type {
  AuthUser,
  CaptchaPayload,
  LoginCommand,
  LoginPayload,
} from '@/types/auth'
import { apiClient } from '@/lib/http'
import { MOCK_DEMO_USER } from '@/lib/mock/session-fixtures'
import { queryKeys } from '@/lib/query-keys'

// Only the fields the authorization path depends on. Loose so every other
// backend field passes through untouched.
const authUserSchema = z.looseObject({
  id: z.union([z.string(), z.number()]).transform(String),
  username: z.string().min(1),
  nickname: z.string().default(''),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  canClearAuditLogs: z.boolean().default(false),
})

/**
 * Validates an `/auth/info` payload at the network trust boundary.
 *
 * @param payload - Raw `data` field of the backend response.
 * @returns The user, guaranteed to carry id / username / roles / permissions.
 * @throws {z.ZodError} When the payload is absent or lacks an identity, so the
 * caller fails closed instead of proceeding with a null user.
 */
export function parseAuthUser(payload: unknown): AuthUser {
  // Safe: the schema enforces every field AuthUser requires, and looseObject
  // preserves the optional ones the backend sends verbatim.
  return authUserSchema.parse(payload) as AuthUser
}

export async function fetchCaptcha() {
  const response =
    await apiClient.get<ApiResult<CaptchaPayload>>('/auth/captcha')

  return response.data.data
}

export async function loginByPassword(payload: LoginCommand) {
  const response = await apiClient.post<ApiResult<LoginPayload>>(
    '/auth/login',
    payload
  )

  return response.data.data
}

export async function fetchCurrentUser(signal?: AbortSignal) {
  // Bare import.meta.env comparison (not a helper call) so a production build —
  // where vite pins the flag to 'false' — folds this to `if (false)` and
  // tree-shakes MOCK_DEMO_USER + fixtures out of the bundle. See src/lib/mock.
  if (import.meta.env.VITE_FEATURE_MOCK === 'true') {
    return MOCK_DEMO_USER
  }

  const response = await apiClient.get<ApiResult<unknown>>('/auth/info', {
    signal,
  })

  return parseAuthUser(response.data.data)
}

export function currentUserQueryOptions(generation: number) {
  return queryOptions({
    queryKey: queryKeys.currentUser(generation),
    queryFn: ({ signal }) => fetchCurrentUser(signal),
  })
}

export async function logoutCurrentUser() {
  const response = await apiClient.post<ApiResult<null>>('/auth/logout')

  return response.data.data
}

export interface UpdateProfileCommand {
  version: string
  nickname: string
  email?: string
  phone?: string
  sex: number
  remark?: string
}

export async function updateProfile(payload: UpdateProfileCommand) {
  const response = await apiClient.put<ApiResult<null>>('/auth/info', payload)

  return response.data.data
}
