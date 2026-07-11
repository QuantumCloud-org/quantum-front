---
# Athena PACE 项目状态 (.ai_state/_index.md)
# v9.9.0 schema. quantum-front 于 2026-07-09 S4 sprint 期间 athena-init 建立。
version: "9.9.0"

# === PACE 路由状态 ===
path: ""                          # Hotfix | Bugfix | Quick | Feature | Refactor | System
stage: ""                         # 无进行中 sprint (S4 状态 bridge 落 quantum-backend .ai_state)
current_sprint_slug: ""
current_roadmap_slug: ""
skip_polish: false
skip_architecture_check: false
skip_runtime_verify: false

# === 路由审议 (v9.9.0) ===
route_confidence: 0.0
route_history: []
plan_model: ""

# === 平台与版本 ===
platforms_enabled: ["both"]       # CC 会话驱动本次 init; CX 亦可用
cc_version: "claude-code (desktop app 会话)"
cx_version: "codex-cli 0.142.5"
ag_callable: false

# === 平台原生能力 ===
platform_features:
  cc_subagent_task: true
  cc_ultrathink_supported: true
  cc_isolation_worktree: true
  cc_subagent_stop_hook: true
  cc_worktree_hooks: true
  cc_stop_prompt_hook: true
  cx_spawn_agent: true
  cx_plan_mode_reasoning_effort: true
  cx_spawn_agents_on_csv: true
  ag_parallel_subagents: false
  ag_headless_p: false

# === 工具可用性 (2026-07-09 实测) ===
tools_available:
  context7_cli: false
  context7_mcp_cx: false
  augment_mcp_cc: false
  augment_mcp_cx: false
  web_search_cc: true
  web_search_cx: false
  rg_available: true
  jq_available: true
  agentshield_cli: false
  vm_available: false
  bun: "1.3.14"

# === 进度计数 ===
counts:
  features_count: 0
  issues_count: 0
  refactors_count: 0
  systems_count: 0
  requirements_count: 0
  reviews_count: 0
  cleanup_count: 0
  compound:
    learning: 0
    trick: 0
    decision: 0
    explore: 0

# === Pointers ===
pointers:
  latest_design: ""
  latest_review: ""
  latest_cleanup: ""

# === PACE 联动字段 ===
next_action: ""
last_subagent: "generator"
last_subagent_at: "2026-07-09"
active_worktrees: []

# === 用户偏好 ===
plan_critique_max_rounds: 4
plan_critique_min_rounds: 0
plan_critique_disabled: false
network_in_polish: true

fingerprint: ""
---

# quantum-front · Athena Project State Index (v9.9.0)

## 项目快照

- Project: quantum-front (企业 web 前端脚手架; React 19 + Vite + TS strict + TanStack Router/Query/Table + zod v4 + zustand + shadcn)
- Package manager / test runner: `bun 1.3.14`
- 校验: `bunx tsc -b --noEmit` / `bun run lint` / `bun run build` / `bun test`

## 当前事实

- 2026-07-09: athena-init 建立本 .ai_state (S4 sprint 期间)。S4 (scaffold-page-gen 端到端实跑 + 脚手架无关验证)
  的 sprint 状态档案落 quantum-backend `.ai_state/sprints/2026-07-09-s4-fe-scaffold-loop-verify/` 作 bridge;
  未来 FE 自有 sprint 迁入本目录。
- S4 落地的**永久基建** (非 sprint 临时物): 会话/导航层 mock (`src/lib/mock/`, auth/navigation api 短路,
  vite.config `VITE_FEATURE_MOCK` 注入) + Convention Pack 增补 (导航层 mock 约定 + 验证实体选择原则)。
  详见 `docs/ai/convention-pack/conventions.md`。

## 架构与路线

- [architecture/blockers-and-roadmap.md](architecture/blockers-and-roadmap.md) — 技术栈 / 阻碍 / 完善设计 (2026-07-11)

## AI 契约

- Convention Pack: `docs/ai/convention-pack/` (conventions / validate / runtime-env / templates) —
  供 Rlues `scaffold-page-gen` skill 消费。本仓库是"平面 B 目标脚手架"之一 (三平面架构见
  quantum-backend `docs/ai-sprint-design.md`)。


## 历史
- `2026-07-10 05:33:14`: stage=  sprint=  turn-end
- `2026-07-10 04:52:23`: stage=  sprint=  turn-end
