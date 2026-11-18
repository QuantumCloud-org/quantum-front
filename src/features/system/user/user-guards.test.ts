import { expect, test } from 'bun:test'
import { canSelectSystemUser } from './user-guards'

test('a rename keeps the super administrator out of bulk user changes', () => {
  const renamedAdministrator = { id: '1', username: 'new_admin_name' }
  const ordinaryUser = { id: '2', username: 'admin' }
  expect(canSelectSystemUser(renamedAdministrator)).toBe(false)
  expect(canSelectSystemUser(ordinaryUser)).toBe(true)
})
