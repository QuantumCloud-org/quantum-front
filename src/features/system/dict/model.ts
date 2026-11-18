export type DictStatus = 0 | 1
export type DictDefaultFlag = 'Y' | 'N'

export type DictType = {
  id: string
  version: string
  business: string | null
  dictName: string
  dictType: string
  status: DictStatus
  remark: string | null
  createTime: string | null
}

export type DictData = {
  id: string
  version: string
  dictType: string
  dictLabel: string
  dictValue: string
  dictSort: number
  cssClass: string | null
  listClass: string | null
  isDefault: DictDefaultFlag
  status: DictStatus
  remark: string | null
  createTime: string | null
}

export type DictTypeListQuery = {
  dictName?: string
  dictType?: string
  status?: DictStatus
}

export type DictDataListQuery = {
  pageNum: number
  pageSize: number
  dictType: string
  dictLabel?: string
  status?: DictStatus
}

export type PagedResult<T> = {
  pageNum: number
  pageSize: number
  total: number
  pages: number
  records: T[]
}

export type DictTypeFormInput = {
  dictName: string
  dictType: string
  status: '0' | '1'
  remark: string
}

export type DictDataFormInput = {
  dictType: string
  dictLabel: string
  dictValue: string
  dictSort: string
  cssClass: string
  listClass: string
  isDefault: DictDefaultFlag
  status: '0' | '1'
  remark: string
}

function trimOrEmpty(value?: string | null) {
  return value?.trim() ?? ''
}

function toNullableText(value?: string | null) {
  const normalized = trimOrEmpty(value)
  return normalized === '' ? null : normalized
}

export function buildDictTypeFormDefaults(
  detail?: Partial<DictType>
): DictTypeFormInput {
  return {
    dictName: detail?.dictName ?? '',
    dictType: detail?.dictType ?? '',
    status: String(detail?.status ?? 1) as '0' | '1',
    remark: detail?.remark ?? '',
  }
}

export function buildDictDataFormDefaults(
  dictType: string,
  detail?: Partial<DictData>
): DictDataFormInput {
  return {
    dictType: detail?.dictType ?? dictType,
    dictLabel: detail?.dictLabel ?? '',
    dictValue: detail?.dictValue ?? '',
    dictSort: String(detail?.dictSort ?? 0),
    cssClass: detail?.cssClass ?? '',
    listClass: detail?.listClass ?? '',
    isDefault: detail?.isDefault ?? 'N',
    status: String(detail?.status ?? 1) as '0' | '1',
    remark: detail?.remark ?? '',
  }
}

/** Selects the writable fields for a dictionary type. */
export function buildDictTypePayload(
  input: DictTypeFormInput,
  business?: string | null
) {
  return {
    dictName: trimOrEmpty(input.dictName),
    ...(business != null ? { business } : {}),
    dictType: trimOrEmpty(input.dictType),
    status: Number(input.status) === 0 ? 0 : 1,
    remark: toNullableText(input.remark),
  }
}

/** Selects the writable fields for a dictionary item. */
export function buildDictDataPayload(input: DictDataFormInput) {
  return {
    dictType: trimOrEmpty(input.dictType),
    dictLabel: trimOrEmpty(input.dictLabel),
    dictValue: trimOrEmpty(input.dictValue),
    dictSort: Number(trimOrEmpty(input.dictSort) || '0'),
    cssClass: toNullableText(input.cssClass),
    listClass: toNullableText(input.listClass),
    isDefault: input.isDefault === 'Y' ? 'Y' : 'N',
    status: Number(input.status) === 0 ? 0 : 1,
    remark: toNullableText(input.remark),
  }
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return '未记录'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
