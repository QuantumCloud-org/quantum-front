# polish / cleanup-pass — 2026-11-front-upgrade-audit

本轮的清理工作：
- 删除死代码和死依赖（F26-F30）
- 合并重复的工具函数（F21-F23），统一 query key 工厂（O2）
- 升级到 zod 4 新 API（O1），开启类型感知 lint（O3），把测试纳入类型检查（O4）

以上都由写者在 worktree 内完成，详见 `merged-findings.md`；没有另外再跑一轮 polish。

架构档：新增 `.ai_state/architecture/auth-session.md`。

留下的 P3：D-001 `skipSession` 只在测试中使用。
