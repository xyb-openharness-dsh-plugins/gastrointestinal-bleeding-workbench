/* 消化道出血工作台 · v0.3 业务界面
 *
 * 信息架构（预防 → 管理 → 处置 → 后续）：
 *   看板 / 识别与预防 / 家庭监测 / 急诊与送医 / 指标与评分 /
 *   复诊与后续 / 静脉曲张专项 / 临床研究 / 专科与资源
 *
 * 形态：静态/file:// 读 demo-data；宿主形态（__gibApiReady）走本机 API。
 * 红线：不诊断、不分级、不给药；评分只做「已记录字段的算术对照」，不输出处置结论。
 */
(function () {
  'use strict'

  var API_BASE = '/api/gastrointestinal-bleeding/api'
  var API_READY = !!window.__gibApiReady
  var DEMO = window.GIB_DEMO || { profiles: [] }

  /* ---------------- 导航与页面 ---------------- */
  var ICONS = {
    home: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z"/>',
    shield: '<path d="M12 3 5 6v5.5c0 4.4 3 7.5 7 9.5 4-2 7-5.1 7-9.5V6l-7-3Z"/><path d="m9.2 12 2 2 3.6-4"/>',
    pulse: '<path d="M3 12h3l2-5 3.5 10L14 9l2 3h3"/>',
    siren: '<path d="M6 18v-4a6 6 0 0 1 12 0v4"/><path d="M4 18h16v2H4z"/><path d="M12 3v2M5 5l1.4 1.4M19 5l-1.4 1.4"/>',
    chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 4-6"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    varices: '<path d="M12 3v6"/><path d="M12 9c-3 0-5 2-5 4.5S9.5 19 12 19s5-1 5-4.5S15 9 12 9Z"/><path d="M7 21h10"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/>',
    map: '<path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3V7Z"/><path d="M9 4v13M15 7v13"/>',
  }
  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.home) + '</svg>'
  }

  var PAGES = [
    ['dashboard', '看板', 'home', null, '全程'],
    ['prevent', '识别与预防', 'shield', [['daily', '日常识别'], ['risk', '风险因素'], ['checklist', '预防清单']], '全程'],
    ['monitor', '家庭监测', 'pulse', [['today', '今日记录'], ['all', '全部记录'], ['symptoms', '症状与用药'], ['home-test', '家庭能测什么']], '全程'],
    ['emergency', '急诊与送医', 'siren', [['scene', '现场处理'], ['plan', '送医预案'], ['handoff', '交接摘要']], '全程'],
    ['metrics', '指标与评分', 'chart', [['hb', '血红蛋白趋势'], ['score', '评分模型'], ['reports', '报告对照']], '管理'],
    ['aftercare', '复诊与后续', 'calendar', [['plan', '出院后计划'], ['visits', '复查安排'], ['questions', '问题清单']], '管理'],
    ['varices', '静脉曲张专项', 'varices', [['why', '为什么会发生'], ['monitor', '监测与复查'], ['post-splenectomy', '脾切除后']], '管理'],
    ['clinical', '临床研究', 'flask', [['match', '建档与匹配'], ['search', '检索'], ['saved', '收藏']], '支持'],
    ['resources', '专科与资源', 'map', [['centers', '专科中心'], ['sources', '指南与来源']], '支持'],
  ]
  var ROUTES = [
    'dashboard',
    'prevent', 'prevent/daily', 'prevent/risk', 'prevent/checklist',
    'monitor', 'monitor/today', 'monitor/all', 'monitor/symptoms', 'monitor/home-test',
    'emergency', 'emergency/scene', 'emergency/plan', 'emergency/handoff',
    'metrics', 'metrics/hb', 'metrics/score', 'metrics/reports',
    'aftercare', 'aftercare/plan', 'aftercare/visits', 'aftercare/questions',
    'varices', 'varices/why', 'varices/monitor', 'varices/post-splenectomy',
    'clinical', 'clinical/match', 'clinical/search', 'clinical/saved',
    'resources', 'resources/centers', 'resources/sources',
  ];


  function subLabel(page, slug) {
    var def = PAGES.filter(function (p) { return p[0] === page })[0]
    if (!def || !def[3]) return ''
    var hit = def[3].filter(function (x) { return x[0] === slug })[0]
    return hit ? hit[1] : ''
  }
  function defaultSub(page) {
    var def = PAGES.filter(function (p) { return p[0] === page })[0]
    return def && def[3] ? def[3][0][0] : null
  }

  var KINDS = {
    bleed: { label: '出血观察', short: '出血', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'when', label: '时间（大概即可）', type: 'text', placeholder: '例如：今天凌晨 3 点' },
      { name: 'observed', label: '看到的表现（可多选）', type: 'multi', options: ['呕血', '咖啡渣样呕吐', '黑便', '血便或便血', '头晕或晕厥'] },
      { name: 'vitals', label: '当时测到的生命体征（可选）', type: 'vitals' },
      { name: 'note', label: '原样记录', type: 'textarea', placeholder: '用自己的话记录看到或听到的情况，不需要判断原因' },
    ] },
    lab: { label: '化验', short: '化验', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'item', label: '项目名称（照抄报告）', type: 'text' },
      { name: 'value', label: '数值', type: 'text' },
      { name: 'unit', label: '单位（照抄）', type: 'text' },
      { name: 'note', label: '备注', type: 'text', placeholder: '来源 / 报告名称（可选）' },
    ] },
    treatment: { label: '治疗用药', short: '治疗', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'name', label: '医生告知的处理 / 药物名称', type: 'text', placeholder: '按原话抄，不自己改写剂量' },
      { name: 'note', label: '备注', type: 'text', placeholder: '医嘱来源（可选）' },
    ] },
    question: { label: '要问医生', short: '问题', fields: [
      { name: 'text', label: '想问的问题', type: 'textarea', placeholder: '例如：下次复查要注意什么？' },
    ] },
    hospital: { label: '就诊住院', short: '就诊', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'place', label: '地点（医院/科室）', type: 'text' },
      { name: 'reason', label: '就诊原因（原话）', type: 'text' },
      { name: 'note', label: '备注', type: 'text' },
    ] },
    report: { label: '检查报告', short: '报告', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'name', label: '报告名称', type: 'text' },
      { name: 'note', label: '只抄名称/日期，结论待核', type: 'text', placeholder: '不抄写未核对的结论' },
    ] },
    doc: { label: '资料', short: '资料', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'name', label: '资料名称', type: 'text' },
      { name: 'note', label: '存放位置（可选）', type: 'text', placeholder: '例如：家里文件夹 / 未上传' },
    ] },
    mind: { label: '感受', short: '感受', fields: [
      { name: 'date', label: '日期', type: 'date' },
      { name: 'text', label: '此刻的感受（只给自己看可选私密）', type: 'textarea' },
      { name: 'private', label: '标记为私密（不进摘要/导出）', type: 'check' },
    ] },
  }
  var KIND_ORDER = ['bleed', 'lab', 'treatment', 'question', 'hospital', 'report', 'doc', 'mind']
  var SIGN_OPTIONS = ['呕血', '咖啡渣样呕吐', '黑便', '血便或便血', '头晕或晕厥', '无明显表现']
  var MED_OPTIONS = ['抗凝药', '抗血小板药', '非甾体抗炎药（NSAIDs）', '其他', '未用药', '不清楚']

  var state = {
    page: 'dashboard',
    sub: null,
    profiles: [],
    currentKey: null,
    records: [],
    isDemoProfile: true,
    currentKind: 'bleed',
    kindFilter: '',
    trialProfile: null,
    match: null,
    search: null,
    saved: [],
    channels: [],
    trialMeta: null,
    dataDir: '',
    settingsTab: 'dir',
    saving: false,
  }

  /* ---------------- 小工具 ---------------- */
  var $ = function (id) { return document.getElementById(id) }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  var toastTimer = null
  function toast(msg) {
    var t = $('toast'); if (!t) return
    t.textContent = msg; t.classList.add('show')
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show') }, 2800)
  }
  function fmtDate(d) {
    if (!d) return '日期未填'
    var m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!m) return String(d)
    return m[1] + '.' + m[2] + '.' + m[3]
  }
  function parseDay(d) { var t = Date.parse(String(d || '')); return Number.isFinite(t) ? t : null }
  function daysBetween(a, b) { var x = parseDay(a), y = parseDay(b); if (x == null || y == null) return null; return Math.round((y - x) / 86400000) }
  function currentProfile() { return state.profiles.filter(function (p) { return p.profileKey === state.currentKey })[0] || null }
  function demoProfile(key) { return (DEMO.profiles || []).filter(function (p) { return p.profileKey === key })[0] || null }
  function recordsOf(kind) { return state.records.filter(function (r) { return !kind || r.kind === kind }) }
  function sortedRecords() { return state.records.slice().sort(function (a, b) { return String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')) }) }
  function latest(kind) { var list = sortedRecords().filter(function (r) { return r.kind === kind }); return list[0] || null }
  function isEmergencyRecord(r) { return r && r.kind === 'bleed' && (r.observed || []).some(function (s) { return ['呕血', '咖啡渣样呕吐', '血便或便血', '头晕或晕厥', '黑便'].indexOf(s) >= 0 }) }

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
    return apiFetch(path, { method: method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  }

  function loadBootstrap() {
    if (!API_READY) {
      state.profiles = (DEMO.profiles || []).map(function (p) {
        return { profileKey: p.profileKey, name: p.name, meta: p.meta, avatar: p.avatar, isDemo: true, createdOn: '2026-11-01' }
      })
      state.currentKey = state.profiles[0] ? state.profiles[0].profileKey : null
      return Promise.resolve()
    }
    return apiFetch('/bootstrap').then(function (data) {
      state.profiles = (data.profiles || []).map(function (p) {
        var d = demoProfile(p.profileKey)
        return Object.assign({}, p, { avatar: d ? d.avatar : (p.name || '?').slice(0, 1) })
      })
      state.trialMeta = data.trialSnapshot || null
      state.dataDir = data.dataRoot || ''
      state.channels = (data.trialSnapshot && data.trialSnapshot.sourceStates) || []
      var saved = null
      try { saved = localStorage.getItem('gib.currentProfile') } catch (e) { saved = null }
      state.currentKey = state.profiles.some(function (p) { return p.profileKey === saved }) ? saved : (state.profiles[0] || {}).profileKey
    })
  }
  function persistCurrentKey() { try { localStorage.setItem('gib.currentProfile', state.currentKey || '') } catch (e) { /* 隐私模式 */ } }

  function loadRecords() {
    var p = currentProfile()
    state.isDemoProfile = !p || p.isDemo
    if (!p) { state.records = []; return Promise.resolve() }
    if (!API_READY || p.isDemo) {
      var d = demoProfile(p.profileKey)
      state.records = d ? JSON.parse(JSON.stringify(d.records || [])) : []
      return Promise.resolve()
    }
    return apiFetch('/subjects/' + encodeURIComponent(p.profileKey) + '/records').then(function (data) { state.records = data.records || [] })
  }

  function plan() {
    var d = demoProfile(state.currentKey)
    var saved = null
    try { saved = JSON.parse(localStorage.getItem('gib.plan.' + state.currentKey) || 'null') } catch (e) { saved = null }
    return Object.assign({ nextVisit: '', hospital: '', transport: '', contact: '' }, (d && d.carePlan) || {}, saved || {})
  }
  function savePlan(next) {
    try { localStorage.setItem('gib.plan.' + state.currentKey, JSON.stringify(next)) } catch (e) { /* 隐私模式 */ }
    state.planCache = next
  }

  /* ---------------- 档案 ---------------- */
  function renderProfile() {
    var p = currentProfile()
    $('profileName').textContent = p ? p.name : '（没有档案）'
    $('profileMeta').textContent = p ? (p.meta || '') : ''
    $('profileAvatar').textContent = (p && (p.avatar || (p.name || '?').slice(0, 1))) || '?'
    var chip = $('rootChipText')
    if (chip) chip.textContent = API_READY ? (state.dataDir ? '已连接' : '未设置') : '演示'
    var d = demoProfile(state.currentKey)
    if (d && d.meta) $('profileMeta').textContent = d.meta
  }

  function switchProfile(key) {
    if (!key || key === state.currentKey) return
    state.currentKey = key
    persistCurrentKey()
    state.match = null; state.search = null; state.saved = []; state.trialProfile = null
    renderProfile()
    Promise.all([loadRecords(), loadTrialProfile()]).then(function () {
      renderNav()
      renderPage()
      toast('已切换到：' + ((currentProfile() || {}).name || key))
    })
  }

  function openProfilesDialog() {
    var rows = state.profiles.map(function (p) {
      return '<button class="list-item" style="width:100%;border:0;background:' + (p.profileKey === state.currentKey ? 'var(--teal-soft)' : '#fff') + ';border-radius:10px;padding:10px;text-align:left" data-pick-profile="' + esc(p.profileKey) + '">'
        + '<span class="li-icon">' + esc(p.avatar || p.name.slice(0, 1)) + '</span>'
        + '<span class="li-main"><b>' + esc(p.name) + (p.isDemo ? '<span class="tag">合成示例</span>' : '') + '</b><p>' + esc(p.meta || '') + '</p></span>'
        + '<span class="li-side">' + (p.profileKey === state.currentKey ? '当前' : '切换') + '</span></button>'
    }).join('')
    openDialog({
      eyebrow: '患者档案',
      title: '我的档案',
      body: '<div class="stack">' + rows + '</div>'
        + '<div class="alert info" style="margin-top:14px">合成示例档案只改演示数据，不写库；新建的档案写入本机数据库（is_demo=0），刷新后仍在。</div>',
      foot: '<button class="btn-ghost" type="button" data-action="close-dialog">关闭</button><button class="btn-primary" type="button" data-action="new-profile">＋ 新建我的档案</button>',
    })
  }

  function openNewProfileDialog() {
    openDialog({
      eyebrow: '患者档案',
      title: '新建我的档案',
      body: '<p class="small-note" style="margin-bottom:12px">档案名可以是昵称；新档案从空记录开始，演示档案保留、不被覆盖。</p>'
        + '<div class="field"><label for="npName">档案名（必填）</label><input id="npName" maxlength="40" placeholder="例如：我的记录 / 妈妈的资料"></div>'
        + '<div class="field" style="margin-top:10px"><label for="npMeta">一句话说明（可选）</label><input id="npMeta" maxlength="60" placeholder="例如：2026 年开始记录"></div>'
        + '<p class="small-note" style="margin-top:10px">' + (API_READY ? '创建后写入本机数据库。' : '静态演示态：只在本次页面内有效，刷新重置。') + '</p>',
      foot: '<button class="btn-ghost" type="button" data-action="close-dialog">取消</button><button class="btn-primary" type="button" data-action="create-profile">创建并切换</button>',
    })
  }

  function createProfileFromDialog() {
    var name = ($('npName') && $('npName').value || '').trim()
    var meta = ($('npMeta') && $('npMeta').value || '').trim()
    if (!name) { toast('请填写档案名'); return }
    if (!API_READY) {
      var key = 'local-demo-' + Date.now().toString(36)
      state.profiles.push({ profileKey: key, name: name, meta: meta || '我自己记录', avatar: name.slice(0, 1), isDemo: false, createdOn: new Date().toISOString().slice(0, 10) })
      state.currentKey = key; state.records = []
      closeDialog(); renderProfile(); renderNav(); renderPage()
      toast('演示态：档案只在本次页面内有效，刷新重置')
      return
    }
    apiJson('/subjects', 'POST', { name: name, meta: meta }).then(function (res) {
      state.profiles.push({ profileKey: res.profileKey, name: res.name, meta: meta || '我自己记录', avatar: res.name.slice(0, 1), isDemo: false, createdOn: new Date().toISOString().slice(0, 10) })
      state.currentKey = res.profileKey; persistCurrentKey()
      state.records = []; state.match = null; state.search = null; state.saved = []
      closeDialog(); renderProfile(); renderNav(); renderPage()
      toast('已创建并切换：' + res.name + '（写入本机数据库）')
    }).catch(function (err) { toast('创建失败：' + err.message) })
  }

  /* ---------------- 记录读写 ---------------- */
  function persistRecords(next, msg) {
    var p = currentProfile()
    if (!p) return Promise.resolve()
    if (!API_READY || p.isDemo) {
      state.records = next
      renderPage()
      toast(API_READY ? '已更新合成示例（不写库）' : '已更新本页记录（演示态，刷新重置）')
      return Promise.resolve()
    }
    return apiJson('/subjects/' + encodeURIComponent(p.profileKey) + '/records', 'PUT', { records: next })
      .then(function () { state.records = next; renderPage(); toast(msg || '已保存到本机数据库') })
      .catch(function (err) { toast('保存失败：' + err.message + '（界面未更改）') })
  }

  function addRecord(kind, data) {
    var p = currentProfile()
    if (!p) { toast('先新建一个档案再记录'); return Promise.resolve(false) }
    var record = Object.assign({}, data, { id: kind + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), kind: kind, createdAt: new Date().toISOString(), recordedBy: data.recordedBy || '本人', sourceNote: data.sourceNote || '本页记录' })
    var next = state.records.concat([record])
    if (!API_READY || p.isDemo) {
      state.records = next
      toast(API_READY ? '已加入合成示例（不写库）' : '已加入本页记录（演示态，刷新重置）')
      renderPage(); return Promise.resolve(true)
    }
    return apiJson('/subjects/' + encodeURIComponent(p.profileKey) + '/entries', 'POST', { kind: kind, data: record })
      .then(function () { state.records = next; renderPage(); toast('已保存到本机数据库'); return true })
      .catch(function (err) { toast('保存失败：' + err.message); return false })
  }

  function deleteRecord(id) {
    var idx = state.records.findIndex(function (r) { return String(r.id) === String(id) })
    if (idx < 0) return
    var next = state.records.slice(); next.splice(idx, 1)
    persistRecords(next, '记录已删除')
  }
  function togglePrivate(id) {
    var next = state.records.map(function (r) { return String(r.id) === String(id) ? Object.assign({}, r, { private: !r.private }) : r })
    persistRecords(next, '私密状态已保存')
  }

  /* ---------------- 摘要 ---------------- */
  function summaryText() {
    var records = sortedRecords().filter(function (r) { return !r.private }).reverse()
    if (!records.length) return '暂无已记录事实。'
    return records.map(function (r, i) {
      var def = KINDS[r.kind] || { label: r.kind }
      var parts = []
      ;['date', 'when', 'observed', 'item', 'value', 'unit', 'name', 'place', 'reason', 'text', 'note'].forEach(function (k) {
        if (r[k] === undefined || r[k] === '' || (Array.isArray(r[k]) && !r[k].length)) return
        parts.push(Array.isArray(r[k]) ? r[k].join('、') : r[k])
      })
      if (r.vitals && (r.vitals.sbp || r.vitals.hr)) parts.push('血压 ' + (r.vitals.sbp || '未测') + ' / 脉搏 ' + (r.vitals.hr || '未测'))
      return (i + 1) + '. [' + def.label + '] ' + parts.join(' · ')
    }).join('\n')
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
    var blob = new Blob(['消化道出血就诊事实摘要（用户记录；非诊断；合成示例已标注）\n\n' + summaryText()], { type: 'text/plain;charset=utf-8' })
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '就诊事实摘要.txt'; a.click(); URL.revokeObjectURL(a.href)
    toast('已生成文本文件')
  }

  /* ---------------- 指标 ---------------- */
  function hbSeries() {
    return state.records.filter(function (r) { return r.kind === 'lab' && /血红蛋白|(^|\W)Hb($|\W)/i.test(String(r.item || '')) && Number.isFinite(Number(r.value)) })
      .map(function (r) { return { date: r.date, value: Number(r.value), unit: r.unit || 'g/L', source: r.sourceNote || '' } })
      .filter(function (p) { return p.date && Number.isFinite(p.value) })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)) })
  }
  function latestLab(re) {
    var list = state.records.filter(function (r) { return r.kind === 'lab' && re.test(String(r.item || '')) && r.value !== undefined && r.value !== '' })
      .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')) })
    return list[0] || null
  }
  function vitalsLatest() {
    var list = state.records.filter(function (r) { return r.vitals && (r.vitals.sbp || r.vitals.hr) }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')) })
    return (list[0] && list[0].vitals) || null
  }

  /* Fritsch–Carlson 单调三次插值：点少、有波动时不会过冲（16 号口径）。 */
  function monotonePath(points) {
    var n = points.length
    if (n < 2) return ''
    var dx = [], dy = [], m = []
    for (var i = 0; i < n - 1; i++) { dx.push(points[i + 1].x - points[i].x); dy.push(points[i + 1].y - points[i].y); m.push(dy[i] / dx[i]) }
    var t = [m[0]]
    for (var j = 1; j < n - 1; j++) {
      if (m[j - 1] * m[j] <= 0) t.push(0)
      else t.push(3 * (dx[j - 1] + dx[j]) / ((2 * dx[j] + dx[j - 1]) / m[j - 1] + (dx[j] + 2 * dx[j - 1]) / m[j]))
    }
    t.push(m[n - 2])
    var d = 'M' + points[0].x + ',' + points[0].y
    for (var k = 0; k < n - 1; k++) {
      var h = dx[k]
      d += ' C' + (points[k].x + h / 3) + ',' + (points[k].y + t[k] * h / 3) + ' ' + (points[k + 1].x - h / 3) + ',' + (points[k + 1].y - t[k + 1] * h / 3) + ' ' + points[k + 1].x + ',' + points[k + 1].y
    }
    return d
  }

  function hbChart(series, opts) {
    opts = opts || {}
    var W = 620, H = 210, L = 44, R = 16, T = 16, B = 34
    if (!series.length) return '<div class="empty">还没有录入血红蛋白数值。可以从化验单抄一条，图表只按你录入的数值画，不做判断。</div>'
    var vals = series.map(function (s) { return s.value })
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals)
    var pad = Math.max(4, (max - min) * 0.25)
    var y0 = Math.floor((min - pad) / 10) * 10, y1 = Math.ceil((max + pad) / 10) * 10
    if (y1 - y0 < 20) y1 = y0 + 20
    var times = series.map(function (s) { return parseDay(s.date) }).filter(function (t) { return t != null })
    var t0 = Math.min.apply(null, times), t1 = Math.max.apply(null, times)
    if (t1 === t0) t1 = t0 + 86400000
    function xOf(date) { var t = parseDay(date); if (t == null) return L; return L + (t - t0) / (t1 - t0) * (W - L - R) }
    function yOf(v) { return T + (y1 - v) / (y1 - y0) * (H - T - B) }
    var pts = series.map(function (s) { return { x: xOf(s.date), y: yOf(s.value), v: s.value, d: s.date } })
    var line = pts.length >= 2 ? monotonePath(pts) : ''
    var grid = ''
    for (var g = y0; g <= y1; g += 10) {
      grid += '<line class="gridline" x1="' + L + '" y1="' + yOf(g) + '" x2="' + (W - R) + '" y2="' + yOf(g) + '"/>'
        + '<text class="axis-label" x="' + (L - 8) + '" y="' + (yOf(g) + 3) + '" text-anchor="end">' + g + '</text>'
    }
    var xLabels = ''
    var step = Math.ceil(series.length / 4)
    series.forEach(function (s, i) {
      if (i % step !== 0 && i !== series.length - 1) return
      xLabels += '<text class="axis-label" x="' + xOf(s.date) + '" y="' + (H - 12) + '" text-anchor="middle">' + fmtDate(s.date).slice(5) + '</text>'
    })
    var marks = pts.map(function (p) {
      return '<circle class="point" cx="' + p.x + '" cy="' + p.y + '" r="4.2"/>'
        + '<text class="point-label" x="' + p.x + '" y="' + (p.y - 10) + '" text-anchor="middle">' + p.v + '</text>'
    }).join('')
    var single = pts.length === 1 ? '<text class="axis-label" x="' + (L + 8) + '" y="' + (T + 12) + '">只有 1 次记录：只画点，不连线</text>' : ''
    return '<div class="chart-wrap"><svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="血红蛋白按日期绘制的趋势图，数值来自你录入的化验记录">'
      + '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="none"/>'
      + grid + xLabels + single
      + (line ? '<path class="line" d="' + line + '"/>' : '')
      + marks
      + '</svg></div>'
      + '<p class="small-note" style="margin-top:6px">纵轴按本条指标全期最小/最大值自适应，不同指标之间不可直接比高低；单点不连线；单位与检测方法以原始报告为准。图中不画治疗条，治疗事件在下方单列。</p>'
  }

  /* ---------------- 评分模型（只做算术对照） ---------------- */
  function gbsInputs() {
    var b = latest('bleed')
    var bun = latestLab(/尿素氮|BUN/i)
    var hb = latestLab(/血红蛋白|(^|\W)Hb($|\W)/i)
    return {
      bun: bun ? Number(bun.value) : null,
      hb: hb ? Number(hb.value) : null,
      sbp: b && b.vitals ? b.vitals.sbp : null,
      hr: b && b.vitals ? b.vitals.hr : null,
      melena: b ? (b.observed || []).indexOf('黑便') >= 0 : null,
      syncope: b ? (b.observed || []).some(function (s) { return s.indexOf('头晕') >= 0 || s.indexOf('晕厥') >= 0 }) : null,
      liver: state.trialProfile && state.trialProfile.liverDisease != null ? state.trialProfile.liverDisease : null,
      cardiac: state.trialProfile && state.trialProfile.heartFailure != null ? state.trialProfile.heartFailure : null,
      date: b ? b.date : (hb ? hb.date : null),
      sex: state.trialProfile && state.trialProfile.sex ? state.trialProfile.sex : null,
    }
  }
  function gbsScore(input) {
    var missing = []
    if (input.bun == null) missing.push('尿素氮')
    if (input.hb == null) missing.push('血红蛋白')
    if (input.sbp == null) missing.push('收缩压')
    if (input.hr == null) missing.push('脉搏')
    if (input.melena == null) missing.push('黑便')
    if (input.syncope == null) missing.push('晕厥')
    if (input.liver == null) missing.push('肝病')
    if (input.cardiac == null) missing.push('心衰')
    if (missing.length) return { total: null, missing: missing }
    var bun = input.bun < 6.5 ? 0 : input.bun < 8 ? 2 : input.bun < 10 ? 3 : input.bun < 25 ? 4 : 6
    var female = input.sex === 'female'
    var hbScore
    if (female) hbScore = input.hb >= 120 ? 0 : input.hb >= 100 ? 1 : input.hb >= 80 ? 3 : 6
    else hbScore = input.hb >= 130 ? 0 : input.hb >= 120 ? 1 : input.hb >= 100 ? 3 : input.hb >= 80 ? 6 : 6
    var sbp = input.sbp >= 110 ? 0 : input.sbp >= 100 ? 1 : input.sbp >= 90 ? 2 : 3
    var hr = input.hr >= 100 ? 1 : 0
    return { total: bun + hbScore + sbp + hr + (input.melena ? 1 : 0) + (input.syncope ? 2 : 0) + (input.liver ? 2 : 0) + (input.cardiac ? 2 : 0), missing: [] }
  }
  function aimsInputs() {
    var alb = latestLab(/白蛋白|ALB/i)
    var inr = latestLab(/INR|国际标准化比值/i)
    var v = vitalsLatest()
    return {
      albumin: alb ? Number(alb.value) : null,
      inr: inr ? Number(inr.value) : null,
      mental: null,
      sbp: v ? v.sbp : null,
      age: state.trialProfile ? state.trialProfile.age : null,
    }
  }

  /* ---------------- 专科中心与来源（公开资料整理，非排序） ---------------- */
  var CENTERS = [
    {
      name: '首都医科大学附属北京友谊医院 · 消化中心',
      region: '北京',
      tags: ['7×24 小时消化道出血绿色通道', '急诊内镜', '国家消化系统疾病临床医学研究中心'],
      note: '公开报道：消化中心联合急诊科建立 7×24 小时急危重症绿色通道，2022 年急诊内镜近 1400 例次；顺义、通州院区同质化管理。',
      src: '北京市卫健委公开报道（2023–2024）',
      url: 'https://wjw.beijing.gov.cn/xwzx_20031/jcdt/202302/t20230222_2922082.html',
    },
    {
      name: '空军军医大学西京医院 · 消化内科（西京消化病医院）',
      region: '西安',
      tags: ['食管胃底静脉曲张内镜治疗（EIS/EVL/ESVD）', 'TIPS', '内镜中心'],
      note: '公开资料：消化内科设内镜中心，开展食管胃底静脉曲张内镜治疗与 TIPS；陕西省胃肠病诊治中心。',
      src: '医院/科室公开介绍与医生出诊信息（第三方平台）',
      url: 'https://www.youlai.cn/yyk/hospindex/1822/hospdeptintro_67756.html',
    },
    {
      name: '海军军医大学第一附属医院（上海长海医院）· 消化内科',
      region: '上海',
      tags: ['国家消化病临床医学研究中心', '上消化道出血', '胶囊内镜急诊分拣'],
      note: '公开资料：国家消化病临床医学研究中心、国家消化内科专业质控中心；公开报道提及急性上消化道出血的胶囊内镜初诊与急诊分拣。',
      src: '医院公开介绍与公开报道（2022）',
      url: 'https://www.thepaper.cn/newsDetail_forward_17919521',
    },
    {
      name: '复旦大学附属中山医院 · 消化科 / 内镜中心',
      region: '上海',
      tags: ['内镜诊疗', '消化道出血综合治疗', '肝病与门脉高压'],
      note: '公开资料：国内较早开展胃镜、结肠镜、ERCP；内镜中心开展 ESD、POEM 等；消化科设肝病与门脉高压相关诊治。',
      src: '医院/科室公开介绍（第三方平台）',
      url: 'https://www.bohe.cn/hospital/114/department/3352.html',
    },
    {
      name: '四川大学华西医院 · 消化内科',
      region: '成都',
      tags: ['消化道出血亚专业组', 'TIPS', '国家临床重点专科'],
      note: '公开资料：消化内科设消化道出血亚专业组；TIPS 等门脉高压介入处于国内领先；西南地区消化疑难重症诊治中心。',
      src: '医院官网科室介绍',
      url: 'https://www.wchscu.cn/department_xhnk.html',
    },
    {
      name: '中国医学科学院北京协和医院 · 消化内科',
      region: '北京',
      tags: ['疑难消化病', '消化道出血', '多学科会诊'],
      note: '公开资料：综合医院多学科协作与疑难消化病诊治；具体急诊内镜安排以医院官方为准。',
      src: '医院公开介绍（待院方页面复核）',
      url: 'https://www.pumch.cn/',
    },
  ]
  var SOURCES = [
    { name: '急性非静脉曲张性上消化道出血诊治指南（2018 年，杭州）', org: '中国医师协会内镜医师分会等', year: '2019 发表', status: '期刊平台 PDF 可读；未逐条引用', url: 'https://jwch.ccmu.edu.cn/docs/2022-10/74c5f5e9500241d6bf4fb627c2b9850f.pdf' },
    { name: '急性上消化道出血急诊诊治流程专家共识（2020 版）', org: '中国医师协会急诊医师分会', year: '2021 发表', status: '学会页面可读；未取得 PDF 原件', url: 'https://csg.cma.org.cn/csg/a/irzs40' },
    { name: '急性非静脉曲张性上消化道出血多学科防治共识', org: '消化/外科/药学/介入等多学科', year: '2019', status: '题录可读；原件未取得', url: 'https://www.shsma.org.cn/web/weixin/2426' },
    { name: '肝硬化门静脉高压食管胃静脉曲张出血的防治指南', org: '中华医学会肝病学分会等', year: '2022', status: '官方全文页可读；未本地留存', url: 'https://cs.medjournals.cn/article/doi/full/10.3760/cma.j.cn501113-20220824-00436-1' },
    { name: 'Endoscopic diagnosis and management of peptic ulcer bleeding: Guideline Update', org: 'ESGE', year: '2026', status: '官方 PDF 链接已取得；尚未逐条核验', url: 'https://www.esge.com/assets/downloads/pdfs/guidelines/2026_a-2863-8314.pdf' },
    { name: 'Left-sided portal hypertension: Update and proposition of a management algorithm', org: 'J Visc Surg', year: '2024', status: '题录已核（PMID 38142180）；原件未取得', url: 'https://pubmed.ncbi.nlm.nih.gov/38142180/' },
    { name: 'Left-sided portal hypertension secondary to pancreatic cancer（48 例）', org: 'PubMed', year: '2012', status: '题录已核（PMID 23298872）；原件未取得', url: 'https://pubmed.ncbi.nlm.nih.gov/23298872/' },
  ]

  /* ---------------- 通用片段 ---------------- */
  function pageHead(title, intro, actions) {
    return '<div class="page-head"><div><span class="eyebrow">消化道出血 · 全程管理</span><h1>' + esc(title) + '</h1><p>' + intro + '</p></div>'
      + '<div class="page-actions">' + (actions || '') + '</div></div>'
  }
  function subnav(page) {
    var def = PAGES.filter(function (p) { return p[0] === page })[0]
    if (!def || !def[3]) return ''
    var current = state.sub || def[3][0][0]
    return '<nav class="subnav" role="tablist" aria-label="' + esc(def[1]) + '二级页面">' + def[3].map(function (s) {
      return '<button type="button" role="tab" aria-selected="' + (s[0] === current ? 'true' : 'false') + '" data-sub="' + esc(s[0]) + '">' + esc(s[1]) + '</button>'
    }).join('') + '</nav>'
  }
  function sourceLine(text) { return '<p class="source-line">' + text + '</p>' }

  /* ---------------- 看板 ---------------- */
  function pageDashboard() {
    var p = currentProfile() || {}
    var d = demoProfile(state.currentKey) || {}
    var hb = hbSeries()
    var lastHb = hb.length ? hb[hb.length - 1] : null
    var lastBleed = latest('bleed')
    var next = plan().nextVisit
    var days = next ? daysBetween(new Date().toISOString().slice(0, 10), next) : null
    var lastBleedDays = lastBleed ? daysBetween(lastBleed.date, new Date().toISOString().slice(0, 10)) : null
    var questions = recordsOf('question').length
    var meds = state.trialProfile && state.trialProfile.antithrombotic && state.trialProfile.antithrombotic.length
      ? state.trialProfile.antithrombotic.join(' / ')
      : (recordsOf('treatment').filter(function (r) { return /抗凝|抗血小板|阿司匹林|氯吡格雷|华法林/i.test(r.name || '') }).length ? '记录里有抗栓药（见用药记录）' : '未登记')
    var summary = d.summary || '把观察到的事实记下来，就诊时更容易说清楚。'
    var steps = [
      ['01', '预防', '识别风险因素与需要马上求助的表现', 'prevent'],
      ['02', '管理', '记录症状、化验、用药和家庭能测的指标', 'monitor'],
      ['03', '处置', '出现警示表现时先求助，带什么、怎么去', 'emergency'],
      ['04', '后续', '出院后复查、问题清单与静脉曲张随访', 'aftercare'],
    ].map(function (s) {
      return '<button class="path-card" type="button" data-goto="' + s[3] + '"><span class="path-num">' + s[0] + '</span><b>' + s[1] + '</b><span>' + s[2] + '</span></button>'
    }).join('')

    return pageHead('看板', '把「现在要不要求助」放在第一屏，其余按预防 → 管理 → 处置 → 后续慢慢准备。',
      '<button class="btn-primary" type="button" data-goto="monitor/today">记录一次</button><button class="btn-ghost" type="button" data-goto="emergency/handoff">带摘要就诊</button>')
      + '<div class="emergency-strip"><div><strong>出现呕血、咖啡渣样呕吐、黑便/血便，或头晕到站不稳</strong><span>不要等待填写记录，先拨打 120 或去最近的急诊；本页不判断出血量，也不能排除危险。</span></div>'
      + '<div class="row"><a class="btn-danger" href="tel:120" aria-label="拨打 120">拨打 120</a><button class="btn-ghost" type="button" data-goto="emergency/scene">现场怎么做</button></div></div>'
      + '<section class="hero"><div class="hero-copy"><span class="eyebrow">' + esc(p.isDemo ? '合成示例 · 全程演示' : '我的档案') + '</span><h1>' + esc((p.name || '').replace(/\s*·.*$/, '') || '你好') + '，今天先看这三件事</h1>'
      + '<p>' + esc(summary) + '</p>'
      + '<div class="hero-actions"><button class="btn-primary" type="button" data-goto="monitor/today">记一次今天的情况</button><button class="btn-ghost" type="button" data-goto="aftercare/questions">整理要问医生的问题</button><button class="btn-ghost" type="button" data-action="export-summary">导出交接摘要</button></div></div>'
      + '<aside class="hero-side"><h2>全程四步</h2>' + steps + '</aside></section>'
      + '<div class="stat-row">'
      + '<div class="stat-tile ' + (lastBleed && lastBleedDays != null && lastBleedDays <= 14 ? 'alert' : '') + '"><span>最近一次出血记录</span><b>' + (lastBleed ? fmtDate(lastBleed.date) : '还没有') + '</b><small>' + (lastBleedDays != null ? lastBleedDays + ' 天前' : '记录后可回看') + '</small></div>'
      + '<div class="stat-tile ' + (lastHb && lastHb.value < 100 ? 'alert' : 'ok') + '"><span>最近血红蛋白</span><b>' + (lastHb ? lastHb.value : '未录入') + (lastHb ? ' <small style="display:inline">' + esc(lastHb.unit) + '</small>' : '') + '</b><small>' + (lastHb ? fmtDate(lastHb.date) : '从化验单抄一条') + '</small></div>'
      + '<div class="stat-tile"><span>抗栓药登记</span><b style="font-size:15px;line-height:1.5;margin-top:6px">' + esc(meds) + '</b><small>药名与剂量以处方为准</small></div>'
      + '<div class="stat-tile"><span>下次复查（自填）</span><b style="font-size:17px">' + (next ? fmtDate(next) : '未填') + '</b><small>' + (days != null ? (days >= 0 ? days + ' 天后' : '已过 ' + (-days) + ' 天') : '在「复诊与后续」里填') + '</small></div>'
      + '</div>'
      + '<div class="grid side">'
      + '<section class="card"><div class="card-head"><div><h3>血红蛋白趋势</h3><p>只按你录入的化验值画；不判断高低，也不替代医生看报告。</p></div><button class="btn-link" type="button" data-goto="metrics/hb">看完整页</button></div>'
      + hbChart(hb)
      + sourceLine('来源：你的化验记录（' + hb.length + ' 次）· 参考范围与检测方法以原始报告为准。') + '</section>'
      + '<section class="card"><div class="card-head"><div><h3>就诊前准备</h3><p>把要带的东西和要问的问题放在一起。</p></div></div>'
      + '<div class="list">'
      + '<div class="list-item"><span class="li-icon">问</span><span class="li-main"><b>要问医生的问题</b><p>' + (questions ? questions + ' 条已记录' : '还没有记录') + '</p></span><button class="btn-link" type="button" data-goto="aftercare/questions">整理</button></div>'
      + '<div class="list-item"><span class="li-icon">带</span><span class="li-main"><b>就诊要带的资料</b><p>出院小结、胃镜报告、用药清单、化验单</p></span><button class="btn-link" type="button" data-goto="emergency/handoff">清单</button></div>'
      + '<div class="list-item"><span class="li-icon">院</span><span class="li-main"><b>送医预案</b><p>' + esc(plan().hospital || '还没填常去的医院与路线') + '</p></span><button class="btn-link" type="button" data-goto="emergency/plan">填写</button></div>'
      + '</div>'
      + '<div class="alert info" style="margin-top:12px">这份工作台只整理事实与准备事项，不诊断、不分级、不给药。处置由接诊医生决定。</div></section>'
      + '</div>'
      + '<section class="section"><div class="section-head"><h2>最近记录</h2><button class="btn-link" type="button" data-goto="monitor/all">全部记录</button></div>'
      + recentRecords(6) + '</section>'
      + '<section class="section"><div class="section-head"><h2>与你情况相关的两条线</h2><p>都只是「可以问医生」的方向，不是结论。</p></div>'
      + '<div class="grid two">'
      + '<div class="card"><div class="card-head"><div><h3>普通溃疡/糜烂出血</h3><p>常见相关因素：止痛药、幽门螺杆菌、既往溃疡史。</p></div><span class="badge teal">预防线</span></div><button class="btn-ghost" type="button" data-goto="prevent/risk">看风险因素</button></div>'
      + '<div class="card"><div class="card-head"><div><h3>静脉曲张出血（如有肝硬化或脾静脉问题）</h3><p>与普通溃疡出血的随访节奏不同，复查胃镜由医生安排。</p></div><span class="badge plum">专项线</span></div><button class="btn-ghost" type="button" data-goto="varices">看专项说明</button></div>'
      + '</div></section>'
      + '<section class="section"><div class="section-head"><h2>专科资源</h2><button class="btn-link" type="button" data-goto="resources/centers">全部</button></div>'
      + '<div class="grid three">' + CENTERS.slice(0, 3).map(function (c) {
        return '<div class="card center-card"><div class="center-top"><h4>' + esc(c.name.split(' · ')[0]) + '</h4><span class="badge outline">' + esc(c.region) + '</span></div><p>' + esc(c.note) + '</p><div class="tags">' + c.tags.slice(0, 2).map(function (t) { return '<span class="badge">' + esc(t) + '</span>' }).join('') + '</div></div>'
      }).join('') + '</div>'
      + '<p class="small-note" style="margin-top:8px">公开资料整理，非排序、非推荐；出诊、急诊与转诊安排以医院官方为准。</p></section>'
  }

  function recentRecords(n) {
    var list = sortedRecords().filter(function (r) { return !r.private }).slice(0, n)
    if (!list.length) return '<div class="empty">还没有记录。可以先从「记一次今天的情况」开始。</div>'
    return '<div class="card flush"><div style="padding:4px 20px">' + list.map(function (r) {
      var def = KINDS[r.kind] || { label: r.kind }
      var main = r.text || r.name || r.item || (r.observed || []).join('、') || r.reason || r.place || r.note || '（未填写内容）'
      return '<div class="record-row"><span class="record-kind">' + esc(def.label) + '</span><span class="record-main"><b>' + esc(main) + '</b><span>' + fmtDate(r.date) + ' · ' + esc(r.sourceNote || '本页记录') + '</span></span></div>'
    }).join('') + '</div></div>'
  }

  /* ---------------- 识别与预防 ---------------- */
  function pagePrevent() {
    var sub = state.sub || 'daily'
    var body = ''
    if (sub === 'daily') {
      var signs = [
        ['呕血', '呕吐物带血或呈暗红色', '立即急诊'],
        ['咖啡渣样呕吐', '呕吐物像咖啡渣', '立即急诊'],
        ['黑便', '柏油样、发黑发亮，可能有臭味', '尽快急诊评估'],
        ['血便或便血', '鲜红或暗红色血便', '尽快急诊评估'],
        ['头晕或晕厥', '站起时眼前发黑、晕倒', '立即求助，不要自己开车'],
        ['心慌、乏力、面色苍白', '可能与失血有关，也可能有其它原因', '尽快就医确认'],
      ]
      body = '<div class="grid two">'
        + '<section class="card"><div class="card-head"><div><h3>出现这些表现：先求助，不要等记录</h3><p>本页只帮你认出「该不该现在去医院」，不判断出血量与原因。</p></div><span class="badge coral">警示表现</span></div>'
        + '<div class="list">' + signs.map(function (s) {
          return '<div class="list-item"><span class="li-icon">!</span><span class="li-main"><b>' + esc(s[0]) + '</b><p>' + esc(s[1]) + '</p></span><span class="li-side"><span class="badge ' + (s[2] === '立即急诊' ? 'coral' : 'amber') + '">' + esc(s[2]) + '</span></span></div>'
        }).join('') + '</div>'
        + '<div class="alert danger" style="margin-top:12px"><strong>不要用「看起来不多」安慰自己。</strong>出血量和危险程度不能凭外观估计；正在服用抗凝/抗血小板药的人尤其不要自行停药或加药，先联系医生或急诊。</div>'
        + sourceLine('来源：急性非静脉曲张性上消化道出血诊治指南（2018 杭州）与急诊共识（2020 版）的临床表现描述；患者版措辞待临床审阅。') + '</section>'
        + '<section class="card"><div class="card-head"><div><h3>我自己的「红线」卡片</h3><p>把医生对你说过的话记在这里；没有医生原话就留空，不用猜。</p></div></div>'
        + '<div class="field"><label for="redlineText">医生或急诊交代过的求助线（原话）</label><textarea id="redlineText" placeholder="例如：如果再出现呕血，直接来急诊；不要先吃东西">' + esc(readLocal('gib.redline.' + state.currentKey, '')) + '</textarea></div>'
        + '<div class="form-actions"><button class="btn-primary" type="button" data-action="save-redline">保存到本机</button><span class="result-line">只保存在本机；合成示例不会改写演示数据。</span></div>'
        + '<div class="alert info" style="margin-top:12px">没有医生原话时，这栏留空比写一句推测更安全。紧急情况仍按上面的警示表现处理。</div>'
        + sourceLine('本卡片是「记录医生原话」的位置，不是本台生成的处置建议。') + '</section>'
        + '</div>'
    } else if (sub === 'risk') {
      var risks = [
        ['非甾体抗炎药（NSAIDs）', '布洛芬、双氯芬酸、萘普生等止痛药与溃疡/出血风险相关；需要长期止痛的人，应与医生讨论替代与保护方案。', '和医生讨论：能不能换、要不要加保护胃的药'],
        ['抗血小板药 / 抗凝药', '阿司匹林、氯吡格雷、华法林、DOAC 等会改变出血风险；**不要自行停药**，停药的血栓风险同样真实。', '和医生讨论：出血时怎么处理、何时恢复'],
        ['幽门螺杆菌（Hp）', '与消化性溃疡及其出血相关；是否感染需检测，根除后复查有固定时间窗。', '和医生讨论：要不要检测、怎么复查'],
        ['肝硬化 / 门静脉高压', '食管胃静脉曲张出血是另一条通路；与溃疡出血的随访节奏不同。', '和医生讨论：胃镜筛查与复查间隔'],
        ['既往溃疡或出血史', '曾经出过血的人再次出血的风险更高；复查与用药计划需要医生个体化。', '和医生讨论：复查时间与长期用药'],
        ['饮酒与吸烟', '与溃疡、肝病风险相关；减少或戒除是长期管理的一部分。', '和医生讨论：需要哪些支持'],
      ]
      body = '<div class="grid two">' + risks.map(function (r) {
        return '<section class="card"><div class="card-head"><div><h3>' + esc(r[0]) + '</h3></div><span class="badge amber">需要问医生</span></div><p>' + r[1].replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p><p class="small-note" style="margin-top:8px">' + esc(r[2]) + '</p></section>'
      }).join('') + '</div>'
        + '<div class="alert warn" style="margin-top:14px">风险因素只用于「知道该问什么」，不等于你一定会出血，也不等于没有因素就安全。</div>'
        + sourceLine('来源：2018 上消化道出血指南、2019 多学科防治共识、2022 食管胃静脉曲张出血防治指南的公开摘要；具体条目待临床审阅。')
    } else {
      var checks = [
        ['按处方用药，不自行加止痛药', '尤其是 NSAIDs；需要止痛时先问医生或药师。'],
        ['抗栓药不自行停、不自行加', '出血时由医生决定是否暂停与何时恢复。'],
        ['幽门螺杆菌按医生安排检测/复查', '复查呼气试验有停药时间要求，按医嘱执行。'],
        ['少酒或不饮酒', '与溃疡、肝病风险相关。'],
        ['把出血表现和用药清单放在家里人都知道的地方', '紧急时由家人协助描述。'],
        ['复查胃镜/门诊按医生安排', '静脉曲张与溃疡的复查节奏不同，不自行改间隔。'],
      ]
      body = '<div class="grid two">'
        + '<section class="card"><div class="card-head"><div><h3>日常预防清单（勾选只在本机）</h3><p>勾选状态只保存在这台设备，不上传。</p></div></div>'
        + '<div class="list">' + checks.map(function (c, i) {
          var key = 'gib.check.' + state.currentKey + '.' + i
          var on = readLocal(key, '') === '1'
          return '<label class="list-item" style="cursor:pointer"><input type="checkbox" style="width:auto;margin-top:5px" data-check="' + i + '"' + (on ? ' checked' : '') + '><span class="li-main"><b>' + esc(c[0]) + '</b><p>' + esc(c[1]) + '</p></span></label>'
        }).join('') + '</div>'
        + '<p class="small-note" style="margin-top:10px">勾选不代表医学评估，只是提醒自己做过哪些准备。</p></section>'
        + '<section class="card"><div class="card-head"><div><h3>家里可以提前准备的</h3><p>减少紧急时的慌乱。</p></div></div>'
        + '<div class="list">'
        + ['用药清单（药名、剂量、最后一次吃药时间）', '既往出院小结、胃镜/肠镜报告', '医保卡/就诊卡、身份证', '常用医院与路线、家属联系电话', '医生的门诊时间与挂号方式'].map(function (t, i) {
          return '<div class="list-item"><span class="li-icon">' + (i + 1) + '</span><span class="li-main"><b>' + esc(t) + '</b></span></div>'
        }).join('') + '</div>'
        + '<button class="btn-ghost" type="button" data-goto="emergency/plan" style="margin-top:12px">去填写送医预案</button></section>'
        + '</div>'
        + sourceLine('来源：急诊共识（2020 版）与多学科防治共识中的随访/用药原则；本页只列「要问医生什么」，不给具体药物方案。')
    }
    return pageHead('识别与预防', '先认出需要马上求助的表现，再把能提前做的事做好。') + subnav('prevent') + body
  }

  /* ---------------- 家庭监测 ---------------- */
  function pageMonitor() {
    var sub = state.sub || 'today'
    var body = ''
    if (sub === 'today') {
      body = '<div class="grid side">'
        + '<section class="card"><div class="card-head"><div><h3>记一次今天的情况</h3><p>只记亲见或听到的事实；不确定可以留空。</p></div><span class="badge teal">可选</span></div>'
        + '<div class="chips" style="margin-bottom:12px">' + KIND_ORDER.map(function (k) {
          return '<button class="chip" type="button" data-quick-kind="' + k + '" style="' + (k === state.currentKind ? 'background:var(--teal-soft);border-color:#a9cec0;color:var(--teal-deep)' : '') + '">' + esc(KINDS[k].label) + '</button>'
        }).join('') + '</div>'
        + '<form id="quickForm"><div id="quickFields" class="form-grid">' + renderFields(state.currentKind) + '</div>'
        + '<div class="form-actions"><button class="btn-primary" type="submit">保存记录</button><button class="btn-ghost" type="button" data-action="clear-quick">清空</button><span class="result-line" id="quickNote">' + (API_READY && !state.isDemoProfile ? '保存后写入本机数据库。' : '演示态：只在本页，刷新重置。') + '</span></div></form></section>'
        + '<section class="card"><div class="card-head"><div><h3>今天优先记录的 4 项</h3><p>不是每天都必须填，有变化时记就够。</p></div></div>'
        + '<div class="list">'
        + '<div class="list-item"><span class="li-icon">色</span><span class="li-main"><b>大便颜色与次数</b><p>黑便、血便、颜色变浅都可以记</p></span></div>'
        + '<div class="list-item"><span class="li-icon">压</span><span class="li-main"><b>血压 / 脉搏</b><p>家里有血压计就记；没有就留空</p></span></div>'
        + '<div class="list-item"><span class="li-icon">晕</span><span class="li-main"><b>头晕、心慌、乏力</b><p>出现时间与持续多久</p></span></div>'
        + '<div class="list-item"><span class="li-icon">药</span><span class="li-main"><b>今天吃过的药</b><p>药名、剂量、最后一次时间</p></span></div>'
        + '</div>'
        + '<div class="alert info" style="margin-top:12px">如果正在出血或头晕站不稳，先按「急诊与送医」处理，不要先填表。</div></section>'
        + '</div>'
        + '<section class="section"><div class="section-head"><h2>最近 7 天</h2><button class="btn-link" type="button" data-goto="monitor/all">全部记录</button></div>' + recentRecords(7) + '</section>'
    } else if (sub === 'all') {
      var list = sortedRecords().filter(function (r) { return !state.kindFilter || r.kind === state.kindFilter })
      body = '<div class="row between" style="margin-bottom:10px"><div class="row"><label class="small" for="kindFilter">按类型</label><select id="kindFilter" style="width:auto">'
        + '<option value="">全部类型</option>' + KIND_ORDER.map(function (k) { return '<option value="' + k + '"' + (state.kindFilter === k ? ' selected' : '') + '>' + esc(KINDS[k].label) + '</option>' }).join('') + '</select>'
        + '<span class="badge outline">' + list.length + ' / ' + state.records.length + ' 条</span></div>'
        + '<button class="btn-ghost" type="button" data-goto="monitor/today">＋ 新增</button></div>'
        + (list.length ? '<div class="card flush"><div style="padding:4px 20px">' + list.map(function (r) {
          var def = KINDS[r.kind] || { label: r.kind }
          var main = r.text || r.name || r.item || (r.observed || []).join('、') || r.reason || r.place || r.note || '（未填写内容）'
          var meta = [fmtDate(r.date), r.value ? (r.value + (r.unit || '')) : '', r.vitals ? ('血压 ' + r.vitals.sbp + ' / 脉搏 ' + r.vitals.hr) : '', r.recordedBy, r.sourceNote].filter(Boolean).join(' · ')
          return '<div class="record-row"><span class="record-kind">' + esc(def.label) + '</span><span class="record-main"><b>' + esc(main) + (r.private ? '<span class="tag">私密</span>' : '') + '</b><span>' + esc(meta) + '</span></span>'
            + '<span class="record-side"><button class="btn-sm" type="button" data-toggle-private="' + esc(r.id) + '">' + (r.private ? '取消私密' : '设为私密') + '</button><button class="btn-sm" type="button" data-delete-record="' + esc(r.id) + '">删除</button></span></div>'
        }).join('') + '</div></div>' : '<div class="empty">这个筛选下没有记录。</div>')
      body += '<p class="small-note" style="margin-top:10px">私密记录不进摘要与导出；删除只影响本机。</p>'
    } else if (sub === 'symptoms') {
      var meds = state.records.filter(function (r) { return r.kind === 'treatment' })
      var symptoms = state.records.filter(function (r) { return r.kind === 'bleed' || r.kind === 'mind' })
      body = '<div class="grid two">'
        + '<section class="card"><div class="card-head"><div><h3>用药记录</h3><p>只记录药名/处理名称与医嘱来源，不判断该不该吃。</p></div><button class="btn-link" type="button" data-goto="monitor/today">＋ 记录</button></div>'
        + (meds.length ? '<div class="list">' + meds.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')) }).map(function (r) {
          return '<div class="list-item"><span class="li-icon">药</span><span class="li-main"><b>' + esc(r.name || '未填名称') + '</b><p>' + fmtDate(r.date) + ' · ' + esc(r.sourceNote || '') + '</p></span></div>'
        }).join('') + '</div>' : '<div class="empty">还没有用药记录。</div>')
        + '<div class="alert warn" style="margin-top:12px">抗栓药（抗凝/抗血小板）的暂停与恢复由医生决定，本台不提供停药或恢复建议。</div></section>'
        + '<section class="card"><div class="card-head"><div><h3>症状时间线</h3><p>用于就诊时回顾，不做因果判断。</p></div></div>'
        + (symptoms.length ? '<div class="list">' + symptoms.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')) }).slice(0, 12).map(function (r) {
          var main = (r.observed || []).join('、') || r.text || r.note || '未填'
          return '<div class="list-item"><span class="li-icon">' + (r.kind === 'mind' ? '心' : '观') + '</span><span class="li-main"><b>' + esc(main) + '</b><p>' + fmtDate(r.date) + (r.when ? ' · ' + esc(r.when) : '') + ' · ' + esc(r.sourceNote || '') + '</p></span></div>'
        }).join('') + '</div>' : '<div class="empty">还没有症状记录。</div>') + '</section>'
        + '</div>'
    } else {
      body = '<div class="grid two">'
        + '<section class="card"><div class="card-head"><div><h3>家里可以测的</h3><p>只把这些当作「带去给医生看的数字」，不当作诊断依据。</p></div><span class="badge teal">可测</span></div>'
        + '<div class="list">'
        + ['血压与脉搏（家用血压计）', '体重（同一时间、同一秤）', '大便颜色照片（注意光线；不据此判断出血量）', '体温（如有发热）', '每天吃药的时间与剂量'].map(function (t, i) {
          return '<div class="list-item"><span class="li-icon">' + (i + 1) + '</span><span class="li-main"><b>' + esc(t) + '</b></span></div>'
        }).join('') + '</div></section>'
        + '<section class="card"><div class="card-head"><div><h3>家里测不了的</h3><p>这些必须由医院完成。</p></div><span class="badge coral">不可替代</span></div>'
        + '<div class="list">'
        + ['血红蛋白与血细胞比容（需要抽血）', '凝血功能、肝肾功能', '内镜检查与出血来源判断', '是否需要输血、内镜或介入处置', '出血量与危险程度的判断'].map(function (t) {
          return '<div class="list-item"><span class="li-icon">—</span><span class="li-main"><b>' + esc(t) + '</b></span></div>'
        }).join('') + '</div>'
        + '<div class="alert danger" style="margin-top:12px">家用设备读数异常或症状加重时，先联系医生/急诊；不要用家用读数自行推断「没事」。</div></section>'
        + '</div>'
        + sourceLine('来源：急诊共识（2020 版）对生命体征监测与化验的描述；家庭监测边界为本台编辑口径，待临床审阅。')
    }
    return pageHead('家庭监测', '把日常能观察到的变化记下来，带去医院；不能替代检查与医生判断。') + subnav('monitor') + body
  }

  function renderFields(kind) {
    var def = KINDS[kind]
    return def.fields.map(function (f) {
      var id = 'qf-' + f.name
      if (f.type === 'textarea') return '<div class="field" style="grid-column:1/-1"><label for="' + id + '">' + esc(f.label) + '</label><textarea id="' + id + '" name="' + f.name + '" placeholder="' + esc(f.placeholder || '') + '"></textarea></div>'
      if (f.type === 'check') return '<div class="field" style="grid-column:1/-1"><label class="chip" style="display:inline-flex"><input type="checkbox" id="' + id + '" name="' + f.name + '"> ' + esc(f.label) + '</label></div>'
      if (f.type === 'multi') return '<fieldset class="field" style="grid-column:1/-1"><legend>' + esc(f.label) + '</legend><div class="chips">' + f.options.map(function (o) {
        return '<label class="chip"><input type="checkbox" name="' + f.name + '" value="' + esc(o) + '"> ' + esc(o) + '</label>'
      }).join('') + '</div></fieldset>'
      if (f.type === 'vitals') return '<fieldset class="field" style="grid-column:1/-1"><legend>' + esc(f.label) + '</legend><div class="form-grid"><div class="field"><label for="qf-sbp">收缩压（mmHg）</label><input id="qf-sbp" name="sbp" inputmode="numeric" placeholder="例如 104"></div><div class="field"><label for="qf-hr">脉搏（次/分）</label><input id="qf-hr" name="hr" inputmode="numeric" placeholder="例如 96"></div></div></fieldset>'
      return '<div class="field"><label for="' + id + '">' + esc(f.label) + '</label><input type="' + (f.type === 'date' ? 'date' : 'text') + '" id="' + id + '" name="' + f.name + '" placeholder="' + esc(f.placeholder || '') + '"></div>'
    }).join('')
  }

  function collectQuick() {
    var def = KINDS[state.currentKind]
    var data = { kind: state.currentKind }, empty = true
    def.fields.forEach(function (f) {
      if (f.type === 'multi') {
        var vals = [].slice.call(document.querySelectorAll('#quickFields input[name="' + f.name + '"]:checked')).map(function (x) { return x.value })
        if (vals.length) { data[f.name] = vals; empty = false }
      } else if (f.type === 'check') {
        var el = document.querySelector('#quickFields input[name="' + f.name + '"]')
        if (el && el.checked) { data[f.name] = true; empty = false }
      } else if (f.type === 'vitals') {
        var sbp = (document.querySelector('#quickFields [name="sbp"]') || {}).value
        var hr = (document.querySelector('#quickFields [name="hr"]') || {}).value
        if (sbp || hr) { data.vitals = { sbp: sbp ? Number(sbp) : null, hr: hr ? Number(hr) : null }; empty = false }
      } else {
        var input = document.querySelector('#quickFields [name="' + f.name + '"]')
        var v = input ? String(input.value || '').trim() : ''
        if (v) { data[f.name] = v; empty = false }
      }
    })
    return { data: data, empty: empty }
  }

  /* ---------------- 急诊与送医 ---------------- */
  function pageEmergency() {
    var sub = state.sub || 'scene'
    var body = ''
    if (sub === 'scene') {
      body = '<div class="grid side">'
        + '<section class="card"><div class="card-head"><div><h3>现在可能正在出血：按顺序做</h3><p>本节只做「求助与等待期间的安全动作」，不做任何药物或止血处置指导。</p></div><span class="badge coral">先求助</span></div>'
        + '<div class="list">'
        + '<div class="list-item"><span class="li-icon">1</span><span class="li-main"><b>拨打 120，或让家人立刻送最近有急诊的医院</b><p>说清楚：呕血/黑便/血便、开始时间、是否头晕或晕倒、正在吃什么药。不要自己开车。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">2</span><span class="li-main"><b>让患者平卧或侧卧，头偏向一侧</b><p>呕血时防止呛咳；把衣领松开，注意保暖。不要强行喂水喂食。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">3</span><span class="li-main"><b>暂时不要进食进水</b><p>急诊评估前通常需要空腹；具体何时可以吃喝由接诊医生决定。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">4</span><span class="li-main"><b>带上用药清单与既往报告</b><p>尤其是抗凝/抗血小板药、止痛药、最后一次服药时间；胃镜/出院小结。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">5</span><span class="li-main"><b>不要自行吃止痛药、止血药或停抗栓药</b><p>是否停药、何时恢复由医生判断；带上药盒让医生看。</p></span></div>'
        + '</div>'
        + '<div class="alert danger" style="margin-top:12px"><strong>出现呕血、晕厥、冷汗、面色苍白、心跳很快</strong>时不要在家观察等待；直接呼叫急救。</div>'
        + sourceLine('来源：急诊共识（2020 版）与上消化道出血护理指导的公开摘要（卧床、头偏一侧、禁食、监测生命体征）；具体动作待临床审阅。')
        + '</section>'
        + '<section class="stack"><div class="card"><div class="card-head"><div><h3>一键准备</h3><p>把要说的、要带的放在一页。</p></div></div>'
        + '<div class="row"><button class="btn-primary" type="button" data-action="export-summary">导出交接摘要</button><button class="btn-ghost" type="button" data-goto="emergency/plan">送医预案</button></div>'
        + '<p class="small-note" style="margin-top:10px">摘要只含未标私密的记录；不会自动发送给任何人。</p></div>'
        + '<div class="card"><div class="card-head"><div><h3>对急救人员怎么说</h3></div></div>'
        + '<div class="list"><div class="list-item"><span class="li-icon">时</span><span class="li-main"><b>什么时候开始</b><p>第一次看到黑便/呕血的时间</p></span></div>'
        + '<div class="list-item"><span class="li-icon">量</span><span class="li-main"><b>大概几次、什么颜色</b><p>不需要估算毫升数</p></span></div>'
        + '<div class="list-item"><span class="li-icon">晕</span><span class="li-main"><b>有没有头晕、晕倒、心慌</b></span></div>'
        + '<div class="list-item"><span class="li-icon">药</span><span class="li-main"><b>抗凝/抗血小板/止痛药名称与最后一次时间</b></span></div>'
        + '<div class="list-item"><span class="li-icon">史</span><span class="li-main"><b>既往胃镜、溃疡、肝病、手术史</b><p>例如脾切除、胰腺手术</p></span></div></div></div>'
        + '</section></div>'
    } else if (sub === 'plan') {
      var planData = plan()
      body = '<section class="card" style="max-width:820px"><div class="card-head"><div><h3>我的送医预案</h3><p>自己填、自己改；只存本机。紧急时家属可直接照着做。</p></div><span class="badge amber">待与家人确认</span></div>'
        + '<div class="form-grid">'
        + '<div class="field"><label for="planHospital">常去的医院 / 科室</label><input id="planHospital" value="' + esc(planData.hospital) + '" placeholder="例如：XX 医院消化内科（内镜中心）"></div>'
        + '<div class="field"><label for="planNext">下次复查日期</label><input type="date" id="planNext" value="' + esc(planData.nextVisit) + '"></div>'
        + '<div class="field"><label for="planTransport">怎么去 / 需要多久</label><input id="planTransport" value="' + esc(planData.transport) + '" placeholder="例如：家属驾车 25 分钟；夜间走急诊"></div>'
        + '<div class="field"><label for="planContact">紧急联系人</label><input id="planContact" value="' + esc(planData.contact) + '" placeholder="例如：女儿（同城）"></div>'
        + '</div>'
        + '<div class="form-actions"><button class="btn-primary" type="button" data-action="save-plan">保存预案</button><span class="result-line" id="planNote">只保存在本机。</span></div>'
        + '<div class="alert info" style="margin-top:12px">预案不替代急救电话；如果正在出血，先拨 120。</div>'
        + sourceLine('本页是「你自己的安排」，不是医院转诊建议；医院选择与就诊安排请以官方信息为准。') + '</section>'
        + '<section class="section"><div class="section-head"><h2>预案里建议写清楚的四件事</h2></div><div class="grid four">'
        + [['最近一次出血记录', '时间、颜色、次数'], ['用药清单', '药名、剂量、最后一次'], ['报告位置', '出院小结、胃镜报告'], ['谁做什么', '谁拨 120、谁带资料']].map(function (x) {
          return '<div class="card"><h4>' + x[0] + '</h4><p class="small-note">' + x[1] + '</p></div>'
        }).join('') + '</div></section>'
    } else {
      body = '<div class="grid side"><section class="card"><div class="card-head"><div><h3>就诊交接摘要</h3><p>按时间倒序整理未标私密的记录；给医生看，不替代病历。</p></div><span class="badge">' + (state.isDemoProfile ? '合成示例' : '本机记录') + '</span></div>'
        + '<pre id="handoffText" style="white-space:pre-wrap;font:12.5px/1.7 inherit;background:#faf6ee;border:1px solid var(--line);border-radius:10px;padding:14px;max-height:420px;overflow:auto">' + esc(summaryText()) + '</pre>'
        + '<div class="form-actions"><button class="btn-primary" type="button" data-action="copy-summary">复制摘要</button><button class="btn-ghost" type="button" data-action="export-summary">下载文本</button><button class="btn-ghost" type="button" data-action="agent-draft">填入 AI 草稿（不发送）</button></div>'
        + '<p class="small-note" style="margin-top:10px">摘要不是诊断，也不能用来判断是否安全；缺失信息保持空白，不表示没有症状。</p></section>'
        + '<section class="card"><div class="card-head"><div><h3>就诊时要带的</h3></div></div><div class="list">'
        + ['用药清单（含抗凝/抗血小板药与最后一次时间）', '出院小结、胃镜/肠镜报告、病理报告', '近期化验单（血红蛋白、凝血、肝肾功能）', '医保卡/就诊卡、身份证', '过敏史与既往手术史（如脾切除、胰腺手术）'].map(function (t, i) {
          return '<div class="list-item"><span class="li-icon">' + (i + 1) + '</span><span class="li-main"><b>' + esc(t) + '</b></span></div>'
        }).join('') + '</div></section></div>'
    }
    return pageHead('急诊与送医', '先求助，再准备；把现场安全动作与送医信息放在同一页。') + subnav('emergency') + body
  }

  /* ---------------- 指标与评分 ---------------- */
  function pageMetrics() {
    var sub = state.sub || 'hb'
    var body = ''
    if (sub === 'hb') {
      var series = hbSeries()
      var treats = state.records.filter(function (r) { return r.kind === 'treatment' && r.date }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)) })
      body = '<div class="grid side">'
        + '<section class="card"><div class="card-head"><div><h3>血红蛋白（Hb）</h3><p>来自你录入的化验记录；不判断高低，也不替代医生看报告。</p></div><span class="badge teal">' + series.length + ' 次记录</span></div>'
        + hbChart(series)
        + '<div class="data-table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr><th>日期</th><th>数值</th><th>来源</th></tr></thead><tbody>'
        + (series.length ? series.map(function (s) { return '<tr><td>' + fmtDate(s.date) + '</td><td class="num">' + s.value + ' ' + esc(s.unit) + '</td><td>' + esc(s.source || '') + '</td></tr>' }).join('') : '<tr><td colspan="3">还没有数值</td></tr>')
        + '</tbody></table></div>'
        + '<div class="alert warn" style="margin-top:12px">不同医院、不同检测方法的数值可能有差异；换医院/换方法时不要直接连成一条线比较。</div>'
        + sourceLine('来源：你的化验记录 · 参考范围以报告单为准。') + '</section>'
        + '<section class="card"><div class="card-head"><div><h3>与出血相关的治疗事件</h3><p>单独列在下方，不叠加在曲线上。</p></div></div>'
        + (treats.length ? '<div class="list">' + treats.map(function (r) {
          return '<div class="list-item"><span class="li-icon">' + fmtDate(r.date).slice(5) + '</span><span class="li-main"><b>' + esc(r.name || '未填') + '</b><p>' + esc(r.sourceNote || '') + '</p></span></div>'
        }).join('') + '</div>' : '<div class="empty">还没有治疗记录。</div>')
        + '<p class="small-note" style="margin-top:10px">治疗事件与血红蛋白变化在时间上接近，不代表因果；因果关系由医生判断。</p></section>'
        + '</div>'
    } else if (sub === 'score') {
      var gi = gbsInputs(), gs = gbsScore(gi)
      var ai = aimsInputs()
      var aimsMissing = []
      if (ai.albumin == null) aimsMissing.push('白蛋白')
      if (ai.inr == null) aimsMissing.push('INR')
      if (ai.mental == null) aimsMissing.push('意识状态')
      if (ai.sbp == null) aimsMissing.push('收缩压')
      if (ai.age == null) aimsMissing.push('年龄')
      body = '<div class="alert info">评分是医生在急诊/内镜前后使用的工具。本台只按你已经记录下来的字段做**算术对照**，不输出风险结论，也不替代医生判断；字段不全时宁可显示待补，不按 0 计。</div>'
        + '<div class="grid three" style="margin-top:14px">'
        + scoreCard('Glasgow-Blatchford（GBS）', '急诊常用：帮助判断是否需要进一步干预（医生工具）', [
          ['尿素氮', gi.bun == null ? null : gi.bun + ' mmol/L'], ['血红蛋白', gi.hb == null ? null : gi.hb + ' g/L'],
          ['收缩压', gi.sbp == null ? null : gi.sbp + ' mmHg'], ['脉搏', gi.hr == null ? null : gi.hr + ' 次/分'],
          ['黑便', gi.melena == null ? null : (gi.melena ? '有记录' : '无记录')], ['晕厥', gi.syncope == null ? null : (gi.syncope ? '有记录' : '无记录')],
          ['肝病', gi.liver == null ? null : (gi.liver ? '有' : '无')], ['心衰', gi.cardiac == null ? null : (gi.cardiac ? '有' : '无')],
        ], gs.total, gs.missing, '按最近一次出血记录（' + fmtDate(gi.date) + '）的字段对照；阈值与用途见来源。')
        + scoreCard('AIMS65', '急诊常用：识别高风险患者（医生工具）', [
          ['白蛋白 < 30 g/L', ai.albumin == null ? null : ai.albumin + ' g/L'], ['INR > 1.5', ai.inr == null ? null : ai.inr],
          ['意识状态改变', null], ['收缩压 < 90 mmHg', ai.sbp == null ? null : ai.sbp + ' mmHg'], ['年龄 > 65 岁', ai.age == null ? null : ai.age + ' 岁'],
        ], null, aimsMissing, '本台不合计：缺少 ' + aimsMissing.join(' / '))
        + scoreCard('Rockall', '内镜后评分：需要内镜诊断与出血征象（医生工具）', [
          ['年龄', state.trialProfile && state.trialProfile.age != null ? state.trialProfile.age + ' 岁' : null],
          ['休克', null], ['合并症', null], ['内镜诊断', null], ['内镜出血征象', null],
        ], null, ['休克', '合并症', '内镜诊断', '内镜出血征象'], '本台不合计：需要胃镜报告原文，不根据印象填写')
        + '</div>'
        + '<section class="section"><div class="section-head"><h2>评分变量对照</h2><p>把「医生可能会问的字段」和「你已经记录的字段」放在一起。</p></div>'
        + '<div class="card flush"><table class="data-table"><thead><tr><th>变量</th><th>GBS</th><th>AIMS65</th><th>本档案记录</th></tr></thead><tbody>'
        + [['年龄', '—', '> 65 岁', state.trialProfile && state.trialProfile.age != null ? state.trialProfile.age + ' 岁' : '未登记'],
          ['收缩压', '分档计分', '< 90 mmHg', gi.sbp != null ? gi.sbp + ' mmHg' : '未登记'],
          ['脉搏', '分档计分', '—', gi.hr != null ? gi.hr + ' 次/分' : '未登记'],
          ['血红蛋白', '分档计分', '—', gi.hb != null ? gi.hb + ' g/L' : '未登记'],
          ['尿素氮', '分档计分', '—', gi.bun != null ? gi.bun + ' mmol/L' : '未登记'],
          ['白蛋白', '—', '< 30 g/L', ai.albumin != null ? ai.albumin + ' g/L' : '未登记'],
          ['INR', '—', '> 1.5', ai.inr != null ? ai.inr : '未登记'],
          ['黑便 / 晕厥', '各计分', '—', [gi.melena ? '黑便' : '', gi.syncope ? '晕厥' : ''].filter(Boolean).join('、') || '未登记']].map(function (r) {
          return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + esc(r[3]) + '</td></tr>'
        }).join('') + '</tbody></table></div>'
        + '<p class="small-note" style="margin-top:8px">「未登记」不是「正常」；本台不会把没记录的字段当作 0 分。</p></section>'
        + sourceLine('来源：Glasgow-Blatchford 评分（Blatchford 等，Lancet 2000）与 AIMS65（Saltzman 等，Gastrointest Endosc 2011）的公开描述；中文应用口径待临床审阅。')
    } else {
      var reports = state.records.filter(function (r) { return r.kind === 'report' }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')) })
      body = '<section class="card flush"><table class="data-table"><thead><tr><th>日期</th><th>报告</th><th>记录内容（只抄名称/日期）</th><th>原文状态</th></tr></thead><tbody>'
        + (reports.length ? reports.map(function (r) {
          return '<tr><td class="num">' + fmtDate(r.date) + '</td><td>' + esc(r.name || '未填') + '</td><td>' + esc(r.note || '') + '</td><td><span class="tag wait">待核对原件</span></td></tr>'
        }).join('') : '<tr><td colspan="4">还没有报告记录</td></tr>')
        + '</tbody></table></section>'
        + '<div class="alert warn" style="margin-top:12px">报告结论以原件与医生解读为准；本台不抄写未核对的结论，也不根据报告自行判断病情。</div>'
        + '<div class="row" style="margin-top:12px"><button class="btn-ghost" type="button" data-goto="monitor/today">＋ 记录一份报告</button></div>'
    }
    return pageHead('指标与评分', '血红蛋白、生命体征与医生常用评分放在一起；只做对照，不下结论。') + subnav('metrics') + body
  }

  function scoreCard(title, desc, vars, total, missing, note) {
    var rows = vars.map(function (v) {
      var missingOne = v[1] == null
      return '<div class="score-var ' + (missingOne ? 'missing' : '') + '"><span>' + esc(v[0]) + '</span><b>' + (missingOne ? '待补' : esc(v[1])) + '</b></div>'
    }).join('')
    var value = total == null ? '<div class="score-value" style="font-size:16px;color:var(--amber)">暂不合计</div><p class="small-note">待补：' + esc((missing || []).join(' / ')) + '</p>'
      : '<div class="score-value">' + total + ' <small>算术对照</small></div><p class="small-note">GBS ≥ 1 时医生通常会进一步评估（来源见页脚）；本台不据此给处置。</p>'
    return '<section class="card score-card"><div class="score-top"><div><h3>' + esc(title) + '</h3><p class="small-note">' + esc(desc) + '</p></div></div>'
      + value + '<div class="score-vars">' + rows + '</div>' + sourceLine(esc(note)) + '</section>'
  }

  /* ---------------- 复诊与后续 ---------------- */
  function pageAftercare() {
    var sub = state.sub || 'plan'
    var body = ''
    if (sub === 'plan') {
      var items = [
        ['按出院带药单服药', '抑酸药疗程、抗栓药是否恢复、补铁等，都以出院记录为准；不自行加减。'],
        ['幽门螺杆菌复查（如阳性）', '复查呼气试验通常要求停 PPI 等药物一段时间，具体时间按医生交代。'],
        ['复查胃镜/门诊', '溃疡与静脉曲张的复查节奏不同，按医生安排，不自行改间隔。'],
        ['抗栓药恢复问题', '何时恢复、要不要加保护胃的药，由心内/神内与消化科共同决定。'],
        ['出现警示表现', '呕血、黑便、晕厥等，直接急诊，不等下次复诊。'],
      ]
      body = '<div class="grid side"><section class="card"><div class="card-head"><div><h3>出院后要落实的五件事</h3><p>来自出院记录与多学科共识的「要问医生什么」，不是本台给你的方案。</p></div></div>'
        + '<div class="list">' + items.map(function (x, i) {
          return '<div class="list-item"><span class="li-icon">' + (i + 1) + '</span><span class="li-main"><b>' + esc(x[0]) + '</b><p>' + esc(x[1]) + '</p></span></div>'
        }).join('') + '</div>'
        + sourceLine('来源：急性非静脉曲张性上消化道出血多学科防治共识（2019）、急诊共识（2020 版）中出院与随访原则的公开摘要；患者版待临床审阅。') + '</section>'
        + '<section class="card"><div class="card-head"><div><h3>我的下次就诊</h3></div></div>'
        + '<div class="field"><label for="afterNext">日期（自填）</label><input type="date" id="afterNext" value="' + esc(plan().nextVisit) + '"></div>'
        + '<div class="field"><label for="afterHospital">医院/科室</label><input id="afterHospital" value="' + esc(plan().hospital) + '"></div>'
        + '<div class="form-actions"><button class="btn-primary" type="button" data-action="save-aftercare">保存</button></div>'
        + '<p class="small-note" style="margin-top:8px">日期只做提醒，不替代医院预约。</p></section></div>'
    } else if (sub === 'visits') {
      var visits = state.records.filter(function (r) { return r.kind === 'hospital' }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')) })
      body = '<div class="grid side"><section class="card"><div class="card-head"><div><h3>就诊记录时间线</h3><p>按日期倒序；来源于你自己的记录。</p></div><button class="btn-link" type="button" data-goto="monitor/today">＋ 记录就诊</button></div>'
        + (visits.length ? '<div class="list">' + visits.map(function (r) {
          return '<div class="list-item"><span class="li-icon">' + fmtDate(r.date).slice(5) + '</span><span class="li-main"><b>' + esc(r.place || '未填地点') + '</b><p>' + esc(r.reason || '') + (r.note ? ' · ' + esc(r.note) : '') + '</p></span></div>'
        }).join('') + '</div>' : '<div class="empty">还没有就诊记录。</div>') + '</section>'
        + '<section class="card"><div class="card-head"><div><h3>下次复查</h3></div></div>'
        + '<div class="stat-tile" style="margin-bottom:10px"><span>已填日期</span><b>' + (plan().nextVisit ? fmtDate(plan().nextVisit) : '未填') + '</b><small>' + (plan().hospital || '医院待填') + '</small></div>'
        + '<button class="btn-ghost" type="button" data-goto="aftercare/plan">修改计划</button>'
        + '<p class="small-note" style="margin-top:10px">复查间隔由医生决定；本台不根据记录推算「该复查了」。</p></section></div>'
    } else {
      var questions = state.records.filter(function (r) { return r.kind === 'question' }).sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')) })
      body = '<div class="grid side"><section class="card"><div class="card-head"><div><h3>问题清单</h3><p>就诊时按顺序问，避免紧张时忘掉。</p></div><button class="btn-link" type="button" data-action="open-question">＋ 添加问题</button></div>'
        + (questions.length ? '<div class="list">' + questions.map(function (q, i) {
          return '<div class="list-item"><span class="li-icon">' + (i + 1) + '</span><span class="li-main"><b>' + esc(q.text || '') + '</b><p>' + esc(q.recordedBy || '') + (q.date ? ' · ' + fmtDate(q.date) : '') + '</p></span></div>'
        }).join('') + '</div>' : '<div class="empty">还没有问题。想到什么就记下来，就诊前再排序。</div>')
        + '<div class="form-actions"><button class="btn-primary" type="button" data-action="copy-questions">复制给医生</button><button class="btn-ghost" type="button" data-action="export-questions">下载清单</button></div></section>'
        + '<section class="card"><div class="card-head"><div><h3>常被问到、也值得问的</h3><p>按你的情况挑选，不需要全问。</p></div></div>'
        + '<div class="list">'
        + ['我这次出血最可能的原因是什么？还需要做哪些检查？', '我吃的药里有没有需要调整的？特别是止痛药/抗栓药。', '幽门螺杆菌需要检测或复查吗？什么时候？', '下次复查胃镜大概什么时候？出现什么情况要提前来？', '如果再次黑便/呕血，我应该先去哪里、带什么？'].map(function (t) {
          return '<div class="list-item"><span class="li-icon">?</span><span class="li-main"><b>' + esc(t) + '</b></span></div>'
        }).join('') + '</div>'
        + '<p class="small-note" style="margin-top:8px">这些是提问模板，不是本台的判断或建议。</p></section></div>'
    }
    return pageHead('复诊与后续', '把出院后的用药、复查和问题准备好；具体安排以医生医嘱为准。') + subnav('aftercare') + body
  }

  /* ---------------- 静脉曲张专项 ---------------- */
  function pageVarices() {
    var sub = state.sub || 'why'
    var body = ''
    if (sub === 'why') {
      body = '<div class="grid side"><section class="card"><div class="card-head"><div><h3>脾静脉问题 → 胃底静脉曲张</h3><p>这是一条与「普通溃疡出血」不同的通路，称为区域性（左侧）门静脉高压。</p></div><span class="badge plum">专项线</span></div>'
        + '<div class="list">'
        + '<div class="list-item"><span class="li-icon">1</span><span class="li-main"><b>脾静脉被堵塞或切除后，脾脏回流的血找别的路走</b><p>血流改道到胃底/食管下段的静脉，这些静脉会被撑粗，形成静脉曲张。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">2</span><span class="li-main"><b>肝脏本身可能正常，但静脉曲张仍可能出血</b><p>所以「肝功能正常」不等于「没有出血风险」。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">3</span><span class="li-main"><b>胰腺癌胰体尾切除常同时切脾</b><p>手术直接阻断脾静脉与胃底部分血流，术后需要关注胃底静脉曲张与出血。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">4</span><span class="li-main"><b>已经切了脾，为什么还要看？</b><p>脾切除是治疗手段之一，但侧支循环与胃底静脉仍可能存在；是否复查、怎么复查由医生决定。</p></span></div>'
        + '</div>'
        + sourceLine('来源：Left-sided portal hypertension（J Visc Surg 2024，PMID 38142180）、胰腺癌相关左侧门脉高压 48 例（PMID 23298872）、肝硬化门静脉高压食管胃静脉曲张出血防治指南（2022）公开摘要。')
        + '</section>'
        + '<section class="card"><div class="card-head"><div><h3>出现这些情况要按急诊处理</h3></div><span class="badge coral">警示</span></div>'
        + '<div class="list">'
        + ['呕血或咖啡渣样呕吐', '黑便或血便', '头晕、晕厥、冷汗、心跳很快', '血红蛋白在短时间内明显下降（如化验所示）'].map(function (t) {
          return '<div class="list-item"><span class="li-icon">!</span><span class="li-main"><b>' + esc(t) + '</b></span></div>'
        }).join('') + '</div>'
        + '<div class="alert danger" style="margin-top:12px">静脉曲张出血可能量大且突然，不要在家观察等待。</div>'
        + '<button class="btn-danger" type="button" data-goto="emergency/scene" style="margin-top:12px">看现场处理</button></section></div>'
    } else if (sub === 'monitor') {
      body = '<div class="grid two">'
        + '<section class="card"><div class="card-head"><div><h3>平时记什么</h3><p>只记事实，不做判断。</p></div></div><div class="list">'
        + ['大便颜色（黑便/血便）与次数', '有没有呕血、头晕、心慌', '血压与脉搏（家里有设备时）', '血红蛋白化验值（每次复查后抄录）', '抗凝/抗血小板药与止痛药的使用（药名与时间）'].map(function (t) {
          return '<div class="list-item"><span class="li-icon">记</span><span class="li-main"><b>' + esc(t) + '</b></span></div>'
        }).join('') + '</div>'
        + '<div class="form-actions"><button class="btn-primary" type="button" data-goto="monitor/today">去记录</button></div></section>'
        + '<section class="card"><div class="card-head"><div><h3>复查时问医生</h3><p>复查间隔与方式由医生决定。</p></div></div><div class="list">'
        + ['下次胃镜复查大概什么时候？', '静脉曲张的程度与上次相比有没有变化？', '如果再次出血，应该先去哪个医院/科室？', '抗栓药与止痛药需不需要调整？', '是否需要和其他科室（肝胆外科/心内）一起评估？'].map(function (t) {
          return '<div class="list-item"><span class="li-icon">?</span><span class="li-main"><b>' + esc(t) + '</b></span></div>'
        }).join('') + '</div>'
        + '<button class="btn-ghost" type="button" data-goto="aftercare/questions" style="margin-top:10px">加到问题清单</button></section></div>'
        + '<div class="alert warn" style="margin-top:14px">本台不根据记录推算静脉曲张分级、出血概率或复查间隔；这些都需要医生结合内镜与影像判断。</div>'
    } else {
      body = '<div class="grid side"><section class="card"><div class="card-head"><div><h3>脾切除术后：仍要关注的三件事</h3><p>面向胰腺癌胰体尾切除 + 脾切除的患者与家属。</p></div><span class="badge plum">术后专项</span></div>'
        + '<div class="list">'
        + '<div class="list-item"><span class="li-icon">1</span><span class="li-main"><b>胃底静脉曲张与出血风险</b><p>手术阻断脾静脉后，胃底静脉可能代偿性扩张；是否出血与程度需胃镜/影像评估。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">2</span><span class="li-main"><b>脾切除后的感染预防</b><p>脾切除患者对某些细菌感染更敏感；疫苗接种与发热处理按医生安排。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">3</span><span class="li-main"><b>抗栓药与止痛药的平衡</b><p>既有血栓风险又有出血风险时，停/恢复由多学科共同决定，不自行调整。</p></span></div>'
        + '</div>'
        + '<div class="alert info" style="margin-top:12px">「脾切除后就不会再出血」是常见误解；请把这条专项页给家属看，并在复查时问清楚。</div>'
        + sourceLine('来源：胰腺癌相关左侧门脉高压文献（PMID 23298872、38142180）与脾切除后感染预防的公开资料；疫苗与用药由医生安排。') + '</section>'
        + '<section class="card"><div class="card-head"><div><h3>把这条线告诉接诊医生</h3></div></div>'
        + '<p class="small-note">就诊时可直接说：</p>'
        + '<pre style="white-space:pre-wrap;font:12.5px/1.7 inherit;background:#faf6ee;border:1px solid var(--line);border-radius:10px;padding:12px">“我做过胰体尾切除和脾切除（____年）。最近有黑便/呕血，血红蛋白从 ____ 降到 ____。想请您评估胃底静脉曲张和再次出血的风险。”</pre>'
        + '<div class="form-actions"><button class="btn-primary" type="button" data-action="copy-varices-note">复制这段话</button><button class="btn-ghost" type="button" data-goto="emergency/handoff">带摘要就诊</button></div>'
        + '<p class="small-note" style="margin-top:8px">模板只帮你把手术史说清楚，不包含任何处置建议。</p></section></div>'
    }
    return pageHead('静脉曲张专项', '面向肝硬化或脾静脉问题（含胰腺癌术后脾切除）的出血风险线；与普通溃疡出血分开管理。') + subnav('varices') + body
  }

  /* ---------------- 临床研究 ---------------- */
  function pageClinical() {
    var sub = state.sub || 'match'
    var body = ''
    if (sub === 'match') {
      body = '<div id="matchPoolNote" class="alert info">候选池载入中…</div>'
        + '<div class="grid side" style="margin-top:12px">'
        + '<section class="card"><div class="card-head"><div><h3>基础档案（只用于匹配）</h3><p>只有这里明确填写的字段参与匹配；不填 = 待确认，不按阴性计。药物靶点不参与。</p></div></div>'
        + '<form id="trialProfileForm"><div class="form-grid">'
        + '<div class="field"><label for="tpAge">年龄</label><input id="tpAge" inputmode="numeric"></div>'
        + '<div class="field"><label for="tpSex">性别</label><select id="tpSex"><option value="">不填</option><option value="female">女</option><option value="male">男</option></select></div>'
        + '</div>'
        + '<div class="field"><label for="tpDiagnosis">医生是否明确说过「消化道出血」</label><select id="tpDiagnosis"><option value="">不填（待确认）</option><option value="yes">说过</option><option value="no">没有/不确定</option></select></div>'
        + '<fieldset class="field"><legend>记录过的出血表现</legend><div class="chips" id="tpSigns">' + SIGN_OPTIONS.map(function (s) { return '<label class="chip"><input type="checkbox" value="' + esc(s) + '">' + esc(s) + '</label>' }).join('') + '</div></fieldset>'
        + '<fieldset class="field"><legend>正在使用的抗栓药（按原话）</legend><div class="chips" id="tpMeds">' + MED_OPTIONS.map(function (s) { return '<label class="chip"><input type="checkbox" value="' + esc(s) + '">' + esc(s) + '</label>' }).join('') + '</div></fieldset>'
        + '<div class="form-grid"><div class="field"><label for="tpPregnant">是否妊娠/哺乳（如适用）</label><select id="tpPregnant"><option value="">不填</option><option value="no">否</option><option value="yes">是</option></select></div>'
        + '<div class="field"><label for="tpLiver">医生说过有肝硬化吗</label><select id="tpLiver"><option value="">不填（待确认）</option><option value="yes">说过</option><option value="no">没有</option></select></div>'
        + '<div class="field"><label for="tpHeart">医生说过有心衰吗</label><select id="tpHeart"><option value="">不填（待确认）</option><option value="yes">说过</option><option value="no">没有</option></select></div>'
        + '<div class="field"><label for="tpNote">备注（可选）</label><input id="tpNote" placeholder="医生提过的关键词"></div></div>'
        + '<div class="form-actions"><button class="btn-primary" type="submit">保存基础档案</button><span class="result-line" id="trialProfileStatus"></span></div></form></section>'
        + '<section class="card"><div class="card-head"><div><h3>匹配卡</h3><p>登记字段符合度；不是入组资格，也不代表效果。</p></div></div>'
        + '<div class="row" style="margin-bottom:10px"><input id="matchKeyword" placeholder="按标题/登记号过滤（可留空）" style="flex:1" aria-label="匹配关键词"><button class="btn-ghost" type="button" data-action="refresh-match">刷新</button></div>'
        + '<p class="small-note" id="matchSummary">载入中…</p><div id="matchList" class="stack" style="margin-top:10px"></div>'
        + '<p class="small-note" style="margin-top:10px">匹配卡四件套：分数（或「可对照项不足 2 条」）+「n / m 项对得上 · k 项待确认」+ 逐条证据链（✕/? 排前）+「不是入组资格」。</p></section></div>'
    } else if (sub === 'search') {
      body = '<section class="card"><div class="card-head"><div><h3>检索（按条件排，不掺分数）</h3><p>关键词 + 状态 + 研究类型 + 只看相关；结果不显示百分数。</p></div></div>'
        + '<div class="row" style="margin-bottom:10px"><input id="trialKeyword" placeholder="关键词（标题 / 登记号 / 机构）" style="flex:1" aria-label="检索关键词">'
        + '<select id="trialStatus" style="width:auto" aria-label="状态"><option value="">全部状态</option></select>'
        + '<select id="trialStudyType" style="width:auto" aria-label="研究类型"><option value="">全部类型</option></select>'
        + '<label class="chip"><input type="checkbox" id="trialRelevantOnly" checked> 只看相关</label>'
        + '<button class="btn-primary" type="button" data-action="do-search">检索</button></div>'
        + '<div id="searchPoolNote" class="alert info">候选池载入中…</div>'
        + '<div id="searchResults" class="stack" style="margin-top:10px"></div></section>'
    } else {
      body = '<section class="card"><div class="card-head"><div><h3>收藏</h3><p>只保存本机登记元信息与三态（在跟 / 准备问 / 已归档）；快照没有状态时间线，不画进度条。</p></div></div><div id="savedList" class="stack"></div></section>'
    }
    return pageHead('临床研究', '建档 → 检索 → 匹配 → 收藏；结果只是候选线索，不是入组资格。') + subnav('clinical') + body
  }

  function renderMatchNote(data, target, prefix) {
    var el = $(target); if (!el) return
    if (!data) { el.textContent = '候选池不可用'; return }
    if (!data.available) { el.textContent = data.reason || '候选池不可用'; return }
    var pool = data.candidatePool || {}
    var states = (data.sourceStates || []).map(function (s) { return s.sourceId + '=' + s.state }).join(' · ')
    el.textContent = (prefix || '') + '已载 ' + (pool.loaded || 0) + ' 条 / 返回 ' + (pool.returned || 0) + ' 条 · 相关 ' + (data.relevantCount == null ? '未知' : data.relevantCount)
      + ' 条 · 快照 ' + (data.snapshotDate || '未记录') + ' · 不是全库扫描 · 通道终态：' + (states || '未记录')
      + (data.relevantCount === 0 ? ' · 相关 0 不等于「没有研究」：检索词命中才进池、通道召回有限' : '')
  }

  function renderMatch() {
    var data = state.match
    var list = $('matchList'); if (!list) return
    if (!data || !data.available) { renderMatchNote(data, 'matchPoolNote', '候选池口径：'); $('matchSummary').textContent = '暂无匹配结果'; list.innerHTML = ''; return }
    renderMatchNote(data, 'matchPoolNote', '候选池口径：')
    var dist = data.distribution || {}
    $('matchSummary').textContent = '共 ' + data.results.length + ' 条候选 · ' + Object.keys(dist).map(function (k) { return k + ' ' + dist[k] }).join(' / ') + (data.profileFilled ? '' : ' · 基础档案还是空的：先填写才会出现可对照项')
    if (!data.results.length) { list.innerHTML = '<div class="empty">没有匹配结果。可以改关键词；相关 0 不等于没有研究。</div>'; return }
    list.innerHTML = data.results.slice(0, 30).map(function (r) {
      var crit = (r.criteria || []).slice().sort(function (a, b) { var rank = { mismatch: 0, unknown: 1, match: 2 }; return rank[a.state] - rank[b.state] })
      var score = r.pct === null ? '<div class="score-value" style="font-size:17px;color:var(--amber)">—</div><p class="small-note">可对照项不足 2 条，不给百分数</p>' : '<div class="score-value">' + r.pct + '%</div><p class="small-note">登记字段符合度</p>'
      return '<article class="card"><div class="row between top"><div style="min-width:0"><h4>' + esc(r.title) + '</h4><p class="small-note">' + esc(r.recordId) + ' · ' + esc(r.status || '状态未记录') + ' · 快照 ' + esc(r.snapshotDate || '') + '</p></div><div style="text-align:right">' + score + '</div></div>'
        + '<div class="badge ' + (r.hardExcluded ? 'coral' : 'teal') + '" style="margin:10px 0 6px">' + r.matched + ' / ' + r.denominator + ' 项对得上 · ' + r.unknown + ' 项待确认 · ' + esc(r.band) + '</div>'
        + '<div class="stack" style="gap:5px">' + crit.map(function (c) {
          var cls = c.state === 'mismatch' ? 'danger' : c.state === 'unknown' ? 'warn' : 'info'
          return '<div class="alert ' + cls + '" style="padding:8px 10px"><strong>' + (c.state === 'mismatch' ? '✕' : c.state === 'unknown' ? '?' : '✓') + ' ' + esc(c.label) + '</strong>'
            + '<div class="small-note">记录里是：' + esc(c.record) + ' · 条件要求：' + esc(c.requirement) + (c.evidence ? ' · 原文线索：' + esc(c.evidence) : '') + '</div></div>'
        }).join('') + '</div>'
        + '<div class="row" style="margin-top:10px"><button class="btn-sm" type="button" data-save-trial="' + esc(r.recordId) + '">收藏</button>'
        + '<a class="btn-sm" href="' + esc(r.sourceUrl || '#') + '" target="_blank" rel="noopener" data-external="' + esc(r.sourceUrl || '') + '">官方登记页 ↗</a>'
        + '<span class="small-note">不是入组资格 · 登记状态未核实，以官方登记页为准</span></div></article>'
    }).join('')
  }

  function refreshMatch() {
    if (!API_READY) { state.match = { available: false, reason: '静态演示态：匹配需要本机服务与真实快照。' }; renderMatch(); return Promise.resolve() }
    var p = currentProfile()
    if (!p) { state.match = { available: false, reason: '没有档案' }; renderMatch(); return Promise.resolve() }
    var kw = $('matchKeyword') ? $('matchKeyword').value.trim() : ''
    return apiFetch('/trials/match?profileKey=' + encodeURIComponent(p.profileKey) + '&keyword=' + encodeURIComponent(kw))
      .then(function (data) { state.match = data; renderMatch() })
      .catch(function (err) { state.match = { available: false, reason: '匹配请求失败：' + err.message }; renderMatch() })
  }

  function doSearch() {
    if (!API_READY) { state.search = { available: false, reason: '静态演示态：检索需要本机服务与真实快照。' }; renderSearch(); return }
    var q = '/trials?keyword=' + encodeURIComponent(($('trialKeyword') || {}).value || '')
      + '&status=' + encodeURIComponent(($('trialStatus') || {}).value || '')
      + '&studyType=' + encodeURIComponent(($('trialStudyType') || {}).value || '')
      + '&relevantOnly=' + (($('trialRelevantOnly') || {}).checked ? 'true' : 'false')
    apiFetch(q).then(function (data) { state.search = data; renderSearch() }).catch(function (err) { state.search = { available: false, reason: '检索失败：' + err.message }; renderSearch() })
  }

  function renderSearch() {
    var data = state.search, box = $('searchResults'); if (!box) return
    if (!data || !data.available) { renderMatchNote(data, 'searchPoolNote', ''); box.innerHTML = ''; return }
    renderMatchNote(data, 'searchPoolNote', '')
    var st = $('trialStatus'), ty = $('trialStudyType')
    var statuses = (data.candidatePool && data.candidatePool.statuses) || []
    var types = (data.candidatePool && data.candidatePool.studyTypes) || []
    if (st && !st.options.length) st.innerHTML = '<option value="">全部状态</option>' + statuses.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>' }).join('')
    if (ty && !ty.options.length) ty.innerHTML = '<option value="">全部类型</option>' + types.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>' }).join('')
    if (!data.records.length) { box.innerHTML = '<div class="empty">没有命中。可以清空条件重试；相关 0 不等于没有研究。</div>'; return }
    box.innerHTML = data.records.map(function (r) {
      return '<article class="card"><div class="row between top"><div><h4>' + esc(r.title) + '</h4><p class="small-note">' + esc(r.recordId) + ' · ' + (r.relevant ? '<span class="tag ok">相关</span>' : '<span class="tag">✕ 相关</span>') + ' · ' + esc(r.status || '状态未记录') + ' · ' + esc(r.studyType || '类型未记录') + (r.conditions ? ' · ' + esc(r.conditions) : '') + '</p></div>'
        + '<button class="btn-sm" type="button" data-save-trial="' + esc(r.recordId) + '">收藏</button></div></article>'
    }).join('')
  }

  function savedStates() { try { return JSON.parse(localStorage.getItem('gib.savedStates') || '{}') } catch (e) { return {} } }
  function savedState(id) { return savedStates()[id] || '在跟' }
  function setSavedState(id, next) { var all = savedStates(); all[id] = next; try { localStorage.setItem('gib.savedStates', JSON.stringify(all)) } catch (e) { /* 隐私模式 */ } }

  function refreshSaved() {
    if (!API_READY) { state.saved = []; renderSaved(); return Promise.resolve() }
    var p = currentProfile()
    if (!p || p.isDemo) { state.saved = []; renderSaved(); return Promise.resolve() }
    return apiFetch('/saved-trials?profileKey=' + encodeURIComponent(p.profileKey)).then(function (data) { state.saved = data.records || []; renderSaved() }).catch(function () { state.saved = []; renderSaved() })
  }
  function renderSaved() {
    var box = $('savedList'); if (!box) return
    if (!state.saved.length) { box.innerHTML = '<div class="empty">还没有收藏。在「检索」或「匹配卡」点「收藏」会保存在本机；取消收藏没有副作用。</div>'; return }
    box.innerHTML = state.saved.map(function (r) {
      return '<article class="card"><div class="row between top"><div><h4>' + esc(r.title || r.recordId) + '</h4><p class="small-note">' + esc(r.recordId) + ' · 收藏于 ' + esc(r.savedAt || '') + ' · 快照 ' + esc(r.snapshotDate || '未记录') + ' · 登记状态未核实</p></div>'
        + '<div class="row"><span class="badge">' + esc(savedState(r.recordId)) + '</span><button class="btn-sm" type="button" data-saved-state="' + esc(r.recordId) + '">切换状态</button><button class="btn-sm" type="button" data-unsave="' + esc(r.recordId) + '">取消收藏</button></div></div></article>'
    }).join('')
  }

  function saveTrial(recordId) {
    var p = currentProfile()
    if (!p) { toast('先新建档案'); return }
    if (!API_READY || p.isDemo) { toast('演示/合成档案不写收藏'); return }
    var found = null
    ;(state.match && state.match.results || []).forEach(function (r) { if (r.recordId === recordId) found = r })
    ;(state.search && state.search.records || []).forEach(function (r) { if (!found && r.recordId === recordId) found = r })
    apiJson('/saved-trials?profileKey=' + encodeURIComponent(p.profileKey), 'POST', { recordId: recordId, title: found ? found.title : null, studyType: found ? found.studyType : null, status: found ? found.status : null, sourceUrl: found ? found.sourceUrl : null, snapshotDate: found ? found.snapshotDate : (state.trialMeta && state.trialMeta.snapshotDate) })
      .then(function (data) { state.saved = data.records || []; renderSaved(); toast('已收藏（只存登记元信息）') })
      .catch(function (err) { toast('收藏失败：' + err.message) })
  }
  function unsaveTrial(recordId) {
    var p = currentProfile(); if (!p) return
    apiFetch('/saved-trials?profileKey=' + encodeURIComponent(p.profileKey) + '&recordId=' + encodeURIComponent(recordId), { method: 'DELETE' })
      .then(function (data) { state.saved = data.records || []; renderSaved(); toast('已取消收藏') }).catch(function (err) { toast('取消失败：' + err.message) })
  }
  function loadTrialProfile() {
    var p = currentProfile()
    if (!p) { state.trialProfile = null; fillTrialProfile(); return Promise.resolve() }
    if (!API_READY || p.isDemo) { var d = demoProfile(p.profileKey); state.trialProfile = (d && d.trialFacts) || null; fillTrialProfile(); return Promise.resolve() }
    return apiFetch('/trial-profile?profileKey=' + encodeURIComponent(p.profileKey)).then(function (data) { state.trialProfile = data.profile || null; fillTrialProfile() }).catch(function () { state.trialProfile = null; fillTrialProfile() })
  }
  function fillTrialProfile() {
    var p = state.trialProfile || {}
    if ($('tpAge')) $('tpAge').value = p.age == null ? '' : p.age
    if ($('tpSex')) $('tpSex').value = p.sex || ''
    if ($('tpDiagnosis')) $('tpDiagnosis').value = p.diagnosisConfirmed === true ? 'yes' : p.diagnosisConfirmed === false ? 'no' : ''
    if ($('tpPregnant')) $('tpPregnant').value = p.pregnant || ''
    if ($('tpLiver')) $('tpLiver').value = p.liverDisease === true ? 'yes' : p.liverDisease === false ? 'no' : ''
    if ($('tpHeart')) $('tpHeart').value = p.heartFailure === true ? 'yes' : p.heartFailure === false ? 'no' : ''
    if ($('tpNote')) $('tpNote').value = p.note || ''
    if ($('tpSigns')) [].slice.call($('tpSigns').querySelectorAll('input')).forEach(function (x) { x.checked = (p.bleedingSigns || []).indexOf(x.value) >= 0 })
    if ($('tpMeds')) [].slice.call($('tpMeds').querySelectorAll('input')).forEach(function (x) { x.checked = (p.antithrombotic || []).indexOf(x.value) >= 0 })
  }
  function saveTrialProfile(e) {
    e.preventDefault()
    var p = currentProfile(); if (!p) { toast('先新建档案'); return }
    var input = {
      age: ($('tpAge') || {}).value || '', sex: ($('tpSex') || {}).value || '',
      diagnosisConfirmed: ($('tpDiagnosis') || {}).value === 'yes' ? true : ($('tpDiagnosis') || {}).value === 'no' ? false : null,
      bleedingSigns: [].slice.call($('tpSigns').querySelectorAll('input:checked')).map(function (x) { return x.value }),
      antithrombotic: [].slice.call($('tpMeds').querySelectorAll('input:checked')).map(function (x) { return x.value }),
      pregnant: ($('tpPregnant') || {}).value || '',
      liverDisease: ($('tpLiver') || {}).value === 'yes' ? true : ($('tpLiver') || {}).value === 'no' ? false : null,
      heartFailure: ($('tpHeart') || {}).value === 'yes' ? true : ($('tpHeart') || {}).value === 'no' ? false : null,
      note: ($('tpNote') || {}).value.trim(),
    }
    if (!API_READY || p.isDemo) { state.trialProfile = Object.assign({}, state.trialProfile || {}, input); $('trialProfileStatus').textContent = '演示档案：不写库'; refreshMatch(); return }
    apiJson('/trial-profile?profileKey=' + encodeURIComponent(p.profileKey), 'PUT', input).then(function (data) {
      state.trialProfile = data.profile || null; $('trialProfileStatus').textContent = '已保存到本机数据库'; refreshMatch(); toast('基础档案已保存')
    }).catch(function (err) { $('trialProfileStatus').textContent = '保存失败：' + err.message })
  }

  /* ---------------- 专科与资源 ---------------- */
  function pageResources() {
    var sub = state.sub || 'centers'
    var body = ''
    if (sub === 'centers') {
      body = '<div class="alert warn">下面是公开资料中与消化道出血/内镜相关的专科中心整理，<strong>不是排序，也不是推荐</strong>；出诊、急诊绿色通道与转诊安排请以医院官方公布为准。跨省就医前先电话确认。</div>'
        + '<div class="grid two" style="margin-top:12px">' + CENTERS.map(function (c) {
          return '<section class="card center-card"><div class="center-top"><h4>' + esc(c.name) + '</h4><span class="badge outline">' + esc(c.region) + '</span></div>'
            + '<div class="tags">' + c.tags.map(function (t) { return '<span class="badge teal">' + esc(t) + '</span>' }).join('') + '</div>'
            + '<p>' + esc(c.note) + '</p>'
            + '<div class="src">来源：' + esc(c.src) + ' · <a href="' + esc(c.url) + '" target="_blank" rel="noopener" data-external="' + esc(c.url) + '">原文入口 ↗</a></div></section>'
        }).join('') + '</div>'
        + '<section class="section"><div class="section-head"><h2>怎么选、怎么问</h2></div><div class="grid three">'
        + '<div class="card"><h4>先看「有没有急诊内镜」</h4><p class="small-note">出血是急症，能否 24 小时做急诊内镜比「名气」更重要；电话确认绿色通道。</p></div>'
        + '<div class="card"><h4>带上既往内镜与手术史</h4><p class="small-note">尤其是脾切除、胰腺手术、静脉曲张治疗史；医生需要这些决定复查节奏。</p></div>'
        + '<div class="card"><h4>问清复查与转诊</h4><p class="small-note">外地就医要问：复查能否在当地做、报告怎么传、再次出血先去哪。</p></div>'
        + '</div></section>'
        + '<div class="alert info" style="margin-top:14px">社区站点 xhs.xiaoyibao.com.cn 在 2026-11-20 实测无法解析（DNS 失败），本轮未引用其内容；如你能打开，可把相关页面链接补充到「指南与来源」。</div>'
    } else {
      body = '<section class="card flush"><table class="data-table"><thead><tr><th>文件</th><th>机构</th><th>版本</th><th>取得状态</th><th>入口</th></tr></thead><tbody>'
        + SOURCES.map(function (s) {
          return '<tr><td><b>' + esc(s.name) + '</b></td><td>' + esc(s.org) + '</td><td class="num">' + esc(s.year) + '</td><td><span class="tag wait">' + esc(s.status) + '</span></td><td><a href="' + esc(s.url) + '" target="_blank" rel="noopener" data-external="' + esc(s.url) + '">打开 ↗</a></td></tr>'
        }).join('') + '</tbody></table></section>'
        + '<div class="alert warn" style="margin-top:12px">以上为公开检索记录，不是完整清单；中国规范的现行性与适用性需临床审阅确认。未取得原件的条目只作线索，不作引用依据。</div>'
        + '<section class="section"><div class="section-head"><h2>本台怎么用这些资料</h2></div><div class="grid three">'
        + '<div class="card"><h4>只用「识别与求助」语言</h4><p class="small-note">风险评分、输血阈值、内镜时机、药物方案不转成患者自己执行的指令。</p></div>'
        + '<div class="card"><h4>每个说法留来源</h4><p class="small-note">未取得原件时如实标注；不把摘要当全文，不把境外指南直接当中国规范。</p></div>'
        + '<div class="card"><h4>待临床审阅</h4><p class="small-note">0 访谈、0 临床审核；本版内容为编辑整理，正式发布前需专业核对。</p></div>'
        + '</div></section>'
    }
    return pageHead('专科与资源', '知道去哪里、带什么、问什么；不做医院排序，也不替代转诊。') + subnav('resources') + body
  }

  /* ---------------- 渲染主流程 ---------------- */
  function renderNav() {
    var nav = $('nav'); if (!nav) return
    var groups = {}
    PAGES.forEach(function (p) { (groups[p[4]] = groups[p[4]] || []).push(p) })
    var counts = { monitor: state.records.length, clinical: state.saved.length, aftercare: recordsOf('question').length }
    nav.innerHTML = Object.keys(groups).map(function (g) {
      return '<div class="nav-group"><p class="nav-group-label">' + esc(g) + '</p>' + groups[g].map(function (p) {
        var active = state.page === p[0]
        return '<button class="nav-button" type="button" data-goto="' + p[0] + '" aria-current="' + (active ? 'page' : 'false') + '">' + icon(p[2]) + '<span class="nav-label">' + esc(p[1]) + '</span>'
          + (counts[p[0]] ? '<span class="nav-count">' + counts[p[0]] + '</span>' : '') + '</button>'
      }).join('') + '</div>'
    }).join('')
    var pageDef = PAGES.filter(function (p) { return p[0] === state.page })[0]
    var sl = pageDef && pageDef[3] && state.sub ? subLabel(state.page, state.sub) : ''
    $('breadcrumb').textContent = pageDef ? pageDef[1] + (sl ? ' · ' + sl : '') : '看板'
  }

  function renderPage() {
    var page = state.page
    var def = PAGES.filter(function (p) { return p[0] === page })[0]
    if (def && def[3] && !state.sub) state.sub = def[3][0][0]
    var html = ''
    if (!API_READY && !state.profiles.length) html = '<div class="empty">载入中…</div>'
    else if (page === 'dashboard') html = pageDashboard()
    else if (page === 'prevent') html = pagePrevent()
    else if (page === 'monitor') html = pageMonitor()
    else if (page === 'emergency') html = pageEmergency()
    else if (page === 'metrics') html = pageMetrics()
    else if (page === 'aftercare') html = pageAftercare()
    else if (page === 'varices') html = pageVarices()
    else if (page === 'clinical') html = pageClinical()
    else if (page === 'resources') html = pageResources()
    $('main').innerHTML = html
    renderNav()
    if (page === 'clinical') {
      fillTrialProfile()
      if (state.sub === 'match') { refreshMatch(); refreshSaved() }
      else if (state.sub === 'search') { if (!state.search) doSearch(); else renderSearch() }
      else refreshSaved()
    }
    // 记录表单与页面元素绑定（委托在 document 上；这里只做初始化）
  }

  function goto(route) {
    var clean = String(route || '').replace(/^#/, '')
    var parts = clean.split('/')
    var page = parts[0], sub = parts[1]
    if (!PAGES.some(function (p) { return p[0] === page })) page = 'dashboard'
    var def = PAGES.filter(function (p) { return p[0] === page })[0]
    state.page = page
    state.sub = sub ? decodeURIComponent(sub) : defaultSub(page)
    if (location.hash !== '#' + clean) { try { history.pushState(null, '', '#' + clean) } catch (e) { location.hash = clean } }
    renderPage()
    $('main').scrollIntoView({ block: 'start', behavior: 'auto' })
  }

  /* ---------------- 对话框 ---------------- */
  function openDialog(opts) {
    var dlg = $('dialog')
    $('dialogEyebrow').textContent = opts.eyebrow || '工作台'
    $('dialogTitle').textContent = opts.title || ''
    $('dialogBody').innerHTML = opts.body || ''
    $('dialogFoot').innerHTML = opts.foot || '<button class="btn-ghost" type="button" data-action="close-dialog">关闭</button>'
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '')
  }
  function closeDialog() { var dlg = $('dialog'); if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open') }

  function openSettings() {
    var channels = state.channels || []
    var labels = { ready: '已查询', failed: '失败（不算查过）', timeout: '超时（不算查过）', unconfigured: '未配置（不算查过）', partial: '部分召回', truncated: '结果被截断' }
    var body = '<nav class="subnav" role="tablist">'
      + ['dir', 'db', 'privacy'].map(function (t, i) {
        var name = ['资料目录', '临床数据库', '隐私'][i]
        return '<button type="button" role="tab" aria-selected="' + (state.settingsTab === t ? 'true' : 'false') + '" data-settings-tab="' + t + '">' + name + '</button>'
      }).join('') + '</nav>'
      + '<div id="settingsBody">' + settingsBody() + '</div>'
    openDialog({ eyebrow: '设置', title: '工作台设置', body: body, foot: '<button class="btn-ghost" type="button" data-action="close-dialog">关闭</button>' })
  }
  function settingsBody() {
    if (state.settingsTab === 'db') {
      var labels = { ready: '已查询', failed: '失败（不算查过）', timeout: '超时（不算查过）', unconfigured: '未配置（不算查过）', partial: '部分召回', truncated: '结果被截断' }
      if (!state.channels.length) return '<div class="empty">静态演示态：通道终态需要本机服务读取快照 manifest。</div>'
      return '<div class="list">' + state.channels.map(function (c) {
        return '<div class="list-item"><span class="li-icon">' + (c.state === 'ready' ? '✓' : '!') + '</span><span class="li-main"><b>' + esc(c.sourceId) + '</b><p>' + esc(labels[c.state] || c.state) + '</p></span></div>'
      }).join('') + '</div><p class="small-note" style="margin-top:10px">「相关 0」不等于「没有研究」：只有检索词命中才进池，通道召回有限。快照日期：' + esc((state.trialMeta && state.trialMeta.snapshotDate) || '未记录') + '</p>'
    }
    if (state.settingsTab === 'privacy') {
      return '<div class="list"><div class="list-item"><span class="li-icon">1</span><span class="li-main"><b>记录只写本机</b><p>资料目录由宿主选择器决定；主目录、桌面、下载根、tmp 会被拒绝。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">2</span><span class="li-main"><b>私密记录不进摘要/导出</b><p>私密只影响本台展示与导出，不改变医院系统里的任何信息。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">3</span><span class="li-main"><b>AI 草稿只填入、不发送</b><p>是否发送由你按回车决定。</p></span></div></div>'
    }
    return '<div class="field"><label>当前资料目录</label><p class="fact-value" style="font-size:13px">' + esc(state.dataDir || (API_READY ? '（服务未返回）' : '演示态：未连接本机服务')) + '</p></div>'
      + '<p class="small-note" style="margin-top:8px">切换目录用顶栏「资料目录」；本页只显示当前值，不编造路径。</p>'
  }
  function switchSettingsTab(tab) {
    state.settingsTab = tab
    var dlg = $('dialog')
    ;[].slice.call(dlg.querySelectorAll('[data-settings-tab]')).forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-settings-tab') === tab ? 'true' : 'false') })
    $('settingsBody').innerHTML = settingsBody()
  }

  function openHelp() {
    openDialog({
      eyebrow: '帮助', title: '这页怎么用',
      body: '<div class="list">'
        + '<div class="list-item"><span class="li-icon">1</span><span class="li-main"><b>先看「识别与预防」</b><p>记住需要马上求助的表现；其余页面都是为了把信息准备好。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">2</span><span class="li-main"><b>平时在「家庭监测」记几笔</b><p>大便颜色、血压脉搏、血红蛋白、用药；不确定就留空。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">3</span><span class="li-main"><b>出血时用「急诊与送医」</b><p>先拨 120，再按现场处理做；不要先填表。</p></span></div>'
        + '<div class="list-item"><span class="li-icon">4</span><span class="li-main"><b>复诊前用「问题清单」</b><p>把想问的按顺序排好，复制或下载带走。</p></span></div>'
        + '</div><div class="alert info" style="margin-top:12px">本台不诊断、不分级、不给药；所有记录只在本机。</div>',
    })
  }
  function openAbout() {
    openDialog({
      eyebrow: '关于', title: '消化道出血工作台',
      body: '<p class="small-note">交互原型 v0.3 · 2026-11-20 · 合成示例数据。</p>'
        + '<p class="small-note" style="margin-top:6px">品牌名仍为占位（待追认）；内容编辑整理，0 访谈、0 临床审核，标注来源与取得状态。</p>'
        + '<p class="small-note" style="margin-top:6px">不诊断、不分级、不给药；紧急情况请拨打 120。</p>',
    })
  }

  function openQuestionDialog() {
    openDialog({
      eyebrow: '问题清单', title: '添加一个要问医生的问题',
      body: '<div class="field"><label for="newQuestion">问题</label><textarea id="newQuestion" placeholder="例如：下次复查胃镜大概什么时候？"></textarea></div>'
        + '<div class="field"><label for="newQuestionBy">谁问</label><select id="newQuestionBy"><option>本人</option><option>照护者</option></select></div>',
      foot: '<button class="btn-ghost" type="button" data-action="close-dialog">取消</button><button class="btn-primary" type="button" data-action="save-question">保存</button>',
    })
  }

  /* ---------------- 本地小存储 ---------------- */
  function readLocal(key, dflt) { try { var v = localStorage.getItem(key); return v == null ? dflt : v } catch (e) { return dflt } }

  /* ---------------- 事件 ---------------- */
  function bindEvents() {
    document.addEventListener('click', function (e) {
      var gotoEl = e.target.closest('[data-goto]')
      if (gotoEl) { goto(gotoEl.getAttribute('data-goto')); e.preventDefault(); return }
      var sub = e.target.closest('[data-sub]')
      if (sub) {
        state.sub = sub.getAttribute('data-sub')
        goto(state.page + '/' + encodeURIComponent(state.sub)); return
      }
      var quick = e.target.closest('[data-quick-kind]')
      if (quick) {
        state.currentKind = quick.getAttribute('data-quick-kind')
        var fields = $('quickFields'); if (fields) fields.innerHTML = renderFields(state.currentKind)
        ;[].slice.call(document.querySelectorAll('[data-quick-kind]')).forEach(function (b) { b.style.cssText = b === quick ? 'background:var(--teal-soft);border-color:#a9cec0;color:var(--teal-deep)' : '' })
        return
      }
      var pick = e.target.closest('[data-pick-profile]')
      if (pick) { closeDialog(); switchProfile(pick.getAttribute('data-pick-profile')); return }
      var del = e.target.closest('[data-delete-record]')
      if (del) { if (window.confirm('删除这条记录？删除后不可恢复。')) deleteRecord(del.getAttribute('data-delete-record')); return }
      var priv = e.target.closest('[data-toggle-private]')
      if (priv) { togglePrivate(priv.getAttribute('data-toggle-private')); return }
      var saveT = e.target.closest('[data-save-trial]')
      if (saveT) { saveTrial(saveT.getAttribute('data-save-trial')); return }
      var unsave = e.target.closest('[data-unsave]')
      if (unsave) { unsaveTrial(unsave.getAttribute('data-unsave')); return }
      var st = e.target.closest('[data-saved-state]')
      if (st) { var id = st.getAttribute('data-saved-state'); var order = ['在跟', '准备问', '已归档']; setSavedState(id, order[(order.indexOf(savedState(id)) + 1) % order.length]); renderSaved(); return }
      var settingsTab = e.target.closest('[data-settings-tab]')
      if (settingsTab) { switchSettingsTab(settingsTab.getAttribute('data-settings-tab')); return }
      var action = e.target.closest('[data-action]')
      if (action) { handleAction(action.getAttribute('data-action')); e.preventDefault(); return }
      var ext = e.target.closest('[data-external]')
      if (ext) {
        var url = ext.getAttribute('data-external')
        if (!url || url === '#') return
        var w = null; try { w = window.open(url, '_blank', 'noopener') } catch (err) { w = null }
        if (!w && window.parent !== window) { try { window.parent.postMessage({ type: 'gastrointestinal-bleeding:open-external', url: url }, window.location.origin) } catch (err) { /* 沙箱静默 */ } }
        e.preventDefault()
      }
    })
    document.addEventListener('submit', function (e) {
      if (e.target.id === 'quickForm') {
        e.preventDefault()
        var got = collectQuick()
        if (got.empty) { toast('请至少填写一项内容'); return }
        addRecord(state.currentKind, got.data)
        e.target.reset()
        return
      }
      if (e.target.id === 'trialProfileForm') { saveTrialProfile(e); return }
    })
    document.addEventListener('change', function (e) {
      if (e.target.id === 'kindFilter') { state.kindFilter = e.target.value; renderPage(); return }
      if (e.target.getAttribute && e.target.getAttribute('data-check') != null) {
        var idx = e.target.getAttribute('data-check')
        try { localStorage.setItem('gib.check.' + state.currentKey + '.' + idx, e.target.checked ? '1' : '0') } catch (err) { /* 隐私模式 */ }
      }
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.target.id === 'matchKeyword' || e.target.id === 'trialKeyword')) { e.preventDefault(); if (e.target.id === 'matchKeyword') refreshMatch(); else doSearch() }
    })
    window.addEventListener('popstate', function () {
      var h = String(location.hash || '').replace('#', '')
      if (h && h !== 'disease-primer') goto(h)
    })
    window.addEventListener('hashchange', function () {
      var h = String(location.hash || '').replace('#', '')
      if (h && h !== 'disease-primer') goto(h)
    })
    // 简易测试钩子（真实业务不依赖）
    window.GIWorkbench = {
      get state() { return state },
      goto: goto,
      switchProfile: switchProfile,
      apiReady: API_READY,
    }
  }

  function handleAction(action) {
    if (action === 'profiles') { openProfilesDialog(); return }
    if (action === 'new-profile') { openNewProfileDialog(); return }
    if (action === 'create-profile') { createProfileFromDialog(); return }
    if (action === 'settings') { openSettings(); return }
    if (action === 'help') { openHelp(); return }
    if (action === 'about') { openAbout(); return }
    if (action === 'close-dialog') { closeDialog(); return }
    if (action === 'copy-summary') { copyText('消化道出血就诊事实摘要（用户记录；非诊断）\n' + summaryText()); return }
    if (action === 'export-summary') { downloadText(); return }
    if (action === 'clear-quick') { var form = $('quickForm'); if (form) form.reset(); toast('已清空本次输入'); return }
    if (action === 'save-plan') {
      var next = {
        hospital: ($('planHospital') || {}).value || '', nextVisit: ($('planNext') || {}).value || '',
        transport: ($('planTransport') || {}).value || '', contact: ($('planContact') || {}).value || '',
      }
      savePlan(next)
      if ($('planNote')) $('planNote').textContent = '已保存到本机'
      toast('送医预案已保存到本机')
      return
    }
    if (action === 'save-aftercare') {
      var p = plan(); p.nextVisit = ($('afterNext') || {}).value || p.nextVisit; p.hospital = ($('afterHospital') || {}).value || p.hospital; savePlan(p); toast('已保存'); return
    }
    if (action === 'save-redline') {
      try { localStorage.setItem('gib.redline.' + state.currentKey, ($('redlineText') || {}).value || '') } catch (e) { /* 隐私模式 */ }
      toast('已保存到本机'); return
    }
    if (action === 'open-question') { openQuestionDialog(); return }
    if (action === 'save-question') {
      var text = (($('newQuestion') || {}).value || '').trim()
      if (!text) { toast('请填写问题'); return }
      addRecord('question', { text: text, recordedBy: ($('newQuestionBy') || {}).value || '本人', date: new Date().toISOString().slice(0, 10) })
      closeDialog(); return
    }
    if (action === 'copy-questions') {
      var qs = recordsOf('question').map(function (q, i) { return (i + 1) + '. ' + (q.text || '') }).join('\n')
      copyText(qs || '还没有问题'); return
    }
    if (action === 'export-questions') {
      var blob = new Blob(['就诊问题清单\n\n' + recordsOf('question').map(function (q, i) { return (i + 1) + '. ' + (q.text || '') }).join('\n')], { type: 'text/plain;charset=utf-8' })
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '就诊问题清单.txt'; a.click(); URL.revokeObjectURL(a.href); toast('已生成文本文件'); return
    }
    if (action === 'copy-varices-note') { copyText('我做过胰体尾切除和脾切除（____年）。最近有黑便/呕血，血红蛋白从 ____ 降到 ____。想请您评估胃底静脉曲张和再次出血的风险。'); return }
    if (action === 'refresh-match') { refreshMatch(); return }
    if (action === 'do-search') { doSearch(); return }
    if (action === 'agent-draft') {
      var prompt = '以下是本工作台整理的就诊事实摘要（不是诊断，请勿据此判断病情）：\n' + summaryText()
      if (window.parent !== window) {
        try { window.parent.postMessage({ type: 'gastrointestinal-bleeding:agent-draft', prompt: prompt }, window.location.origin) } catch (e) { /* 沙箱静默 */ }
        toast('已把摘要发给工作台外壳（只填入草稿，不自动发送）')
      } else toast('演示态：AI 草稿需要宿主外壳；这里不会发送')
      return
    }
    if (action === 'pick-dir') {
      if (window.parent !== window) {
        try { window.parent.postMessage({ type: 'gastrointestinal-bleeding:pick-directory' }, window.location.origin) } catch (e) { /* 沙箱静默 */ }
      } else toast('资料目录由宿主选择器决定；静态原型不访问本机文件')
      return
    }
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    bindEvents()
    var h = String(location.hash || '').replace('#', '')
    if (h && h !== 'disease-primer') {
      var parts = h.split('/')
      if (PAGES.some(function (p) { return p[0] === parts[0] })) { state.page = parts[0]; state.sub = parts[1] ? decodeURIComponent(parts[1]) : null }
    }
    var ft = $('fontToggle')
    if (ft) ft.addEventListener('click', function () {
      var on = document.body.classList.toggle('large')
      ft.setAttribute('aria-pressed', on ? 'true' : 'false')
    })
    loadBootstrap().then(function () {
      renderProfile()
      return Promise.all([loadRecords(), loadTrialProfile()])
    }).then(function () {
      renderProfile(); renderPage()
      if (state.page === 'clinical') loadTrialProfile()
      if (!API_READY) toast('静态演示态：记录只在本页，刷新重置')
    }).catch(function (err) {
      state.profiles = (DEMO.profiles || []).map(function (p) { return { profileKey: p.profileKey, name: p.name, meta: p.meta, avatar: p.avatar, isDemo: true } })
      state.currentKey = state.profiles[0] ? state.profiles[0].profileKey : null
      state.records = state.currentKey === 'b' ? (demoProfile('b').records || []).slice() : (demoProfile('a').records || []).slice()
      renderProfile(); renderPage()
      toast('服务连接失败，已回退演示数据：' + err.message)
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})();