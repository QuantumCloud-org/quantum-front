import { useDeferredValue, useState } from 'react'
import type { AxiosError } from 'axios'
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useAccess } from '@/app/auth/access'
import type { ApiResult } from '@/types/api'
import { Building2, Monitor, RefreshCw, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query-keys'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SelectionBulkActions } from '@/components/data-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { fetchOnlineUsers, forceLogoutByTokenId } from './api'
import {
  buildOnlineOverview,
  defaultOnlineUserFilters,
  filterOnlineUsers,
  formatDateTime,
  hasOnlineUserFilters,
  type OnlineUser,
  type OnlineUserFilters,
} from './model'

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as AxiosError<ApiResult<unknown>>)?.response?.data?.message ??
    fallback
  )
}

function formatTokenId(tokenId: string) {
  if (tokenId.length <= 20) {
    return tokenId
  }
  return `${tokenId.slice(0, 8)}...${tokenId.slice(-8)}`
}

function OverviewCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string | number
  description: string
  icon: typeof Users
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <Icon className='size-4 text-muted-foreground' />
      </CardHeader>
      <CardContent className='space-y-1'>
        <div className='text-2xl font-semibold tracking-tight'>{value}</div>
        <p className='text-xs text-muted-foreground'>{description}</p>
      </CardContent>
    </Card>
  )
}

