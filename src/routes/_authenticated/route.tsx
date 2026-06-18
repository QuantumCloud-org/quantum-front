import { isAxiosError } from 'axios'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { bootstrapAuthSession } from '@/app/auth/session'
import { navigationQueryOptions } from '@/app/navigation/api'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

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

    if (!authState.accessToken || !authState.user) {
      try {
        await bootstrapAuthSession()
      } catch (error) {
        const status = isAxiosError(error) ? error.response?.status : undefined

        if (status === 401) {
          throw redirect({
            to: '/sign-in',
            search: { redirect: location.href },
          })
        }

        if (status === 403) {
          throw redirect({
            to: '/403',
            search: {
              redirect: location.href,
              message: getErrorMessage(error) || '账号已被禁用',
            },
          })
        }

        throw error
      }
    }

    await context.queryClient.ensureQueryData(navigationQueryOptions())
  },
  component: AuthenticatedLayout,
})
