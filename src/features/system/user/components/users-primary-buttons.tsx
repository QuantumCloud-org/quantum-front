import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import type { UserManagementSearch } from '../model'
import { exportUsers, USER_EXPORT_LIMIT } from '../transfer-api'
import { getUserManagementAccess } from '../user-management-access'
import { UsersImportDialog } from './users-import-dialog'
import { useUsers } from './users-provider'

export function UsersPrimaryButtons({
  search,
}: {
  search: Partial<UserManagementSearch>
}) {
  const { setOpen } = useUsers()
  const authUser = useAuthStore((state) => state.user)
  const { canCreateUsers, canImportUsers, canExportUsers } =
    getUserManagementAccess(authUser)
  const [importOpen, setImportOpen] = useState(false)
  const exportMutation = useMutation({
    mutationFn: exportUsers,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '用户列表.xlsx'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    },
    onError: (error) => toast.error(error.message || '导出失败，请稍后重试。'),
  })

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {canImportUsers && (
        <Button variant='outline' onClick={() => setImportOpen(true)}>
          导入用户
        </Button>
      )}
      {canExportUsers && (
        <Button
          variant='outline'
          disabled={exportMutation.isPending}
          onClick={() => exportMutation.mutate(search)}
        >
          {exportMutation.isPending
            ? '导出中…'
            : `导出用户（最多 ${USER_EXPORT_LIMIT.toLocaleString('en-US')} 行）`}
        </Button>
      )}
      {canCreateUsers && (
        <Button className='space-x-1' onClick={() => setOpen('add')}>
          <span>新建用户</span> <UserPlus size={18} />
        </Button>
      )}
      {canImportUsers && importOpen && (
        <UsersImportDialog onClose={() => setImportOpen(false)} />
      )}
    </div>
  )
}
