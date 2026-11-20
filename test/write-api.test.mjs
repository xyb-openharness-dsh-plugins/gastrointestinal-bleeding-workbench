/* 写入闭环测试（ONESHOT §2.3 四组）：
 *   ① 共存：demo a/b + 自建 = 3 条，demo 带 is_demo
 *   ② 八类记录写库与同形回读（kind 保留、私密位往返）
 *   ③ 私密寻址：按 id 切换私密后写入、回读仍为 true；导出过滤由前端 summaryText 排除（此处断言数据层保留 private）
 *   ④ 错误路径：空名、未知 kind、未知档案都给出可读错误，不裸崩
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Workbench, RECORD_KINDS } from '../dsh/workbench.js'

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'gi-wb-'))
  const wb = new Workbench({ root: dir })
  wb.open()
  return { dir, wb }
}

test('① demo 与自建档案共存，demo 有 is_demo 标记', () => {
  const { dir, wb } = sandbox()
  try {
    const before = wb.listProfiles()
    assert.equal(before.filter((p) => p.isDemo).length, 2)
    const created = wb.createSubject({ name: '我的记录', meta: '测试' })
    const after = wb.listProfiles()
    assert.equal(after.length, 3)
    const real = after.find((p) => p.profileKey === created.profileKey)
    assert.equal(real.isDemo, false)
    assert.match(real.profileKey, /^local-/)
    assert.throws(() => wb.deleteSubject('a'), /演示档案不删除/)
  } finally { wb.close(); rmSync(dir, { recursive: true, force: true }) }
})

test('② 八类记录写库与同形回读', () => {
  const { dir, wb } = sandbox()
  try {
    const { profileKey } = wb.createSubject({ name: '八类' })
    const samples = {
      bleed: { observed: ['黑便'], note: '颜色很深' },
      lab: { item: '血红蛋白', value: '92', unit: 'g/L' },
      treatment: { name: '静脉补液' },
      question: { text: '下次复查要注意什么' },
      hospital: { place: '合成医院', reason: '黑便' },
      report: { name: '胃镜报告' },
      doc: { name: '出院小结' },
      mind: { text: '有点紧张', private: true },
    }
    for (const kind of RECORD_KINDS) {
      const res = wb.addEntry(profileKey, kind, Object.assign({ date: '2026-11-18' }, samples[kind]))
      assert.ok(res.id, kind + ' 应返回 id')
    }
    const read = wb.getRecords(profileKey)
    assert.equal(read.records.length, 8)
    for (const kind of RECORD_KINDS) {
      const row = read.records.find((r) => r.kind === kind)
      assert.ok(row, '缺 ' + kind)
      for (const [k, v] of Object.entries(samples[kind])) assert.deepEqual(row[k], v, `${kind}.${k} 往返不一致`)
    }
    const mind = read.records.find((r) => r.kind === 'mind')
    assert.equal(mind.private, true)
  } finally { wb.close(); rmSync(dir, { recursive: true, force: true }) }
})

test('③ 私密切换按 id 寻址并落库（回读仍为 true）', () => {
  const { dir, wb } = sandbox()
  try {
    const { profileKey } = wb.createSubject({ name: '私密' })
    const { id } = wb.addEntry(profileKey, 'mind', { text: '只给自己看' })
    const records = wb.getRecords(profileKey).records.map((r) => (r.id === id ? Object.assign({}, r, { private: true }) : r))
    wb.saveRecords(profileKey, records)
    const again = wb.getRecords(profileKey).records.find((r) => r.id === id)
    assert.equal(again.private, true)
    const back = wb.getRecords(profileKey).records.map((r) => (r.id === id ? Object.assign({}, r, { private: false }) : r))
    wb.saveRecords(profileKey, back)
    assert.equal(wb.getRecords(profileKey).records.find((r) => r.id === id).private, false)
  } finally { wb.close(); rmSync(dir, { recursive: true, force: true }) }
})

test('④ 错误路径可读且不留半条记录', () => {
  const { dir, wb } = sandbox()
  try {
    assert.throws(() => wb.createSubject({ name: '   ' }), /档案名/)
    assert.throws(() => wb.createSubject({ name: 'x'.repeat(41) }), /太长/)
    const { profileKey } = wb.createSubject({ name: '错误路径' })
    assert.throws(() => wb.addEntry(profileKey, 'unknown-kind', {}), /八类/)
    assert.throws(() => wb.saveRecords(profileKey, 'not-an-array'), /数组/)
    assert.throws(() => wb.addEntry('nope', 'bleed', {}), /档案不存在/)
    assert.equal(wb.getRecords(profileKey).records.length, 0)
  } finally { wb.close(); rmSync(dir, { recursive: true, force: true }) }
})