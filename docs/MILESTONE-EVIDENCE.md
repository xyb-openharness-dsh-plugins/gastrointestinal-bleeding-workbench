# 里程碑证据表（MILESTONE-EVIDENCE）

> 每个里程碑登记实际交付物、命令原文/关键输出/退出码、未验证项。未取得的证据明确写出，不推断。

| 里程碑 | 交付物（文件/提交号） | 验证命令 | 关键输出（原文摘录：数字/退出码） | 未验证项及原因 |
|---|---|---|---|---|
| M0 | starter 初始化 252 个文件；提交 `8564128eb356455ed5488071a8d5d67def57af4d` | `node /data/home/dev/xyb-workbench-starter/scripts/init.mjs --config /tmp/gib-config.json --target /data/home/dev/gastrointestinal-bleeding-workbench`；`git push -u origin main` | init 原文 `{"generated":"/data/home/dev/gastrointestinal-bleeding-workbench","files":252,"layout":"business-first"}`；init 退出码 0；push 原文 `* [new branch] main -> main`；push 退出码 0 | npm 检查尚未运行；DSH Desktop 实机未验证 |
| M1 | `docs/USER-RESEARCH.md`, `SCENARIOS.md`, `HVT-REVIEW.md`, `G1-AUTO-SIGNOFF.md`, `SPEC.md`, `28-INTERACTION-PATH-DESIGN.md`, design records；提交 `eaca9f1` | `web.search/open` (sources linked in USER-RESEARCH; accessed 2026-11-19); `git diff --check` | Opened official AWMF 2025 PDF, ACG / WSES records, CMA patient education and ACG 2023 LGIB. AWMF PDF text: `Update S2k Guideline Gastrointestinal Bleeding, December 2025`; ESGE 2026 official PDF search result names a 2026 guideline update; `git diff --check` exit 0 | No patient interviews (0); no clinical reviewer (0); no independent high-capacity review; not all guideline originals locally downloaded; G1 explicitly pending morning ratification |
| M2 | `prototypes/v0.2/index.html`, `docs/PROTOTYPE-REVIEW.md`, `AGENT-PANE-DESIGN.md`, screenshots under `docs/evidence/`; implementation commit `47f927d6e8c5e7c74ee4a52b6b111ea30ef82998` | Headed Chromium via `http://127.0.0.1:8765/prototypes/v0.2/index.html` at 913×656; headless screenshots at 1365×900 and 390×844; `git diff --check`; `sha256sum prototypes/v0.2/index.html` | `git diff --check` exit 0. Prototype hash `de7d003113296fb248326e2dcf4472bc00f6ed012b6b51a136a3c5f0bc5c3956`. Screenshots: 1365×900 `743603089f528007cddc9ad41b32b207ff35c771144abc70141061caf90d76a6`; 390×844 `754ebbd2f24922beec51610fbe0d0fea3705027d605b7e9a483fbfde6f80273f`; pane open `d23440b4e89e6a08e7a7cb038b2277094b2f96631bdaeee096a8332e9af1779d`. Actual UI walk-through: caregiver sample loaded and added to summary with source/background/doc fields; Agent mock opened/hidden; tel link showed external-app prompt, then canceled (no call). | User approval of prototype hash/modules not received; M3 schema freeze and production implementation gated by starter HTML-first rule. Real patient/clinical validation, actual phone call, DSH Desktop/newSession/subscribe/splitter behavior not verified |
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

## M3–M6（2026-11-20）

- M3：schema 0001（五表）+ freeze-contract（sha256 a606811c…）；check-schema-words 通过。
- M4：unified-trial-mcp 实跑 6 组检索词；250 条（相关 61）；manifest=jsonl=sqlite；详情补全 55/61（6 超时记账）；四通道终态见 manifest。
- M5：dsh 服务层 + 宿主入口 + public 七件 + src/build 链；test 19/19；check exit 0；conformance 40/40；探针 13/13 + primer 10/10；证据截图 docs/evidence/M5-*.png。
- M6：tgz 25d5377f…；装进 app-owned profile web；bundle 登记 83→84（rc.2 覆盖升级）；安装副本逐字节一致；装机副本探针 13/13 + 10/10；`check-profile.mjs` 本包行 ✓；V3 待用户重启。
