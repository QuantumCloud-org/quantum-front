import { expect, test } from 'bun:test'
import { registerPreloadRecovery, retryPageLoad } from './preload-recovery'

test('manual retry reloads after the automatic recovery was already used', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const target = new EventTarget()
  const storage = new Map<string, string>()
  let reloads = 0
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: Object.assign(target, {
      location: {
        href: 'https://example.test/system/menu',
        reload: () => {
          reloads++
        },
      },
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    }),
  })

  try {
    registerPreloadRecovery()
    const failedPreload = () =>
      target.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))

    expect(failedPreload()).toBe(false)
    expect(failedPreload()).toBe(true)
    expect(reloads).toBe(1)
    retryPageLoad()
    expect(reloads).toBe(2)
    expect(failedPreload()).toBe(true)
    expect(reloads).toBe(2)
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
