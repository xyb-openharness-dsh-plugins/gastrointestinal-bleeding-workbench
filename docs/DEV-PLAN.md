# 开发计划（DEV-PLAN）· 消化道出血工作台 CX-001

- 认领：issue #87（并发症试点首项，queueC）；2026-11-19 建仓 + M0–M2 提交；2026-11-20 晨间续跑（本窗口）。
- starter 基线：xyb-workbench-starter 1.10.0-rc.56（init 252 文件）。
- 里程碑状态：M0 ✅（文档九件缺四，见 DEV-REQUIREMENTS）· M1 ✅（G1 自动签认待追认）· M2 ✅ 补齐 primer 三件套与双入口（G2 自动签认待追认）· M3–M9 ⏳ 未开始。
- M3 前置：用户确认原型 hash（`4c28fa5c…`）后冻结 schema；先补 check-trial-matching.mjs（自 starter）。
- M4：`scripts/fetch-gi-bleeding-trials-2026.mjs` 四通道（unified-trial-mcp stdio），FAILED/NEEDS_SETUP 如实入 manifest。
- M5：目录选择硬闸门（①真实 pickDirectory ②双端拒绝清单 ③config.root 落点）+ 写入闭环（POST /api/gi-bleeding/subjects，is_demo=0）+ 试验四段。
- M6：pack → profile 装 → 用户退出重开 Desktop 后实机走查（本代理不自行重启宿主）。
- M7/M8：仅草稿至 docs/release-draft/，无授权不实发。
- M9 回流：本轮已预回流一条至 starter LESSONS（跨仓验证的 cwd 纪律），其余在里程碑完成时结算。
