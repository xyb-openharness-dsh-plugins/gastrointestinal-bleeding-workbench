/**
 * 临床试验读模型：本地快照检索 + 35 号四段链路中的「匹配」段（消化道出血版）。
 *
 * 红线（docs/35-TRIAL-MATCHING.md）：
 *   - 输出的是**登记字段符合度**，不是入组资格，也不代表疗效；
 *   - 未知项永远「待确认」，按 0 计入分子/分母之外，pct 只偏低不偏高；
 *   - 可对照项不足 2 条不给百分数；
 *   - 药物靶点不进退分母（只作详情里的单列说明）；
 *   - 硬性条件不满足单列一组，不参与「首位」排序；
 *   - 来源/快照日期/登记状态未核实声明逐条固定输出。
 */
import { DatabaseSync } from 'node:sqlite'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { RELEVANT_RE } from '../lib/relevance.js'

const SNAPSHOT_REL = join('research', 'gastrointestinal-bleeding', 'gastrointestinal_bleeding_trials_2026.sqlite')
const MANIFEST_REL = join('research', 'gastrointestinal-bleeding', 'manifest.json')

/* 出血部位线索词：只用于「上/下消化道」这条判据，不等于入排条件。
   原文没有的部位不猜；排除段自动反转在 35 号 §七.4 是反例，这里不做。 */
const SITE_RULES = [
  { key: 'upper', label: '出血部位（上消化道）', re: /upper\s+gastrointestinal|upper\s+gi\b|peptic\s+ulcer|gastric\s+ulcer|duodenal\s+ulcer|esophag|上消化道|胃溃疡|十二指肠|食管|呕血/i, signs: ['呕血', '咖啡渣样呕吐', '黑便'] },
  { key: 'lower', label: '出血部位（下消化道）', re: /lower\s+gastrointestinal|lower\s+gi\b|colonic|colon|rectal|diverticular|下消化道|结肠|直肠|憩室|血便|便血/i, signs: ['血便或便血'] },
]

/* 抗栓药线索：排除段常见「抗凝/抗血小板用药」。快照没有入排原文时不触发。 */
const ANTITHROMBOTIC_RULES = [
  { label: '抗凝药（华法林/DOAC 等）', re: /anticoagul|warfarin|apixaban|rivaroxaban|dabigatran|edoxaban|华法林|抗凝/i, signs: ['抗凝药'] },
  { label: '抗血小板药（阿司匹林/氯吡格雷等）', re: /antiplatelet|aspirin|clopidogrel|ticagrelor|阿司匹林|氯吡格雷|抗血小板/i, signs: ['抗血小板药'] },
  { label: '非甾体抗炎药（NSAIDs）', re: /nsaid|ibuprofen|naproxen|diclofenac|非甾体|布洛芬|双氯芬酸/i, signs: ['非甾体抗炎药（NSAIDs）'] },
]

/* 药物靶点/机制词：只用于详情单列，不进匹配分母（35 号 §七.2）。 */
const TARGET_RE = /pantoprazole|rabeprazole|omeprazole|esomeprazole|PPI|质子泵|tranexamic|terlipressin|octreotide|somatostatin|embolization|endoscop|靶点|机制/i

function norm(value) { return String(value ?? '').replace(/\s+/g, ' ').trim() }
function parseJson(raw) {
  if (Array.isArray(raw)) return raw
  try { return raw ? JSON.parse(raw) : [] } catch { return [] }
}
function has(text, re) { return re.test(String(text || '')) }

function parseAge(text) {
  const m = String(text || '').match(/(\d+(?:\.\d+)?)/)
  return m ? Number(m[1]) : null
}

function quoteAround(text, re, max = 160) {
  const m = re.exec(text)
  if (!m) return ''
  let start = Math.max(0, m.index - 60)
  if (start > 0) { const space = text.indexOf(' ', start); if (space >= 0 && space < m.index) start = space + 1 }
  let end = Math.min(text.length, start + max)
  if (end < text.length) { const space = text.lastIndexOf(' ', end); if (space > start + 40) end = space }
  return (start > 0 ? '…' : '') + norm(text.slice(start, end)) + (end < text.length ? '…' : '')
}

