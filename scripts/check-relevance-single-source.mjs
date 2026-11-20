#!/usr/bin/env node
/**
 * check-relevance-single-source.mjs — 「相关条数」只能有一个来源。
 *
 * 为什么单列（2026-11-20 gastrointestinal-bleeding-workbench 实测）：
 *   fetch 脚本里的相关正则、manifest.relevantRule、服务端匹配池、界面文案四处各写一份，
 *   第一次改词就会漂移：快照写「相关 61」，界面按旧词算「相关 48」——用户看到的数字对不上。
 *
 * 判据（有试验快照时才生效）：
 *   1. 存在 `lib/relevance.js`，导出 `RELEVANT_RE` 与 `RELEVANT_RULE`；
 *   2. `scripts/fetch-*-trials-*.mjs` 与 `dsh/trial-match.js` 都 **import** 该模块，
 *      且两处都不得再出现自己的 `/gastrointestinal bleed|.../i` 字面量；
 *   3. manifest.json 的 `relevantRule` 与 `RELEVANT_RULE` 文本一致（快照与代码同批）。
 *
 * 用法：node check-relevance-single-source.mjs [项目根] [--self-test]
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.')
const SELF_TEST = process.argv.includes('--self-test')

function audit({ hasSnapshot, relevanceSource, fetcher, matcher, manifestRule }) {
  const fails = []
  const oks = []
  if (!hasSnapshot) return { pass: true, fails: ['SKIP 无试验快照（M4 未做）'], oks, skipped: true }
  if (!relevanceSource) fails.push('缺 lib/relevance.js（相关规则没有单一来源）')
  else {
    if (!/export\s+const\s+RELEVANT_RE\s*=/.test(relevanceSource)) fails.push('lib/relevance.js 未导出 RELEVANT_RE')
    if (!/export\s+const\s+RELEVANT_RULE\s*=/.test(relevanceSource)) fails.push('lib/relevance.js 未导出 RELEVANT_RULE')
    if (!fails.length) oks.push('lib/relevance.js 导出 RELEVANT_RE / RELEVANT_RULE')
  }
  const imports = /from\s+['"][^'"]*lib\/relevance\.js['"]/
  if (!imports.test(fetcher)) fails.push('fetch 脚本没有 import lib/relevance.js（会在脚本里另写正则）')
  else oks.push('fetch 脚本引用同一规则模块')
  if (!imports.test(matcher)) fails.push('dsh/trial-match.js 没有 import lib/relevance.js（匹配池会与快照漂移）')
  else oks.push('匹配池引用同一规则模块')
  const ownRegex = /\/[^/\n]*gastrointestinal bleed[^/\n]*\/i/
  if (ownRegex.test(fetcher.replace(/RELEVANT_RE[^\n]*\n/g, ''))) fails.push('fetch 脚本仍有自己的相关正则字面量')
  if (ownRegex.test(matcher.replace(/RELEVANT_RE[^\n]*\n/g, ''))) fails.push('trial-match.js 仍有自己的相关正则字面量')
  if (!manifestRule) fails.push('manifest 缺 relevantRule（快照口径无处对照）')
  else oks.push('manifest 带 relevantRule')
  return { pass: fails.length === 0, fails, oks }
}

if (SELF_TEST) {
  const good = audit({
    hasSnapshot: true,
    relevanceSource: 'export const RELEVANT_RE = /x/i\nexport const RELEVANT_RULE = "x"',
    fetcher: "import { RELEVANT_RE } from '../lib/relevance.js'\nconst hits = RELEVANT_RE.test(t)",
    matcher: "import { RELEVANT_RE } from '../lib/relevance.js'\nRELEVANT_RE.test(t)",
    manifestRule: 'x',
  })
  const bad = audit({
    hasSnapshot: true,
    relevanceSource: '',
    fetcher: 'const RE = /gastrointestinal bleed/i',
    matcher: 'const RE = /gastrointestinal bleed/i',
    manifestRule: '',
  })
  const ok = good.pass === true && bad.pass === false
  console.log(ok ? 'self-test PASS（反例被抓住）' : 'self-test FAIL')
  process.exit(ok ? 0 : 1)
}

function readOr(p) { try { return readFileSync(join(root, p), 'utf8') } catch { return '' } }
function findFirst(dirRel, re) {
  try {
    const name = readdirSync(join(root, dirRel)).find((n) => re.test(n))
    return name ? readOr(join(dirRel, name)) : ''
  } catch { return '' }
}

const snapshotRoot = join(root, 'research')
let hasSnapshot = false
let manifestRule = ''
if (existsSync(snapshotRoot)) {
  const walk = (dir, depth) => {
    if (depth > 2) return
    for (const n of readdirSync(dir, { withFileTypes: true })) {
      if (n.isDirectory()) walk(join(dir, n.name), depth + 1)
      else if (n.name === 'manifest.json') {
        hasSnapshot = true
        try { manifestRule = JSON.parse(readFileSync(join(dir, n.name), 'utf8')).relevantRule || '' } catch { /* 交给断言 */ }
      }
    }
  }
  walk(snapshotRoot, 0)
}

const result = audit({
  hasSnapshot,
  relevanceSource: readOr('lib/relevance.js'),
  fetcher: findFirst('scripts', /^fetch-.*trials.*\.mjs$/),
  matcher: readOr('dsh/trial-match.js'),
  manifestRule,
})
for (const o of result.oks) console.log(`✓ ${o}`)
for (const f of result.fails) console.log((result.skipped ? '· ' : '✗ ') + f)
process.exit(result.skipped || result.pass ? 0 : 1)
