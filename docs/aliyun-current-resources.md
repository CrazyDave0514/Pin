# PIN 阿里云当前资源清单

更新时间：2026-05-26

## 已创建资源

- 地域：`cn-hangzhou`
- RAM 用户：`pin-developer`
- OSS Bucket：`pin-app-storage`
  - ACL：`private`
  - 公网 Endpoint：`oss-cn-hangzhou.aliyuncs.com`
- 函数计算 Service：`pin-api`
  - Function：`pin-app`
  - 已发布新版路由与 Tablestore 存储层代码
  - 已绑定执行角色：`PinFcExecutionRole`
  - 已内置 `tablestore` 依赖并重新打包发布
  - 已验证直调 `InvokeFunction` 可返回 `/health`
  - 已验证存储路由 `GET /users/current` 可正常返回 `null`
- API 网关分组：`pin-api-group`
  - GroupId：`ee8a7564e6124d75a7e558be596a6e09`
  - 调试域名：`ee8a7564e6124d75a7e558be596a6e09-cn-hangzhou.alicloudapi.com`
- Tablestore 实例：`pin-main`

## 本地函数骨架

- 目录：`infra/aliyun/pin-api`
- 入口：`index.handler`
- 健康检查路径：`/health`
- Tablestore 存储层：`tablestore-store.js`
- 已兼容函数直调常见事件形态：字符串、嵌套 body、Buffer、Uint8Array

## 下一步

1. 在你明确确认后，二选一开放前端可访问入口：
   - 更快：创建临时公网 HTTP Trigger
   - 更稳：继续走 API 网关转发到 `pin-api/pin-app`
2. 将 `AliyunPinDataProvider` 指向真实公网地址联调。
3. 增加 OSS 上传签名与更细的错误处理。

## 安全说明

当前没有将长期 `AccessKey` 写入函数环境变量，函数通过执行角色自动注入的临时凭证访问 Tablestore。

这意味着：

- 云函数已经可以安全访问 Tablestore。
- 还未开放匿名公网入口，因此前端尚未切到真实云端地址。

当前已完成：

- 使用 RAM 执行角色让 `pin-api` 服务获得安全访问 Tablestore 的能力。
- 使用执行角色注入的 `ALIBABA_CLOUD_ACCESS_KEY_ID`、`ALIBABA_CLOUD_ACCESS_KEY_SECRET`、`ALIBABA_CLOUD_SECURITY_TOKEN` 读写表存。
