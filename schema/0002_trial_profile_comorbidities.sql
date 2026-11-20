/* 0002：试验基础档案补充两个「医生已告知」的合并症字段（GBS 变量）。
 * 只存用户明确选择的 1/0，NULL = 未登记；不推导、不默认 0。
 * 0001 已冻结，本迁移只增列，不改既有列。
 */
ALTER TABLE trial_profile ADD COLUMN liver_disease INTEGER;
ALTER TABLE trial_profile ADD COLUMN heart_failure INTEGER;
