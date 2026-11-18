import {
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table'

/** Features shared by the server-paginated lists and their controls. */
export const serverTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  columnMeta: metaHelper<{
    label?: string
    className?: string
    tdClassName?: string
    thClassName?: string
  }>(),
})

export type ServerTableFeatures = typeof serverTableFeatures
