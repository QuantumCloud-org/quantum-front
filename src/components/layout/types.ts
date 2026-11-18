import { type LinkProps } from '@tanstack/react-router'

type NavigationIcon = React.ComponentType | string

type BaseNavItem = {
  title: string
  badge?: string
  icon?: NavigationIcon
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] | (string & {}) })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
}

export type { NavigationIcon, NavGroup, NavItem, NavCollapsible, NavLink }
