import axios, { AxiosError, CanceledError, isAxiosError } from 'axios'
import type { ApiResult } from '@/types/api'
import type { RefreshPayload } from '@/types/auth'
import { useAuthStore } from '@/stores/auth-store'
import {
  assertCurrentSession,
  failCurrentSession,
  findPeerRefresh,
  isClosedSession,
  publishPeerRefresh,
  publishSessionId,
  readSharedSessionId,
  sessionRequestSignal,
  withSessionCookieLock,
} from './auth-session-channel'
import { stripBearerPrefix } from './auth-token'

const REQUEST_TIMEOUT = 15000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || '/api'
const AUTHORIZATION = 'Authorization'
const DEVICE_ID = 'X-Device-Id'
const CAPTCHA_PATH = '/auth/captcha'
const LOGIN_PATH = '/auth/login'
const REFRESH_PATH = '/auth/refresh'
const LOGOUT_PATH = '/auth/logout'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Sends a public request without a bearer token or session-based recovery. */
    skipSession?: boolean
    authAttempt?: {
      generation: number
      token: string
      replayed: boolean
    }
  }
}

const transportOptions = {
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
}

export const apiClient = axios.create(transportOptions)
export const refreshClient = axios.create(transportOptions)

refreshClient.interceptors.request.use((config) => {
  config.headers.delete(AUTHORIZATION)
  return config
})

let refreshFlight: { generation: number; promise: Promise<string> } | undefined
let rejectedRefresh: { generation: number; error: unknown } | undefined
type AuthTransition = 'login' | 'logout'
let activeTransition: AuthTransition | undefined
let transitionQueue: Promise<unknown> | undefined

