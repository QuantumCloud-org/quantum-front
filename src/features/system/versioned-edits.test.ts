import { afterEach, expect, test } from 'bun:test'
import { apiClient } from '@/lib/http'
import { reply } from '@/lib/http-test-fixtures'
import { fetchDeptDetail, updateDept } from './dept/api'
import { deptFormSchema } from './dept/form'
import { buildDeptFormDefaults } from './dept/model'
import { fetchMenuDetail, updateMenu } from './menu/api'
import { buildMenuFormDefaults } from './menu/model'
import { fetchRoleDetail, updateRole } from './role/api'
import { buildRoleActionDefaultValues } from './role/components/roles-action-dialog-form'

const adapter = apiClient.defaults.adapter
const id = '1889234567890123456'
const version = '4'

afterEach(() => {
  apiClient.defaults.adapter = adapter
})

test('menu edit sends the detail id and version and surfaces stale-version conflicts', async () => {
  let stale = false
  apiClient.defaults.adapter = (config) => {
    if (config.method === 'get') {
      return reply(config, 200, { data: { id, version, menuName: '旧菜单' } })
    }
    expect(config.data).toEqual(expect.any(String))
    const payload: unknown = JSON.parse(String(config.data))
    expect(payload).toMatchObject({ id, version, menuName: '新菜单' })
    expect(payload).not.toHaveProperty('menuId')
    return stale
      ? reply(config, 409, { message: '菜单信息已变更，请刷新后重试' })
      : reply(config, 200, { data: null })
  }

  const detail = await fetchMenuDetail(id)
  const draft = buildMenuFormDefaults(detail)
  const save = () =>
    updateMenu(
      { ...draft, menuName: '新菜单' },
      { id: draft.id!, version: draft.version! }
    )
  await expect(save()).resolves.toBeNull()
  stale = true
  await expect(save()).rejects.toMatchObject({
    response: { status: 409 },
  })
})

test('role edit sends the version from the selected role and surfaces stale-version conflicts', async () => {
  let stale = false
  apiClient.defaults.adapter = (config) => {
    if (config.method === 'get') {
      return reply(config, 200, { data: { id, version, roleName: '旧角色' } })
    }
    const payload: unknown = JSON.parse(String(config.data))
    expect(payload).toMatchObject({
      id,
      version,
      roleName: '新角色',
      menuIds: ['9'],
    })
    return stale
      ? reply(config, 409, { message: '角色信息已变更，请刷新后重试' })
      : reply(config, 200, { data: null })
  }

  const role = await fetchRoleDetail(id)
  const draft = buildRoleActionDefaultValues(role, ['9'])
  const save = () =>
    updateRole({
      ...draft,
      id: draft.id!,
      version: draft.version!,
      roleName: '新角色',
    })
  await expect(save()).resolves.toBeNull()
  stale = true
  await expect(save()).rejects.toMatchObject({
    response: { status: 409 },
  })
})

test('department edit sends the detail version and omits untouched masked contacts', async () => {
  let stale = false
  apiClient.defaults.adapter = (config) => {
    if (config.method === 'get') {
      return reply(config, 200, {
        data: {
          id,
          version,
          deptName: '旧部门',
          leader: '负责人',
          phone: '138****8000',
          email: 'a****@example.com',
        },
      })
    }
    const payload: unknown = JSON.parse(String(config.data))
    expect(payload).toMatchObject({ id, version, deptName: '新部门' })
    expect(payload).not.toHaveProperty('phone')
    expect(payload).not.toHaveProperty('email')
    return stale
      ? reply(config, 409, { message: '部门信息已变更，请刷新后重试' })
      : reply(config, 200, { data: null })
  }

  const detail = await fetchDeptDetail(id)
  const draft = buildDeptFormDefaults(detail)
  expect(deptFormSchema.safeParse(draft).success).toBe(true)
  const save = () =>
    updateDept(
      { ...draft, deptName: '新部门' },
      { id: draft.id!, version: draft.version! }
    )
  await expect(save()).resolves.toBeNull()
  stale = true
  await expect(save()).rejects.toMatchObject({
    response: { status: 409 },
  })
})

test('department edit only submits newly entered contact values', async () => {
  apiClient.defaults.adapter = (config) => {
    const payload: unknown = JSON.parse(String(config.data))
    expect(payload).toMatchObject({ phone: '13900139000' })
    expect(payload).not.toHaveProperty('email')
    return reply(config, 200, { data: null })
  }

  const draft = buildDeptFormDefaults({
    deptId: id,
    version,
    deptName: '部门',
    phone: '138****8000',
    email: 'a****@example.com',
  })
  await updateDept(
    { ...draft, phone: '13900139000' },
    { id: draft.id!, version: draft.version! }
  )
})
