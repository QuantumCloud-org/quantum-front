# quantum-front · 依赖与漏洞审计 (2026-07-31)

> 触发: 用户要求扫描漏洞 + 用 deps-check 对比上游 [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin)。
> 配套阅读: [blockers-and-roadmap.md](blockers-and-roadmap.md) · 索引 [_index.md](../_index.md)。

## 结论

**无漏洞抵达生产用户。** `bun audit` 报 6 项 (5 high + 1 low), 逐项核验后确认全部只存在于
dev / build 期。本次以 range 内刷新清掉 2 项, 剩 4 项经论证暂不处理。

## 漏洞逐项定性

| 包 | 严重度 | 路径 | 进生产? | 处置 |
|---|---|---|---|---|
| `form-data` 4.0.5 | high | axios → form-data | **否** (已实证) | 已修 → 4.0.6 |
| `postcss` 8.5.15 | high | vite (构建期) | 否 | 已修 → 8.5.25 |
| `brace-expansion` 2.1.0 | high ×3 | eslint/prettier → minimatch | 否 | 暂留, 见下 |
| `@babel/core` | low | router-plugin, eslint | 否 | 暂留 |

### form-data 为何不进生产 (关键论证)

axios 是运行时依赖, 故 `form-data` 初看像是唯一会随包发到浏览器的一项。实际不会:

- axios `package.json` 的 `browser` 字段把 `lib/platform/node/classes/FormData.js`
  映射到 `lib/helpers/null.js`, 浏览器构建根本不引 form-data。
- 产物实证: `grep dist/assets` 中 `form-data` 的 4 处命中全是 MIME 串 `multipart/form-data`;
  该包的实现标记 `combined-stream` / `asynckit` / `getBoundary` / `_multiPartHeader` / `mime-types`
  **零命中**。

### brace-expansion / @babel/core 为何暂不处理

需要 `overrides` 强钉才能压到安全版。但依赖图中同时存在 `brace-expansion` 2.x 与 5.x 两棵树
(minimatch 9 要 `^2.x`, minimatch 10 要 `^5.0.8`), 平钉单一版本有压垮 minimatch 的风险。
而该 DoS 的触发条件是攻击者可控的 glob 模式 —— 在 lint / prettier 场景下, 能控 glob 者
已经控了本仓库。风险收益不成比例, 故显式记为**已知接受项**, 而非遗漏。

## 源码审计

### 已修

1. **权限守卫 fail-open** (`src/app/auth/access.ts`) — `ensureRouteAccess` 在 `user` 为 null 时
   直接 return 即放行。可达路径: `fetchCurrentUser` 无运行时校验, 后端以 200 返回空 `data` 时
   `setUser(null)` 且不抛错 → `_authenticated` beforeLoad 放行 → 之后所有权限校验全部命中该
   return。已改 fail-closed, 并新增 `parseAuthUser` 在信任边界用 zod 卡住 identity。
2. **上传校验与 UI 承诺不符** (`file-upload-dialog.tsx`) — 文案称禁止 exe/bat/sh, 代码只校验体积。
   已补 `getUploadRejectionReason` (体积 + 结尾扩展名黑名单, 大小写不敏感)。
   注: 客户端校验不是安全边界, 服务端仍须自行校验。

### 已核验无问题 (记录以免重复排查)

- **开放重定向**: `?redirect=` 参数不可外跳。`resolvePath` 按内部路径解析, `cleanPath`
  把 `//` 收成 `/`, 且导航一律走 `history.pushState`, 从不用 `location.href`。
- **XSS 汇聚点**: 无 `dangerouslySetInnerHTML` / `eval` / `new Function` / `innerHTML=`。
- **密钥**: 源码无硬编码密钥。`.env.dev` / `.env.produce` 虽入 git, 但键全是 `VITE_*` ——
  Vite 本就会把它们打进客户端包, 属公开配置而非泄漏。
- **token 存储**: `auth-store.ts` 的 `partialize` 刻意不持久化 `accessToken` (仅内存), 设计正确。
- **mock 生产隔离**: production build 后 grep `dist/` 对 `MOCK_DEMO_USER` / `demo@` 均零命中,
  DCE 按 conventions"生产隔离"约定生效。**注意: 这只是本次人工复跑, 未清
  [blockers-and-roadmap.md](blockers-and-roadmap.md) 阻碍 3 —— 该条要求的是把此校验固化进 CI。**

## 上游对比 (satnaing/shadcn-admin)

**共享依赖上本仓普遍领先上游**, 无版本需要追平 (react 19.2.8 vs 19.2.5 · vite 8.2.0 vs 8.0.8 ·
zod 4.4.3 vs 4.3.6 · tailwind 4.3.3 vs 4.2.2 · react-day-picker 10.0.1 vs 9.14.0)。

| 上游资产 | 取否 | 理由 |
|---|---|---|
| vitest browser-mode 测试基建 | **暂不取** (用户 2026-07-31 决定) | 唯一实质能力缺口: 上游 16 个 `.tsx` 组件测试, 本仓 0 —— `bun test` 无 DOM, 结构上测不了组件。后续若要补组件测试, 这是现成路径 |
| `@clerk/react` | 不取 | 上游的托管认证。本仓有自有后端会话 (Bearer + X-Device-Id + deviceId), 引入等于放弃独立性 |
| `@faker-js/faker` | 不取 | 本仓已有自建 mock fixtures (`src/lib/mock/`) |
| prettier `importOrder` 配置 | 不取 | 纯风格, 会在 279 个文件上产生无关 diff |

## 顺带发现 (未处理)

- **产物有 1.5 MB 单块** (`search-provider`, gzip 419 kB)。成因: `nav-group.tsx` 用
  `lucide-react/dynamic` 的 `DynamicIcon`, 把全套约 1600 个图标拉进主导航路径。
  后端驱动的菜单图标选择器需要动态图标, 但导航渲染不需要 —— 可改为按 `icon-registry.ts` 收敛。
- **`format:check` 全仓不过**: 审计前基线即 83 个文件不合规 (prettier 3.8.4), 依赖刷新后
  86 个 (3.9.6)。属既有欠账, 非本次引入; 本次只格式化了自己改动的文件, 未做全仓 reformat
  (会淹没 diff)。

## 验证

`bun test` 46 pass (审计前 22, 本次新增 24) · `bunx tsc -b --noEmit` · `bun run lint` ·
`bun run build` 全绿。