export function OnlineUserPage() {
  const queryClient = useQueryClient()
  const canForceLogout = useAccess({
    permissions: ['monitor:online:forceLogout'],
  })
  const [filters, setFilters] = useState<OnlineUserFilters>(
    defaultOnlineUserFilters
  )
  const deferredFilters = useDeferredValue(filters)
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(
    new Set()
  )
  const [logoutTarget, setLogoutTarget] = useState<OnlineUser | null>(null)
  const [bulkTargets, setBulkTargets] = useState<OnlineUser[] | null>(null)

  const usersQuery = useQuery(
    queryOptions({
      queryKey: queryKeys.onlineList(),
      queryFn: fetchOnlineUsers,
    })
  )

  const logoutMutation = useMutation({
    mutationFn: async (tokenIds: string[]) => {
      const results = await Promise.allSettled(
        tokenIds.map(forceLogoutByTokenId)
      )
      const failedIds = new Set(
        tokenIds.filter((_, index) => results[index].status === 'rejected')
      )
      return failedIds
    },
    onSuccess: async (failedIds, tokenIds) => {
      const successCount = tokenIds.length - failedIds.size
      if (successCount > 0) toast.success(`已强制下线 ${successCount} 个会话`)
      if (failedIds.size > 0)
        toast.error(`${failedIds.size} 个会话下线失败，可以重试`)

      setSelectedTokenIds(failedIds)
      setLogoutTarget((target) =>
        target && failedIds.has(target.tokenId) ? target : null
      )
      setBulkTargets((targets) => {
        const remaining = targets?.filter((target) =>
          failedIds.has(target.tokenId)
        )
        return remaining?.length ? remaining : null
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.online() })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, '强制下线失败'))
    },
  })

  const users = usersQuery.data ?? []
  const filteredUsers = filterOnlineUsers(users, deferredFilters)
  const overview = buildOnlineOverview(filteredUsers)
  const hasFilters = hasOnlineUserFilters(filters)
  const selectedUsers = filteredUsers.filter((user) =>
    selectedTokenIds.has(user.tokenId)
  )
  const allSelected =
    selectedUsers.length > 0 && selectedUsers.length === filteredUsers.length
  const someSelected = selectedUsers.length > 0 && !allSelected

  function updateFilter<K extends keyof OnlineUserFilters>(
    key: K,
    value: OnlineUserFilters[K]
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setFilters(defaultOnlineUserFilters)
    setSelectedTokenIds(new Set())
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedTokenIds(new Set())
      return
    }

    setSelectedTokenIds(new Set(filteredUsers.map((user) => user.tokenId)))
  }

  function toggleSelect(tokenId: string) {
    setSelectedTokenIds((prev) => {
      const next = new Set(prev)
      if (next.has(tokenId)) {
        next.delete(tokenId)
      } else {
        next.add(tokenId)
      }
      return next
    })
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center space-x-4'>
          <Search />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div className='space-y-1'>
            <h2 className='text-2xl font-bold tracking-tight'>在线用户</h2>
            <p className='text-sm text-muted-foreground'>
              查看当前活跃会话，并在必要时按会话维度执行强制下线。
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                void usersQuery.refetch()
              }}
              disabled={usersQuery.isFetching}
            >
              <RefreshCw
                className={usersQuery.isFetching ? 'animate-spin' : undefined}
              />
              刷新数据
            </Button>
          </div>
        </div>

        {usersQuery.error ? (
          <Alert variant='destructive'>
            <AlertTitle>在线用户加载失败</AlertTitle>
            <AlertDescription>
              {getErrorMessage(usersQuery.error, '请稍后重试')}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <OverviewCard
            title='在线会话'
            value={overview.total}
            description='当前筛选结果中的在线会话总数'
            icon={Users}
          />
          <OverviewCard
            title='覆盖部门'
            value={overview.departmentCount}
            description='当前在线用户涉及的部门数量'
            icon={Building2}
          />
          <OverviewCard
            title='主力浏览器'
            value={overview.topBrowser?.label ?? '-'}
            description={
              overview.topBrowser
                ? `共 ${overview.topBrowser.value} 个会话`
                : '暂无浏览器信息'
            }
            icon={Monitor}
          />
          <OverviewCard
            title='主力系统'
            value={overview.topOs?.label ?? '-'}
            description={
              overview.topOs
                ? `共 ${overview.topOs.value} 个会话`
                : '暂无系统信息'
            }
            icon={Users}
          />
        </div>

        <Card>
          <CardHeader className='space-y-4 border-b pb-4'>
            <div className='space-y-1'>
              <CardTitle>会话列表</CardTitle>
              <CardDescription>
                支持按账号、昵称、部门、IP、地点和设备分条件筛选。
              </CardDescription>
            </div>
            <div className='flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between'>
              <div className='flex flex-1 flex-wrap items-center gap-2'>
                <Input
                  value={filters.username}
                  onChange={(event) =>
                    updateFilter('username', event.target.value)
                  }
                  placeholder='按账号检索...'
                  className='h-8 w-[150px] lg:w-[180px]'
                />
                <Input
                  value={filters.nickname}
                  onChange={(event) =>
                    updateFilter('nickname', event.target.value)
                  }
                  placeholder='按昵称检索...'
                  className='h-8 w-[150px] lg:w-[180px]'
                />
                <Input
                  value={filters.deptName}
                  onChange={(event) =>
                    updateFilter('deptName', event.target.value)
                  }
                  placeholder='按部门检索...'
                  className='h-8 w-[150px] lg:w-[180px]'
                />
                <Input
                  value={filters.loginIp}
                  onChange={(event) =>
                    updateFilter('loginIp', event.target.value)
                  }
                  placeholder='按 IP 检索...'
                  className='h-8 w-[150px] lg:w-[180px]'
                />
                <Input
                  value={filters.loginLocation}
                  onChange={(event) =>
                    updateFilter('loginLocation', event.target.value)
                  }
                  placeholder='按地点检索...'
                  className='h-8 w-[150px] lg:w-[180px]'
                />
                <Input
                  value={filters.device}
                  onChange={(event) =>
                    updateFilter('device', event.target.value)
                  }
                  placeholder='按设备检索...'
                  className='h-8 w-[150px] lg:w-[180px]'
                />
                {hasFilters ? (
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={resetFilters}
                    className='h-8 px-2 lg:px-3'
                  >
                    重置
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className='pt-4'>
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    {canForceLogout ? (
                      <TableHead className='w-10'>
                        <Checkbox
                          checked={
                            allSelected || (someSelected && 'indeterminate')
                          }
                          onCheckedChange={(value) =>
                            toggleSelectAll(Boolean(value))
                          }
                          aria-label='全选当前在线会话'
                          className='translate-y-[2px]'
                        />
                      </TableHead>
                    ) : null}
                    <TableHead className='w-48'>用户</TableHead>
                    <TableHead className='w-36'>部门</TableHead>
                    <TableHead className='w-52'>登录地址</TableHead>
                    <TableHead className='w-40'>登录时间</TableHead>
                    <TableHead className='w-40'>登录设备</TableHead>
                    <TableHead>会话 Token</TableHead>
                    <TableHead className='w-20 text-right'>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersQuery.isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={canForceLogout ? 8 : 7}
                        className='text-center text-sm text-muted-foreground'
                      >
                        在线用户数据加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={canForceLogout ? 8 : 7}
                        className='text-center text-sm text-muted-foreground'
                      >
                        {hasFilters
                          ? '当前筛选条件暂无在线会话'
                          : '暂无在线会话'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.tokenId}>
                        {canForceLogout ? (
                          <TableCell>
                            <Checkbox
                              checked={selectedTokenIds.has(user.tokenId)}
                              onCheckedChange={() => toggleSelect(user.tokenId)}
                              aria-label='选择当前在线会话'
                              className='translate-y-[2px]'
                            />
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <div className='space-y-1'>
                            <div className='font-medium'>
                              {user.username || '-'}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {user.nickname || '未设置昵称'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.deptName || '-'}</TableCell>
                        <TableCell>
                          <div className='text-sm'>
                            {user.loginLocation || '未知地点'}
                            <span className='ml-2 font-mono text-xs text-muted-foreground'>
                              {user.loginIp || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(user.loginTime)}</TableCell>
                        <TableCell>
                          <div className='space-y-1'>
                            <div>{user.browser || '-'}</div>
                            <div className='text-xs text-muted-foreground'>
                              {user.os || '未知系统'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code
                            className='block max-w-52 truncate text-xs'
                            title={user.tokenId}
                          >
                            {formatTokenId(user.tokenId)}
                          </code>
                        </TableCell>
                        <TableCell className='text-right'>
                          {canForceLogout ? (
                            <Button
                              type='button'
                              size='sm'
                              variant='ghost'
                              onClick={() => setLogoutTarget(user)}
                            >
                              <Trash2 className='size-4' />
                              强退
                            </Button>
                          ) : (
                            <span className='text-xs text-muted-foreground'>
                              无权限
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>

      {canForceLogout ? (
        <SelectionBulkActions
          selectedCount={selectedUsers.length}
          entityName='在线会话'
          onClearSelection={() => setSelectedTokenIds(new Set())}
        >
          <Button
            type='button'
            size='sm'
            variant='destructive'
            onClick={() => setBulkTargets(selectedUsers)}
          >
            <Trash2 className='size-4' />
            批量强退
          </Button>
        </SelectionBulkActions>
      ) : null}

      <ConfirmDialog
        open={Boolean(logoutTarget)}
        onOpenChange={(open) => {
          if (!open) setLogoutTarget(null)
        }}
        title='确认强制下线'
        desc={
          logoutTarget ? (
            <div className='space-y-2 text-sm'>
              <p>
                将立即终止{' '}
                <span className='font-medium'>{logoutTarget.username}</span>{' '}
                当前选中的登录会话。
              </p>
              <p className='text-muted-foreground'>
                会话 Token：{logoutTarget.tokenId}
              </p>
            </div>
          ) : (
            ''
          )
        }
        destructive
        confirmText='确认强退'
        isLoading={logoutMutation.isPending}
        handleConfirm={() => {
          if (!logoutTarget) return
          logoutMutation.mutate([logoutTarget.tokenId])
        }}
      />

      <ConfirmDialog
        open={bulkTargets !== null}
        onOpenChange={(open) => {
          if (!open) setBulkTargets(null)
        }}
        title='确认批量强制下线'
        desc={`将强制终止 ${bulkTargets?.length ?? 0} 个会话：${bulkTargets?.map((user) => user.username).join('、') ?? ''}。`}
        destructive
        confirmText='确认批量强退'
        isLoading={logoutMutation.isPending}
        handleConfirm={() => {
          if (bulkTargets && !logoutMutation.isPending) {
            logoutMutation.mutate(bulkTargets.map((target) => target.tokenId))
          }
        }}
      />
    </>
  )
}
