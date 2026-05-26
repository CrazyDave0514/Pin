# PIN 本地存储服务层收口说明

## 1. 现状键映射

本次保留全部既有 `pin_*` key，不变更存储名称，只收口访问入口。

| 领域 | Key |
| --- | --- |
| 登录/用户 | `pin_user` `pin_user_list` |
| 积分 | `pin_points` `pin_points_records` |
| 项目 | `pin_projects` `pin_folders` `pin_recent_imports` |
| 社区作品 | `pin_artworks` `pin_artworks_version` |
| 互动关系 | `pin_liked_artworks` `pin_favorited_artworks` `pin_purchased_artworks` `pin_followed_creators` |
| 搜索/设置 | `pin_search_history` `pin_settings` |
| 注销联动清理 | `pin_favorite_colors` |

## 2. 服务层结构

本次新增统一存储访问层：

- `src/services/pin/storage-adapter.ts`
  - 抽象底层读写能力。
  - 当前提供 `UniStorageAdapter` 与 `MemoryStorageAdapter`。
- `src/services/pin/provider.ts`
  - 定义 `PinDataProvider` 领域数据契约。
- `src/services/pin/local-provider.ts`
  - 当前默认 provider，仍落本地存储。
- `src/services/pin/aliyun-provider.ts`
  - 预留阿里云 API 实现骨架，当前仅占位。
- `src/services/pin/index.ts`
  - 暴露统一 Promise 风格服务接口。

## 3. 暴露服务

### 3.1 `authService`

- 当前用户读取
- 最近登录用户读取
- 注册
- 快速登录
- 用户资料更新
- 登录态判断
- 设置项读取/写入
- 清缓存
- 退出登录
- 注销账号

### 3.2 `projectService`

- 项目列表读取/保存
- 文件夹列表读取/保存
- 单项目读取
- 最近导入读取/写入
- 搜索历史读取/写入/清空
- 项目搜索数据源聚合
- 项目导出作者名读取

### 3.3 `communityService`

- 社区作品读取
- 作品更新
- 点赞/收藏/关注切换
- 我的点赞/收藏读取
- 发布作品同步
- 下架作品同步
- 互动状态聚合读取

### 3.4 `purchaseService`

- 购买可用性判断
- 积分扣减
- 购买记录写入
- 已购买列表写入
- 社区销量自增

### 3.5 `pointsService`

- 积分余额读取/写入
- 默认积分初始化
- 积分记录读取
- 默认展示记录初始化
- 明细追加

## 4. 页面迁移范围

本次已迁移为只调用服务层的页面：

- 登录/用户链路
  - `src/pages/login/index.vue`
  - `src/pages/mine/index.vue`
  - `src/pages/mine/avatar-crop.vue`
  - `src/pages/profile/edit.vue`
  - `src/pages/settings/index.vue`
- 积分/社区链路
  - `src/pages/points/index.vue`
  - `src/pages/index/index.vue`
  - `src/pages/artwork-detail/index.vue`
  - `src/pages/mine/collection.vue`
- 项目链路
  - `src/pages/search/index.vue`
  - `src/pages/blueprint-import/index.vue`
  - `src/pages/project/index.vue`
  - `src/pages/canvas-editor/index.vue`

说明：

- 画布编辑器保留了一段与蓝图导入临时 key 相关的 `uni.getStorageSync(options.key)` 逻辑，它不是 `pin_*` 存储，也不属于这次服务层收口范围。
- `src/utils/community.ts` 已改为通过统一 storage adapter 访问数据，不再直接调用 `uni.*Storage*`。

## 5. 阿里云切换位

后续如果切换到阿里云 API，只需要：

1. 在 `AliyunPinDataProvider` 中实现与 `PinDataProvider` 对齐的方法。
2. 在 `createPinServices` 中切换 provider 实例来源。
3. 保持页面继续调用既有 Promise 服务接口，不再改页面。

页面层当前不感知：

- `uni`
- 本地 key 名
- 本地/远端数据源差异

## 6. 回归清单

### 6.1 已验证

- 服务层单测：
  - 注册写入用户与初始积分
  - 快速登录初始化积分
  - 积分默认记录补齐
  - 购买扣积分、写明细、写购买记录、销量增加
  - 已发布项目同步到社区作品
  - 最近导入去重与截断
- 静态扫描：
  - 覆盖范围内页面已移除 `pin_*` 直接读写与 `uni.*Storage*` 调用
  - 仅剩画布编辑器里蓝图临时 key 读写，不属于本次范围
- 构建：
  - H5 构建通过

### 6.2 待在飞书文档同步时补齐

- 当前技术文档中的旧实现描述与现代码对齐
- 新增“本地 provider / 阿里云 provider”切换说明
- 新增页面迁移范围与 key 映射表

## 7. 飞书同步状态

已尝试同步到你指定的飞书文档：

- 目标文档：`https://rcnf2iyzif3o.feishu.cn/docx/ELhndFxeKolkltxc4ipcUoFenhh`

当前阻塞：

- 当前会话下 Chrome 扩展桥接不可用，无法复用本机 Chrome 登录态。
- 应用内浏览器打开后进入飞书登录页，无法直接写入文档。

因此先将最终可同步稿留存在仓库，待飞书登录链路恢复后，可按本文件内容写回对应章节。
