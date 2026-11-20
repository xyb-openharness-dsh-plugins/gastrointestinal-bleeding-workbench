/**
 * 合成示例档案播种：只建两条 subjects 行，**不复制记录**。
 *
 * 为什么记录仍留在前端 demo-data.js：原型的两套合成档案（A 首次突发记录少 / B 长期随访记录多）
 * 是已评审的演示语料，服务端再存一份就会出现两个事实源。这里只登记"演示档案存在"，
 * 前端按 profile_key=a/b 时继续用自带合成记录；新建的真实档案才走 subject_records。
 *
 * 消化道出血口径（CX-001）：A = 首次突发、信息不全；B = 反复出血、合并抗栓药、多次就诊。
 */

const DEMO = [
  { key: 'a', name: '林先生 · 首次黑便', meta: '合成示例 · 61 岁 · 记录刚起步' },
  { key: 'b', name: '陈女士 · 反复出血随访', meta: '合成示例 · 74 岁 · 胰腺癌术后脾切除' },
]

/** 幂等：已有 a/b 就不动；返回本轮新插入条数。 */
export function seedDemoData(db) {
  let inserted = 0
  const now = new Date().toISOString().slice(0, 10)
  for (const item of DEMO) {
    const exists = db.prepare('SELECT profile_key, is_demo FROM subjects WHERE profile_key = ?').get(item.key)
    if (exists) {
      /* demo 行只同步展示名，不触碰用户档案；已经存在的库也能跟上新版演示文案。 */
      if (Number(exists.is_demo) === 1) db.prepare('UPDATE subjects SET name = ?, meta = ? WHERE profile_key = ? AND is_demo = 1').run(item.name, item.meta, item.key)
      continue
    }
    db.prepare('INSERT INTO subjects (profile_key, name, meta, is_demo, created_on) VALUES (?,?,?,1,?)')
      .run(item.key, item.name, item.meta, now)
    inserted++
  }
  return { inserted, profiles: DEMO.length }
}

/** 库里有几条档案（含 demo）。 */
export function hasDemoData(db) {
  return db.prepare('SELECT COUNT(*) c FROM subjects').get().c > 0
}
