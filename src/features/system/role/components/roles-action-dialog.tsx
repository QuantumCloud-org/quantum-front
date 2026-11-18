import { useLayoutEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { queryKeys } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/select-dropdown'
import { deptTreeSelectQueryOptions } from '@/features/system/dept/api'
import {
  createRole,
  fetchMenuTreeSelect,
  fetchRoleDeptIds,
  fetchRoleDetail,
  fetchRoleMenuIds,
  updateRole,
} from '../api'
import { roleDataScopeOptions, type Role } from '../model'
import {
  buildRoleActionDefaultValues,
  roleActionFormSchema,
  type RoleActionForm,
} from './roles-action-dialog-form'
import { CheckableTree } from './roles-checkable-tree'

type RoleActionDialogProps = {
  currentRow?: Role
  open: boolean
  onOpenChange: (open: boolean) => void
}

function RequiredFormLabel({ children }: { children: string }) {
  return (
    <FormLabel className='flex items-center gap-1'>
      <span className='text-destructive'>*</span>
      <span>{children}</span>
    </FormLabel>
  )
}

export function RolesActionDialog({
  currentRow,
  open,
  onOpenChange,
}: RoleActionDialogProps) {
  const isEdit = Boolean(currentRow)
  const queryClient = useQueryClient()
  const form = useForm<RoleActionForm>({
    resolver: zodResolver(roleActionFormSchema),
    defaultValues: buildRoleActionDefaultValues(currentRow),
  })

  const dataScopeValue = useWatch({
    control: form.control,
    name: 'dataScope',
  })

  const menuTreeQuery = useQuery(
    queryOptions({
      queryKey: queryKeys.menuTreeSelect(),
      queryFn: fetchMenuTreeSelect,
      enabled: open,
      staleTime: 60_000,
    })
  )

  const roleDetailQuery = useQuery(
    queryOptions({
      queryKey: queryKeys.roleDetail(currentRow?.id),
      queryFn: () => fetchRoleDetail(currentRow!.id),
      enabled: open && Boolean(currentRow?.id),
      staleTime: 0,
    })
  )

  const isCustomDataScopeRow = roleDetailQuery.data?.dataScope === 4
  const isCustomScopeExpected =
    isCustomDataScopeRow || form.getValues('dataScope') === '4'

  const deptTreeQuery = useQuery(
    queryOptions({
      ...deptTreeSelectQueryOptions(),
      enabled: open && isCustomScopeExpected,
    })
  )

  const roleMenuIdsQuery = useQuery(
    queryOptions({
      queryKey: queryKeys.roleMenus(currentRow?.id),
      queryFn: () => fetchRoleMenuIds(currentRow!.id),
      enabled: open && isEdit && Boolean(currentRow?.id),
      staleTime: 0,
    })
  )

  const roleDeptIdsQuery = useQuery(
    queryOptions({
      queryKey: queryKeys.roleDepts(currentRow?.id),
      queryFn: () => fetchRoleDeptIds(currentRow!.id),
      enabled:
        open && isEdit && Boolean(currentRow?.id) && isCustomDataScopeRow,
      staleTime: 0,
    })
  )

  const createMutation = useMutation({
    mutationFn: createRole,
    onSuccess: async () => {
      toast.success('角色创建成功。')
      form.reset(buildRoleActionDefaultValues())
      onOpenChange(false)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.roleList(),
      })
    },
    onError: handleServerError,
  })

  const updateMutation = useMutation({
    mutationFn: updateRole,
    onSuccess: async () => {
      toast.success(`角色“${currentRow?.roleName}”已更新。`)
      onOpenChange(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.navigation() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.roleDetail(currentRow?.id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.roleList(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.roleMenus(currentRow?.id),
        }),
      ])
    },
    onError: handleServerError,
  })

  const [initialValues, setInitialValues] = useState<RoleActionForm | null>(
    null
  )
  const canInitialize =
    !isEdit ||
    (roleDetailQuery.isSuccess &&
      roleDetailQuery.fetchStatus === 'idle' &&
      roleMenuIdsQuery.isSuccess &&
      roleMenuIdsQuery.fetchStatus === 'idle' &&
      (!isCustomDataScopeRow ||
        (roleDeptIdsQuery.isSuccess &&
          roleDeptIdsQuery.fetchStatus === 'idle')))

  if (!open && initialValues) setInitialValues(null)
  if (open && !initialValues && canInitialize) {
    // Freeze the freshly loaded permissions so later refetches preserve the draft.
    setInitialValues(
      buildRoleActionDefaultValues(
        roleDetailQuery.data,
        roleMenuIdsQuery.data ?? [],
        isCustomDataScopeRow ? (roleDeptIdsQuery.data ?? []) : []
      )
    )
  }

  useLayoutEffect(() => {
    if (initialValues) form.reset(initialValues)
  }, [form, initialValues])

  const isCustomScope = dataScopeValue === '4'
  const isSaving = createMutation.isPending || updateMutation.isPending
  const isMenuLoading = menuTreeQuery.isPending
  const isDeptLoading = isCustomScope && deptTreeQuery.isPending
  const isEditDataLoading = isEdit && !initialValues
  const hasLoadError =
    (!menuTreeQuery.data && menuTreeQuery.isError) ||
    (isEditDataLoading &&
      (roleDetailQuery.isError ||
        roleMenuIdsQuery.isError ||
        (isCustomDataScopeRow && roleDeptIdsQuery.isError)))
  const hasDeptScopeError =
    isCustomScope &&
    ((!deptTreeQuery.data && deptTreeQuery.isError) ||
      (!roleDeptIdsQuery.data && roleDeptIdsQuery.isError))

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.reset(buildRoleActionDefaultValues())
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? '编辑角色' : '新建角色'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? '更新角色的基础信息、菜单权限与数据权限范围。'
              : '创建新的角色，并配置其菜单权限与数据权限范围。'}
          </DialogDescription>
        </DialogHeader>

        <div className='max-h-[70vh] overflow-y-auto py-1 pe-1'>
          {hasLoadError ? (
            <div className='rounded-md border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive'>
              菜单或角色权限数据加载失败，请关闭弹窗后重试。
            </div>
          ) : isEditDataLoading ? (
            <div className='space-y-3 p-2'>
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-32 w-full' />
            </div>
          ) : (
            <Form {...form}>
              <form
                id='role-form'
                onSubmit={(event) => {
                  void form.handleSubmit((values) => {
                    if (isEdit) {
                      if (!values.id || !values.version) {
                        toast.error('角色信息缺失，请关闭弹窗后重试。')
                        return
                      }

                      updateMutation.mutate({
                        ...values,
                        id: values.id,
                        version: values.version,
                      })
                      return
                    }

                    createMutation.mutate(values)
                  })(event)
                }}
                className='space-y-4 px-0.5'
              >
                <Tabs defaultValue='basic' className='w-full'>
                  <TabsList>
                    <TabsTrigger value='basic'>基础信息</TabsTrigger>
                    <TabsTrigger value='menu'>菜单权限</TabsTrigger>
                    <TabsTrigger value='data-scope'>数据权限</TabsTrigger>
                  </TabsList>

                  <TabsContent value='basic' className='pt-2'>
                    <div className='grid gap-4 md:grid-cols-2'>
                      <FormField
                        control={form.control}
                        name='roleName'
                        render={({ field }) => (
                          <FormItem>
                            <RequiredFormLabel>角色名称</RequiredFormLabel>
                            <FormControl>
                              <Input
                                placeholder='例如：运营管理员'
                                disabled={isSaving}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='roleKey'
                        render={({ field }) => (
                          <FormItem>
                            <RequiredFormLabel>角色标识</RequiredFormLabel>
                            <FormControl>
                              <Input
                                placeholder='例如：ops_manager'
                                disabled={isSaving || isEdit}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='orderNum'
                        render={({ field }) => (
                          <FormItem>
                            <RequiredFormLabel>显示顺序</RequiredFormLabel>
                            <FormControl>
                              <Input
                                inputMode='numeric'
                                placeholder='0'
                                disabled={isSaving}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='status'
                        render={({ field }) => (
                          <FormItem>
                            <RequiredFormLabel>角色状态</RequiredFormLabel>
                            <SelectDropdown
                              isControlled
                              value={field.value}
                              onValueChange={field.onChange}
                              items={[
                                { label: '启用', value: '1' },
                                { label: '停用', value: '0' },
                              ]}
                              disabled={isSaving}
                              className='w-full'
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='remark'
                        render={({ field }) => (
                          <FormItem className='md:col-span-2'>
                            <FormLabel>备注</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder='请输入角色备注（选填）'
                                className='min-h-24 resize-none'
                                disabled={isSaving}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value='menu' className='pt-2'>
                    <FormField
                      control={form.control}
                      name='menuIds'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>菜单权限</FormLabel>
                          <FormControl>
                            {isMenuLoading ? (
                              <Skeleton className='h-64 w-full' />
                            ) : (
                              <CheckableTree
                                nodes={menuTreeQuery.data ?? []}
                                selectedIds={field.value}
                                onChange={field.onChange}
                                disabled={isSaving}
                                emptyText='暂无可分配的菜单。'
                              />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value='data-scope' className='space-y-3 pt-2'>
                    <FormField
                      control={form.control}
                      name='dataScope'
                      render={({ field }) => (
                        <FormItem>
                          <RequiredFormLabel>数据权限范围</RequiredFormLabel>
                          <SelectDropdown
                            isControlled
                            value={field.value}
                            onValueChange={field.onChange}
                            items={roleDataScopeOptions.map(
                              ({ label, value }) => ({ label, value })
                            )}
                            disabled={isSaving}
                            className='w-full md:w-72'
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {isCustomScope ? (
                      <FormField
                        control={form.control}
                        name='deptIds'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>可访问部门</FormLabel>
                            <FormControl>
                              {hasDeptScopeError ? (
                                <div className='rounded-md border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive'>
                                  当前账号无权读取部门树，无法配置自定义部门范围，请联系管理员或改选其他数据权限。
                                </div>
                              ) : isDeptLoading ? (
                                <Skeleton className='h-64 w-full' />
                              ) : (
                                <CheckableTree
                                  nodes={deptTreeQuery.data ?? []}
                                  selectedIds={field.value}
                                  onChange={field.onChange}
                                  disabled={isSaving}
                                  emptyText='暂无可分配的部门。'
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}
                  </TabsContent>
                </Tabs>
              </form>
            </Form>
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            type='submit'
            form='role-form'
            disabled={
              isSaving || isEditDataLoading || hasLoadError || hasDeptScopeError
            }
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
