#!/usr/bin/env node
/**
 * 把**装机副本**（或任意包目录）的 UI + API 挂到本地端口，供真浏览器验收。
 *
 * 为什么需要它：源码树能跑 ≠ 交付产物能跑；对**要装进去的那一份**点一遍，
 * 才能区分「源码好好的、装进去少文件/少路由」。
 *
 * 只监听 127.0.0.1，仅用于本机验收，**不能当装机证据**（装机证据是装进 profile 后能跑）。
 *
 * 用法：
 *   node scripts/serve-artifact.mjs [--port 5188] [--db /tmp/gi-artifact.sqlite] [包目录]
 *   包目录省略时，按 package.json 的 name 去 Desktop profile 的 node_modules 里找；
 *   都没有就用源码树（PROJECT）。
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdtempSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir, tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const PROJECT = resolve(HERE, '..')
const argv = process.argv.slice(2)
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : dflt
}
const positional = []
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { i++; continue }
  positional.push(argv[i])
}

const pkg = JSON.parse(await readFile(join(PROJECT, 'package.json'), 'utf8'))
const installed = join(homedir(), 'Library/Application Support/dsh-desktop/harness/profiles/web/node_modules', pkg.name)
const pkgDir = resolve(positional[0] || (existsSync(join(installed, 'dsh/server.js')) ? installed : PROJECT))

if (!existsSync(join(pkgDir, 'dsh/server.js'))) {
  console.error(`✗ ${pkgDir} 里没有 dsh/server.js（骨架阶段没有它是正常的）`)
  process.exit(1)
}

const port = Number(opt('port', 5188))
const db = opt('db', join(mkdtempSync(join(tmpdir(), 'gi-artifact-')), 'artifact.sqlite'))
const root = opt('root', dirname(db))

const { createHandler } = await import(join(pkgDir, 'dsh/server.js'))
const { Workbench } = await import(join(pkgDir, 'dsh/workbench.js'))
const { API_BASE, UI_ENTRY } = await import(join(pkgDir, 'lib/identity.js'))
const { version } = await import(join(pkgDir, 'lib/version.js'))

const wb = new Workbench({ root })
wb.open()
const services = {
  version,
  capabilities: ['bootstrap', 'subjects', 'records', 'trial-profile', 'trials', 'saved-trials', 'data-root'],
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
const handler = createHandler({ apiBase: API_BASE, publicDir: join(pkgDir, 'public'), services })

const server = createServer((req, res) => {
  Promise.resolve(handler(req, res)).catch((err) => {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'handler_threw', message: String(err?.message) }))
  })
})
server.listen(port, '127.0.0.1', () => {
  console.log(`产物服务：http://127.0.0.1:${port}${UI_ENTRY}`)
  console.log(`包目录：${pkgDir}`)
  console.log(`数据库：${db}`)
})