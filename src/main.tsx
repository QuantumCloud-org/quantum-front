import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import {
  bootstrapAuthSession,
  setSessionCacheClearer,
} from '@/app/auth/session'
import { AppProviders, createAppQueryClient } from '@/app/providers'
import { createAppRouter } from '@/app/router'
import { APP_TITLE } from '@/config/app'
import {
  registerAuthSessionSync,
  setAuthFailureHandler,
} from '@/lib/auth-session-channel'
import { registerPreloadRecovery } from '@/lib/preload-recovery'
import { sanitizeRedirect } from '@/lib/sanitize-redirect'
import './styles/index.css'

registerPreloadRecovery()

let router: ReturnType<typeof createAppRouter> | null = null
const queryClient = createAppQueryClient(() => router)
const appRouter = createAppRouter(queryClient)
router = appRouter

setSessionCacheClearer(() => queryClient.clear())
setAuthFailureHandler(() => {
  queryClient.clear()
  const location = appRouter.history.location
  if (location.pathname === '/sign-in') return
  const redirect = sanitizeRedirect(location.href)
  void appRouter.navigate({
    to: '/sign-in',
    search: { redirect },
    replace: true,
  })
})

registerAuthSessionSync()

// Public pages can render immediately. Protected routes await the same attempt.
void bootstrapAuthSession().catch(() => undefined)

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  document.title = APP_TITLE
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <AppProviders queryClient={queryClient}>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>
  )
}
