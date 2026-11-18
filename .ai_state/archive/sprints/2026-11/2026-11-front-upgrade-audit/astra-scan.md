**优先处理三件事：批量删除可能删错人，同标签页换号可能显示上一账号资料，S17 的默认 cookie 路径与生产 API 前缀不匹配。** 前两项涉及数据和身份边界，第三项会让开发环境通过、生产环境续期失败。没有发现达到 P0 的问题。

审查基线为 `f23d2ad9`，覆盖 `src` 下 282 个 TS/TSX 文件及相关配置。全程只读，未修改文件。用同级 `quantum-front` 中与 `bun.lock` 一致的 React Query 5.101.4、React Table 8.21.3 做了两个纯内存验证。未运行会生成文件的构建，也未做浏览器或线上网关联调。以下 `src` 内路径省略 `src/` 前缀。

## 1. 安全

| ID | 类别 | 严重度 | 文件:行 | 问题 | 建议的改法 | 风险／需补的测试 |
|---|---|---|---|---|---|---|
| S1 | 安全 | P1 | `app/auth/session.ts:85`、`components/sign-out-dialog.tsx:18`、`app/navigation/api.ts:31`、`features/settings/profile/components/profile-account-form.tsx:165,186` | 登出只清 Zustand，然后站内跳转。菜单和个人资料的 Query key 跨账号共用，资料页还会把命中的旧用户写回当前 auth store。 | 在登出、会话失效和切换身份时取消在途私有查询并清理私有缓存。菜单、个人资料按身份分键。资料回写前校验当前会话与返回用户。 | 同标签页 A 打开资料和列表，退出后立即登录 B，再访问原页。检查 DOM、菜单、store 均未出现 A，并覆盖 A 的慢响应在 B 登录后才返回。 |
| S2 | 安全 | P1 | `lib/handle-server-error.ts:11`、`features/auth/sign-in/components/user-auth-form.tsx:110,127`、`features/auth/sign-up/components/sign-up-form.tsx:50`、`features/auth/forgot-password/components/forgot-password-form.tsx:41` | 登录失败将完整 `AxiosError` 写入控制台，错误配置可含密码、验证码或请求头；注册表单直接打印密码和确认密码，找回表单打印邮箱。 | 删除表单值日志。错误诊断仅保留 HTTP 状态、业务错误码、`traceId` 等白名单字段，同时收紧 `app/providers/query-client.ts:16` 的开发日志。 | 用模拟登录失败、带鉴权头的 mutation 失败和注册提交捕获 console，断言密码、验证码、邮箱、Bearer 值均未输出。当前证据是浏览器日志，未发现外发埋点。 |
| S3 | 安全 | P2 | `stores/auth-store.ts:44,124`、`app/auth/api.ts:18,37`、`types/auth.ts:24` | access token 已经只驻内存，但 `partialize` 将完整 `user` 写入 localStorage，可能长期保留电话、邮箱、登录 IP、地点、角色和权限；解析器还会保留后端额外字段。 | S17 启动恢复接通后，持久化只留 `deviceId`。增加存储版本迁移，主动移除旧 `user`，避免默认 merge 重新载入旧资料。 | 用旧版 `talent_manager_auth` 启动，确认设备 ID 保留、旧用户字段从磁盘消失，鉴权和菜单等待本次 `/auth/info` 完成。 |
| S4 | 安全 | P2 | `features/settings/password/components/password-form.tsx:43`、`components/profile-dropdown-settings-items.ts:15` | 用户能从正式菜单进入“修改密码”，提交后只执行 `form.reset()`，原密码继续有效。 | 有自助改密契约时接入，并按服务端结果反馈；契约就绪前停用提交和入口。管理端按用户 ID 重置密码的接口不能直接替代自助改密。 | 验证旧密码错误时保留表单；成功后旧密码失效、新密码可登录。未开放功能时直达 URL 也不能提交。 |
| S5 | 安全 | P3 | `netlify.toml:1`、`index.html:63`、`features/system/file/components/file-preview-dialog.tsx:104` | 仓内 Netlify 配置只有 SPA rewrite，HTML 也没有 CSP；线上是否由网关下发仍待验证。 | 先检查实际 HTML 响应头。缺失时从响应头以 Report-Only 验证，再收紧脚本来源、`object-src`、`base-uri` 和 `frame-ancestors`，按实际需求放行字体、验证码图片和 PDF blob。 | 用生产入口检查文档响应头，并验证登录验证码、字体、头像、PDF 预览和动态路由。 |

