import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query-keys'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type ServerTableFeatures } from '@/components/data-table/server-table-features'
import { deleteUsers } from '../api'
import { type User } from '../data/schema'

type UserMultiDeleteDialogProps = {
  targets: { id: string; name: string }[] | null
  onOpenChange: (open: boolean) => void
  table: Table<ServerTableFeatures, User>
}

const CONFIRM_WORD = '删除'

export function UsersMultiDeleteDialog({
  targets,
  onOpenChange,
  table,
}: UserMultiDeleteDialogProps) {
  const [value, setValue] = useState('')
  const queryClient = useQueryClient()
  const selectedIds = new Set(
    table.getSelectedRowModel().rows.map((row) => row.id)
  )
  const validTargets = Boolean(
    targets?.length && targets.every(({ id }) => selectedIds.has(id))
  )

  const mutation = useMutation({
    mutationFn: deleteUsers,
    onSuccess: async (_, ids) => {
      toast.success(`已删除 ${ids.length} 个用户。`)
      onOpenChange(false)
      setValue('')
      table.resetRowSelection()
      await queryClient.invalidateQueries({
        queryKey: queryKeys.userList(),
      })
    },
  })

  const handleDelete = () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(`请输入“${CONFIRM_WORD}”以确认操作。`)
      return
    }

    if (!targets || !validTargets || mutation.isPending) return
    mutation.mutate(targets.map(({ id }) => id))
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValue('')
    }

    onOpenChange(nextOpen)
  }

  return (
    <ConfirmDialog
      open={targets !== null}
      onOpenChange={handleOpenChange}
      form='users-multi-delete-form'
      disabled={
        !validTargets || value.trim() !== CONFIRM_WORD || mutation.isPending
      }
      isLoading={mutation.isPending}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          删除 {targets?.length ?? 0} 个用户
        </span>
      }
      desc={
        <form
          id='users-multi-delete-form'
          onSubmit={(event) => {
            event.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            确认删除已选用户吗？
            <br />
            此操作无法撤销。
          </p>

          <p>{targets?.map(({ name, id }) => name || id).join('、')}</p>
          {!validTargets && <p>列表已更新，请关闭后重新选择。</p>}

          <Label className='my-4 flex flex-col items-start gap-1.5'>
            <span>请输入“{CONFIRM_WORD}”确认：</span>
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={`请输入“${CONFIRM_WORD}”进行确认`}
              autoFocus
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>警告</AlertTitle>
            <AlertDescription>
              请谨慎操作，此步骤执行后无法回滚。
            </AlertDescription>
          </Alert>
        </form>
      }
      confirmText='删除'
      destructive
    />
  )
}
