# 前端升级报告

Bun 1.4.4，Node v26.10.0。先安装基线，再按 2026-11-18 registry 记录逐个升级。版本来自变更前后 `bun.lock` 的直接依赖解析；每个有变更的包均单独跑构建。

| 包 | 旧版本 → 新版本 | Registry 最新稳定 | 处置 |
|---|---|---|---|
| `@hookform/resolvers` | 5.5.7 → 7.0.7 | 7.0.7 | 逐包构建通过。 |
| `@radix-ui/react-alert-dialog` | 1.1.23 → 1.2.1 | 1.2.1 | 逐包构建通过。 |
| `@radix-ui/react-avatar` | 1.2.6 → 1.3.1 | 1.3.1 | 逐包构建通过。 |
| `@radix-ui/react-checkbox` | 1.3.11 → 1.4.1 | 1.4.1 | 逐包构建通过。 |
| `@radix-ui/react-collapsible` | 1.1.20 → 1.2.1 | 1.2.1 | 逐包构建通过。 |
| `@radix-ui/react-dialog` | 1.1.23 → 1.3.1 | 1.3.1 | 逐包构建通过。 |
| `@radix-ui/react-direction` | 1.1.4 → 1.2.0 | 1.2.0 | 逐包构建通过。 |
| `@radix-ui/react-dropdown-menu` | 2.1.24 → 2.2.1 | 2.2.1 | 逐包构建通过。 |
| `@radix-ui/react-icons` | 1.3.2 → 1.3.2 | 1.3.2 | 已是最新稳定版。 |
| `@radix-ui/react-label` | 2.1.15 → 2.1.17 | 2.1.17 | 逐包构建通过。 |
| `@radix-ui/react-popover` | 1.1.23 → 1.3.1 | 1.3.1 | 逐包构建通过。 |
| `@radix-ui/react-radio-group` | 1.4.7 → 1.5.1 | 1.5.1 | 逐包构建通过。 ConfigDrawer 仍使用。 |
| `@radix-ui/react-scroll-area` | 1.2.18 → 1.4.0 | 1.4.0 | 逐包构建通过。 |
| `@radix-ui/react-select` | 2.3.7 → 2.4.1 | 2.4.1 | 逐包构建通过。 |
| `@radix-ui/react-separator` | 1.1.15 → 1.2.0 | 1.2.0 | 逐包构建通过。 |
| `@radix-ui/react-slot` | 1.3.3 → 1.5.0 | 1.5.0 | 逐包构建通过。 |
| `@radix-ui/react-switch` | 1.3.7 → 1.4.1 | 1.4.1 | 逐包构建通过。 |
| `@radix-ui/react-tabs` | 1.1.21 → 1.2.1 | 1.2.1 | 逐包构建通过。 |
| `@radix-ui/react-tooltip` | 1.2.16 → 1.4.1 | 1.4.1 | 逐包构建通过。 |
| `@tailwindcss/vite` | 4.3.3 → 4.3.5 | 4.3.5 | 逐包构建通过。 |
| `@tanstack/react-query` | 5.101.4 → 5.108.0 | 5.108.0 | 逐包构建通过。 |
| `@tanstack/react-router` | 1.170.18 → 1.170.46 | 1.170.46 | 逐包构建通过。 |
| `@tanstack/react-table` | 8.21.3 → 9.3.1 | 9.3.1 | 逐包构建通过。 |
| `axios` | 1.19.0 → 1.21.1 | 1.21.1 | 逐包构建通过。 |
| `class-variance-authority` | 0.7.1 → 0.7.1 | 0.7.1 | 已是最新稳定版。 |
| `clsx` | 2.1.1 → 2.1.1 | 2.1.1 | 已是最新稳定版。 |
| `cmdk` | 1.1.1 → 1.1.1 | 1.1.1 | 已是最新稳定版。 |
| `date-fns` | 4.4.0 → 移除 | 4.4.0 | F26/F28，源文件无可达调用方。 |
| `framer-motion` | 12.43.0 → motion 14.14.0 | 14.14.0 | 采用官方 React 入口，framer-motion 由 motion 间接依赖。逐包构建通过。 |
| `input-otp` | 1.4.2 → 1.5.0 | 1.5.0 | 逐包构建通过。 |
| `lucide-react` | 1.28.0 → 1.74.0 | 1.74.0 | 逐包构建通过。 |
| `react` | 19.2.8 → 19.3.1 | 19.3.1 | 逐包构建通过。 |
| `react-day-picker` | 10.0.1 → 移除 | 10.0.2 | F26/F28，源文件无可达调用方。 |
| `react-dom` | 19.2.8 → 19.3.1 | 19.3.1 | 逐包构建通过。 |
| `react-hook-form` | 7.83.0 → 7.92.0 | 7.92.0 | 逐包构建通过。 |
| `react-is` | 19.2.8 → 19.3.1 | 19.3.1 | 逐包构建通过。 Recharts peer。 |
| `react-top-loading-bar` | 3.0.2 → 3.0.2 | 3.0.2 | 已是最新稳定版。 |
| `recharts` | 3.10.1 → 3.11.0 | 3.11.0 | 逐包构建通过。 |
| `sonner` | 2.0.7 → 2.0.8 | 2.0.8 | 逐包构建通过。 |
| `tailwind-merge` | 3.6.0 → 3.7.0 | 3.7.0 | 逐包构建通过。 |
| `tailwindcss` | 4.3.3 → 4.3.5 | 4.3.5 | 逐包构建通过。 |
| `tw-animate-css` | 1.4.0 → 1.4.0 | 1.4.0 | 已是最新稳定版。 |
| `zod` | 4.4.3 → 4.6.7 | 4.6.7 | 逐包构建通过。 |
| `zustand` | 5.0.14 → 5.1.0 | 5.1.0 | 逐包构建通过。 |
| `@eslint/js` | 10.0.1 → 10.0.1 | 10.0.1 | 已是最新稳定版。 |
| `@tanstack/eslint-plugin-query` | 5.101.4 → 5.108.0 | 5.108.0 | 逐包构建通过。 |
| `@tanstack/react-query-devtools` | 5.101.4 → 5.108.0 | 5.108.0 | 逐包构建通过。 |
| `@tanstack/react-router-devtools` | 1.167.0 → 1.167.3 | 1.167.3 | 逐包构建通过。 |
| `@tanstack/router-plugin` | 1.168.23 → 1.169.0 | 1.169.0 | 逐包构建通过。 |
| `@trivago/prettier-plugin-sort-imports` | 6.0.2 → 6.0.2 | 6.0.2 | 已是最新稳定版。 |
| `@types/node` | 25.9.5 → 26.6.6 | 26.6.6 | 逐包构建通过。 |
| `@types/react` | 19.2.18 → 19.3.0 | 19.3.0 | 逐包构建通过。 |
| `@types/react-dom` | 19.2.4 → 19.3.0 | 19.3.0 | 逐包构建通过。 |
| `@vitejs/plugin-react` | 6.0.5 → 6.3.0 | 6.3.0 | 逐包构建通过。 |
| `eslint` | 10.8.0 → 10.15.0 | 10.15.0 | 逐包构建通过。 |
| `eslint-plugin-react-hooks` | 7.1.1 → 7.1.1 | 7.1.1 | 已是最新稳定版。 |
| `eslint-plugin-react-refresh` | 0.5.3 → 0.5.8 | 0.5.8 | 逐包构建通过。 |
| `globals` | 17.8.0 → 17.14.0 | 17.14.0 | 逐包构建通过。 |
| `knip` | 6.29.0 → 6.45.1 | 6.45.1 | 逐包构建通过。 |
| `prettier` | 3.9.6 → 3.10.1 | 3.10.1 | 逐包构建通过。 |
| `prettier-plugin-tailwindcss` | 0.8.1 → 0.8.1 | 0.8.1 | 已是最新稳定版。 |
| `typescript` | 6.0.3 → 6.0.3 | 7.0.2 | 7.0.2 构建通过；typescript-eslint 8.73.0 的 peer 为 >=4.8.4 <6.1.0，回退到 6.x 最新稳定版。 |
| `typescript-eslint` | 8.65.0 → 8.73.0 | 8.73.0 | 逐包构建通过。 |
| `vite` | 8.2.0 → 8.3.8 | 8.3.8 | 逐包构建通过。 |
| `@types/bun` | 无 → 1.4.4 | 1.4.4 | 新增测试类型，逐包构建通过。 |

