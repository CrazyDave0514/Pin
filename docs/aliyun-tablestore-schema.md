# PIN Tablestore 表设计

更新时间：2026-05-26

## 1. 设计目标

当前 PIN 的服务层已经围绕五块核心数据收口：

- 登录
- 项目
- 社区作品
- 购买
- 积分

本次表设计遵循两个原则：

1. 先覆盖 `AliyunPinDataProvider` 真正落地需要的最小集合。
2. 保持和当前本地 `pin_*` 数据模型尽量一一对应，降低迁移成本。

## 2. 推荐表清单

建议先建以下 8 张表：

1. `pin_users`
2. `pin_projects`
3. `pin_folders`
4. `pin_artworks`
5. `pin_points_records`
6. `pin_recent_imports`
7. `pin_relations`
8. `pin_settings`

## 3. 各表设计

### 3.1 `pin_users`

用途：

- 用户列表
- 当前用户基础资料
- 登录态关联基础数据

主键：

- `uid` `string`

主要字段：

- `username`
- `avatar`
- `createdAt`
- `followingJson`
- `bio`
- `extensionsJson`
- `updatedAt`

### 3.2 `pin_projects`

用途：

- 项目列表
- 发布状态
- 画布数据

主键：

- `projectId` `string`

主要字段：

- `name`
- `thumbnail`
- `folderId`
- `canvasDataJson`
- `tagsJson`
- `isPublished`
- `isOffShelf`
- `publishedArtworkId`
- `publishPoints`
- `createdAt`
- `updatedAt`
- `ownerUid`
- `extensionsJson`

### 3.3 `pin_folders`

用途：

- 文件夹树

主键：

- `folderId` `string`

主要字段：

- `name`
- `parentId`
- `createdAt`
- `updatedAt`
- `ownerUid`
- `extensionsJson`

### 3.4 `pin_artworks`

用途：

- 社区作品
- 发布作品同步
- 购买展示

主键：

- `artworkId` `string`

主要字段：

- `projectId`
- `ownerUid`
- `name`
- `creatorName`
- `creatorAvatar`
- `thumbnail`
- `canvasDataJson`
- `tagMetaJson`
- `tagsJson`
- `likes`
- `favorites`
- `points`
- `viewCount`
- `useCount`
- `isPublic`
- `description`
- `beadCount`
- `colorTypeCount`
- `coverJson`
- `createdAt`
- `updatedAt`
- `extensionsJson`

### 3.5 `pin_points_records`

用途：

- 积分明细

主键：

- `uid` `string`
- `recordId` `string`

主要字段：

- `title`
- `amount`
- `time`

说明：

- 当前积分余额可先冗余存用户表，也可以单独拆表。
- 第一版建议余额放 `pin_users`，记录放 `pin_points_records`。

### 3.6 `pin_recent_imports`

用途：

- 最近导入记录

主键：

- `uid` `string`
- `projectId` `string`

主要字段：

- `name`
- `importedAt`

### 3.7 `pin_relations`

用途：

- 点赞
- 收藏
- 已购买
- 关注
- 搜索历史

主键：

- `uid` `string`
- `relationKey` `string`

建议 `relationKey` 形式：

- `liked#artworkId`
- `favorited#artworkId`
- `purchased#artworkId`
- `followed#creatorName`
- `search#keyword`

主要字段：

- `relationType`
- `targetId`
- `targetName`
- `createdAt`

说明：

- 这张表是为了减少表数量。
- 第一版比拆成 4 到 5 张小表更省事。

### 3.8 `pin_settings`

用途：

- 设置项

主键：

- `uid` `string`

主要字段：

- `pushEnabled`
- `emailEnabled`
- `followerNotify`
- `favoriteNotify`
- `publicWorks`
- `allowMessage`
- `updatedAt`

## 4. 与本地 key 的对应关系

| 本地 key | 云端表 |
| --- | --- |
| `pin_user` `pin_user_list` | `pin_users` |
| `pin_projects` | `pin_projects` |
| `pin_folders` | `pin_folders` |
| `pin_artworks` | `pin_artworks` |
| `pin_points_records` | `pin_points_records` |
| `pin_recent_imports` | `pin_recent_imports` |
| `pin_liked_artworks` `pin_favorited_artworks` `pin_purchased_artworks` `pin_followed_creators` `pin_search_history` | `pin_relations` |
| `pin_settings` | `pin_settings` |

## 5. 第一阶段实现建议

第一阶段不做复杂索引优化，先保证 provider 可用。

建议优先实现：

1. `pin_users`
2. `pin_projects`
3. `pin_folders`
4. `pin_artworks`
5. `pin_points_records`
6. `pin_relations`
7. `pin_settings`

`pin_recent_imports` 可在第二批一起补。
