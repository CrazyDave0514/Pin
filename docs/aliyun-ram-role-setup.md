# PIN 阿里云函数执行角色配置说明

更新时间：2026-05-26

## 1. 当前阻塞

当前 `pin-developer` 这只 RAM 用户可以：

- 使用 OSS
- 使用函数计算
- 使用 API 网关
- 使用 Tablestore

但它没有足够的 RAM 权限去：

- 查看角色列表
- 查看自身挂载的策略
- 创建或绑定函数执行角色

因此当前真正的阻塞不是代码，而是“函数执行角色未配置”。

## 2. 为什么必须配函数执行角色

当前我没有把长期 `AccessKey` 写进函数环境变量。

这样是对的，但结果是：

- `pin-app` 的无状态路由可以工作
- `pin-app` 访问 Tablestore 时没有安全凭证来源

所以必须给 `pin-api` 服务绑定一个 RAM 执行角色，让函数通过角色访问 Tablestore。

## 3. 推荐角色方案

建议创建一个普通 RAM 角色：

- 角色名：`PinFcExecutionRole`
- 可信实体：阿里云服务
- 服务主体：`fc.aliyuncs.com`

信任策略可用：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": [
          "fc.aliyuncs.com"
        ]
      }
    }
  ]
}
```

## 4. 角色应挂载的策略

第一阶段建议最小够用：

- `AliyunOTSFullAccess`

如果你后面准备让函数直接参与 OSS 上传签名或文件处理，再补：

- `AliyunOSSFullAccess`

如果只希望函数读 OSS，可先挂：

- `AliyunOSSReadOnlyAccess`

## 5. pin-developer 需要补的权限

为了让我继续自动化收尾，`pin-developer` 这只 RAM 用户还需要至少具备：

- `ram:ListRoles`
- `ram:GetRole`
- `ram:CreateRole`
- `ram:AttachPolicyToRole`
- `ram:PassRole`

如果你不想细拆，最省事的临时方案是：

- 给 `pin-developer` 临时加 `AliyunRAMFullAccess`

等我把角色配完后，你再把这项高权限撤掉。

## 6. 控制台点击版

### 6.1 创建角色

1. 登录阿里云控制台
2. 搜索 `RAM`
3. 进入 `身份管理` -> `角色`
4. 点 `创建角色`
5. 选择：
   - 可信实体类型：`云服务`
   - 云服务：`函数计算 FC`
6. 角色名称填：
   - `PinFcExecutionRole`
7. 创建完成

### 6.2 给角色授权

1. 打开刚创建的 `PinFcExecutionRole`
2. 点 `新增授权`
3. 添加：
   - `AliyunOTSFullAccess`
4. 如果后面要让函数直接处理 OSS，再补：
   - `AliyunOSSReadOnlyAccess` 或 `AliyunOSSFullAccess`

### 6.3 给 pin-developer 放行 PassRole

如果你希望我继续用 CLI 自动绑到函数服务，需要给 `pin-developer` 增加：

- `ram:PassRole`

最简单的方式仍然是临时给：

- `AliyunRAMFullAccess`

配置完我再继续，完成后建议移除。

## 7. 配完后我会做什么

你或 Trae 把这部分配好后，我会继续：

1. 给 `pin-api` 绑定 `PinFcExecutionRole`
2. 重新验证 `pin-app`
3. 让 `/users`、`/projects`、`/artworks`、`/relations` 等路由真实读写 Tablestore
4. 把前端 `AliyunPinDataProvider` 指到 API 网关域名开始联调

## 8. 当前检查结果

当前我已经确认：

- `PinFcExecutionRole` 存在
- 信任策略正确，可信服务是 `fc.aliyuncs.com`

但它当前挂了这些策略：

- `AliyunOTSFullAccess`
- `AliyunOSSReadOnlyAccess`
- `AliyunOSSFullAccess`
- `AliyunRAMFullAccess`

其中：

- `AliyunOTSFullAccess` 是合理的
- `AliyunOSSReadOnlyAccess` 或 `AliyunOSSFullAccess` 视后续是否需要 OSS 写入决定
- `AliyunRAMFullAccess` 不应挂在函数执行角色上

## 9. 你现在需要改什么

请把 `PinFcExecutionRole` 上的：

- `AliyunRAMFullAccess`

移除。

建议同时二选一保留 OSS 权限：

- 如果函数只需要读 OSS：保留 `AliyunOSSReadOnlyAccess`
- 如果函数需要写 OSS：保留 `AliyunOSSFullAccess`

不要同时保留两个 OSS 系统策略。

最终建议保留：

- `AliyunOTSFullAccess`
- `AliyunOSSReadOnlyAccess` 或 `AliyunOSSFullAccess`

改完后，我就可以继续把它绑定到 `pin-api`。
