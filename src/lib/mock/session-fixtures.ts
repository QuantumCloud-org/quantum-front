import { isSupportedBackendComponent } from '@/app/navigation/page-registry'
import type { AuthUser } from '@/types/auth'
import type { BackendMenuRouter } from '@/app/navigation/types'

/**
 * Session + menu fixtures for the local demo (`VITE_FEATURE_MOCK=true`).
 *
 * PAIRING CONTRACT: these fixtures are paired with whatever entity is currently
 * being demoed. The `MOCK_MENU_ROUTERS` leaf `component` must resolve in
 * page-registry.tsx AND its `meta.permission` must be held by `MOCK_DEMO_USER`,
 * otherwise the dynamic route's `beforeLoad` 404s (component not in registry) or
 * 403s (permission missing). When the paired entity module is rolled back — as
 * S4 did after verifying `system/asset` — this fixture points at a page that no
 * longer exists; `warnOnUnpairedMockRoutes()` surfaces that loudly at runtime.
 * To reuse this mock scaffolding for a new entity, regenerate the entity module
 * (scaffold-page-gen, with its own api.ts USE_MOCK short-circuit + mock.ts) and
 * update the three coupled points below in lockstep. See
 * docs/ai/convention-pack/conventions.md ("会话 / 导航层 mock").
 *
 * The demo user is deliberately NOT a super admin. `access.ts` short-circuits
 * `admin` role / `*:*:*` permission, which would blanket-pass every guard and
 * defeat the purpose of exercising the real permission branches (see
 * compound/2026-07-06-learning-templates-replicate-fixed-vulnerabilities). The
 * permission list is therefore explicit and scoped to exactly what the demoed
 * `system/asset` page needs — including `system:dept:treeselect` for the
 * associated department dropdown, so the "associated action requires its own
 * permission" branch is actually covered.
 */
export const MOCK_DEMO_USER: AuthUser = {
  id: '900001',
  username: 'demo.asset',
  nickname: '演示资产专员',
  email: 'demo.asset@example.com',
  deptName: '资产管理部',
  status: 1,
  roles: ['asset-operator'],
  permissions: [
    'system:asset:list',
    'system:asset:query',
    'system:asset:add',
    'system:asset:edit',
    'system:asset:remove',
    'system:dept:treeselect',
  ],
}

/**
 * Menu routers for the demo. The `asset` node's `component` must match the
 * `backendComponent` registered in page-registry.tsx exactly, and its
 * `meta.permission` must be one the demo user holds, or the dynamic route's
 * `beforeLoad` redirects to /403.
 */
export const MOCK_MENU_ROUTERS: BackendMenuRouter[] = [
  {
    name: 'System',
    path: '/system',
    component: undefined,
    meta: { title: '系统管理', icon: 'Settings' },
    children: [
      {
        name: 'Asset',
        path: 'asset',
        component: 'system/asset/index',
        meta: {
          title: '资产管理',
          icon: 'Package',
          permission: 'system:asset:list',
        },
      },
    ],
  },
]

/**
 * Collect the leaf `component` strings from a fixture menu tree.
 */
function collectRouteComponents(routers: BackendMenuRouter[]): string[] {
  return routers.flatMap((router) =>
    router.children?.length
      ? collectRouteComponents(router.children)
      : router.component
        ? [router.component]
        : []
  )
}

/**
 * Pure detector for the pairing contract: leaf `component`s in the fixture menu
 * that `isSupported` does not recognise (i.e. not registered in page-registry).
 *
 * Kept dependency-injected + pure so the orphan-detection logic — nested tree
 * traversal + predicate — is unit-testable without importing page-registry or
 * stubbing `console`. {@link warnOnUnpairedMockRoutes} wires it to the real
 * registry + a dedup guard + `console.warn`.
 *
 * @param routers - Fixture menu tree.
 * @param isSupported - Predicate telling whether a `component` resolves in page-registry.
 */
export function findUnpairedRouteComponents(
  routers: BackendMenuRouter[],
  isSupported: (component: string) => boolean
): string[] {
  return collectRouteComponents(routers).filter(
    (component) => !isSupported(component)
  )
}

// Components already warned about, so a repeated fetchMenuRouters (multiple
// route/nav consumers per navigation) doesn't spam the console.
const warnedOrphans = new Set<string>()

/**
 * Dev-only guard against the pairing contract silently breaking.
 *
 * When the paired entity module is rolled back, the fixture's `component` no
 * longer resolves in page-registry and the demo page 404s with no explanation.
 * Called from the mock branch of `fetchMenuRouters`, this warns loudly (once per
 * orphan component) so the next person driving the mock knows to regenerate the
 * paired entity or update this file, rather than debugging a blank 404.
 */
export function warnOnUnpairedMockRoutes(): void {
  const orphans = findUnpairedRouteComponents(
    MOCK_MENU_ROUTERS,
    isSupportedBackendComponent
  ).filter((component) => !warnedOrphans.has(component))

  if (orphans.length > 0) {
    orphans.forEach((component) => warnedOrphans.add(component))
    // Intentional dev-only diagnostic: mock runs only in local dev, and a silent
    // 404 is exactly the failure mode this guard exists to surface.
    // eslint-disable-next-line no-console
    console.warn(
      `[mock] menu fixture references component(s) not registered in ` +
        `page-registry: ${orphans.join(', ')}. The paired entity module was ` +
        `likely rolled back — regenerate it (scaffold-page-gen) or update ` +
        `src/lib/mock/session-fixtures.ts. The demo page will 404 until then.`
    )
  }
}
