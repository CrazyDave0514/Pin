# PIN 本地交付说明

## 1. 交付范围

本地 `pin_*` 存储访问已经完成服务层收口，页面改为通过统一 Promise 接口访问。

本轮额外补充了更细的类型约束，目标是不改变现有行为，只收紧边界，方便后续切换到阿里云 provider。

## 2. 建议转交 Trae 的文档文件

- 主要技术说明：
  - `docs/pin-storage-service-layer.md`
- 适配飞书 docx 标题格式的同步稿：
  - `docs/pin-storage-service-layer.feishu.md`
- 本地交付说明：
  - `docs/pin-storage-service-layer-handoff.md`

说明：

- 这轮不再执行飞书同步动作。
- 如果 Trae 需要同步到飞书，优先使用 `docs/pin-storage-service-layer.feishu.md` 作为源稿。

## 3. 代码交付位置

- 服务层入口：
  - `src/services/pin/index.ts`
- provider 契约：
  - `src/services/pin/provider.ts`
- 本地 provider：
  - `src/services/pin/local-provider.ts`
- 阿里云 provider 占位：
  - `src/services/pin/aliyun-provider.ts`
- 领域类型：
  - `src/services/pin/types.ts`
- 底层存储适配器：
  - `src/services/pin/storage-adapter.ts`

## 4. 本轮新增的类型约束

- 去掉领域模型中的 `[key: string]: any` 兜底写法，改为显式 `extensions?: Record<string, unknown>` 扩展位。
- 抽出并显式化以下服务接口：
  - `PinAuthService`
  - `PinPointsService`
  - `PinCommunityService`
  - `PinProjectService`
  - `PinPurchaseService`
  - `PinServices`
- 抽出并显式化以下结果类型：
  - `ProjectSearchEntry`
  - `ArtworkInteractionState`
  - `ArtworkToggleResult`
  - `PurchaseArtworkResult`
- 社区工具层与服务层边界补充了更明确的输入类型，减少 `any` 透传。

## 5. 保持不变的行为边界

- `pin_*` key 名未变。
- 登录、项目、社区作品、购买、积分相关页面行为未改。
- `src/pages/canvas-editor/index.vue` 中保留了一段蓝图临时 key 的直接存储访问，它不是 `pin_*`，不在本次收口范围内。

## 6. 本地验证结果

- 服务层单测通过：
  - `tests/pin-services.test.ts`
- 已验证场景包括：
  - 注册写入用户与初始积分
  - 快速登录初始化积分
  - 积分默认记录补齐
  - 购买扣积分、购买记录、销量更新
  - 已发布项目同步到社区作品
  - 最近导入去重与截断

## 7. 建议 Trae 同步时说明

- 以当前仓库代码行为为准覆盖旧文档描述。
- 文档中应保留“本地 provider / 阿里云 provider”切换位说明。
- 若飞书同步工具对 Markdown 表格或层级支持有限，可优先保证以下信息完整：
  - key 映射表
  - 服务层结构
  - 暴露服务
  - 页面迁移范围
  - 阿里云切换位
  - 回归清单