**已核对的边界。** `src` 中未发现 `dangerouslySetInnerHTML`、`v-html` 或 `innerHTML` 写入。PDF 预览使用 blob iframe，同级后端按扩展名推导响应 MIME。登录 `redirect` 只校验为字符串，但实际传给 TanStack Router 的是 `navigate({to})`，未取得跨站跳转证据。文件和角色控制器均有服务端权限注解，S1 的客户端串号不能据此推断为服务端越权。[登录跳转](/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade/src/features/auth/sign-in/components/user-auth-form.tsx:122) · [文件接口权限及 MIME](/Users/mi_manchi/workspace/quantum/quantum-backend/quantum-biz-system/src/main/java/com/alpha/system/controller/FileController.java:83)

**依赖风险。** 仓内 2026-07-31 的审计把当时剩余的 `brace-expansion`、`@babel/core` 告警归到开发／构建链。当前锁文件仍能定位这些包，本轮未查询实时公告，不能把历史报告当作当前版本的安全结论。后续升级时应留存新旧锁文件各自的 `bun audit` 结果及依赖路径。[历史审计](/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade/.ai_state/architecture/dependency-and-security-audit.md) · [当前锁文件](/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade/bun.lock:520)

## 2. 低效

| ID | 类别 | 严重度 | 文件:行 | 问题 | 建议的改法 | 风险／需补的测试 |
|---|---|---|---|---|---|---|
| E1 | 低效 | P2 | `components/data-table/toolbar.tsx:57`、`hooks/use-table-url-state.ts:161,184`、`features/system/user/index.tsx:25`、`features/system/user/api.ts:137` | 用户和角色列表每次键入都改 URL、生成查询，查询函数又未把 Query 的 `signal` 传给 axios；快速连续输入会留下已过时的在途请求。 | 文本框保留输入草稿，短防抖后提交 URL；查询 key 和请求共同使用归一化参数；把 `signal` 一路传到 axios。翻页和离散筛选保持即时。 | 连续输入、快速清空、中文输入法组词、浏览器后退。统计真实请求数，旧请求取消后不弹错误提示。 |
| E2 | 低效 | P2 | `components/data-table/faceted-filter.tsx:93`、`features/system/user/model.ts:109`、`features/system/role/model.ts:91` | 筛选 UI 允许多选状态、性别，缓存 key 包含完整数组，API 却只取首项；用户看到两个选项生效，服务器只收到一个，还会为同一请求建多个缓存。 | 按当前单值 API 改为单选，并将历史多值 URL 归一化；若业务要多选，则前后端一并支持数组。 | 覆盖单选、清空、旧多值链接，断言 UI、URL、请求参数和 Query key 一致。 |
| E3 | 低效 | P2 | `app/navigation/icon-registry.ts:1`、`app/navigation/registry.ts:5`、`context/search-provider.tsx:2,32`、`components/layout/nav-group.tsx:4` | 根路由的命令菜单经导航注册表加载 Lucide 全量动态图标索引。锁定版 `iconNames` 取自含 **2,007 个动态 import** 的映射；这是首屏索引开销，图标本体仍按需加载。 | 将命令面板延迟到首次打开；把常用导航图标与完整图标选择器分开加载。保留后端已有图标名的完整回退能力。 | 比较登录页冷启动的初始 JS、modulepreload 和请求数；验证旧别名、非预设图标、首次快捷键打开。具体节省字节数待构建测量。 |
| E4 | 低效 | P3 | `app/navigation/use-navigation.ts:13`、`components/layout/header-breadcrumb.tsx:43`、`components/command-menu.tsx:22` | 面包屑只需要原始路由树，调用 `useNavigation()` 却和侧栏、命令菜单一样重新遍历树并构造整套导航分组。 | 分开原始路由查询与分组派生；只有需要分组的组件订阅派生结果，按用户权限和路由数据引用缓存计算。 | 用同一份大菜单统计普通重渲染的分组计算次数；权限和菜单更新后，侧栏与搜索必须同步刷新。 |

