# Pin 任务看板

> **核心协调文件**：所有 AI 通过本文件了解项目进度、领取任务、更新状态。
> 每次任务开始前必须阅读本文件 + `PROJECT_RULES.md`。

## 当前版本：V0.2.1

**版本目标**：Bug修复 + 稳定性优化，完善社区功能（举报/拉黑/权限控制），优化数据同步体验

**需求文档**：[飞书文档](https://www.feishu.cn/docx/WxG4dDbmpok5WQx0UErcxDVgnQf)
**原型设计**：[飞书文档](https://www.feishu.cn/docx/TNb2dhA7EosaPLxPueccnXUJnH0)

---

### 阶段 1：需求阶段

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| V0.2.1 需求收集 | AI产品经理 | ✅ 已完成 | 飞书 01-需求文档 | |
| V0.2.1 需求文档 | AI产品经理 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/WxG4dDbmpok5WQx0UErcxDVgnQf) | Bug修复7项、举报拉黑、注册改造、权限控制10项、创作者主页、新手引导、修改密码 |
| 原型设计 | AI产品经理 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/TNb2dhA7EosaPLxPueccnXUJnH0) | 4个画板 |

### 阶段 2：技术方案

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 技术方案设计 | AI后端 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/JoMJdRwq4oPRtAxsTc7cnenKnqd) | 11个新接口设计、邮箱验证码方案、举报拉黑数据模型、权限控制设计 |
| API 接口文档 | AI后端 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/JoMJdRwq4oPRtAxsTc7cnenKnqd) | 完整接口定义，含请求/响应格式、业务规则 |

### 阶段 3：设计阶段

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| UI/UE 设计规范 | AI设计师 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/BJjBd38VzoKnfRxe3aTcnRY8n8c) | 7章：新增5页面设计、改造6页面设计、2个新组件、权限控制交互规范、路由配置、交付清单；含1个权限控制流程画板 |
| 网页 icon 设计 | AI设计师 | ✅ 已完成 | src/static/logo.png 等 | SVG矢量icon，拼豆"P"字母，暖金色调，已生成512/180/48/32/16px + favicon.ico |

### 阶段 4：开发阶段

#### 4.1 基础设施

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| FC 环境变量配置 | AI后端 | ✅ 已完成 | pin-app-http 函数 | EMAIL_SMTP_HOST/PORT/USER/PASS/FROM_NAME、Tablestore、JWT_SECRET |
| `pin_verification_codes` 表 | AI后端 | ✅ 已完成 | Tablestore pin-main 实例 | 单主键 email(STRING)，TTL=-1，MaxVersions=1 |
| 邮件服务模块 | AI后端 | ✅ 已完成 | email-service.js | nodemailer + 飞书 SMTP，支持验证码发送 |
| `src/config/version.ts` | AI前端 | ✅ 已完成 | 版本配置文件 | 统一管理版本号 |
| `src/utils/auth-guard.ts` | AI前端 | ✅ 已完成 | 登录检查工具 | 统一登录检查，未登录弹窗引导 |
| 网页 icon 集成 | AI前端 | ✅ 已完成 | index.html | 网页标签页显示应用 icon |

#### 4.2 Bug 修复

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| BUG-01 修复 | AI前端 | ⏸️ 待确认 | - | 待确认具体问题 |
| BUG-02 修复 | AI前端 | ⏸️ 待确认 | - | |
| BUG-03 修复 | AI前端 | ⏸️ 待确认 | - | |
| BUG-04 修复 | AI前端 | ⏸️ 待确认 | - | |
| BUG-05 修复 | AI前端 | ⏸️ 待确认 | - | |
| BUG-06 修复 | AI前端 | ⏸️ 待确认 | - | |
| BUG-07 修复 | AI前端 | ⏸️ 待确认 | - | |

#### 4.3 注册/登录改造

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| **后端接口** | | | | |
| `POST /auth/send-code` | AI后端 | ✅ 已完成 | index.js | 飞书SMTP发送6位验证码，5分钟过期，60秒限频 |
| `POST /auth/verify-code` | AI后端 | ✅ 已完成 | index.js | 校验验证码有效性，使用后自动删除 |
| `POST /auth/reset-password` | AI后端 | ✅ 已完成 | index.js | 邮箱验证+新密码，bcrypt加密存储 |
| `POST /auth/change-password` | AI后端 | ✅ 已完成 | index.js | 旧密码+邮箱验证+新密码，需JWT认证 |
| **前端页面** | | | | |
| `pages/register/index.vue` | AI前端 | ✅ 已完成 | 独立注册页 | 邮箱+验证码+昵称+密码+确认密码 |
| `pages/forgot-password/index.vue` | AI前端 | ✅ 已完成 | 忘记密码页 | 邮箱验证+重设密码 |
| `pages/login/index.vue` 改造 | AI前端 | ✅ 已完成 | 登录页 | 移除内嵌注册、忘记密码入口、协议勾选 |
| `pages/settings/change-password.vue` | AI前端 | ✅ 已完成 | 修改密码页 | 旧密码+邮箱验证+新密码 |

