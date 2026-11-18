import { isAxiosError } from 'axios'
import type { ApiResult } from '@/types/api'
import { getRecord } from '@/lib/api-normalize'
import { apiClient } from '@/lib/http'
import { toId } from '@/lib/ids'
import {
  buildDictDataPayload,
  buildDictTypePayload,
  type DictData,
  type DictDataFormInput,
  type DictDataListQuery,
  type DictDefaultFlag,
  type DictStatus,
  type DictType,
  type DictTypeFormInput,
  type DictTypeListQuery,
  type PagedResult,
} from './model'

function toNullableText(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized === '' ? null : normalized
}

function normalizeStatus(value: unknown): DictStatus {
  return Number(value) === 0 ? 0 : 1
}

function normalizeDefaultFlag(value: unknown): DictDefaultFlag {
  return value === 'Y' ? 'Y' : 'N'
}

function normalizeDictType(input: unknown): DictType {
  const record = getRecord(input)
  return {
    id: toId(record.id),
    version: toId(record.version),
    dictName: String(record.dictName ?? ''),
    business: toNullableText(record.business),
    dictType: String(record.dictType ?? ''),
    status: normalizeStatus(record.status),
    remark: toNullableText(record.remark),
    createTime: toNullableText(record.createTime),
  }
}

function normalizeDictData(input: unknown): DictData {
  const record = getRecord(input)
  return {
    id: toId(record.id),
    version: toId(record.version),
    dictType: String(record.dictType ?? ''),
    dictLabel: String(record.dictLabel ?? ''),
    dictValue: String(record.dictValue ?? ''),
    dictSort: Number(record.dictSort ?? 0),
    cssClass: toNullableText(record.cssClass),
    listClass: toNullableText(record.listClass),
    isDefault: normalizeDefaultFlag(record.isDefault),
    status: normalizeStatus(record.status),
    remark: toNullableText(record.remark),
    createTime: toNullableText(record.createTime),
  }
}

export async function fetchDictTypePage(query?: Partial<DictTypeListQuery>) {
  const response = await apiClient.get<ApiResult<PagedResult<unknown>>>(
    '/system/dict/type/list',
    {
      params: {
        pageNum: 1,
        pageSize: 2000,
        dictName: query?.dictName?.trim() || undefined,
        dictType: query?.dictType?.trim() || undefined,
        status: query?.status,
      },
    }
  )

  const page = response.data.data
  return {
    pageNum: Number(page.pageNum ?? 1),
    pageSize: Number(page.pageSize ?? 2000),
    total: Number(page.total ?? 0),
    pages: Number(page.pages ?? 0),
    records: (page.records ?? []).map(normalizeDictType),
  } satisfies PagedResult<DictType>
}

export async function createDictType(input: DictTypeFormInput) {
  const response = await apiClient.post<ApiResult<number | string>>(
    '/system/dict/type',
    buildDictTypePayload(input)
  )

  return toId(response.data.data)
}

/** Updates a dictionary type using its original code and optimistic-lock version. */
export async function updateDictType({
  values,
  original,
}: {
  values: DictTypeFormInput
  original: Pick<DictType, 'id' | 'version' | 'dictType' | 'business'>
}) {
  const response = await apiClient.put<ApiResult<null>>('/system/dict/type', {
    ...buildDictTypePayload(
      { ...values, dictType: original.dictType },
      original.business
    ),
    ...dictUpdateIdentity(original),
  })

  return response.data.data
}

export async function deleteDictTypes(ids: string[]) {
  const response = await apiClient.delete<ApiResult<null>>(
    `/system/dict/type/${ids.join(',')}`
  )

  return response.data.data
}

export async function refreshDictCache() {
  const response = await apiClient.delete<ApiResult<null>>(
    '/system/dict/type/refreshCache'
  )

  return response.data.data
}

/** Loads one server page of dictionary items. */
export async function fetchDictDataPage(
  query: DictDataListQuery,
  signal?: AbortSignal
) {
  const response = await apiClient.get<ApiResult<PagedResult<unknown>>>(
    '/system/dict/data/list',
    {
      params: {
        pageNum: query.pageNum,
        pageSize: query.pageSize,
        dictType: query.dictType,
        dictLabel: query.dictLabel?.trim() || undefined,
        status: query.status,
      },
      signal,
    }
  )

  const page = response.data.data
  return {
    total: Number(page.total),
    records: page.records.map(normalizeDictData),
  }
}

export async function createDictData(input: DictDataFormInput) {
  const response = await apiClient.post<ApiResult<number | string>>(
    '/system/dict/data',
    buildDictDataPayload(input)
  )

  return toId(response.data.data)
}

/** Updates a dictionary item using its optimistic-lock version. */
export async function updateDictData({
  values,
  original,
}: {
  values: DictDataFormInput
  original: Pick<DictData, 'id' | 'version'>
}) {
  const response = await apiClient.put<ApiResult<null>>('/system/dict/data', {
    ...buildDictDataPayload(values),
    ...dictUpdateIdentity(original),
  })

  return response.data.data
}

export async function deleteDictData(ids: string[]) {
  const response = await apiClient.delete<ApiResult<null>>(
    `/system/dict/data/${ids.join(',')}`
  )

  return response.data.data
}

function dictUpdateIdentity(record: { id: string; version: string }) {
  const id = toId(record.id)
  const version = toId(record.version)
  if (!id || !version) throw new Error('字典记录缺少 ID 或版本，请刷新后重试。')
  return { id, version }
}

async function fetchDictDetail<T>(
  path: string,
  normalize: (data: unknown) => T
): Promise<T | null> {
  try {
    const response = await apiClient.get<ApiResult<unknown>>(path)
    return response.data.data == null ? null : normalize(response.data.data)
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

/** Returns the visible dictionary type, or null if it cannot be found. */
export function fetchDictTypeDetail(id: string) {
  return fetchDictDetail(`/system/dict/type/${id}`, normalizeDictType)
}

/** Returns the visible dictionary item, or null if it cannot be found. */
export function fetchDictDataDetail(id: string) {
  return fetchDictDetail(`/system/dict/data/${id}`, normalizeDictData)
}