路由已启用 Vite 自动拆分，业务页注册表也已使用 `lazy`。未找到无选择器调用 `useAuthStore()` 的证据。现有服务端分页表格没有实测数据支持统一加虚拟化。[路由拆分](/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade/vite.config.ts:76) · [业务页注册表](/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade/src/app/navigation/page-registry.tsx:16)

## 3. 稳定性

| ID | 类别 | 严重度 | 文件:行 | 问题 | 建议的改法 | 风险／需补的测试 |
|---|---|---|---|---|---|---|
| R1 | 稳定性 | P1 | `features/system/user/components/users-table.tsx:81`、`features/system/role/components/roles-table.tsx:80`、`features/system/user/components/users-multi-delete-dialog.tsx:30`、`features/system/role/components/roles-multi-delete-dialog.tsx:31` | 两张表按默认行索引保存选择，批删却从当前数据取实体 ID。纯内存验证中，数据由 A 换成 B 后，原勾选直接变成 B。 | 两表均设置 `getRowId: row => row.id`。分页、筛选边界清理页内选择；确认框固定并展示待操作对象，数据切换时重新确认。 | 第一页选第一行后翻页、筛选、后台重排及打开确认框后刷新；断言最终删除请求中的 ID 始终等于确认对象。 |
| R2 | 稳定性 | P1 | `lib/http.ts:96,113`、`app/providers/query-client.ts:49`、`app/auth/session.ts:21`、`routes/_authenticated/route.tsx:30` | HTTP 层和 QueryCache 都会在 401 时 reset 并跳转，启动又直接请求 `/auth/info`；后端停用过滤器续期后，有效 refresh cookie 也无法恢复会话。 | 按下方 S17 收拢到一个刷新协调器，让启动、路由守卫和业务请求共用。 | 冷启动、并发 401、迟到 401、重放仍 401、刷新失败均有独立断言。 |
| R3 | 稳定性 | P1 | `.env.produce:3`、`.env.dev:3`、`vite.config.ts:92`、`lib/http.ts:11` | 生产浏览器请求 `/talent_manger/auth/*`，S17 默认 cookie Path 为 `/api/auth`，浏览器不会把该 cookie 发给生产 refresh 或 logout；开发代理恰好掩盖了差异。 | 统一浏览器侧 `/api` 并由生产网关转发，或将生产 `security.refresh-cookie-path` 配成实际公开路径。前后端和网关须选择同一方案。 | 用生产构建和真实浏览器走登录、刷新、退出、旧 `Path=/` cookie 迁移；仅用 mock 或直接请求 Spring 不能验收。 |
| R4 | 稳定性 | P2 | `features/system/user/index.tsx:30`、`features/system/user/components/users-table.tsx:105`、`features/system/role/components/roles-table.tsx:104`、`features/system/file/index.tsx:143`、`features/monitor/login-log/index.tsx:158`、`features/monitor/oper-log/index.tsx:173` | 五张列表在首个响应前把占位 `pages: 0` 提升为 1 并纠正 URL，直接打开合法的第 2 页或以后会被送回首页。 | 只在当前参数的真实成功响应到达后执行越界纠正，跳过 pending、error 和 `isPlaceholderData`。 | 冷缓存直达第 3 页保持页码；慢网翻页和返回不跳页；删除最后一页的最后一条后仍正确回退。 |
| R5 | 稳定性 | P2 | `features/settings/profile/components/profile-account-form.tsx:242,255`、`app/providers/query-client.ts:27` | 资料保存后的“刷新”使用继承 10 秒 `staleTime` 的 `fetchQuery`。纯内存验证中命中新鲜缓存时发出 **0 次请求**，因此成功提示后仍可能显示旧字段和旧版本号。 | PUT 成功后明确 refetch 当前身份的资料并等待结果，或用服务端返回的新资料更新缓存；缺版本号时也必须能强制读取。 | 进入资料页后立即保存并连续保存两次，断言重新 GET、展示新值、第二次提交携带新版本。 |
| R6 | 稳定性 | P2 | `features/system/user/components/users-action-dialog.tsx:169`、`features/system/role/components/roles-action-dialog.tsx:144`、`app/providers/query-client.ts:26` | 编辑表单因查询 `isFetching` 变化而执行整表 `reset`。生产环境重新聚焦触发后台刷新时，用户已输入的字段和权限勾选可能被覆盖。 | 以弹窗打开和实体 ID 作为初始化边界。首批依赖齐备后初始化一次；后台更新只合并未编辑字段，版本冲突单独提示。 | 编辑未保存时切标签再切回，模拟慢角色／部门响应；输入保留，关闭后编辑另一条记录能正确初始化。 |
| R7 | 稳定性 | P2 | `features/monitor/online/index.tsx:103,129,493` | 批量强退用 `Promise.all`，一项失败就跳过成功项的列表刷新；筛选后的“全选”又只比较数量，隐藏的旧选择仍会提交。 | 用当前可见 ID 的交集计算选择态，确认框固定目标；等待各请求结算，刷新列表并只保留失败项供重试。 | A、B 两组数量相同，选 A 后切到 B；混合成功、失败和已离线的结果，核对实际目标及重试集合。 |
| R8 | 稳定性 | P2 | `hooks/use-table-url-state.ts:88,110,136,164` | 列筛选只从 URL 初始化一次，浏览器后退或前进时，服务器查询随 URL 变化，但筛选控件仍可显示旧值。 | 从当前路由参数派生已提交的列筛选；防抖输入的临时草稿单独保存，外部导航时同步。 | 连续筛选两个用户名再后退、前进、清空；控件文字、筛选标记和表格数据应始终对应。 |

