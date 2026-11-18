import { isAxiosError, isCancel } from 'axios'
import { QueryCache, QueryClient } from '@tanstack/react-query'
import type { AppRouter } from '@/app/router'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'

type GetRouter = () => AppRouter | null

export function createAppQueryClient(getRouter: GetRouter) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (isCancel(error) || import.meta.env.DEV || failureCount > 3)
            return false
          const status = isAxiosError(error)
            ? error.response?.status
            : undefined
          return status !== 401 && status !== 403
        },
        refetchOnWindowFocus: import.meta.env.PROD,
        staleTime: 10_000,
      },
      mutations: {
        onError: (error) => {
          if (isAxiosError(error) && error.response?.status === 304) {
            toast.error('内容未修改。')
            return
          }
          handleServerError(error)
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (!isAxiosError(error) || error.response?.status !== 500) return
        toast.error('服务器内部错误。')
        const router = getRouter()
        if (import.meta.env.PROD && router) void router.navigate({ to: '/500' })
      },
    }),
  })
}
