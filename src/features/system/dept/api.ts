import { queryOptions } from '@tanstack/react-query'
import type { ApiResult } from '@/types/api'
import { getRecord } from '@/lib/api-normalize'
import { apiClient } from '@/lib/http'
import { toId } from '@/lib/ids'
import { queryKeys } from '@/lib/query-keys'
import {
  buildDeptCreatePayload,
  buildDeptListQuery,
  buildDeptUpdatePayload,
  dedupeDeptTreeRoots,
  type DeptDetail,
  type DeptEditTarget,
  type DeptFormInput,
  type DeptListSearch,
  type DeptTreeNode,
} from './model'

function normalizeDeptTreeNode(input: unknown): DeptTreeNode {
  const record = getRecord(input)
  const children = Array.isArray(record.children)
    ? record.children.map(normalizeDeptTreeNode)
    : []
  const deptId = toId(record.deptId ?? record.id) || '0'
  const parentId = toId(record.parentId) || '0'

  return {
    deptId,
    version: toId(record.version),
    parentId,
    deptName: String(record.deptName ?? record.label ?? ''),
    orderNum:
      record.orderNum === null || record.orderNum === undefined
        ? null
        : Number(record.orderNum),
    leader: typeof record.leader === 'string' ? record.leader : null,
    phone: typeof record.phone === 'string' ? record.phone : null,
    email: typeof record.email === 'string' ? record.email : null,
    status: Number(record.status ?? 1) === 0 ? 0 : 1,
    createTime:
      typeof record.createTime === 'string' ? record.createTime : null,
    children,
  }
}

type DeptSelectNode = { id: string; label: string; children: DeptSelectNode[] }

function normalizeDeptSelectNode(
  input: unknown,
  seen: Set<string>
): DeptSelectNode[] {
  const record = getRecord(input)
  const deptId = toId(record.id ?? record.deptId)
  const childrenSource = Array.isArray(record.children) ? record.children : []

  if (!deptId || deptId === '0') {
    return childrenSource.flatMap((child) =>
      normalizeDeptSelectNode(child, seen)
    )
  }

  if (seen.has(deptId)) {
    return []
  }

  seen.add(deptId)

  return [
    {
      id: deptId,
      label: String(record.label ?? record.deptName ?? ''),
      children: childrenSource.flatMap((child) =>
        normalizeDeptSelectNode(child, seen)
      ),
    },
  ]
}

async function fetchDeptTreeSelect(signal: AbortSignal) {
  const response = await apiClient.get<ApiResult<unknown[]>>(
    '/system/dept/treeselect',
    { signal }
  )

  const seen = new Set<string>()
  return response.data.data.flatMap((node) =>
    normalizeDeptSelectNode(node, seen)
  )
}

/** Defines the department picker query shared by user and role forms. */
export function deptTreeSelectQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.deptTreeSelect(),
    queryFn: ({ signal }) => fetchDeptTreeSelect(signal),
    staleTime: 60_000,
  })
}

export async function fetchDeptList(search?: Partial<DeptListSearch>) {
  const response = await apiClient.get<ApiResult<DeptTreeNode[]>>(
    '/system/dept/list',
    {
      params: buildDeptListQuery(search),
    }
  )

  return dedupeDeptTreeRoots(response.data.data.map(normalizeDeptTreeNode))
}

export async function fetchDeptDetail(deptId: string) {
  const response = await apiClient.get<ApiResult<DeptDetail>>(
    `/system/dept/${deptId}`
  )

  return normalizeDeptTreeNode(response.data.data)
}

export async function createDept(input: DeptFormInput) {
  const response = await apiClient.post<ApiResult<string | number>>(
    '/system/dept',
    buildDeptCreatePayload(input)
  )

  return toId(response.data.data)
}

export async function updateDept(input: DeptFormInput, target: DeptEditTarget) {
  const response = await apiClient.put<ApiResult<null>>(
    '/system/dept',
    buildDeptUpdatePayload(input, target)
  )

  return response.data.data
}

export async function deleteDept(id: string) {
  const response = await apiClient.delete<ApiResult<null>>(`/system/dept/${id}`)

  return response.data.data
}