根路由已有 `errorComponent` 和 `notFoundComponent`。文件预览也会回收 object URL，现有证据不足以把它列为内存泄漏。[根路由](/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade/src/routes/__root.tsx:21) · [预览清理](/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade/src/features/system/file/components/file-preview-dialog.tsx:48)

## 4. 重复实现

| ID | 类别 | 严重度 | 文件:行 | 问题 | 建议的改法 | 风险／需补的测试 |
|---|---|---|---|---|---|---|
| D1 | 重复实现 | P3 | `app/auth/api.ts:12`、`app/navigation/api.ts:9`、`features/system/user/api.ts:24`、`features/system/file/api.ts:10` 等 | `rg -n 'function unwrapResult' src` 命中 13 个定义，重复取同一 `ApiResult<T>.data`。 | 在 JSON API 边界保留一个解包实现，或直接用有类型的 `response.data.data`。保留各模块自己的数据校验。 | 覆盖 `data: null`、分页、认证响应头和 blob。全局响应拦截器强制解包会破坏后两类调用。 |
| D2 | 重复实现 | P3 | `features/system/dept/form.ts:76`、`features/system/menu/form.ts:122`、`features/system/dict/form.ts:96` | 部门、菜单、字典复制了同一套服务端字段错误解析，字典模块已经有可接收字段集和回退规则的泛型实现。 | 提取字典现有解析器，模块仅保留允许字段和关键字映射。 | 覆盖带对象前缀的字段名、同字段多条错误、中文回退、未知字段与一般错误；保留首条字段错误行为。 |
| D3 | 重复实现 | P3 | `features/system/user/components/users-dialogs.tsx:14`、`features/system/role/components/roles-dialogs.tsx:14` | 用户／角色弹窗各维护一份延迟清除当前行、取消定时器、卸载清理逻辑。 | 提取这段关闭生命周期供两处共用，继续由各业务模块决定可打开的弹窗和操作权限。 | 关闭 A 后立刻打开 B、退出路由、连续开关；旧计时器不能清掉 B 的对象。 |

