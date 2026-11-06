# lxy的秋招助手开发交接

作者：lxy。更新：2026-11-06（Asia/Shanghai）。

## 接手入口

主机：10.112.228.192，用户 lxy。源码：F:\LXY\求职助手\app。
先读 AGENTS.md、本文件、docs/VERIFICATION.md。父目录 CODEX_REMOTE_HANDOFF_JOB_HELPER.md 保留原始调查及接手历史；其中“尚未下载/运行/修改”是发布前旧记录。

上一轮使用新会话 SSH 接手，执行端已结束，父目录 .job-helper-remote-owner.json 状态为 released。接手前仍须确认没有其他执行端正在修改，仅保留一个写入端。不要恢复原会话 01a1ac89-052a-72f1-b00a-d358f37e452a 或 CST/论文会话，不终止其他任务。

## 已交付基线

- 产品：lxy的秋招助手；产品作者/维护者 lxy，保留上游法律声明。
- 源码：https://github.com/holeseven/qiuzhi_helper
- 发布：https://github.com/holeseven/qiuzhi_helper/releases/tag/v0.1.0
- v0.1.0 代码提交：e0f7463ed3e1c85f517ac33353b3567de2dbfc24。文档提交可使 main 前进，不移动已发布标签。
- 上游：OpenJobAutofill MIT 提交 005eda98841b3671ead615ebfde5922f0dfd7c36，保留 Br1an67 版权；没有复制原商业打包扩展的代码或资源。
- 插件免账号，本地保存资料，默认关闭 AI，预览确认、已有内容保护、人工最终提交；备份不含 API Key。
- Java 21 + Spring Boot 3.5.16 后端仅提供规则/健康检查，监听 127.0.0.1:18765，无数据库、无资料上传。
- 基础填写不依赖 AI 或后端在线。当前未留下后端常驻服务，按需启动。
- 产物在 dist：lxy-autumn-helper-0.1.0.zip、lxy-helper-rules-0.1.0.jar、SHA256SUMS.txt。

## 直接继续开发

在开发主机 lxy 用户 PowerShell 中执行：

~~~powershell
Set-Location -LiteralPath 'F:\LXY\求职助手\app'
. .\scripts\enter-dev.ps1
$env:Path = 'F:\LXY\求职助手\tools\git\cmd;C:\Program Files\GitHub CLI;' + $env:Path
git status --short --branch
git log -3 --oneline
~~~

若 PowerShell 明确提示执行策略阻止脚本，可先仅对当前窗口设置：
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

已有 node_modules、便携 Node/Java/Maven 和浏览器，可直接使用，无需重新安装或覆盖。确实缺失依赖时，先加载 enter-dev.ps1 再执行 npm ci；Playwright 浏览器放入该脚本指定的项目 tools/browsers。

~~~powershell
# 验证，不打包
.\scripts\test.ps1 -WithBrowser

# 发布前使用：运行全部检查并重新生成 dist 产物
.\scripts\build.ps1 -WithBrowser
~~~

这两条都包含完整检查，不需要每次连续重复执行。常规开发按改动选择相关测试；仅改文档检查差异即可。构建更新本地产物，不会自动更新 GitHub Release。

可选后端在单独窗口前台运行：

~~~powershell
Set-Location -LiteralPath 'F:\LXY\求职助手\app'
.\scripts\start-backend.ps1
~~~

另一个窗口检查：

~~~powershell
Invoke-RestMethod 'http://127.0.0.1:18765/api/v1/health'
Invoke-RestMethod 'http://127.0.0.1:18765/api/v1/rules'
~~~

在自己启动服务的窗口 Ctrl+C 停止。不要批量终止 java/node/python/浏览器进程。

人工加载插件：打开 chrome://extensions 或 edge://extensions，开启开发者模式，加载已解压的扩展程序，选择 F:\LXY\求职助手\app\extension。改源码后重新加载扩展并刷新表单。使用测试浏览器配置及虚构资料；卸载前备份本地资料。

## 文件导航

