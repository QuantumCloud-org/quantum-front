# quantum-front Convention Pack — 生成约定

> 契约①实现，供 `scaffold-page-gen` skill 消费。描述"怎么给 quantum-front 正确生成一个系统管理页面"。
> 结论全部来自实探 `src/features/system/user/` + `src/features/system/role/`（2026-07 代码状态），非凭记忆编造。
> 生成后必须通过 `validate.md` 的校验命令。

## 技术底座

React 19 + Vite + TypeScript(strict) + TanStack Router(file-based) / Query / Table + zod v4 + zustand +
shadcn/Radix + `bun`（包管理器 + 测试跑者 `bun test`）。UI 组件走 `src/components/ui`（shadcn 生成，不改）。

## Feature 模块结构（对齐 `user` / `role`）

```
src/features/<module>/<entity>/
  index.tsx                    页面组件：解析 search → useQuery 拉列表 → 拼 Header/Main/Table/Dialogs
  api.ts                       唯一网络层：apiClient 调用 + normalize（后端 unknown → 前端强类型）
  model.ts                     类型定义 + payload/query 构造函数（buildXxxPayload / buildXxxListQuery）
  search-schema.ts             zod search schema（URL 状态，供 TanStack Router validateSearch 用）
  <entity>-management-access.ts   权限守卫：把菜单权限码 (system:<entity>:<action>) 收敛成布尔态
  <entity>-guards.ts (可选)     业务规则守卫，如"内置账号不可选中/编辑"（非权限，是业务保护）
  data.ts 或 data/data.ts       展示态常量：状态/性别等 label-value 映射 + tone（颜色）+ getXxxLabel
  data/schema.ts (可选拆分)     纯类型定义，当 model.ts 类型 + 逻辑混杂过重时才拆出
  components/
    <entity>s-provider.tsx      React Context：open(dialog 类型) + currentRow 状态
    <entity>s-dialog-state.ts   dialog 类型 union + 生命周期辅助函数（何时清 currentRow）
    <entity>s-dialogs.tsx       汇总 add/edit/delete 等 Dialog，接 Provider
    <entity>s-table.tsx         TanStack Table 实例化 + Toolbar + 分页 + 选中态
    <entity>s-columns.tsx       ColumnDef[] + getXxxColumns({enableBulkActions, enableRowActions}) 过滤器
    <entity>s-primary-buttons.tsx  页面右上角"新建"按钮，受 canCreateXxx 权限门控
    <entity>s-action-dialog.tsx     新建/编辑共用 Dialog（react-hook-form + zod）
    <entity>s-action-dialog-form.ts  该 Dialog 的 zod schema + buildXxxDefaultValues
    <entity>s-delete-dialog.tsx     单条删除二次确认（要求输入实体名确认）
    <entity>s-multi-delete-dialog.tsx  批量删除二次确认
    data-table-row-actions.tsx      行内操作菜单（编辑/状态切换/删除...），受权限门控
    data-table-bulk-actions.tsx     批量操作工具条（受权限门控）
```

命名规范：目录用小驼峰实体名单数（`user`/`role`），组件文件/类型用大驼峰实体名单数前缀
（`User`/`Role`），组件文件名和 Context/Provider 用复数（`users-table.tsx`/`UsersProvider`）——
与既有 `user`/`role` 目录保持一致，禁止新造风格（如 `Users` 目录名或单数 Provider）。

## 路由挂载方式（实探结论，新增页面无需新建 route 文件）

quantum-front 用**单一动态路由**承载所有后端菜单驱动的页面，不是"每个 feature 一个 `.tsx` route 文件"：

- 路由定义在 `src/routes/_authenticated/$section/$page.tsx`（TanStack Router file-based route，
  参数化路径 `/$section/$page`）。`beforeLoad` 里：
  1. 用 URL pathname 查 `getBackendPageByPath(pathname)`（`src/app/navigation/page-registry.tsx`），
     找不到 → `redirect({ to: '/404' })`。
  2. 拉 `/system/menu/getRouters`（`navigationQueryOptions()`），在返回的菜单树里
     `findBackendRouteByPath` 找到匹配的后端路由节点，找不到 → `redirect({ to: '/403' })`
     （说明当前用户没有这个菜单，即使 URL 存在）。
  3. 校验 `backendRoute.router.component === pageDefinition.backendComponent`，防止路径和组件被后端错配。
  4. `ensureRouteAccess` 用菜单节点的 `meta.permission` / `meta.roles` 再做一次权限兜底重定向到 `/403`。
  - `component: RouteComponent` 从 `pageDefinition.render({ navigate, search })` 渲染具体 Feature 页面。