## 5. 垃圾代码与模板残留

| ID | 类别 | 严重度 | 文件:行 | 问题 | 建议的改法 | 风险／需补的测试 |
|---|---|---|---|---|---|---|
| G1 | 垃圾代码 | P3 | `features/system/components/system-placeholder-page.tsx:33`、`features/settings/profile/components/profile-form.tsx:59` | 通用系统占位页和旧资料演示表单均无源码消费者；实际资料页使用 `ProfileAccountForm`。 | 删除两个孤立模块，保留现行资料表单。 | 下方零命中检索、类型检查、实际打开个人资料及动态系统页。 |
| G2 | 垃圾代码 | P3 | `features/system/file/api.ts:43,90,94` | `fetchFileDetail`、`getDownloadUrl`、`getPreviewUrl` 只有定义；页面实际经 `fetchBlob` 获取受保护文件。 | 删除三个未使用导出及仅供后二者调用的私有 URL helper。 | 复查零引用；下载、图片和 PDF 预览仍通过鉴权客户端。 |
| G3 | 模板残留 | P2 | `features/auth/sign-up/components/sign-up-form.tsx:47`、`features/auth/forgot-password/components/forgot-password-form.tsx:38`、`features/auth/otp/components/otp-form.tsx:41` | 三个公开路由仍能直达：注册只等待，找回密码显示“邮件已发送”，OTP 只等一秒就跳首页，均没有对应业务请求。 | 未提供这些能力时移除公开入口并处理直接访问；若要保留，必须由真实后端结果驱动发送、验证和跳转。 | 直达三个 URL，验证不会收集无用途的密码、报告虚假发信成功或把定时器完成当作验证成功。 |
| G4 | 模板残留 | P2 | `features/dashboard/index.tsx:34,73`、`features/dashboard/components/overview.tsx:6`、`features/dashboard/components/analytics-chart.tsx:6` | 正式仪表盘显示写死的收入及增长率、随机生成的图表和无行为的“导出”按钮。 | 将演示数据移入已有 mock 边界。生产有数据源时接入，没有时显示空态并停用导出。 | 生产模式刷新不会生成新的业务指标；mock 模式仍可演示；导出按钮状态与能力一致。 |
| G5 | 模板残留 | P3 | `index.html:38,46,51,59` | 正式页面分享元数据仍将 URL 和预览图指向 `shadcn-admin.netlify.app`。 | 改用实际部署的公开地址和项目资源；内部系统无分享需求时删除相应标签。 | 检查生产 HTML 中 OG、Twitter URL 和图片均属于预期站点。 |

**零命中证据**，以下命令自仓库根执行，排除定义文件，每条输出均为 0 行。

| 对应项 | 实际检索 |
|---|---|
| G1 占位页 | `rg -n -g '!system-placeholder-page.tsx' 'SystemPlaceholderPage\|system-placeholder-page' src`（两项按正则“或”匹配） |
| G1 旧资料表单 | `rg -n -g '!profile-form.tsx' '\bProfileForm\b\|/profile-form[\x27\x22]' src`（同上） |
| G2 三个导出 | `rg -n -g '!src/features/system/file/api.ts' '\b(getDownloadUrl\|getPreviewUrl\|fetchFileDetail)\b' src`（同上） |

