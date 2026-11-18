/** Shared key factories for query definitions and invalidation prefixes. */
export const queryKeys = {
  navigationRouters: (generation: number) =>
    ['navigation', 'routers', generation] as const,
  navigation: () => ['navigation'] as const,
  currentUser: (generation: number) =>
    ['auth', 'current-user', generation] as const,
  dictTypes: (params?: object) =>
    params === undefined
      ? (['system', 'dict', 'types'] as const)
      : (['system', 'dict', 'types', params] as const),
  dictData: (params?: object) =>
    params === undefined
      ? (['system', 'dict', 'data'] as const)
      : (['system', 'dict', 'data', params] as const),
  deptList: (status: number | string | undefined) =>
    ['system', 'dept', 'list', status] as const,
  deptDetail: (id: string | undefined) =>
    ['system', 'dept', 'detail', id] as const,
  deptTreeSelect: () => ['system', 'dept', 'treeselect'] as const,
  dept: () => ['system', 'dept'] as const,
  onlineList: () => ['monitor', 'online', 'list'] as const,
  online: () => ['monitor', 'online'] as const,
  operLogPage: (params: object) =>
    ['monitor', 'operlog', 'page', params] as const,
  operLog: () => ['monitor', 'operlog'] as const,
  loginLogPage: (params: object) =>
    ['monitor', 'loginlog', 'page', params] as const,
  loginLog: () => ['monitor', 'loginlog'] as const,
  serverInfo: () => ['monitor', 'server', 'info'] as const,
  userList: (params?: object) =>
    params === undefined
      ? (['system', 'users', 'list'] as const)
      : (['system', 'users', 'list', params] as const),
  userDetail: (id: string | undefined) =>
    ['system', 'users', 'detail', id] as const,
  userRoles: (id: string | undefined) =>
    ['system', 'users', 'roles', id] as const,
  allRoles: () => ['system', 'roles', 'all'] as const,
  roleList: (params?: object) =>
    params === undefined
      ? (['system', 'role', 'list'] as const)
      : (['system', 'role', 'list', params] as const),
  roleDepts: (id: string | undefined) =>
    ['system', 'role', 'depts', id] as const,
  roleDetail: (id: string | undefined) =>
    ['system', 'role', 'detail', id] as const,
  roleMenus: (id: string | undefined) =>
    ['system', 'role', 'menus', id] as const,
  menuList: () => ['system', 'menu', 'list'] as const,
  menuDetail: (id: string | undefined) =>
    ['system', 'menu', 'detail', id] as const,
  menuTreeSelect: () => ['system', 'menu', 'treeselect'] as const,
  menu: () => ['system', 'menu'] as const,
  filePage: (params?: object) =>
    params === undefined
      ? (['system', 'files', 'page'] as const)
      : (['system', 'files', 'page', params] as const),
  cacheList: () => ['monitor', 'cache', 'list'] as const,
  cacheDetail: (id: string | undefined) =>
    ['monitor', 'cache', 'detail', id] as const,
}
