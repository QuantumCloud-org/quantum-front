import { AxiosError } from 'axios'
import { afterEach, describe, expect, test } from 'bun:test'
import { apiClient } from '@/lib/http'
import { reply } from '@/lib/http-test-fixtures'
import {
  createDictData,
  createDictType,
  fetchDictDataDetail,
  fetchDictDataPage,
  fetchDictTypeDetail,
  updateDictData,
  updateDictType,
} from './api'
import { buildDictDataFormDefaults, buildDictTypeFormDefaults } from './model'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

const id = '1889234567890123456'
const original = { id, version: '0', dictType: 'source', business: 'common' }
const typeFields = {
  dictName: '名称',
  dictType: 'target',
  status: 0,
  remark: null,
}
const dataFields = {
  dictType: 'target',
  dictLabel: '选项',
  dictValue: 'example',
  dictSort: 5,
  cssClass: null,
  listClass: 'primary',
  isDefault: 'Y' as const,
  status: 1 as const,
  remark: null,
}

describe('字典接口', () => {
  test('四个写接口只发 DTO 允许的字段，保留更新的 Long 和分组编码', async () => {
    const requests: unknown[] = []
    apiClient.defaults.adapter = (config) => {
      requests.push([config.method, config.url, JSON.parse(config.data)])
      return reply(config, 200, { data: id })
    }

    const typeForm = {
      ...buildDictTypeFormDefaults(),
      ...original,
      dictName: ' 名称 ',
      dictType: 'target',
      status: '0' as const,
      createTime: 'test-time',
    }
    const dataForm = {
      ...buildDictDataFormDefaults('target'),
      id,
      version: '2',
      dictLabel: ' 选项 ',
      dictValue: 'example',
      dictSort: '5',
      listClass: 'primary',
      isDefault: 'Y' as const,
      createTime: 'test-time',
    }

    await createDictType(typeForm)
    await updateDictType({ values: typeForm, original })
    await createDictData(dataForm)
    await updateDictData({ values: dataForm, original })
    expect(requests).toEqual([
      ['post', '/system/dict/type', typeFields],
      ['put', '/system/dict/type', { ...typeFields, ...original }],
      ['post', '/system/dict/data', dataFields],
      ['put', '/system/dict/data', { ...dataFields, id, version: '0' }],
    ])
  })

  test('缺少 ID 或版本时拒绝发出更新', async () => {
    apiClient.defaults.adapter = () => {
      throw new Error('不应发出请求')
    }
    await expect(
      updateDictType({
        values: buildDictTypeFormDefaults(),
        original: { ...original, version: '' },
      })
    ).rejects.toThrow('缺少 ID 或版本')
    await expect(
      updateDictData({
        values: buildDictDataFormDefaults('source'),
        original: { ...original, id: '' },
      })
    ).rejects.toThrow('缺少 ID 或版本')
  })

  test('用 pageNum 和 pageSize 读取分页响应中的 records 和 total', async () => {
    apiClient.defaults.adapter = (config) => {
      expect(config.url).toBe('/system/dict/data/list')
      expect(config.params).toEqual({
        pageNum: 2,
        pageSize: 20,
        dictType: 'target',
        dictLabel: '选项',
        status: 1,
      })
      return reply(config, 200, {
        data: { total: '21', records: [{ ...dataFields, id, version: '2' }] },
      })
    }
    await expect(
      fetchDictDataPage({
        pageNum: 2,
        pageSize: 20,
        dictType: 'target',
        dictLabel: ' 选项 ',
        status: 1,
      })
    ).resolves.toEqual({
      total: 21,
      records: [{ ...dataFields, id, version: '2', createTime: null }],
    })
  })

  test('按 ID 仅把空响应或 404 转为空结果', async () => {
    apiClient.defaults.adapter = (config) => {
      if (config.url === `/system/dict/type/${id}`)
        return reply(config, 200, { data: null })
      if (config.url === `/system/dict/data/${id}`)
        return reply(config, 200, { data: { id, version: '3' } })
      if (config.url === '/system/dict/data/404') return reply(config, 404)
      return reply(config, 403)
    }

    await expect(fetchDictTypeDetail(id)).resolves.toBeNull()
    await expect(fetchDictDataDetail(id)).resolves.toMatchObject({
      id,
      version: '3',
    })
    await expect(fetchDictDataDetail('404')).resolves.toBeNull()
    await expect(fetchDictTypeDetail('403')).rejects.toBeInstanceOf(AxiosError)
  })
})
