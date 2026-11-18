// This module deliberately colocates the lazy page components with the lookup
// helpers that resolve them — splitting them apart would buy nothing but would
// force every consumer to import two modules. The cost is that editing this file
// does not fast-refresh those components; the registry changes rarely enough for
// that to be an acceptable trade.
/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react'
import { type NavigateFn } from '@/hooks/use-table-url-state'

// Loaded lazily on purpose. This registry is reachable from the app shell
// (search-provider → command-menu → navigation registry), so static imports here
// pulled all eleven feature pages — recharts, tables and dialogs included — into
// the first-paint modulepreload set. The route file split (autoCodeSplitting)
// does not help, because pages are resolved through this map rather than through
// route files. Only the metadata below stays eager; the code arrives on demand.
const CacheMonitorPage = lazy(() =>
  import('@/features/monitor/cache').then((m) => ({
    default: m.CacheMonitorPage,
  }))
)
const LoginLogPage = lazy(() =>
  import('@/features/monitor/login-log').then((m) => ({
    default: m.LoginLogPage,
  }))
)
const OperLogPage = lazy(() =>
  import('@/features/monitor/oper-log').then((m) => ({
    default: m.OperLogPage,
  }))
)
const OnlineUserPage = lazy(() =>
  import('@/features/monitor/online').then((m) => ({
    default: m.OnlineUserPage,
  }))
)
const ServerMonitorPage = lazy(() =>
  import('@/features/monitor/server').then((m) => ({
    default: m.ServerMonitorPage,
  }))
)
const DepartmentManagementPage = lazy(() =>
  import('@/features/system/dept').then((m) => ({
    default: m.DepartmentManagementPage,
  }))
)
const DictManagementPage = lazy(() =>
  import('@/features/system/dict').then((m) => ({
    default: m.DictManagementPage,
  }))
)
const FileManagementPage = lazy(() =>
  import('@/features/system/file').then((m) => ({
    default: m.FileManagementPage,
  }))
)
const MenuManagementPage = lazy(() =>
  import('@/features/system/menu').then((m) => ({
    default: m.MenuManagementPage,
  }))
)
const RoleManagementPage = lazy(() =>
  import('@/features/system/role').then((m) => ({
    default: m.RoleManagementPage,
  }))
)
const UserManagementPage = lazy(() =>
  import('@/features/system/user').then((m) => ({
    default: m.UserManagementPage,
  }))
)

type BackendPageProps = {
  search: Record<string, unknown>
  navigate: NavigateFn
}

type BackendPageDefinition = {
  backendComponent: string
  fullPath: string
  render: (props: BackendPageProps) => React.JSX.Element
}

const backendPageDefinitions: BackendPageDefinition[] = [
  {
    backendComponent: 'system/user/index',
    fullPath: '/system/user',
    render: (props) => <UserManagementPage {...props} />,
  },
  {
    backendComponent: 'system/role/index',
    fullPath: '/system/role',
    render: (props) => <RoleManagementPage {...props} />,
  },
  {
    backendComponent: 'system/menu/index',
    fullPath: '/system/menu',
    render: () => <MenuManagementPage />,
  },
  {
    backendComponent: 'system/dept/index',
    fullPath: '/system/dept',
    render: () => <DepartmentManagementPage />,
  },
  {
    backendComponent: 'system/dict/index',
    fullPath: '/system/dict',
    render: () => <DictManagementPage />,
  },
  {
    backendComponent: 'system/file/index',
    fullPath: '/system/file',
    render: (props) => <FileManagementPage {...props} />,
  },
  {
    backendComponent: 'monitor/online/index',
    fullPath: '/monitor/online',
    render: () => <OnlineUserPage />,
  },
  {
    backendComponent: 'monitor/operlog/index',
    fullPath: '/monitor/operlog',
    render: (props) => <OperLogPage {...props} />,
  },
  {
    backendComponent: 'monitor/loginlog/index',
    fullPath: '/monitor/loginlog',
    render: (props) => <LoginLogPage {...props} />,
  },
  {
    backendComponent: 'monitor/server/index',
    fullPath: '/monitor/server',
    render: () => <ServerMonitorPage />,
  },
  {
    backendComponent: 'monitor/cache/index',
    fullPath: '/monitor/cache',
    render: () => <CacheMonitorPage />,
  },
]

const pageDefinitionByComponent = new Map(
  backendPageDefinitions.map((definition) => [
    definition.backendComponent,
    definition,
  ])
)

const pageDefinitionByPath = new Map(
  backendPageDefinitions.map((definition) => [definition.fullPath, definition])
)

export function getBackendPageByComponent(component?: string | null) {
  return component ? pageDefinitionByComponent.get(component) : undefined
}

export function getBackendPageByPath(pathname: string) {
  return pageDefinitionByPath.get(pathname)
}

export function isSupportedBackendComponent(component?: string | null) {
  return Boolean(getBackendPageByComponent(component))
}
