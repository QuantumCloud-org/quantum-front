# 合并发现

基线为 `f23d2ad`。文件行号对应复核时的源码。Opus 的 F/O 与 Astra 的 S/E/R/D/G/M 原始编号均保留。

| ID | 来源 | 类别 | 严重度 | 文件:行 | 处置 |
|---|---|---|---|---|---|
| F14, F15 | Opus F14, F15、Astra R2 | 认证 | P0 | src/lib/http.ts:96–127；src/app/auth/session.ts:9–45；src/app/providers/query-client.ts:49 | 启动直接取 info；两层各自处理 401，缺少 refresh。 已修。启动与请求共享 refresh，移除 QueryCache 的 401 导航。登录和登出串行更新 Cookie，只有过期登出可以在自身流程内刷新并重放。见 `src/lib/http.test.ts`、`src/app/auth/session.test.ts`。 |
| F1 | Opus F1、Astra S2 | 安全 | P1 | src/lib/handle-server-error.ts:11；src/app/providers/query-client.ts:16；src/features/auth/sign-up/components/sign-up-form.tsx:50；src/features/auth/forgot-password/components/forgot-password-form.tsx:41 | 完整错误和表单值流入控制台。 已修。删除 AxiosError、表单值、找回邮箱地址的输出。检查 `src/lib/handle-server-error.ts`、`src/app/providers/query-client.ts` 与三个认证模板表单。 |
| F2 | Opus F2、Astra S1 | 会话隔离 | P1 | src/app/auth/session.ts:85；src/app/navigation/api.ts:31；src/features/settings/profile/components/profile-account-form.tsx:165–191 | 清 store 时未清 Query 缓存；菜单和资料使用跨身份 key，资料写回 store。 已修。会话边界清 QueryClient，菜单与资料按会话代次分键，并校验资料回写。见 `src/app/auth/session.test.ts` 的登出再登录场景。 |
| F16 | Opus F16 | 稳定性 | P1 | src/app/navigation/use-navigation.ts:8–10；src/routes/__root.tsx:14–18 | 根命令菜单查询只检查 user，启动可能过早请求。 已修。`src/app/navigation/use-menu-routers.ts` 要求当前用户与 access token，保留开发 mock。启动顺序见 `src/app/auth/session.test.ts`。 |
| F17 | Opus F17、Astra R1 | 稳定性 | P1 | src/features/system/user/components/users-table.tsx:81；src/features/system/role/components/roles-table.tsx:80；src/features/system/user/components/users-multi-delete-dialog.tsx:30；src/features/system/role/components/roles-multi-delete-dialog.tsx:31 | 表格使用行索引；确认时的目标从活动表格派生。 已修。用户与角色表按实体 ID 选中，分页、筛选及数据更换时清选中；确认框冻结且显示名称。TanStack Table 运行时测试见 `src/components/data-table/server-table-features.test.ts`。 |
| R3 | Astra R3 | 部署 | P1 | vite.config.ts:88–96；design.md:53 | 待办。生产路径由用户裁定为 /talent_manger/auth，开发代理源码证实本地路径不同。生产 cookie 分发、迁移与清理待后端和浏览器联调。 |
| F3 | Opus F3 | 安全 | P2 | src/routes/(auth)/sign-in.tsx:5；src/features/auth/sign-in/components/user-auth-form.tsx:122；src/features/errors/forbidden/index.tsx:28；src/lib/http.ts:120 | redirect 仅检查字符串；当前路由使用 to，开放重定向不成立；仍统一校验站内目标。 已修。四个认证回跳入口共用站内路径校验，当前开放重定向复核见上。见 `src/lib/sanitize-redirect.test.ts`。 |
| F4 | Opus F4、Astra S3 | 安全 | P2 | src/stores/auth-store.ts:21、124 | persist 将带个人资料的 user 写入 localStorage。 已修。存储版本迁移保留 deviceId 并落盘删除旧用户。见 `src/stores/auth-store.test.ts`。 |
| F5 | Opus F5 | 安全 | P2 | src/features/system/file/components/file-preview-dialog.tsx:35–49、104–108 | blob 保留响应 MIME 并交给 iframe；浏览器端可按明示的安全预览类型处理。 已修。预览 blob 的 MIME 按可预览扩展名选择。见 `src/features/system/file/model.test.ts`。目标浏览器的 PDF 显示待实测。 |
| F8 | Opus F8、Astra E1 | 性能 | P2 | src/components/data-table/toolbar.tsx:52–61；src/hooks/use-table-url-state.ts:161–191；src/features/system/user/api.ts:137 | 输入即时写 URL 并触发新查询；请求未接收 signal。 已修。输入草稿防抖 300 ms，兼顾 IME，URL 用 replace；用户和角色请求把 Query signal 交给 Axios。见 `src/components/data-table/debounced-search-input.tsx` 与两组列表 API。 |
| F9 | Opus F9 | 性能 | P2 | src/features/system/user/components/users-table.tsx:51；src/features/system/role/components/roles-table.tsx:53 | 权限列定义在每次渲染重建。 已修。用户和角色列定义按两项权限 memo 化。见 `users-table.tsx`、`roles-table.tsx`。 |
| F10 | Opus F10 | 缓存 | P2 | src/features/system/menu/index.tsx:137–178；src/features/system/role/components/roles-action-dialog.tsx:114–140 | 相关 mutation 成功后没有失效导航缓存。 已修。菜单增删改和角色菜单编辑后失效 navigation key 前缀。见 `src/features/system/menu/index.tsx`、`roles-action-dialog.tsx`。 |
| F18 | Opus F18 | 稳定性 | P2 | src/routes/__root.tsx:21；src/features/errors/general-error/index.tsx；src/app/navigation/page-registry.tsx:16 | 有全局错误边界；懒加载页无局部边界、重试与旧 chunk 恢复。 已修。Vite preload 失败时防循环重载，业务动态路由提供就地错误与重试。见 `src/lib/preload-recovery.ts`、`src/routes/_authenticated/$section/$page.tsx`。跨版本浏览器测试待运行。 |
| F19 | Opus F19 | 缓存 | P2 | src/features/system/user/components/users-action-dialog.tsx:130；src/features/system/role/components/roles-action-dialog.tsx:90；src/features/system/role/components/roles-data-scope-dialog.tsx:48 | 同一个部门树 key 使用两套 API 解析。 已修。用户、角色和数据范围弹窗复用 `deptTreeSelectQueryOptions()`。见 `src/features/system/dept/api.ts`。 |
| S4 | Astra S4 | 功能 | P2 | src/features/settings/password/components/password-form.tsx:43；src/components/profile-dropdown-settings-items.ts:15 | 自助改密提交只 reset。 已修。已收起入口，保留直达页及不可用提示。后端当前 AuthController 提供验证码、登录及个人资料接口，自助改密契约待后端提供。 |
| E2 | Astra E2 | 功能 | P2 | src/components/data-table/faceted-filter.tsx:93；src/features/system/user/model.ts:109；src/features/system/role/model.ts:91 | 控件多选，API 只用首项。 已修。控件只选一项，旧多值筛选在查询前归一化。见 `src/features/system/user/search-schema.test.ts`。 |
| E3 | Astra E3 | 性能 | P2 | src/app/navigation/icon-registry.ts:1；src/app/navigation/registry.ts:5；src/context/search-provider.tsx:2 | 根层命令面板静态导入导航，导航依赖完整动态图标索引。 已修。命令面板首次打开加载，导航常用图标静态映射，完整索引只进异步块。构建产物 `dist/index.html` 的 modulepreload 不含命令面板或 DynamicIcon。 |
| R4 | Astra R4 | 稳定性 | P2 | src/features/system/user/index.tsx:30；src/features/system/role/index.tsx:30；src/features/system/file/index.tsx:143；src/features/monitor/login-log/index.tsx:158；src/features/monitor/oper-log/index.tsx:173 | 占位页数通过五处纠偏逻辑可能改写深链。 已修。五张列表只在当前 query 的真实成功结果上纠偏，必要时退到最后一页。见用户、角色、文件、登录日志、操作日志页的条件。 |
| R5 | Astra R5 | 稳定性 | P2 | src/features/settings/profile/components/profile-account-form.tsx:242、255；src/app/providers/query-client.ts:27 | 保存后 fetchQuery 继承 10 秒 staleTime。 已修。PUT 后明确用 staleTime=0 拉取并等待当前会话资料；缺版本先强制读取。见 `profile-account-form.tsx` 的刷新和保存处理。 |
| R6 | Astra R6 | 稳定性 | P2 | src/features/system/user/components/users-action-dialog.tsx:169；src/features/system/role/components/roles-action-dialog.tsx:144 | 依赖的查询刷新后重跑表单初始化。 已修。编辑对话框等待本次打开的查询成功后初始化一次。用 QueryObserver 验证旧缓存会先进入 fetching，实际响应就绪后再显示编辑表单。后续后台刷新保留当前草稿。见 `users-action-dialog.tsx`、`roles-action-dialog.tsx`。 |
| R7 | Astra R7 | 稳定性 | P2 | src/features/monitor/online/index.tsx:103、129、493 | 批量强退部分失败时跳过刷新；筛选全选以数量计算。 已修。可见选择按会话 ID 交集，确认目标固定；逐项等待结果后刷新，保留失败目标可重试。见 `src/features/monitor/online/index.tsx`。 |
| F11 | Opus F11、Astra R8 | 稳定性 | P2 | src/hooks/use-table-url-state.ts:89–110、161–208；src/features/system/user/components/users-table.tsx:105 | 列筛选只初始化时读 URL，纠偏回调每次渲染重建。 已修。已提交的筛选值从 router search 派生，分页纠偏回调与筛选配置稳定。见 `src/hooks/use-table-url-state.ts`、两张列表表格。 |
| F29 | Opus F29、Astra G3, G4 | 模板 | P2 | src/features/auth/{sign-up,forgot-password,otp}/components；src/features/dashboard/index.tsx:34、73；src/features/auth/sign-in/index.tsx:33 | 模板认证和仪表盘使用演示行为；待办。按用户裁定保留，表单明文日志归 F1。 |
| O4 | Opus O4、Astra M2 | 类型 | P2 | tsconfig.app.json:31；tsconfig.node.json:23；package.json:13 | 测试在 tsc 项目图外，缺 Bun 类型。 已修。Bun 类型与 `tsconfig.test.json` 接入 `tsc -b`，验证见构建结果。 |
| F6 | Opus F6 | 发布 | P3 | package.json:2–3 | 模板包名且 private=false。 已修。`package.json` 设置 private=true，阻止误发布。 |
| F7 | Opus F7、Astra G5, S5 | 部署 | P3 | index.html:38–68；netlify.toml:1 | 待办。模板分享 URL、远程字体与生产 CSP 涉及 HTML 及部署层，超出设计写集；线上头待验证。 |
| F12 | Opus F12 | 性能 | P3 | src/features/system/user/components/users-table.tsx:101；src/features/system/role/components/roles-table.tsx:100；src/components/data-table/faceted-filter.tsx:119 | 服务端分页仍用当前页计算计数。 已修。移除两个服务端表格的 faceted 统计及当前页计数。见表格配置与 `faceted-filter.tsx`。 |
| F13 | Opus F13 | 性能 | P3 | src/features/system/user/components/data-table-row-actions.tsx:135；src/features/system/role/components/data-table-row-actions.tsx:135 | 待办。行内弹窗提升到 provider 涉及两条 CRUD 流程，合并到 F24。 |
| F20 | Opus F20 | 错误反馈 | P3 | src/features/system/menu/index.tsx:137、219；src/features/system/dept/index.tsx:128、196 | 全局 mutation 错误和本地字段错误可同时出现。 已修。菜单、部门编辑由页面处理字段错误，避免全局 mutation toast 重复通知。见两页的 create/update mutation。 |
| F21 | Opus F21、Astra D1 | 重复实现 | P3 | src/app/auth/api.ts:12；src/app/navigation/api.ts:9；src/features/system/user/api.ts:24–43 | 解包和部分基础归一化重复。 已修。各 API 在类型化响应上读取 data，归一化值复用 `src/lib/api-normalize.ts`，blob 与认证响应头走原传输语义。见构建与模型测试。 |
| F22 | Opus F22、Astra D2 | 重复实现 | P3 | src/features/system/dict/form.ts:96；src/features/system/dept/form.ts:76；src/features/system/menu/form.ts:122；src/features/settings/profile/profile-account-form-errors.ts:24 | 待办。字段规则与一般错误回退各异，抽取需保行为测试。 |
| F23 | Opus F23 | 重复实现 | P3 | src/lib/http.ts:18；src/stores/auth-store.ts:68 | 两个 Bearer 前缀解析。 已修。Bearer 解析集中在 `src/lib/auth-token.ts`，见 HTTP refresh body 和 header 测试。 |
| F24 | Opus F24、Astra D3 | 重复实现 | P3 | src/features/system/user/components/users-dialogs.tsx:14；src/features/system/role/components/roles-dialogs.tsx:14；同目录 provider、table、row-actions | 待办。两条 CRUD 与关闭生命周期同构，和列表、批删修复同批抽象会扩大回归面。 |
| F25 | Opus F25 | 配置 | P3 | vite.config.ts:9–41 | 待办。手写配置解析存在；迁移需改 .env 文件，超出授权。 |
| F26 | Opus F26、Astra G1 | 死代码 | P3 | src/features/settings/{account,appearance,display,notifications}；src/features/settings/components/sidebar-nav.tsx；src/features/settings/profile/components/profile-form.tsx；src/components/{date-picker,theme-switch}.tsx；src/components/layout/{team-switcher,top-nav}.tsx；src/features/system/components/system-placeholder-page.tsx | 仅定义或死文件间互引；四个旧设置路由目前为 redirect。 已修。删除孤立组件和设置模板实现。保留四个旧设置路由的跳转，构建与 Knip 通过。 |
| F27 | Opus F27、Astra G2 | 死代码 | P3 | src/features/system/file/api.ts:43、86–96；src/stores/auth-store.ts:95 | 三个文件接口和 clearUser 无外部引用；bootstrapStatus 原来只写入。 已修。删无引用文件接口和 clearUser，启动状态由会话协调器管理。构建与 Knip 通过。 |
| F28 | Opus F28 | 死依赖 | P3 | src/components/ui/{calendar,radio-group}.tsx；src/components/config-drawer.tsx:2；package.json | calendar/date-fns/react-day-picker 依赖链无可达入口。删除 Radix radio-group 不成立，ConfigDrawer 直接导入。react-is 是 Recharts peer。 已修。删除 Calendar、RadioGroup 的死包装及 react-day-picker、date-fns。Radix Radio Group 的死依赖判断不成立，ConfigDrawer 直接消费。react-is 按 Recharts peer 保留并升级。 |
| F30 | Opus F30 | 死代码 | P3 | src/features/system/role/components/roles-action-dialog.tsx:1、134；src/components/ui/dialog.tsx:1 | Vite SPA 存在无效 use client；role detail key 只在失效处引用。 已修。移除 Vite SPA 中自有的 use client 指令和无消费者的角色 detail cache 失效。构建与 Knip 通过。 |
| O1 | Opus O1、Astra M1 | 过时写法 | P3 | src/features/system/menu/form.ts:13、46–77；src/features/system/user/components/users-action-dialog-form.ts:39 | 旧 schema message、ZodIssueCode 和默认导入存在。 已修。Zod 导入统一为命名导入，schema 参数改用 error，菜单跨字段校验使用 refine。见 `src/features/system/menu/form.ts` 与构建。 |
| O2 | Opus O2 | 过时写法 | P3 | src/app/navigation/api.ts:29–35；src/features/system/user/index.tsx:24 | 查询 options 和 key 内联。 已修。`src/lib/query-keys.ts` 统一构造 query key 与失效前缀，查询定义使用 queryOptions。构建与 lint 通过。 |
| O3 | Opus O3 | 过时写法 | P3 | eslint.config.js:14 | 目前无类型感知 Promise 规则。 已修。ESLint 为应用、Node 配置和测试启用类型感知检查，no-floating-promises 与 no-misused-promises 均为 error。lint 退出码 0。 |
| O5 | Opus O5 | 工具链 | P3 | package.json:5 | 声明 bun@1.3.14；本机实测 1.4.4。 已修。`package.json` 声明 bun@1.4.4，实际安装、构建、测试使用 1.4.4。 |
| O6 | Opus O6 | 依赖 | P3 | src/components/data-table/{column-header,faceted-filter,pagination,toolbar,view-options}.tsx | 待办。Radix 图标有活跃引用；换图标属于视觉偏移，保留。 |
| E4 | Astra E4 | 性能 | P3 | src/app/navigation/use-navigation.ts:13；src/components/layout/header-breadcrumb.tsx:43 | 面包屑消费原始树，却调用导航分组构建。 已修。面包屑直接订阅原始菜单树，导航分组在用到的组件中 memo 化。见 `use-menu-routers.ts`、`use-navigation.ts` 和 `header-breadcrumb.tsx`。 |