function criterion({ id, label, category, state, hard = false, record, requirement, evidence = '', needsReview = false }) {
  return { id, label, category, state, hard, record, requirement, evidence, needsReview }
}

/**
 * 生成匹配结果。profile 为 dsh/workbench.js 的 getTrialProfile 形状；null/空档案时
 * 所有项都是「待确认」，不产出分数。
 */
export function matchTrial(trial, profile) {
  const p = profile || {}
  const signs = Array.isArray(p.bleedingSigns) ? p.bleedingSigns : []
  const antithrombotic = Array.isArray(p.antithrombotic) ? p.antithrombotic : []
  const conditions = parseJson(trial.conditions).join(' / ')
  const topicText = [(trial.title || ''), conditions].join(' ')
  const criteria = []

  /* ① 诊断/主题（硬性）：登记标题或适应症命中消化道出血/消化性溃疡出血。
   * 非相关记录不产出判据（由 match() 预过滤，池外记录不进入匹配）。 */
  if (RELEVANT_RE.test(topicText)) {
    const state = p.diagnosisConfirmed === true ? 'match' : p.diagnosisConfirmed === false ? 'mismatch' : 'unknown'
    criteria.push(criterion({
      id: 'diagnosis', label: '诊断（消化道出血）', category: '诊断', state, hard: true,
      record: p.diagnosisConfirmed === true ? '医生已明确说过' : p.diagnosisConfirmed === false ? '未确诊/未明确' : '未登记',
      requirement: '登记主题为消化道出血 / 消化性溃疡出血相关研究',
      evidence: quoteAround(topicText, RELEVANT_RE),
    }))
  }

  /* ② 年龄（硬性，来自详情字段 inclusion_age_min/max；缺失不判） */
  const minAge = trial.min_age === null || trial.min_age === undefined ? null : Number(trial.min_age)
  const maxAge = trial.max_age === null || trial.max_age === undefined ? null : Number(trial.max_age)
  if (Number.isFinite(minAge) || Number.isFinite(maxAge)) {
    const age = Number.isFinite(p.age) && p.age !== null ? Number(p.age) : null
    const ok = age !== null && (minAge === null || age >= minAge) && (maxAge === null || age <= maxAge)
    criteria.push(criterion({
      id: 'age', label: '年龄', category: '年龄', hard: true,
      state: age === null ? 'unknown' : ok ? 'match' : 'mismatch',
      record: age === null ? '未登记' : `${age} 岁`,
      requirement: `${Number.isFinite(minAge) ? `${minAge} 岁及以上` : '不限下限'}${Number.isFinite(maxAge) ? ` · ${maxAge} 岁及以下` : ''}`,
      evidence: '',
    }))
  }

  /* ③ 性别（硬性，详情 inclusion_gender；Both 不产出判据） */
  const gender = String(trial.gender || '').toUpperCase()
  if (gender === 'MALE' || gender === 'FEMALE' || /^(仅)?(男|女)/.test(String(trial.gender || ''))) {
    const wanted = gender === 'MALE' || /男/.test(String(trial.gender)) ? 'male' : 'female'
    criteria.push(criterion({
      id: 'sex', label: '性别', category: '性别', hard: true,
      state: p.sex == null ? 'unknown' : p.sex === wanted ? 'match' : 'mismatch',
      record: p.sex == null ? '未登记' : p.sex === 'female' ? '女' : '男',
      requirement: wanted === 'male' ? '仅男性' : '仅女性',
      evidence: '',
    }))
  }

  /* ④ 妊娠/哺乳（只在文本提到时判；本人妊娠/哺乳 → 硬性不满足） */
  if (has(topicText, /pregnan|nursing|breast[-\s]?feeding|妊娠|怀孕|哺乳/i)) {
    const pregnantKnown = p.pregnant === 'yes' || p.pregnant === 'no'
    criteria.push(criterion({
      id: 'pregnancy', label: '妊娠/哺乳（排除条件）', category: '妊娠', hard: true,
      state: !pregnantKnown ? 'unknown' : p.pregnant === 'yes' ? 'mismatch' : 'match',
      record: p.pregnant === 'yes' ? '妊娠/哺乳中' : p.pregnant === 'no' ? '否' : '未登记',
      requirement: '排除妊娠或哺乳期',
      evidence: quoteAround(topicText, /pregnan|nursing|breast|妊娠|怀孕|哺乳/i),
    }))
  }

  /* ⑤ 出血部位（文本提到才判）。命中只作线索：档案已记录对应表现 → 符合；
   * 未记录 → 待确认；「只记录了下消化道表现」不自动判不符合（上消化道大量出血也可便血）。 */
  let siteCriteria = 0
  for (const rule of SITE_RULES) {
    if (siteCriteria >= 1) break
    if (!has(topicText, rule.re)) continue
    const recorded = signs.some((s) => rule.signs.some((want) => String(s).includes(want) || want.includes(String(s))))
    criteria.push(criterion({
      id: 'site-' + rule.key, label: rule.label, category: '出血表现',
      state: recorded ? 'match' : 'unknown', hard: false,
      record: recorded ? '档案已记录对应表现' : '档案未记录对应表现',
      requirement: rule.key === 'upper' ? '研究主题涉及上消化道 / 溃疡出血' : '研究主题涉及下消化道 / 结肠出血',
      evidence: quoteAround(topicText, rule.re),
    }))
    siteCriteria++
  }

  /* ⑥ 抗栓药（文本提到才判）。排除段常带限定语（洗脱期/单药），不自动反转。 */
  let medCriteria = 0
  for (const rule of ANTITHROMBOTIC_RULES) {
    if (medCriteria >= 1) break
    if (!has(topicText, rule.re)) continue
    const recorded = antithrombotic.some((s) => rule.signs.some((want) => String(s).includes(want) || want.includes(String(s))))
    criteria.push(criterion({
      id: 'med-' + medCriteria, label: rule.label, category: '用药史',
      state: recorded ? 'match' : 'unknown', hard: false,
      record: recorded ? '档案记录：' + antithrombotic.join(' / ').slice(0, 60) : '档案未记录',
      requirement: '研究主题提到该类药物；具体入排需核对原文',
      evidence: quoteAround(topicText, rule.re),
    }))
    medCriteria++
  }

  /* ⑦ 入排原文可用性：快照没有入排原文就不假装判过。 */
  criteria.push(criterion({
    id: 'eligibility-text', label: '入排标准原文', category: '来源', state: 'unknown', hard: false,
    record: '本机快照没有入排原文',
    requirement: '请到官方登记页核对入排标准',
    evidence: '本机快照只存登记结构字段与详情摘要，入排标准以官方登记页为准。',
  }))

  const matched = criteria.filter((c) => c.state === 'match').length
  const mismatched = criteria.filter((c) => c.state === 'mismatch').length
  const unknown = criteria.filter((c) => c.state === 'unknown').length
  const denominator = matched + mismatched
  const hardExcluded = criteria.some((c) => c.state === 'mismatch' && c.hard)
  /* 可对照项不足 2 条不给百分数：1/1=100% 读起来就是结论（35 号 §七.3）。 */
  const pct = denominator >= 2 ? Math.round((matched / denominator) * 100) : null
  const band = hardExcluded ? '硬性条件不满足'
    : pct === null ? '需补充信息'
      : mismatched === 0 && unknown === 0 ? '字段都对得上'
        : '部分对得上'

  return {
    recordId: trial.record_id,
    title: trial.title,
    studyType: trial.study_type,
    phase: trial.phase || null,
    status: trial.recruitment_status || null,
    statusNote: trial.status_note || '登记状态，未核实',
    lastUpdate: trial.retrieved_at || null,
    leadSponsor: parseJson(trial.sponsors).join(' / ') || null,
    countries: parseJson(trial.countries),
    conditions,
    sourceId: trial.source_id || null,
    registryNumbers: parseJson(trial.registry_numbers),
    sourceUrl: trial.source_url,
    snapshotDate: trial.snapshot_date,
    isRegistry: String(trial.study_type || '').toUpperCase() === 'OBSERVATIONAL',
    pct, matched, mismatched, unknown, denominator, band, hardExcluded,
    criteria,
    targetNote: TARGET_RE.test(trial.title || '') ? '登记里出现的药物/操作词只说明研究在做什么，不等于适合你。' : '',
    declaration: '这是登记字段符合度，不是入组资格，也不代表效果；登记状态未核实，以官方登记页为准。',
  }
}

