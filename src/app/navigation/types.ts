export type BackendMenuRouter = {
  name?: string
  path: string
  hidden?: boolean
  redirect?: string
  component?: string
  query?: string
  alwaysShow?: boolean
  meta?: {
    title?: string
    icon?: string
    noCache?: boolean
    requiresAuth?: boolean
    permission?: string
    roles?: string[]
    link?: string
  } | null
  children?: BackendMenuRouter[]
}

export type BreadcrumbConfig = {
  label: string
  href?: string
}
