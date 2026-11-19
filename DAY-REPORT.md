# 消化道出血工作台开发阶段报告

日期：2026-11-19 UTC  
仓库：`xyb-openharness-dsh-plugins/gastrointestinal-bleeding-workbench`  
当前分支：`main`  
当前包版本：0.1.0（starter 基线）；目标版本：0.2.0（尚未切版）

## 本阶段结果

| 里程碑 | 状态 | 证据/提交 |
|---|---|---|
| M0 | 完成：starter `1.10.0-rc.56` 初始化，252 个文件；占位名标记待追认 | `docs/MILESTONE-EVIDENCE.md`；`8564128`、`3616fa2` |
| M1 | 完成：三路桌面调研、来源范围核查、S1–S4、G1 自动签认（待晨审追认） | `docs/MILESTONE-EVIDENCE.md`；`eaca9f1`、`9dcf095`；`docs/G1-AUTO-SIGNOFF.md` |
| M2 | 原型及实际预览完成；用户对原型版本/hash/范围的签认待处理，因此 M3 尚不能开始 | `docs/PROTOTYPE-REVIEW.md`、`docs/evidence/`、`docs/MILESTONE-EVIDENCE.md`；`47f927d`、`f979447` |
| M3 | 未开始：等待 M2 原型签认后冻结 schema | 依赖门禁见 `docs/PROTOTYPE-REVIEW.md` |
| M4 | 未开始：公开资料与合成数据待 schema 后整理 | 未取得本阶段证据 |
| M5 | 未开始：服务层、面板契约及 `newSession`/`subscribe` 待开发 | 未取得本阶段证据 |
| M6 | 未开始：pack/profile 检查待实施；DSH Desktop 实机任务无法在 sam 上验证 | 未取得本阶段证据 |
| M7/M8 | 未开始：尚无草稿；明确不会发布、打 tag 或改 BACKLOG | 未取得本阶段证据 |
| M9 | 未开始：未运行最终门禁 | 未取得本阶段证据 |

## M2 原型

- 原型：`prototypes/v0.2/index.html`，SHA-256 `de7d003113296fb248326e2dcf4472bc00f6ed012b6b51a136a3c5f0bc5c3956`。
- 已实现首屏紧急求助、可跳过记录、S1–S4 合成样例、时间/观察事实/来源/代记/背景/资料摘要，以及明确标注“宿主模拟 / 非真实 DSH 会话”的右侧面板状态。
- Chromium 本地实际预览，照护者合成情境载入和摘要生成已观察；`tel:120` 打开外部应用确认后取消，未拨号。实际拨号、DSH 会话与桌面安装均未验证。
- 视觉证据：`docs/evidence/M2-prototype-1365x900.png`、`M2-prototype-390x844.png`、`M2-agent-pane-1365x900.png`。

## 医学与签认边界

- M1 查到 ACG 2021 上消化道出血指南、WSES 2020 溃疡穿孔/出血指南，并核到 2025 AWMF 综合指南、2026 ESGE 溃疡出血更新及 ACG 2023 下消化道更新。来源范围和未取得原件状态见 `docs/USER-RESEARCH.md`。
- 未做患者/照护者访谈；未有临床审阅；临床审阅责任人待定。G1 为自动签认草案，待晨审追认，不代表用户/临床签字。
- 暂定范围为中国大陆、简体中文、成人患者与照护者，待用户确认，M7 前复核。产品名为占位名，待用户追认。
- 真实患者数据禁止入仓；现有原型只有合成数据。

## 门禁、测试与安装

- 本阶段未运行 `npm run check`、`npm test` 或五项最终门禁；它们属于 M9 收口。`git diff --check` 在 M2 产物提交前退出码为 0，见证据表。
- `docs/TEST-CASES.md` 将在 M9 前按模板创建；目前不存在测试用例实测结论。
- DSH Desktop 实机安装、退出重开、点击走查一律未验证；本机不能执行。未创建 Release、未打 tag、未改组织 BACKLOG。

## 阻塞分类

**② 人工决定类。** 当前等待用户对 M2 原型 hash `de7d003113296fb248326e2dcf4472bc00f6ed012b6b51a136a3c5f0bc5c3956` 及上述模块范围作确认或提出修改。该决定是 starter `AGENTS.md` HTML 先行关口，确认前不得冻结 M3 schema 或进入相应生产业务开发。另有临床审阅责任人和首版地区/语言/人群待决定；前者不阻断开发，后者按任务要求在 M7 前确认。

当前证据目录：`docs/MILESTONE-EVIDENCE.md`。测试用例：尚未创建，M9 未开始；不得据此宣称 M9 完成。

## 2026-11-20 晨间续跑窗口（06:28–07:20）

- 认领补签：issue #87 /claim + claim/claimed 自查补签（待追认）；未重建仓（FULL-CYCLE §1 续跑规则）。
- M2 补齐：primer 三件套 + 双入口；probe 10/10（URL http://127.0.0.1:8126/prototypes/v0.2/index.html）、self-test exit 2、check-primer-links 17/17；G2 自动签认待追认；commit ca96323 已 push。
- 五件门禁现状：data-dir/trial-chain/patient-create/trial-snapshot 均 exit 1（M4/M5 未做，如实红）；check-trial-matching.mjs 缺（rc.56 init 未含，M4 时从 starter 补）。
- 面板契约（B 任务）：check-agent-pane-contract exit 0；grep newSession=3 / subscribe=2 / ensureSession=0 / Boolean(conversation)=0 / ownsSession=2（starter 基线）；实机未验证。
- M3–M9 未开始：时间盒到点收尾。
