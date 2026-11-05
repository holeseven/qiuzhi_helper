# 开源选型与源码核查

日期：2026-11-06。作者：lxy。

| 候选 | 核查范围 | 结论 |
| --- | --- | --- |
| [OpenJobAutofill](https://github.com/Br1an67/OpenJobAutofill) | 下载固定提交、读取 MIT 全文、检查全部文件清单与网络调用、运行原版虚构表单 | 采用。可读 JS，无运行时第三方依赖；有中文经历与控件代码。原版并非严格无 AI 路径，已针对实际发现的问题改造。 |
| [offline-form-filler](https://github.com/fanhuayishiy/offline-form-filler) | 仓库说明与许可证标识 | MIT 标识，离线、手动映射与撤销很有参考价值。侧重通用表单，复杂网申和重复经历未运行验证；未复制代码。 |
| [S03-5/resume-autofill](https://github.com/S03-5/resume-autofill) | 仓库说明与 MIT 标识 | 有中文控件、经历、台账等功能说明，可作为后续调研对象；功能声明未独立验证，未复制代码。 |
| [local-resume-autofill](https://github.com/LKRCharon/local-resume-autofill) | 仓库说明与 MIT 标识 | 有声明式适配器和本地加密方案；需要本地保险库口令，适配器说明也仅为 fixture-verified。暂不增加此类交互，未复制代码。 |
| [qiuzhao-autofill](https://github.com/Xplore-LAB/qiuzhao-autofill) | 仓库说明、文件清单 | 未发现明确的主项目许可证，暂不复制代码。 |

这些比较基于各仓库当前可读取的源码/说明，未将 README 功能列表当作实测结果。

## 固定来源与许可

采用提交：`005eda98841b3671ead615ebfde5922f0dfd7c36`。上游 ZIP SHA256：`bac7717c38dd47e25c6925b48aca46046226c1bc4ed47af91cdf86c22a57cf07`。详细来源见 [upstream.json](upstream.json)。

[MIT 许可](https://github.com/Br1an67/OpenJobAutofill/blob/005eda98841b3671ead615ebfde5922f0dfd7c36/LICENSE) 允许修改和分发，并要求保留版权与许可声明。本版本保留 Br1an67 原始声明，增加 lxy 的改造版权；没有把上游代码改称为 lxy 独立创作。

上游扩展为原生 HTML/CSS/JavaScript，无 package.json、外部运行时脚本或需安装的业务依赖；图标随 MIT 仓库保留。新增 Playwright 只用于开发测试（Apache-2.0），不会随扩展 ZIP 分发。Spring Boot 的依赖由 Maven 管理，后端 JAR 中各依赖保留自身许可。

原项目根目录的商业打包扩展未核实再分发许可，未复制其业务代码、资源或发布包到本仓库。

## 实测发现与处理

1. 原版在无 API 配置时，结构识别与字段映射各尝试一次 AI HTTP 请求，再失败回退。改造为显式开关，默认直接本地匹配，前后端双重检查开关。
2. 原版通用容器读取会把后续字段标签误认成第一个标签，整页文本又污染经历分类。原版虚构表单中出现学校/专业串填。本版本优先绑定 label/aria、使用就近分组，并限定明确别名与重复记录索引。
3. 原版会丢弃重复类型的自定义分类。本版本保存并恢复重复分类，设置页也保留这类数据。
4. 增加预览确认、已有内容保护及写入前复查；默认禁止复选框声明等敏感控件。
5. 去除定时外部更新请求，改为用户手动检查本项目更新；本地填写默认没有外部请求。
6. 保留控件写入的原生 setter 和 input/change/blur 事件处理，不复制原商业打包扩展。

原版审计日志、源码快照、浏览器测试资料留在开发主机项目内的 audit/vendor 中，不发布用户资料和浏览器目录。
