# Pin 管理后台技术方案文档

> **版本**: V1.0  
> **日期**: 2026-05-29  
> **文档类型**: 技术方案

---

## 一、项目概述

### 1.1 背景
Pin 拼豆创作应用需要一套独立的管理后台，供运营人员管理用户和作品数据。

### 1.2 目标
- 管理员登录认证
- 用户数据管理（查看、删除）
- 作品数据管理（查看、下架、删除）
- 数据统计仪表盘（含今日访问量）

### 1.3 技术约束
- 前端：Vue3 + TypeScript + Element Plus + Vite
- 后端：阿里云函数计算（FC）
- 数据库：复用现有 Tablestore 实例
- 访问统计：阿里云日志服务（SLS）
- 部署：GitHub Pages（前端）+ FC（后端）

---

## 二、系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Pin Admin Web (Vue3)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  登录页   │  │  仪表盘   │  │ 用户管理  │  │ 作品管理  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  pin-admin-api (FC 函数)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 管理员认证    │  │ 业务 API     │  │ 数据统计     │       │
│  │ - /login     │  │ - /users     │  │ - /stats     │       │
│  │ - /logout    │  │ - /artworks  │  │ - SLS 查询   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Tablestore    │  │   Tablestore    │  │   阿里云 SLS    │
│   pin_users     │  │  pin_artworks   │  │  FC 访问日志    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 三、数据库设计

### 3.1 复用现有表结构

管理后台复用现有 Tablestore 表，无需新建表：

| 表名 | 用途 | 主键 |
|------|------|------|
| `pin_users` | 用户数据 | `uid` (STRING) |
| `pin_artworks` | 作品数据 | `artworkId` (STRING) |
| `pin_projects` | 项目数据 | `projectId` (STRING) |

### 3.2 数据模型

#### 用户模型 (pin_users)
```typescript
interface User {
  uid: string           // 用户ID，如 "U123ABC"
  username: string      // 用户名
  email: string         // 邮箱
  nickname: string      // 昵称
  avatar: string        // 头像URL
  password: string      // 加密密码
  createdAt: number     // 注册时间戳
  bio?: string          // 简介
  following: string[]   // 关注列表
}
```

#### 作品模型 (pin_artworks)
```typescript
interface Artwork {
  artworkId: string     // 作品ID
  name: string          // 作品名称
  creatorName: string   // 创作者昵称
  creatorAvatar: string // 创作者头像
  ownerUid: string      // 创作者UID
  description: string   // 描述
  tags: string[]        // 标签
  likes: number         // 点赞数
  favorites: number     // 收藏数
  viewCount: number     // 浏览量
  useCount: number      // 使用次数
  points: number        // 积分价格
  isPublic: boolean     // 是否公开
  isOffShelf: boolean   // 是否下架
  beadCount: number     // 拼豆数量
  colorTypeCount: number // 颜色种类
  thumbnail: string     // 缩略图
  createdAt: number     // 创建时间
  updatedAt: number     // 更新时间
}
```

---

## 四、API 接口设计

### 4.1 接口清单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/admin/login` | 管理员登录 | 否 |
| POST | `/admin/logout` | 管理员登出 | 是 |
| GET | `/admin/me` | 获取当前管理员信息 | 是 |
| GET | `/admin/users` | 获取用户列表 | 是 |
| GET | `/admin/users/:uid` | 获取用户详情 | 是 |
| DELETE | `/admin/users/:uid` | 删除用户 | 是 |
| GET | `/admin/artworks` | 获取作品列表 | 是 |
| GET | `/admin/artworks/:id` | 获取作品详情 | 是 |
| POST | `/admin/artworks/:id/offshelf` | 下架作品 | 是 |
| DELETE | `/admin/artworks/:id` | 删除作品 | 是 |
| GET | `/admin/stats/overview` | 获取概览统计 | 是 |

### 4.2 接口详情

#### 4.2.1 管理员登录
```
POST /admin/login

Request:
{
  "email": "admin@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "admin": {
      "email": "admin@example.com",
      "name": "管理员"
    }
  }
}

Error:
- 401: 邮箱或密码错误
- 403: 该邮箱无管理员权限
```

