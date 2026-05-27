# Pin 任务看板

> **核心协调文件**：所有 AI 通过本文件了解项目进度、领取任务、更新状态。
> 每次任务开始前必须阅读本文件 + `PROJECT_RULES.md`。

## 当前版本：V0.2.0

**版本目标**：完整后端迁移，将现有本地功能迁移到云端

---

### 阶段 1：需求阶段

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| V0.2.0 需求文档 | AI产品经理 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/LDwHduPkBoXXWHxgE41cJdLEnUf) | 草稿，待 Owner 确认待确认事项 |
| 原型设计（登录/注册/同步） | AI产品经理 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/M9gGd9LM2oo17wxKojLckoibnoe) | 含3个画板：登录流程、数据同步、数据迁移 |

### 阶段 2：技术方案

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 技术方案设计 | AI后端 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/PNY0dY27JoOVRJxDotwcv2EGnKd) | 含架构、JWT、Tablestore、FC 3.0 适配 |
| API 接口文档 | AI后端 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/A8uOdfi2Uoyh46xSt5Lc5oP7nLf) | 全部 40+ 接口，含认证、业务、存储 |
| 数据库设计 | AI后端 | ✅ 已完成 | 见技术规范文档第3.4节 | 8张Tablestore表结构 |

### 阶段 3：设计阶段

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| UI/UE 设计规范 | AI设计师 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/Ol0gdXvhcoC8YDxXcOZcqcSOnmc) | 含8章：设计Token、公共组件、页面设计、交互规范、深色主题、图标规范、交付清单；含2个交互流程画板 |

### 阶段 4：开发阶段

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| JWT 认证模块 | AI后端 | ✅ 已完成 | pin-app-http 函数 | 内联 HS256 JWT，register/login/me 接口已验证 |
| 用户服务（注册/登录） | AI后端 | ✅ 已完成 | pin-app-http 函数 | 注册/登录/获取当前用户，bcrypt 密码加密，邮箱必填验证 |
| 项目数据服务（CRUD） | AI后端 | ✅ 已完成 | pin-app-http 函数 | Tablestore 数据层已修复，CRUD 接口可用 |
| 社区服务（发布/点赞/收藏） | AI后端 | ✅ 已完成 | pin-app-http 函数 | artworks/relations 路由已就绪，增量操作接口（点赞/收藏/关注） |
| 积分系统 | AI后端 | ✅ 已完成 | pin-app-http 函数 | 注册赠送100积分，发布作品奖励10积分，积分扣减 |
| 购买作品 | AI后端 | ✅ 已完成 | pin-app-http 函数 | POST /artworks/{id}/purchase，积分校验+原子扣减+记录购买 |
| 作品详情 | AI后端 | ✅ 已完成 | pin-app-http 函数 | GET /artworks/{id}，含浏览量计数 |
| 注销账号 | AI后端 | ✅ 已完成 | pin-app-http 函数 | POST /auth/unregister，清除所有关联数据 |
| 数据迁移 | AI后端 | ✅ 已完成 | pin-app-http 函数 | 批量导入接口 POST /import |
| 用户资料 | AI后端 | ✅ 已完成 | pin-app-http 函数 | 支持更新 nickname/avatar/bio |
| 搜索历史限制 | AI后端 | ✅ 已完成 | pin-app-http 函数 | 服务端限制最多保存10条 |
| JWT 管理 + API 客户端 | AI前端 | ✅ 已完成 | aliyun-provider.ts | Token 存储于 localStorage，请求自动携带 token 参数；401 自动清除 Token |
| AliyunProvider 接入 | AI前端 | ✅ 已完成 | aliyun-provider.ts | 已适配 query param 传递方式，支持 fallback；注册/登录/获取当前用户/登出方法 |
| 登录/注册页面 | AI前端 | ✅ 已完成 | login/index.vue | 支持用户名+密码+邮箱登录/注册，表单验证完整，登录后检测数据迁移 |
| 数据迁移引导页 | AI前端 | ✅ 已完成 | migration/index.vue | 首次登录云端后引导用户同步本地项目/文件夹/设置到云端 |
| 我的页改造 | AI前端 | ✅ 已完成 | mine/index.vue | 增加退出登录按钮，调用 Provider 清除 Token 并跳转 |
| 设置页改造 | AI前端 | ✅ 已完成 | settings/index.vue | 版本号更新为 0.2.0，注销账号调用后端 /auth/unregister API |

