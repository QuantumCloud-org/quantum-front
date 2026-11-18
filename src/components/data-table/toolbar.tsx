import { Cross2Icon } from '@radix-ui/react-icons'
import { type RowData, type ReactTable } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { type ServerTableFeatures } from '@/components/data-table/server-table-features'
import { DebouncedSearchInput } from './debounced-search-input'
import { DataTableFacetedFilter } from './faceted-filter'
import { DataTableViewOptions } from './view-options'

type DataTableToolbarProps<TData extends RowData> = {
  table: ReactTable<ServerTableFeatures, TData>
  searchPlaceholder?: string
  searchKey?: string
  searches?: {
    columnId: string
    placeholder?: string
    className?: string
  }[]
  filters?: {
    columnId: string
    title: string
    options: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
  }[]
}

export function DataTableToolbar<TData extends RowData>({
  table,
  searchPlaceholder = '筛选...',
  searchKey,
  searches = [],
  filters = [],
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.state.columnFilters.length > 0 || table.state.globalFilter
  const searchFields =
    searches.length > 0
      ? searches
      : searchKey
        ? [{ columnId: searchKey, placeholder: searchPlaceholder }]
        : []

  return (
    <div className='flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between'>
      <div className='flex flex-1 flex-wrap items-center gap-2'>
        {searchFields.length > 0 ? (
          searchFields.map((searchField) => (
            <DebouncedSearchInput
              key={searchField.columnId}
              placeholder={searchField.placeholder ?? searchPlaceholder}
              committed={
                (table
                  .getColumn(searchField.columnId)
                  ?.getFilterValue() as string) ?? ''
              }
              onCommit={(value) =>
                table.getColumn(searchField.columnId)?.setFilterValue(value)
              }
              className={searchField.className ?? 'h-8 w-[150px] lg:w-[200px]'}
            />
          ))
        ) : (
          <DebouncedSearchInput
            placeholder={searchPlaceholder}
            committed={table.state.globalFilter ?? ''}
            onCommit={(value) => table.setGlobalFilter(value)}
            className='h-8 w-[150px] lg:w-[250px]'
          />
        )}
        <div className='flex flex-wrap items-center gap-2'>
          {filters.map((filter) => {
            const column = table.getColumn(filter.columnId)
            if (!column) return null
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            )
          })}
        </div>
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
            }}
            className='h-8 px-2 lg:px-3'
          >
            重置
            <Cross2Icon className='ms-2 h-4 w-4' />
          </Button>
        )}
      </div>
      <div className='flex justify-end'>
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
