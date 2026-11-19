# 互动设计记录

状态：M1 需求假设已收口；G1 自动签认待晨审追认；原型待制作与用户确认。
当前阶段/范围：prototype planning → interactive HTML → actual preview → user confirmation → M3 schema freeze → implementation。
设计提示词：docs/DESIGN-PROMPT.md；设计者章程：docs/DESIGNER-BRIEF.md；实际独立审查：docs/DESIGN-REVIEW.md。
权威内容：docs/BRIEF.md、docs/SPEC.md；UI 与数据设计链接：...

| 决策 ID | 待解决的问题 | 用户已确认内容/来源 | Agent 建议及原因 | 待确认项 | 确认人/日期 | 影响功能 ID |
| --- | --- | --- | --- | --- | --- | --- |
| DESIGN-01 | 紧急求助可达优先 | 求助出口首屏可达、先求助后记录、记录可整体跳过（用户派单，2026-11-19） | 紧急入口固定于首屏且不依赖问卷；降低高压场景阻断 | HTML实际交互、窄屏可达性 | 用户确认原型时 | HELP-01 |
| DESIGN-02 | 首版地区/语言/人群 | 暂定中国大陆、简体中文、成人及照护者 | 先用占位范围推进；发布草稿前确认以免误代表未覆盖人群 | 用户确认 | 用户，M7 前 | GLOBAL-SCOPE |
| DESIGN-03 | 临床审阅责任人 | 用户说明尚未确定，不阻塞开发 | 发布草稿前逐项明确责任和审阅范围 | 决定审阅人/是否另行安排 | 用户/维护者 | MEDICAL-REVIEW |

本轮已写入的章节：USER-RESEARCH、SCENARIOS、HVT-REVIEW、G1-AUTO-SIGNOFF、28-INTERACTION-PATH-DESIGN。
下一步：制作可交互 HTML；用户确认原型版本/hash与模块范围后，才能实现对应生产业务。
确认时展示的原型版本/hash、实际预览方式：...
变更：旧决定 → 新决定、原因、受影响数据/API/原型/验收项：...

用户回答后由 Agent 更新对应文档；本记录只保留决策和指向，不重复复制完整需求。

HTML原型关口：路径/版本/hash、实际预览证据、用户确认范围/原话/日期；未确认则业务开发待开始。
数据演进关口：SCHEMA变化矩阵、领域/流程/读模型边界、兼容与迁移未决项。
