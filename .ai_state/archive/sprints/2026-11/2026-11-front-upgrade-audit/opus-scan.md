## 前端只读审查清单：quantum-front-wt-upgrade @ f23d2ad

结论：共 30 条，P0 1、P1 5、P2 10、P3 14。没有改任何文件。
- **最急的是 S17**：`src` 下搜 `auth/refresh|refreshToken|refresh_token`，0 命中。后端一去掉过滤器自动续期，前端在页面刷新或 access token 过期时会直接把用户踢回登录页。
- **另外 4 条 P1 应与 S17 同批修**：生产环境日志打出密码和 token、登出不清 Query 缓存、表格多选按行号记、导航菜单请求抢在 bootstrap 之前。

**审查限制**：
- 我手上没有 shell，没跑 build、test、lint、knip、`bun audit`。依赖 CVE 和 knip 结果标「待验证」。
- worktree 里没有 `node_modules`，router-core 和 recharts 的源码是在 `../quantum-front/node_modules` 里核对的，版本可能与升级后不同。
- 死代码结论都来自 Grep，「0 命中」指的是除定义处外没有其他引用。

### 1. 安全

| ID | 严重度 | 文件:行 | 问题 | 改法 | 风险/需补测试 |
|---|---|---|---|---|---|
| F1 | P1 | src/lib/handle-server-error.ts:10-11 | 所有环境都 `console.log(error)` 整个 AxiosError：`config.data` 里有登录密码、重置的新密码，`config.headers.Authorization` 里有 Bearer token。user-auth-form.tsx:79/127、users-action-dialog.tsx:146/166 都会走到 | 删掉这行，或只在 DEV 下打 `{status, url, traceId}`；query-client.ts:16 也一并收紧 | 单测：PROD 下不调 console；登录失败后 console 里没有 password |
| F2 | P1 | src/app/auth/session.ts:85-93；src/stores/auth-store.ts:111-119；src/app/navigation/api.ts:31-33 | 登出或 reset 不清 QueryClient。`['navigation','routers']` 不区分用户，staleTime 5 分钟，同一 tab 换账号后 `_authenticated` 的 `ensureQueryData` 会拿到上一个人的菜单。更严重的是 profile-account-form.tsx:164-191：缓存里的 `['auth','current-user']` 一挂载就被 effect `setUser` 写回 store，B 的会话短时间内带着 A 的角色和权限，并被持久化 | 在 main.tsx 注册 `onSessionEnd`，里面调 `queryClient.clear()`，logout、reset、refresh 失败时都触发；登录成功后再清一次 | 测试：A 登出、B 登录后，navigation query 会重新请求 |
| F3 | P2 | src/routes/(auth)/sign-in.tsx:5-7；src/features/auth/sign-in/components/user-auth-form.tsx:122-125；src/features/errors/forbidden/index.tsx:28-32；src/lib/http.ts:120-122 | `redirect` 只校验是字符串。现在用的是 `navigate({to})`，被当成站内路径，所以暂不可利用。但 router-core 的 `navigate` 遇到能解析成 URL 的 `href` 会自动走 `reloadDocument`，执行 `window.location`（router.js:458-490）。只要后续写者改用 `href`，就成了开放重定向 | 在 zod schema 里 refine：必须以 `/` 开头，且不以 `//` 开头、不含 `\`，不合法就 `.catch(undefined)`；四处共用一个 `sanitizeRedirect()` | 单测：`https://evil`、`//evil`、`/\evil` 都退回 `/` |
| F4 | P2 | src/stores/auth-store.ts:124-127 | 把 `user`（手机号、邮箱、roles、permissions）持久化到 localStorage：任何 XSS 都能读到，关掉 tab 也还在，权限会过期失真。S17 之后每次启动都会重新拉 /auth/info，没有理由再存 | `partialize` 只留 `deviceId` | 改后 `_authenticated` 的判断逻辑不变；测试持久化内容只含 deviceId |
| F5 | P2（待验证） | src/features/system/file/components/file-preview-dialog.tsx:35-38,104-108 | 用 iframe 加载 `blob:` URL，MIME 取自服务端的 Content-Type，而 `blob:` 继承本站 origin。如果后端对伪装成 .pdf 的 HTML 返回 `text/html`，脚本就会在本站执行 | 按扩展名重新包一层：`new Blob([blob], {type:'application/pdf'})`，图片同理；iframe 考虑加 `sandbox`（会不会影响 Chrome PDF 查看器待验证） | 需与后端确认 preview 接口的 Content-Type 来源 |
| F6 | P3 | package.json:2-3 | `"name":"shadcn-admin"`、`"private":false`，有误 `npm publish` 的风险 | 改成 `private: true`，项目改名 | 无 |
| F7 | P3 | index.html:38-60,63-68 | og/twitter meta 还指向 shadcn-admin.netlify.app；外链 Google Fonts，内网系统会把访问泄露给 Google，也妨碍 CSP；没有 CSP | 删掉 og/twitter；字体自托管（@fontsource）；在部署层加 CSP，至少包含 `default-src 'self'; img-src 'self' data: blob:; frame-src blob:; connect-src 'self'` | 加 CSP 后人工回归预览、验证码图片、图表 |

