/* public/ 与原型的一致性（ui-parity 口径）：
 *   - 七件逐字节一致，index.html 只允许 migrate-public 白名单里的替换点；
 *   - public/index.html 必须含 __VERSION_DISPLAY__ 占位，且不得含 vX.Y.Z 字面量。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expected, FILES, OUT, SRC } from '../scripts/migrate-public.mjs'

test('public/ 七件与原型定点移植一致', () => {
  for (const f of FILES) {
    const want = expected(f)
    const got = readFileSync(join(OUT, f), 'utf8')
    assert.equal(got, want, `public/${f} 不一致（跑 npm run build:public）`)
  }
})

test('public/index.html 版本走占位符，无手写版本字面量', () => {
  const html = readFileSync(join(OUT, 'index.html'), 'utf8')
  assert.ok(html.includes('__VERSION_DISPLAY__'), '缺 __VERSION_DISPLAY__ 占位')
  assert.ok(!/v\d+\.\d+\.\d+/.test(html), '页面出现手写版本字面量')
  assert.ok(!/20\d\d-\d\d-\d\d/.test(html), '页面出现手写日期字面量')
})

test('原型与开发版只差白名单替换点', () => {
  const src = readFileSync(join(SRC, 'index.html'), 'utf8')
  assert.ok(src.includes('交互原型'), '原型标题应保留「交互原型」字样')
  assert.ok(src.includes('合成示例数据'), '原型应标明合成示例数据')
})
