import type { AuthUser } from '@/types/auth'
import { create } from 'zustand'
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware'
import { stripBearerPrefix } from '@/lib/auth-token'

const AUTH_STORAGE_KEY = 'talent_manager_auth'

type PersistedAuthState = {
  deviceId: string
}

type AuthState = PersistedAuthState & {
  accessToken: string
  sessionId: string
  user: AuthUser | null
  sessionGeneration: number
  setAccessToken: (token: string, sessionId: string) => void
  setUser: (user: AuthUser) => void
  ensureDeviceId: () => string
  reset: () => void
}

const browserStorage: StateStorage = {
  getItem: (name) =>
    typeof window !== 'undefined' ? window.localStorage.getItem(name) : null,
  setItem: (name, value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(name, value)
    }
  },
  removeItem: (name) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(name)
    }
  },
}

function createDeviceId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function readDeviceId(state: unknown) {
  if (
    state &&
    typeof state === 'object' &&
    'deviceId' in state &&
    typeof state.deviceId === 'string'
  ) {
    return state.deviceId
  }
  return ''
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      deviceId: '',
      accessToken: '',
      sessionId: '',
      user: null,
      sessionGeneration: 0,
      setAccessToken: (token, sessionId) =>
        set({ accessToken: stripBearerPrefix(token), sessionId }),
      setUser: (user) => set({ user }),
      ensureDeviceId: () => {
        const existingDeviceId = get().deviceId
        if (existingDeviceId) return existingDeviceId

        const nextDeviceId = createDeviceId()
        set({ deviceId: nextDeviceId })
        return nextDeviceId
      },
      reset: () =>
        set((state) => ({
          accessToken: '',
          sessionId: '',
          user: null,
          sessionGeneration: state.sessionGeneration + 1,
        })),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => browserStorage),
      version: 1,
      migrate: (stored) => ({ deviceId: readDeviceId(stored) }),
      merge: (stored, state) => ({
        ...state,
        deviceId: readDeviceId(stored) || state.deviceId,
      }),
      partialize: (state) => ({ deviceId: state.deviceId }),
    }
  )
)