### 2. 低效

| ID | 严重度 | 文件:行 | 问题 | 改法 | 风险/测试 |
|---|---|---|---|---|---|
| F8 | P2 | src/components/data-table/toolbar.tsx:52-61；src/hooks/use-table-url-state.ts:161-191 | 搜索框每敲一个字都会走 `setFilterValue → navigate`，queryKey 跟着变，每个键都发一次请求；`navigate` 也没带 `replace`，浏览器历史被刷满 | toolbar 输入框用本地 state，300ms debounce 后再提交；过滤改动的 `navigate` 带上 `replace: true` | 用户、角色列表回归 |
| F9 | P2 | src/features/system/user/components/users-table.tsx:51-54；src/features/system/role/components/roles-table.tsx:53-56 | `columns` 每次渲染都新建，TanStack Table 要求 columns 稳定，否则每次渲染都重算列模型 | 用 `useMemo`，依赖两个权限布尔值 | 无 |
| F10 | P2 | src/features/system/menu/index.tsx:137-178；src/features/system/role/components/roles-action-dialog.tsx:114-140 | 菜单增删改、角色改菜单权限后，没有让 `['navigation','routers']` 失效，侧边栏和路由守卫最多滞后 5 分钟 | onSuccess 里再 `invalidateQueries({queryKey:['navigation']})` | 无 |
| F11 | P3 | src/hooks/use-table-url-state.ts:89-108,193-208；users-table.tsx:105-107 | `ensurePageInRange` 每次渲染都是新函数，effect 也就每次渲染都跑；`columnFiltersCfg` 是字面量数组，useMemo 等于没用；`columnFilters` 只在初始化时读 URL，浏览器前进后退后输入框和 URL 对不上 | 对 cfg 和回调做 memo，或让 effect 只依赖 `pageCount`；`columnFilters` 直接从 search 派生 | 无 |
| F12 | P3 | users-table.tsx:101-102；roles-table.tsx:100-101；src/components/data-table/faceted-filter.tsx:38,119-121 | 服务端分页却挂了 `getFaceted*`，筛选项旁的计数只统计当前页，有误导 | 删掉 faceted row model 和计数显示 | 无 |
| F13 | P3 | src/features/system/user/components/data-table-row-actions.tsx:135-144（角色同构） | 每一行都挂一个 Status 弹窗和一个 ResetPassword 弹窗，后者带 useForm 和两个 query observer | 像 edit/delete 一样提升到 UsersDialogs，用 provider 里的 `open` 控制 | 无 |

### 3. 稳定性

