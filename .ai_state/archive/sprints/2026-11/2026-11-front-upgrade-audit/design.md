---
sprint: "2026-11-front-upgrade-audit"
path: "System"
created: "2026-11-18"
req: ".ai_state/requirements/front-upgrade-audit-2026-11.md"
roadmap: ""
item: ""
base_commit: "f23d2ad"
branch: "chore/front-upgrade-audit-2026-11"
worktree: "/Users/mi_manchi/workspace/quantum/quantum-front-wt-upgrade"
review_ignore: []
---

# Design — 2026-11-front-upgrade-audit

## 背景

见 req。与后端 sprint `quantum-backend/.ai_state/sprints/2026-11-deps-upgrade-audit` 联动，S17 刷新契约以下方为准。本机 Node v26.10.0（只有一个版本），bun 1.4.4，package.json 里 packageManager 写的是 bun@1.3.14。

## 方案

1. 扫描：Codex `gpt-6.2-astra` 只读扫描，Opus 只读扫描，两边并行，产出 `astra-scan.md` 和 `opus-scan.md`，由主 agent 合并成 `merged-findings.md`。
2. 升级与重构：Codex `gpt-6.2-sol` 在 worktree `../quantum-front-wt-upgrade` 里执行。先逐个包升级，每个包都跑 build；再按合并清单修复，补上 S17 的前端部分。
3. 收尾：Codex `gpt-6.2-astra` 把前后端整体复核一遍，然后主 agent 复跑检查，再派独立 reviewer。
- 备选方案：先升级再扫描。没采用，因为扫描结论能告诉我们哪些包是死依赖、可以直接删，避免白升。

## 验收标准

- AC1: `upgrade-report.md` 列出每个依赖的「旧版本 → registry 最新稳定版」，没升的写原因。验证: athena run --covers AC1 -- bun run build
- AC2: build、test、lint 全部退出码 0。验证: athena run --covers AC2 -- bun run build && bun test && bun run lint
- AC3: `merged-findings.md` 里 P0-P2 的项都已修，或写明不修的原因。验证: athena run --covers AC3 -- bun test
- AC4: 按 S17 契约实现单飞 refresh 和请求重放，启动时会尝试一次 refresh，有单测覆盖。验证: athena run --covers AC4 -- bun test
- AC5: 独立 review 放行。

## S17 刷新契约

- 后端新增 `POST /auth/refresh`（permitAll，不需要 access token）：从 HttpOnly refresh cookie 读取 refresh token 并轮换。成功返回 200，body 复用 /auth/login 的 LoginResponse 中 token 相关字段（accessToken、expireTime 等，以后端现有类为准；前端只依赖 accessToken），同时设置 `Authorization: Bearer <access>` 响应头，并下发新的 refresh cookie。失败返回 401，并清除 cookie。
- refresh cookie 的 Path 改为配置项 `security.refresh-cookie-path`，默认值 `/api/auth`。浏览器侧路径带 /api 前缀，这个 Path 能同时覆盖 /api/auth/refresh、/api/auth/logout 和 /api/auth/login。写新 cookie 时，再下发一条 `Path=/; Max-Age=0` 的同名 cookie，清掉旧路径的 cookie。
- `TokenAuthenticationFilter` 不再自动续期：access token 无效时直接按未认证处理，返回 401。
- 前端：除 login 和 refresh 外，任何请求收到 401 都先单飞（并发请求共享同一个 Promise）调用一次 `/auth/refresh`，成功后用新 token 重放原请求，每个请求最多重放 1 次；refresh 失败才执行 reset 并跳转登录页。应用启动时如果没有 access token，先尝试调用一次 refresh。

## 允许写集

package.json、bun.lock、src/**、配置文件（vite、tsconfig、eslint、knip）、本 sprint 目录。

## 不做

UI 视觉改版；用户尚未提交的 docs/ai、demo/、.ai_state/docs。
- 生产环境浏览器前缀是 /talent_manger，后端 prod 的 cookie Path 为 /talent_manger/auth（用户裁定）。前端不改 base URL。
- 模板页（sign-up、forgot-password、otp、dashboard）用户裁定全部保留，只去掉 console.log 和明文表单数据输出。
