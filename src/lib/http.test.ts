import { AxiosError, isCancel, type AxiosAdapter } from 'axios'
import { loginByPassword } from '@/app/auth/api'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { useAuthStore } from '@/stores/auth-store'
import {
  closeSessionRequests,
  setAuthFailureHandler,
} from './auth-session-channel'
import { apiClient, refreshClient, refreshAccessToken } from './http'
import { gate, reply } from './http-test-fixtures'

const originalAdapter = apiClient.defaults.adapter
const originalRefreshAdapter = refreshClient.defaults.adapter
const state = () => useAuthStore.getState()

beforeEach(() => {
  state().reset()
  state().setAccessToken('test-old-token', 'test-session')
  setAuthFailureHandler(undefined)
})

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  refreshClient.defaults.adapter = originalRefreshAdapter
  setAuthFailureHandler(undefined)
  state().reset()
})

describe('S17 HTTP recovery', () => {
  test('shares one refresh for three simultaneous 401s and replays each with the new token', async () => {
    const original = gate()
    const refreshStarted = gate()
    const captured: [string | undefined, unknown][] = []
    let refreshes = 0
    apiClient.defaults.adapter = (config) => {
      const auth = config.headers.get('Authorization')
      captured.push([config.url, auth])
      return reply(config, auth === 'Bearer test-new-token' ? 200 : 401)
    }
    refreshClient.defaults.adapter = async (config) => {
      refreshes++
      refreshStarted.release()
      await original.wait
      return reply(config, 200, {
        data: {
          accessToken: 'test-new-token',
          sessionId: 'test-session',
          expiresIn: 1800,
        },
      })
    }

    const paths = ['/one', '/two', '/three']
    const pending = Promise.all(paths.map((path) => apiClient.get(path)))
    await refreshStarted.wait
    expect(refreshAccessToken()).toBe(refreshAccessToken())
    original.release()
    await pending

    expect(refreshes).toBe(1)
    for (const path of paths) {
      expect(captured.filter(([url]) => url === path)).toEqual([
        [path, 'Bearer test-old-token'],
        [path, 'Bearer test-new-token'],
      ])
    }
  })

  test('a replayed 401 terminates recovery after a successful refresh', async () => {
    let attempts = 0
    let refreshes = 0
    let failures = 0
    setAuthFailureHandler(() => {
      failures++
    })
    apiClient.defaults.adapter = (config) => {
      attempts++
      return reply(config, 401)
    }
    refreshClient.defaults.adapter = (config) => {
      refreshes++
      return reply(config, 200, {
        data: {
          accessToken: 'test-new-token',
          sessionId: 'test-session',
          expiresIn: 1800,
        },
      })
    }

    await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(AxiosError)
    expect([attempts, refreshes, failures]).toEqual([2, 1, 0])
    expect(state().accessToken).toBe('test-new-token')
  })

  test('a failed shared refresh clears the session and invokes the redirect handler once', async () => {
    let failures = 0
    let refreshes = 0
    const pendingRefresh = gate()
    const started = gate()
    const generation = state().sessionGeneration
    setAuthFailureHandler(() => {
      failures++
    })
    apiClient.defaults.adapter = (config) => reply(config, 401)
    refreshClient.defaults.adapter = async (config) => {
      refreshes++
      started.release()
      await pendingRefresh.wait
      return reply(config, 401)
    }

    const pending = Promise.allSettled([
      apiClient.get('/one'),
      apiClient.get('/two'),
    ])
    await started.wait
    pendingRefresh.release()
    expect((await pending).map((result) => result.status)).toEqual([
      'rejected',
      'rejected',
    ])
    expect([refreshes, failures]).toEqual([1, 1])
    expect(state().accessToken).toBe('')
    expect(state().sessionGeneration).toBe(generation + 1)
  })

  test.each([503, AxiosError.ERR_NETWORK])(
    'a temporary refresh failure %s preserves the session and allows another request to retry',
    async (failure) => {
      const generation = state().sessionGeneration
      let refreshes = 0
      let invalidations = 0
      setAuthFailureHandler(() => {
        invalidations++
      })
      apiClient.defaults.adapter = (config) =>
        reply(
          config,
          config.headers.get('Authorization') === 'Bearer test-retry-token'
            ? 200
            : 401
        )
      refreshClient.defaults.adapter = (config) => {
        if (++refreshes === 1) {
          if (typeof failure === 'number') return reply(config, failure)
          return Promise.reject(new AxiosError('offline', failure, config))
        }
        return reply(config, 200, {
          data: {
            accessToken: 'test-retry-token',
            sessionId: 'test-session',
            expiresIn: 1800,
          },
        })
      }

      const error = await apiClient
        .get('/protected')
        .catch((error: unknown) => error)
      expect(error).toMatchObject(
        typeof failure === 'number'
          ? { response: { status: failure } }
          : { code: failure }
      )
      expect(state().accessToken).toBe('test-old-token')
      expect(state().sessionGeneration).toBe(generation)
      expect(invalidations).toBe(0)
      await expect(apiClient.get('/protected')).resolves.toHaveProperty(
        'status',
        200
      )
      expect(refreshes).toBe(2)
    }
  )

  test.each([false, true])(
    'a refresh conflict retries once when the obsolete response arrives first=%s',
    async (obsoleteFirst) => {
      const session = state().sessionGeneration
      const started = gate()
      const releaseObsolete = gate()
      const received: string[] = []
      let cookie = 'test-old-cookie'
      apiClient.defaults.adapter = (config) =>
        reply(
          config,
          config.headers.get('Authorization') === 'Bearer test-retry-token'
            ? 200
            : 401
        )
      refreshClient.defaults.adapter = async (config) => {
        received.push(cookie)
        if (cookie === 'test-old-cookie') {
          started.release()
          await releaseObsolete.wait
          return reply(config, 409)
        }
        return reply(config, 200, {
          data: {
            accessToken: 'test-retry-token',
            sessionId: 'test-session',
            expiresIn: 1800,
          },
        })
      }

      const pending = apiClient.get('/protected')
      await started.wait
      if (!obsoleteFirst) cookie = 'test-next-cookie'
      releaseObsolete.release()
      if (obsoleteFirst) {
        await expect(pending).rejects.toHaveProperty('response.status', 409)
        expect(received).toEqual(['test-old-cookie', 'test-old-cookie'])
        cookie = 'test-next-cookie'
        await expect(apiClient.get('/protected')).resolves.toHaveProperty(
          'status',
          200
        )
      } else {
        await expect(pending).resolves.toHaveProperty('status', 200)
      }
      expect(state().sessionGeneration).toBe(session)
      expect(received).toEqual(
        obsoleteFirst
          ? ['test-old-cookie', 'test-old-cookie', 'test-next-cookie']
          : ['test-old-cookie', 'test-next-cookie']
      )
    }
  )

  test('login and refresh 401s bypass recovery, and 403 stays a permission error', async () => {
    let refreshes = 0
    let failures = 0
    setAuthFailureHandler(() => {
      failures++
    })
    apiClient.defaults.adapter = (config) => {
      const forbidden = config.url === '/protected'
      expect(config.headers.has('Authorization')).toBe(forbidden)
      return reply(config, forbidden ? 403 : 401)
    }
    refreshClient.defaults.adapter = (config) => {
      refreshes++
      return reply(config, 401)
    }

    await expect(apiClient.post('/auth/login')).rejects.toBeInstanceOf(
      AxiosError
    )
    await expect(apiClient.post('/auth/refresh')).rejects.toBeInstanceOf(
      AxiosError
    )
    await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(AxiosError)
    expect(refreshes).toBe(0)
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(AxiosError)
    expect([refreshes, failures]).toEqual([1, 0])
  })

  test.each([
    ['/auth/captcha', 200],
    ['/auth/login', 200],
    ['/auth/refresh', 401],
    ['/public/status', 401],
  ] as const)(
    '%s preserves its %i response across a session change',
    async (path, status) => {
      const sent = gate()
      const finish = gate()
      let refreshes = 0
      refreshClient.defaults.adapter = (config) => {
        refreshes++
        return reply(config, 401)
      }
      const caller = new AbortController()
      apiClient.defaults.adapter = async (config) => {
        sent.release()
        await finish.wait
        expect(config.headers.has('Authorization')).toBe(false)
        expect(config.signal).toBe(caller.signal)
        return reply(config, status)
      }

      const pending = apiClient.request({
        url: path,
        skipSession: path === '/public/status',
        signal: caller.signal,
      })
      await sent.wait
      closeSessionRequests()
      state().setAccessToken('test-replacement-token', 'test-replacement-session')
      finish.release()

      if (status === 200) {
        await expect(pending).resolves.toHaveProperty('status', 200)
      } else {
        await expect(pending).rejects.toHaveProperty('response.status', 401)
      }
      expect(refreshes).toBe(0)
    }
  )

  test('login and refresh share the device ID and read their current response bodies', async () => {
    const command = {
      username: 'test-user',
      password: 'test-password',
      captchaCode: '1234',
      captchaKey: 'test-captcha',
      rememberMe: true,
      deviceId: state().ensureDeviceId(),
    }
    const login = {
      userId: '21',
      username: 'test-user',
      nickname: 'Test',
      accessToken: 'test-login-token',
      sessionId: 'test-session',
      expiresIn: 1800,
      expireTime: '2026-11-18T12:00:00',
    }
    apiClient.defaults.adapter = (config) => {
      expect(config.url).toBe('/auth/login')
      expect(config.headers.get('X-Device-Id')).toBe(command.deviceId)
      expect(config.headers.has('Authorization')).toBe(false)
      return reply(config, 200, { code: 200, data: login })
    }
    refreshClient.defaults.adapter = (config) => {
      expect(config.method).toBe('post')
      expect(config.url).toBe('/auth/refresh')
      expect(config.baseURL).toBe(apiClient.defaults.baseURL)
      expect(config.withCredentials).toBe(true)
      expect(config.data).toBeUndefined()
      expect(config.headers.has('Authorization')).toBe(false)
      expect(config.headers.get('X-Device-Id')).toBe(command.deviceId)
      return reply(
        config,
        200,
        {
          code: 200,
          data: {
            accessToken: 'test-new-token',
            sessionId: 'test-session',
            expiresIn: 1800,
          },
        },
        { Authorization: 'Bearer test-header-token' }
      )
    }

    await expect(loginByPassword(command)).resolves.toEqual(login)
    await expect(refreshAccessToken()).resolves.toBe('test-new-token')
    expect(state().accessToken).toBe('test-new-token')
  })

  test('a refresh response without a body token fails even when a header is present', async () => {
    refreshClient.defaults.adapter = (config) =>
      reply(
        config,
        200,
        { code: 200, data: { expiresIn: 1800 } },
        {
          Authorization: 'Bearer test-header-token',
        }
      )

    await expect(refreshAccessToken()).rejects.toThrow('刷新响应缺少访问令牌')
    expect(state().accessToken).toBe('test-old-token')
  })

  test('a late old-token 401 replays with the token that already replaced it', async () => {
    const oldRequest = gate()
    const started = gate()
    const seen: unknown[] = []
    apiClient.defaults.adapter = async (config) => {
      const token = config.headers.get('Authorization')
      seen.push(token)
      if (token === 'Bearer test-old-token') {
        started.release()
        await oldRequest.wait
        return reply(config, 401)
      }
      return reply(config, 200)
    }
    refreshClient.defaults.adapter = () => {
      throw new Error('late response should reuse the current access token')
    }

    const request = apiClient.get('/protected')
    await started.wait
    state().setAccessToken('test-new-token', 'test-session')
    oldRequest.release()
    await request
    expect(seen).toEqual(['Bearer test-old-token', 'Bearer test-new-token'])
  })

  test('a request canceled during refresh does not replay', async () => {
    const controller = new AbortController()
    const started = gate()
    const stop = gate()
    let requests = 0
    apiClient.defaults.adapter = (config) => {
      requests++
      return reply(config, 401)
    }
    refreshClient.defaults.adapter = async (config) => {
      started.release()
      await stop.wait
      return reply(config, 200, {
        data: {
          accessToken: 'test-new-token',
          sessionId: 'test-session',
          expiresIn: 1800,
        },
      })
    }

    const outcome = apiClient
      .get('/protected', { signal: controller.signal })
      .catch(isCancel)
    await started.wait
    controller.abort()
    stop.release()
    await expect(outcome).resolves.toBe(true)
    expect(requests).toBe(1)
  })

  test('a refresh started by an old session cannot update a replacement session', async () => {
    const started = gate()
    const stop = gate()
    refreshClient.defaults.adapter = async (config) => {
      started.release()
      await stop.wait
      return reply(config, 200, {
        data: {
          accessToken: 'test-stale-token',
          sessionId: 'test-session',
          expiresIn: 1800,
        },
      })
    }

    const outcome = refreshAccessToken().catch(isCancel)
    await started.wait
    state().reset()
    state().setAccessToken('test-replacement-token', 'test-session')
    stop.release()
    await expect(outcome).resolves.toBe(true)
    expect(state().accessToken).toBe('test-replacement-token')
  })

  test('replay preserves JSON, multipart, query parameters, blob mode and upload progress', async () => {
    const form = new FormData()
    form.append('name', 'example')
    const blob = new Blob(['example'], { type: 'application/pdf' })
    const onUploadProgress = () => undefined
    const params = { id: '42' }
    const calls: Parameters<AxiosAdapter>[0][] = []
    apiClient.defaults.adapter = (config) => {
      calls.push(config)
      if (config.headers.get('Authorization') === 'Bearer test-old-token') {
        return reply(config, 401)
      }
      return reply(config, 200, config.responseType === 'blob' ? blob : null)
    }
    refreshClient.defaults.adapter = (config) =>
      reply(config, 200, {
        data: {
          accessToken: 'test-new-token',
          sessionId: 'test-session',
          expiresIn: 1800,
        },
      })

    const [, , download] = await Promise.all([
      apiClient.patch('/json', { example: 42 }, { params }),
      apiClient.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      }),
      apiClient.get('/download', { responseType: 'blob' }),
    ])

    expect(download.data).toBe(blob)
    const json = calls.filter((config) => config.url === '/json')
    expect(
      json.map(({ method, data, params }) => ({ method, data, params }))
    ).toEqual([
      { method: 'patch', data: '{"example":42}', params },
      { method: 'patch', data: '{"example":42}', params },
    ])
    const uploads = calls.filter((config) => config.url === '/upload')
    expect(uploads).toHaveLength(2)
    for (const config of uploads) {
      expect(config.data).toBe(form)
      expect(config.onUploadProgress).toBe(onUploadProgress)
      expect(config.headers.get('Content-Type')).toBe('multipart/form-data')
    }
  })
})
