import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { navigationQueryOptions } from './api'

/** Loads navigation after the current identity is established. */
export function useMenuRouters() {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const generation = useAuthStore((state) => state.sessionGeneration)

  return useQuery({
    ...navigationQueryOptions(generation),
    enabled: Boolean(
      user && (accessToken || import.meta.env.VITE_FEATURE_MOCK === 'true')
    ),
  })
}
