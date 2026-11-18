import { useEffect, useMemo, useState } from 'react'
import {
  type ColumnVisibilityState,
  type RowSelectionState,
  flexRender,
  useTable,
} from '@tanstack/react-table'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { serverTableFeatures } from '@/components/data-table/server-table-features'
import { roleStatuses } from '../data'
import { type Role } from '../model'
import {
  getRoleManagementAccess,
  isProtectedSystemRole,
} from '../role-management-access'
import { type RoleManagementSearchState } from '../search-schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { getRolesColumns } from './roles-columns'

const columnFiltersConfig = [
  { columnId: 'roleName', searchKey: 'roleName', type: 'string' },
  { columnId: 'roleKey', searchKey: 'roleKey', type: 'string' },
  { columnId: 'status', searchKey: 'status', type: 'array' },
] satisfies NonNullable<Parameters<typeof useTableUrlState>[0]['columnFilters']>

type RolesTableProps = {
  data: Role[]
  search: RoleManagementSearchState
  navigate: NavigateFn
  pageCount: number
  total: number
  isLoading: boolean
  isPageResolved: boolean
}

export function RolesTable({
  data,
  search,
  navigate,
  pageCount,
  total,
  isLoading,
  isPageResolved,
}: RolesTableProps) {
  const authUser = useAuthStore((state) => state.user)
  const { canBulkDeleteRoles, hasRowActions } =
    getRoleManagementAccess(authUser)
  const columns = useMemo(
    () =>
      getRolesColumns({
        enableBulkActions: canBulkDeleteRoles,
        enableRowActions: hasRowActions,
      }),
    [canBulkDeleteRoles, hasRowActions]
  )

  const selectionScope = JSON.stringify(search)
  const [selection, setSelection] = useState<{
    data: Role[]
    scope: string
    rows: RowSelectionState
  }>({ data, scope: selectionScope, rows: {} })
  const selectionIsCurrent =
    selection.data === data && selection.scope === selectionScope
  if (!selectionIsCurrent)
    setSelection({ data, scope: selectionScope, rows: {} })
  const rowSelection =
    selectionIsCurrent && isPageResolved ? selection.rows : {}

  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({})

  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: false },
    columnFilters: columnFiltersConfig,
  })

  const table = useTable({
    features: serverTableFeatures,
    data,
    columns,
    getRowId: (row) => row.id,
    state: {
      pagination,
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    manualPagination: true,
    manualFiltering: true,
    pageCount: Math.max(pageCount, 1),
    rowCount: total,
    enableRowSelection: (row) =>
      isPageResolved &&
      canBulkDeleteRoles &&
      !isProtectedSystemRole(row.original.id),
    onPaginationChange,
    onColumnFiltersChange,
    onRowSelectionChange: (update) => {
      if (!isPageResolved) return
      setSelection({
        data,
        scope: selectionScope,
        rows: typeof update === 'function' ? update(rowSelection) : update,
      })
    },
    onColumnVisibilityChange: setColumnVisibility,
  })

  useEffect(() => {
    if (isPageResolved)
      ensurePageInRange(Math.max(pageCount, 1), { resetTo: 'last' })
  }, [pageCount, ensurePageInRange, isPageResolved])

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4'
      )}
    >
      <DataTableToolbar
        table={table}
        searches={[
          {
            columnId: 'roleName',
            placeholder: '按角色名称检索...',
          },
          {
            columnId: 'roleKey',
            placeholder: '按角色标识检索...',
          },
        ]}
        filters={[
          {
            columnId: 'status',
            title: '状态',
            options: roleStatuses.map((status) => ({ ...status })),
          },
        ]}
      />
      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='group/row'>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.thClassName
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center text-muted-foreground'
                >
                  角色数据加载中...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='group/row'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  暂无结果。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
      {canBulkDeleteRoles && <DataTableBulkActions table={table} />}
    </div>
  )
}
