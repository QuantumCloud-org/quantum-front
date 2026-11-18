import type { ApiResult } from '@/types/api'
import { apiClient } from '@/lib/http'
import {
  type SysFile,
  type SysFileQuery,
  type SysFilePage,
  normalizeSysFile,
} from './model'

export async function fetchFilePage(query: SysFileQuery): Promise<SysFilePage> {
  const response = await apiClient.get<ApiResult<Record<string, unknown>>>(
    '/system/file/list',
    {
      params: {
        pageNum: query.pageNum,
        pageSize: query.pageSize,
        originalName: query.originalName?.trim() || undefined,
        extension: query.extension?.trim() || undefined,
        bizType: query.bizType?.trim() || undefined,
        uploadBy: query.uploadBy?.trim() || undefined,
        beginTime: query.beginTime || undefined,
        endTime: query.endTime || undefined,
      },
    }
  )

  const page = response.data.data
  const records = Array.isArray(page.records) ? page.records : []

  return {
    pageNum: Number(page.pageNum ?? 1),
    pageSize: Number(page.pageSize ?? 10),
    total: Number(page.total ?? 0),
    pages: Number(page.pages ?? 0),
    records: records.map(normalizeSysFile),
  }
}

export type UploadFileParams = {
  file: File
  bizType?: string
  bizId?: string
  path?: string
  onProgress?: (percent: number) => void
}

export async function uploadFile(params: UploadFileParams): Promise<SysFile> {
  const form = new FormData()
  form.append('file', params.file)
  if (params.bizType) form.append('bizType', params.bizType)
  if (params.bizId) form.append('bizId', params.bizId)
  if (params.path) form.append('path', params.path)

  const response = await apiClient.post<ApiResult<unknown>>(
    '/system/file/upload',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!params.onProgress || !event.total) return
        params.onProgress(Math.round((event.loaded * 100) / event.total))
      },
    }
  )

  return normalizeSysFile(response.data.data)
}

export async function deleteFiles(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const response = await apiClient.delete<ApiResult<number>>(
    `/system/file/${ids.join(',')}`
  )
  return Number(response.data.data ?? 0)
}

export async function fetchBlob(
  id: string,
  endpoint: 'download' | 'preview' = 'download'
): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/system/file/${endpoint}/${id}`, {
    responseType: 'blob',
  })
  return response.data
}