## 主要版本适配

| 包 | 适配或验证 |
|---|---|
| `@hookform/resolvers` 7.0.7 | 现有 Zod 4 表单通过构建，保留 `@hookform/resolvers/zod`。代表位置 `src/features/auth/sign-in/components/user-auth-form.tsx:4`。 |
| `@tanstack/react-table` 9.3.1 | V9 feature 定义和列元数据在 `src/components/data-table/server-table-features.ts:13`。改用 `useTable`、特性泛型、`getPaginatedRowModel` 和 React adapter 的 `table.state`；入口为 `src/features/system/user/components/users-table.tsx:99`、`src/features/system/role/components/roles-table.tsx:98`、`src/features/system/file/index.tsx:141`、`src/features/monitor/login-log/index.tsx:152`、`src/features/monitor/oper-log/index.tsx:167`。 |
| `motion` 14.14.0 | 树动画从 `motion/react` 导入，见 `src/components/ui/tree-view.tsx:3`。 |
| `@types/node` 26.6.6 | Node v26.10.0 上构建通过，Node 配置源码无需适配。 |
| `typescript` 6.0.3 | 保留 TypeScript ESLint 的受支持组合；测试类型图见 `tsconfig.json:6`，类型感知规则见 `eslint.config.js:25`、`eslint.config.js:41`。 |

