#!/usr/bin/env node
/**
 * enrich-gi-trials-detail.mjs — 给已采集快照的**相关记录**补结构化字段（35 号匹配判据用）。
 *
 * 为什么单列一步：search_trials 只回登记摘要（无年龄/性别/适应症），get_trial_detail 才有
 * inclusion_age_min/max、inclusion_gender、conditionOrDisease、phase。匹配判据要用它们，
 * 但不能对 250 条全量拉详情（非相关记录不进入匹配池）。
 *
 * 口径：
 *   - 只补标题命中相关规则的记录（与 manifest.relevantRule 同一条正则，见 lib/relevance.js）；
 *   - 详情失败/超时的记录字段留 NULL，**不猜**；manifest 记 detailFailures 条数与 recordId；
 *   - 计数不变（recordCount/dbCount 仍须与 JSONL/SQLite 行数一致），只改字段与文件 sha256。
 *
 * 用法：
 *   node scripts/enrich-gi-trials-detail.mjs --dry-run
 *   node scripts/enrich-gi-trials-detail.mjs
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { RELEVANT_RE, RELEVANT_RULE } from '../lib/relevance.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const UTS_CLI = process.env.UNIFIED_TRIAL_CLI ?? join(process.env.HOME ?? '', 'Downloads/unified_search_trials/dist/src/cli/main.js')
const DIR = join(ROOT, 'research', 'gastrointestinal-bleeding')
const DRY = process.argv.includes('--dry-run')

class McpClient {
  constructor() {
    this.nextId = 1; this.pending = new Map(); this.buf = ''
    this.child = spawn(process.execPath, [UTS_CLI, 'serve'], { stdio: ['pipe', 'pipe', 'pipe'] })
    this.child.stdout.setEncoding('utf8')
    this.child.stdout.on('data', (c) => this.#onChunk(c))
    this.child.stderr.setEncoding('utf8')
    this.child.stderr.on('data', () => {})
    this.child.on('error', (e) => process.stderr.write(`[mcp] spawn 失败：${e.message}\n`))
  }
  #onChunk(chunk) {
    this.buf += chunk
    let idx
    while ((idx = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, idx).trim(); this.buf = this.buf.slice(idx + 1)
      if (!line) continue
      try {
        const msg = JSON.parse(line)
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id)
          if (msg.error) reject(new Error(`${msg.error.code} ${msg.error.message}`)); else resolve(msg.result)
        }
      } catch { /* banner 行忽略 */ }
    }
  }
  request(method, params, timeoutMs = 10000) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`MCP timeout: ${method}`)) }, timeoutMs)
      this.pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v) }, reject: (e) => { clearTimeout(timer); reject(e) } })
      this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
    })
  }
  notify(method, params) { this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n') }
  async init() {
    await this.request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'gi-bleeding-enrich', version: '0.2.0' } }, 30000)
    this.notify('notifications/initialized', {})
  }
  callTool(name, args) {
    return this.request('tools/call', { name, arguments: args })
      .then((r) => JSON.parse((r.content ?? []).map((c) => c.text ?? '').join('\n') || '{}'))
  }
  close() { try { this.child.stdin.end() } catch { /* 已关闭 */ } this.child.kill('SIGTERM') }
}

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null }
function firstStr(v) { if (Array.isArray(v)) return v.length ? String(v[0]) : null; return v == null || v === '' ? null : String(v) }

