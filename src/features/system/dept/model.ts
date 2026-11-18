import { toId } from '@/lib/ids'

type DeptStatus = 0 | 1

export type DeptTreeNode = {
  deptId: string
  version: string
  parentId: string
  deptName: string
  orderNum: number | null
  leader: string | null
  phone: string | null
  email: string | null
  status: DeptStatus
  createTime: string | null
  children: DeptTreeNode[]
}

export type DeptDetail = DeptTreeNode

export type DeptListQuery = {
  deptName?: string
  status?: DeptStatus
}

export type DeptListSearch = {
  deptName?: string
  status?: DeptFilterStatus
}

export type DeptEditTarget = { id: string; version: string }

export type DeptFormInput = {
  parentId: string
  deptName: string
  orderNum: string
  leader: string
  phone: string
  email: string
  status: '0' | '1'
}

export type DeptFilterStatus = 'all' | 'active' | 'inactive'

export type DeptTreeViewItem = {
  id: string
  name: string
  type: 'folder' | 'file'
  children?: DeptTreeViewItem[]
}

function trimOrEmpty(value?: string | null) {
  return value?.trim() ?? ''
}

function toNullableText(value?: string | null) {
  const normalized = trimOrEmpty(value)
  return normalized === '' ? null : normalized
}

function toRequiredText(value?: string | null) {
  const normalized = trimOrEmpty(value)
  return normalized === '' ? '0' : normalized
}

function toBackendStatus(status?: DeptFilterStatus): DeptStatus | undefined {
  if (status === 'active') {
    return 1
  }

  if (status === 'inactive') {
    return 0
  }

  return undefined
}

export function buildDeptListQuery(
  search?: Partial<DeptListSearch>
): DeptListQuery {
  const deptName = trimOrEmpty(search?.deptName)
  const status = toBackendStatus(search?.status)

  return {
    deptName: deptName || undefined,
    status,
  }
}

export function buildDeptCreatePayload(input: DeptFormInput) {
  return {
    parentId: toRequiredText(input.parentId),
    deptName: trimOrEmpty(input.deptName),
    orderNum: Number(trimOrEmpty(input.orderNum) || '0'),
    leader: toNullableText(input.leader),
    phone: toNullableText(input.phone),
    email: toNullableText(input.email),
    status: Number(input.status),
  }
}

export function buildDeptUpdatePayload(input: DeptFormInput, target: DeptEditTarget) {
  const { phone, email, ...payload } = buildDeptCreatePayload(input)
  const id = toId(target.id)

  return {
    id,
    version: toId(target.version),
    ...payload,
    parentId: payload.parentId === id ? '0' : payload.parentId,
    phone: phone ?? undefined,
    email: email ?? undefined,
  }
}

export function buildDeptFormDefaults(
  detail?: Partial<DeptDetail>,
  parentId?: string
): DeptFormInput & { id: string | null; version: string | null } {
  const resolvedParentId = parentId ?? detail?.parentId ?? '0'
  const deptId = detail?.deptId

  return {
    id: detail?.deptId ?? null,
    version: detail?.version ?? null,
    parentId: deptId && resolvedParentId === deptId ? '0' : resolvedParentId,
    deptName: detail?.deptName ?? '',
    orderNum: String(detail?.orderNum ?? 0),
    leader: detail?.leader ?? '',
    phone: '',
    email: '',
    status: String(detail?.status ?? 1) as '0' | '1',
  }
}

export function findDeptById(
  nodes: DeptTreeNode[],
  deptId: string
): DeptTreeNode | undefined {
  for (const node of nodes) {
    if (node.deptId === deptId) {
      return node
    }

    const childMatch = findDeptById(node.children ?? [], deptId)
    if (childMatch) {
      return childMatch
    }
  }

  return undefined
}

export function findFirstDeptId(nodes: DeptTreeNode[]) {
  return nodes[0]?.deptId ?? null
}

export function filterDeptTree(
  nodes: DeptTreeNode[],
  keyword: string
): DeptTreeNode[] {
  const normalizedKeyword = trimOrEmpty(keyword).toLowerCase()

  if (!normalizedKeyword) {
    return nodes
  }

  return nodes.flatMap((node) => {
    const children = filterDeptTree(node.children ?? [], normalizedKeyword)
    const isMatch = node.deptName.toLowerCase().includes(normalizedKeyword)

    if (!isMatch && children.length === 0) {
      return []
    }

    return [{ ...node, children }]
  })
}

export function collectDeptBranchIds(
  nodes: DeptTreeNode[],
  deptId: string
): Set<string> {
  const target = findDeptById(nodes, deptId)

  if (!target) {
    return new Set()
  }

  const ids = new Set<string>()

  function visit(node: DeptTreeNode) {
    ids.add(node.deptId)
    ;(node.children ?? []).forEach(visit)
  }

  visit(target)
  return ids
}

export function dedupeDeptTreeRoots(nodes: DeptTreeNode[]) {
  const descendantIds = new Set<string>()

  function collectDescendants(children: DeptTreeNode[]) {
    for (const child of children) {
      descendantIds.add(child.deptId)
      collectDescendants(child.children ?? [])
    }
  }

  nodes.forEach((node) => collectDescendants(node.children ?? []))

  return nodes.filter((node) => !descendantIds.has(node.deptId))
}

export function buildDeptTreeViewItems(
  nodes: DeptTreeNode[]
): DeptTreeViewItem[] {
  return nodes.map((node) => {
    const children = buildDeptTreeViewItems(node.children ?? [])

    return {
      id: node.deptId,
      name: node.deptName,
      type: children.length > 0 ? 'folder' : 'file',
      children: children.length > 0 ? children : undefined,
    }
  })
}

export function getDeptRootLabel(nodes: DeptTreeNode[]) {
  return findDeptById(nodes, '0')?.deptName ?? '顶级部门'
}

function collectDeptAncestorIds(
  nodes: DeptTreeNode[],
  targetDeptId: string
): string[] {
  function visit(branch: DeptTreeNode[], ancestors: string[]): string[] | null {
    for (const node of branch) {
      if (node.deptId === targetDeptId) {
        return ancestors
      }

      const matched = visit(node.children ?? [], [...ancestors, node.deptId])
      if (matched) {
        return matched
      }
    }

    return null
  }

  return visit(nodes, []) ?? []
}

export function createDefaultExpandedDeptIds(nodes: DeptTreeNode[]) {
  return new Set(
    nodes
      .filter((node) => (node.children?.length ?? 0) > 0)
      .map((node) => node.deptId)
  )
}

export function ensureDeptPathExpanded(
  expandedIds: Set<string>,
  nodes: DeptTreeNode[],
  targetDeptId: string | null
) {
  if (!targetDeptId) {
    return new Set(expandedIds)
  }

  const next = new Set(expandedIds)
  collectDeptAncestorIds(nodes, targetDeptId).forEach((deptId) =>
    next.add(deptId)
  )
  return next
}
