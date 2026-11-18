import { type User } from './data/schema'

const SUPER_ADMIN_USER_ID = '1'

export function isProtectedSystemUser(user: Pick<User, 'id'>) {
  return user.id === SUPER_ADMIN_USER_ID
}

export function canSelectSystemUser(user: Pick<User, 'id'>) {
  return !isProtectedSystemUser(user)
}