- **挂载新页面 = 在 `src/app/navigation/page-registry.tsx` 的 `backendPageDefinitions` 数组里加一条**：

  ```ts
  {
    backendComponent: '<module>/<entity>/index',  // 必须和后端 sys_menu.component 字段完全一致
    fullPath: '/<module>/<entity>',                // 必须和后端 sys_menu 拼出的全路径完全一致
    render: (props) => <XxxManagementPage {...props} />,
  }
  ```

  同时在文件顶部加 `import { XxxManagementPage } from '@/features/<module>/<entity>'`。
  **不需要**新建 `src/routes/**` 文件——动态路由已经覆盖所有 `/$section/$page` 形态的路径。

- 菜单展示（左侧导航 + 面包屑）由 `src/app/navigation/registry.ts` 的 `buildNavigationGroups` /
  `getBreadcrumbsForPath` 从同一份后端菜单树 + `page-registry` 派生，无需单独维护，**但要求后端
  `menu-permission.sql` 落库的 `component` 字段与 `page-registry.tsx` 里的 `backendComponent`
  字符串完全一致**，否则页面能通过 URL 直达但不出现在左侧菜单（`getBackendPageByComponent` 匹配不到）。

- 认证与会话由 `src/routes/_authenticated/route.tsx` 统一处理（`bootstrapAuthSession`，401→`/sign-in`，
  403→`/403`），子路由不需要重复登录态判断。

## API 层约定（对齐 `lib/http.ts` + `api.ts`）

- 唯一出口 `apiClient`（`@/lib/http`，axios 实例）：`baseURL` 走 `VITE_API_BASE_URL`
  （`.env.dev`=`/api`，`.env.produce`=`/talent_manger`），请求拦截器自动挂 `Authorization` +
  `X-Device-Id`，响应拦截器捕获 401 做登出重定向。**生成代码禁止自建 axios 实例或裸 `fetch`**。
- 响应体统一 `ApiResult<T>`（`src/types/api.ts`：`{code, message, data, traceId?, timestamp}`）。
  **判成功走 HTTP status（axios 2xx 自动 resolve，非 2xx 走 catch），不读 `body.code`**——
  与后端 `Result` 契约对齐的约定见 `src/types/api.ts` 顶部注释。
- `api.ts` 内固定分两层：
  1. `normalizeXxx(input: unknown): Xxx`——把后端返回的 `unknown` 转成前端强类型，字段缺失要有兜底
     （`String(x ?? '')` / `normalizeNullableText` / `normalizeXxxStatus` 模式）。**所有 Long 型主键 /
     外键字段（id、deptId、roleIds...）必须过 `toId`/`toIdList`（`@/lib/ids`），不可 `Number()`**——
     雪花 ID 超过 JS 安全整数会丢精度，`toId` 已把此规则写进注释。
  2. 导出的 `fetchXxx` / `createXxx` / `updateXxx` / `deleteXxx` / `changeXxxStatus` 函数，
     直接 `apiClient.get/post/put/delete`，返回值已 normalize，不对外暴露 `ApiResult` 包裹。
- 列表分页用 `PagedResult<T>`（`{pageNum, pageSize, total, pages, records}`），与后端 `PageResult` 对齐。
- 删除支持批量：`deleteXxxs(ids: string[])` 用 `ids.join(',')` 拼 path（对齐后端 `/{ids}` 逗号分隔）。
- react-query 用法：
  - `queryKey` 分层数组 `['system', '<entity>s', 'list', search]` /
    `['system', '<entity>s', 'detail', id]` /`['system', '<entity>s', 'roles'|'menus'|'depts', id]`，
    第一段固定业务域前缀，第二段实体复数，第三段动作。
  - 列表查询用 `placeholderData: keepPreviousData`（翻页不闪烁）。
  - 详情/关联数据查询用 `enabled: open && isEdit && Boolean(currentRow?.id)` +
    `staleTime: 0`（弹窗每次打开强制拉新，避免脏数据）。
  - mutation 统一 `onError: handleServerError`（`@/lib/handle-server-error`，解析 `AxiosError` 里的
    `message`/`title`，thrown 非 Axios 错误兜底"操作失败，请稍后重试。"，`toast.error` 展示）。
  - mutation 成功后 `queryClient.invalidateQueries({queryKey: [...]})`，作用域精确到该资源，
    不要整树失效。