## 后端接口同步

| 范围 | 第二轮处置 | 单测 |
|---|---|---|
| S17 | 登录和刷新响应类型包含秒数 `expiresIn`。刷新从 `data.accessToken` 更新令牌，沿用登录设备 ID，发送 Cookie 且移除 Authorization。 | `src/lib/http.test.ts` |
| 字典 S08、S09、E16 | 四种写请求使用 DTO 字段白名单，修改附带字符串 `id`、`version` 并保留分组编码。字典项使用服务端分页，详情空值和 404 按空结果处理。 | `src/features/system/dict/api.test.ts` |
| 用户导入和导出 | 按后端权限提供入口。导入展示行号、用户名、状态和纯文本消息，校验失败显示回滚行。导入提示 1,000 行，导出提示 10,000 行并采用当前筛选条件。 | `src/features/system/user/transfer.test.tsx` |
| 个人资料 | 联系方式编辑框默认留空，脱敏联系方式用占位符展示，提交只携带实际填入的新值。 | `src/features/settings/profile/profile-account-model.test.ts` |
| 菜单下拉树 | 角色授权沿用现有递归树，覆盖三级 `children` 归一化和子菜单渲染。 | `src/features/system/role/menu-tree-select.test.tsx` |
| 审计日志 | 登录日志和操作日志的清空操作要求 `admin` 角色。两种请求遇到 403 都提示联系超管。 | `src/features/monitor/log-clean.test.ts` |