function requestPath(url?: string) {
  return url?.split(/[?#]/, 1)[0].replace(/\/+$/, '') ?? ''
}

function isPublicAuthEndpoint(path: string) {
  return (
    path.endsWith(CAPTCHA_PATH) ||
    path.endsWith(LOGIN_PATH) ||
    path.endsWith(REFRESH_PATH)
  )
}

function recoveryAllowed(forLogout: boolean) {
  return (
    !isClosedSession() &&
    (activeTransition === undefined ||
      (activeTransition === 'logout' && forLogout))
  )
}

function assertRecoveryAllowed(forLogout: boolean) {
  if (!recoveryAllowed(forLogout)) throw new CanceledError('会话正在切换')
}

/** Shares one refresh per session generation, including at app startup. */
export function refreshAccessToken() {
  if (isClosedSession() && activeTransition !== 'login') {
    return Promise.reject(new SessionClosedError())
  }
  return requestRefresh(false)
}

export class SessionClosedError extends Error {
  constructor() {
    super('会话已结束')
  }
}

function requestRefresh(forLogout: boolean): Promise<string> {
  if (!recoveryAllowed(forLogout)) {
    return Promise.reject(new CanceledError('会话正在切换'))
  }
  const { accessToken, sessionGeneration } = useAuthStore.getState()
  if (refreshFlight?.generation === sessionGeneration)
    return refreshFlight.promise
  if (rejectedRefresh?.generation === sessionGeneration)
    return Promise.reject(rejectedRefresh.error)
  rejectedRefresh = undefined

  const run = () => refreshCurrentSession(sessionGeneration, accessToken)
  // Logout already owns the cookie lock, including any refresh it needs.
  const promise = (forLogout ? run() : withSessionCookieLock(run))
    .catch((error: unknown) => {
      if (
        isAxiosError(error) &&
        error.response?.status === 401 &&
        sessionGeneration === useAuthStore.getState().sessionGeneration
      ) {
        // A late 401 can arrive between releasing the flight and resetting auth.
        rejectedRefresh = { generation: sessionGeneration, error }
      }
      throw error
    })
    .finally(() => {
      if (refreshFlight?.promise === promise) refreshFlight = undefined
    })

  refreshFlight = { generation: sessionGeneration, promise }
  return promise
}

async function refreshCurrentSession(generation: number, oldToken: string) {
  assertCurrentSession(generation)
  const { sessionId, ensureDeviceId } = useAuthStore.getState()
  const sharedId = readSharedSessionId()
  const acceptPeerRefresh = () => {
    const peer = findPeerRefresh(sessionId || sharedId, oldToken)
    if (peer) {
      useAuthStore.getState().setAccessToken(peer.accessToken, peer.sessionId)
      return peer.accessToken
    }
  }
  const peerToken = acceptPeerRefresh()
  if (peerToken) return peerToken

  const submitRefresh = () =>
    refreshClient.post<ApiResult<RefreshPayload>>(REFRESH_PATH, undefined, {
      headers: { [DEVICE_ID]: ensureDeviceId() },
    })
  let response
  try {
    response = await submitRefresh()
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 409) throw error
    assertCurrentSession(generation)
    if (sharedId !== readSharedSessionId()) {
      failCurrentSession()
      throw new CanceledError('会话已变更')
    }

    // A sibling may have rotated the cookie while the first request was in flight.
    const retryPeerToken = acceptPeerRefresh()
    if (retryPeerToken) return retryPeerToken
    response = await submitRefresh()
  }
  assertCurrentSession(generation)
  const payload = response.data?.data
  const token = stripBearerPrefix(
    typeof payload?.accessToken === 'string' ? payload.accessToken : undefined
  )
  if (!token || typeof payload?.sessionId !== 'string' || !payload.sessionId) {
    throw new AxiosError(
      token ? '刷新响应缺少会话标识' : '刷新响应缺少访问令牌',
      AxiosError.ERR_BAD_RESPONSE,
      response.config,
      response.request,
      response
    )
  }
  if (
    (sessionId && sessionId !== payload.sessionId) ||
    sharedId !== readSharedSessionId()
  ) {
    failCurrentSession()
    throw new CanceledError('会话已变更')
  }
  useAuthStore.getState().setAccessToken(token, payload.sessionId)
  publishSessionId(payload.sessionId)
  if (Number.isFinite(payload.expiresIn) && payload.expiresIn > 0) {
    publishPeerRefresh({
      sessionId: payload.sessionId,
      accessToken: token,
      expiresAt: Date.now() + payload.expiresIn * 1000,
    })
  }
  return token
}

/** Orders cookie writes and lets a pending refresh finish before login or logout. */
export function withAuthTransition<T>(
  kind: AuthTransition,
  operation: () => Promise<T>
): Promise<T> {
  const run = async () => {
    activeTransition = kind
    try {
      await refreshFlight?.promise.catch(() => undefined)
      return await withSessionCookieLock(operation)
    } finally {
      activeTransition = undefined
    }
  }
  const result = transitionQueue ? transitionQueue.then(run, run) : run()
  transitionQueue = result
  const clearQueue = () => {
    if (transitionQueue === result) transitionQueue = undefined
  }
  void result.then(clearQueue, clearQueue)
  return result
}

apiClient.interceptors.request.use((config) => {
  const path = requestPath(config.url)
  if (config.skipSession || isPublicAuthEndpoint(path)) {
    delete config.authAttempt
    config.headers.delete(AUTHORIZATION)
    config.headers.set(DEVICE_ID, useAuthStore.getState().ensureDeviceId())
    return config
  }

  const attempt = config.authAttempt
  const generation =
    attempt?.generation ?? useAuthStore.getState().sessionGeneration
  assertCurrentSession(generation)
  if (isClosedSession()) {
    throw new CanceledError('会话已结束')
  }
  const forLogout = path.endsWith(LOGOUT_PATH)
  if (attempt?.replayed) assertRecoveryAllowed(forLogout)
  if (!forLogout) {
    const signal = sessionRequestSignal()
    if (!config.signal) config.signal = signal
    else if (
      typeof AbortSignal.any === 'function' &&
      config.signal instanceof AbortSignal
    ) {
      config.signal = AbortSignal.any([signal, config.signal])
    }
  }

  const state = useAuthStore.getState()
  const token = state.accessToken
  config.authAttempt = {
    generation,
    token,
    replayed: attempt?.replayed ?? false,
  }

  config.headers.set(DEVICE_ID, state.ensureDeviceId())
  if (token) config.headers.set(AUTHORIZATION, `Bearer ${token}`)
  else config.headers.delete(AUTHORIZATION)

  return config
})

apiClient.interceptors.response.use(
  (response) => {
    if (response.config.authAttempt) {
      assertCurrentSession(response.config.authAttempt.generation)
    }
    return response
  },
  async (error: AxiosError) => {
    const config = error.config
    const attempt = config?.authAttempt
    if (attempt) assertCurrentSession(attempt.generation)
    if (
      !config ||
      !attempt ||
      error.response?.status !== 401 ||
      attempt.replayed
    ) {
      throw error
    }
    if (config.signal?.aborted) throw new CanceledError()

    const forLogout = requestPath(config.url).endsWith(LOGOUT_PATH)
    assertRecoveryAllowed(forLogout)
    const currentToken = useAuthStore.getState().accessToken
    try {
      if (!currentToken || currentToken === attempt.token) {
        await requestRefresh(forLogout)
      }
    } catch (refreshError) {
      assertCurrentSession(attempt.generation)
      assertRecoveryAllowed(forLogout)
      if (
        !isAxiosError(refreshError) ||
        refreshError.response?.status !== 401
      ) {
        throw refreshError
      }
      // Logout owns its redirect, including when refresh is rejected.
      if (!forLogout) failCurrentSession()
      if (config.signal?.aborted) throw new CanceledError()
      throw error
    }

    assertCurrentSession(attempt.generation)
    assertRecoveryAllowed(forLogout)
    if (config.signal?.aborted) throw new CanceledError()
    attempt.replayed = true
    return apiClient(config)
  }
)
