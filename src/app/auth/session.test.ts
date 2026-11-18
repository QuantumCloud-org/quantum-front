import { CanceledError } from 'axios'
import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { useAuthStore } from '@/stores/auth-store'
import {
  registerAuthSessionSync,
  setAuthFailureHandler,
} from '@/lib/auth-session-channel'
import { apiClient, refreshClient } from '@/lib/http'
import { gate, reply } from '@/lib/http-test-fixtures'
import { fetchCaptcha } from './api'
import {
  bootstrapAuthSession,
  loginWithPassword,
  logoutSession,
  setSessionCacheClearer,
} from './session'

const originalAdapter = apiClient.defaults.adapter
const originalRefreshAdapter = refreshClient.defaults.adapter
const state = () => useAuthStore.getState()
const user = {
  id: '1',
  username: 'first',
  nickname: '',
  roles: [],
  permissions: [],
  canClearAuditLogs: false,
}

beforeEach(() => state().reset())
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  refreshClient.defaults.adapter = originalRefreshAdapter
  setSessionCacheClearer(undefined)
  state().reset()
})

describe('S17 session startup', () => {
  test('startup and a concurrent 401 share refresh, then info uses the new token', async () => {
    const incoming = gate()
    const allowRefresh = gate()
    const calls: string[] = []
    refreshClient.defaults.adapter = async (config) => {
      calls.push('refresh')
      await allowRefresh.wait
      return reply(config, 200, {
        data: { accessToken: 'test-new-token', sessionId: 'test-session' },
      })
    }
    apiClient.defaults.adapter = (config) => {
      const token = config.headers.get('Authorization')
      calls.push(String(config.url) + ':' + String(token))
      if (!token) {
        incoming.release()
        return reply(config, 401)
      }
      return reply(config, 200, { data: user })
    }

    const startup = bootstrapAuthSession()
    const guardedRoute = bootstrapAuthSession()
    const request = apiClient.get('/protected')
    await incoming.wait
    allowRefresh.release()
    await Promise.all([startup, guardedRoute, request])
    expect(calls.filter((call) => call === 'refresh')).toHaveLength(1)
    expect(calls).toContain('/auth/info:Bearer test-new-token')
    expect(state().user).toEqual(user)
  })

  test('a denied cold start is shared with the protected route without a second refresh', async () => {
    let refreshes = 0
    refreshClient.defaults.adapter = (config) => {
      refreshes++
      return reply(config, 401)
    }
    apiClient.defaults.adapter = () => {
      throw new Error('info should wait for refresh')
    }

    await expect(bootstrapAuthSession()).rejects.toHaveProperty(
      'response.status',
      401
    )
    await expect(bootstrapAuthSession()).rejects.toHaveProperty(
      'response.status',
      401
    )
    expect(refreshes).toBe(1)
    expect(state().user).toBeNull()
  })

  test('delivers an in-flight captcha after startup refresh returns 401', async () => {
    const captchaSent = gate()
    const finishCaptcha = gate()
    const generation = state().sessionGeneration
    const captcha = {
      key: 'test-key',
      image: 'data:image/png;base64,AA==',
      length: 4,
    }
    refreshClient.defaults.adapter = async (config) => {
      await captchaSent.wait
      return reply(config, 401)
    }
    apiClient.defaults.adapter = async (config) => {
      captchaSent.release()
      await finishCaptcha.wait
      expect(config.url).toBe('/auth/captcha')
      expect(config.headers.has('Authorization')).toBe(false)
      return reply(config, 200, { data: captcha })
    }

    const startup = bootstrapAuthSession()
    const pending = fetchCaptcha()
    try {
      await expect(startup).rejects.toHaveProperty('response.status', 401)
      expect(state().sessionGeneration).toBe(generation + 1)
    } finally {
      finishCaptcha.release()
    }
    await expect(pending).resolves.toEqual(captcha)
  })

  test('logout cancels the old query cache and login fetches the next identity', async () => {
    const cache = new QueryClient()
    const key = ['navigation', 'routers']
    cache.setQueryData(key, ['old-menu'])
    setSessionCacheClearer(() => cache.clear())
    state().setAccessToken('test-first-token', 'test-first-session')
    state().setUser(user)
    apiClient.defaults.adapter = (config) => {
      if (config.url === '/auth/login') {
        return reply(config, 200, {
          data: { accessToken: 'test-next-token', sessionId: 'test-session' },
        })
      }
      if (config.url === '/auth/info') {
        expect(config.headers.get('Authorization')).toBe(
          'Bearer test-next-token'
        )
        return reply(config, 200, {
          data: { ...user, id: '2', username: 'second' },
        })
      }
      expect(config.url).toBe('/auth/logout')
      return reply(config, 200, { data: null })
    }

    await expect(logoutSession()).resolves.toBe(true)
    expect(cache.getQueryData(key)).toBeUndefined()
    const second = await loginWithPassword({
      username: 'second',
      password: 'test-fake-password',
      captchaCode: 'test-code',
      captchaKey: 'test-key',
      rememberMe: false,
    })
    expect(second?.id).toBe('2')
    expect(state().user?.id).toBe('2')
    expect(
      await cache.fetchQuery({ queryKey: key, queryFn: () => ['new-menu'] })
    ).toEqual(['new-menu'])
  })

  test('a protected route redirects to sign-in after logout without refreshing', async () => {
    state().setAccessToken('test-first-token', 'test-first-session')
    state().setUser(user)
    let refreshes = 0
    refreshClient.defaults.adapter = (config) => {
      refreshes++
      return reply(config, 401)
    }
    apiClient.defaults.adapter = (config) => {
      expect(config.url).toBe('/auth/logout')
      return reply(config, 200, { data: null })
    }
    await expect(logoutSession()).resolves.toBe(true)

    const target = '/?view=detail#selected'
    const history = createMemoryHistory({ initialEntries: [target] })
    const router = createRouter({
      routeTree,
      history,
      isServer: false,
      origin: 'https://example.invalid',
      context: { queryClient: new QueryClient() },
    })
    await router.load()

    expect(refreshes).toBe(0)
    expect(history.location.pathname).toBe('/sign-in')
    expect(new URLSearchParams(history.location.search).get('redirect')).toBe(
      target
    )
  })
})