| ID | 严重度 | 文件:行 | 问题 | 改法 | 风险/测试 |
|---|---|---|---|---|---|
| F14 | **P0** | src/lib/http.ts:110-127；src/app/auth/session.ts:9-45 | 没有 refresh。bootstrap 不带 token 就直接调 /auth/info，现在靠后端过滤器自动续期才能成功。S17 上线后，页面刷新和 access 过期都会 401，直接 reset 并跳登录 | 见下面「S17 改动」 | AC4 单测 |
| F15 | P1 | src/lib/http.ts:113-123 与 src/app/providers/query-client.ts:49-57 | 401 在两处处理：拦截器 reset 后整页 `location.replace`；queryCache 再弹一次英文 toast、再 reset、再 `router.navigate`。并发 401 时会重复执行、互相竞争 | 统一到 http 层；queryCache.onError 删掉 401 分支，只保留 500 | 测试：refresh 失败时只跳转一次 |
| F16 | P1 | src/app/navigation/use-navigation.ts:7-11；src/routes/__root.tsx:14-18 | CommandMenu 挂在 root 下（SearchProvider），它的 useNavigation 只以「持久化的 user 存在」为启用条件。冷启动或在登录页时，它会在 bootstrap 之前、不带 token 就请求 getRouters。S17 之后这个请求 401 会再触发一次 refresh，和 bootstrap 的 refresh 并发；refresh token 轮换时，第二个请求可能被判为重放，导致整个会话失效 | 改成 `enabled: Boolean(user && accessToken)`；bootstrap 与拦截器必须共用同一个单飞 Promise | app-providers.test.ts 断言 SearchProvider 在 root 下，所以不要挪 provider，改 enabled 条件即可 |
| F17 | P1 | users-table.tsx:56,94-98；roles-table.tsx:58,93-97；users-multi-delete-dialog.tsx:30-34 | 没设 `getRowId`，选中状态按行号记，换页、改筛选、窗口聚焦重新拉数据（PROD 开着 `refetchOnWindowFocus`）后，同一批行号指向了别的用户或角色。批量删除确认框只显示数量，会删错 | 设 `getRowId: r => r.id`；分页、筛选变化或 data 换引用时 `resetRowSelection()`；确认框列出待删除的名字 | 测试：选中后换页，选择被清空 |
| F18 | P2 | src/routes/__root.tsx:21-22；src/features/errors/general-error/index.tsx；src/app/navigation/page-registry.tsx:16-70 | 只有 root 一个 errorComponent，且忽略 `reset`；用 React.lazy 加载的页面在发版后旧 chunk 404，会整屏 500 | 监听 `vite:preloadError`，只重载一次；GeneralError 提供 `router.invalidate()` 重试；在 `$section/$page` 加路由级 errorComponent，保住侧边栏 | 无 |
| F19 | P2 | src/features/system/user/components/users-action-dialog.tsx:130-134 vs src/features/system/role/components/roles-action-dialog.tsx:90-95、roles-data-scope-dialog.tsx:48-53 | 同一个 key `['system','dept','treeselect']` 配了两个不同的 queryFn（user/api.ts:177 和 role/api.ts:170），谁先跑谁的结果被另一方复用。现在两边结构碰巧一致，任何一边改动都会悄悄打坏另一边 | 统一用一个 `deptTreeSelectQueryOptions()` | 无 |
| F20 | P3 | src/features/system/menu/index.tsx:137-160,219-262；src/features/system/dept/index.tsx:128-151,196-229 | create/update 没写 onError，全局 `mutations.onError` 会弹 toast，同时 `handleSaveError` 又写行内错误，用户收到两份提示 | 显式写 `onError: () => {}`，或去掉全局默认 | 无 |

### 4. 重复实现

