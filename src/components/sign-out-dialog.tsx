import { useNavigate, useLocation } from '@tanstack/react-router'
import { logoutSession } from '@/app/auth/session'
import { sanitizeRedirect } from '@/lib/sanitize-redirect'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = () => {
    const currentPath = sanitizeRedirect(location.href)
    onOpenChange(false)

    void logoutSession().then((ended) => {
      if (!ended) return
      return navigate({
        to: '/sign-in',
        search: { redirect: currentPath },
        replace: true,
      })
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='退出登录'
      desc='确认退出当前账号吗？退出后需要重新登录才能继续访问系统。'
      confirmText='确认退出'
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
