# 里程碑证据表（MILESTONE-EVIDENCE）

> 每个里程碑登记实际交付物、命令原文/关键输出/退出码、未验证项。未取得的证据明确写出，不推断。

| 里程碑 | 交付物（文件/提交号） | 验证命令 | 关键输出（原文摘录：数字/退出码） | 未验证项及原因 |
|---|---|---|---|---|
| M0 | starter 初始化 252 个文件；提交 `8564128eb356455ed5488071a8d5d67def57af4d` | `node /data/home/dev/xyb-workbench-starter/scripts/init.mjs --config /tmp/gib-config.json --target /data/home/dev/gastrointestinal-bleeding-workbench`；`git push -u origin main` | init 原文 `{"generated":"/data/home/dev/gastrointestinal-bleeding-workbench","files":252,"layout":"business-first"}`；init 退出码 0；push 原文 `* [new branch] main -> main`；push 退出码 0 | npm 检查尚未运行；DSH Desktop 实机未验证 |
| M1 | `docs/USER-RESEARCH.md`, `SCENARIOS.md`, `HVT-REVIEW.md`, `G1-AUTO-SIGNOFF.md`, `SPEC.md`, `28-INTERACTION-PATH-DESIGN.md`, design records；提交 `eaca9f1` | `web.search/open` (sources linked in USER-RESEARCH; accessed 2026-11-19); `git diff --check` | Opened official AWMF 2025 PDF, ACG / WSES records, CMA patient education and ACG 2023 LGIB. AWMF PDF text: `Update S2k Guideline Gastrointestinal Bleeding, December 2025`; ESGE 2026 official PDF search result names a 2026 guideline update; `git diff --check` exit 0 | No patient interviews (0); no clinical reviewer (0); no independent high-capacity review; not all guideline originals locally downloaded; G1 explicitly pending morning ratification |
| M2 |  |  |  |  |
| M3 |  |  |  |  |
| M4 |  |  |  |  |
| M5 |  |  |  |  |
| M6 |  |  |  |  |
| M7 |  |  |  |  |
| M8 |  |  |  |  |
| M9 |  |  |  |  |

## 证据自检

- M0 init 命令已实际运行；其他空白里程碑尚未开始或未取得证据。
- 临床来源需记录来源与访问日期；未取得原件不得声称读过原件。
- DSH Desktop 实机能力目前未验证。
