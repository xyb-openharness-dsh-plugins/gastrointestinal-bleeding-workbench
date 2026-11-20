/* 消化道出血工作台 · 业务界面（原型与开发版共用；migrate-public 只改 index.html 白名单点）
 *
 * 双形态：
 *   - 宿主形态：window.__gibApiReady = 1（dsh/static.js 注入）→ 走 /api/gastrointestinal-bleeding/api/*；
 *   - 静态 / file:// 形态：不注入 → 一律读 demo-data.js 的合成示例，任何保存都明说「演示态」。
 *
 * 红线：不诊断、不分级、不建议用药；匹配只用已确认字段；私密记录不进摘要/导出。
 */
(function () {
  'use strict'

  var API_BASE = '/api/gastrointestinal-bleeding/api'
  var API_READY = !!window.__gibApiReady
  var DEMO = window.GIB_DEMO || { profiles: [], notice: '' }

  var KINDS = {
    bleed: { label: '出血观察', icon: '①', fields: [
      { name: 'date', label: '日期', type: 'date', placeholder: '不确定可留空' },
      { name: 'observed', label: '看到的表现（可多选）', type: 'multi', options: ['呕血', '咖啡渣样呕吐', '黑便', '血便或便血', '头晕或晕厥'] },
      { name: 'note', label: '原样记录', type: 'textarea', placeholder: '用自己的话记录看到或听到的情况，不需要判断原因' },
    ] },
    lab: { label: '化验', icon: '②', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'item', label: '项目名称（照抄报告）', type: 'text' },
      { name: 'value', label: '数值', type: 'text' },
      { name: 'unit', label: '单位（照抄）', type: 'text' },
      { name: 'note', label: '备注', type: 'text', placeholder: '来源 / 报告名称（可选）' },
    ] },
    treatment: { label: '治疗用药', icon: '③', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'name', label: '医生告知的处理 / 药物名称', type: 'text', placeholder: '按原话抄，不自己改写剂量' },
      { name: 'note', label: '备注', type: 'text', placeholder: '医嘱来源（可选）' },
    ] },
    question: { label: '要问医生', icon: '④', fields: [
      { name: 'text', label: '想问的问题', type: 'textarea', placeholder: '例如：下次复查要注意什么？' },
    ] },
    hospital: { label: '就诊住院', icon: '⑤', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'place', label: '地点（医院/科室）', type: 'text' },
      { name: 'reason', label: '就诊原因（原话）', type: 'text' },
      { name: 'note', label: '备注', type: 'text' },
    ] },
    report: { label: '检查报告', icon: '⑥', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'name', label: '报告名称', type: 'text' },
      { name: 'note', label: '只抄名称/日期，结论待核', type: 'text', placeholder: '不抄写未核对的结论' },
    ] },
    doc: { label: '资料', icon: '⑦', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'name', label: '资料名称', type: 'text' },
      { name: 'note', label: '存放位置（可选）', type: 'text', placeholder: '例如：家里文件夹 / 未上传' },
    ] },
    mind: { label: '感受', icon: '⑧', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'text', label: '此刻的感受（只给自己看可选私密）', type: 'textarea' },
      { name: 'private', label: '标记为私密（不进摘要/导出）', type: 'check' },
    ] },
  }
  var KIND_ORDER = ['bleed', 'lab', 'treatment', 'question', 'hospital', 'report', 'doc', 'mind']
  var SIGN_OPTIONS = ['呕血', '咖啡渣样呕吐', '黑便', '血便或便血', '头晕或晕厥', '无明显表现']
  var MED_OPTIONS = ['抗凝药', '抗血小板药', '非甾体抗炎药（NSAIDs）', '其他', '未用药', '不清楚']

  var state = {
    profiles: [],
    currentKey: null,
    records: [],
    isDemoProfile: true,
    currentKind: 'bleed',
    kindFilter: '',
    clinicalTab: 'match',
    trialProfile: null,
    match: null,
    search: null,
    saved: [],
    channels: [],
    dataDir: '',
    trialMeta: null,
    saving: false,
  }

  var $ = function (id) { return document.getElementById(id) }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  var toastTimer = null
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show')
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show') }, 2800)
  }
  function demoNotice() { return API_READY ? '' : '静态演示态：记录只存在本页内存，刷新重置。' }

  /* ---------------- API ---------------- */
  function apiFetch(path, options) {
    return fetch(API_BASE + path, Object.assign({ credentials: 'same-origin' }, options || {}))
      .then(function (rsp) {
        return rsp.json().catch(function () { return {} }).then(function (body) {
          if (!rsp.ok) throw new Error(body.error || body.detail || ('请求失败 ' + rsp.status))
          return body
        })
      })
  }
  function apiJson(path, method, body) {
    return apiFetch(path, {
      method: method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  /* ---------------- 档案 ---------------- */
  function demoProfile(key) {
    return (DEMO.profiles || []).filter(function (p) { return p.profileKey === key })[0] || null
  }
  function currentProfile() {
    return state.profiles.filter(function (p) { return p.profileKey === state.currentKey })[0] || null
  }

  function loadBootstrap() {
    if (!API_READY) {
      state.profiles = (DEMO.profiles || []).map(function (p) {
        return { profileKey: p.profileKey, name: p.name, meta: p.meta, isDemo: true, createdOn: '2026-11-01' }
      })
      state.currentKey = state.profiles[0] ? state.profiles[0].profileKey : null
      return Promise.resolve()
    }
    return apiFetch('/bootstrap').then(function (data) {
      state.profiles = data.profiles || []
      state.trialMeta = data.trialSnapshot || null
      state.dataDir = data.dataRoot || ''
      state.channels = (data.trialSnapshot && data.trialSnapshot.sourceStates) || []
      var saved = null
      try { saved = localStorage.getItem('gi-bieeding.currentProfile') } catch (e) { saved = null }
      var exists = state.profiles.some(function (p) { return p.profileKey === saved })
      state.currentKey = exists ? saved : (state.profiles[0] ? state.profiles[0].profileKey : null)
    })
  }

  function persistCurrentKey() {
    try { localStorage.setItem('gi-bieeding.currentProfile', state.currentKey || '') } catch (e) { /* 隐私模式 */ }
  }

  function loadRecords() {
    var p = currentProfile()
    state.isDemoProfile = !p || p.isDemo
    if (!p) { state.records = []; return Promise.resolve() }
    if (!API_READY || p.isDemo) {
      var d = demoProfile(p.profileKey)
      state.records = d ? JSON.parse(JSON.stringify(d.records || [])) : []
      return Promise.resolve()
    }
    return apiFetch('/subjects/' + encodeURIComponent(p.profileKey) + '/records')
      .then(function (data) { state.records = data.records || [] })
  }

  function renderProfileBar() {
    var p = currentProfile()
    $('profileName').textContent = p ? p.name : '（没有档案）'
    $('profileTag').hidden = !(p && p.isDemo)
    $('profileMeta').textContent = p && p.meta ? p.meta : ''
    var sel = $('profileSelect')
    sel.innerHTML = state.profiles.map(function (x) {
      return '<option value="' + esc(x.profileKey) + '">' + esc(x.name) + (x.isDemo ? '（合成示例）' : '') + '</option>'
    }).join('')
    sel.value = state.currentKey || ''
    $('summaryDemoTag').hidden = !(p && p.isDemo)
    $('recordNote').textContent = !API_READY
      ? '静态演示态：保存只写本页内存，刷新会清空。'
      : (p && p.isDemo
        ? '这是合成示例档案：记录只改本页演示数据，不写库。'
        : '记录会写进当前档案的本机数据库；刷新后仍在。')
  }

  function switchProfile(key) {
    if (!key || key === state.currentKey) return
    state.currentKey = key
    persistCurrentKey()
    state.match = null; state.search = null; state.trialProfile = null; state.saved = []
    renderProfileBar()
    Promise.all([loadRecords()]).then(function () {
      renderSummary(); renderRecords(); loadTrialProfile().then(function () { refreshSaved(); refreshMatch() })
      toast('已切换到：' + ((currentProfile() || {}).name || key))
    })
  }

  /* ---------------- 新建档案 ---------------- */
  function openNewProfileDialog() {
    var existing = document.getElementById('newProfileDialog')
    if (existing) { existing.remove() }
    var dlg = document.createElement('div')
    dlg.id = 'newProfileDialog'
    dlg.setAttribute('role', 'dialog')
    dlg.setAttribute('aria-modal', 'true')
    dlg.setAttribute('aria-labelledby', 'newProfileTitle')
    dlg.style.cssText = 'position:fixed;inset:0;background:rgba(20,24,28,.42);z-index:40;display:flex;align-items:center;justify-content:center;padding:18px'
    dlg.innerHTML = ''
      + '<div style="background:#fff;border:1px solid #d9dde3;max-width:520px;width:100%;padding:18px;max-height:88vh;overflow:auto">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
      + '<div><h2 id="newProfileTitle" style="margin:0 0 4px">新建我的档案</h2>'
      + '<p class="panel-intro" style="margin:0">新档案从空记录开始；演示档案保留、不被覆盖。档案名可以是昵称。</p></div>'
      + '<button class="btn" type="button" data-close="1" aria-label="关闭新建档案">关闭</button></div>'
      + '<form id="newProfileForm" style="margin-top:12px">'
      + '<div class="field"><label for="npName">档案名（必填）</label><input id="npName" name="name" maxlength="40" placeholder="例如：我的记录 / 妈妈的资料"></div>'
      + '<div class="field"><label for="npMeta">一句话说明（可选）</label><input id="npMeta" name="meta" maxlength="60" placeholder="例如：2026 年开始记录"></div>'
      + '<div class="form-actions"><button class="btn btn-primary" type="submit">创建并切换</button>'
      + '<button class="btn" type="button" data-close="1">取消</button>'
      + '<span class="hint" id="npStatus"></span></div>'
      + '</form>'
      + '<p class="note">' + (API_READY ? '创建会写入本机数据库（is_demo=0）。' : '静态演示态：创建只在本次页面内有效，刷新重置。') + '</p>'
      + '</div>'
    document.body.appendChild(dlg)
    function close() { dlg.remove(); $('newProfileButton').focus() }
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.getAttribute('data-close')) close()
    })
    dlg.addEventListener('keydown', function (e) { if (e.key === 'Escape') close() })
    var form = dlg.querySelector('#newProfileForm')
    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var name = dlg.querySelector('#npName').value.trim()
      var meta = dlg.querySelector('#npMeta').value.trim()
      if (!name) { dlg.querySelector('#npStatus').textContent = '请填写档案名'; return }
      if (!API_READY) {
        var key = 'local-demo-' + Date.now().toString(36)
        state.profiles.push({ profileKey: key, name: name, meta: meta || '我自己记录', isDemo: false, createdOn: new Date().toISOString().slice(0, 10) })
        state.records = []
        state.currentKey = key
        close(); renderProfileBar(); renderSummary(); renderRecords()
        toast('演示态：档案只在本次页面内有效，刷新重置')
        return
      }
      dlg.querySelector('#npStatus').textContent = '创建中…'
      apiJson('/subjects', 'POST', { name: name, meta: meta })
        .then(function (res) {
          state.profiles.push({ profileKey: res.profileKey, name: res.name, meta: meta || '我自己记录', isDemo: false, createdOn: new Date().toISOString().slice(0, 10) })
          state.currentKey = res.profileKey
          persistCurrentKey()
          state.records = []; state.match = null; state.search = null; state.trialProfile = null; state.saved = []
          close(); renderProfileBar(); renderSummary(); renderRecords(); refreshSaved(); refreshMatch()
          toast('已创建并切换：' + res.name + '（写入本机数据库）')
        })
        .catch(function (err) { dlg.querySelector('#npStatus').textContent = '创建失败：' + err.message })
    })
    dlg.querySelector('#npName').focus()
  }

  /* ---------------- 记录表单 ---------------- */
  function renderKindStrip() {
    $('kindStrip').innerHTML = KIND_ORDER.map(function (k) {
      return '<button class="kind-button" type="button" data-kind="' + k + '" aria-pressed="'
        + (k === state.currentKind ? 'true' : 'false') + '"><strong>' + KINDS[k].icon + ' ' + KINDS[k].label + '</strong>'
        + '<span>' + (state.records.filter(function (r) { return r.kind === k }).length) + ' 条</span></button>'
    }).join('')
  }

  function renderRecordFields() {
    var def = KINDS[state.currentKind]
    $('recordFields').innerHTML = def.fields.map(function (f, i) {
      var id = 'rf-' + f.name
      if (f.type === 'textarea') {
        return '<div class="field"><label for="' + id + '">' + esc(f.label) + '</label><textarea id="' + id + '" name="' + f.name + '" placeholder="' + esc(f.placeholder || '') + '"></textarea></div>'
      }
      if (f.type === 'check') {
        return '<div class="field"><label class="check-pill"><input type="checkbox" id="' + id + '" name="' + f.name + '"> ' + esc(f.label) + '</label></div>'
      }
      if (f.type === 'multi') {
        return '<fieldset class="field chip-field"><legend>' + esc(f.label) + '</legend><div class="chips">'
          + f.options.map(function (o) {
            return '<label class="chip"><input type="checkbox" name="' + f.name + '" value="' + esc(o) + '"> ' + esc(o) + '</label>'
          }).join('') + '</div></fieldset>'
      }
      var type = f.type === 'date' ? 'date' : 'text'
      return '<div class="field"><label for="' + id + '">' + esc(f.label) + '</label><input type="' + type + '" id="' + id + '" name="' + f.name + '" placeholder="' + esc(f.placeholder || '') + '"></div>'
    }).join('')
  }

  function collectRecord() {
    var def = KINDS[state.currentKind]
    var record = { kind: state.currentKind }
    var empty = true
    def.fields.forEach(function (f) {
      if (f.type === 'multi' || f.type === 'check') {
        var checked = [].slice.call(document.querySelectorAll('#recordFields input[name="' + f.name + '"]:checked'))
        if (f.type === 'check') { record[f.name] = checked.length > 0 } else { record[f.name] = checked.map(function (x) { return x.value }) }
        if (record[f.name] && record[f.name].length) empty = false
      } else {
        var el = document.querySelector('#recordFields [name="' + f.name + '"]')
        var v = el ? el.value.trim() : ''
        if (v) { record[f.name] = v; empty = false }
      }
    })
    return { record: record, empty: empty }
  }

  function saveRecord(e) {
    e.preventDefault()
    if (state.saving) return
    var p = currentProfile()
    if (!p) { toast('先新建一个档案再记录'); return }
    var got = collectRecord()
    if (got.empty) { toast('请至少填写一项内容'); return }
    got.record.id = got.record.kind + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    got.record.createdAt = new Date().toISOString()
    got.record.recordedBy = got.record.recordedBy || '本人'
    got.record.sourceNote = got.record.sourceNote || '本页记录'

    function applyLocal() {
      state.records.push(got.record)
      renderSummary(); renderRecords(); renderKindStrip()
    }
    if (!API_READY || p.isDemo) {
      applyLocal()
      $('recordForm').reset()
      toast(API_READY ? '已加入合成示例（不写库）' : '已加入本页摘要（演示态，刷新重置）')
      return
    }
    state.saving = true
    $('recordSubmit').disabled = true
    apiJson('/subjects/' + encodeURIComponent(p.profileKey) + '/entries', 'POST', { kind: got.record.kind, data: got.record })
      .then(function () {
        applyLocal(); $('recordForm').reset()
        toast('已保存到本机数据库')
      })
      .catch(function (err) { toast('保存失败：' + err.message + '（记录未写入）') })
      .then(function () { state.saving = false; $('recordSubmit').disabled = false })
  }

  /* ---------------- 摘要 ---------------- */
  function summaryText() {
    var records = state.records.filter(function (r) { return !r.private })
    if (!records.length) return '暂无已记录事实。'
    return records.map(function (r, i) {
      var def = KINDS[r.kind] || { label: r.kind }
      var parts = []
      ;['date', 'when', 'observed', 'item', 'value', 'unit', 'name', 'place', 'reason', 'text', 'note'].forEach(function (k) {
        if (r[k] === undefined || r[k] === '' || (Array.isArray(r[k]) && !r[k].length)) return
        parts.push(r[k] instanceof Array ? r[k].join('、') : r[k])
      })
      return (i + 1) + '. [' + def.label + '] ' + parts.join(' · ')
    }).join('\n')
  }

  function renderSummary() {
    var records = state.records.filter(function (r) { return !r.private })
    if (!records.length) {
      $('summaryFacts').innerHTML = '<div class="empty">尚无记录。可以直接跳过，或只添加目前确定的事实。</div>'
      return
    }
    $('summaryFacts').innerHTML = records.map(function (r, i) {
      var def = KINDS[r.kind] || { label: r.kind }
      var parts = []
      ;['date', 'when', 'observed', 'item', 'value', 'unit', 'name', 'place', 'reason', 'text', 'note'].forEach(function (k) {
        if (r[k] === undefined || r[k] === '' || (Array.isArray(r[k]) && !r[k].length)) return
        parts.push('<b>' + k + '：</b>' + esc(r[k] instanceof Array ? r[k].join('、') : r[k]))
      })
      return '<article class="fact"><div class="fact-label">记录 ' + (i + 1) + ' · ' + esc(def.label) + '</div>'
        + '<div class="fact-value">' + parts.join('　') + '</div>'
        + '<div class="fact-source">记录者：' + esc(r.recordedBy || '未填') + ' · 来源：' + esc(r.sourceNote || '未填') + '</div></article>'
    }).join('')
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制到剪贴板') }).catch(fallback)
    } else fallback()
    function fallback() {
      var x = document.createElement('textarea'); x.value = text; document.body.appendChild(x); x.select()
      try { document.execCommand('copy'); toast('已尝试复制；若失败请手动选择文本') } catch (e) { toast('复制失败，请手动选择') }
      x.remove()
    }
  }

  function downloadText() {
    var text = '消化道出血就诊事实摘要（用户记录；非诊断；合成示例已标注）\n\n' + summaryText()
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    var a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = '就诊事实摘要.txt'
    a.click()
    URL.revokeObjectURL(a.href)
    toast('已生成文本文件')
  }

  /* ---------------- 我的记录 ---------------- */
  function recordTitleText(r) {
    var def = KINDS[r.kind] || { label: r.kind }
    var main = r.text || r.name || r.item || (r.observed || []).join('、') || r.reason || (r.place || '') || '（未填写内容）'
    return { label: def.label, main: main, date: r.date || r.when || '' }
  }

  function renderRecords() {
    renderKindStrip()
    var filter = $('recordKindFilter')
    filter.innerHTML = '<option value="">全部类型</option>' + KIND_ORDER.map(function (k) {
      return '<option value="' + k + '">' + KINDS[k].label + '</option>'
    }).join('')
    filter.value = state.kindFilter
    var list = state.records.slice().reverse().filter(function (r) { return !state.kindFilter || r.kind === state.kindFilter })
    $('recordCount').textContent = '共 ' + state.records.length + ' 条' + (state.kindFilter ? ' · 当前筛选 ' + list.length + ' 条' : '')
    if (!list.length) {
      $('recordsList').innerHTML = '<div class="empty">这个筛选下没有记录。可以先在上方切换类型或去「求助与记录」添加。</div>'
      return
    }
    $('recordsList').innerHTML = list.map(function (r) {
      var t = recordTitleText(r)
      return '<article class="record-card" data-record-id="' + esc(r.id) + '">'
        + '<div class="record-main"><div class="record-kind">' + esc(t.label) + (r.private ? '<span class="badge-private">私密</span>' : '') + '</div>'
        + '<div class="record-text">' + esc(t.main) + '</div>'
        + '<div class="record-meta">' + esc(t.date || '日期未填') + ' · 记录者 ' + esc(r.recordedBy || '未填') + ' · 来源 ' + esc(r.sourceNote || '未填') + '</div></div>'
        + '<div class="record-actions">'
        + '<button class="btn btn-small" type="button" data-action="toggle-private" data-id="' + esc(r.id) + '">' + (r.private ? '取消私密' : '设为私密') + '</button>'
        + '<button class="btn btn-small" type="button" data-action="delete" data-id="' + esc(r.id) + '">删除</button>'
        + '</div></article>'
    }).join('')
  }

  function persistRecords(next, successMsg) {
    var p = currentProfile()
    if (!p) return Promise.resolve()
    if (!API_READY || p.isDemo) {
      state.records = next
      renderSummary(); renderRecords(); renderKindStrip()
      toast(API_READY ? '已更新合成示例（不写库）' : '已更新本页记录（演示态，刷新重置）')
      return Promise.resolve()
    }
    return apiJson('/subjects/' + encodeURIComponent(p.profileKey) + '/records', 'PUT', { records: next })
      .then(function () {
        state.records = next
        renderSummary(); renderRecords(); renderKindStrip()
        toast(successMsg || '已保存到本机数据库')
      })
      .catch(function (err) { toast('保存失败：' + err.message + '（界面未更改）') })
  }

  function onRecordsListClick(e) {
    var btn = e.target.closest('[data-action]')
    if (!btn) return
    var id = btn.getAttribute('data-id')
    var action = btn.getAttribute('data-action')
    var idx = state.records.findIndex(function (r) { return String(r.id) === id })
    if (idx < 0) return
    if (action === 'delete') {
      if (!window.confirm('删除这条记录？删除后不可恢复（演示数据刷新可回到默认）。')) return
      var next = state.records.slice(); next.splice(idx, 1)
      persistRecords(next, '记录已删除')
      return
    }
    if (action === 'toggle-private') {
      var copy = state.records.map(function (r) {
        return String(r.id) === id ? Object.assign({}, r, { private: !r.private }) : r
      })
      persistRecords(copy, '私密状态已保存')
    }
  }

  /* ---------------- 试验基础档案 ---------------- */
  function renderTrialProfile() {
    var p = state.trialProfile || {}
    $('tpAge').value = p.age == null ? '' : p.age
    $('tpSex').value = p.sex || ''
    $('tpDiagnosis').value = p.diagnosisConfirmed === true ? 'yes' : p.diagnosisConfirmed === false ? 'no' : ''
    $('tpPregnant').value = p.pregnant || ''
    $('tpNote').value = p.note || ''
    var signs = p.bleedingSigns || []
    $('tpSigns').innerHTML = SIGN_OPTIONS.map(function (s) {
      return '<label class="chip"><input type="checkbox" name="signs" value="' + esc(s) + '"' + (signs.indexOf(s) >= 0 ? ' checked' : '') + '> ' + esc(s) + '</label>'
    }).join('')
    var meds = p.antithrombotic || []
    $('tpMeds').innerHTML = MED_OPTIONS.map(function (s) {
      return '<label class="chip"><input type="checkbox" name="meds" value="' + esc(s) + '"' + (meds.indexOf(s) >= 0 ? ' checked' : '') + '> ' + esc(s) + '</label>'
    }).join('')
  }

  function loadTrialProfile() {
    var p = currentProfile()
    if (!p) { state.trialProfile = null; renderTrialProfile(); return Promise.resolve() }
    if (!API_READY || p.isDemo) { state.trialProfile = null; renderTrialProfile(); return Promise.resolve() }
    return apiFetch('/trial-profile?profileKey=' + encodeURIComponent(p.profileKey))
      .then(function (data) { state.trialProfile = data.profile || null; renderTrialProfile() })
      .catch(function () { state.trialProfile = null; renderTrialProfile() })
  }

  function saveTrialProfile(e) {
    e.preventDefault()
    var p = currentProfile()
    if (!p) { toast('先新建一个档案'); return }
    var input = {
      age: $('tpAge').value.trim(),
      sex: $('tpSex').value,
      diagnosisConfirmed: $('tpDiagnosis').value === 'yes' ? true : $('tpDiagnosis').value === 'no' ? false : null,
      bleedingSigns: [].slice.call(document.querySelectorAll('#tpSigns input:checked')).map(function (x) { return x.value }),
      antithrombotic: [].slice.call(document.querySelectorAll('#tpMeds input:checked')).map(function (x) { return x.value }),
      pregnant: $('tpPregnant').value,
      note: $('tpNote').value.trim(),
    }
    if (!API_READY || p.isDemo) {
      state.trialProfile = Object.assign({}, state.trialProfile || {}, input, { updatedAt: new Date().toISOString() })
      $('trialProfileStatus').textContent = API_READY ? '演示档案：不写库' : '演示态：刷新重置'
      toast('基础档案只在本页（演示态）')
      refreshMatchWithProfile()
      return
    }
    $('trialProfileStatus').textContent = '保存中…'
    apiJson('/trial-profile?profileKey=' + encodeURIComponent(p.profileKey), 'PUT', input)
      .then(function (data) {
        state.trialProfile = data.profile || null
        $('trialProfileStatus').textContent = '已保存到本机数据库'
        refreshMatchWithProfile()
        toast('基础档案已保存')
      })
      .catch(function (err) { $('trialProfileStatus').textContent = '保存失败：' + err.message })
  }

  function refreshMatchWithProfile() {
    refreshMatch()
  }

  /* ---------------- 匹配 / 检索 / 收藏 ---------------- */
  function renderPoolNote(targetId, data, prefix) {
    var el = $(targetId)
    if (!data) { el.textContent = '候选池不可用'; return }
    var pool = data.candidatePool || {}
    var states = (data.sourceStates || []).map(function (s) {
      return s.sourceId + '=' + s.state
    }).join(' · ')
    el.textContent = (prefix || '') + '已载 ' + (pool.loaded || 0) + ' 条 / 返回 ' + (pool.returned || 0) + ' 条 · 相关 ' + (data.relevantCount == null ? '未知' : data.relevantCount)
      + ' 条 · 快照 ' + (data.snapshotDate || '未记录') + ' · 不是全库扫描 · 通道终态：' + (states || '未记录')
      + (data.relevantCount === 0 ? ' · 相关 0 不等于「没有研究」：检索词命中才进池、通道召回有限' : '')
  }

  function bandClassOf(state) { return state === 'mismatch' ? 'state-x' : state === 'unknown' ? 'state-q' : 'state-v' }
  function stateMark(state) { return state === 'mismatch' ? '✕' : state === 'unknown' ? '?' : '✓' }

  function renderMatch() {
    var data = state.match
    if (!data || !data.available) {
      $('matchPoolNote').textContent = (data && data.reason) || '候选池不可用'
      $('matchSummary').textContent = '暂无匹配结果'
      $('matchList').innerHTML = ''
      return
    }
    renderPoolNote('matchPoolNote', data, '候选池口径：')
    $('matchModeTag').hidden = API_READY
    var dist = data.distribution || {}
    $('matchSummary').textContent = '共 ' + data.results.length + ' 条候选 · ' + Object.keys(dist).map(function (k) { return k + ' ' + dist[k] }).join(' / ')
      + (data.profileFilled ? '' : ' · 基础档案还是空的：先填写才会出现可对照项')
    if (!data.results.length) {
      $('matchList').innerHTML = '<div class="empty">没有匹配结果。可以改关键词，或去「检索」查看候选池；相关 0 不等于没有研究。</div>'
      return
    }
    $('matchList').innerHTML = data.results.slice(0, 40).map(function (r) {
      var crit = (r.criteria || []).slice().sort(function (a, b) {
        var rank = { mismatch: 0, unknown: 1, match: 2 }
        return rank[a.state] - rank[b.state]
      })
      var pctHtml = r.pct === null
        ? '<div class="score-box"><strong>—</strong><span>可对照项不足 2 条<br>不给百分数</span></div>'
        : '<div class="score-box"><strong>' + r.pct + '%</strong><span>登记字段符合度</span></div>'
      return '<article class="match-card" data-record-id="' + esc(r.recordId) + '">'
        + '<div class="match-head"><div><h3 class="match-title">' + esc(r.title) + '</h3>'
        + '<div class="match-sub">' + esc(r.recordId) + ' · ' + esc(r.status || '状态未记录') + ' · 快照 ' + esc(r.snapshotDate || '未记录') + '</div></div>'
        + pctHtml + '</div>'
        + '<div class="match-line">' + r.matched + ' / ' + r.denominator + ' 项对得上 · ' + r.unknown + ' 项待确认 · 档位：' + esc(r.band) + '</div>'
        + '<ul class="criteria">' + crit.map(function (c) {
          return '<li class="criterion ' + bandClassOf(c.state) + '"><b>' + stateMark(c.state) + ' ' + esc(c.label) + '</b>'
            + '<div>记录里是：' + esc(c.record) + '</div>'
            + '<div class="crit-req">条件要求：' + esc(c.requirement) + '</div>'
            + (c.evidence ? '<div class="crit-ev">原文线索：' + esc(c.evidence) + '</div>' : '')
            + '</li>'
        }).join('') + '</ul>'
        + '<div class="match-foot"><button class="btn btn-small" type="button" data-save-trial="' + esc(r.recordId) + '">收藏</button>'
        + '<a class="btn btn-small" href="' + esc(r.sourceUrl || '#') + '" target="_blank" rel="noopener" data-external="' + esc(r.sourceUrl || '') + '">打开官方登记页 ↗</a>'
        + '<span class="declaration">不是入组资格 · 登记状态未核实，以官方登记页为准</span></div>'
        + '</article>'
    }).join('')
  }

  function refreshMatch() {
    if (!API_READY) {
      state.match = { available: false, reason: '静态演示态：匹配需要本机服务（真实快照）；这里只演示交互。' }
      renderMatch()
      return Promise.resolve()
    }
    var p = currentProfile()
    if (!p) { state.match = { available: false, reason: '没有档案' }; renderMatch(); return Promise.resolve() }
    var kw = $('matchKeyword').value.trim()
    return apiFetch('/trials/match?profileKey=' + encodeURIComponent(p.profileKey) + '&keyword=' + encodeURIComponent(kw))
      .then(function (data) { state.match = data; renderMatch() })
      .catch(function (err) { state.match = { available: false, reason: '匹配请求失败：' + err.message }; renderMatch() })
  }

  function renderSearchFilters(data) {
    var statuses = (data.candidatePool && data.candidatePool.statuses) || []
    var types = (data.candidatePool && data.candidatePool.studyTypes) || []
    var sel = $('trialStatus')
    var keep = sel.value
    sel.innerHTML = '<option value="">全部状态</option>' + statuses.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>' }).join('')
    sel.value = statuses.indexOf(keep) >= 0 ? keep : ''
    var tsel = $('trialStudyType')
    var keepT = tsel.value
    tsel.innerHTML = '<option value="">全部类型</option>' + types.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>' }).join('')
    tsel.value = types.indexOf(keepT) >= 0 ? keepT : ''
  }

  function renderSearch(data) {
    if (!data || !data.available) {
      $('searchPoolNote').textContent = (data && data.reason) || '候选池不可用'
      $('searchResults').innerHTML = ''
      return
    }
    renderSearchFilters(data)
    renderPoolNote('searchPoolNote', data, '')
    if (!data.records.length) {
      $('searchResults').innerHTML = '<div class="empty">没有命中。可以清空条件重试；相关 0 不等于没有研究（检索词命中才进池、通道召回有限）。</div>'
      return
    }
    $('searchResults').innerHTML = data.records.map(function (r) {
      return '<article class="trial-card"><h3>' + esc(r.title) + '</h3>'
        + '<div class="trial-meta">' + esc(r.recordId) + ' · ' + (r.relevant ? '<span class="tag-ok">相关</span>' : '<span class="tag-x">✕ 相关</span>')
        + ' · ' + esc(r.status || '状态未记录') + ' · ' + esc(r.studyType || '类型未记录') + (r.conditions ? ' · ' + esc(r.conditions) : '') + '</div>'
        + '<div class="match-foot"><button class="btn btn-small" type="button" data-save-trial="' + esc(r.recordId) + '">收藏</button>'
        + '<a class="btn btn-small" href="' + esc(r.sourceUrl || '#') + '" target="_blank" rel="noopener" data-external="' + esc(r.sourceUrl || '') + '">官方登记页 ↗</a>'
        + '<span class="declaration">登记状态未核实；不是入组资格</span></div></article>'
    }).join('')
  }

  function doSearch() {
    if (!API_READY) {
      state.search = { available: false, reason: '静态演示态：检索需要本机服务与真实快照。' }
      renderSearch(state.search); return
    }
    var q = '/trials?keyword=' + encodeURIComponent($('trialKeyword').value.trim())
      + '&status=' + encodeURIComponent($('trialStatus').value)
      + '&studyType=' + encodeURIComponent($('trialStudyType').value)
      + '&relevantOnly=' + ($('trialRelevantOnly').checked ? 'true' : 'false')
    apiFetch(q).then(function (data) { state.search = data; renderSearch(data) })
      .catch(function (err) { state.search = { available: false, reason: '检索失败：' + err.message }; renderSearch(state.search) })
  }

  /* 收藏三态存 localStorage（零副作用；快照无状态时间线，不画进度条）。 */
  function savedStates() {
    try { return JSON.parse(localStorage.getItem('gi-bieeding.savedStates') || '{}') } catch (e) { return {} }
  }
  function savedState(id) { return savedStates()[id] || '在跟' }
  function setSavedState(id, next) {
    var all = savedStates(); all[id] = next
    try { localStorage.setItem('gi-bieeding.savedStates', JSON.stringify(all)) } catch (e) { /* 隐私模式 */ }
  }

  function refreshSaved() {
    if (!API_READY) { state.saved = []; renderSaved(); return Promise.resolve() }
    var p = currentProfile()
    if (!p || p.isDemo) { state.saved = []; renderSaved(); return Promise.resolve() }
    return apiFetch('/saved-trials?profileKey=' + encodeURIComponent(p.profileKey))
      .then(function (data) { state.saved = data.records || []; renderSaved() })
      .catch(function () { state.saved = []; renderSaved() })
  }

  function renderSaved() {
    if (!state.saved.length) {
      $('savedList').innerHTML = '<div class="empty">还没有收藏。在「检索」或「匹配卡」点「收藏」会保存在本机；拒收/取消不会产生副作用。</div>'
      return
    }
    $('savedList').innerHTML = state.saved.map(function (r) {
      var st = savedState(r.recordId)
      return '<article class="saved-card"><h3 style="margin:0 0 3px;font-size:.94rem">' + esc(r.title || r.recordId) + '</h3>'
        + '<div class="trial-meta" style="font-size:.76rem;color:#6b7280">' + esc(r.recordId) + ' · 收藏于 ' + esc(r.savedAt || '') + ' · 快照 ' + esc(r.snapshotDate || '未记录') + ' · 登记状态未核实</div>'
        + '<div class="match-foot"><span class="state-pill">' + esc(st) + '</span>'
        + '<button class="btn btn-small" type="button" data-saved-state="' + esc(r.recordId) + '">切换状态</button>'
        + '<button class="btn btn-small" type="button" data-unsave="' + esc(r.recordId) + '">取消收藏</button></div></article>'
    }).join('')
  }

  function saveTrial(recordId) {
    var p = currentProfile()
    if (!p) { toast('先新建档案'); return }
    if (!API_READY || p.isDemo) { toast(API_READY ? '合成示例档案不写收藏（演示）' : '演示态：收藏需要本机服务'); return }
    var found = null
    ;(state.match && state.match.results || []).forEach(function (r) { if (r.recordId === recordId) found = r })
    ;(state.search && state.search.records || []).forEach(function (r) { if (!found && r.recordId === recordId) found = r })
    apiJson('/saved-trials?profileKey=' + encodeURIComponent(p.profileKey), 'POST', {
      recordId: recordId,
      title: found ? found.title : null,
      studyType: found ? found.studyType : null,
      status: found ? found.status : null,
      sourceUrl: found ? found.sourceUrl : null,
      snapshotDate: found ? found.snapshotDate : (state.trialMeta && state.trialMeta.snapshotDate),
    }).then(function (data) { state.saved = data.records || []; renderSaved(); toast('已收藏到本机（只存登记元信息）') })
      .catch(function (err) { toast('收藏失败：' + err.message) })
  }

  function unsaveTrial(recordId) {
    var p = currentProfile()
    if (!p) return
    apiFetch('/saved-trials?profileKey=' + encodeURIComponent(p.profileKey) + '&recordId=' + encodeURIComponent(recordId), { method: 'DELETE' })
      .then(function (data) { state.saved = data.records || []; renderSaved(); toast('已取消收藏（无其他副作用）') })
      .catch(function (err) { toast('取消失败：' + err.message) })
  }

  /* ---------------- 设置 ---------------- */
  function renderSettings() {
    $('settingsDataDir').textContent = state.dataDir || (API_READY ? '（服务未返回）' : '演示态：未连接本机服务')
    var channels = state.channels || []
    if (!channels.length) {
      $('settingsChannels').innerHTML = '<div class="empty">静态演示态：通道终态需要本机服务读取快照 manifest。</div>'
      return
    }
    var labels = { ready: '已查询', failed: '失败（不算查过）', timeout: '超时（不算查过）', unconfigured: '未配置（不算查过）', partial: '部分召回', truncated: '结果被截断' }
    $('settingsChannels').innerHTML = channels.map(function (c) {
      return '<div class="channel-row"><span>' + esc(c.sourceId) + '</span><span class="channel-state ' + esc(c.state) + '">'
        + esc(labels[c.state] || c.state) + '</span></div>'
    }).join('') + '<p class="note">「相关 0」不等于「没有研究」：只有检索词命中才进池，通道召回有限。快照日期：' + esc((state.trialMeta && state.trialMeta.snapshotDate) || '未记录') + '</p>'
  }

  /* ---------------- 视图路由 ----------------
   * ROUTES 是唯一路由表（check-probe-coverage 读取它并要求全量探针覆盖每一条叶子）。
   * 顶部导航用 home/records/clinical/primer/settings；临床三子页是 clinical/* 叶子。 */
  function setClinicalTab(name) {
    state.clinicalTab = name
    document.querySelectorAll('[data-clinical-tab]').forEach(function (t) {
      var on = t.getAttribute('data-clinical-tab') === name
      t.classList.toggle('active', on)
      t.setAttribute('aria-selected', on ? 'true' : 'false')
      $('clinical-' + t.getAttribute('data-clinical-tab')).hidden = !on
    })
  }
  function showBase(name) {
    ;['home', 'records', 'clinical', 'primer', 'settings'].forEach(function (v) { $('view-' + v).hidden = v !== name })
    document.querySelectorAll('[data-view-link]').forEach(function (link) {
      var target = link.getAttribute('data-view-link')
      var active = target === name || (name === 'clinical' && target === 'clinical')
      link.classList.toggle('active', active)
    })
    if (name === 'settings') renderSettings()
  }
  function pageHome() { showBase('home') }
  function pageRecords() { showBase('records'); renderRecords() }
  function pageClinicalMatch() { showBase('clinical'); setClinicalTab('match'); refreshMatch() }
  function pageClinicalSearch() { showBase('clinical'); setClinicalTab('search'); if (!state.search) doSearch() }
  function pageClinicalSaved() { showBase('clinical'); setClinicalTab('saved'); refreshSaved() }
  function pagePrimer() { showBase('primer') }
  function pageSettings() { showBase('settings') }

  /* 路由清单（check-probe-coverage 读取的唯一来源） */
  var ROUTES = ['home', 'records', 'clinical/match', 'clinical/search', 'clinical/saved', 'primer', 'settings'];
  var ROUTE_PAGES = {
    home: pageHome,
    records: pageRecords,
    'clinical/match': pageClinicalMatch,
    'clinical/search': pageClinicalSearch,
    'clinical/saved': pageClinicalSaved,
    primer: pagePrimer,
    settings: pageSettings,
  }

  function normalizeRoute(name) {
    if (!name) return 'home'
    if (name === 'clinical') return 'clinical/match'
    return ROUTES.indexOf(name) >= 0 ? name : 'home'
  }
  function goto(name) {
    var route = normalizeRoute(name)
    if (location.hash !== '#' + route) {
      if (history.pushState) history.pushState(null, '', '#' + route)
      else location.hash = route
    }
    ROUTE_PAGES[route]()
  }
  function viewFromHash() {
    var h = String(location.hash || '').replace('#', '')
    if (h === 'disease-primer') return null
    return ROUTES.indexOf(h) >= 0 ? h : (h === 'clinical' ? 'clinical/match' : null)
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-view-link]')
      if (link) {
        goto(link.getAttribute('data-view-link'))
        e.preventDefault()
        return
      }
      var tab = e.target.closest('[data-clinical-tab]')
      if (tab) {
        goto('clinical/' + tab.getAttribute('data-clinical-tab'))
        return
      }
      var saveBtn = e.target.closest('[data-save-trial]')
      if (saveBtn) { saveTrial(saveBtn.getAttribute('data-save-trial')); return }
      var unsave = e.target.closest('[data-unsave]')
      if (unsave) { unsaveTrial(unsave.getAttribute('data-unsave')); return }
      var stateBtn = e.target.closest('[data-saved-state]')
      if (stateBtn) {
        var id = stateBtn.getAttribute('data-saved-state')
        var order = ['在跟', '准备问', '已归档']
        setSavedState(id, order[(order.indexOf(savedState(id)) + 1) % order.length])
        renderSaved(); return
      }
      var ext = e.target.closest('[data-external]')
      if (ext) {
        var url = ext.getAttribute('data-external')
        if (!url || url === '#') { e.preventDefault(); return }
        var w = null
        try { w = window.open(url, '_blank', 'noopener') } catch (err) { w = null }
        if (!w && window.parent !== window) {
          try { window.parent.postMessage({ type: 'gastrointestinal-bleeding:open-external', url: url }, window.location.origin) } catch (err) { /* 沙箱静默 */ }
        }
        e.preventDefault()
      }
    })
  }

  function onKindStripClick(e) {
    var b = e.target.closest('[data-kind]')
    if (!b) return
    state.currentKind = b.getAttribute('data-kind')
    renderKindStrip(); renderRecordFields()
    var first = $('recordFields').querySelector('input,select,textarea')
    if (first) first.focus()
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    bindEvents()
    $('kindStrip').addEventListener('click', onKindStripClick)
    $('recordForm').addEventListener('submit', saveRecord)
    $('clearForm').addEventListener('click', function () { $('recordForm').reset(); toast('本次输入已清空') })
    $('skipRecord').addEventListener('click', function () { toast('已跳过记录；急诊求助入口仍可用') })
    $('copySummary').addEventListener('click', function () { copyText('消化道出血就诊事实摘要（用户记录；非诊断）\n' + summaryText()) })
    $('downloadSummary').addEventListener('click', downloadText)
    $('recordsList').addEventListener('click', onRecordsListClick)
    $('recordKindFilter').addEventListener('change', function (e) { state.kindFilter = e.target.value; renderRecords() })
    $('profileSelect').addEventListener('change', function (e) { switchProfile(e.target.value) })
    $('newProfileButton').addEventListener('click', openNewProfileDialog)
    $('trialProfileForm').addEventListener('submit', saveTrialProfile)
    $('matchRefresh').addEventListener('click', refreshMatch)
    $('matchKeyword').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); refreshMatch() } })
    $('trialSearchButton').addEventListener('click', doSearch)
    $('trialKeyword').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doSearch() } })
    $('fontButton').addEventListener('click', function () {
      var big = document.documentElement.style.getPropertyValue('--zoom') === '1.2'
      document.documentElement.style.setProperty('--zoom', big ? '1' : '1.2')
      $('fontButton').textContent = big ? '大字' : '标准字'
    })

    renderKindStrip(); renderRecordFields()
    loadBootstrap().then(function () {
      renderProfileBar()
      return loadRecords()
    }).then(function () {
      renderSummary(); renderRecords(); renderProfileBar()
      renderTrialProfile(); refreshSaved()
      var v = viewFromHash()
      if (v) ROUTE_PAGES[v]()
      $('topStatus').textContent = API_READY
        ? '本机数据 · 不上传 · 不诊断、不分级、不给药'
        : '合成示例数据 · 本机演示 · 不诊断、不分级、不给药'
      if (!API_READY) toast('静态演示态：记录只在本页，刷新重置')
    }).catch(function (err) {
      $('topStatus').textContent = '服务连接失败：' + err.message
      state.profiles = (DEMO.profiles || []).map(function (p) {
        return { profileKey: p.profileKey, name: p.name, meta: p.meta, isDemo: true }
      })
      state.currentKey = state.profiles[0] ? state.profiles[0].profileKey : null
      renderProfileBar(); return loadRecords().then(function () { renderSummary(); renderRecords() })
    })

    window.addEventListener('popstate', function () {
      var v = viewFromHash()
      if (v) ROUTE_PAGES[v]()
    })
    window.addEventListener('hashchange', function () {
      var v = viewFromHash()
      if (v) ROUTE_PAGES[v]()
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()

  /* 给外壳/测试的最小钩子（真实业务不依赖它） */
  window.GIWorkbench = {
    get state() { return state },
    apiReady: API_READY,
  }
})();