官方迁移及 peer 声明见 [TanStack Table 9](https://registry.npmjs.org/@tanstack/react-table/-/react-table-9.3.1.tgz)、[Motion 升级指南](https://motion.dev/docs/react-upgrade-guide)、[typescript-eslint 8.73.0](https://registry.npmjs.org/typescript-eslint/8.73.0)。

## S17 与联调边界

- 刷新从响应体 `data.accessToken` 读取 token，沿用现有 API base URL。HTTP 普通请求只重放一次，刷新已成功但重放仍返回 401 时直接交回原调用方，按 design 的「refresh 确认为 401 才 reset」裁定。
- 启动与拦截器共享刷新请求；会话代次隔离退出或换号前的在途请求。登录和登出等待在途刷新、串行更新 Cookie；过期登出可在本次操作内刷新并重放。刷新成功后先读取用户，再启用导航。模板站点保留原有演示流程，移除了日志和完整邮箱输出。
- 生产 `/talent_manger/auth` 决策来自 design。真实后端 Cookie 轮换、旧根路径 Cookie 清除和 logout 联调待验证。本机 preview HTTP 200，Playwright 的 Chromium 启动因 macOS Mach port 权限被拒绝。备用浏览器访问主机不可用。TanStack Table 运行时通过 React 服务端渲染测试。

## 改动文件清单

| 动作 | 文件 |
|---|---|
| 修改 | `.ai_state/sprints/2026-11-front-upgrade-audit/log.md` |
| 新增 | `.ai_state/sprints/2026-11-front-upgrade-audit/merged-findings.md` |
| 新增 | `.ai_state/sprints/2026-11-front-upgrade-audit/upgrade-report.md` |
| 修改 | `bun.lock` |
| 修改 | `eslint.config.js` |
| 修改 | `knip.config.ts` |
| 修改 | `package.json` |
| 修改 | `src/app/auth/access.ts` |
| 修改 | `src/app/auth/api.ts` |
| 新增 | `src/app/auth/session.test.ts` |
| 修改 | `src/app/auth/session.ts` |
| 修改 | `src/app/navigation/api.ts` |
| 修改 | `src/app/navigation/icon-registry.ts` |
| 修改 | `src/app/navigation/page-registry.tsx` |
| 修改 | `src/app/navigation/search-schema.ts` |
| 修改 | `src/app/navigation/types.ts` |
| 新增 | `src/app/navigation/use-menu-routers.ts` |
| 修改 | `src/app/navigation/use-navigation.ts` |
| 修改 | `src/app/providers/query-client.ts` |
| 修改 | `src/components/data-table/bulk-actions.tsx` |
| 修改 | `src/components/data-table/column-header.tsx` |
| 新增 | `src/components/data-table/debounced-search-input.tsx` |
| 修改 | `src/components/data-table/faceted-filter.tsx` |
| 修改 | `src/components/data-table/pagination.tsx` |
| 新增 | `src/components/data-table/server-table-features.test.ts` |
| 新增 | `src/components/data-table/server-table-features.ts` |
| 修改 | `src/components/data-table/toolbar.tsx` |
| 修改 | `src/components/data-table/view-options.tsx` |
| 删除 | `src/components/date-picker.tsx` |
| 新增 | `src/components/layout/backend-menu-icon.tsx` |
| 修改 | `src/components/layout/header-breadcrumb.tsx` |
| 修改 | `src/components/layout/nav-group.tsx` |
| 删除 | `src/components/layout/team-switcher.tsx` |
| 删除 | `src/components/layout/top-nav.tsx` |
| 修改 | `src/components/layout/types.ts` |
| 修改 | `src/components/profile-dropdown-settings-items.ts` |
| 修改 | `src/components/sign-out-dialog.tsx` |
| 删除 | `src/components/theme-switch.tsx` |
| 删除 | `src/components/ui/calendar.tsx` |
| 修改 | `src/components/ui/dialog.tsx` |
| 修改 | `src/components/ui/label.tsx` |
| 删除 | `src/components/ui/radio-group.tsx` |
| 修改 | `src/components/ui/tooltip.tsx` |
| 修改 | `src/components/ui/tree-view.tsx` |
| 修改 | `src/context/search-provider.tsx` |
| 修改 | `src/features/auth/forgot-password/components/forgot-password-form.tsx` |
| 修改 | `src/features/auth/otp/components/otp-form.tsx` |
| 修改 | `src/features/auth/sign-in/components/user-auth-form.tsx` |
| 修改 | `src/features/auth/sign-up/components/sign-up-form.tsx` |
| 修改 | `src/features/errors/forbidden/index.tsx` |
| 修改 | `src/features/errors/general-error/index.tsx` |
| 修改 | `src/features/errors/not-found-error/index.tsx` |
| 修改 | `src/features/errors/unauthorized-error/index.tsx` |
| 修改 | `src/features/monitor/cache/api.ts` |
| 修改 | `src/features/monitor/cache/index.tsx` |
| 修改 | `src/features/monitor/cache/model.ts` |
| 修改 | `src/features/monitor/login-log/api.ts` |
| 修改 | `src/features/monitor/login-log/index.tsx` |
| 修改 | `src/features/monitor/login-log/model.ts` |
| 修改 | `src/features/monitor/login-log/search-schema.ts` |
| 修改 | `src/features/monitor/online/api.ts` |
| 修改 | `src/features/monitor/online/index.tsx` |
| 修改 | `src/features/monitor/online/model.ts` |
| 修改 | `src/features/monitor/oper-log/api.ts` |
| 修改 | `src/features/monitor/oper-log/data/business-type.ts` |
| 修改 | `src/features/monitor/oper-log/index.tsx` |
| 修改 | `src/features/monitor/oper-log/model.ts` |
| 修改 | `src/features/monitor/oper-log/search-schema.ts` |
| 修改 | `src/features/monitor/server/api.ts` |
| 修改 | `src/features/monitor/server/index.tsx` |
| 修改 | `src/features/monitor/server/model.ts` |
| 删除 | `src/features/settings/account/components/account-form.tsx` |
| 删除 | `src/features/settings/account/index.tsx` |
| 删除 | `src/features/settings/appearance/components/appearance-form.tsx` |
| 删除 | `src/features/settings/appearance/index.tsx` |
| 删除 | `src/features/settings/components/sidebar-nav.tsx` |
| 删除 | `src/features/settings/display/components/display-form.tsx` |
| 删除 | `src/features/settings/display/index.tsx` |
| 修改 | `src/features/settings/index.tsx` |
| 删除 | `src/features/settings/notifications/components/notifications-form.tsx` |
| 删除 | `src/features/settings/notifications/index.tsx` |
| 删除 | `src/features/settings/password/components/password-form.tsx` |
| 修改 | `src/features/settings/password/index.tsx` |
| 修改 | `src/features/settings/profile/components/profile-account-form.tsx` |
| 删除 | `src/features/settings/profile/components/profile-form.tsx` |
| 删除 | `src/features/system/components/system-placeholder-page.tsx` |
| 修改 | `src/features/system/dept/api.ts` |
| 修改 | `src/features/system/dept/components/dept-parent-picker.tsx` |
| 修改 | `src/features/system/dept/form.ts` |
| 修改 | `src/features/system/dept/index.tsx` |
| 修改 | `src/features/system/dept/model.ts` |
| 修改 | `src/features/system/dict/api.ts` |
| 修改 | `src/features/system/dict/components/dict-data-dialog.tsx` |
| 修改 | `src/features/system/dict/components/dict-type-dialog.tsx` |
| 修改 | `src/features/system/dict/form.ts` |
| 修改 | `src/features/system/dict/index.tsx` |
| 修改 | `src/features/system/file/api.ts` |
| 修改 | `src/features/system/file/components/file-preview-dialog.tsx` |
| 修改 | `src/features/system/file/components/file-upload-dialog.tsx` |
| 修改 | `src/features/system/file/index.tsx` |
| 修改 | `src/features/system/file/model.test.ts` |
| 修改 | `src/features/system/file/model.ts` |
| 修改 | `src/features/system/file/search-schema.ts` |
| 修改 | `src/features/system/menu/api.ts` |
| 修改 | `src/features/system/menu/components/menu-icon-picker.tsx` |
| 修改 | `src/features/system/menu/components/menu-parent-picker.tsx` |
| 修改 | `src/features/system/menu/components/menu-tree-panel.tsx` |
| 修改 | `src/features/system/menu/form.ts` |
| 修改 | `src/features/system/menu/index.tsx` |
| 修改 | `src/features/system/menu/model.ts` |
| 修改 | `src/features/system/role/api.ts` |
| 修改 | `src/features/system/role/components/data-table-bulk-actions.tsx` |
| 修改 | `src/features/system/role/components/data-table-row-actions.tsx` |
| 修改 | `src/features/system/role/components/roles-action-dialog-form.ts` |
| 修改 | `src/features/system/role/components/roles-action-dialog.tsx` |
| 修改 | `src/features/system/role/components/roles-columns.tsx` |
| 修改 | `src/features/system/role/components/roles-data-scope-dialog.tsx` |
| 修改 | `src/features/system/role/components/roles-delete-dialog.tsx` |
| 修改 | `src/features/system/role/components/roles-multi-delete-dialog.tsx` |
| 修改 | `src/features/system/role/components/roles-status-dialog.tsx` |
| 修改 | `src/features/system/role/components/roles-table.tsx` |
| 修改 | `src/features/system/role/index.tsx` |
| 修改 | `src/features/system/role/model.ts` |
| 修改 | `src/features/system/role/search-schema.ts` |
| 修改 | `src/features/system/user/api.ts` |
| 修改 | `src/features/system/user/components/data-table-bulk-actions.tsx` |
| 修改 | `src/features/system/user/components/data-table-row-actions.tsx` |
| 修改 | `src/features/system/user/components/users-action-dialog-form.ts` |
| 修改 | `src/features/system/user/components/users-action-dialog.tsx` |
| 修改 | `src/features/system/user/components/users-columns.tsx` |
| 修改 | `src/features/system/user/components/users-delete-dialog.tsx` |
| 修改 | `src/features/system/user/components/users-multi-delete-dialog.tsx` |
| 修改 | `src/features/system/user/components/users-reset-password-dialog.tsx` |
| 修改 | `src/features/system/user/components/users-status-dialog.tsx` |
| 修改 | `src/features/system/user/components/users-table.tsx` |
| 修改 | `src/features/system/user/data/schema.ts` |
| 修改 | `src/features/system/user/index.tsx` |
| 修改 | `src/features/system/user/model.ts` |
| 新增 | `src/features/system/user/search-schema.test.ts` |
| 修改 | `src/features/system/user/search-schema.ts` |
| 修改 | `src/hooks/use-table-url-state.ts` |
| 新增 | `src/lib/api-normalize.ts` |
| 新增 | `src/lib/auth-token.ts` |
| 修改 | `src/lib/handle-server-error.ts` |
| 新增 | `src/lib/http-test-fixtures.ts` |
| 新增 | `src/lib/http.test.ts` |
| 修改 | `src/lib/http.ts` |
| 修改 | `src/lib/ids.ts` |
| 新增 | `src/lib/preload-recovery.ts` |
| 新增 | `src/lib/query-keys.ts` |
| 新增 | `src/lib/sanitize-redirect.test.ts` |
| 新增 | `src/lib/sanitize-redirect.ts` |
| 修改 | `src/main.tsx` |
| 修改 | `src/routes/(auth)/sign-in.tsx` |
| 修改 | `src/routes/_authenticated/$section/$page.tsx` |
| 修改 | `src/routes/_authenticated/route.tsx` |
| 新增 | `src/stores/auth-store.test.ts` |
| 修改 | `src/stores/auth-store.ts` |
| 删除 | `src/tanstack-table.d.ts` |
| 修改 | `src/types/auth.ts` |
| 修改 | `tsconfig.app.json` |
| 修改 | `tsconfig.json` |
| 新增 | `tsconfig.test.json` |

## 最终验证

| 命令 | 退出码 | 结果 |
|---|---|---|
| `bun run build` | 0 | TypeScript 应用、Node 配置、测试类型检查及 Vite 生产构建通过。 |
| `bun test` | 0 | 65 通过，0 失败。包括 S17、会话缓存、持久化迁移及表格回归。 |
| `bun run lint` | 0 | ESLint 通过。 |
| `bun run knip` | 0 | 无未使用依赖或导出报告。 |

验证以 `bun --no-env-file` 执行。构建由临时 Node preload 屏蔽项目环境文件读取，沿用应用默认配置。独立源码复审 PASS。Athena 的 `run` 与 `review prepare` 指向主 checkout，写入 `.ai_state/.runtime/evidence` 和创建 `.ai_state/.runtime/review` 子目录均返回 EPERM。AC5 的正式绑定待主 checkout 接收时完成。

## 第二轮后端接口同步

本轮依据 [backend-api-sync.md](backend-api-sync.md) 和同级后端 worktree 的 Controller、DTO 核对契约。逐项处置见 [merged-findings.md](merged-findings.md#后端接口同步)。

| 命令 | 退出码 | 结果 |
|---|---|---|
| `bun run build` | 0 | TypeScript 与 Vite 生产构建通过。 |
| `bun test` | 0 | 85 通过，0 失败，21 个测试文件。 |
| `bun run lint` | 0 | ESLint 通过。 |
| `bun run knip` | 0 | Knip 通过。 |
| `git diff --check` | 0 | 无空白错误。 |

Bun 使用 `--no-env-file`，Node 通过第一轮的临时 preload 跳过 `.env*`。构建使用默认 API 前缀。通过本地 HTTP 测试服务器实跑登录、刷新、字典分页与空详情、个人资料提交、用户导入导出、菜单多级响应和两类日志清空 403。真实后端与浏览器 Cookie 轮换待联调。

`athena run` 在记录验收证据前因 Git 对象库写入受限退出，报 `unable to create temporary file: Operation not permitted`。上表为写者在当前 worktree 直接执行所得，Athena 树绑定待主 checkout 接收时完成。

### 本轮变更文件

- `src/app/auth/access.ts`
- `src/features/monitor/log-clean.ts`
- `src/features/monitor/log-clean.test.ts`
- `src/features/monitor/login-log/index.tsx`
- `src/features/monitor/oper-log/index.tsx`
- `src/features/settings/profile/components/profile-account-form.tsx`
- `src/features/settings/profile/profile-account-model.ts`
- `src/features/settings/profile/profile-account-model.test.ts`
- `src/features/system/dict/api.ts`
- `src/features/system/dict/api.test.ts`
- `src/features/system/dict/form.ts`
- `src/features/system/dict/index.tsx`
- `src/features/system/dict/model.ts`
- `src/features/system/dict/dict-status.ts`
- `src/features/system/dict/components/dict-data-pagination.tsx`
- `src/features/system/dict/components/dict-data-table.tsx`
- `src/features/system/role/menu-tree-select.test.tsx`
- `src/features/system/user/components/users-import-dialog.tsx`
- `src/features/system/user/components/users-primary-buttons.tsx`
- `src/features/system/user/index.tsx`
- `src/features/system/user/transfer-api.ts`
- `src/features/system/user/transfer.test.tsx`
- `src/features/system/user/user-management-access.ts`
- `src/lib/http.ts`
- `src/lib/http.test.ts`
- `src/types/auth.ts`
- `.ai_state/sprints/2026-11-front-upgrade-audit/design.md`
- `.ai_state/sprints/2026-11-front-upgrade-audit/merged-findings.md`
- `.ai_state/sprints/2026-11-front-upgrade-audit/upgrade-report.md`
