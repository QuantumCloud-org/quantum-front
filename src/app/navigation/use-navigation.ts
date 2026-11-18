import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { buildNavigationGroups, buildNavigationUser } from './registry'
import { useMenuRouters } from './use-menu-routers'

/** Builds the groups and account summary used by the sidebar and search. */
export function useNavigation() {
  const user = useAuthStore((state) => state.user)
  const { data: menuRouters } = useMenuRouters()
  const navGroups = useMemo(
    () => buildNavigationGroups(user, menuRouters),
    [user, menuRouters]
  )

  return { user: buildNavigationUser(user), navGroups }
}