运行依赖逐项核对了源码导入和 CSS 引用。`src` 中无引用的两项均有明确用途：`@tailwindcss/vite` 在 `vite.config.ts:3` 使用，`react-is` 是当前 Recharts 声明的 peer dependency。本轮没有证据支持直接删除运行依赖。常见整行注释代码和 JSX 注释代码模式也没有得到可确认的清理项。

## 6. 过时写法与类型检查

| ID | 类别 | 严重度 | 文件:行 | 问题 | 建议的改法 | 风险／需补的测试 |
|---|---|---|---|---|---|---|
| M1 | 过时写法 | P3 | `features/system/menu/form.ts:13,49`、`features/system/user/components/users-action-dialog-form.ts:39` | Zod 4 已将 schema 参数 `message` 和 `z.ZodIssueCode` 标为弃用，此处仍在使用。 | 将 `.refine()` 等 schema 参数改为 `error`，将 `z.ZodIssueCode.custom` 改为字面量 `'custom'`。`ctx.addIssue()` 的 issue 对象保留 `message`。 | 按菜单类型、字段路径、中文报错做回归；避免全局文本替换误改 issue 对象。 |
| M2 | 类型检查 | P2 | `tsconfig.app.json:24,31`、`tsconfig.node.json:23`、`package.json:13` | 应用已开 strict，但 app 配置排除了 `*.test.ts`，node 配置也不含这些文件；仓内 10 个测试文件不受现有 `tsc -b` 检查。 | 添加覆盖 Bun 测试及路径别名的 no-emit 类型检查入口，纳入常规检查。 | 验证 `bun:test` 类型可解析；用测试夹具中的错误 DTO 字段确认类型检查能失败，现有测试仍可运行。 |

React 19 的 `ref` prop 已在 `PasswordInput` 使用，未找到 `forwardRef` 遗留；ESLint 已是 flat config。没有发现仅靠换用 `use` 或 `useActionState` 就能修复的具体缺陷。[PasswordInput](/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade/src/components/password-input.tsx:13) · [ESLint 配置](/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade/eslint.config.js:9)

## S17 前端文件与具体改法

**联调前先定两个值。** 一是生产浏览器实际访问的 API 前缀，见 R3。二是刷新响应过期字段：设计写 `expiresIn`，同一句又要求参照现有 login；当前前端 login 类型和同级 Spring `LoginResponse` 都是 `expireTime`，Java 类型为 `LocalDateTime`。用后端最终 refresh DTO 或响应夹具定字段名、类型和单位。轮换凭证继续只由 HttpOnly cookie 传输。[S17 原文](/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade/.ai_state/sprints/2026-11-front-upgrade-audit/design.md:35) · [前端登录类型](/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade/src/types/auth.ts:7) · [后端登录 DTO](/Users/mi_manchi/workspace/quantum/quantum-backend/quantum-biz-system/src/main/java/com/alpha/system/dto/response/LoginResponse.java:32)

