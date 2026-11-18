import type { UpdateProfileCommand } from '@/app/auth/api'
import type { AuthUser } from '@/types/auth'

export type ProfileFormValues = {
  nickname: string
  email: string
  phone: string
  sex: '0' | '1' | '2'
  remark: string
}

export function buildProfileFormValues(user: AuthUser): ProfileFormValues {
  return {
    nickname: user.nickname ?? '',
    email: '',
    phone: '',
    sex: String(user.sex ?? 0) as '0' | '1' | '2',
    remark: user.remark ?? '',
  }
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim()
  return normalized ? normalized : undefined
}

export function buildProfileUpdatePayload(
  user: AuthUser,
  values: ProfileFormValues
): UpdateProfileCommand {
  if (user.version == null) {
    throw new Error('当前用户版本号缺失')
  }

  const email = normalizeOptionalText(values.email)
  const phone = normalizeOptionalText(values.phone)

  return {
    version: user.version,
    nickname: values.nickname.trim(),
    ...(email && email !== user.email ? { email } : {}),
    ...(phone && phone !== user.phone ? { phone } : {}),
    sex: Number(values.sex),
    remark: normalizeOptionalText(values.remark),
  }
}