#### 4.4 权限控制

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| `artwork-detail/index.vue` | AI前端 | ✅ 已完成 | 作品详情页 | 点赞/收藏/关注/购买增加登录检查 |
| `mine/index.vue` | AI前端 | ✅ 已完成 | 我的页面 | 积分中心/豆仓/收藏列表/点赞列表增加登录检查 |
| `project/index.vue` | AI前端 | ✅ 已完成 | 项目页 | 创建项目增加登录检查 |
| `settings/index.vue` | AI前端 | ✅ 已完成 | 设置页 | 未登录隐藏账号相关区块、登录引导 |

#### 4.5 举报/拉黑功能

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| **后端接口** | | | | |
| `POST /report` | AI后端 | ✅ 已完成 | index.js + tablestore-store.js | 提交举报，存入 pin_relations 表 |
| `POST /relations/block` | AI后端 | ✅ 已完成 | index.js + tablestore-store.js | 拉黑作者，自动解除关注 |
| `DELETE /relations/block/:creatorName` | AI后端 | ✅ 已完成 | index.js + tablestore-store.js | 移除黑名单 |
| `GET /relations/blocked-creators` | AI后端 | ✅ 已完成 | index.js + tablestore-store.js | 获取黑名单列表，需JWT认证 |
| **前端功能** | | | | |
| `artwork-detail/index.vue` 改造 | AI前端 | ✅ 已完成 | 作品详情页 | 增加举报按钮、拉黑按钮 |
| `pages/settings/blocklist.vue` | AI前端 | ✅ 已完成 | 黑名单管理页 | 新增页面 |
| `index/index.vue` 改造 | AI前端 | ⏸️ 待开始 | 首页 | 黑名单作者过滤 |

#### 4.6 创作者主页

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| **后端接口** | | | | |
| `GET /users/:uid/profile` | AI后端 | ✅ 已完成 | index.js + tablestore-store.js | 创作者公开信息（头像/昵称/简介/统计/关注状态） |
| `GET /users/:uid/artworks` | AI后端 | ✅ 已完成 | index.js + tablestore-store.js | 创作者作品列表（分页，含点赞/收藏状态） |
| **前端页面** | | | | |
| `pages/creator-profile/index.vue` | AI前端 | ✅ 已完成 | 创作者主页 | 头像+简介+统计+作品列表+关注/拉黑 |

#### 4.7 新手引导

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 引导组件/库 | AI前端 | ⏸️ 待开始 | - | 轻量级引导组件（driver.js 或自定义） |
| 引导步骤配置 | AI前端 | ⏸️ 待开始 | - | 5步引导配置 |
| 引导触发逻辑 | AI前端 | ⏸️ 待开始 | - | 首次登录触发 + 更多设置入口 |

#### 4.8 数据同步优化

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| **后端接口** | | | | |
| `GET /config/version` | AI后端 | ✅ 已完成 | index.js | 返回版本号、构建时间、环境信息 |
| **前端功能** | | | | |
| 离线编辑支持 | AI前端 | ⏸️ 待开始 | 相关服务 | 离线队列 + 联网同步 |
| 冲突解决机制 | AI前端 | ⏸️ 待开始 | 相关服务 | 多端冲突提示和解决（P2） |
| 自动同步优化 | AI前端 | ⏸️ 待开始 | 相关服务 | 登录全量同步 + 增量同步 |

#### 4.9 其他优化

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 加载优化 | AI前端 | ⏸️ 待开始 | 相关页面 | 首屏加载、懒加载（P2） |
| 错误提示优化 | AI前端 | ⏸️ 待开始 | 全局组件 | 统一错误提示（P2） |
| 积分中心改造 | AI前端 | ⏸️ 待开始 | mine/index.vue | 仅展示真实行为记录 |
| 首页空状态 | AI前端 | ⏸️ 待开始 | index/index.vue | 空状态展示（P1） |

### 阶段 5：联调阶段

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 前后端联调 | AI前端 + AI后端 | 🔄 进行中 | 联调报告 | 11个新接口联调验证 |