| 文件 | 具体改法 |
|---|---|
| `.env.produce:3`、`vite.config.ts:88` | 根据实际部署统一浏览器可见路径。若生产必须保留 `/talent_manger`，由后端部署显式选择对应 cookie Path。Vite 的 dev proxy 只覆盖本地开发。 |
| `types/auth.ts:7`、`app/auth/api.ts:47` | 为刷新响应定义独立 DTO，解析 `Result.data` 并校验非空 access token。用契约测试验证 body 与 `Authorization: Bearer …` 表达同一 token。 |
| `lib/http.ts:61,70,79,96` | 提取唯一的刷新入口，使用共享 baseURL、超时、`withCredentials` 和设备头的传输层发送 `POST /auth/refresh`。login、refresh 免附旧 access token，也绕过 401 恢复。避免 `http.ts` 与依赖它的 `app/auth/api.ts` 循环导入。 |
| `lib/http.ts:110` | 普通 401 加入模块级共享 Promise，`finally` 释放。给原请求记录会话身份、发出时的 token 版本和重放标记。若同会话已换新 token，迟到的旧 401 直接用新 token 重放；已退出、已换号或已取消的请求终止。覆盖旧 Authorization，保留方法、参数、body、signal 和上传设置。每个原请求最多重放一次。 |
| `stores/auth-store.ts:78,111,124` | access token 仅驻内存，`deviceId` 保留。用会话代次区分退出、重新登录与普通 token 轮换，防止旧 refresh 完成后复活上一会话。结合 S3 迁移旧存储。 |
| `app/auth/session.ts:9,47,85` | 启动无 token 时先共享 refresh，再取 `/auth/info`；有 token 无用户时直接取 info。bootstrap 成功后才发布 ready。与登录、退出共用会话边界，保留开发 mock 的免后端启动能力。退出请求按 S17 的普通请求规则处理，结束后清理私有缓存。 |
| `main.tsx:9`、`routes/_authenticated/route.tsx:27`、`app/navigation/use-navigation.ts:8` | 在应用启动入口实际触发一次恢复，受保护路由等待同一结果。匿名访问登录页时 refresh 失败就留在登录页；受保护深链保存站内回跳地址。菜单查询等待当前会话 ready，防止根命令面板因旧持久化用户抢先请求。 |
| `app/providers/query-client.ts:14,49`、`components/sign-out-dialog.tsx:18` | 去掉 QueryCache 独立的 401 reset／导航，集中处理刷新失败，同一批只清理和导航一次。401、403、取消及耗尽重放的请求均不再由 Query 自动重试。保留 403 的权限提示。 |
| `app/auth/api.test.ts`，新增 HTTP／session 测试 | 用可控 axios adapter 验证请求次数、token 和提交内容；对 cookie Path、轮换、删除则用真实浏览器验收。两类测试解决不同问题。 |

**S17 最小验收矩阵**

| 场景 | 必须观察到的结果 |
|---|---|
| 冷启动，有效／无效 cookie，分别进入公开页和受保护深链 | 每次启动只尝试一次 refresh；成功后带新 token 获取 info，再加载菜单。匿名留在公开页，受保护深链只跳一次登录。 |
| 多个并发 401，另有一个旧 401 在 refresh 完成后才到 | 同一轮只有一个 refresh；每个原请求至多重放一次，全部使用新 token。 |
| login 401、refresh 401、普通 403、重放仍 401 | login 错误留给表单；refresh 401 只执行一次清理；403 不发 refresh；重放再次 401 就结束，不循环。 |
| 等待 refresh 时取消请求、退出或换号 | 已取消请求不重放，上一账号的响应不能写 store，也不能清掉新账号。 |
| JSON 写请求、FormData 上传、blob 下载收到首个 401 | 重放保留原方法、body、类型和响应模式。联调确认后端在执行业务副作用前返回鉴权 401，写操作只生效一次。 |
| 生产前缀、旧根路径 cookie、logout | 浏览器把新 cookie 发给实际 refresh 和 logout 路径；旧根路径 cookie 被清除；退出后重新加载不能恢复已注销会话。 |

## 建议执行顺序

1. **先修 R1 和 S2。** 批删改用实体 ID 并锁定确认目标；移除凭据日志。两项都可以独立验证，无须等后端 S17。
2. **锁定 refresh DTO 和生产路径，再一起落 S17、S1、S3。** 将缓存隔离、启动恢复、401 重放和退出放在同一套会话测试里。前后端发布前跑真实 cookie 联调。
3. **处理其余会改变用户操作结果的项。** 先停用或接通改密与模拟认证流程，再修 R4–R8、E2。优先验收深链页码、连续保存、编辑草稿和批量操作对象。
4. **清理模板和重复实现，再做依赖升级。** 先按零引用证据做 G1、G2，处理生产演示数据，补 M2。逐包升级时保留独立构建和告警记录，便于定位回归。
5. **最后验收性能与部署。** 对 E1、E3、E4 比较请求数、初始资源和渲染计算次数；确认生产 CSP 响应头。以项目 build、test、lint 和生产路径浏览器联调收口。