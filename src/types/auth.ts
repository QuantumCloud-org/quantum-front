export interface CaptchaPayload {
  key: string
  image: string
  length: number
}

export interface LoginPayload {
  userId: string
  username: string
  nickname: string
  accessToken: string
  expireTime: string
}

export interface LoginCommand {
  username: string
  password: string
  captchaCode: string
  captchaKey: string
  rememberMe: boolean
  deviceId: string
}

export interface AuthUser {
  id: string
  version?: string
  username: string
  nickname: string
  email?: string
  phone?: string
  avatar?: string
  sex?: number
  deptName?: string
  status?: number
  loginIp?: string
  loginLocation?: string
  loginDate?: string
  remark?: string
  createTime?: string
  roles: string[]
  permissions: string[]
}

export type BootstrapStatus = 'idle' | 'loading' | 'ready'
