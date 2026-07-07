# 路由挂载说明（非模板文件，动态路由无需新建 route 文件）

> 详细机制见 `../conventions.md` 「路由挂载方式」一节。本文件只给生成器一个可直接执行的 diff 动作。

## 结论

quantum-front 的系统管理页全部走单一动态路由 `src/routes/_authenticated/$section/$page.tsx`。
新增 `<module>/<entity>` 页面**不需要**在 `src/routes/` 下新建任何文件。

## 需要执行的唯一动作

编辑 `src/app/navigation/page-registry.tsx`：

1. 顶部 import 区加一行：
   ```ts
   import { {{Entity}}ManagementPage } from '@/features/{{module}}/{{entity}}'
   ```
2. `backendPageDefinitions` 数组追加一条（保持数组内按业务域分组的既有顺序，插入到同域末尾）：
   ```ts
   {
     backendComponent: '{{module}}/{{entity}}/index',
     fullPath: '/{{module}}/{{entity}}',
     render: (props) => <{{Entity}}ManagementPage {...props} />,
   },
   ```

## 强约束（否则页面能编译但运行时 404/403/不出现在菜单）

- `backendComponent` 字符串必须和后端 `sys_menu.component` 字段**逐字符一致**
  （后端 menu-permission.sql 落库时写的是 `'{{module}}/{{entity}}/index'`，前后端两处必须同步，
  建议生成时从同一个变量/参数派生，不要分别手打）。
- `fullPath` 必须和后端菜单树按 `parent.path` 拼接出的全路径一致（`joinBackendPath` 的拼接规则，
  见 `src/app/navigation/registry.ts`），否则 `$section/$page.tsx` 里的
  `backendRoute.router.component !== pageDefinition.backendComponent` 校验会失败，
  用户访问该 URL 会被重定向到 `/404`。
- 若页面组件不需要 `search`/`navigate`（无 URL 状态的静态管理页，如 `MenuManagementPage`），
  `render` 可以写成 `render: () => <XxxManagementPage />`（对照 `dept`/`menu` 的注册写法）。
- 本次挂载动作不涉及左侧菜单文案/图标——那些由后端 `sys_menu` 的 `menu_name`/`icon` 驱动，
  前端 `registry.ts` 自动派生，不需要在前端重复配置。
