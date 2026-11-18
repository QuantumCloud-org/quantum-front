import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { useAccess } from '@/app/auth/access'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { type ServerTableFeatures } from '@/components/data-table/server-table-features'
import { type Role } from '../model'
import { RolesMultiDeleteDialog } from './roles-multi-delete-dialog'

type DataTableBulkActionsProps = {
  table: Table<ServerTableFeatures, Role>
}

export function DataTableBulkActions({ table }: DataTableBulkActionsProps) {
  const [deleteTargets, setDeleteTargets] = useState<
    { id: string; name: string }[] | null
  >(null)
  const canDeleteRoles = useAccess({
    permissions: ['system:role:remove'],
  })

  if (!canDeleteRoles) {
    return null
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='角色'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => {
                const targets = table
                  .getSelectedRowModel()
                  .rows.map(({ original }) => ({
                    id: original.id,
                    name: original.roleName,
                  }))
                if (targets.length > 0) setDeleteTargets(targets)
              }}
              className='size-8'
              aria-label='删除所选角色'
              title='删除所选角色'
            >
              <Trash2 />
              <span className='sr-only'>删除所选角色</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>删除所选角色</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <RolesMultiDeleteDialog
        table={table}
        targets={deleteTargets}
        onOpenChange={(open) => {
          if (!open) setDeleteTargets(null)
        }}
      />
    </>
  )
}
