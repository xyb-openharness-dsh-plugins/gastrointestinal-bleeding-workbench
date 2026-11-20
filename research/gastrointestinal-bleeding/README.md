# 消化道出血 · 2026 临床试验快照（M4）

- 采集日期：2026-11-20（snapshotDate）
- 工具：unified-trial-mcp（MCP stdio，`search_trials` / `get_trial_detail` / `get_source_status`）
- 检索词（6 组，逐组终态见 manifest.perQuery 与 sqlite `source_statuses`）：
  `gastrointestinal bleeding` / `upper gastrointestinal bleeding` / `peptic ulcer bleeding` / `消化道出血` / `上消化道出血` / `消化性溃疡出血`
- 文件：
  - `manifest.json`（计数、哈希、逐通道终态、相关规则、详情补全记账）
  - `trials-2026.jsonl`（一行一条，recordId 唯一）
  - `gastrointestinal_bleeding_trials_2026.sqlite`（表 `trials` / `source_states` / `source_statuses` / `query_log`）
- 计数（三处一致，check-trial-snapshot 对账）：manifest.recordCount = jsonl 行数 = sqlite trials 行数 = **250**
- 相关条数：**61**（标题命中 `lib/relevance.js` 规则；只按标题，不做全文判读）
- 通道终态（本次实跑）：
  | 通道 | 终态 | 说明 |
  | --- | --- | --- |
  | ctv（Veeva） | ready | 有命中 |
  | ictrp（WHO ICTRP） | truncated | 部分查询超时/失败；有命中（112 条） |
  | xyb_chinadrugtrials_archive | ready | 离线数据包只覆盖胰腺癌，本病相关 0；NO_RESULTS 只代表包内无命中 |
  | chinadrugtrials | failed（DENIED） | 会话 Cookie 失效/未配置，**不算查过** |
  | chictr_online | failed | 本次通道失败，**不算查过** |
  | chictr_pancreatic_archive | unconfigured（PATH_MISSING） | 离线语料未配置，**不算查过** |
- 口径：
  - 登记 ≠ 有效 ≠ 安全 ≠ 可入组；状态一律「登记状态，未核实」。
  - 只合并同一登记号；标题/机构/日期相似不合并。
  - 0 条结果必须带该来源自己的覆盖声明；「相关 0」不等于「没有研究」。
  - 详情补全只对相关记录做；失败字段留 NULL，不猜。
