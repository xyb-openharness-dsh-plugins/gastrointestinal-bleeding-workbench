/* 消化道出血工作台（CX-001）· 初始数据模型（0001，冻结后只增不改）
 *
 * 设计口径（与家族非肿瘤线同源，移植自 traps-workbench 0.2.1 结构，只改病种语义）：
 *   ① 用户真实数据与合成 demo 同表不同行：subjects.is_demo 区分；demo 永不覆盖用户档案；
 *   ② 未知就是 NULL：年龄、性别、诊断确认没填就不写默认值，检索/匹配按「待确认」处理；
 *   ③ 记录本体按原型同一形状存 JSON（subject_records），派生指标/符合度不入库——
 *      符合度只在请求时计算并返回，避免变成"判定列"；
 *   ④ 试验收藏只存登记元信息与收藏时间，零副作用；
 *   ⑤ app_setting 存用户选过的资料目录，重开 Desktop 时优先于 cordis 默认值。
 *
 * 本病种独有条目：
 *   - 出血表现枚举口径为「呕血 / 咖啡渣样呕吐 / 黑便 / 血便或便血 / 头晕或晕厥 / 无明显表现」，
 *     与 public/host-bridge.js 建档 chips 同一来源；TEXT JSON 原样存，不做枚举约束。
 *   - 抗栓药口径：「抗凝药 / 抗血小板药 / 非甾体抗炎药（NSAIDs）/ 其他 / 未用药 / 不清楚」。
 *     只记录用户原话，不做用药判断，也不生成处置建议。
 *   - 无肿瘤分期/线序语义；非肿瘤固定出口沿用「按受累器官与病情轻重排列」口径（SPEC 已注明）。
 *
 * 迁移只增不改：要加结构只能新增 0002_*.sql。
 */

/* ---------- 患者档案 ---------- */

CREATE TABLE subjects (
  profile_key   TEXT PRIMARY KEY,           -- demo 用 a/b；真实档案用 local-<时间戳>
  name          TEXT NOT NULL,
  meta          TEXT,                       -- 第二行说明（就诊阶段 / 记录量，可为空）
  is_demo       INTEGER NOT NULL DEFAULT 0, -- 1 = 合成示例；新建档案恒为 0
  created_on    TEXT NOT NULL
);

/* 记录集合：一行 = 一个档案的完整记录数组（与原型 state.records 同形状）。
 * 八类记录：bleed 出血观察 / lab 化验 / treatment 治疗用药 / question 要问医生 /
 *          hospital 就诊住院 / report 检查报告 / doc 资料 / mind 感受。
 * 这里只负责"用户写的东西真的落盘"，派生值仍由前端读时计算。 */
CREATE TABLE subject_records (
  profile_key   TEXT PRIMARY KEY REFERENCES subjects(profile_key) ON DELETE CASCADE,
  records_json  TEXT NOT NULL DEFAULT '[]',
  updated_at    TEXT NOT NULL
);

/* ---------- 临床试验匹配用的基础档案 ----------
 * 只有用户在这里明确填写的字段参与匹配；NULL = 待确认，不按阴性/符合计。
 * 靶点/药物机制不进这张表（35 号 §七.2：药物靶点不是"我查出什么"）。
 */
CREATE TABLE trial_profile (
  profile_key        TEXT PRIMARY KEY REFERENCES subjects(profile_key) ON DELETE CASCADE,
  age                INTEGER,
  sex                TEXT,                 -- female / male / NULL
  diagnosis_confirmed INTEGER,             -- 1 / 0 / NULL（医生是否明确说过"消化道出血"）
  bleeding_signs_json TEXT,                -- JSON 数组：呕血/咖啡渣样呕吐/黑便/血便或便血/头晕或晕厥/无明显表现
  antithrombotic_json TEXT,                -- JSON 数组：抗凝药/抗血小板药/NSAIDs/其他/未用药/不清楚
  pregnant           TEXT,                 -- yes / no / NULL（未填即未知）
  note               TEXT,
  updated_at         TEXT NOT NULL
);

/* ---------- 临床试验收藏（saved_trial） ---------- */

CREATE TABLE saved_trial (
  profile_key   TEXT NOT NULL,
  record_id     TEXT NOT NULL,              -- 登记号（NCT/ChiCTR/CTR/…）
  title         TEXT,
  study_type    TEXT,
  status        TEXT,
  phase         TEXT,
  source_url    TEXT,
  snapshot_date TEXT,
  saved_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (profile_key, record_id)
);

/* ---------- 设置 ---------- */

CREATE TABLE app_setting (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT
);
