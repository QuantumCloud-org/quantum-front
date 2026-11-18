import { expect, test } from 'bun:test'
import { useAuthStore } from './auth-store'

test('migrates legacy persisted user data and keeps only the device ID', async () => {
  const storageKey = 'talent_manager_auth'
  const oldStorage = new Map([
    [
      storageKey,
      JSON.stringify({
        version: 0,
        state: {
          deviceId: 'test-device',
          user: { id: '1', phone: 'test-phone' },
        },
      }),
    ],
  ])
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const previous = useAuthStore.getState()

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => oldStorage.get(key) ?? null,
        setItem: (key: string, value: string) => oldStorage.set(key, value),
        removeItem: (key: string) => oldStorage.delete(key),
      },
    },
  })

  try {
    await useAuthStore.persist.rehydrate()
    expect(useAuthStore.getState().deviceId).toBe('test-device')
    expect(useAuthStore.getState().user).toBeNull()
    expect(oldStorage.get(storageKey)).toBe(
      JSON.stringify({ state: { deviceId: 'test-device' }, version: 1 })
    )
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor)
    else Reflect.deleteProperty(globalThis, 'window')
    useAuthStore.setState(previous)
  }
})
