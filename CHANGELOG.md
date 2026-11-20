# 变更记录

## 0.2.0-rc.2（2026-11-20）

- 设置页改为三个分区 tab（资料目录 / 临床数据库 / 隐私）；探针 R7 断言随动。
- 记录类型按钮的数量随档案切换实时刷新（renderRecords → renderKindStrip）。
- 演示档案补 recordedBy/sourceNote（问答记录不再显示「未填」）。

## 0.2.0-rc.1（2026-11-20）

- M3：`schema/0001_initial.sql` 冻结（sha256 a606811caf8b…），五表 + 八类记录 + 试验基础档案；无判读列。
- M4：2026 临床试验快照实跑（unified-trial-mcp）：250 条（相关 61）；manifest = jsonl = sqlite 一致；失败/未配置通道如实入 manifest。
- M5：服务层（store/workbench/server/static/demo/trial-match）+ 宿主入口重写 + public 七件 + src→lib 构建链；四条测试 19 用例；五件门禁与试验匹配检查器进 `npm run check`（exit 0）。
- M2 补齐（本日早些时候）：疾病概要 primer 三件套（本病种数据）+ 顶栏「?」/概要卡双入口；探针 10/10、self-test 红、primer-links 17/17。
- 占位名仍为「消化道出血工作台」，待用户追认。

# 变更记录

## 0.2.0-rc.2（2026-11-20）

- 设置页改为三个分区 tab（资料目录 / 临床数据库 / 隐私）；探针 R7 断言随动。
- 记录类型按钮的数量随档案切换实时刷新（renderRecords → renderKindStrip）。
- 演示档案补 recordedBy/sourceNote（问答记录不再显示「未填」）。

只增不删；每条写清"改了什么 + 为什么 + 用户可见结果"。版本号与 VERSION、package.json 三处必须一致。

## 0.1.0 — 2026-11-19

- 由社区脚手架 dsh-wb-cli@1.10.0-rc.56 (d5f046c) 初始化，仅有注册骨架与健康接口，无业务功能。
