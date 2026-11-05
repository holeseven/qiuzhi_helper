# lxy的秋招助手开发交接

作者：lxy。更新：2026-11-06。

本仓库是可维护源码，扩展基于 OpenJobAutofill MIT 提交 `005eda98841b3671ead615ebfde5922f0dfd7c36` 改造。产品作者为 lxy，保留上游声明。

- 扩展：`extension`，免账号、本地资料、默认无 AI、预览确认、已有内容保护、人工提交。
- 后端：`backend`，Java 21 + Spring Boot 3.5.16，只读规则/health，127.0.0.1:18765，无数据库/资料上传。
- 工具：开发项目父目录 `tools` 中的 Node 24.22.2、Temurin 21.0.13、Maven 3.9.11、Git 和 Playwright 浏览器；只在开发主机构建。
- 最终验证：`scripts/build.ps1 -WithBrowser` 已通过，详见 [VERIFICATION.md](docs/VERIFICATION.md)。
- 产物：`dist/lxy-autumn-helper-0.1.0.zip`、`dist/lxy-helper-rules-0.1.0.jar`、`dist/SHA256SUMS.txt`。
- 未完成的覆盖范围：真实招聘站点、实际用户 Chrome/Edge 桌面、iframe/Shadow DOM 与复杂自绘控件逐站验证。这些不影响已验证的基础流程，但不能宣称通用覆盖。
- 后续顺序：用脱敏页面结构和虚构资料建立目标站点回归 → 修规则/控件 → 更新验证记录与父目录远程交接文档 → 构建发布。不要把真实资料或令牌提交到仓库。

原打包扩展、上游快照、原版审计结果和完整远程会话说明保留在父项目目录，不覆盖、不复制到公开仓库。不要启动第二个 Codex 修改端，不触碰其他工程或进程。
