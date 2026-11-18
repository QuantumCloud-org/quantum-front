# 前端认证会话架构

最近更新：2026-11-18（sprint：2026-11-front-upgrade-audit）。后端契约见 quantum-backend `.ai_state/architecture/auth-security.md`「Web 会话与 Refresh」。

## Token 存放位置

- access token 只放在内存（zustand store）。刷新页面后，通过 refresh 重新拿回。
- refresh token 放在 HttpOnly cookie 里，由后端写入，前端读不到。
- persist 只持久化 `deviceId`。迁移时会清掉旧版本存下的 `user`。
- localStorage 里另有一个会话 id 标记，用于判断其他标签页是否换了账号。

## Refresh 与重放（`src/lib/http.ts`）

- **触发**：除 `/auth/login`、`/auth/refresh` 外，接口返回 401 时触发 refresh。
- **单飞**：同一时间只发一次 `POST /auth/refresh`，并发请求共用同一个 Promise。refresh 用独立的 `refreshClient` 发，不带 Authorization，带 `X-Device-Id`。
- **重放**：
  - 每个请求最多重放 1 次。
  - 晚到的 401 发现 token 已经被别的请求换过了，就用当前 token 直接重放，不再重复 refresh。
  - 已经 abort 的请求不重放。
- **跨标签页**（`src/lib/auth-session-channel.ts`）：
  - Web Locks 串行化 cookie 轮换。
  - BroadcastChannel 把新 token 分享给同源的其他标签页。
  - 检测到会话 id 变化（另一个标签页换了账号）时，结束当前会话，取消在途请求，并清空 Query 缓存。
- **按结果处理**：

| refresh 结果 | 处理方式 |
|---|---|
| 401 | reset 并跳转登录页，整个过程只跳一次 |
| 409（cookie 已被别处轮换） | 先复用相邻标签页的结果，没有的话最多重试 1 次 |
| 5xx 或网络错误 | 保留会话，允许重试 |

- **公开请求**：
  - 包括 `/auth/captcha`、`/auth/login`、`/auth/refresh`。
  - 这些请求不受会话代际作废的影响：发送前去掉 Authorization，也不会触发 refresh 或重放。
  - 这是 E2E-1 的修复：之前启动时 refresh 返回 401，会把同时在途的验证码响应一起丢掉。

## 启动流程与路由守卫

- **启动**：没有 access token 时，先 refresh，再请求 `/auth/info`。这次 refresh 和拦截器共用同一个单飞 Promise。
- **会话已关闭**：比如刚登出后又进入受保护路由，这时会抛 `SessionClosedError`，路由守卫按 401 处理，跳转到 `/sign-in`。
- **redirect 参数**：统一经过 `src/lib/sanitize-redirect.ts` 净化，拒绝 `//`、反斜杠、控制字符、绝对 URL 和相对路径。

## 缓存

- 用 `src/lib/query-keys.ts` 统一生成 key。导航菜单和当前用户的 key 里带会话代际号。
- 登录、登出、refresh 失败、其他标签页换号，这四种情况都会执行 `queryClient.clear()`。
- 菜单或角色权限变更成功后，让导航缓存失效。

## 部署约束

- 浏览器侧的 API 前缀：dev 是 `/api`，prod 是 `/talent_manger`。后端 cookie 的 Path 必须覆盖浏览器侧的 `<前缀>/auth`。
- 2026-11-18 已用 E2E 验证：真实 Chromium 加真实后端，prod 的 Path `/talent_manger/auth` 下，6 个场景全部通过。
