import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { navigationQueryOptions } from './api'
import { buildNavigationGroups, buildNavigationUser } from './registry'

export function useNavigation() {
  const user = useAuthStore((state) => state.user)
  const menuQuery = useQuery({
    ...navigationQueryOptions(),
    enabled: Boolean(user),
  })

  return {
    user: buildNavigationUser(user),
    menuRouters: menuQuery.data,
    navGroups: buildNavigationGroups(user, menuQuery.data),
    menuQuery,
  }
}
