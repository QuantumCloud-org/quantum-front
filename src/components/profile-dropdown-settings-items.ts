import { CircleUserRound, KeyRound, type LucideIcon } from 'lucide-react'

export const profileDropdownSettingsItems: ReadonlyArray<{
  label: string
  to: '/settings' | '/settings/password'
  icon: LucideIcon
}> = [
  {
    label: '个人资料',
    to: '/settings',
    icon: CircleUserRound,
  },
  {
    label: '修改密码',
    to: '/settings/password',
    icon: KeyRound,
  },
] as const
