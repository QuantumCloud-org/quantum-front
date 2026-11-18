# 2026-11 前端组件升级 + 全量审查 + 写法现代化

## 动机
用户 2026-11-18：前端与后端（quantum-backend sprint 2026-11-deps-upgrade-audit）一起扫描、升级，用最新写法，确保高效、安全、稳定；先由 gpt-6.2-astra 与 Opus 联合扫描，再升级、再重构。

## 范围
- 包含：package.json 全部依赖升到 npm registry 最新稳定版（含 major，不兼容的回退并写原因）；packageManager/engines 与本机对齐；astra+Opus 扫描出的安全/性能/重复/垃圾代码修复；React 19 / TanStack / zod 4 等新写法；配合后端 S17 的 refresh 流程改造。
- 不含：UI 视觉改版；用户未提交的 docs/ai、demo/、.ai_state/docs 改动不动。

## 验收标准
- AC1：依赖清单逐项附 registry 最新稳定版，已升或写回退原因。
- AC2：`bun run build`（tsc -b + vite build）、`bun test`、`bun run lint` 均退出码 0。
- AC3：审查清单 P0-P2 已修或写不修原因；每条含 文件:行。
- AC4：401 → 单飞调用 POST /auth/refresh → 重放原请求；refresh 失败才登出；启动时无 access token 先尝试 refresh。有单测。
- AC5：独立 review 放行。
