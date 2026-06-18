import type { ApiResult } from '@/types/api'
import type {
  AuthUser,
  CaptchaPayload,
  LoginCommand,
  LoginPayload,
} from '@/types/auth'
import { apiClient } from '@/lib/http'

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
