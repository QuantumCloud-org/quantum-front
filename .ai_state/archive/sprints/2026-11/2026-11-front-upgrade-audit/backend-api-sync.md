## 前端接口同步清单

### Web 会话刷新 S17

浏览器路径为 `POST /api/auth/refresh`，网关转发到后端 `POST /auth/refresh`。请求无 body，无需 access token。跨源的同站请求使用 `credentials: "include"` 或 Axios `withCredentials: true`。启用设备绑定的部署应沿用登录时的 `X-Device-Id`。

```http
POST /api/auth/refresh HTTP/1.1
Cookie: refresh_token=<current-refresh-token>
X-Device-Id: <existing-device-id>
```

成功响应。示例使用默认 30 分钟 access token 和勾选记住我后的 7 天 refresh Cookie。

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store
Authorization: Bearer <new-access-token>
Set-Cookie: refresh_token=<new-refresh-token>; Path=/api/auth; Max-Age=604800; Secure; HttpOnly; SameSite=Strict
Set-Cookie: refresh_token=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict

{"code":200,"message":"操作成功","data":{"accessToken":"<new-access-token>","expiresIn":1800},"timestamp":"1794974400000"}
```

失败示例。两条 Cookie 都应由浏览器处理。

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
Cache-Control: no-store
Set-Cookie: refresh_token=; Path=/api/auth; Max-Age=0; Secure; HttpOnly; SameSite=Strict
Set-Cookie: refresh_token=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict

{"code":401,"message":"未认证","timestamp":"1794974400000"}
```

响应会按 Cookie 标准附加 `Expires`，由配置决定 `Secure`。未选择记住我时，新 Cookie 为会话 Cookie。登录也会发放新 Path 的 Cookie 并清理旧 Path，`data` 新增秒数 `expiresIn`，原有 `expireTime` 仍可读取。登出清除两处 Cookie。浏览器的共享 Path 由 `security.refresh-cookie-path` 设置，默认 `/api/auth`，需要覆盖浏览器侧的登录、刷新和登出路由。

前端启动时缺少 access token，先尝试一次刷新。除登录与刷新请求外，接口收到 401 时，共享一个刷新 Promise。刷新成功后更新 access token，再为每个原请求最多重放一次。刷新失败后执行会话 reset 并跳转登录页。

### 字典 S08、S09、E16

表内是后端路径，浏览器请求照常经过 `/api`。`id` 和 `version` 取自详情或列表响应，沿用现有 Long 字符串表示，例如 `"id":"21"`、`"version":"3"`。

| 接口 | 请求 JSON |
|---|---|
| `POST /system/dict/type` | 必填 `dictName`、`dictType`。可选 `business`、`status`、`remark`。 |
| `PUT /system/dict/type` | 创建字段，加必填的 `id`、`version`。已有字典类型的 `dictType` 保持原值。 |
| `POST /system/dict/data` | 必填 `dictType`、`dictLabel`、`dictValue`。可选 `dictSort`、`cssClass`、`listClass`、`isDefault`、`status`、`remark`。 |
| `PUT /system/dict/data` | 创建字段，加必填的 `id`、`version`。允许移动到有权限的字典类型。 |

提交时只发送表中字段。状态值为 0 或 1，`isDefault` 为 `"Y"` 或 `"N"`。非超管无法读取或写入管理员字典。按 ID 读取不可见记录时按空结果处理。管理端 `GET /system/dict/data/list` 接收 `pageNum`、`pageSize`，从 `data.records` 取本页数据，`data.total` 取总数。按类型读取选项的 `GET /system/dict/data/type/{dictType}` 返回数组。

### 用户、菜单与审计

- `POST /system/user/import` 的 `data` 是 `[{row,username,success,message}]`。用文本渲染消息。验证失败时整批回滚，返回失败行，行号含表头。导入最多 1,000 行，导出最多 10,000 行。
- `GET /auth/info` 返回的手机号和邮箱已脱敏。编辑个人信息时，仅提交实际填写的联系方式。
- 已经升级或重置密码的用户可改用户名。改名会结束现有会话，下次使用新用户名登录。变更前仍使用旧格式的用户可先正常登录一次完成自动升级。认证及密码写入以 72 UTF-8 字节为 BCrypt 硬上限，表单继续遵循现有长度规则。
- `GET /system/menu/treeselect` 的 `children` 包含实际子菜单。
- `DELETE /monitor/login/log/clean`、`DELETE /monitor/operlog/clean` 的清空操作只向超管开放。