test('a write cannot replay with another server session and its private cache is cleared', async () => {
  const cache = new QueryClient()
  const privateKey = ['private']
  const originalTokens: unknown[] = []
  setAuthFailureHandler(() => cache.clear())
  apiClient.defaults.adapter = (config) => {
    if (config.url === '/auth/login') {
      return reply(config, 200, {
        data: {
          accessToken: 'test-original-token',
          sessionId: 'test-first-session',
        },
      })
    }
    if (config.url === '/auth/info') return reply(config, 200, { data: user })
    const token = config.headers.get('Authorization')
    originalTokens.push(token)
    return reply(config, token === 'Bearer test-original-token' ? 401 : 200)
  }
  refreshClient.defaults.adapter = (config) =>
    reply(config, 200, {
      data: {
        accessToken: 'test-other-token',
        sessionId: 'test-second-session',
        expiresIn: 1800,
      },
    })

  try {
    await loginWithPassword({
      username: user.username,
      password: 'test-fake-password',
      captchaCode: 'test-code',
      captchaKey: 'test-key',
      rememberMe: false,
    })
    cache.setQueryData(privateKey, 'first account')
    await expect(
      apiClient.post('/protected', { name: 'draft' })
    ).rejects.toBeInstanceOf(CanceledError)
    expect(originalTokens).toEqual(['Bearer test-original-token'])
    expect(state().user).toBeNull()
    expect(state().accessToken).toBe('')
    expect(cache.getQueryData(privateKey)).toBeUndefined()
  } finally {
    setAuthFailureHandler(undefined)
  }
})

test.each([false, true])(
  'a tab with a replaced identity blocks writes with storage notification delivered=%s',
  async (notify) => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const sessionKey = 'quantum.auth.session'
    const storage = new Map([[sessionKey, 'test-first-session']])
    const target = new EventTarget()
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: Object.assign(target, {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
        },
      }),
    })
    const dispose = registerAuthSessionSync()
    let invalidations = 0
    let writes = 0
    let refreshes = 0
    setAuthFailureHandler(() => {
      invalidations++
    })
    state().setAccessToken('test-original-token', 'test-first-session')
    state().setUser(user)
    apiClient.defaults.adapter = (config) => {
      writes++
      return reply(config, 401)
    }
    refreshClient.defaults.adapter = (config) => {
      refreshes++
      return reply(config, 200, {
        data: {
          accessToken: 'test-sibling-token',
          sessionId: 'test-second-session',
          expiresIn: 1800,
        },
      })
    }

    try {
      storage.set(sessionKey, 'test-second-session')
      if (notify) {
        const event = Object.assign(new Event('storage'), { key: sessionKey })
        target.dispatchEvent(event)
      }
      await expect(
        apiClient.post('/protected', { name: 'draft' })
      ).rejects.toBeInstanceOf(CanceledError)
      expect({ invalidations, writes, refreshes }).toEqual({
        invalidations: 1,
        writes: 0,
        refreshes: 0,
      })
      expect(state().user).toBeNull()
    } finally {
      dispose()
      setAuthFailureHandler(undefined)
      if (original) Object.defineProperty(globalThis, 'window', original)
      else Reflect.deleteProperty(globalThis, 'window')
    }
  }
)

