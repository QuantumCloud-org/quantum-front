import { Suspense } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { ensureRouteAccess } from '@/app/auth/access'
import { navigationQueryOptions } from '@/app/navigation/api'
import { getBackendPageByPath } from '@/app/navigation/page-registry'
import { findBackendRouteByPath } from '@/app/navigation/registry'
import { dynamicPageSearchSchema } from '@/app/navigation/search-schema'
import { useAuthStore } from '@/stores/auth-store'
import { Skeleton } from '@/components/ui/skeleton'
import { GeneralError } from '@/features/errors/general-error'

export const Route = createFileRoute('/_authenticated/$section/$page')({
  validateSearch: dynamicPageSearchSchema,
  beforeLoad: async ({ context, location }) => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/'
    const pageDefinition = getBackendPageByPath(pathname)

    if (!pageDefinition) {
      throw redirect({ to: '/404' })
    }

    const routers = await context.queryClient.ensureQueryData(
      navigationQueryOptions(useAuthStore.getState().sessionGeneration)
    )

    const backendRoute = findBackendRouteByPath(routers, pathname)
    if (!backendRoute) {
      throw redirect({
        to: '/403',
        search: { redirect: location.href },
      })
    }

    if (backendRoute.router.component !== pageDefinition.backendComponent) {
      throw redirect({ to: '/404' })
    }

    ensureRouteAccess({
      locationHref: location.href,
      permissions: backendRoute.router.meta?.permission
        ? [backendRoute.router.meta.permission]
        : [],
      roles: backendRoute.router.meta?.roles ?? [],
    })
  },
  component: RouteComponent,
  errorComponent: ({ reset }) => <GeneralError minimal reset={reset} />,
})

// eslint-disable-next-line react-refresh/only-export-components
function RouteComponent() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { section, page } = Route.useParams()
  const pathname = `/${section}/${page}`.replace(/\/+$/, '') || '/'
  const pageDefinition = getBackendPageByPath(pathname)

  if (!pageDefinition) {
    return null
  }

  return (
    <Suspense fallback={<BackendPageFallback />}>
      {pageDefinition.render({
        navigate: (options) => {
          void navigate(options)
        },
        search,
      })}
    </Suspense>
  )
}

// Shown while a lazily-loaded page chunk arrives. Mirrors the common shape of
// these pages (heading, toolbar, table) so the layout does not jump on swap.
// eslint-disable-next-line react-refresh/only-export-components
function BackendPageFallback() {
  return (
    <div className='space-y-4 p-4'>
      <Skeleton className='h-8 w-48' />
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-64 w-full' />
    </div>
  )
}
