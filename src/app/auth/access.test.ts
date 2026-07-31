import type { AuthUser } from '@/types/auth'
import { afterEach, describe, expect, test } from 'bun:test'
import { useAuthStore } from '@/stores/auth-store'
import { ensureRouteAccess, hasAccess } from './access'

const OPERATOR: AuthUser = {
  id: '2',
  username: 'operator',
  nickname: '操作员',
  roles: ['operator'],
  permissions: ['system:user:list'],
}

function setUser(user: AuthUser | null) {
  useAuthStore.setState({ user })
}

afterEach(() => {
  setUser(null)
})

describe('ensureRouteAccess', () => {
  test('denies access when the session carries no user', () => {
    setUser(null)

    // Regression guard: an unauthenticated session must never satisfy a
    // permission-gated route. See fail-open trace in the 2026-07-31 audit.
    expect(() =>
      ensureRouteAccess({
        locationHref: '/system/user',
        permissions: ['system:user:list'],
      })
    ).toThrow()
  })

  test('redirects to sign-in preserving the attempted location', () => {
    setUser(null)

    try {
      ensureRouteAccess({
        locationHref: '/system/user',
        permissions: ['system:user:list'],
      })
      throw new Error('expected ensureRouteAccess to throw a redirect')
    } catch (thrown) {
      // @tanstack/react-router's redirect() nests its payload under `.options`.
      const { to, search } = (
        thrown as { options: { to?: string; search?: { redirect?: string } } }
      ).options

      expect(to).toBe('/sign-in')
      expect(search?.redirect).toBe('/system/user')
    }
  })

  test('allows a user holding the required permission', () => {
    setUser(OPERATOR)

    expect(() =>
      ensureRouteAccess({
        locationHref: '/system/user',
        permissions: ['system:user:list'],
      })
    ).not.toThrow()
  })

  test('sends a permitted user without the permission to 403', () => {
    setUser(OPERATOR)

    try {
      ensureRouteAccess({
        locationHref: '/system/role',
        permissions: ['system:role:list'],
      })
      throw new Error('expected ensureRouteAccess to throw a redirect')
    } catch (thrown) {
      expect((thrown as { options: { to?: string } }).options.to).toBe('/403')
    }
  })
})

describe('hasAccess', () => {
  test('denies a null user holding no session', () => {
    expect(hasAccess(null, { permissions: ['system:user:list'] })).toBe(false)
  })

  // An empty requirement means "this route declares no permission", which the
  // backend-driven nav (navigation/registry.ts matchesBackendAccess) relies on
  // to keep unrestricted menu entries visible. Kept as-is deliberately.
  test('treats an empty requirement as unrestricted', () => {
    expect(hasAccess(OPERATOR, { permissions: [], roles: [] })).toBe(true)
  })
})
