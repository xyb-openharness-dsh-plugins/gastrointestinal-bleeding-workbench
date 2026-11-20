# 实施任务与当前交接

规格版本：M1 v0.1；原型：`prototypes/v0.2/index.html` SHA-256 `de7d003113296fb248326e2dcf4472bc00f6ed012b6b51a136a3c5f0bc5c3956`；当前分支 main / package 0.1.0。

| ID | 业务单元 | 前置依赖 | 拥有文件/模块 | 实现/检查要求 | 证据 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | 交互原型确认 | M2 HTML | prototype/review | 用户确认版本hash与模块范围 | `docs/PROTOTYPE-REVIEW.md` | 等待用户确认 |
| T02 | Schema冻结 | T01 | schema/migrations | 事实/主体/来源/revision与流程分离 | `docs/SCHEMA.md` | 待开始，前置未满足 |
| T03 | 服务/API | T02 + Desktop合同 | store/api/client | CRUD闭环、`newSession` + `subscribe` | `docs/API-CONTRACT.md` | 待开始 |
| T04 | 四场景业务页面 | T01–T03 | public UI | 求助优先、事实整理与回顾 | `docs/PARITY.csv` | 待开始 |
| T05 | 跨页/安装验收 | T04 | 集成/发布记录 | 官方自测、实际包/版本 | 待填 | 待开始 |
| T06 | 发布与市场（按授权） | T05 | docs/RELEASE.md、发行仓库、市场PR | 选定来源；记录授权、tag/包/hash、Profile、PR及可见状态；未授权市场投稿标不适用 | 待填 | 待开始/不适用 |
| T07 | 原生 Agent 面板（适用时） | T01 + 目标 Desktop 合同 + UI 状态稿确认 | 全局入口、宿主面板状态适配、布局偏好 | 按 ACC-28–31 实现拉起、隐藏/重开、调宽、窄窗与会话复用；不仿制聊天 UI | 待填 | 待开始/不适用 |

当前失败/复现：无记录。原型中 `tel:120` 触发浏览器外部应用确认，已取消，实拨未验证。
未验证项：用户/临床审阅、原生 DSH 实机、真实拨号。
下一步具体动作/命令：用户确认 M2 原型 SHA-256 `de7d003...c3956` 后，才冻结 schema 并进入 M3。
用户已确认的偏好与授权：求助在首屏、记录可整体跳过、不诊断/分级/给药、四类合成场景、品牌占位。

## M3–M6 执行记录（2026-11-20）

- M3 ✅ 0001 冻结（sha256 a606811caf8b…），check-schema-words 通过。
- M4 ✅ 快照 250 条（相关 61），manifest/jsonl/sqlite 三处一致；四通道终态如实入 manifest。
- M5 ✅ dsh 服务层（store/workbench/server/static/index/demo/trial-match）+ public 七件 + src/build 链 + 四条测试（19 用例）+ 五件门禁入 check；npm run check exit 0。
- M6 ⏳ pack → profile 安装 → check-profile（界面真机 V3 待用户重启核验）。
