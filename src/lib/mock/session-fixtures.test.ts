import { describe, expect, spyOn, test } from 'bun:test'
import {
  findUnpairedRouteComponents,
  warnOnUnpairedMockRoutes,
} from './session-fixtures'
import type { BackendMenuRouter } from '@/app/navigation/types'

// Pure orphan-detection logic (the core of the F2 pairing-contract guard):
// nested tree traversal + a "is this component registered" predicate.
describe('findUnpairedRouteComponents', () => {
  const supported = (component: string) => component === 'system/user/index'

  test('returns leaf components the predicate does not recognise', () => {
    const routers: BackendMenuRouter[] = [
      { name: 'Ghost', path: 'ghost', component: 'system/ghost/index' },
    ]
    expect(findUnpairedRouteComponents(routers, supported)).toEqual([
      'system/ghost/index',
    ])
  })

  test('traverses nested children and skips group nodes without a component', () => {
    const routers: BackendMenuRouter[] = [
      {
        name: 'System',
        path: '/system',
        component: undefined,
        children: [
          { name: 'User', path: 'user', component: 'system/user/index' }, // paired
          { name: 'Ghost', path: 'ghost', component: 'system/ghost/index' }, // orphan
        ],
      },
    ]
    expect(findUnpairedRouteComponents(routers, supported)).toEqual([
      'system/ghost/index',
    ])
  })

  test('returns [] when every leaf resolves', () => {
    const routers: BackendMenuRouter[] = [
      { name: 'User', path: 'user', component: 'system/user/index' },
    ]
    expect(findUnpairedRouteComponents(routers, supported)).toEqual([])
  })
})

describe('warnOnUnpairedMockRoutes', () => {
  test('warns once per orphan and dedups repeated calls', () => {
    const spy = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // The current fixtures reference the rolled-back `system/asset/index`, an
      // orphan (see the pairing contract in session-fixtures.ts). Three calls
      // must produce exactly one warn — the dedup Set suppresses the rest.
      warnOnUnpairedMockRoutes()
      warnOnUnpairedMockRoutes()
      warnOnUnpairedMockRoutes()

      expect(spy.mock.calls.length).toBe(1)
      expect(String(spy.mock.calls[0][0])).toContain('system/asset/index')
    } finally {
      spy.mockRestore()
    }
  })
})
