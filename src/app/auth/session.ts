import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import type { AuthUser, LoginCommand } from '@/types/auth'
import { fetchCurrentUser, loginByPassword, logoutCurrentUser } from './api'

let bootstrapPromise: Promise<AuthUser | null> | null = null

export async function bootstrapAuthSession() {
  const authState = useAuthStore.getState()
  if (authState.accessToken && authState.user) {
    authState.setBootstrapStatus('ready')
    return authState.user
  }

  if (bootstrapPromise) {
    return bootstrapPromise
  }

  authState.setBootstrapStatus('loading')
  bootstrapPromise = fetchCurrentUser()
    .then((user) => {
      const currentState = useAuthStore.getState()
      currentState.setUser(user)
      currentState.setBootstrapStatus('ready')
      return user
    })
    .catch((error) => {
      const currentState = useAuthStore.getState()
      const status = isAxiosError(error) ? error.response?.status : undefined

      if (status === 401 || status === 403) {
        currentState.reset()
      } else {
        currentState.setBootstrapStatus('idle')
      }

      throw error
    })
    .finally(() => {
      bootstrapPromise = null
    })

  return bootstrapPromise
}

export async function loginWithPassword(
  payload: Omit<LoginCommand, 'deviceId'>
) {
  const authState = useAuthStore.getState()
  const deviceId = authState.ensureDeviceId()

  authState.setBootstrapStatus('loading')

  let loginResult
  try {
    loginResult = await loginByPassword({
      ...payload,
      deviceId,
    })
  } catch (error) {
    authState.setBootstrapStatus('idle')
    throw error
  }

  authState.setSession({
    accessToken: loginResult.accessToken,
    deviceId,
  })

  try {
    const user = await fetchCurrentUser()
    const currentState = useAuthStore.getState()
    currentState.setUser(user)
    currentState.setBootstrapStatus('ready')
    return user
  } catch {
    const currentState = useAuthStore.getState()
    currentState.setBootstrapStatus('idle')
    toast.error('获取用户信息失败，请刷新重试')
    return null
  }
}

export async function logoutSession() {
  try {
    await logoutCurrentUser()
  } catch {
    toast.error('服务端登出失败，请手动关闭浏览器或清除浏览器 Cookie 后重试')
  } finally {
    useAuthStore.getState().reset()
  }
}