test.each([false, true])(
  'an in-flight write aborts at the adapter with a caller signal present=%s',
  async (hasCallerSignal) => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const sessionKey = 'quantum.auth.session'
    const storage = new Map([[sessionKey, 'test-first-session']])
    const target = new EventTarget()
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: Object.assign(target, {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
        },
      }),
    })
    const dispose = registerAuthSessionSync()
    setAuthFailureHandler(() => undefined)
    state().setAccessToken('test-active-token', 'test-first-session')
    const caller = new AbortController()
    const sent = gate()
    const finish = gate()
    let transportAborted = false
    apiClient.defaults.adapter = async (config) => {
      config.signal?.addEventListener?.('abort', () => {
        transportAborted = true
        finish.release()
      })
      sent.release()
      await finish.wait
      return reply(config, 200)
    }

    const pending = apiClient
      .post(
        '/protected',
        {},
        {
          signal: hasCallerSignal ? caller.signal : undefined,
        }
      )
      .catch((error: unknown) => error)

    try {
      await sent.wait
      storage.set(sessionKey, 'test-second-session')
      target.dispatchEvent(
        Object.assign(new Event('storage'), { key: sessionKey })
      )
      expect(transportAborted).toBe(true)
      expect(caller.signal.aborted).toBe(false)
      expect(await pending).toBeInstanceOf(CanceledError)
    } finally {
      finish.release()
      await pending
      dispose()
      setAuthFailureHandler(undefined)
      if (original) Object.defineProperty(globalThis, 'window', original)
      else Reflect.deleteProperty(globalThis, 'window')
    }
  }
)

test('a temporary failure refreshing for logout preserves the session for retry', async () => {
  const oldGeneration = state().sessionGeneration
  state().setAccessToken('test-old-token', 'test-session')
  state().setUser(user)
  apiClient.defaults.adapter = (config) =>
    reply(
      config,
      config.headers.get('Authorization') === 'Bearer test-new-token'
        ? 200
        : 401,
      { data: null }
    )
  let attempts = 0
  refreshClient.defaults.adapter = (config) =>
    ++attempts === 1
      ? reply(config, 503)
      : reply(config, 200, {
          data: {
            accessToken: 'test-new-token',
            sessionId: 'test-session',
            expiresIn: 1800,
          },
        })

  await expect(logoutSession()).resolves.toBe(false)
  expect(state().user).toBe(user)
  expect(state().sessionGeneration).toBe(oldGeneration)
  await expect(logoutSession()).resolves.toBe(true)
  expect(state().user).toBeNull()
})

test('startup retries a temporary refresh error in the same session generation', async () => {
  const generation = state().sessionGeneration
  let refreshes = 0
  refreshClient.defaults.adapter = (config) =>
    ++refreshes === 1
      ? reply(config, 503)
      : reply(config, 200, {
          data: {
            accessToken: 'test-retry-token',
            sessionId: 'test-session',
            expiresIn: 1800,
          },
        })
  apiClient.defaults.adapter = (config) => reply(config, 200, { data: user })
  await expect(bootstrapAuthSession()).rejects.toHaveProperty(
    'response.status',
    503
  )
  expect(state().sessionGeneration).toBe(generation)
  await expect(bootstrapAuthSession()).resolves.toEqual(user)
  expect(refreshes).toBe(2)
})

test('startup waits for a sibling cookie rotation before submitting its refresh', async () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const lockRequested = gate()
  const releaseSibling = gate()
  const storage = new Map<string, string>()
  const sentCookies: string[] = []
  let cookie = 'test-old-cookie'
  const sibling = releaseSibling.wait.then(() => {
    cookie = 'test-next-cookie'
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      navigator: {
        locks: {
          request: async <T>(_name: string, callback: () => Promise<T>) => {
            lockRequested.release()
            await sibling
            return callback()
          },
        },
      },
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  })
  refreshClient.defaults.adapter = (config) => {
    sentCookies.push(cookie)
    return reply(config, 200, {
      data: {
        accessToken: 'test-fresh-token',
        sessionId: 'test-session',
        expiresIn: 1800,
      },
    })
  }
  apiClient.defaults.adapter = (config) => reply(config, 200, { data: user })

  try {
    const restored = bootstrapAuthSession()
    const ordering = await Promise.race([
      lockRequested.wait.then(() => 'waiting'),
      restored.then(() => 'completed'),
    ])
    releaseSibling.release()
    await restored
    expect(ordering).toBe('waiting')
    expect(sentCookies).toEqual(['test-next-cookie'])
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})

