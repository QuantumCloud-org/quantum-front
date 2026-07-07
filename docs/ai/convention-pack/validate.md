# quantum-front Convention Pack — 校验与自修

生成页面模块后必须依次通过：**类型/构建校验 → 安全门禁 (grep) → 人工确认清单**，全部通过才算完成。
分工：语法/类型正确性由 `tsc`/`eslint`/`vite build` 兜底；**权限守卫是否被生成 + mock 开关是否误提交
由安全门禁 + 人工清单兜底**（编译器不会告诉你少了一个 access 守卫）。

前提：`node_modules` 已装好（`bun install`，若 lockfile 未变可跳过）。

## 1. 类型 / Lint / 构建校验

```bash
cd quantum-front

# 首次或依赖变更后
bun install

# 类型检查（增量，比全量 build 快，日常自修用这个）
bunx tsc -b --noEmit

# lint（含 react-hooks / unused-vars / consistent-type-imports 等规则）
bun run lint

# 格式检查（可选，CI 才强制；生成阶段建议顺手跑一遍避免 review 打回）
bun run format:check

# 全量兜底（tsc -b && vite build，验证真的能出产物）
bun run build
```

自修流程：

1. 跑 `bunx tsc -b --noEmit`，收集 `error TS....`，按文件定点修复
   （常见：模板占位 `{{xxx}}` 没替换干净导致的语法错误 / 类型不匹配）。
2. 跑 `bun run lint`，修复 `no-unused-vars`（模板里 TODO 字段没接入组件时容易残留）、
   `consistent-type-imports`（类型导入必须 `import { type Xxx }`）等报错。
3. 重跑直到全绿，再跑 `bun run build` 做最终确认。

## 2. 安全门禁（grep，硬性 — 任一 FAIL 即未完成）

生成器（AI）**必须**在类型校验通过后执行以下检查，并把结果写进生成报告：

```bash
MODULE_DIR=src/features/<module>/<entity>   # 例：src/features/system/dept

# G1 权限守卫文件存在（安全默认启用）
[ -f "$MODULE_DIR"/<entity>-management-access.ts ] && echo "G1 PASS" || echo "G1 FAIL"

# G2 页面组件/表格/行操作至少一处引用了 access 守卫（防止文件生成了但没接入）
grep -rlqE "get[A-Z][a-zA-Z]*ManagementAccess\(" "$MODULE_DIR" && echo "G2 PASS" || echo "G2 FAIL"

# G3 模板占位残留：生成产物不得残留 {{Xxx}} 形态的占位符
# 注意：不能用裸 grep "{{"——JSX 内联对象字面量 `value={{ open, ... }}`（见 users-provider.tsx）
# 会造成误报，必须限定"无空格双花括号包变量名"这个更精确的占位符形态。
! grep -rqE "\{\{[A-Za-z_]+\}\}" "$MODULE_DIR" && echo "G3 PASS" || echo "G3 FAIL"

# G4 mock 开关未误提交为默认开启（.env.dev / .env.produce 不得出现 VITE_FEATURE_MOCK=true）
! grep -qE "^VITE_FEATURE_MOCK=true" .env.dev .env.produce 2>/dev/null && echo "G4 PASS" || echo "G4 FAIL"

# G5（若本次生成含 mock.ts）mock 数据结构字段名与 model.ts 的实体类型同名字段一致，
# 至少静态检查 mock.ts 是否 import 了 model.ts 的类型（防止 mock 用 any 绕过类型契约）
[ ! -f "$MODULE_DIR"/mock.ts ] || grep -qE "from '\./model'" "$MODULE_DIR"/mock.ts && echo "G5 PASS" || echo "G5 FAIL"

# G6 新页面已在 page-registry.tsx 注册（route-registration.md 的挂载动作）
grep -q "'<module>/<entity>/index'" src/app/navigation/page-registry.tsx && echo "G6 PASS" || echo "G6 FAIL"
```

**豁免规则（唯一例外路径）**：确认页面无需权限守卫（极少见，纯静态说明页/无数据交互）时，
允许不生成 `<entity>-management-access.ts`，此时 G1-G2 免检，但生成报告**必须**包含一行：

```
access-guard-exempt: <Entity> <原因，如"纯静态帮助页，无数据读写">
```

无豁免行而 G1-G2 FAIL = 生成未完成，回到模板重新补齐。禁止以"页面简单"为由静默跳过。

## 3. 生成后人工确认项（AI 不得擅自略过）

- [ ] 每个写操作入口（新建/编辑/删除/状态切换按钮、行内菜单项）都受
      `<entity>-management-access.ts` 对应布尔值门控（`canCreateXxx`/`canEditXxx`/...），
      不是无条件渲染
- [ ] 新建/编辑表单如依赖关联下拉数据（角色/部门/菜单树），access 守卫里对应查询权限
      （如 `system:dept:treeselect`）已一并 `&&`，而不是只判主动作权限
- [ ] 受保护记录（若该实体存在"内置/系统级不可删"的记录，如 `admin` 用户、超管角色）
      有等价 `<entity>-guards.ts` 排除逻辑，且已接入表格的 `enableRowSelection`
- [ ] 分页字段命名为 `pageNum/pageSize/total/pages/records`（与后端 `PageResult` 对齐），
      非 `page/size/count` 等异名
- [ ] 所有 Long 型主键/外键字段（id、关联 id、id 数组）经过 `toId`/`toIdList`，
      未出现裸 `Number(record.id)`
- [ ] `mock.ts`（若生成）字段结构与 `model.ts`/`data/schema.ts` 的实体类型完全对齐，
      `api.ts` 的 `USE_MOCK` 短路只在文件顶层判断一次
- [ ] `page-registry.tsx` 里新增的 `backendComponent` 字符串已同步给后端
      （用于其 `menu-permission.sql` 的 `component` 字段），两侧手打字符串一致
- [ ] `bun run build` 产物无 TS 报错，`bun run lint` 无新增 warning/error

## 4. 报告

完成后报告：新增/修改文件清单 + 安全门禁 G1-G6 结果（或豁免行）+ `page-registry.tsx` 注册的
`backendComponent`/`fullPath`（供后端核对 `menu-permission.sql`）。
