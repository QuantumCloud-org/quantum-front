import { CanceledError } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { sanitizeRedirect } from './sanitize-redirect'

const CHANNEL_KEY = 'quantum.auth.session'
const SIGN_IN_PATH = '/sign-in'

type PeerRefresh = {
  sessionId: string
  accessToken: string
  expiresAt: number
}

let channel: BroadcastChannel | undefined
let latestRefresh: PeerRefresh | undefined
let closedGeneration: number | undefined
let sessionRequests = new AbortController()
let onAuthFailure: (() => void) | undefined

/** Registers the application handler for a business request's refresh failure. */
export function setAuthFailureHandler(handler: (() => void) | undefined) {
  onAuthFailure = handler
}

function reconcileSharedSession(sharedSessionId = readSharedSessionId()) {
  if (sharedSessionId === undefined) return
  if (latestRefresh?.sessionId !== sharedSessionId) latestRefresh = undefined
  const { sessionId } = useAuthStore.getState()
  if (sessionId && sessionId !== sharedSessionId) {
    failCurrentSession()
  }
}

/** Invalidates requests started by a former session before consuming their data. */
export function assertCurrentSession(generation: number) {
  reconcileSharedSession()
  if (generation !== useAuthStore.getState().sessionGeneration) {
    throw new CanceledError('会话已变更')
  }
}

/** Prevents queued requests from restoring a session after its identity ended. */
export function closeSessionRequests() {
  const { sessionGeneration, reset } = useAuthStore.getState()
  closedGeneration = sessionGeneration + 1
  const previousRequests = sessionRequests
  sessionRequests = new AbortController()
  reset()
  previousRequests.abort()
}

/** Cancels transports when the local identity boundary changes. */
export function sessionRequestSignal() {
  return sessionRequests.signal
}

export function isClosedSession() {
  const { sessionGeneration, sessionId } = useAuthStore.getState()
  return sessionGeneration === closedGeneration && !sessionId
}

export function failCurrentSession() {
  closeSessionRequests()
  if (onAuthFailure) {
    onAuthFailure()
  } else if (
    typeof window !== 'undefined' &&
    window.location.pathname !== SIGN_IN_PATH
  ) {
    const { pathname, search, hash } = window.location
    const target = sanitizeRedirect(pathname + search + hash)
    window.location.replace(
      target
        ? `${SIGN_IN_PATH}?redirect=${encodeURIComponent(target)}`
        : SIGN_IN_PATH
    )
  }
}

/** Serializes requests that can write the shared cookie across same-origin tabs. */
export function withSessionCookieLock<T>(operation: () => Promise<T>) {
  const locks =
    typeof window === 'undefined' ? undefined : window.navigator?.locks
  return locks ? locks.request(CHANNEL_KEY, operation) : operation()
}

/** Reads the current browser identity marker without storing bearer credentials. */
export function readSharedSessionId() {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage.getItem(CHANNEL_KEY) ?? undefined
  } catch {
    return undefined
  }
}

/** Publishes successful login and logout across tabs. */
export function publishSessionId(sessionId: string) {
  if (latestRefresh?.sessionId !== sessionId) latestRefresh = undefined
  if (readSharedSessionId() === sessionId) return
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CHANNEL_KEY, sessionId)
    } catch {
      // BroadcastChannel can still notify peers when browser storage is blocked.
    }
  }
  channel?.postMessage({ sessionId })
}

/** Shares a fresh access token in memory with tabs using the same session. */
export function publishPeerRefresh(refresh: PeerRefresh) {
  channel?.postMessage(refresh)
}

export function findPeerRefresh(
  sessionId: string | undefined,
  oldToken: string
) {
  if (
    latestRefresh &&
    latestRefresh.sessionId === sessionId &&
    latestRefresh.accessToken !== oldToken &&
    latestRefresh.expiresAt > Date.now()
  ) {
    return latestRefresh
  }
}

function receiveSessionMessage(data: unknown) {
  if (!data || typeof data !== 'object' || !('sessionId' in data)) return
  if (typeof data.sessionId !== 'string') return
  if (
    'accessToken' in data &&
    typeof data.accessToken === 'string' &&
    'expiresAt' in data &&
    typeof data.expiresAt === 'number'
  ) {
    latestRefresh = {
      sessionId: data.sessionId,
      accessToken: data.accessToken,
      expiresAt: data.expiresAt,
    }
    return
  }
  reconcileSharedSession(readSharedSessionId() ?? data.sessionId)
}

/** Invalidates older tabs on identity changes and accepts sibling refresh results. */
export function registerAuthSessionSync() {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CHANNEL_KEY) {
      reconcileSharedSession(readSharedSessionId() ?? event.newValue ?? '')
    }
  }
  window.addEventListener('storage', onStorage)
  if (typeof window.BroadcastChannel === 'function') {
    channel = new window.BroadcastChannel(CHANNEL_KEY)
    channel.onmessage = (event: MessageEvent<unknown>) =>
      receiveSessionMessage(event.data)
  }
  return () => {
    window.removeEventListener('storage', onStorage)
    channel?.close()
    channel = undefined
    latestRefresh = undefined
  }
}