#### 4.2.2 获取用户列表
```
GET /admin/users?page=1&pageSize=20&keyword=xxx

Response:
{
  "success": true,
  "data": {
    "list": [
      {
        "uid": "U123ABC",
        "username": "user1",
        "email": "user1@example.com",
        "nickname": "用户1",
        "avatar": "https://...",
        "createdAt": 1716988800000
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 4.2.3 获取用户详情
```
GET /admin/users/:uid

Response:
{
  "success": true,
  "data": {
    "uid": "U123ABC",
    "username": "user1",
    "email": "user1@example.com",
    "nickname": "用户1",
    "avatar": "https://...",
    "bio": "简介...",
    "createdAt": 1716988800000,
    "stats": {
      "artworkCount": 10,
      "totalLikes": 100,
      "totalFavorites": 50
    },
    "artworks": [...]
  }
}
```

#### 4.2.4 删除用户
```
DELETE /admin/users/:uid

Response:
{
  "success": true,
  "data": { "message": "删除成功" }
}

Note: 级联删除用户的所有项目和作品
```

#### 4.2.5 获取作品列表
```
GET /admin/artworks?page=1&pageSize=20&keyword=xxx&status=all&startDate=&endDate=

Query Params:
- page: 页码，默认1
- pageSize: 每页条数，默认20
- keyword: 搜索关键词（作品ID/名称/作者）
- status: 状态筛选（all/active/offshelf）
- startDate: 开始时间戳
- endDate: 结束时间戳

