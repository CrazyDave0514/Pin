# PIN 阿里云接手文档

更新时间：2026-05-26

## 1. 当前结论

PIN 的本地 `pin_*` 存储服务层收口已经完成，阿里云基础资源、函数、表存、最小网关链路也已经搭起来了。

当前状态分为两部分：

- 云函数事件直调可用
- API 网关到函数的健康检查链路已打通到函数运行时，但仍卡在 HTTP Trigger 响应格式

也就是说：

- `fc-open InvokeFunction` 方式可以正常调用函数
- 通过 API 网关访问 `GET /pin/health` 目前仍返回 `502`
- 当前 502 的直接报错是：
  - `Wrong response argument type`

## 2. 已完成内容

### 代码侧

- 本地存储服务层已完成统一收口，页面层已改为通过 Promise 风格 service 接口访问
- 已新增阿里云 provider 和配置入口
- 已落阿里云函数代码：
  - `infra/aliyun/pin-api/index.js`
  - `infra/aliyun/pin-api/tablestore-store.js`
  - `infra/aliyun/pin-api/package.json`
- 已将 `tablestore` 依赖手工打入函数包
- 已兼容：
  - 直调事件字符串
  - 嵌套 body
  - `Buffer`
  - `Uint8Array`
  - `/pin` 网关前缀剥离

### 云资源侧

- 地域：`cn-hangzhou`
- OSS Bucket：`pin-app-storage`
- FC Service：`pin-api`
- FC Function：`pin-app`
- API 网关分组：`pin-api-group`
- API 网关调试域名：
  - `https://ee8a7564e6124d75a7e558be596a6e09-cn-hangzhou.alicloudapi.com`
- Tablestore 实例：`pin-main`

### Tablestore 已建表

- `pin_users`
- `pin_projects`
- `pin_folders`
- `pin_artworks`
- `pin_points_records`
- `pin_recent_imports`
- `pin_relations`
- `pin_settings`

### RAM / 权限

- 函数执行角色：`PinFcExecutionRole`
  - `AliyunOTSFullAccess`
  - `AliyunOSSReadOnlyAccess`
- API 网关调用函数角色：`PinApiGatewayInvokeRole`
  - `AliyunFCInvocationAccess`

### 已创建的 API / Trigger

- 传统 API 网关 API：
  - `PinRouterGet`
    - ApiId: `9f8b259eb79a47e1b0d207aefc29657d`
    - 说明：FC3 事件函数直连尝试，已发布，但当前调用返回 `FunctionNotFound`
  - `PinHealthGet`
    - ApiId: `20fb47bb998747999e4aed7565320a59`
    - 说明：通过 HTTP Trigger 内网地址转发到函数，已发布
- FC HTTP Trigger：
  - `pin-http-internal`
  - `urlInternet`: `https://pin-app-pin-api-ghvahvirmj.cn-hangzhou.fcapp.run`
  - `urlIntranet`: `https://pin-app-pin-api-ghvahvirmj.cn-hangzhou-vpc.fcapp.run`
  - 配置：`authType=anonymous`，`disableURLInternet=true`

## 3. 已验证结果

### 通过

- `node --test tests/pin-services.test.ts`
- H5 build
- `fc-open InvokeFunction` 调用：
  - `GET /health` 返回 `200`
  - `GET /users/current` 返回 `200`，无登录态时 `data: null`

### 未通过

- `curl https://ee8a7564e6124d75a7e558be596a6e09-cn-hangzhou.alicloudapi.com/pin/health`
  - 当前返回 `502`
  - 运行时错误：
    - `Wrong response argument type`

## 4. 当前卡点判断

当前最可能的卡点不在网关，也不在网络与权限，而在：

- FC Node.js 18 CommonJS 函数通过 HTTP Trigger 返回响应时，运行时对返回值类型的要求，与当前实现仍不一致

现有函数已经尝试过两轮调整：

- 同时 `return response` + `callback(null, response)`
- 有 `callback` 时只走 `callback(null, response)`

但网关经由 HTTP Trigger 的调用仍然报相同错误。

这说明接手人需要优先处理的是：

- HTTP Trigger 下 Node.js 18 的正确响应形式
- 或者改为阿里云文档更推荐、更稳定的处理方式：
  - 纯事件函数链路
  - 或单独拆一个 HTTP Trigger 专用函数入口

## 5. 建议接手顺序

1. 先只处理 `PinHealthGet -> /pin/health`
2. 让这条网关健康检查返回 `200`
3. 确认 HTTP Trigger 专用响应格式后，再批量铺其余 API
4. 再把前端 `AliyunPinDataProvider.baseUrl` 指向网关域名联调

## 6. 推荐技术方案

优先推荐接手人这样做：

1. 给 `infra/aliyun/pin-api/index.js` 单独拆一个“HTTP Trigger 返回适配层”
2. 明确区分两种入口：
   - FC 事件直调
   - HTTP Trigger / API 网关入口
3. 如果当前 CommonJS 方式仍不稳定，直接改成更贴阿里云示例的最小 handler
4. 先用一个极简返回值验证：
   - `callback(null, { statusCode: 200, body: 'ok' })`
5. 健康检查通过后，再把现有业务路由封回去

## 7. 关键文件

- 服务层
  - `src/services/pin/index.ts`
  - `src/services/pin/aliyun-provider.ts`
  - `src/services/pin/aliyun-config.ts`
  - `src/services/pin/local-provider.ts`
  - `src/services/pin/types.ts`
- 云函数
  - `infra/aliyun/pin-api/index.js`
  - `infra/aliyun/pin-api/tablestore-store.js`
  - `infra/aliyun/pin-api/package.json`
- 表存与环境
  - `infra/aliyun/tablestore/create-pin-tables.sh`
  - `infra/aliyun/.env.aliyun.example`
- 文档
  - `docs/aliyun-current-resources.md`
  - `docs/aliyun-provider-integration.md`
  - `docs/aliyun-tablestore-schema.md`
  - `docs/aliyun-ram-role-setup.md`

## 8. 安全提醒

- 对话里出现过一组 `AccessKey`，应视为已暴露
- 后续请旋转或删除旧密钥
- 当前函数环境中没有写入长期密钥，这是正确状态

