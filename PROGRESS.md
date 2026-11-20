# PROGRESS

更新：2026-11-19 UTC

## 当前里程碑

M0–M2 原型交付完成；当前等用户确认 M2 原型后，才可进入 M3 schema 冻结。版本基线 0.1.0，目标版本 0.2.0。

## 已完成

- M0：按 xyb-workbench-starter `1.10.0-rc.56` 初始化（252 个文件）；占位名「消化道出血工作台」，待用户追认；CX-001 登记册已在组织 `.github` 仓更新为 active，提交 `f3796ce` 已推送。
- M1：三路桌面调研、来源范围核查、S1–S4 场景、G1 自动签认草案（待晨审追认）、HVT 五层及交互路径草案完成。指南现行性已核出 2025 AWMF 综合指南、2026 ESGE 专题更新、ACG 2023 下消化道更新；患者访谈/临床审阅/独立 review 未完成。
- M2：`prototypes/v0.2/index.html` 完成（SHA-256 `de7d003113296fb248326e2dcf4472bc00f6ed012b6b51a136a3c5f0bc5c3956`）；Chromium 实际预览、照护者合成场景填入并生成摘要、Agent 模拟面板开合已走查；截图已存 `docs/evidence/`。用户确认尚未取得，M3冻结/生产业务受此门禁阻挡。

## 2026-11-20 晨间窗口（续跑）

- 认领：issue #87 已发 /claim 并自查补 claim/claimed 标签（机器人夜间无回执，待追认）。
- M2 补齐：primer 三件套（primer-data.js 本病种重写 + starter 36 号模式件）与双入口接线；探针 10/10、self-test 红、check-primer-links 17/17；G2 自动签认（待追认）见 docs/G2-AUTO-SIGNOFF.md。
- B 任务（面板契约）：starter 基线 lib/client.js 已过 check-agent-pane-contract；grep 数字 newSession=3 / subscribe=2 / ensureSession=0 / Boolean(conversation)=0 / ownsSession=2。装机实机状态未验证（M6 未开始）。
- npm run check 当前红点：check-data-dir（M5 范围：目录选择/拒绝清单/config.root 未接）——如实保留。
- M3–M9 未开始（时间盒到点）；下一步：M3 schema 冻结（以 4c28fa5c… 为原型基线候选，待用户追认）。

## 2026-11-20 续跑（M2 补齐 → M6）

- M2 ✅ primer 三件套 + 双入口；probe 10/10、self-test 红、primer-links 17/17。
- M3 ✅ 0001 冻结（五表，无判读列）；G3 自动签认。
- M4 ✅ 快照 250 条（相关 61）；manifest=jsonl=sqlite；失败/未配置通道如实记账。
- M5 ✅ 服务层/写入闭环/四段试验/public；check 0 · test 19/19 · audit 40/40 · 探针 13/13；V1 自动签认。
- M6 ✅ 0.2.0-rc.2 装进 Desktop profile web（bundle 84）；安装副本探针 13/13；V2 自动签认；V3 待用户重启。
- M7/M8 草稿冻结（docs/release-draft/），未发布未提 PR。
- M9 回流：starter L140–L143 + check-relevance-single-source（工作树，待并发代理提交）。
- 下一步：用户重启 Desktop 后 V3 走查；授权后 M7/M8。

## 下一步

- M3：等待用户明确确认 M2 的 hash 和功能范围；确认后冻结 schema。
- 后续：确认后 M3 冻结 schema；M4 公开临床资料/纯合成数据；M5 服务层/面板契约；M6 pack/profile 检查；M7/M8 仅草稿；M9 五项门禁和两条实场景用例。

## 阻塞 / 未验证

- 项目仓库首次 push 已成功（M0，`8564128`）。
- 患者研究、临床审阅责任人和范围草案均待决定；按用户要求不阻断开发，M7 发布草稿前须确认范围。
- DSH Desktop 实机安装、退出重开、点击走查未验证。
- 人工决定类阻塞：等待用户确认 `prototypes/v0.2/index.html` SHA-256 `de7d003113296fb248326e2dcf4472bc00f6ed012b6b51a136a3c5f0bc5c3956` 是否作为 M3 数据合同与生产实现基线；如需调整请指出求助/跳过/场景/摘要/Agent面板的范围变化。
