# Pin V0.2.0 前端代码优化计划（修订版 v2）

## 目标

在不改变功能的前提下，修复 Bug、消除代码冗余、清理调试代码。

---

## 优化项

### 1. [P0] 修复 `storage-adapter.ts` 中 `globalThis.uni` 引用

- **文件**: `src/services/pin/storage-adapter.ts`
- **问题**: 第 17-23 行 `getUni()` 通过 `(globalThis as any).uni` 获取对象。H5 生产构建中 `uni` 不挂载在 `globalThis` 上。影响类中 5 处调用（getSync/setSync/removeSync/clearSync/keysSync）。
- **修复**: 删除 `getUni()`，5 处改为直接使用 `uni` 全局变量，添加 TypeScript declare。与 BUG-008 同根同因。
- **风险**: 无。
- **改动量**: ~15 行

---

### 2. [P0] 删除 `login/index.vue` 和 `mine/index.vue` 中冗余的 `uni.*` 调用（修复 BUG-009）

- **文件**: `src/pages/login/index.vue`、`src/pages/mine/index.vue`
- **问题**: 
  - `login/index.vue:229` `uni.setStorageSync('pin_current_user', ...)` — 冗余，Provider 内部已通过 `localProvider.setCurrentUser()` 持久化了用户数据（不同 key，独立存储）。且 H5 生产构建中该调用导致 `uni.setStorageSync is not a function`。
  - `mine/index.vue:337-338` `uni.removeStorageSync('pin_current_user')` 和 `uni.removeStorageSync('pin_auth_token')` — 冗余，`provider.logout()` 已通过 `removeAuthToken()` 清理了 Token，且没有任何代码读取 `pin_current_user` 这个 key。
- **验证**: 搜索 `pin_current_user` 全项目，无任何读取方（`getStorageSync('pin_current_user')` 不存在）。搜索 `pin_auth_token`，仅 `deleteAccount` 方法读取，而 `provider.logout()` 已清理。
- **修复**: 直接删除这些冗余调用，消除冗余同时修复 BUG-009。
- **风险**: 无。这些是孤立的写入/删除操作，没有对应的读取路径。
- **改动量**: ~3 行删除

---

### 3. [P1] 修复 `mine/index.vue` 创建独立 Provider 实例

- **文件**: `src/pages/mine/index.vue`
- **问题**: 第 128-129 行 `new AliyunPinDataProvider()` 创建了独立实例。退出登录时 `provider.logout()` 只清除这个实例的 Token 缓存（`private _token`），可能与 `pinServices` 单例不同步。
- **修复**: 删除独立导入和实例化，改用 `services/pin/index.ts` 导出的共享 `pinDataProvider`。
- **风险**: 无。同类的不同实例，共享实例更安全。
- **改动量**: ~4 行

---

### 4. [P2] 提取 `safeArray` 为公共工具函数

- **涉及文件**: `services/pin/index.ts`(L58)、`utils/community.ts`(L24)、`services/pin/local-provider.ts`(L6)
- **问题**: 同一函数在 3 个文件中独立定义，共 22 处调用。
- **修复**: `utils/` 下新建 `array-utils.ts`，导出 `safeArray`。3 个文件改为 import。
- **风险**: 无。纯重构。
- **改动量**: ~30 行（含新建文件）

---

### 5. [P2] 清理页面中重复的类型定义

- **涉及文件**: `pages/project/index.vue`、`pages/canvas-editor/index.vue`
- **问题**: `FolderRecord`、`ProjectRecord`、`Bead`、`CanvasData`、`ProjectData` 在页面中重复定义。
- **修复**: 删除本地定义，从 `services/pin/types.ts` 导入。
- **风险**: 无。TypeScript 编译时检查。
- **改动量**: ~30 行删除

---

### 6. [P3] 清理调试 `console.log`

- **涉及文件**: 重点 `pages/canvas-editor/index.vue`（19 处）
- **问题**: 共 37 处 `console.log/warn`，生产环境不应输出。
- **修复**: 删除纯调试日志，保留 `console.error` 用于错误追踪。
- **风险**: 无。
- **改动量**: ~15 行删除

---

## 优化顺序

```
步骤 1 [P0 storage-adapter] → 步骤 2 [P0 冗余uni调用] → 步骤 3 [P1 Provider实例]
      ↓
步骤 4 [P2 safeArray] → 步骤 5 [P2 类型定义] → 步骤 6 [P3 console.log]
```

每步完成后本地构建验证 `npm run build:h5`。

## 验证方式

- 每步修改后 `npm run build:h5`，确保编译通过
- 提交前 `git diff --stat` 检查改动范围
