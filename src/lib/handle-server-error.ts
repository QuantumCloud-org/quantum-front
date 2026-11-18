import { AxiosError, isCancel } from 'axios'
import type { ApiResult } from '@/types/api'
import { toast } from 'sonner'

type ErrorPayload = ApiResult<unknown> & {
  title?: string
}

export function handleServerError(error: unknown) {
  if (isCancel(error)) return

  let errMsg = '操作失败，请稍后重试。'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = '未找到内容。'
  }

  if (error instanceof AxiosError) {
    const responseData = error.response?.data as ErrorPayload | undefined
    errMsg = responseData?.message || responseData?.title || errMsg
  }

  toast.error(errMsg)
}
