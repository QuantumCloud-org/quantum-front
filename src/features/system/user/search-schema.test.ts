import { expect, test } from 'bun:test'
import { roleManagementSearchSchema } from '@/features/system/role/search-schema'
import { userManagementSearchSchema } from './search-schema'

test('list filters normalize old arrays and whitespace before building query keys', () => {
  const userSearch = userManagementSearchSchema.parse({
    username: '  Alice  ',
    status: ['inactive', 'active'],
    sex: ['1', '2'],
  })
  expect(userSearch).toMatchObject({
    username: 'Alice',
    status: ['inactive'],
    sex: ['1'],
  })
  expect(userManagementSearchSchema.parse({ sex: [] }).sex).toBeUndefined()
  const roleSearch = roleManagementSearchSchema.parse({
    roleName: '  Operator ',
    status: ['active', 'inactive'],
  })
  expect(roleSearch).toMatchObject({
    roleName: 'Operator',
    status: ['active'],
  })
})