test.each([false, true])(
  'startup consumes a fresh sibling result with refresh conflict=%s',
  async (conflict) => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const target = new EventTarget()
    const storage = new Map([['quantum.auth.session', 'test-session']])
    const requested = gate()
    const releaseSibling = gate()
    let receive: ((event: MessageEvent<unknown>) => void) | undefined

    class PeerChannel {
      set onmessage(listener: (event: MessageEvent<unknown>) => void) {
        receive = listener
      }
      close() {
        receive = undefined
      }
    }

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: Object.assign(target, {
        BroadcastChannel: PeerChannel,
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
        },
        navigator: {
          locks: {
            request: async <T>(_name: string, callback: () => Promise<T>) => {
              requested.release()
              await releaseSibling.wait
              return callback()
            },
          },
        },
      }),
    })
    const dispose = registerAuthSessionSync()
    const deliverPeerResult = () => {
      receive?.(
        new MessageEvent('message', {
          data: {
            sessionId: 'test-session',
            accessToken: 'test-peer-token',
            expiresAt: Date.now() + 60_000,
          },
        })
      )
    }
    let refreshes = 0
    refreshClient.defaults.adapter = (config) => {
      refreshes++
      if (refreshes === 1 && conflict) deliverPeerResult()
      return reply(config, 409)
    }
    apiClient.defaults.adapter = (config) => {
      expect(config.headers.get('Authorization')).toBe('Bearer test-peer-token')
      return reply(config, 200, { data: user })
    }

    try {
      const restored = bootstrapAuthSession()
      await requested.wait
      if (!conflict) deliverPeerResult()
      releaseSibling.release()
      await expect(restored).resolves.toEqual(user)
      expect(refreshes).toBe(conflict ? 1 : 0)
    } finally {
      releaseSibling.release()
      dispose()
      if (original) Object.defineProperty(globalThis, 'window', original)
      else Reflect.deleteProperty(globalThis, 'window')
    }
  }
)

describe('S17 cookie response ordering', () => {
  test('a login blocks a new startup or business refresh until its response', async () => {
    const started = gate()
    const finishLogin = gate()
    let refreshes = 0
    refreshClient.defaults.adapter = (config) => {
      refreshes++
      return reply(config, 200, {
        data: {
          accessToken: 'test-unexpected-token',
          sessionId: 'test-session',
        },
      })
    }
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/auth/login') {
        started.release()
        await finishLogin.wait
        return reply(config, 200, {
          data: { accessToken: 'test-login-token', sessionId: 'test-session' },
        })
      }
      if (config.url === '/auth/info') return reply(config, 200, { data: user })
      return reply(config, 401)
    }

    const login = loginWithPassword({
      username: user.username,
      password: 'test-fake-password',
      captchaCode: 'test-code',
      captchaKey: 'test-key',
      rememberMe: false,
    })
    await started.wait
    try {
      await expect(bootstrapAuthSession()).rejects.toBeInstanceOf(CanceledError)
      await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(
        CanceledError
      )
      expect(refreshes).toBe(0)
    } finally {
      finishLogin.release()
      await login
    }

    expect(state().user).toEqual(user)
    expect(state().accessToken).toBe('test-login-token')
  })

  test('an expired logout can refresh and replay while business refresh remains blocked', async () => {
    const started = gate()
    const finishRefresh = gate()
    const tokens: unknown[] = []
    let refreshes = 0
    state().setAccessToken('test-expired-token', 'test-session')

    apiClient.defaults.adapter = (config) => {
      if (config.url !== '/auth/logout') return reply(config, 401)
      const token = config.headers.get('Authorization')
      tokens.push(token)
      return reply(config, token === 'Bearer test-renewed-token' ? 200 : 401, {
        data: null,
      })
    }
    refreshClient.defaults.adapter = async (config) => {
      refreshes++
      started.release()
      await finishRefresh.wait
      return reply(config, 200, {
        data: { accessToken: 'test-renewed-token', sessionId: 'test-session' },
      })
    }

    const logout = logoutSession()
    await started.wait
    try {
      await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(
        CanceledError
      )
      expect(refreshes).toBe(1)
    } finally {
      finishRefresh.release()
      await logout
    }
    expect(tokens).toEqual([
      'Bearer test-expired-token',
      'Bearer test-renewed-token',
    ])
    expect(state().accessToken).toBe('')
  })
})
