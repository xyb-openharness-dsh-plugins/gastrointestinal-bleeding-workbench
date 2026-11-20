# 数据合同冻结记录（G3）· 消化道出血工作台 CX-001

- 冻结日期：2026-11-20
- 冻结范围：`schema/0001_initial.sql` 的全部表与列（subjects / subject_records / trial_profile / saved_trial / app_setting）。
- sha256：`a606811caf8b17b56336bf9efc17267743a21afbc68c87adbf996d4c43ce91b8`
- 口径：
  - 判读列零容忍：无 diagnosis / risk_level / grade / staging / line_of_treatment / efficacy / 病期 / 线序 类列（check-schema-words 断言）。
  - 未知即 NULL；demo 与真实档案以 is_demo 区分；派生符合度不入库。
  - 冻结后只增不改：任何结构变更走 0002+，并在此追加新迁移的 sha256。
- 迁移方式：dsh/store.js 按编号顺序执行，schema_migrations 记账；重复执行幂等。

## 0002 增量迁移（2026-11-20）

- 文件：`schema/0002_trial_profile_comorbidities.sql`
- sha256：`ac1247831a9276457857d2e2a3a6ade060cc1d5a6ac887a3b4d28c1c15a8bddb`
- 内容：trial_profile 增加 liver_disease / heart_failure（INTEGER，NULL=未登记），用于评分变量对照；不改 0001。