export function createTrialService({ packageDir, root }) {
  let cache = null
  let cacheMtime = 0

  function snapshotPath() {
    const candidates = [join(packageDir, SNAPSHOT_REL), join(root, '..', SNAPSHOT_REL)]
    for (const p of candidates) if (existsSync(p)) return p
    return null
  }

  function manifest() {
    const p = snapshotPath()
    if (!p) return null
    try { return JSON.parse(readFileSync(join(dirname(p), 'manifest.json'), 'utf8')) } catch { return null }
  }

  function loadRows() {
    const path = snapshotPath()
    if (!path) return null
    let st
    try { st = statSync(path) } catch { return null }
    if (cache && cacheMtime === st.mtimeMs) return cache
    const db = new DatabaseSync(path, { readOnly: true })
    try {
      cache = db.prepare('SELECT * FROM trials ORDER BY rowid').all()
      cacheMtime = st.mtimeMs
    } finally { try { db.close() } catch { /* 只读库 */ } }
    return cache
  }

  function summary() {
    const rows = loadRows()
    const mf = manifest()
    if (!rows) return { available: false, reason: 'research/gastrointestinal-bleeding 试验快照不可用（未采集或未随包发出）', loaded: 0 }
    const states = Array.isArray(mf?.sourceStates) ? mf.sourceStates : []
    const relevant = rows.filter((r) => RELEVANT_RE.test(String(r.title ?? ''))).length
    return {
      available: true,
      loaded: rows.length,
      snapshotDate: mf?.snapshotDate || rows.find((r) => r.snapshot_date)?.snapshot_date || null,
      relevantCount: mf?.relevantCount ?? relevant,
      relevantRule: mf?.relevantRule || null,
      fetchedAt: mf?.snapshotDate || null,
      tool: mf?.tool || null,
      sourceStates: states.map((s) => ({ sourceId: s.source_id, state: s.state, queried: s.queried })),
      queriedSources: states.filter((s) => s.state === 'ready').map((s) => s.source_id),
      note: '多来源快照（见 sourceStates 逐通道终态）；登记状态未核实，不代表完整检索；登记状态不等于招募或入组资格。',
      totalCount: mf?.recordCount ?? rows.length,
      included: mf?.relevantCount ?? relevant,
    }
  }

  function search({ keyword = '', status = '', studyType = '', relevantOnly = false, limit = 50 } = {}) {
    const rows = loadRows()
    if (!rows) return { available: false, reason: summary().reason, records: [] }
    const kw = norm(keyword).toLowerCase()
    const st = norm(status).toUpperCase()
    const type = norm(studyType).toUpperCase()
    const matched = rows.filter((r) => {
      if (relevantOnly && !RELEVANT_RE.test(String(r.title ?? ''))) return false
      if (st && String(r.recruitment_status || '').toUpperCase() !== st) return false
      if (type && String(r.study_type || '').toUpperCase() !== type) return false
      if (!kw) return true
      const hay = [r.record_id, r.title, r.sponsors, r.countries, r.recruitment_status, r.conditions]
        .join(' ').toLowerCase()
      return hay.includes(kw)
    })
    const cap = Math.min(Math.max(Number(limit) || 50, 1), 200)
    const records = matched.slice(0, cap).map((r) => ({
      recordId: r.record_id,
      title: r.title,
      studyType: r.study_type,
      phase: r.phase || null,
      status: r.recruitment_status || null,
      statusNote: r.status_note || '登记状态，未核实',
      leadSponsor: parseJson(r.sponsors).join(' / ') || null,
      countries: parseJson(r.countries),
      conditions: parseJson(r.conditions).join(' / ') || null,
      sourceId: r.source_id || null,
      sourceUrl: r.source_url,
      snapshotDate: r.snapshot_date,
      relevant: RELEVANT_RE.test(String(r.title ?? '')),
      isRegistry: String(r.study_type || '').toUpperCase() === 'OBSERVATIONAL',
    }))
    const statuses = [...new Set(rows.map((r) => r.recruitment_status).filter(Boolean))].sort()
    const studyTypes = [...new Set(rows.map((r) => r.study_type).filter(Boolean))].sort()
    const s = summary()
    return {
      available: true,
      snapshotDate: s.snapshotDate,
      relevantCount: s.relevantCount,
      relevantRule: s.relevantRule,
      sourceStates: s.sourceStates,
      total: records.length,
      candidatePool: { loaded: rows.length, matched: matched.length, returned: records.length, limit: cap, notFullScan: true, statuses, studyTypes },
      records,
      declaration: '候选池是本地快照，不是全库扫描；登记状态未核实，不代表招募或入组资格。',
      honestyNote: '登记≠有效≠安全≠可入组；本机快照未核实、需人工核对官方登记页；快照会过期（以官方最新版本为准）。',
    }
  }

  function match(profile, query = {}) {
    const rows = loadRows()
    if (!rows) return { available: false, reason: summary().reason, results: [] }
    const kw = norm(query.keyword).toLowerCase()
    const pool = rows.filter((r) => RELEVANT_RE.test(String(r.title ?? '')))
    const filtered = pool.filter((r) => {
      if (!kw) return true
      return [r.record_id, r.title, r.sponsors, r.countries, r.recruitment_status, r.conditions]
        .join(' ').toLowerCase().includes(kw)
    })
    const results = filtered.map((r) => matchTrial(r, profile))
    results.sort((a, b) => {
      if (a.hardExcluded !== b.hardExcluded) return a.hardExcluded ? 1 : -1
      if (a.pct !== null && b.pct !== null && a.pct !== b.pct) return b.pct - a.pct
      if (a.pct !== null && b.pct === null) return -1
      if (a.pct === null && b.pct !== null) return 1
      if (a.criteria.length !== b.criteria.length) return b.criteria.length - a.criteria.length
      return a.unknown - b.unknown
    })
    const distribution = results.reduce((acc, r) => { acc[r.band] = (acc[r.band] || 0) + 1; return acc }, {})
    const profileFilled = Boolean(profile && (
      profile.age != null || profile.sex != null || profile.diagnosisConfirmed != null ||
      (profile.bleedingSigns && profile.bleedingSigns.length) ||
      (profile.antithrombotic && profile.antithrombotic.length) || profile.pregnant != null
    ))
    const s = summary()
    return {
      available: true,
      snapshotDate: s.snapshotDate,
      relevantCount: s.relevantCount,
      relevantRule: s.relevantRule,
      sourceStates: s.sourceStates,
      profileFilled,
      candidatePool: { loaded: rows.length, relevant: pool.length, matched: filtered.length, returned: results.length, notFullScan: true },
      distribution,
      results,
      declaration: '结果只是候选线索：百分数是登记字段符合度，不是入组资格，也不代表效果。判定归医生与研究中心；登记状态未核实，以官方登记页为准。',
      honestyNote: '登记字段来自本地快照，未核实、需人工核对官方登记页；快照会过期；缺失字段一律标待确认，不做阴性推断。',
    }
  }

  return { summary, search, match, snapshotPath }
}