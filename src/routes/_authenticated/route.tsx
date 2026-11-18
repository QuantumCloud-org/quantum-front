import { isAxiosError } from 'axios'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { bootstrapAuthSession } from '@/app/auth/session'
import { navigationQueryOptions } from '@/app/navigation/api'
import { useAuthStore } from '@/stores/auth-store'
import { SessionClosedError } from '@/lib/http'
import { sanitizeRedirect } from '@/lib/sanitize-redirect'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

function getErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return undefined
  }

  const payload = error.response?.data
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return undefined
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const authState = useAuthStore.getState()

    if (!authState.user) {
      try {
        await bootstrapAuthSession()
      } catch (error) {
        const status = isAxiosError(error) ? error.response?.status : undefined

        if (status === 401 || error instanceof SessionClosedError) {
          throw redirect({
            to: '/sign-in',
            search: { redirect: sanitizeRedirect(location.href) },
          })
        }

        if (status === 403) {
          throw redirect({
            to: '/403',
            search: {
              redirect: sanitizeRedirect(location.href),
              message: getErrorMessage(error) || '账号已被禁用',
            },
          })
        }

        throw error
      }
    }

    await context.queryClient.ensureQueryData(
      navigationQueryOptions(useAuthStore.getState().sessionGeneration)
    )
  },
  component: AuthenticatedLayout,
})
