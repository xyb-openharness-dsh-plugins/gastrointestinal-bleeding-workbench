#!/usr/bin/env node
/**
 * probe-gastrointestinal-bleeding-m2.mjs — v0.3 全量路由 + 业务闭环探针（R1–R32）
 *
 * 为什么必须有它：check-probe-coverage 只认「全量探针覆盖每一条叶子路由」；
 * 没有它，新加页面不会被任何东西扫到，check 绿只是因为它没在看。
 *
 * 用法：
 *   node scripts/probe-gastrointestinal-bleeding-m2.mjs
 *   node scripts/probe-gastrointestinal-bleeding-m2.mjs --url http://127.0.0.1:5193/api/gastrointestinal-bleeding/ui/
 *   node scripts/probe-gastrointestinal-bleeding-m2.mjs --self-test
 *
 * 依赖：puppeteer-core + 本机 Chrome。缺依赖 = exit 2（不算通过）。
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argOf = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const SELF_TEST = args.includes('--self-test')
const PORT = Number(argOf('--port') || 8132)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' }

function serve() {
  return new Promise((res) => {
    const server = createServer(async (req, rsp) => {
      const path = decodeURIComponent((req.url || '/').split('?')[0])
      if (path === '/favicon.ico') { rsp.writeHead(204).end(); return }
      const file = join(ROOT, normalize(path).replace(/^([/\\])+/, ''))
      if (!file.startsWith(ROOT)) { rsp.writeHead(403).end(); return }
      try { const body = await readFile(file); rsp.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(body) }
      catch { rsp.writeHead(404).end('not found') }
    })
    server.listen(PORT, '127.0.0.1', () => res(server))
  })
}

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p)) || null
}

const results = []
function record(ok, id, note, evidence) {
  results.push({ ok, id, note })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${note}${evidence ? '  — ' + evidence : ''}`)
}

const ROUTES = [
  ['dashboard', '今天先看这三件事'],
  ['prevent/daily', '出现这些表现'],
  ['prevent/risk', '风险因素'],
  ['prevent/checklist', '日常预防清单'],
  ['monitor/today', '记一次今天的情况'],
  ['monitor/all', '全部类型'],
  ['monitor/symptoms', '用药记录'],
  ['monitor/home-test', '家里可以测的'],
  ['emergency/scene', '按顺序做'],
  ['emergency/plan', '我的送医预案'],
  ['emergency/handoff', '就诊交接摘要'],
  ['metrics/hb', '血红蛋白（Hb）'],
  ['metrics/score', 'Glasgow-Blatchford'],
  ['metrics/reports', '报告结论以原件'],
  ['aftercare/plan', '出院后要落实的五件事'],
  ['aftercare/visits', '就诊记录时间线'],
  ['aftercare/questions', '问题清单'],
  ['varices/why', '脾静脉问题'],
  ['varices/monitor', '平时记什么'],
  ['varices/post-splenectomy', '脾切除术后'],
  ['clinical/match', '基础档案（只用于匹配）'],
  ['clinical/search', '检索（按条件排'],
  ['clinical/saved', '收藏'],
  ['resources/centers', '首都医科大学附属北京友谊医院'],
  ['resources/sources', '急性非静脉曲张性上消化道出血诊治指南'],
]

async function main() {
  const chrome = findChrome()
  if (!chrome) { console.log('找不到 Chrome：设置 CHROME_PATH 后重试。跳过等于没有这条闸门。'); process.exit(2) }
  let puppeteer
  try { const require = createRequire('/Users/qinxiaoqiang/.workbuddy/binaries/node/workspace/'); puppeteer = require('puppeteer-core') }
  catch { console.log('缺少 puppeteer-core。跳过等于没有这条闸门。'); process.exit(2) }

  const server = await serve()
  const base = argOf('--url') || `http://127.0.0.1:${PORT}/prototypes/v0.3/index.html`
  const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + (e && e.message ? e.message : e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/i.test(m.text())) errors.push('console: ' + m.text()) })
  await page.setViewport({ width: 1440, height: 1000 })
  const failText = SELF_TEST ? '这份文案不存在-注入缺陷' : null

  try {
    for (let i = 0; i < ROUTES.length; i++) {
      const [route, marker] = ROUTES[i]
      await page.goto(base + '#' + route, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('#main h1', { timeout: 8000 })
      await new Promise((r) => setTimeout(r, 200))
      const text = await page.evaluate(() => document.body.innerText)
      const want = failText || marker
      record(text.includes(want), 'R' + (i + 1), `路由 ${route} 渲染且关键文案在场`, text.includes(want) ? 'ok' : `缺「${want}」`)
    }

    await page.goto(base + '#monitor/all', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#main h1', { timeout: 8000 })
    const countA = await page.evaluate(() => document.querySelectorAll('.record-row').length)
    await page.evaluate(() => window.GIWorkbench.switchProfile('b'))
    await new Promise((r) => setTimeout(r, 500))
    const countB = await page.evaluate(() => document.querySelectorAll('.record-row').length)
    const nameB = await page.evaluate(() => document.getElementById('profileName').textContent)
    await page.evaluate(() => window.GIWorkbench.switchProfile('a'))
    await new Promise((r) => setTimeout(r, 500))
    const countA2 = await page.evaluate(() => document.querySelectorAll('.record-row').length)
    record(countA > 0 && countB > countA && countA2 === countA && /陈女士/.test(nameB), 'R26',
      `档案切换 A(${countA})→B(${countB})→A(${countA2}) 记录联动且不串档`, `nameB=${nameB}`)

    await page.goto(base + '#monitor/today', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#main h1', { timeout: 8000 })
    const kinds = await page.evaluate(() => [...document.querySelectorAll('[data-quick-kind]')].map((b) => b.getAttribute('data-quick-kind')))
    const need = ['bleed', 'lab', 'treatment', 'question', 'hospital', 'report', 'doc', 'mind']
    record(need.every((k) => kinds.includes(k)), 'R27', `八类记录按钮齐全（${kinds.length} 个）`, kinds.join(','))

    await page.click('[data-action="profiles"]')
    await page.waitForSelector('[data-action="new-profile"]', { timeout: 4000 })
    await page.click('[data-action="new-profile"]')
    await page.waitForSelector('#npName', { timeout: 4000 })
    await page.type('#npName', '探针新档案')
    await page.click('[data-action="create-profile"]')
    await new Promise((r) => setTimeout(r, 400))
    const created = await page.evaluate(() => ({ current: document.getElementById('profileName').textContent, dialogOpen: document.getElementById('dialog').open }))
    record(/探针新档案/.test(created.current) && !created.dialogOpen, 'R28', '新建档案表单可用，创建后自动切换', JSON.stringify(created))

    await page.evaluate(() => {
      const ta = document.querySelector('#quickFields textarea')
      if (ta) { ta.value = '探针写入的记录内容'; ta.dispatchEvent(new Event('input', { bubbles: true })) }
    })
    await page.click('#quickForm button[type="submit"]')
    await new Promise((r) => setTimeout(r, 400))
    await page.evaluate(() => window.GIWorkbench.goto('monitor/all'))
    await new Promise((r) => setTimeout(r, 300))
    const listText = await page.evaluate(() => document.body.innerText)
    record(listText.includes('探针写入的记录内容'), 'R29', '记录一条后「全部记录」出现该条')

    await page.click('[data-action="settings"]')
    await page.waitForSelector('[data-settings-tab]', { timeout: 4000 })
    const tabs = await page.evaluate(() => [...document.querySelectorAll('[data-settings-tab]')].map((b) => b.textContent.trim()))
    await page.click('[data-settings-tab="db"]')
    await new Promise((r) => setTimeout(r, 200))
    const dbText = await page.evaluate(() => document.getElementById('settingsBody').innerText)
    record(tabs.length === 3 && /临床数据库/.test(tabs.join(',')) && (dbText.includes('未配置') || dbText.includes('已查询') || dbText.includes('静态演示态')), 'R30', '设置弹窗三个分区 tab 可切换', tabs.join(' / '))
    await page.click('[data-action="close-dialog"]')

    await page.evaluate(() => window.GIWorkbench.switchProfile('b'))
    await new Promise((r) => setTimeout(r, 500))
    await page.evaluate(() => window.GIWorkbench.goto('metrics/score'))
    await new Promise((r) => setTimeout(r, 300))
    const scoreText = await page.evaluate(() => document.body.innerText)
    record(/算术对照/.test(scoreText), 'R31', 'GBS 评分卡显示算术对照（字段完整时）', scoreText.includes('暂不合计') ? '仍为暂不合计' : 'ok')

    await page.setViewport({ width: 390, height: 844 })
    await page.goto(base + '#dashboard', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 300))
    const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    record(overflow.sw <= overflow.cw + 1, 'R32', `390px 无横向溢出（${overflow.sw} ≤ ${overflow.cw}）`)

    record(errors.length === 0, 'R0', '全流程无 JS 报错 / console error', errors.slice(0, 3).join(' | '))
  } finally {
    await browser.close(); server.close()
  }

  const pass = results.filter((r) => r.ok).length
  console.log(`\n${pass}/${results.length} 通过`)
  if (SELF_TEST) {
    const failed = results.some((r) => !r.ok)
    console.log(failed ? 'self-test PASS（注入缺陷后确实报红）' : 'self-test FAIL（注入缺陷后仍然全绿——闸门无效）')
    process.exit(failed ? 0 : 1)
  }
  process.exit(pass === results.length ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
