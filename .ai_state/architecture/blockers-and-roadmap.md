# quantum-front · 技术栈 / 阻碍 / 完善设计

> 2026-07-11 由全景对账产出。配套阅读: [docs/ai/convention-pack/conventions.md](../../docs/ai/convention-pack/conventions.md)
> (含会话/导航层 mock 约定 + 验证实体选择原则) · quantum-backend `.ai_state/architecture/blockers-and-roadmap.md` (总路线)。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | React 19 + Vite (SPA) |
| 语言 | TypeScript strict (`tsc -b`, 禁 any) |
| 路由/数据/表格 | TanStack Router (file-based, `_authenticated` 动态路由) / Query / Table |
| 校验/状态 | zod v4 / zustand (auth-store 等) |
| UI | shadcn + Radix + lucide-react, Tailwind |
| 包管理/测试 | bun (`bun test`, 22 tests) |
| 网络 | axios 单实例 `apiClient` (`/api` 代理 → BE, Bearer + X-Device-Id 拦截器) |
| 权限 | 后端菜单驱动 (`/system/menu/getRouters` → page-registry 匹配) + `hasPermission/hasAccess` 守卫 (`<entity>-management-access.ts` 模式) |
| **mock 基建** (S4 落地, 永久) | `VITE_FEATURE_MOCK=true bun run dev` 短路 auth 会话 + 菜单两个网络出口到 fixtures (`src/lib/mock/`); **生产 build 强制 pin 'false' + 裸内联 DCE, fixtures 零泄漏** (安全硬约定, 见 conventions"生产隔离") |
| AI 契约 | Convention Pack (`docs/ai/convention-pack/`) 供 Rlues `scaffold-page-gen` 消费; **脚手架无关已实证** (S4: skill 核心 diff=0 跑通本仓) |

## 当前阻碍

1. **[债·配对] mock demo 入口当前 404** — `session-fixtures.ts` 的菜单 fixture 指向已回滚的
   `system/asset/index` (S4 演示物验后回滚是设计行为)。运行时 `warnOnUnpairedMockRoutes()` 会 console.warn
   指引。**下次用 scaffold-page-gen 生成真实实体时按 conventions"配对更新"三处 lockstep 即自然清**, 无需专项修。
2. **[依赖·BE] 真实 API 联调未验** — mock-off 模式打真实 BE 需要 quantum-backend 环境 (postgres+redis) 就绪,
   即 BE 仓阻碍 1; 属 F7 范围。
3. **[债·CI] G4 门禁产物级校验未进 CI** — `VITE_FEATURE_MOCK=true bun run build` 后 grep dist 零泄漏这条验收
   目前靠人跑, 应固化为 CI 步骤 (proposals 已记, 归 Rlues pack 升级)。

## 完善设计

| 步 | 内容 | 说明 |
|---|---|---|
| 1 | 跟随 BE 环境就绪, **F7 联调**: mock-off + `VITE_API_PROXY_TARGET` 指向真实 BE, 走登录→菜单→页面全链 | 与 BE 步 3 同一 sprint |
| 2 | **首个生产业务页**: scaffold-page-gen 生成真实实体 (含 deptId 关联维度, 按验证实体原则), 演示物不再回滚 → 顺手清阻碍 1 (fixtures 配对到真实页) | S4 已证零返工路径 |
| 3 | CI 增加产物级安全校验: production build + grep `VITE_FEATURE_MOCK`/fixture 标识零命中 | 清阻碍 3 |
| 4 | 按业务需求迭代 (页面均走 pack 约定: access 守卫 + G1-G6 门禁) | 常态化 |
