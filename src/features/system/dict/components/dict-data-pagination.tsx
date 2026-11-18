import { Button } from '@/components/ui/button'
import { SelectDropdown } from '@/components/select-dropdown'

const pageSizes = [10, 20, 50, 100].map((size) => ({
  label: `每页 ${size} 条`,
  value: String(size),
}))

type Props = {
  pageNum: number
  pageSize: number
  pageCount: number
  total: number
  disabled: boolean
  onPageChange: (page: number, size?: number) => void
}

export function DictDataPagination({
  pageNum,
  pageSize,
  pageCount,
  total,
  disabled,
  onPageChange,
}: Props) {
  return (
    <nav aria-label='字典项分页' className='flex flex-wrap items-center gap-2'>
      <SelectDropdown
        isControlled
        withFormControl={false}
        value={String(pageSize)}
        onValueChange={(value) => onPageChange(1, Number(value))}
        items={pageSizes}
        disabled={disabled}
      />
      <span className='text-sm text-muted-foreground'>共 {total} 条</span>
      <Button
        type='button'
        size='sm'
        variant='outline'
        disabled={disabled || pageNum <= 1}
        onClick={() => onPageChange(pageNum - 1)}
      >
        上一页
      </Button>
      <span className='text-sm'>
        第 {pageNum} / {pageCount} 页
      </span>
      <Button
        type='button'
        size='sm'
        variant='outline'
        disabled={disabled || pageNum >= pageCount}
        onClick={() => onPageChange(pageNum + 1)}
      >
        下一页
      </Button>
    </nav>
  )
}
