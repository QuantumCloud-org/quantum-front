import { getRecord, toNullableString } from '@/lib/api-normalize'
import { toId } from '@/lib/ids'

export type LoginLog = {
  infoId: string
  username: string
  ipaddr: string
  loginLocation: string | null
  browser: string | null
  os: string | null
  status: 0 | 1
  msg: string | null
  loginTime: string | null
}

export type LoginLogQuery = {
  pageNum: number
  pageSize: number
  username?: string
  ipaddr?: string
  status?: number
  beginTime?: string
  endTime?: string
}

export type LoginLogPage = {
  pageNum: number
  pageSize: number
  total: number
  pages: number
  records: LoginLog[]
}

export function normalizeLoginLog(input: unknown): LoginLog {
  const record = getRecord(input)
  return {
    infoId: toId(record.infoId ?? record.id),
    username: String(record.username ?? ''),
    ipaddr: String(record.ipaddr ?? ''),
    loginLocation: toNullableString(record.loginLocation),
    browser: toNullableString(record.browser),
    os: toNullableString(record.os),
    status: Number(record.status) === 1 ? 1 : 0,
    msg: toNullableString(record.msg),
    loginTime: toNullableString(record.loginTime),
  }
}

export function formatDateTime(value: string | null) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 19)
}