### 阶段 6：测试阶段（测试环境）

> **测试环境**：本地开发环境或预发布环境，**非线上环境**

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 测试用例编写 | AI测试 | ✅ 已完成 | 飞书 04-测试文档 | Bug修复验证 + 新功能测试用例，共230+条用例 |
| 功能测试执行 | AI测试 | 待开始 | Bug列表 | |
| 回归测试 | AI测试 | 待开始 | 回归报告 | 确保原有功能不受影响 |
| 测试报告 | AI测试 | 待开始 | 飞书 04-测试文档 | |

### 阶段 7：验收

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 产品验收 | 项目Owner | 待开始 | 验收结论 | |

### 阶段 8：发布 + 线上回归

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 后端部署 | AI后端 | ✅ 已完成 | 阿里云 FC cn-hangzhou | pin-app-http 函数，11个新接口已部署 |
| 前端部署 | AI前端 | ✅ 已完成 | GitHub Pages | 已通过 GitHub Actions 自动部署 |
| 线上回归测试 | AI测试 | 待开始 | 回归结论 | 发布后验证核心流程 |

---

## 后端接口清单（11个）

| 方法 | 路径 | 说明 | 优先级 | 前端调用位置 |
|------|------|------|--------|-------------|
| POST | `/auth/send-code` | 发送邮箱验证码 | P0 | register/index.vue, forgot-password/index.vue |
| POST | `/auth/verify-code` | 校验邮箱验证码 | P0 | register/index.vue, forgot-password/index.vue |
| POST | `/auth/reset-password` | 重置密码（忘记密码） | P0 | forgot-password/index.vue |
| POST | `/auth/change-password` | 修改密码（已登录） | P1 | settings/change-password.vue |
| POST | `/report` | 提交作品举报 | P0 | artwork-detail/index.vue |
| POST | `/relations/block` | 拉黑创作者 | P0 | artwork-detail/index.vue, creator-profile/index.vue |
| DELETE | `/relations/block/:creatorName` | 移除黑名单 | P0 | settings/blocklist.vue, creator-profile/index.vue |
| GET | `/relations/blocked-creators` | 获取黑名单列表 | P0 | settings/blocklist.vue |
| GET | `/users/:uid/profile` | 获取创作者公开信息 | P0 | creator-profile/index.vue |
| GET | `/users/:uid/artworks` | 获取创作者作品列表 | P0 | creator-profile/index.vue |
| GET | `/config/version` | 获取最新版本号 | P1 | settings/index.vue |

---

## 前端新增/改造页面清单（11个）

| 页面 | 类型 | 说明 | 优先级 | 状态 |
|------|------|------|--------|------|
| `pages/register/index.vue` | 新增 | 独立注册页 | P0 | ✅ 已完成 |
| `pages/forgot-password/index.vue` | 新增 | 忘记密码页 | P0 | ✅ 已完成 |
| `pages/login/index.vue` | 改造 | 登录页改造 | P0 | ✅ 已完成 |
| `pages/creator-profile/index.vue` | 新增 | 创作者主页 | P0 | ✅ 已完成 |
| `pages/settings/blocklist.vue` | 新增 | 黑名单管理页 | P0 | ✅ 已完成 |
| `pages/settings/change-password.vue` | 新增 | 修改密码页 | P1 | ✅ 已完成 |
| `artwork-detail/index.vue` | 改造 | 举报/拉黑/权限控制 | P0 | ✅ 已完成 |
| `mine/index.vue` | 改造 | 权限控制/积分改造 | P1 | ✅ 已完成 |
| `settings/index.vue` | 改造 | 权限控制/登录引导 | P0 | ✅ 已完成 |
| `index/index.vue` | 改造 | 黑名单过滤/空状态 | P1 | ⏸️ 待开始 |
| `project/index.vue` | 改造 | 权限控制 | P0 | ✅ 已完成 |

---

## 联调测试计划

### 联调接口清单

