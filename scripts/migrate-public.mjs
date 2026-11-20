#!/usr/bin/node
/**
 * public/ 定点移植（消化道出血工作台）：**复制原型 → 定点替换**，不手抄。
 *
 * 替换点（只有这些，其余与 prototypes/v0.2 逐字符相同——ui-parity 口径）：
 *   1. index.html：加 noindex；标题去「交互原型」字样；顶栏状态条改开发版口径；
 *      版本 chip 走 __VERSION_DISPLAY__ 占位（dsh/server.js 注入，file:// 与宿主两形态同一份文件）；
 *   2. 其余六件（app.js / style.css / demo-data.js / primer-data.js / primer.js / primer.css）
 *      逐字节复制。
 *
 * API 就绪口径：app.js 只在 window.__gibApiReady 为真时请求 bootstrap；
 * 该标志由 dsh/static.js 在服务 index.html 时注入，静态/file:// 形态天然不发请求（零 404）。
 *
 * 用法：node scripts/migrate-public.mjs [--check]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SRC = join(ROOT, 'prototypes/v0.2')
const OUT = join(ROOT, 'public')
const CHECK = process.argv.includes('--check')
const FILES = ['index.html', 'app.js', 'style.css', 'demo-data.js', 'primer-data.js', 'primer.js', 'primer.css']

const TITLE_OLD = '<title>消化道出血工作台 · 交互原型 v0.2</title>'
const TITLE_NEW = '<title>消化道出血工作台</title>\n<meta name="robots" content="noindex,nofollow">'
const BAR_OLD = '合成示例数据 · 本机演示 · 不诊断、不分级、不给药'
const BAR_NEW = '本机数据 · 不上传 · 不诊断、不分级、不给药'
const VER_OLD = '<span class="version">v0.2.0 原型</span>'
const VER_NEW = '<span class="version">__VERSION_DISPLAY__</span>'

function migrateIndex(s) {
  return s
    .replace(TITLE_OLD, TITLE_NEW)
    .replace(BAR_OLD, BAR_NEW)
    .replace(VER_OLD, VER_NEW)
}

function expected(name) {
  const src = readFileSync(join(SRC, name), 'utf8')
  if (name === 'index.html') return migrateIndex(src)
  return src
}

export { FILES, migrateIndex, expected, SRC, OUT }

function check() {
  const problems = []
  for (const f of FILES) {
    let current = ''
    try { current = readFileSync(join(OUT, f), 'utf8') } catch { problems.push(`public/${f} 缺失（跑 npm run build:public）`); continue }
    const want = expected(f)
    if (current !== want) problems.push(`public/${f} 与原型定点移植产物不一致（跑 npm run build:public 后人工复核 diff）`)
  }
  if (problems.length) { console.error('✗ public/ 与 prototypes/v0.2 定点移植不一致：\n  ' + problems.join('\n  ')); process.exit(1) }
  console.log(`✓ public/ ${FILES.length} 件与 prototypes/v0.2 定点移植一致（index.html 白名单替换点，其余逐字节相同）`)
}

function build() {
  mkdirSync(OUT, { recursive: true })
  for (const f of FILES) writeFileSync(join(OUT, f), expected(f))
  console.log(`✓ public/ 已从 prototypes/v0.2 定点移植（${FILES.length} 件）`)
}

/* 仅直接执行时跑主流程（被测试/检查器 import 时只取上面的纯函数） */
const invoked = process.argv[1] && process.argv[1].endsWith('migrate-public.mjs')
if (invoked) {
  if (CHECK) check()
  else build()
}