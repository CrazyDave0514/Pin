# Pin 项目执行规则

> 旧版规则已作废。当前仓库保留此文件作为 Codex 入口提示，正式规则以 Trae 本地规则文档为准。

## 正式规则源

- 规则文档：`/Users/chengrundong/Documents/Trae/Pin/.trae/project_rules.md`
- 飞书目录索引：https://rcnf2iyzif3o.feishu.cn/docx/H1eAdRYUhojABExwElzc3nZwnFd
- 飞书项目文档库：https://rcnf2iyzif3o.feishu.cn/drive/folder/R6PrfbeRilXPsAdL626cS1nnnv0

## Codex 执行要求

每次进行产品、设计、开发、测试、发布或回归相关工作前，Codex 必须先读取正式规则源，并以正式规则源为准。

当前协作分工摘要：

- SOLO：需求文档、测试用例、测试执行、线上回归、飞书文档维护。
- Codex：UI/UE 设计规范、代码开发、开发自测、BUG 修复、发布。

阶段流程必须按正式规则源执行：

1. 阶段 1 需求对齐：SOLO 负责。
2. 阶段 2 UI/UE 设计规范：Codex 负责。
3. 阶段 3 代码开发 + 开发自测：Codex 负责。
4. 阶段 4 测试用例 + 测试执行：SOLO 负责。
5. 阶段 5 产品/UI/UE 验收：产品 + UI + UE 负责。
6. 阶段 6 发布：Codex 负责。
7. 阶段 7 线上回归：SOLO 负责。

## 安全要求

- 禁止把 GitHub、飞书或任何第三方访问 Token 写入仓库文件、飞书文档或对话输出。
- 如规则文档或项目文档中出现 Token，视为已泄露，应立即吊销并改用 GitHub CLI、飞书 CLI 或系统钥匙串授权。
- Codex 不读取、不复述、不使用文档中的明文 Token。
