# PIN 阿里云采买与接入说明

## 1. 先说结论

PIN 现在这套服务层已经收口完成，把“本地 provider”切到“云端 provider”本身不算大改。

如果改成阿里云，建议先按“小而稳”的方案采购，不要一开始就买太多产品：

- 后端计算：函数计算 FC
- 接口暴露：API 网关
- 文件存储：OSS
- 结构化数据：表格存储 Tablestore
- 日志：SLS（通常和函数计算一起看）

这样最适合当前 PIN 的五块数据：

- 登录
- 项目
- 社区作品
- 购买
- 积分

## 2. 为什么我推荐这套

原因很简单：

- 不需要你先买服务器和自己运维 Linux。
- 和我们现在的 provider 结构最贴合。
- 以后页面基本不用再动，主要改 `AliyunPinDataProvider` 和服务端接口。
- 先按量付费，前期试错成本低。

## 3. 推荐采购顺序

建议按这个顺序开：

1. 阿里云账号实名认证
2. OSS
3. 函数计算 FC
4. API 网关
5. 表格存储 Tablestore
6. RAM 子账号 / AccessKey

## 4. 每个产品买来做什么

### 4.1 OSS

用途：

- 存作品缩略图
- 存用户头像
- 后续如需导入导出文件，也可以放这里

你买完后需要给我：

- Bucket 名称
- 地域
- 是否启用公网访问
- CORS 配置策略

### 4.2 函数计算 FC

用途：

- 承接 PIN 的业务接口
- 把原本本地 `pin_*` 的读写，改成云端 API 调用

你买完后需要给我：

- 地域
- 服务名称
- 函数名称
- 运行时（建议 Node.js）
- 触发方式

### 4.3 API 网关

用途：

- 给前端一个统一 HTTPS 接口入口
- 做基础鉴权、限流、路由

你买完后需要给我：

- API 分组名称
- 调用域名
- 是否已绑定 HTTPS
- 是否和函数计算同地域

### 4.4 表格存储 Tablestore

用途：

- 存用户
- 存项目
- 存社区作品
- 存购买记录
- 存积分记录

如果你更熟悉 MySQL，也可以走 RDS MySQL，但对你当前阶段来说，Tablestore 更省心一点。

你买完后需要给我：

- 实例名
- Endpoint
- 地域
- 是否开公网访问

## 5. 我建议你先不要买什么

现阶段先不要急着买：

- ECS 云服务器
- Kubernetes / ACK
- 复杂的企业身份系统
- CDN
- 专线网络

这些以后如果访问量上来了再加，不是 PIN 当前第一阶段必须品。

## 6. 你买完后要提供给我的信息

最少给我这一组就够我开始接：

- 阿里云地域
  - 建议统一一个地域，比如杭州或上海
- OSS
  - bucket 名
  - endpoint
- 函数计算
  - service 名
  - function 名
- API 网关
  - 对外域名
- Tablestore
  - instance 名
  - endpoint
- RAM 子账号或受限 AccessKey
  - 只给开发环境权限
  - 不要直接给主账号长期密钥

## 7. 你不需要现在就给我的东西

现在还不需要：

- 生产环境正式域名
- 企业版高级安全配置
- 多地域容灾方案
- 正式备案完成后的全量上线信息

## 8. 我拿到这些后会做什么

我会分两步改：

### 第一步

- 把当前 `AliyunPinDataProvider` 从占位实现改成真实 provider
- 先接登录、项目、社区作品、购买、积分五块核心数据
- 保持页面调用方式不变

### 第二步

- 接 OSS 文件上传
- 接更完整的鉴权和错误处理
- 补开发环境配置说明和回归文档

## 9. 对你最省事的购买建议

如果你现在完全不熟，直接照这个最低可用组合买：

- 个人实名认证阿里云账号
- OSS 1 个 bucket
- 函数计算 FC 1 套
- API 网关 1 个分组
- Tablestore 1 个实例

这已经足够把 PIN 从本地存储过渡到云端。

## 10. 官方参考

以下是我本次参考的阿里云官方资料：

- 购买前需先完成实名认证：
  - https://help.aliyun.com/zh/document_detail/2859053.html
- 表格存储产品文档：
  - https://help.aliyun.com/zh/tablestore/
- API 网关对接函数计算：
  - https://help.aliyun.com/zh/api-gateway/traditional-api-gateway/user-guide/function-compute
- API 网关能力说明：
  - https://help.aliyun.com/zh/api-gateway/traditional-api-gateway/product-overview/benefits

说明：

- 上述信息是我在 2026 年 5 月 26 日按阿里云官方资料整理的。
- 具体价格、免费额度、开通页细节可能变化，实际购买时以阿里云控制台当天页面为准。
