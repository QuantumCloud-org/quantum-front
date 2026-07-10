import type { ApiResult } from '@/types/api'
import type {
  AuthUser,
  CaptchaPayload,
  LoginCommand,
  LoginPayload,
} from '@/types/auth'
import { apiClient } from '@/lib/http'
import { MOCK_DEMO_USER } from '@/lib/mock/session-fixtures'

function unwrapResult<T>(result: ApiResult<T>) {
  return result.data
}

export async function fetchCaptcha() {
  const response =
    await apiClient.get<ApiResult<CaptchaPayload>>('/auth/captcha')

  return unwrapResult(response.data)
}

export async function loginByPassword(payload: LoginCommand) {
  const response = await apiClient.post<ApiResult<LoginPayload>>(
    '/auth/login',
    payload
  )

  return unwrapResult(response.data)
}

export async function fetchCurrentUser() {
  // Bare import.meta.env comparison (not a helper call) so a production build —
  // where vite pins the flag to 'false' — folds this to `if (false)` and
  // tree-shakes MOCK_DEMO_USER + fixtures out of the bundle. See src/lib/mock.
  if (import.meta.env.VITE_FEATURE_MOCK === 'true') {
    return MOCK_DEMO_USER
  }

  const response = await apiClient.get<ApiResult<AuthUser>>('/auth/info')

  return unwrapResult(response.data)
}

export async function logoutCurrentUser() {
  const response = await apiClient.post<ApiResult<null>>('/auth/logout')

  return unwrapResult(response.data)
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

  return unwrapResult(response.data)
}