async function main() {
  if (!existsSync(UTS_CLI)) { console.error(`✗ 找不到 unified-trial-mcp 入口：${UTS_CLI}`); process.exit(2) }
  const jsonlPath = join(DIR, 'trials-2026.jsonl')
  const dbPath = join(DIR, 'gastrointestinal_bleeding_trials_2026.sqlite')
  const manifestPath = join(DIR, 'manifest.json')
  const rows = readFileSync(jsonlPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
  const targets = rows.filter((r) => RELEVANT_RE.test(String(r.title ?? '')))
  console.log(`相关记录 ${targets.length} / 全量 ${rows.length}；${DRY ? '[dry-run] 不写盘' : '开始补详情…'}`)
  if (DRY) return

  const cli = new McpClient(); await cli.init()
  const byId = new Map(rows.map((r) => [r.recordId, r]))
  const failures = []
  let done = 0
  for (const t of targets) {
    let detail
    try {
      detail = await Promise.race([
        cli.callTool('get_trial_detail', { recordId: t.recordId }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('detail timeout 10s')), 10000)),
      ])
    } catch (e) {
      failures.push({ recordId: t.recordId, error: String(e.message).slice(0, 200) })
      continue
    }
    const rec = detail?.record || {}
    const raw = detail?.rawFields || {}
    const row = byId.get(t.recordId)
    if (!row) continue
    row.conditions = Array.isArray(rec.conditionOrDisease) ? rec.conditionOrDisease : (raw.condition ? [String(raw.condition)] : [])
    row.phase = firstStr(rec.phase)
    row.minAge = num(raw.inclusion_age_min)
    row.maxAge = num(raw.inclusion_age_max)
    row.gender = firstStr(raw.inclusion_gender)
    row.detailFetchedAt = new Date().toISOString()
    done++
    if (done % 10 === 0) process.stdout.write(`  … ${done}/${targets.length}\n`)
  }
  cli.close()

  /* 重写 JSONL（行序不变，recordId 不变） */
  writeFileSync(jsonlPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n')

  /* 更新 SQLite：补列并逐行 UPDATE（计数不变） */
  const db = new DatabaseSync(dbPath)
  const cols = new Set(db.prepare('PRAGMA table_info(trials)').all().map((c) => c.name))
  for (const [name, type] of [['conditions', 'TEXT'], ['phase', 'TEXT'], ['min_age', 'INTEGER'], ['max_age', 'INTEGER'], ['gender', 'TEXT'], ['detail_fetched_at', 'TEXT']]) {
    if (!cols.has(name)) db.exec(`ALTER TABLE trials ADD COLUMN ${name} ${type}`)
  }
  const up = db.prepare('UPDATE trials SET conditions=?, phase=?, min_age=?, max_age=?, gender=?, detail_fetched_at=? WHERE record_id=?')
  db.exec('BEGIN')
  try {
    let updated = 0
    for (const r of rows) {
      if (!r.detailFetchedAt) continue
      up.run(JSON.stringify(r.conditions || []), r.phase ?? null, r.minAge ?? null, r.maxAge ?? null, r.gender ?? null, r.detailFetchedAt, r.recordId)
      updated++
    }
    db.exec('COMMIT')
    console.log(`SQLite 补列并更新 ${updated} 行`)
  } catch (e) { db.exec('ROLLBACK'); db.close(); throw e }
  const dbCount = db.prepare('SELECT COUNT(*) AS n FROM trials').get().n
  db.close()
  if (dbCount !== rows.length) { console.error(`✗ 计数不符：sqlite=${dbCount} jsonl=${rows.length}`); process.exit(1) }

  /* manifest 回填：计数不变，只更新文件哈希与补详情记账 */
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.relevantRule = RELEVANT_RULE
  manifest.detail = {
    enriched: done,
    failed: failures.length,
    failedRecords: failures,
    fields: ['conditions', 'phase', 'minAge', 'maxAge', 'gender'],
    note: '只对相关记录拉详情；失败记录字段留 NULL，未猜。详情来自单来源，字段以官方页为准。',
    fetchedAt: new Date().toISOString(),
  }
  manifest.files = {
    'trials-2026.jsonl': { sha256: sha256(jsonlPath) },
    'gastrointestinal_bleeding_trials_2026.sqlite': { sha256: sha256(dbPath) },
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`完成：补详情 ${done} 条，失败 ${failures.length} 条；一致性 jsonl=${rows.length} sqlite=${dbCount} manifest=${manifest.recordCount}`)
  if (failures.length) console.log('失败记录：' + failures.slice(0, 8).map((f) => f.recordId).join(', ') + (failures.length > 8 ? ' …' : ''))
}

main().catch((e) => { console.error('✗ ' + e.message); process.exit(1) })