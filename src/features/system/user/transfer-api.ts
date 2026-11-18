import { z } from 'zod'
import { isAxiosError } from 'axios'
import type { ApiResult } from '@/types/api'
import { getRecord } from '@/lib/api-normalize'
import { apiClient } from '@/lib/http'
import { buildUserListQuery, type UserManagementSearch } from './model'

export const USER_IMPORT_LIMIT = 1_000
export const USER_EXPORT_LIMIT = 10_000

const importRowsSchema = z.array(
  z.object({
    row: z.number().int().positive(),
    username: z.string().nullish(),
    success: z.boolean(),
    message: z.string(),
  })
)

export type UserImportRow = z.infer<typeof importRowsSchema>[number]

function readImportRows(result?: ApiResult<unknown>) {
  if (!Array.isArray(result?.data)) return null
  return importRowsSchema.parse(result.data)
}

/** Uploads a spreadsheet and returns its row results, including validation failures. */
export async function importUsers(file: File, updateSupport: boolean) {
  const body = new FormData()
  body.append('file', file)
  body.append('updateSupport', String(updateSupport))

  try {
    const { data: result } = await apiClient.post<ApiResult<unknown>>(
      '/system/user/import',
      body,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    const rows = readImportRows(result)
    if (rows && (result.code === 200 || rows.some((row) => !row.success))) {
      return rows
    }
    throw new Error(result.message || '导入失败，请检查文件后重试。')
  } catch (error) {
    if (
      isAxiosError<ApiResult<unknown>>(error) &&
      error.response?.status === 400
    ) {
      const rows = readImportRows(error.response.data)
      if (rows?.some((row) => !row.success)) return rows
    }
    throw error
  }
}

async function throwExportError(blob: Blob): Promise<never> {
  const payload: unknown = await blob.text().then(JSON.parse)
  const { message } = getRecord(payload)
  throw new Error(
    typeof message === 'string' ? message : '导出失败，请稍后重试。'
  )
}

/** Downloads all matching users within the export limit, across list pages. */
export async function exportUsers(search: Partial<UserManagementSearch>) {
  const {
    pageNum: _pageNum,
    pageSize: _pageSize,
    ...params
  } = buildUserListQuery(search)
  const response = await apiClient
    .post<Blob>('/system/user/export', undefined, {
      params,
      responseType: 'blob',
    })
    .catch((error: unknown) => {
      const blob = isAxiosError<Blob>(error) ? error.response?.data : undefined
      if (blob instanceof Blob && blob.type.includes('json'))
        return throwExportError(blob)
      throw error
    })

  if (response.data.type.includes('json'))
    return throwExportError(response.data)
  return response.data
}
