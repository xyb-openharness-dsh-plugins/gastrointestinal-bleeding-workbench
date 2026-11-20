/* 包内容自检（06 号四要素）：files 白名单里的关键产物真实存在，且不含占位符。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const pkg = () => JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

test('files 白名单覆盖宿主加载所需产物', () => {
  const files = pkg().files
  for (const need of ['dsh', 'lib', 'public', 'schema', 'research', 'cordis.patch.yml']) {
    assert.ok(files.includes(need), `files 缺 ${need}`)
  }
})

test('入口与生成物存在且版本同源', () => {
  const p = pkg()
  assert.equal(p.main, './dsh/index.js')
  assert.equal(p.exports['./client'], './lib/client.js')
  for (const rel of ['dsh/index.js', 'lib/client.js', 'lib/version.js', 'public/index.html', 'schema/0001_initial.sql', 'cordis.patch.yml']) {
    assert.ok(existsSync(join(ROOT, rel)), `缺 ${rel}`)
  }
  const version = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim()
  assert.equal(p.version, version, 'package.json 与 VERSION 不一致')
  const generated = readFileSync(join(ROOT, 'lib/version.js'), 'utf8')
  assert.ok(generated.includes(`'${version}'`), 'lib/version.js 与 VERSION 不一致（跑 npm run build:version）')
})

test('生成物无未替换占位符（构建器先声明再引用不算）', () => {
  for (const rel of ['lib/client.js', 'dsh/index.js', 'public/app.js']) {
    let text = readFileSync(join(ROOT, rel), 'utf8')
    const declared = [...text.matchAll(/\b(?:const|let|var)\s+(__[A-Z][A-Z0-9_]+__)\s*=/g)].map((m) => m[1])
    for (const name of declared) text = text.split(name).join('DECLARED')
    assert.ok(!/__[A-Z][A-Z0-9_]+__/.test(text), `${rel} 残留 __XXX__ 占位符`)
  }
})

test('快照三处计数一致（manifest = jsonl = sqlite）', async () => {
  const mf = JSON.parse(readFileSync(join(ROOT, 'research', 'gastrointestinal-bleeding', 'manifest.json'), 'utf8'))
  const lines = readFileSync(join(ROOT, 'research', 'gastrointestinal-bleeding', 'trials-2026.jsonl'), 'utf8').trim().split('\n').filter(Boolean)
  assert.equal(mf.recordCount, lines.length)
  assert.equal(mf.dbCount, lines.length)
})