## 表单约定（react-hook-form + zod）

- `<entity>s-action-dialog-form.ts` 导出 `xxxActionFormSchema`（zod）+ `XxxActionForm`（`z.infer`）+
  `buildXxxActionDefaultValues(currentRow?, detail?, ...relatedIds)`。
- 新建/编辑复用同一个 Dialog 组件和同一个 schema，用 `isEdit: boolean` 字段区分校验分支
  （`.refine((data) => data.isEdit || <仅新建校验>, {message, path})`），典型场景：密码字段仅新建必填。
- 字段级校验规则来自实测 `user`：用户名 `2-20` 位 `[a-zA-Z0-9_]`，昵称 `≤10`，手机号
  `1[3-9]\d{9}`，邮箱基础正则，备注 `≤500`；**新页面按需定义等价强度的规则，不得跳过必填校验**。
- 表单接入 `zodResolver`；提交失败（校验不过）滚动聚焦第一个 `aria-invalid="true"` 字段
  （`users-action-dialog.tsx` 的 `onSubmit` 第二参数模式，直接复用）。
- `RequiredFormLabel` 局部小组件（红色 `*` + label）在必填字段前统一使用。
- 下拉用 `SelectDropdown`（单选）/ 自定义 `XxxMultiSelect`（多选，如 `UsersRoleMultiSelect`）；
  树形数据（部门/菜单）用 `flattenDeptOptions` 打平 + 缩进符号 `└─` 模式，或
  `roles-checkable-tree.tsx` 的可勾选树（数据权限/菜单分配场景）。
- 关联数据（角色列表、部门树）用独立 `useQuery`（`enabled: open`），Dialog 内部处理
  `isPending`/`isError` 展示态，不让表单在依赖数据未就绪时可提交（`disabled={isSaving ||
  isEditDataLoading || isDependencyLoading || hasFormDataError}`）。

## 表格约定（TanStack Table）

- 受控由 `useTableUrlState`（`@/hooks/use-table-url-state`）驱动：URL search 与
  `columnFilters`/`pagination` 双向同步，`manualPagination: true` + `manualFiltering: true`
  （数据过滤/分页在后端做，前端只透传参数）。
- 列定义 `getXxxColumns({enableBulkActions, enableRowActions})` 返回过滤后的 `ColumnDef[]`：
  - `select` 列（复选框）受 `enableBulkActions` 门控；`actions` 列受 `enableRowActions` 门控。
  - 内置/受保护记录（如 `admin` 用户、超管角色）通过 `enableRowSelection` 回调 +
    `<entity>-guards.ts` 的 `canSelectXxx` 排除，防止误删关键数据。
  - 时间字段统一 `formatDateTimeCell`（`toLocaleString('zh-CN', {...}, hour12:false)`），
    空值兜底 `'未记录'`。
  - 空文本字段兜底提示（`'未分配'`/`'未设置'`/`'未填写'`），不要留空白。
- `DataTableToolbar` 的 `searches`（文本搜索框）与 `filters`（分面筛选，如状态/性别）声明式配置，
  对应 `data.ts` 里的 `xxxStatuses`/`xxxSexOptions` 常量。
- 分页组件 `DataTablePagination` + 批量操作 `DataTableBulkActions` 固定挂在表格底部。

## 权限守卫（默认生成，安全默认启用 + 显式豁免）

> 对齐后端 conventions.md 决策："安全校验默认启用，豁免必须显式声明"，前端镜像执行。

- **每个生成页面必须带 `<entity>-management-access.ts`**，导出 `getXxxManagementAccess(user)`：
  用 `hasPermission(user, 'system:<entity>:<action>')`（`@/app/auth/access`）把菜单权限码
  收敛为布尔态（`canCreateXxx`/`canEditXxx`/`canDeleteXxx`/`canBulkDeleteXxx`/`hasRowActions`...）。
  这是**唯一**权限判定入口，组件里不允许直接裸调 `hasPermission`（`DataTableBulkActions`
  例外：仅单一权限点场景可用 `useAccess({permissions:[...]})` hook 直接判定）。
