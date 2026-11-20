#!/usr/bin/env node
/**
 * probe-gastrointestinal-bleeding-m2.mjs — 全量路由 + 业务闭环探针（R1–R12）
 *
 * 为什么必须有它：check-probe-coverage 只认「全量探针覆盖每一条叶子路由」；
 * 没有它，新加页面不会被任何东西扫到，check 绿只是因为它没在看。
 *
 * 断言（每条都能 FAIL）：
 *   R1–R7  ROUTES 的 7 条叶子路由逐条渲染：视图可见 + 关键元素/文案在场
 *   R8     两套合成档案切换 A→B→A：记录数与摘要内容跟着变，且不串档
 *   R9     八类记录按钮齐全（bleed/lab/treatment/question/hospital/report/doc/mind）
 *   R10    「新建我的档案」打开表单（名称输入 + 创建按钮），演示态创建后自动切换
 *   R11    记录一条 → 摘要出现该条（演示态内存）
 *   R12    390px 视口无横向溢出
 *
 * 用法：
 *   node scripts/probe-gastrointestinal-bleeding-m2.mjs                         # 自动起本地服务打本仓原型
 *   node scripts/probe-gastrointestinal-bleeding-m2.mjs --url http://127.0.0.1:8126/prototypes/v0.2/index.html
 *   node scripts/probe-gastrointestinal-bleeding-m2.mjs --self-test             # 注入缺陷，必须报 FAIL
 *
 * 依赖：puppeteer-core（家族 workspace）+ 本机 Chrome。缺依赖 = exit 2（不算通过）。
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
const PORT = Number(argOf('--port') || 8128)

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' }

function serve() {
  return new Promise((res) => {
    const server = createServer(async (req, rsp) => {
      const path = decodeURIComponent((req.url || '/').split('?')[0])
      if (path === '/favicon.ico') { rsp.writeHead(204).end(); return }
      const file = join(ROOT, normalize(path).replace(/^([/\\])+/, ''))
      if (!file.startsWith(ROOT)) { rsp.writeHead(403).end(); return }
      try {
        const body = await readFile(file)
        rsp.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(body)
      } catch { rsp.writeHead(404).end('not found') }
    })
    server.listen(PORT, '127.0.0.1', () => res(server))
  })
}

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ]
  return candidates.find((p) => existsSync(p)) || null
}

const results = []
function record(ok, id, note, evidence) {
  results.push({ ok, id, note, evidence })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${note}${evidence ? '  — ' + evidence : ''}`)
}

const ROUTES = ['home', 'records', 'clinical/match', 'clinical/search', 'clinical/saved', 'primer', 'settings']
const EXPECT = {
  home: { selector: '#view-home:not([hidden])', text: '先求助，再决定是否记录' },
  records: { selector: '#view-records:not([hidden])', text: '我的记录' },
  'clinical/match': { selector: '#clinical-match:not([hidden])', text: '匹配卡' },
  'clinical/search': { selector: '#clinical-search:not([hidden])', text: '检索（按条件排，不掺分数）' },
  'clinical/saved': { selector: '#clinical-saved:not([hidden])', text: '收藏' },
  primer: { selector: '#view-primer:not([hidden])', text: '疾病概要：消化道出血是什么？' },
  settings: { selector: '#view-settings:not([hidden])', text: '资料目录' },
}

async function main() {
  const chrome = findChrome()
  if (!chrome) { console.log('找不到 Chrome：设置 CHROME_PATH 后重试。跳过等于没有这条闸门。'); process.exit(2) }
  let puppeteer
  try {
    const require = createRequire('/Users/qinxiaoqiang/.workbuddy/binaries/node/workspace/')
    puppeteer = require('puppeteer-core')
  } catch { console.log('缺少 puppeteer-core。跳过等于没有这条闸门。'); process.exit(2) }

  const server = await serve()
  const base = argOf('--url') || `http://127.0.0.1:${PORT}/prototypes/v0.2/index.html`
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e && e.message ? e.message : e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/i.test(m.text())) pageErrors.push(m.text()) })
  await page.setViewport({ width: 1280, height: 860 })

  const failText = SELF_TEST ? '这份文案不存在-注入缺陷' : null

  try {
    for (let i = 0; i < ROUTES.length; i++) {
      const route = ROUTES[i]
      await page.goto(base + '#' + route, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('#profileName', { timeout: 8000 })
      await new Promise((r) => setTimeout(r, 250))
      const exp = EXPECT[route]
      const found = await page.evaluate((sel) => Boolean(document.querySelector(sel)), exp.selector)
      const text = await page.evaluate(() => document.body.innerText)
      const want = failText || exp.text
      record(found && text.includes(want), 'R' + (i + 1), `路由 ${route} 渲染且关键文案在场`, found ? (text.includes(want) ? 'ok' : `缺「${want}」`) : `缺 ${exp.selector}`)
    }

    /* R8 档案切换 A→B→A */
    await page.goto(base + '#records', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#profileSelect option', { timeout: 8000 })
    const countA = await page.evaluate(() => document.querySelectorAll('#recordsList .record-card').length)
    await page.select('#profileSelect', 'b')
    await new Promise((r) => setTimeout(r, 400))
    const countB = await page.evaluate(() => document.querySelectorAll('#recordsList .record-card').length)
    const nameB = await page.evaluate(() => document.getElementById('profileName').textContent)
    await page.select('#profileSelect', 'a')
    await new Promise((r) => setTimeout(r, 400))
    const countA2 = await page.evaluate(() => document.querySelectorAll('#recordsList .record-card').length)
    record(countA > 0 && countB > countA && countA2 === countA && /示例组 B/.test(nameB), 'R8',
      `档案切换 A(${countA})→B(${countB})→A(${countA2}) 记录联动且不串档`, `nameB=${nameB}`)

    /* R9 八类按钮 */
    await page.goto(base + '#home', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#kindStrip [data-kind]', { timeout: 8000 })
    const kinds = await page.evaluate(() => [...document.querySelectorAll('#kindStrip [data-kind]')].map((b) => b.getAttribute('data-kind')))
    const need = ['bleed', 'lab', 'treatment', 'question', 'hospital', 'report', 'doc', 'mind']
    record(need.every((k) => kinds.includes(k)), 'R9', `八类记录按钮齐全（${kinds.length} 个）`, kinds.join(','))

    /* R10 新建档案表单（演示态创建） */
    await page.click('#newProfileButton')
    await page.waitForSelector('#newProfileDialog #newProfileForm', { timeout: 4000 })
    const hasForm = await page.evaluate(() => Boolean(document.querySelector('#newProfileDialog #npName')))
    await page.type('#newProfileDialog #npName', '探针新档案')
    await page.click('#newProfileDialog button[type="submit"]')
    await new Promise((r) => setTimeout(r, 400))
    const created = await page.evaluate(() => ({
      dialogGone: !document.getElementById('newProfileDialog'),
      current: document.getElementById('profileName').textContent,
      hasOption: [...document.querySelectorAll('#profileSelect option')].some((o) => o.textContent.includes('探针新档案')),
    }))
    record(hasForm && created.dialogGone && /探针新档案/.test(created.current) && created.hasOption, 'R10',
      '新建档案表单可用，创建后自动切换并出现在列表', JSON.stringify(created))

    /* R11 记录一条 → 摘要出现（演示态） */
    await page.click('#newProfileButton')
    await page.waitForSelector('#newProfileDialog #newProfileForm', { timeout: 4000 })
    await page.type('#newProfileDialog #npName', '探针记录档案')
    await page.click('#newProfileDialog button[type="submit"]')
    await new Promise((r) => setTimeout(r, 300))
    await page.evaluate(() => {
      const ta = document.querySelector('#recordFields textarea')
      if (ta) ta.value = '探针写入的记录内容'
    })
    await page.click('#recordSubmit')
    await new Promise((r) => setTimeout(r, 300))
    const summary = await page.evaluate(() => document.getElementById('summaryFacts').innerText)
    record(summary.includes('探针写入的记录内容'), 'R11', '记录一条后摘要出现该条', summary.slice(0, 60).replace(/\n/g, ' '))

    /* R12 390px 无横向溢出 */
    await page.setViewport({ width: 390, height: 844 })
    await page.goto(base + '#home', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 300))
    const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    record(overflow.sw <= overflow.cw + 1, 'R12', `390px 无横向溢出（scrollWidth ${overflow.sw} ≤ clientWidth ${overflow.cw}）`)

    /* 无 console/page 错误 */
    record(pageErrors.length === 0, 'R0', '全流程无 JS 报错 / console error', pageErrors.slice(0, 3).join(' | '))
  } finally {
    await browser.close()
    server.close()
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