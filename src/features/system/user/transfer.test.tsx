import { afterEach, describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { apiClient } from '@/lib/http'
import { reply } from '@/lib/http-test-fixtures'
import { UsersImportResults } from './components/users-import-dialog'
import {
  exportUsers,
  importUsers,
  USER_EXPORT_LIMIT,
  USER_IMPORT_LIMIT,
} from './transfer-api'
import { getUserManagementAccess } from './user-management-access'

const defaultAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = defaultAdapter
})

const file = new File(['test'], 'users.xlsx')
const failure = {
  row: 2,
  username: null,
  success: false,
  message: '<b>格式错误</b>',
}
const success = {
  row: 3,
  username: 'tester',
  success: true,
  message: '导入成功',
}

describe('用户导入和导出', () => {
  test('上传 Excel 和更新选项，返回逐行结果', async () => {
    apiClient.defaults.adapter = (config) => {
      expect(config.url).toBe('/system/user/import')
      expect(config.method).toBe('post')
      expect(config.headers.get('Content-Type')).toBe('multipart/form-data')
      const body = config.data as FormData
      expect(body.get('file')).toEqual(
        expect.objectContaining({ name: file.name, size: file.size })
      )
      expect(body.get('updateSupport')).toBe('true')
      return reply(config, 200, { code: 200, data: [success] })
    }
    await expect(importUsers(file, true)).resolves.toEqual([success])
  })

  for (const status of [200, 400]) {
    test(`HTTP ${status} 的回滚响应保留失败行`, async () => {
      apiClient.defaults.adapter = (config) =>
        reply(config, status, {
          code: 400,
          message: '数据有误',
          data: [failure],
        })
      await expect(importUsers(file, false)).resolves.toEqual([failure])
    })
  }

  test('没有逐行数据的导入失败保留服务端提示', async () => {
    apiClient.defaults.adapter = (config) =>
      reply(config, 200, { code: 500, message: '导入最多 1000 行' })
    await expect(importUsers(file, false)).rejects.toThrow('导入最多 1000 行')
  })

  test('消息和用户名使用文本渲染', () => {
    const markup = renderToStaticMarkup(
      <UsersImportResults
        rows={[failure, { ...success, username: '<i>tester</i>' }]}
      />
    )
    expect(markup).toContain('<td')
    expect(markup).toContain('>2</td>')
    expect(markup).toContain('>失败</td>')
    expect(markup).toContain('>成功</td>')
    expect(markup).toContain('&lt;b&gt;格式错误&lt;/b&gt;')
    expect(markup).toContain('&lt;i&gt;tester&lt;/i&gt;')
    expect(markup).not.toContain('<b>格式错误</b>')
  })

  test('导出使用当前筛选条件且覆盖全部分页', async () => {
    const blob = new Blob(['test spreadsheet'])
    apiClient.defaults.adapter = (config) => {
      expect(config.url).toBe('/system/user/export')
      expect(config.method).toBe('post')
      expect(config.responseType).toBe('blob')
      expect(config.params).toMatchObject({ username: 'tester' })
      expect(config.params).not.toHaveProperty('pageNum')
      expect(config.params).not.toHaveProperty('pageSize')
      return reply(config, 200, blob)
    }
    await expect(
      exportUsers({ username: 'tester', page: 2, pageSize: 50 })
    ).resolves.toBe(blob)
  })

  test('导出超限时显示后端提示', async () => {
    const message = '导出最多 10000 行，请缩小查询范围'
    apiClient.defaults.adapter = (config) =>
      reply(
        config,
        400,
        new Blob([JSON.stringify({ message })], { type: 'application/json' })
      )
    await expect(exportUsers({})).rejects.toThrow(message)
  })

  test('导入和导出权限独立，使用后端规定的行数上限', () => {
    const user = { roles: [], permissions: ['system:user:import'] }
    expect(getUserManagementAccess(user)).toMatchObject({
      canImportUsers: true,
      canExportUsers: false,
    })
    expect(USER_IMPORT_LIMIT).toBe(1_000)
    expect(USER_EXPORT_LIMIT).toBe(10_000)
  })
})