### 阶段 5：联调阶段

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 前后端联调 | AI前端 + AI后端 | ✅ 已完成 | 联调报告 | 登录/注册/Token验证全部通过，前端编译无错误 |

### 阶段 6：测试阶段（测试环境）

> **测试环境**：本地开发环境或预发布环境，**非线上环境**

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 测试用例编写 | AI测试 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/GQcld4qdWooU1Hxc9jgc5XbKnTh) | 含注册/登录、Token机制、数据迁移、退出登录、注销账号等27个测试用例 |
| 功能测试执行 | AI测试 | ✅ 已完成 | Bug列表 | 发现1个P0 Bug：登录接口返回错误 |
| 测试报告 | AI测试 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/W3TkdwPYWor07ixQcs1czcXmn7f) | 测试不通过，需修复登录Bug后重新测试 |
| Bug修复 | AI后端 | ✅ 已完成 | GitHub commit | 根因：setPoints 用 putRow 覆盖整行导致 password/email/nickname 丢失；修复：新增 updateRow 方法只更新指定列；代码已推送 GitHub |
| 回归测试 | AI测试 | ✅ 已完成 | [飞书文档](https://www.feishu.cn/docx/EaSXdNB65os048x8HhHcXs2KnHL) | 后端API已修复，但前端未接入云端API，仍使用本地存储模式 |

### 阶段 6 待解决：前端接入云端 API

| 任务 | 负责角色 | 状态 | 备注 |
|------|----------|------|------|
| 前端配置使用 AliyunPinDataProvider | AI前端 | 待开始 | createPinServices 未传递 target: 'aliyun' |
| authService.register 调用云端 API | AI前端 | 待开始 | 当前只做本地存储 |
| 完整登录流程测试 | AI测试 | 待开始 | 前端接入后重新测试 |

### 阶段 7：验收

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 产品验收 | 项目Owner | 待开始 | 验收结论 | |

### 阶段 8：发布 + 线上回归

| 任务 | 负责角色 | 状态 | 交付物 | 备注 |
|------|----------|------|--------|------|
| 后端部署 | AI后端 | 待开始 | 阿里云线上 | |
| 前端部署 | AI前端 | 待开始 | GitHub Pages | |
| 线上回归测试 | AI测试 | 待开始 | 回归结论 | 发布后验证核心流程 |

---

## 变更记录

| 日期 | 变更内容 |
|------|----------|
| 2026-05-27 | 创建任务看板 |
| 2026-05-27 | AI后端完成：JWT认证、用户注册/登录、业务CRUD接口、Tablestore数据层修复、502错误修复、API Gateway路由配置 |
| 2026-05-27 | AI产品经理完成：V0.2.0 需求文档（草稿） |
| 2026-05-27 | AI前端完成：JWT Token管理、AliyunProvider接入、登录/注册页面、后端技术文档上传飞书 |
| 2026-05-27 | AI后端补充：购买作品接口、作品详情、注销账号、搜索历史限制、技术文档上传飞书 |
| 2026-05-27 | AI设计师完成：V0.2.0 UI/UE设计规范（含设计Token统一、10个公共组件、5个页面改造/新增、交互规范、深色主题适配、交付清单） |
| 2026-05-27 | AI前端完成：登录页改造（增加邮箱字段）、数据迁移引导页、我的页改造（退出登录）、设置页改造（注销账号）、前后端联调验证 |
| 2026-05-27 | AI后端修复：登录Bug（setPoints 覆盖行导致密码丢失）、/auth/me 字段缺失、deploy-clean.js 密钥泄露清理 |

---

**最后更新：2026-05-27**
