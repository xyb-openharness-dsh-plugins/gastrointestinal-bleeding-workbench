# 硬约束与可验证证据（2026-11-20）

每条硬约束都要能被命令或截图验证；未验证的写「未验证」，不写通过。

| # | 硬约束 | 验证命令 / 证据 | 状态 |
| --- | --- | --- | --- |
| H1 | 资料目录必须真调宿主选择器（`uiWorkspace.pickDirectory`），拒绝主目录/桌面/下载根/tmp，服务端二次校验 | `node scripts/check-data-dir.mjs .`（4/4）；`lib/client.js` pickDataDir + `dsh/server.js` checkDataDir | 通过（静态）；宿主实机点击未验证（V3） |
| H2 | 新建档案落 sqlite（is_demo=0），demo 不可删、不被覆盖 | `node scripts/check-patient-create.mjs .`；`test/write-api.test.mjs`（共存/八类/私密/错误） | 通过（服务层+HTTP 测试）；Desktop 实机未验证 |
| H3 | 临床试验四段链路（建档/检索/匹配/收藏），匹配 pct=符合÷已对照、<2 不给百分数 | `node scripts/check-trial-chain.mjs .`；`check-trial-matching.mjs .`（self-test 11/11）；`test/trial-line.test.mjs` | 通过 |
| H4 | 快照三处计数一致（manifest=jsonl=sqlite），FAILED 通道不算查过 | `node scripts/check-trial-snapshot.mjs research/gastrointestinal-bleeding` | 通过（250=250=250） |
| H5 | 版本同源（VERSION → package/lib/version.js/页面占位） | `node scripts/build-version.mjs --check`；`node scripts/check-version-literal.mjs` | 通过 |
| H6 | 疾病概要四段 + 双入口 + 返回/关闭双入口 + Esc/返回只退一层 | `node scripts/probe-disease-primer.mjs --url .../prototypes/v0.2/index.html`（10/10）；`check-primer-links.mjs`（17/17） | 通过（原型实测） |
| H7 | AI 面板九条契约（ownsSession / newSession / subscribe / 不重复创建 / 取消提示 / 失败反馈 / 只填不发） | `node scripts/check-agent-pane-contract.mjs .`（exit 0） | 静态通过；实机未验证（V3） |
| H8 | 八类记录走 API 落库（刷新仍在） | `test/http-api.test.mjs` + `test/write-api.test.mjs` | 通过（服务层）；Desktop 实机未验证 |