- 关联操作要求前置权限一并校验（例：`canCreateXxx` 除了 `xxx:add` 还要求
  `system:role:query` + `system:dept:treeselect`，因为新建表单要拉角色/部门下拉数据 —
  没有下拉数据权限，创建功能形同虚设）。
- 路由级兜底见"路由挂载方式" 一节的 `ensureRouteAccess`（菜单节点 `meta.permission`/`meta.roles`）—
  这是**第二道**防线（第一道是左侧菜单不渲染，第二道是 URL 直达也拦截）。
- **显式豁免行**：若某生成页面判定为无需权限守卫（极少见，如纯只读的静态说明页），
  必须在生成报告中写一行：
  ```
  access-guard-exempt: <Entity> <原因>
  ```
  没有豁免行而缺 `<entity>-management-access.ts` 或页面组件未接入 = 生成未完成。

## Mock 数据约定（新增：demo 阶段 mock 优先）

> 现状：**工程目前没有 mock 机制**（已 grep 全仓确认，`src/` 下无 `mock`/`msw`/`faker` 相关文件）。
> 本节为 scaffold-page-gen 新设计的最小约定，服务于"前端先出页面 demo → 后端接口就绪后一键切换"的流程。

### 形态

- Mock 数据以**普通 TS 模块**形式存在，不引入 MSW/mock server 等运行时拦截框架（避免给单纯 demo
  阶段引入额外依赖和请求拦截复杂度；后续如需真正的网络层 mock 再评估引入 MSW）。
- 每个生成的 `<entity>` 模块固定生成 `mock.ts`（与 `api.ts` 同级），导出：
  - `mock<Entity>List: <Entity>[]`——手写的静态样例数组（3-5 条，覆盖各状态值），
    结构必须**完全对齐** `data/schema.ts` 或 `model.ts` 里的 `<Entity>` 类型（避免切回真实 API 时
    出现类型不一致才发现的返工）。
  - `buildMock<Entity>PagedResult(search): PagedResult<Entity>`——对 `mock<Entity>List` 做内存过滤
    /分页，模拟 `fetchXxx` 的返回形状（分页字段名必须是 `pageNum/pageSize/total/pages/records`）。

### 存放与切换开关

- 文件路径固定：`src/features/<module>/<entity>/mock.ts`。
- 切换方式：`api.ts` 顶部读一个模块级常量
  ```ts
  const USE_MOCK = import.meta.env.VITE_FEATURE_MOCK === 'true'
  ```
  各 `fetchXxx`/`createXxx` 等导出函数内部 `if (USE_MOCK) { return <mock 实现> }` 短路，
  真实分支保持不变（不删除，不注释掉）。**`USE_MOCK` 只能在 `api.ts` 顶层判断一次并短路返回，
  不允许散落到组件里判断**——保持"单一网络出口"约定不被破坏。
- 环境变量 `VITE_FEATURE_MOCK` 在 `.env.dev` 里默认不写（等价 `false`，即默认打真实 API）；
  开发者本地建 `.env.dev.local`（已被规范忽略，不提交）自行打开，或运行时用
  `VITE_FEATURE_MOCK=true bun run dev` 临时启用。**不允许把 `VITE_FEATURE_MOCK=true` 提交进
  `.env.dev`/`.env.produce`**（会导致联调/生产环境误用假数据，属于安全/正确性问题，
  validate.md 会做 grep 检查）。
- 对接真实后端时的收尾动作：确认接口联调通过后，删除 `mock.ts` 与 `api.ts` 里的 `USE_MOCK`
  分支（连同 `if (USE_MOCK)` 整段），而不是保留死代码——这是"切换真实 API"这一步的验收标准之一。

## 生成清单（一个标准管理页模块）

新增一个 `<module>/<entity>` 固定生成：`index.tsx` / `api.ts` / `model.ts`（或
`model.ts`+`data/schema.ts` 拆分）/ `search-schema.ts` / `<entity>-management-access.ts` /
`data.ts`（或 `data/data.ts`）/ `mock.ts` + `components/` 下 provider / dialog-state / dialogs /
table / columns / primary-buttons / action-dialog(-form) / delete-dialog / multi-delete-dialog /
data-table-row-actions / data-table-bulk-actions；并在 `page-registry.tsx` 追加一条注册
（不新建 route 文件）。

## 校验

见 `validate.md`。生成后未通过 `tsc -b --noEmit` 与 `eslint` 不算完成。
