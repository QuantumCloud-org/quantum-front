import type { AuthUser } from '@/types/auth'
import { describe, expect, test } from 'bun:test'
import {
  buildProfileFormValues,
  buildProfileUpdatePayload,
} from './profile-account-model'

const user: AuthUser = {
  id: '21',
  version: '3',
  username: 'tester',
  nickname: '测试用户',
  email: 't***@example.com',
  phone: '138****1234',
  roles: [],
  permissions: [],
}

describe('个人资料联系方式', () => {
  test('脱敏值不进入表单或修改其他资料的请求', () => {
    const form = buildProfileFormValues(user)
    expect(form.email).toBe('')
    expect(form.phone).toBe('')
    expect(
      buildProfileUpdatePayload(user, { ...form, nickname: '新昵称' })
    ).toEqual({
      version: '3',
      nickname: '新昵称',
      sex: 0,
      remark: undefined,
    })
  })

  test('手动复制当前脱敏值也不会提交', () => {
    const form = {
      ...buildProfileFormValues(user),
      email: user.email!,
      phone: user.phone!,
    }
    const payload = buildProfileUpdatePayload(user, form)
    expect(payload).not.toHaveProperty('email')
    expect(payload).not.toHaveProperty('phone')
  })

  test('只提交新输入的那项联系方式', () => {
    const form = buildProfileFormValues(user)
    const email = buildProfileUpdatePayload(user, {
      ...form,
      email: 'new@example.com',
    })
    expect(email.email).toBe('new@example.com')
    expect(email).not.toHaveProperty('phone')
    const phone = buildProfileUpdatePayload(user, {
      ...form,
      phone: '13912345678',
    })
    expect(phone.phone).toBe('13912345678')
    expect(phone).not.toHaveProperty('email')
  })
})
