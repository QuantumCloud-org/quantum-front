import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getStatusBadge } from '../dict-status'
import { formatDateTime, type DictData } from '../model'

function getDefaultBadge(isDefault: DictData['isDefault']) {
  return isDefault === 'Y'
    ? {
        label: '默认',
        className:
          'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
      }
    : {
        label: '普通',
        className:
          'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
      }
}

type Props = {
  records: DictData[]
  isPending: boolean
  isError: boolean
  onEdit?: (data: DictData) => void
  isOpeningEditor: boolean
  onDelete?: (data: DictData) => void
}

export function DictDataTable({
  records,
  isPending,
  isError,
  onEdit,
  isOpeningEditor,
  onDelete,
}: Props) {
  return (
    <div className='overflow-hidden rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-28 text-center'>字典编码</TableHead>
            <TableHead className='w-32 text-center'>字典名称</TableHead>
            <TableHead className='w-16 text-center'>排序</TableHead>
            <TableHead className='w-24 text-center'>默认项</TableHead>
            <TableHead className='w-24 text-center'>状态</TableHead>
            <TableHead className='text-center'>备注</TableHead>
            <TableHead className='w-44 text-center'>创建时间</TableHead>
            <TableHead className='w-28 text-center'>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className='h-24 text-center text-muted-foreground'
              >
                字典项加载中...
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className='h-24 text-center text-muted-foreground'
              >
                字典项加载失败，请重试。
              </TableCell>
            </TableRow>
          ) : records.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className='h-24 text-center text-muted-foreground'
              >
                当前分组下暂无字典项。
              </TableCell>
            </TableRow>
          ) : (
            records.map((item) => {
              const statusMeta = getStatusBadge(item.status)
              const defaultMeta = getDefaultBadge(item.isDefault)
              return (
                <TableRow key={item.id}>
                  <TableCell className='text-center font-mono text-xs'>
                    {item.dictValue}
                  </TableCell>
                  <TableCell className='text-center'>
                    {item.dictLabel}
                  </TableCell>
                  <TableCell className='text-center'>{item.dictSort}</TableCell>
                  <TableCell>
                    <Badge
                      variant='outline'
                      className={`px-1.5 py-0 text-[10px] ${defaultMeta.className}`}
                    >
                      {defaultMeta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant='outline'
                      className={`px-1.5 py-0 text-[10px] ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className='line-clamp-2 text-sm text-muted-foreground'>
                      {item.remark || '未填写'}
                    </span>
                  </TableCell>
                  <TableCell className='text-sm'>
                    {formatDateTime(item.createTime)}
                  </TableCell>
                  <TableCell className='text-left'>
                    <div className='flex justify-start gap-1'>
                      {onEdit ? (
                        <Button
                          type='button'
                          size='sm'
                          variant='ghost'
                          disabled={isOpeningEditor}
                          onClick={() => onEdit(item)}
                        >
                          编辑
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button
                          type='button'
                          size='sm'
                          variant='ghost'
                          className='text-destructive hover:text-destructive'
                          onClick={() => onDelete(item)}
                        >
                          删除
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