## E2E 发现

### E2E-1（P1）首次打开登录页时验证码加载失败

- **根因**　启动 refresh 返回 401 后关闭会话并递增代际。原请求拦截器给所有请求写入 `authAttempt.generation`，验证码虽未绑定会话的取消信号，其 200 响应仍在响应拦截器被判为过期。见 `src/app/auth/session.ts:59`、`src/lib/auth-session-channel.ts:43`、`src/lib/http.ts:265`。
- **修法**　验证码、登录、刷新以及以 `skipSession` 显式标记的公开请求直接交付响应，保留调用方取消信号，不附会话令牌、不触发 401 刷新重放。受保护请求继续校验会话代际，旧会话写请求换号后会被拒绝。刷新结果写回会话前也继续校验代际。见 `src/lib/http.ts:30`、`src/lib/http.ts:165`、`src/lib/http.ts:221`、`src/lib/http.ts:308`。
- **回归测试**　`delivers an in-flight captcha after startup refresh returns 401` 修复前失败、修复后通过。`a write cannot replay with another server session and its private cache is cleared` 仍通过。公开响应覆盖 `%s preserves its %i response across a session change`。见 `src/app/auth/session.test.ts:96`、`src/app/auth/session.test.ts:202`、`src/lib/http.test.ts:266`。
- **浏览器**　Playwright 在本地 Chromium 打开 `/sign-in`，以受控 HTTP 响应让 refresh 401 先关闭会话，再交付在途验证码 200。首次加载即显示验证码，登录按钮可用，无需手动切换。
- **检查**　`bun run build`、`bun test`（112 通过）、`bun run lint`、`bun run knip` 退出码均为 0。build 和 knip 在同一 worktree 下排除 `.env*` 的副本中运行。