| 序号 | 接口 | 测试场景 | 预期结果 |
|------|------|----------|----------|
| 1 | POST /auth/send-code | 发送邮箱验证码 | 收到6位验证码邮件，60秒内不能重复发送 |
| 2 | POST /auth/verify-code | 验证正确验证码 | 验证通过，验证码失效 |
| 3 | POST /auth/verify-code | 验证错误验证码 | 返回错误提示 |
| 4 | POST /auth/reset-password | 重置密码 | 密码更新成功，可用新密码登录 |
| 5 | POST /auth/change-password | 修改密码 | 旧密码正确时更新成功 |
| 6 | POST /auth/change-password | 修改密码（旧密码错误） | 返回错误提示 |
| 7 | POST /report | 举报作品 | 举报成功，数据存入 pin_relations |
| 8 | POST /relations/block | 拉黑作者 | 拉黑成功，自动解除关注 |
| 9 | DELETE /relations/block/:creatorName | 移除黑名单 | 移除成功 |
| 10 | GET /relations/blocked-creators | 获取黑名单 | 返回已拉黑作者列表 |
| 11 | GET /users/:uid/profile | 获取创作者信息 | 返回头像/昵称/简介/统计/关注状态 |
| 12 | GET /users/:uid/artworks | 获取创作者作品 | 返回分页作品列表 |
| 13 | GET /config/version | 获取版本号 | 返回版本号、构建时间 |

---

## 验收标准

### P0 验收（必须通过）

- [ ] BUG-01~BUG-07 全部修复
- [ ] 注册流程改造（独立注册页、邮箱验证码）
- [ ] 忘记密码功能可用
- [ ] 协议勾选（未勾选弹窗确认后自动勾选）
- [ ] 作品举报功能可用
- [ ] 作者拉黑功能可用（首页过滤、自动解除关注）
- [ ] 黑名单管理页可用
- [ ] 权限控制生效（10个功能点全部覆盖）
- [ ] 创作者主页可用（作品列表、关注、拉黑）
- [ ] 新手引导可用（首次登录触发、5步引导）

### P1 验收（应该通过）

- [ ] 积分中心按真实行为展示
- [ ] 修改密码功能可用
- [ ] 数据同步优化（离线编辑+自动同步）
- [ ] 首页空状态展示

### P2 验收（可选）

- [ ] 多端冲突提示和解决
- [ ] 加载优化、错误提示优化

---

## 历史版本

<details>
<summary>V0.2.0 版本记录（已完结）</summary>

### V0.2.0 版本目标
完整后端迁移，将现有本地功能迁移到云端

### V0.2.0 关键里程碑
- ✅ 2026-05-27：AI后端完成 JWT认证、用户注册/登录、业务CRUD接口
- ✅ 2026-05-27：AI产品经理完成 V0.2.0 需求文档
- ✅ 2026-05-27：AI前端完成 JWT Token管理、AliyunProvider接入、登录/注册页面
- ✅ 2026-05-27：AI设计师完成 V0.2.0 UI/UE设计规范
- ✅ 2026-05-27：AI后端修复登录Bug、/auth/me 字段缺失
- ✅ 2026-05-27：测试完成，27用例覆盖，6 Bug发现，5修复1降级
- ✅ 2026-05-27：验收通过，V0.2.0 发布！
- ✅ 2026-05-27：AI前端部署到 GitHub Pages，线上站点验证正常
- ✅ 2026-05-28：线上 Bug 修复完成（5个Bug全部修复）

**完整记录**：见历史版本文档
</details>

---

## 变更记录

| 日期 | 变更内容 |
|------|----------|
| 2026-05-28 | 创建 V0.2.1 任务看板，开始新版本迭代 |
| 2026-05-28 | AI产品经理完成 V0.2.1 需求文档（含竞品分析补充建议） |
| 2026-05-28 | AI产品经理完成 V0.2.1 原型设计（4个画板） |
| 2026-05-28 | 根据需求文档详细拆解任务，细化为开发阶段各子任务 |
| 2026-05-28 | AI设计师完成：V0.2.1 UI/UE设计规范（5个新增页面、6个改造页面、2个新组件、权限控制交互规范） |
| 2026-05-28 | AI设计师完成：网页icon重新设计（SVG矢量拼豆"P"字母，暖金色调，全尺寸生成） |
| 2026-05-28 | AI后端完成：V0.2.1 全部11个接口开发与部署（邮箱验证码4个、举报拉黑4个、创作者主页2个、版本号1个） |
| 2026-05-28 | AI后端完成：FC环境变量配置（飞书SMTP）、pin_verification_codes 表创建、email-service.js 邮件模块 |
| 2026-05-28 | AI前端完成：V0.2.1 全部前端开发任务（基础设施、登录注册、社区功能、权限控制） |
| 2026-05-28 | 更新任务看板，阶段4前端任务全部标记为已完成，阶段5联调测试标记为进行中 |
| 2026-05-28 | 修复后端接口调用问题：/auth/send-code 增加 purpose 参数、/relations/block 传入 creatorUid + creatorName、举报改为弹窗实现 |

---

**最后更新：2026-05-28**
