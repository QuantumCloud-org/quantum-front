import { afterEach, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { apiClient } from '@/lib/http'
import { reply } from '@/lib/http-test-fixtures'
import { fetchMenuTreeSelect } from './api'
import { CheckableTree } from './components/roles-checkable-tree'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

test('角色菜单树保留后端多级 children，并渲染可展开的子菜单', async () => {
  apiClient.defaults.adapter = (config) => {
    expect(config.url).toBe('/system/menu/treeselect')
    return reply(config, 200, {
      data: [
        {
          id: '1889234567890123456',
          label: '系统管理',
          children: [
            {
              id: '22',
              label: '用户管理',
              children: [{ id: '23', label: '导入用户', children: [] }],
            },
          ],
        },
      ],
    })
  }

  const nodes = await fetchMenuTreeSelect()
  expect(nodes).toEqual([
    {
      id: '1889234567890123456',
      label: '系统管理',
      children: [
        {
          id: '22',
          label: '用户管理',
          children: [{ id: '23', label: '导入用户', children: [] }],
        },
      ],
    },
  ])
  const markup = renderToStaticMarkup(
    <CheckableTree
      nodes={nodes}
      selectedIds={['23']}
      onChange={() => undefined}
    />
  )
  expect(markup).toContain('选中 系统管理')
  expect(markup).toContain('选中 用户管理')
  expect(markup).toContain('展开全部')
  expect(markup).toContain('aria-checked="mixed"')
})
