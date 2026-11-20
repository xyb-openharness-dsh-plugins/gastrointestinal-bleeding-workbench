/* HTTP 层契约（dsh/server.js）：真实起一个 http server 跑一遍关键路由，防止「函数有、路由没接」。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Workbench } from '../dsh/workbench.js'
import { createHandler, checkDataDir } from '../dsh/server.js'

async function withServer(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'gi-http-'))
  const wb = new Workbench({ root: dir })
  wb.open()
  const services = {
    version: 'test',
    capabilities: ['bootstrap'],
    bootstrap: () => wb.bootstrap(),
    listProfiles: () => wb.listProfiles(),
    createSubject: (x) => wb.createSubject(x),
    deleteSubject: (k) => wb.deleteSubject(k),
    getRecords: (k) => wb.getRecords(k),
    saveRecords: (k, r) => wb.saveRecords(k, r),
    addEntry: (k, kind, data) => wb.addEntry(k, kind, data),
    getTrialProfile: (k) => wb.getTrialProfile(k),
    saveTrialProfile: (k, i) => wb.saveTrialProfile(k, i),
    trialSearch: (q) => wb.trialSearch(q),
    trialMatch: (k, q) => wb.trialMatch(k, q),
    savedTrials: (k) => wb.savedTrials(k),
    saveTrial: (k, r) => wb.saveTrial(k, r),
    removeTrial: (k, id) => wb.removeTrial(k, id),
    dataRoot: () => wb.dataRoot,
    setDataRoot: (d) => wb.setDataRoot(d),
  }
  const handler = createHandler({ apiBase: '/api/test', publicDir: join(process.cwd(), 'public'), services })
  const server = createServer((req, res) => handler(req, res))
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = 'http://127.0.0.1:' + server.address().port
  try { await fn(base) } finally {
    await new Promise((r) => server.close(r))
    wb.close(); rmSync(dir, { recursive: true, force: true })
  }
}

const json = (r) => r.json()

test('bootstrap / subjects / entries / records 全链路', async () => {
  await withServer(async (base) => {
    const boot = await json(await fetch(base + '/api/test/api/bootstrap'))
    assert.equal(boot.profiles.length, 2, '两条 demo 应已播种')
    assert.ok(boot.trialSnapshot.available)

    const created = await json(await fetch(base + '/api/test/api/subjects', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'HTTP 档案' }),
    }))
    assert.match(created.profileKey, /^local-/)

    const entry = await json(await fetch(base + '/api/test/api/subjects/' + created.profileKey + '/entries', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'bleed', data: { observed: ['黑便'], note: 'http' } }),
    }))
    assert.ok(entry.id)

    const rec = await json(await fetch(base + '/api/test/api/subjects/' + created.profileKey + '/records'))
    assert.equal(rec.records.length, 1)
    assert.equal(rec.records[0].kind, 'bleed')
  })
})

test('试验检索与匹配路由可用，且都带候选池口径', async () => {
  await withServer(async (base) => {
    const s = await json(await fetch(base + '/api/test/api/trials?keyword=ulcer&relevantOnly=true'))
    assert.equal(s.available, true)
    assert.equal(s.candidatePool.notFullScan, true)
    const m = await json(await fetch(base + '/api/test/api/trials/match?profileKey=a'))
    assert.equal(m.available, true)
    assert.match(m.honestyNote, /未核实/)
  })
})

test('资料目录：拒绝下载根/桌面，服务端二次校验', async () => {
  const bad = checkDataDir('/Users/someone/Downloads')
  assert.equal(bad.ok, false)
  assert.match(bad.reason, /下载/)
  assert.equal(checkDataDir('/tmp/x').ok, false)
  assert.equal(checkDataDir('/Users/someone/Documents/gi-data').ok, true)
})

test('未知路由与错误输入返回可读 JSON，不裸崩', async () => {
  await withServer(async (base) => {
    const unknown = await fetch(base + '/api/test/api/nope')
    assert.equal(unknown.status, 404)
    assert.match((await unknown.json()).error, /Unknown/)
    const bad = await fetch(base + '/api/test/api/subjects', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '' }),
    })
    assert.equal(bad.status, 400)
    assert.match((await bad.json()).detail, /档案名/)
  })
})
