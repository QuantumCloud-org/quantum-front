import { createElement } from 'react'
import { useTable } from '@tanstack/react-table'
import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { serverTableFeatures } from './server-table-features'

function ServerTableProbe() {
  const alice = { id: '100', name: 'Alice' }
  const bob = { id: '200', name: 'Bob' }
  const columns = [{ accessorKey: 'name', header: 'Name' }]
  const table = useTable({
    features: serverTableFeatures,
    data: [alice, bob],
    columns,
    getRowId: (row) => row.id,
    manualPagination: true,
    manualFiltering: true,
    rowCount: 20,
    pageCount: 2,
  })

  expect(table.getPageCount()).toBe(2)
  expect(table.getHeaderGroups()[0].headers[0].column.id).toBe('name')
  expect(table.getRowModel().rows[0].getVisibleCells()[0].getValue()).toBe(
    'Alice'
  )
  table.getRow('100').toggleSelected(true)
  table.setOptions((state) => ({ ...state, data: [bob, alice] }))
  expect(table.getSelectedRowModel().rows.map((row) => row.original)).toEqual([
    alice,
  ])
  table.setOptions((state) => ({ ...state, data: [bob] }))
  expect(table.getFilteredSelectedRowModel().rows).toEqual([])
  return null
}

test('server table headers, visibility and row selection work on stable entity IDs', () => {
  renderToStaticMarkup(createElement(ServerTableProbe))
})