Response:
{
  "success": true,
  "data": {
    "list": [
      {
        "artworkId": "A123ABC",
        "name": "作品名称",
        "creatorName": "作者",
        "thumbnail": "https://...",
        "points": 10,
        "likes": 100,
        "favorites": 50,
        "viewCount": 1000,
        "isOffShelf": false,
        "createdAt": 1716988800000
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 4.2.6 下架作品
```
POST /admin/artworks/:id/offshelf

Response:
{
  "success": true,
  "data": { "message": "下架成功" }
}

Note: 设置 isOffShelf=true，用户端不再展示
```

#### 4.2.7 删除作品
```
DELETE /admin/artworks/:id

Response:
{
  "success": true,
  "data": { "message": "删除成功" }
}
```

#### 4.2.8 概览统计
```
GET /admin/stats/overview

Response:
{
  "success": true,
  "data": {
    "totalUsers": 1234,
    "totalArtworks": 567,
    "todayNewUsers": 12,
    "todayNewArtworks": 5,
    "todayVisits": 3456,
    "yesterdayVisits": 3002,
    "visitTrend": 15
  }
}
```

### 4.3 认证机制

#### JWT Token 规范
```
Header: Authorization: Bearer <token>

Token Payload:
{
  "email": "admin@example.com",
  "role": "admin",
  "iat": 1716988800,
  "exp": 1717593600  // 7天有效期
}
```

#### 管理员白名单配置
通过环境变量 `ADMIN_EMAILS` 配置允许登录的邮箱：
```bash
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

---

## 五、前端设计

### 5.1 页面结构

```
src/
├── api/                    # API 接口
│   ├── auth.ts            # 认证相关
│   ├── users.ts           # 用户管理
│   ├── artworks.ts        # 作品管理
│   └── stats.ts           # 统计数据
├── components/            # 公共组件
│   ├── AppLayout.vue      # 布局组件
│   ├── StatCard.vue       # 统计卡片
│   └── DataTable.vue      # 数据表格
├── views/                 # 页面
│   ├── LoginView.vue      # 登录页
│   ├── DashboardView.vue  # 仪表盘
│   ├── UsersView.vue      # 用户列表
│   ├── UserDetailView.vue # 用户详情
│   ├── ArtworksView.vue   # 作品列表
│   └── ArtworkDetailView.vue # 作品详情
├── router/                # 路由
│   └── index.ts
├── stores/                # 状态管理
│   ├── auth.ts           # 认证状态
│   └── app.ts            # 应用状态
├── utils/                 # 工具函数
│   ├── request.ts        # HTTP 请求封装
│   └── format.ts         # 格式化函数
└── App.vue
```

### 5.2 路由设计

| 路径 | 组件 | 说明 | 认证 |
|------|------|------|------|
| `/login` | LoginView | 登录页 | 否 |
| `/` | DashboardView | 仪表盘 | 是 |
| `/users` | UsersView | 用户列表 | 是 |
| `/users/:uid` | UserDetailView | 用户详情 | 是 |
| `/artworks` | ArtworksView | 作品列表 | 是 |
| `/artworks/:id` | ArtworkDetailView | 作品详情 | 是 |

### 5.3 关键组件设计

#### 5.3.1 布局组件 (AppLayout)
```vue
<template>
  <el-container>
    <!-- 侧边栏 -->
    <el-aside width="200px">
      <div class="logo">Pin Admin</div>
      <el-menu>
        <el-menu-item index="/">仪表盘</el-menu-item>
        <el-menu-item index="/users">用户管理</el-menu-item>
        <el-menu-item index="/artworks">作品管理</el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <!-- 顶部栏 -->
      <el-header>
        <span>{{ adminEmail }}</span>
        <el-button @click="logout">退出</el-button>
      </el-header>
      
      <!-- 内容区 -->
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
```

#### 5.3.2 统计卡片 (StatCard)
```vue
<template>
  <el-card class="stat-card">
    <div class="stat-title">{{ title }}</div>
    <div class="stat-value">{{ value }}</div>
    <div v-if="trend !== undefined" class="stat-trend" :class="trend >= 0 ? 'up' : 'down'">
      {{ trend >= 0 ? '↑' : '↓' }} {{ Math.abs(trend) }}%
    </div>
  </el-card>
</template>
```

### 5.4 仪表盘布局

```
┌─────────────────────────────────────────────────────────────┐
│  Pin Admin                              admin@example.com ▼ │
├──────────┬──────────────────────────────────────────────────┤
│          │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  Logo    │  │ 总用户数  │ │ 总作品数  │ │今日新增用户│ │今日新增作品│
│          │  │  1,234   │ │   567    │ │   +12    │ │   +5    │
│  ────────│  │          │ │          │ │  ↑ 20%   │ │  ↑ 10%  │
│  仪表盘   │  └──────────┘ └──────────┘ └──────────┘ └─────────┘│
│  用户管理 │                                                  │
│  作品管理 │  ┌────────────────────────────────────────────┐  │
│          │  │              今日访问量                      │  │
│          │  │               3,456                          │  │
│          │  │              ↑ 15%                           │  │
│          │  └────────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 六、访问统计实现（SLS）

### 6.1 阿里云日志服务集成

FC 函数默认会将访问日志写入 SLS，通过 SDK 查询统计。

#### 查询今日 PV
```sql
* | select count(*) as pv
```

#### 查询昨日 PV
```sql
* | select count(*) as pv
```

### 6.2 SLS SDK 调用示例
```javascript
const Sls2020 = require('@alicloud/sls2020');

const client = new Sls2020({
  endpoint: `https://${process.env.SLS_PROJECT}.${process.env.ALIYUN_REGION}.log.aliyuncs.com`,
  accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
});

// 查询今日访问量
const queryTodayPV = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const result = await client.getLogs({
    project: process.env.SLS_PROJECT,
    logstore: process.env.SLS_LOGSTORE,
    from: Math.floor(today.getTime() / 1000),
    to: Math.floor(Date.now() / 1000),
    query: '* | select count(*) as pv',
  });
  
  return result.data[0]?.pv || 0;
};
```

### 6.3 环境变量配置
```bash
# SLS 配置
SLS_PROJECT=pin-api-logs
SLS_LOGSTORE=pin-app-http-logstore
```

---

## 七、安全设计

### 7.1 认证安全
- JWT Token 使用独立密钥（与用户端分开）
- Token 有效期 7 天
- 登录失败次数限制（5分钟内最多5次）

### 7.2 接口安全
- 所有 `/admin/*` 接口需携带有效 Token
- 敏感操作（删除）需二次确认
- 接口返回数据脱敏（不返回用户密码等敏感信息）

### 7.3 部署安全
- 管理后台独立部署，不对外公开
- 建议配置 IP 白名单或 VPN 访问

---

## 八、部署方案

### 8.1 后端部署

#### 创建 FC 函数 `pin-admin-api`
```bash
# 函数配置
函数名称: pin-admin-api
运行时: Node.js 18
内存: 512MB
超时: 30秒

# 环境变量
JWT_SECRET_ADMIN=xxx  # 独立的 JWT 密钥
ADMIN_EMAILS=admin@example.com
ADMIN_PASSWORD_HASH=xxx  # bcrypt 加密后的密码
SLS_PROJECT=pin-api-logs
SLS_LOGSTORE=pin-app-http-logstore
ALIYUN_TABLESTORE_ENDPOINT=xxx
ALIYUN_TABLESTORE_INSTANCE=pin-main
```

#### 函数代码结构
```
pin-admin-api/
├── index.js              # 入口函数
├── package.json
├── common/
│   ├── response.js       # 响应封装
│   ├── jwt.js            # JWT 工具
│   └── sls.js            # SLS 查询
├── controllers/
│   ├── auth.js           # 认证控制器
│   ├── user.js           # 用户控制器
│   ├── artwork.js        # 作品控制器
│   └── stats.js          # 统计控制器
└── services/
    └── tablestore-store.js  # 复用现有文件
```

### 8.2 前端部署

#### GitHub Actions 配置
```yaml
name: Deploy Admin
on:
  push:
    branches: [main]
    paths: ['admin/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd admin && npm ci && npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./admin/dist
          destination_dir: admin
```

#### 访问地址
- 临时：`https://pin-admin-upqapogxgn.cn-hangzhou.fcapp.run`
- 正式（备案后）：`https://admin.picsync.cn`

---

## 九、测试方案

### 9.1 测试范围

| 模块 | 测试项 | 类型 |
|------|--------|------|
| 认证 | 登录成功/失败 | 功能测试 |
| 认证 | Token 过期处理 | 功能测试 |
| 用户 | 列表查询/分页/搜索 | 功能测试 |
| 用户 | 详情查看 | 功能测试 |
| 用户 | 删除用户 | 功能测试 |
| 作品 | 列表查询/筛选 | 功能测试 |
| 作品 | 下架/删除 | 功能测试 |
| 统计 | 仪表盘数据 | 功能测试 |

### 9.2 自动化测试
- 使用 Playwright 编写 E2E 测试
- 覆盖所有页面和主要功能
- CI 中自动运行测试

---

## 十、排期计划

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| 1 | 技术方案文档 | 0.5 天 |
| 2 | 后端开发（FC函数） | 1.5 天 |
| 3 | 前端开发（Vue3） | 2 天 |
| 4 | 联调测试 | 0.5 天 |
| 5 | 部署上线 | 0.5 天 |
| **总计** | | **5 天** |

---

## 十一、附录

### 11.1 依赖清单

**后端依赖**
```json
{
  "dependencies": {
    "@alicloud/sls2020": "^1.0.0",
    "bcryptjs": "^2.4.3",
    "tablestore": "^5.0.0"
  }
}
```

**前端依赖**
```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.7.0",
    "axios": "^1.7.0"
  }
}
```

### 11.2 环境变量清单

| 变量名 | 说明 | 来源 |
|--------|------|------|
| `JWT_SECRET_ADMIN` | 管理员 JWT 密钥 | 手动配置 |
| `ADMIN_EMAILS` | 管理员邮箱白名单 | 手动配置 |
| `ADMIN_PASSWORD_HASH` | 管理员密码哈希 | 手动配置 |
| `SLS_PROJECT` | SLS 项目名称 | 阿里云控制台 |
| `SLS_LOGSTORE` | SLS Logstore 名称 | 阿里云控制台 |
| `ALIYUN_TABLESTORE_ENDPOINT` | Tablestore 端点 | 现有配置 |
| `ALIYUN_TABLESTORE_INSTANCE` | Tablestore 实例名 | 现有配置 |

---

**文档完成，等待评审确认后进入开发阶段。**
