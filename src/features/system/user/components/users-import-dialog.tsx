import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResult } from '@/types/api'
import { queryKeys } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  importUsers,
  USER_IMPORT_LIMIT,
  type UserImportRow,
} from '../transfer-api'

export function UsersImportResults({ rows }: { rows: UserImportRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>行号</TableHead>
          <TableHead>用户名</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>消息</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ row, username, success, message }) => (
          <TableRow key={row}>
            <TableCell>{row}</TableCell>
            <TableCell>{username || '—'}</TableCell>
            <TableCell>{success ? '成功' : '失败'}</TableCell>
            <TableCell className='break-all whitespace-pre-wrap'>
              {message}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function UsersImportDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File>()
  const [updateSupport, setUpdateSupport] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const mutation = useMutation({
    mutationFn: (spreadsheet: File) => importUsers(spreadsheet, updateSupport),
    onSuccess: async (rows) => {
      if (rows.length > 0 && rows.every((row) => row.success)) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.userList() })
      }
    },
    onError: (error) => {
      const serverMessage = isAxiosError<ApiResult<unknown>>(error)
        ? error.response?.data?.message
        : error.message
      setErrorMessage(serverMessage || '导入失败，请检查文件后重试。')
    },
  })

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>导入用户</DialogTitle>
          <DialogDescription>
            支持 Excel，每次最多导入 {USER_IMPORT_LIMIT.toLocaleString('en-US')}{' '}
            行数据。
          </DialogDescription>
        </DialogHeader>
        <form
          id='import-users-form'
          className='space-y-4'
          onSubmit={(event) => {
            event.preventDefault()
            if (!file || mutation.isPending) return
            setErrorMessage('')
            mutation.mutate(file)
          }}
        >
          <div className='space-y-2'>
            <Label htmlFor='users-import-file'>Excel 文件</Label>
            <Input
              id='users-import-file'
              type='file'
              accept='.xlsx,.xls'
              disabled={mutation.isPending}
              onChange={(event) => {
                setFile(event.target.files?.[0])
                setErrorMessage('')
                mutation.reset()
              }}
            />
          </div>
          <Label className='flex items-center gap-2'>
            <Checkbox
              checked={updateSupport}
              disabled={mutation.isPending}
              onCheckedChange={(value) => setUpdateSupport(value === true)}
            />
            更新已存在的用户
          </Label>
        </form>
        {errorMessage && (
          <p role='alert' className='text-sm text-destructive'>
            {errorMessage}
          </p>
        )}
        {mutation.data && (
          <div className='min-w-0 space-y-2'>
            <p role='status' className='text-sm'>
              {mutation.data.some((row) => !row.success)
                ? '导入失败，本批数据已全部回滚。'
                : `导入完成，共 ${mutation.data.length} 行。`}
            </p>
            <div className='max-h-64 overflow-auto rounded-md border'>
              <UsersImportResults rows={mutation.data} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            disabled={mutation.isPending}
          >
            关闭
          </Button>
          <Button
            type='submit'
            form='import-users-form'
            disabled={!file || mutation.isPending}
          >
            {mutation.isPending ? '导入中…' : '开始导入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
