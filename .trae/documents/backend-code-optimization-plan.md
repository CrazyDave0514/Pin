# 后端代码优化方案

> **目标**：代码质量提升，不改变现有功能行为。涵盖 Bug 修复、冗余清理、结构优化、性能提升。

---

## 一、当前状态

审查文件：
- `infra/aliyun/pin-api/index.js` (816行) — 云函数入口 + 路由 + JWT 认证
- `infra/aliyun/pin-api/tablestore-store.js` (1153行) — Tablestore 数据访问层

审查共发现 **28 个问题**（5个P0 / 12个P1 / 11个P2）。

---

## 二、优化清单（按执行顺序）

### 类别 A：安全修复（P0，必须修复）

| # | 问题 | 文件 | 行号 | 修改方式 |
|---|------|------|------|----------|
| A1 | JWT 默认密钥可预测 | index.js | 179 | 去掉 `|| 'pin-api-default-secret-change-in-production'` 默认值，改为无密钥就启动报错 |
| A2 | Debug 路由暴露用户原始数据（含密码哈希） | index.js | 444-455 | **删除整个 debug 路由** |
| A3 | Token 过期错误被静默吞掉 | index.js | 418-426 | `extractUidFromToken` 返回 `{ uid, errorCode }` 对象而非 `null`，区分"未提供""过期""无效" |

### 类别 B：Bug 修复（P1，建议修复）

| # | 问题 | 文件 | 行号 | 修改方式 |
|---|------|------|------|----------|
| B1 | JWT HMAC 双重 Base64 编码 | index.js | 204-208 | `hmacSha256` 改为 `digest()` （raw Buffer），消除双重编码 |
| B2 | 注销时 `pin_relations` 删除逻辑错误 | store.js | 1037-1043 | 改为 `listDoubleKeyTable('pin_relations', 'uid', uid, 'relationKey')`，传入完整主键 |
| B3 | `setUserList` 全量读写风险 | store.js | 361-385 | 注册时改为 `getRow('pin_users', { uid })` + `putRow` 单行操作 |
| B4 | JSON 响应双重编码（FC 3.0 HTTP Trigger） | index.js | 800-805 | `handler` 直接返回 `response` 对象，让 FC 3.0 运行时处理 |

### 类别 C：冗余清理（P1~P2）

| # | 问题 | 文件 | 行号 | 修改方式 |
|---|------|------|------|----------|
| C1 | `safeJsonParse` 在两个文件中重复定义 | 两个文件 | store.js:9, index.js:36 | 抽取到独立 `utils.js`，两个文件 import |
| C2 | `JWT_EXPIRES_IN` 环境变量定义但未使用 | index.js | 180, 219 | 使用 `JWT_EXPIRES_IN` 变量替代硬编码 `7*24*60*60` |
| C3 | `getRuntimeConfig` 返回 `ossBucket`/`region` 未使用 | index.js | 64-69 | 删除未使用的 `ossBucket` 字段 |
| C4 | Route 函数缩进不一致 | index.js | 428-767 | 整个 route 函数体统一缩进（在 try-catch 内） |
| C5 | `normalizeEventSource` 冗余 Buffer 处理 | index.js | 46-61 | 移除与 handler 重复的 Buffer/Uint8Array 分支 |

### 类别 D：性能优化（P1~P2）

| # | 问题 | 文件 | 行号 | 修改方式 |
|---|------|------|------|----------|
| D1 | 多处重复 `new PinTablestoreStore()` | index.js | 299,356,391,476 | `authController` 三个方法共用同一个 store 实例 |
| D2 | `getUserList` 每次注册全量读 | index.js | 301-324 | 改为 `getRow('pin_users', { uid })` 检查用户名唯一性 |
| D3 | `getRange` limit 硬编码 500 无分页 | store.js | 191 | 添加注释说明限制，为 `listSingleKeyTable` 添加分页 TODO |

### 类别 E：代码结构优化（P2）

| # | 问题 | 文件 | 行号 | 修改方式 |
|---|------|------|------|----------|
| E1 | JWT 工具函数分散在 index.js 顶部 | index.js | 178-260 | 抽取到 `auth.js` 模块 |
| E2 | 输入验证逻辑内联在 controller | index.js | 272-297 | 抽取 `validateRegisterInput()` 函数 |
| E3 | `/pin` 前缀硬编码 | index.js | 71-80 | 改为环境变量 `PIN_API_PATH_PREFIX` |
| E4 | `attributeColumnsFromObject` 不过滤 null | store.js | 77-81 | 增加 `null` 值过滤，避免 Tablestore 兼容问题 |
| E5 | 缺少 OPTIONS CORS 预检处理 | index.js | — | route 开头添加 `if (method === 'OPTIONS')` 返回 204 |

---

## 三、不改动项（说明原因）

| 问题 | 原因 |
|------|------|
| P0-1 Session 单行并发覆盖 | 需要架构重构（从 JWT 提取 uid 传参），超出本次优化范围 |
| P0-2 点赞/收藏读写分离竞态 | 需要引入 Tablestore 条件更新/原子操作，影响面大 |
| P0-4 注册用户名唯一性非原子 | 需要改变数据库主键设计，超出本次范围 |
| P1-1 积分加减非原子 | 同上，后续迭代处理 |
| P1-2/P1-3 全量读写 art/projects | 需要表结构变更，后续迭代处理 |
| P2-10 rowToObject 旧格式 fallback | 向后兼容需要，暂不删除 |
| P2-16 密码最小长度 6→8 | 功能变更，不在此次范围 |

---

## 四、执行顺序

```
A1 → A2 → A3 → B1 → B2 → B3 → B4 → C1 → C2 → C3 → C4 → C5 → D1 → D2 → D3 → E1 → E2 → E3 → E4 → E5
```

每完成一个类别，部署到线上验证一次，确保功能不受影响。

---

## 五、验证计划

1. 健康检查 `GET /health` 正常返回
2. 注册/登录/获取用户信息全流程通过
3. Token 过期/无效返回正确错误信息
4. 注销流程完整（注册→注销→无法登录）
5. 积分查询/更新正常
6. 项目 CRUD 正常
