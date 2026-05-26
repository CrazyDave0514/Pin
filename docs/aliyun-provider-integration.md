# PIN 阿里云 Provider 接入说明

更新时间：2026-05-26

## 1. 当前状态

`AliyunPinDataProvider` 已从纯占位实现升级为：

- 可配置 `baseUrl`
- 可配置 `apiKey`
- 可配置请求超时
- 默认支持“阿里云接口失败时回退本地 provider”
- 已对齐函数端真实路由，并完成函数直调验证

代码位置：

- `src/services/pin/aliyun-provider.ts`
- `src/services/pin/aliyun-config.ts`
- `infra/aliyun/pin-api/index.js`
- `infra/aliyun/pin-api/tablestore-store.js`

## 2. 当前行为

当使用：

```ts
createPinServices({
  target: 'aliyun',
  aliyunConfig: {
    baseUrl: 'https://your-api-domain',
  },
})
```

时，provider 会优先调用阿里云 HTTP 接口。

如果：

- `baseUrl` 未配置
- `uni.request` 不可用
- 云端接口报错

则默认回退到本地 `LocalPinDataProvider`。

说明：

- 这是为了先保证现有页面不被一次性切挂。
- 等 `pin-app` 接口完整后，可以把 `fallbackToLocal` 设为 `false`，强制只走云端。

## 3. 当前支持的配置项

```ts
interface AliyunPinApiConfig {
  baseUrl?: string
  apiKey?: string
  fallbackToLocal?: boolean
  timeoutMs?: number
}
```

推荐第一版：

- `baseUrl`: API 网关或函数公网地址
- `apiKey`: 可选
- `fallbackToLocal`: `true`
- `timeoutMs`: `10000`

## 4. 已约定的接口路径

### 用户

- `GET /users/current`
- `PUT /users/current`
- `DELETE /users/current`
- `GET /users`
- `PUT /users`

### 积分

- `GET /points/balance`
- `PUT /points/balance`
- `GET /points/records`
- `PUT /points/records`

### 项目

- `GET /projects`
- `PUT /projects`
- `GET /folders`
- `PUT /folders`
- `GET /recent-imports`
- `PUT /recent-imports`

### 社区作品

- `GET /artworks`
- `PUT /artworks`
- `GET /artworks/version`
- `PUT /artworks/version`

### 互动关系

- `GET /relations/liked-artworks`
- `PUT /relations/liked-artworks`
- `GET /relations/favorited-artworks`
- `PUT /relations/favorited-artworks`
- `GET /relations/purchased-artworks`
- `PUT /relations/purchased-artworks`
- `GET /relations/followed-creators`
- `PUT /relations/followed-creators`

### 搜索与设置

- `GET /search-history`
- `PUT /search-history`
- `GET /settings`
- `PUT /settings`

### 存储清理

- `POST /storage/remove-keys`
- `POST /storage/clear-all`

## 5. 下一步建议

当前后端已经落了第一版路由与存储骨架，对应：

- `index.js`：HTTP 路由分发
- `tablestore-store.js`：Tablestore 读写实现
- `package.json` + `node_modules`：函数侧已打入 `tablestore` 依赖

当前已验证：

- `InvokeFunction` 调用 `GET /health` 返回 `200`
- `InvokeFunction` 调用 `GET /users/current` 返回 `200`，无登录态时数据为 `null`

建议后端按下面顺序继续补强：

1. `/users/current`
2. `/users`
3. `/points/balance`
4. `/points/records`
5. `/projects`
6. `/folders`
7. `/artworks`
8. `/relations/*`
9. `/settings`

## 6. 切换策略

第一阶段：

- `target: 'aliyun'`
- `fallbackToLocal: true`
- `baseUrl` 暂不切换，直到公网入口方案确认

第二阶段：

- 确认公网入口方案后
- 将 `baseUrl` 指向 HTTP Trigger 或 API 网关地址
- 先保留 `fallbackToLocal: true`

第三阶段：

- 云端接口稳定后
- 将 `fallbackToLocal` 改为 `false`

第四阶段：

- 页面正式默认走云端
- 本地 provider 只保留离线开发和应急用途
