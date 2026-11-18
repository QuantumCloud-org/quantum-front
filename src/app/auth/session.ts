import { isAxiosError, isCancel } from 'axios'
import type { AuthUser, LoginCommand } from '@/types/auth'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  assertCurrentSession,
  closeSessionRequests,
  isClosedSession,
  publishSessionId,
} from '@/lib/auth-session-channel'
import { refreshAccessToken, withAuthTransition } from '@/lib/http'
import { fetchCurrentUser, loginByPassword, logoutCurrentUser } from './api'

let bootstrap: { generation: number; promise: Promise<AuthUser> } | undefined
let clearPrivateCache: (() => void) | undefined

/** Binds session teardown to the application's private query cache. */
export function setSessionCacheClearer(clear: (() => void) | undefined) {
  clearPrivateCache = clear
}

function endSession() {
  closeSessionRequests()
  clearPrivateCache?.()
}

async function restoreSession(generation: number) {
  assertCurrentSession(generation)
  if (
    isClosedSession() ||
    (import.meta.env.VITE_FEATURE_MOCK !== 'true' &&
      !useAuthStore.getState().accessToken)
  ) {
    await refreshAccessToken()
  }
  assertCurrentSession(generation)
  const user = await fetchCurrentUser()
  assertCurrentSession(generation)
  useAuthStore.getState().setUser(user)
  return user
}

/** Shares startup restoration with route guards for the same session. */
export function bootstrapAuthSession(): Promise<AuthUser> {
  const { user, sessionGeneration } = useAuthStore.getState()
  if (user) return Promise.resolve(user)
  if (bootstrap?.generation === sessionGeneration) return bootstrap.promise

  const attempt = {
    generation: sessionGeneration,
    promise: restoreSession(sessionGeneration).catch((error: unknown) => {
      const state = useAuthStore.getState()
      const status = isAxiosError(error) ? error.response?.status : undefined
      if (
        !isCancel(error) &&
        state.sessionGeneration === sessionGeneration &&
        status === 401
      ) {
        endSession()
        // Reuse the failed startup result when a protected route loads next.
        attempt.generation = useAuthStore.getState().sessionGeneration
      } else if (bootstrap === attempt) {
        bootstrap = undefined
      }
      throw error
    }),
  }
  bootstrap = attempt
  return attempt.promise
}

/** Starts a fresh identity boundary and loads its user before navigation. */
export async function loginWithPassword(
  payload: Omit<LoginCommand, 'deviceId'>
) {
  const generation = await withAuthTransition('login', async () => {
    endSession()
    const { sessionGeneration, ensureDeviceId } = useAuthStore.getState()
    const deviceId = ensureDeviceId()
    const result = await loginByPassword({ ...payload, deviceId })
    assertCurrentSession(sessionGeneration)
    if (typeof result.sessionId !== 'string' || !result.sessionId) {
      throw new Error('登录响应缺少会话标识')
    }
    useAuthStore.getState().setAccessToken(result.accessToken, result.sessionId)
    publishSessionId(result.sessionId)
    return sessionGeneration
  })

  try {
    return await restoreSession(generation)
  } catch (error) {
    if (isCancel(error)) throw error
    toast.error('获取用户信息失败，请刷新重试')
    return null
  }
}

/** Clears the captured session after its logout request finishes. */
export function logoutSession() {
  const { sessionGeneration } = useAuthStore.getState()
  return withAuthTransition('logout', async () => {
    try {
      assertCurrentSession(sessionGeneration)
    } catch (error) {
      if (isCancel(error)) return false
      throw error
    }
    try {
      await logoutCurrentUser()
    } catch (error) {
      if (isCancel(error)) return false
      if (!isAxiosError(error) || error.response?.status !== 401) {
        toast.error('服务端登出失败，请稍后重试')
        return false
      }
    }

    if (useAuthStore.getState().sessionGeneration !== sessionGeneration)
      return false
    endSession()
    publishSessionId('')
    return true
  })
}
