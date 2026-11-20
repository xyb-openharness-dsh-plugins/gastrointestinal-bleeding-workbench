# 临床数据库与试验线口径（CLINICAL-DATA）

## 1. 2026 快照实测（2026-11-20）

- 全量记录 **250 条**（manifest = jsonl = sqlite 三处一致，`check-trial-snapshot` 对账通过）。
- 与本病相关 **61 条**（标题命中规则；见 `lib/relevance.js`，fetch 与服务端同一份规则）。
- 逐通道终态（本次实跑，不是推断）：
  - ctv：ready（有命中）
  - ictrp：truncated（部分查询超时/失败，有命中）
  - xyb_chinadrugtrials_archive：ready（离线包只覆盖胰腺癌，本病 0 命中；不代表官网没有）
  - chinadrugtrials：failed（DENIED：会话 Cookie 失效）→ **不算查过**
  - chictr_online：failed → **不算查过**
  - chictr_pancreatic_archive：unconfigured（PATH_MISSING）→ **不算查过**
- 结论口径：候选池 = 250 条已载 / 61 条相关；**不是全库扫描**；快照 2026-11-20。「相关 0」不等于「没有研究」——检索词命中才进池、通道召回有限。

## 2. 四段链路（35 号）

1. **建档**：`trial_profile` 只收已确认字段（年龄 / 性别 / 医生是否明确说过 / 出血表现 / 抗栓药 / 妊娠 / 备注）；不填 = 待确认。
2. **检索**：关键词 + 状态 + 研究类型 + 只看相关；结果列表**不掺分数**；每条标「相关 / ✕ 相关」。
3. **匹配**：`pct = 符合 ÷ 已对照`（待确认按 0 计，不计入分母）；可对照项 < 2 不给百分数；四档：字段都对得上 / 部分对得上 / 需补充信息 / 硬性条件不满足；每条判据给「记录里是 / 条件要求 / 原文线索」。
4. **收藏**：`saved_trial` 只存登记元信息；三态（在跟 / 准备问 / 已归档）只存本机 localStorage；快照无状态时间线，不画进度条；取消收藏零副作用。

## 3. 红线

- 输出只是登记字段符合度，**不是入组资格**，也不代表效果；判定归医生与研究中心。
- 药物/操作词只作详情说明，不进匹配分母。
- 登记状态未核实，以官方登记页为准；快照会过期。
- 检查器：`check-trial-snapshot`、`check-trial-chain`、`check-trial-matching`（均带 `--self-test` 反例）已进 `npm run check`。
