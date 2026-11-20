# 独立体检报告（FAMILY-INSPECTOR · 精简执行版）· 2026-11-20

审查人：夜班代理（只读审查 + 复跑断言，不修改被测代码；本轮修复由开发侧同批完成后再复验）
四态口径：通过 / 失败 / 跳过（注明原因）/ 待人工（注明缺什么证据）

| 项 | 结果 | 证据 / 说明 |
| --- | --- | --- |
| A 视觉 | 通过 | 实渲截图 docs/evidence/M5-home / records / clinical-match / clinical-search / primer-entry / primer-open / settings（1440×900）；390 宽无横向溢出（探针 R12） |
| B 菜单 | 通过 | 一级 5 项（求助与记录 / 我的记录 / 临床研究 / 疾病概要 / 设置）；临床三子页 tab；设置三 tab |
| C 设置三 tab | 通过 | 资料目录 / 临床数据库 / 隐私（rc.2 改为 tab，探针 R7 复验） |
| D 一图秀 | 跳过 | 本病种试点范围不含一图秀（DEV-REQUIREMENTS 记录；非缺陷） |
| E 录入窗口 | 通过 | 八类记录表单、空输入拦截、保存后摘要出现（R11）；HTTP/服务层写入测试 |
| F 数据层 | 通过 | schema 0001 冻结（无判读列）；demo 与真实档案分表行；快照三处计数一致 |
| G 红线 | 通过 | check-wording 0 命中；匹配四件套（分母/待确认/证据链/不是入组资格）；私密不进摘要 |
| H 回归 | 通过 | `npm run check` 0 · `npm test` 19/19 · conformance 40/40 · 探针 13/13 · primer 10/10（源码树与装机副本各一轮） |

## P0/P1 清单

- P0：0 项。
- P1：0 项。
- P2（记录不改）：模块加载器注册 id 与包名同源（已 scoped）；profile 预存 `billion-context` 缺失属既有状态。

## 修复痕迹

- 本轮修复 6 项后复跑：① R7 settings 断言随 tab 结构更新；② 记录类型计数随档刷新；③ 演示问答记录补 recordedBy/sourceNote；④ 设置页 tab 化；⑤ 包名 scoped 对齐家族；⑥ serve-artifact 重写为当前服务层签名。
- 复跑命令与数字见上表 H。
