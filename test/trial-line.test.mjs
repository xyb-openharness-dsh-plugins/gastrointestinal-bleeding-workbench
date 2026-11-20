/* 试验线纯函数三例 + 服务层计数/声明（ONESHOT §1.4 #19）：
 *   ① 相关登记 + 可对照项 ≥2 → 有百分数、档位为「字段都对得上」
 *   ② 不相关登记 → 无诊断判据、无百分数（pct null）
 *   ③ 可对照 <2 → 不给百分数
 *   ④ Workbench.trialSearch().candidatePool.loaded === manifest.recordCount；honestyNote 三段齐全
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { matchTrial, createTrialService } from '../dsh/trial-match.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = () => JSON.parse(readFileSync(join(ROOT, 'research', 'gastrointestinal-bleeding', 'manifest.json'), 'utf8'))

function trial(over = {}) {
  return Object.assign({
    record_id: 'ctv:TEST1',
    title: 'Endoscopic therapy for peptic ulcer bleeding: a randomized trial',
    study_type: 'INTERVENTIONAL',
    conditions: JSON.stringify(['Peptic ulcer', 'Gastrointestinal bleeding']),
    phase: 'Phase 3',
    recruitment_status: 'Recruiting',
    status_note: '登记状态，未核实',
    sponsors: JSON.stringify(['Test Hospital']),
    countries: JSON.stringify(['China']),
    source_id: 'ctv',
    registry_numbers: null,
    source_url: 'https://example.org/t',
    snapshot_date: '2026-11-20',
    min_age: 18,
    max_age: 75,
    gender: 'Both',
  }, over)
}

test('① 相关登记 + 两项可对照 → pct 有值且档位正确', () => {
  const out = matchTrial(trial(), { age: 60, sex: 'male', diagnosisConfirmed: true, bleedingSigns: ['黑便'], antithrombotic: [] })
  assert.ok(out.criteria.some((c) => c.id === 'diagnosis' && c.state === 'match'))
  assert.ok(out.criteria.some((c) => c.id === 'age' && c.state === 'match'))
  assert.equal(out.denominator >= 2, true)
  assert.equal(out.pct, 100)
  assert.equal(out.band, '部分对得上') /* 入排原文/部位线索仍为待确认 → 不能算「字段都对得上」 */
  assert.ok(!out.hardExcluded)
  assert.match(out.declaration, /不是入组资格/)
})

test('② 不相关登记 → 无诊断判据、无百分数（不冒充候选）', () => {
  const out = matchTrial(trial({ title: 'Early intervention in chronic lymphocytic leukemia', conditions: '[]' }), { age: 60, sex: 'male', diagnosisConfirmed: true })
  assert.ok(!out.criteria.some((c) => c.id === 'diagnosis'))
  assert.equal(out.pct, null)
  assert.equal(out.band, '需补充信息')
})

test('③ 可对照项 <2 → 不给百分数', () => {
  const out = matchTrial(trial({ min_age: null, max_age: null, gender: null }), { diagnosisConfirmed: true })
  assert.equal(out.denominator, 1)
  assert.equal(out.pct, null)
  assert.equal(out.band, '需补充信息')
  assert.ok(out.criteria.some((c) => c.id === 'eligibility-text' && c.state === 'unknown'))
})

test('④ 服务层计数与 manifest 一致，honestyNote 三段齐全', () => {
  const svc = createTrialService({ packageDir: ROOT, root: ROOT })
  const summary = svc.summary()
  assert.equal(summary.available, true)
  assert.equal(summary.loaded, manifest().recordCount)
  const search = svc.search({ relevantOnly: false, limit: 5 })
  assert.equal(search.candidatePool.loaded, manifest().recordCount)
  assert.equal(search.candidatePool.notFullScan, true)
  const match = svc.match({ diagnosisConfirmed: true }, {})
  assert.match(match.honestyNote, /未核实/)
  assert.match(match.honestyNote, /人工核对/)
  assert.match(match.honestyNote, /过期/)
  assert.ok(match.candidatePool.relevant <= search.candidatePool.loaded)
  assert.ok(match.results.every((r) => r.declaration.includes('不是入组资格')))
})