| 位置 | 用途 |
| --- | --- |
| extension/src/content.js | 页面识别、匹配、预览、写入保护、控件 |
| extension/src/background.js | 本地资料、AI 开关、规则缓存 |
| extension/src/options.*、popup.* | 设置及插件入口 |
| extension/config/default-rules.json | 唯一规范规则文件，Maven 复制进 JAR |
| backend/src/main/java/io/holeseven/qiuzhi | Spring Boot 服务 |
| tests/ | 后台、Java 联调、浏览器和完整 MV3 回归 |
| docs/RULES.md | 规则协议及缓存 |
| docs/VERIFICATION.md | 验证证据和边界 |
| docs/UPSTREAM_REVIEW.md、LICENSE、NOTICE | 选型、版权及许可证 |
| 父目录 audit/ | 日志、备份、隔离浏览器报告，不提交 Git |
| 父目录 vendor/、tools/ | 原样上游快照和便携工具，不覆盖 |

所有文件修改、下载、构建和测试保留在 F:\LXY\求职助手 内，不触碰原商业包、论文/CST/MATLAB 工程。

## 验证状态与边界

2026-11-06 发布前完整构建退出 0：Node 8 项、Spring HTTP 3 项、真实 Java 服务与离线缓存联调、操作按钮防护、不明确重复经历跳过、完整 MV3 插件的 13 项填写、预览取消、已有数字值保护、备份恢复均通过。默认填写测试没有外部请求。
证据：父目录 audit/release-verification.log、audit/extension-smoke.json、audit/published-v0.1.0.json；详见 docs/VERIFICATION.md。本次交接文档补充没有重新执行业务测试。

尚未登录真实招聘站点逐站验收，未单独验证用户日常 Chrome/Edge 桌面。Moka/北森等配置存在不等于真实站点已经适配。iframe、Shadow DOM、自绘日期及级联控件可能要适配；不会自动新增经历行。多条经历不能可靠匹配时保持空白并提示人工处理。

## 下一步

1. 在实际 Chrome/Edge 完成人工安装、设置、备份和虚构表单验收。
2. 选择本人近期使用的一个真实招聘页面，收集脱敏的失败结构，不提交真实简历、账号、Cookies 或他人资料。
3. 将失败结构/控件行为做成虚构回归用例，再修改规则或控件；优先保证正确匹配、已有值保护和最终提交人工操作。
4. 逐站记录测试日期、浏览器、通过范围及手动项，更新验证记录和两份交接文档。
5. 完成相关验证后提交；发新版本时统一版本号、完整构建、发布新标签，不覆盖 v0.1.0。

## 已知注意事项

- 实际 MV3 测试用 CDP Extensions.loadUnpacked；此主机 --load-extension 参数曾挂起，不能据此判定源码故障。
- 模态预览使背景表单 inert；模拟网页异步修改应使用页面脚本并先确认修改生效。
- 已有数字 0/1 不能当空白覆盖；重复区块不明确时不能猜测记录。
- Windows PowerShell 5 原生 stderr 警告不等于失败；现有脚本按实际进程退出码判断。
- GitHub CLI 已经授权 holeseven，仓库使用 gh credential helper。出现问题先检查状态，勿输出令牌。
- 不提交真实资料、备份、浏览器配置、密钥、owner 记录、工具下载或原商业包。作者写 lxy，同时保留上游版权。

## 给下一位 Codex 的提示

~~~text
请在本机接手“lxy的秋招助手”，产品作者 lxy。
源码 F:\LXY\求职助手\app。先读 AGENTS.md、HANDOFF.md、docs\VERIFICATION.md，
再读父目录 CODEX_REMOTE_HANDOFF_JOB_HELPER.md 的最新记录。
v0.1.0 已发布，仓库 holeseven/qiuzhi_helper。
先核对 git 状态和其他写入端，保留未提交改动，不覆盖原文件，不恢复其他任务会话。
所有开发、下载、构建和测试均在 F:\LXY\求职助手 内执行。
继续完善实际 Chrome/Edge 和目标招聘站点兼容性，先用虚构资料建立回归再修改。
保持免登录、本地资料、默认关闭 AI、预览确认、已有内容保护、最终提交由用户操作。
日常开发自主推进，持续更新交接和验证记录，不触碰论文/CST/MATLAB 任务。
~~~
