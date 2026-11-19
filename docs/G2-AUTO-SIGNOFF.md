# G2 原型与交互 · 自动签认（待晨审追认）

- 闸口：G2（原型与交互合同）
- 日期时间：2026-11-20 07:0x（本地）
- commit：见同提交（本次为 primer 三件套接线与探针修复）
- 逐条结果与证据：
  - probe-disease-primer --url http://127.0.0.1:8126/prototypes/v0.2/index.html → 10/10 通过（P1–P9 + E0；双入口=顶栏「?」+ 首页概要卡）
  - probe-disease-primer --self-test → exit 2（红，反向对照有效）
  - check-primer-links → 17/17 通过（0 失败）
  - 遗留：M2 原型仅覆盖「求助与记录/交接摘要/疾病概要」首屏线（CX-001 并发症试点定位）；一图秀、指标卡、治疗折叠卡、两套完整档案为后续里程碑范围，未实现即记未实现
- 未达标项：npm run check 链在 check-data-dir 闸门为红（M5 范围：pickDirectory、拒绝清单、config.root 落点未接）——如实保留，不回退
- 返工轮次：1 轮（P1 aria-label / P8 evidence 来源 / E0 favicon / L2·L7·L12·L13 契约词，全部修复并复测）
- 结论：自动签认通过（待晨审追认）——本签认不表示用户已确认原型；M2 hash 以 PROTOTYPE-REVIEW 记录为准