| ID | 严重度 | 位置 | 问题 | 改法 |
|---|---|---|---|---|
| F21 | P3 | `unwrapResult`：13 个 api.ts（app/auth、app/navigation、features/*/api.ts）；`getRecord`：11 处；`toNullableString`：4 处；`toNumber`、`toStringValue`：2 处 | 同样的解包和规范化函数到处复制 | 收进 `src/lib/api-normalize.ts`（与 `lib/ids.ts` 并列） |
| F22 | P3 | dict/form.ts:96、dept/form.ts:76、menu/form.ts:122、settings/profile/profile-account-form-errors.ts:24 | 4 份按 `split(';')` 拆服务端错误、映射到字段的逻辑 | dict 里已有泛型版 `extractServerErrors`，提出来共用 |
| F23 | P3 | src/lib/http.ts:18-26 与 src/stores/auth-store.ts:68-70 | `stripBearerPrefix` 写了两份 | 只留一份 |
| F24 | P3 | user/ 与 role/ 下的 provider、dialogs、row-actions、bulk-actions、multi-delete、table 几乎一样（例如 users-provider.tsx 与 roles-provider.tsx 逐行同构）；src/hooks/use-dialog-state.tsx 只有 profile-dropdown 一处在用 | 增删改查的骨架复制了两遍 | 抽 `createCrudDialogContext<TRow, TDialog>()` 和通用 `ServerDataTable`。改动面大，建议放在 S17 之后单独做 |
| F25 | P3 | vite.config.ts:9-41 | 手写 .env 解析器 | 把 `.env.dev`、`.env.produce` 改名为 `.env.development`、`.env.production`，用 Vite 自带的 `loadEnv(mode, cwd, 'VITE_')`；保留强制把 MOCK 置为 false 的逻辑 |

### 5. 垃圾代码（Grep 证据）

| ID | 严重度 | 目标 | 证据 | 改法 |
|---|---|---|---|---|
| F26 | P3 | 死文件：`src/features/settings/{account,appearance,display,notifications}/**`、`settings/components/sidebar-nav.tsx`、`settings/profile/components/profile-form.tsx`、`src/components/date-picker.tsx`、`src/components/theme-switch.tsx`、`src/components/layout/team-switcher.tsx`、`src/components/layout/top-nav.tsx`、`src/features/system/components/system-placeholder-page.tsx` | 搜 `SettingsAccount\|SettingsAppearance\|SettingsDisplay\|SettingsNotifications`，只有定义处命中，对应 4 个路由文件只做 `throw redirect({to:'/settings'})`。`SidebarNav\b\|sidebar-nav`、`ProfileForm\b`、`TeamSwitcher\|TopNav\|ThemeSwitch`、`SystemPlaceholderPage` 都只命中定义；`DatePicker` 只被死文件 account-form 引用 | 删除；4 个 redirect 路由按需保留，防旧链接 404 |
| F27 | P3 | 死导出：src/features/system/file/api.ts:43 `fetchFileDetail`、:86-96 `getDownloadUrl`/`getPreviewUrl`；src/stores/auth-store.ts:95 `clearUser`；`bootstrapStatus` 只写不读 | 前三个搜函数名都只命中定义；`bootstrapStatus` 在 store 外只有 session.ts 里的 `setBootstrapStatus` 写入，没有任何选择器读取 | 删除。`bootstrapStatus` 若 S17 要用来控制 enabled 就留着，否则删 |
| F28 | P3 | 删掉 F26 后依赖变成未使用：`react-day-picker`、`date-fns`、`@radix-ui/react-radio-group`，以及 `src/components/ui/{calendar,radio-group}.tsx` | `react-day-picker` 只在 ui/calendar.tsx:7 被 import；`date-fns` 只在 date-picker.tsx:1-2；radio-group 只在 appearance-form、notifications-form 里用。knip.config.ts:5 忽略了 `src/components/ui/**`，所以 knip 报不出这些 | 和 F26 同一个提交删掉。**不要删 `react-is`**：src 里虽然 0 命中，但它是 recharts 的 peerDependency |
| F29 | P3（删页面需用户拍板） | 模板页面：`routes/(auth)/{sign-up,forgot-password,otp}.tsx` 与 `features/auth/{sign-up,forgot-password,otp}`（提交时 `console.log(data)` 加 `sleep` 假装成功：forgot-password-form.tsx:38-52、sign-up-form.tsx:47-55、otp-form.tsx:41-48）；`routes/_authenticated/errors/$error.tsx`（错误页展示路由）；`features/dashboard/**`（overview.tsx:3-50、analytics-chart.tsx:6-7 用 `Math.random` 造假数据）；`src/assets/brand-icons`（只有 sign-up 在用）；`lib/utils.ts:8` 的 `sleep`（只有 forgot-password 在用）；sign-in/index.tsx:33-45 链到不存在的 `/terms`、`/privacy`；query-client.ts:35,50,60 和 handle-server-error.ts:21 里的英文模板提示 | 搜 `'/sign-up'\|'/forgot-password'\|'/otp'`，只在这几个模板页之间互相引用，登录页没有入口 | 删除，`input-otp` 依赖可随之移除；dashboard 要换成真实首页还是占位页，请用户决定（design 写了「不做 UI 改版」）；英文提示改成中文 |
| F30 | P3 | 17 个文件带 `'use client'`（如 menu-icon-picker.tsx:1、users-multi-delete-dialog.tsx:1）；roles-action-dialog.tsx:134 去失效 `['system','role','detail',id]`，但没有任何 query 用这个 key | 搜 `'role', 'detail'`，只有这一行 | 删掉 Next.js 指令和这条无效的 invalidate |

### 6. 过时写法

- **已经是新写法，不必再改**：搜 `forwardRef` 0 命中；Context 已经写成 `<Ctx value>`；ESLint 已是 flat config。

| ID | 严重度 | 位置 | 问题 | 改法 |
|---|---|---|---|---|
| O1 | P3 | src/features/system/menu/form.ts:46-77；各 form.ts 里 `refine(fn, {message})` 约 20 处 | 用的是 zod 4 已弃用的 `superRefine`、`z.ZodIssueCode.custom`、`{message}` | 换成 `.check()` 或 `ctx.addIssue({code:'custom', ...})`，`{message}` 换成 `{error}`；`import z from 'zod'` 与 `import { z }` 混用，统一成后者 |
| O2 | P3 | src/app/navigation/api.ts:29-35；全仓 queryKey 都是内联字符串数组 | 没用 `queryOptions()`，也没有 key 工厂 | 改用 `queryOptions()`，加 `src/lib/query-keys.ts`。这也是 F2、F10、F19 的根因 |
| O3 | P3 | eslint.config.js:14 | 没开类型感知规则，未处理的 Promise 查不出来 | 换成 `tseslint.configs.recommendedTypeChecked`，打开 `no-floating-promises`、`no-misused-promises` |
| O4 | P3 | tsconfig.app.json:31 | 排除了 `*.test.ts`，测试不做类型检查；devDeps 里也没有 `@types/bun` | 加 `tsconfig.test.json`，设 `types:["bun"]`，补 `@types/bun` |
| O5 | P3 | package.json:5 vs design | `packageManager` 写的是 bun@1.3.14，本机是 1.4.4 | 升级时一并对齐 |
| O6 | P3 | `@radix-ui/react-icons`，约 10 个文件 | 和 lucide 两套图标库并存 | 换成 lucide 后删掉依赖（F26 里的死文件可以少替换 2 个） |

### S17 要改的前端文件

| 文件 | 具体改法 |
|---|---|
| src/lib/http.ts（必改） | 1. 把 `isLoginRequest` 扩成 `isAuthBypass(url)`，同时匹配 `/auth/login` 和 `/auth/refresh`。<br>2. 模块级 `let refreshPromise: Promise<string> \| null`，导出 `refreshAccessToken()`：已有进行中的请求就复用，否则用**单独的 axios 实例**（`withCredentials`，同一个 baseURL）POST `/auth/refresh`。**不带 Authorization**：契约规定无效 token 直接按未认证处理、返回 401，permitAll 路径是否豁免待验证。**带 `X-Device-Id`**：后端是否把 refresh 绑定到设备待验证。<br>3. token 先取 `body.data.accessToken`，取不到再取 `Authorization` 响应头，写入 store，`finally` 里置空 `refreshPromise`。<br>4. 错误拦截器的条件：`status===401 && !isAuthBypass && !config._retried && !config.signal?.aborted`。如果请求当时带的 token 不等于 store 里的当前 token，说明别的请求已经刷新过，直接重放，不再 refresh；否则 `await refreshAccessToken()`。然后设 `config._retried = true`，`return apiClient(config)`，请求拦截器会重新注入新 token。<br>5. refresh 失败时调用注册进来的 `onAuthFailure()`，用模块级标志保证只跳转一次，然后 reject 原错误。<br>6. 删掉 `window.location.replace`；导出 `setAuthFailureHandler(fn)`，没注册时退回 `location.replace`，redirect 参数经过 F3 的 sanitize |
| src/app/auth/session.ts | `bootstrapAuthSession`：没有 accessToken 时先 `await refreshAccessToken()`，与拦截器共用同一个 Promise。refresh 返回 401 就 `reset()` 并抛出，由路由跳转登录页；成功后再 `fetchCurrentUser()`。`logoutSession` 的 finally 里改调 `onSessionEnd()`，内容是 reset 加 `queryClient.clear()` |
| src/types/auth.ts | 新增 `RefreshPayload { accessToken: string; expireTime?: string; expiresIn?: number }`。现有 `LoginResponse` 返回的是 `expireTime`（LocalDateTime），见后端 quantum-biz-system/.../LoginResponse.java:45，契约里写的却是 `expiresIn`，两者对不上，以后端实际为准，前端只依赖 accessToken |
| src/stores/auth-store.ts | `partialize` 只留 `deviceId`（F4）；删掉重复的 `stripBearerPrefix`（F23）和 `clearUser`（F27） |
| src/app/providers/query-client.ts | 删掉 401 分支（F15）；`retry` 对 401 保持 false；英文 toast 改中文 |
| src/app/navigation/use-navigation.ts | `enabled: Boolean(user && accessToken)`（F16） |
| src/main.tsx | 注册 `setAuthFailureHandler`：reset、`queryClient.clear()`、`router.navigate({to:'/sign-in', search:{redirect}, replace:true})`。登录成功后复位「只跳一次」的标志 |
| src/routes/_authenticated/route.tsx | 逻辑基本不变：bootstrap 抛 401 时 redirect；注意 refresh 失败这条路径不要再调 `onAuthFailure`，否则会跳转两次 |
| src/routes/(auth)/sign-in.tsx、user-auth-form.tsx | 校验 redirect（F3） |
| vite.config.ts / 部署（只核对） | cookie Path 为 `/api/auth`，前提是浏览器看到的前缀是 `/api`。dev 代理把 `/api` 改写成 `/talent_manger`，浏览器侧不受影响。生产的 `VITE_API_BASE_URL` 必须仍以 `/api` 开头（待验证） |
| 新增 src/lib/http.test.ts、src/app/auth/session.test.ts（AC4） | 用自定义 axios `adapter` 模拟响应，bun 无 DOM 也能跑。覆盖：① 3 个并发 401 只发 1 次 refresh，3 个请求都用新 token 重放；② 重放后仍 401 不再重放，`onAuthFailure` 只调 1 次；③ refresh 返回 401 时 reset 并只跳转 1 次；④ `/auth/login`、`/auth/refresh` 自己 401 不触发 refresh；⑤ refresh 请求不带 Authorization、带 X-Device-Id；⑥ 无 token 启动时先 refresh 再调 /auth/info，且和同时到达的 401 共用一个 Promise；⑦ 请求携带的旧 token 不等于当前 token 时直接重放；⑧ 已 abort 的请求不重放 |

### 建议执行顺序

| 步 | 内容 | 原因 |
|---|---|---|
| 0 | F26、F27、F28 删死代码和死依赖；F29 中能直接删的部分（模板 auth 页面是否删先问用户） | design 方案要求先扫描，避免升级本来就该删的包 |
| 1 | 按包逐个升级，每个包都跑 build | 按 design 步骤 2 |
| 2 | F1 | 一行改动，P1 安全问题 |
| 3 | S17 一批：F14、F15、F16、F2、F4、F3、F23 加 AC4 单测 | 改的都是 http、session、store、query-client、main 这几个文件，一起改避免冲突；要和后端联调 |
| 4 | F17 | 批量删除可能删错数据 |
| 5 | F5（先和后端确认 Content-Type）、F18、F19、F10、F8、F9 | 其余 P2 |
| 6 | O1–O6、F11–F13、F20–F25、F30、F6、F7 | P3 清理；F24 改动面大，放最后单独提交 |

本机没验证、需要确认的有：refresh 请求带过期 Bearer 时后端是放行还是 401；refresh 是否绑定 X-Device-Id；preview 接口的 Content-Type 由什么决定；生产的 API 前缀；knip 与 `bun audit` 实际输出。
