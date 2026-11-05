# lxy的秋招助手

作者：**lxy**。给自己和朋友使用的 Chrome / Edge 网申助手：免注册、免登录，个人资料保存在各自浏览器本机。基础填写不需要 AI、API Key 或在线后端。

## 安装与使用

1. 从 [Releases](https://github.com/holeseven/qiuzhi_helper/releases) 下载扩展 ZIP，解压到固定目录。
2. 打开 `chrome://extensions` 或 `edge://extensions`，开启开发者模式，选择“加载已解压的扩展程序”，选中含 `manifest.json` 的目录。源码安装则选择本仓库的 `extension`。
3. 在扩展“设置”中填写资料并保存，或导入自己的 JSON 资料备份。`extension/sample-profile.json` 全部为演示资料。
4. 打开招聘表单，先手动添加需要的教育、实习等经历行，点击扩展“开始填写”。
5. 检查预览中的字段、资料来源和内容，再确认填写。已有内容保留；橙色项手动处理。**检查后由你自己提交申请。**

支持基础信息、多段教育与实习、项目、科研、论文、专利、奖项、自评以及自定义字段/分类。可在资料面板搜索和复制未匹配项。资料修改后记得保存。

## 数据与隐私

- 资料使用 `chrome.storage.local`，各个浏览器独立保存，不上传后端。
- 备份为明文 JSON，包含个人资料；请自行保管。备份不包含 AI API Key。
- AI 默认关闭；只有主动启用后才调用配置的模型服务。基础填写直接使用本地规则。
- 规则更新只在点击“从本机规则服务更新”时执行；版本检查只在点击“检查更新”时访问本项目的 GitHub Release。
- 不填写密码、验证码、文件上传、支付/银行卡和复选框声明；不点击最终提交或投递按钮。
- 关闭扩展不会清空已保存资料；卸载扩展会删除浏览器中的扩展数据，更新前请备份。

## 可选 Java 规则服务

扩展自带规则，服务未启动也能填写。Java 后端仅提供公开规则和站点配置，没有账号、数据库或简历上传接口，默认绑定 `127.0.0.1:18765`。

安装 Java 21 后运行下载的 JAR：

```powershell
java -jar lxy-helper-rules-0.1.0.jar
```

然后在扩展设置里点击“从本机规则服务更新”。更新失败会保留旧规则。

接口：`GET /api/v1/health`、`GET /api/v1/rules`。规范与缓存行为见 [规则说明](docs/RULES.md)。

## 开发与验证

工程目录是开发主机项目内的 `app`。原始打包插件与候选源码快照保留在其父目录，不覆盖、不纳入本仓库。

```powershell
npm ci
npx playwright install chromium
.\scripts\build.ps1 -WithBrowser
```

脚本优先使用项目父目录 `tools` 中的便携工具，也支持已有 Node.js 24、Java 21、Maven 3.9。构建输出在 `dist`。所有本次开发、构建和测试均在开发主机执行。

测试覆盖本地存储、默认零 AI 请求、重复自定义记录、规则缓存、真实 Java HTTP 服务，以及完整 Manifest V3 扩展中的预览、取消、受控输入事件、两段教育、已有值保护、资料备份与恢复。参见 [验证记录](docs/VERIFICATION.md)。

## 当前边界

v0.1.0 是供本人和朋友试用的首版。自动化使用虚构表单，**尚未逐站验证真实招聘页面**。北森/智业、Moka 等配置存在不等于已经完成真实站点适配；自绘日期、级联选项、iframe、Shadow DOM 或无法明确识别的字段可能需要手工处理。不会自动新增经历行或自动投递。

## 开源来源

扩展基于 [Br1an67/OpenJobAutofill](https://github.com/Br1an67/OpenJobAutofill) 的 MIT 源码改造，固定上游提交 `005eda98841b3671ead615ebfde5922f0dfd7c36`。原作者版权与许可证保留；lxy 为本版本的产品作者和改造维护者。详见 [NOTICE](NOTICE)、[LICENSE](LICENSE) 和 [选型审计](docs/UPSTREAM_REVIEW.md)。
