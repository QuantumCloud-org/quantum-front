import type { ApiResult } from '@/types/api'
import { getRecord } from '@/lib/api-normalize'
import { apiClient } from '@/lib/http'
import { toId } from '@/lib/ids'
import {
  buildMenuCreatePayload,
  buildMenuUpdatePayload,
  dedupeMenuTreeRoots,
  type BoolFlag,
  type MenuDetail,
  type MenuEditTarget,
  type MenuFormInput,
  type MenuListQuery,
  type MenuStatus,
  type MenuTreeNode,
  type MenuType,
} from './model'

function normalizeMenuType(value: unknown): MenuType {
  if (value === 'C' || value === 'F') {
    return value
  }

  return 'M'
}

function normalizeBoolFlag(value: unknown, fallback: BoolFlag): BoolFlag {
  return Number(value) === 0 ? 0 : Number(value) === 1 ? 1 : fallback
}

function normalizeStatus(value: unknown): MenuStatus {
  return Number(value) === 0 ? 0 : 1
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized === '' ? null : normalized
}

function normalizeMenuNode(input: unknown): MenuTreeNode {
  const record = getRecord(input)
  const children = Array.isArray(record.children)
    ? record.children.map(normalizeMenuNode)
    : []

  return {
    menuId: toId(record.menuId ?? record.id) || '0',
    version: toId(record.version),
    parentId: toId(record.parentId) || '0',
    menuName: String(record.menuName ?? record.label ?? ''),
    orderNum: Number(record.orderNum ?? 0),
    path: normalizeNullableText(record.path),
    component: normalizeNullableText(record.component),
    queryParam: normalizeNullableText(record.queryParam),
    isFrame: normalizeBoolFlag(record.isFrame, 1),
    isCache: normalizeBoolFlag(record.isCache, 0),
    menuType: normalizeMenuType(record.menuType),
    visible: normalizeBoolFlag(record.visible, 1),
    perms: normalizeNullableText(record.perms),
    icon: normalizeNullableText(record.icon),
    status: normalizeStatus(record.status),
    remark: normalizeNullableText(record.remark),
    createTime:
      typeof record.createTime === 'string' ? record.createTime : null,
    children,
  }
}

export async function fetchMenuTree(search?: Partial<MenuListQuery>) {
  const response = await apiClient.get<ApiResult<unknown[]>>(
    '/system/menu/list',
    {
      params: {
        menuName: search?.menuName?.trim() || undefined,
        status: search?.status,
      },
    }
  )

  return dedupeMenuTreeRoots(response.data.data.map(normalizeMenuNode))
}

export async function fetchMenuDetail(menuId: string) {
  const response = await apiClient.get<ApiResult<unknown>>(
    `/system/menu/${menuId}`
  )

  return normalizeMenuNode(response.data.data) as MenuDetail
}

export async function createMenu(input: MenuFormInput) {
  const response = await apiClient.post<ApiResult<string | number | null>>(
    '/system/menu',
    buildMenuCreatePayload(input)
  )

  const data = response.data.data
  return toId(data)
}

export async function updateMenu(input: MenuFormInput, target: MenuEditTarget) {
  const response = await apiClient.put<ApiResult<null>>(
    '/system/menu',
    buildMenuUpdatePayload(input, target)
  )

  return response.data.data
}

export async function deleteMenu(menuId: string) {
  const response = await apiClient.delete<ApiResult<null>>(
    `/system/menu/${menuId}`
  )

  return response.data.data
}
