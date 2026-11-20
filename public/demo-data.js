/* 两套合成档案（唯一演示源；全部虚构，不含真实患者信息）
 * A = 首次突发、信息不全；B = 反复出血、长期随访、合并抗栓药。
 * 记录形状：{ id, kind, date, ...字段, recordedBy, sourceNote, private? }
 * 八类 kind：bleed / lab / treatment / question / hospital / report / doc / mind
 * 服务端只按 profile_key 取真实档案记录；demo a/b 读这里，不重复落库（单一事实源）。
 */
window.GIB_DEMO = {
  notice: '合成示例 · 全部为虚构内容；不构成诊断、分级或处置建议。',
  profiles: [
    {
      profileKey: 'a',
      name: '示例组 A · 首次突发',
      meta: '68 岁 · 首次出现黑便 · 记录少',
      records: [
        { id: 'bleed-a1', kind: 'bleed', date: '2026-11-18', observed: ['黑便'], when: '今天约 14:30', note: '排便颜色很深，次数与量记不清；没有呕血。', recordedBy: '本人', sourceNote: '本人亲见', createdAt: '2026-11-18T15:00:00Z' },
        { id: 'hospital-a1', kind: 'hospital', date: '2026-11-18', place: '合成医院急诊', reason: '黑便后就诊（虚构）', note: '医生建议留观；具体检查名称待补。', recordedBy: '本人', sourceNote: '就诊记录（合成）', createdAt: '2026-11-18T22:10:00Z' },
        { id: 'question-a1', kind: 'question', text: '复查时想问：大便颜色正常的判断标准是什么？', recordedBy: '本人', sourceNote: '自己的问题', createdAt: '2026-11-19T09:00:00Z' },
      ],
    },
    {
      profileKey: 'b',
      name: '示例组 B · 反复出血长期随访',
      meta: '74 岁 · 多年反复 · 合并抗凝药',
      records: [
        { id: 'bleed-b1', kind: 'bleed', date: '2026-10-28', observed: ['黑便', '头晕或晕厥'], when: '凌晨 3 点左右', note: '起夜时头晕，随后发现黑便；由家属陪同。', recordedBy: '照护者', sourceNote: '照护者亲见', createdAt: '2026-10-28T04:20:00Z' },
        { id: 'bleed-b2', kind: 'bleed', date: '2026-11-12', observed: ['血便或便血'], when: '晚饭后', note: '便中带鲜红色，量不多；当天没有头晕。', recordedBy: '本人', sourceNote: '本人亲见', createdAt: '2026-11-12T20:05:00Z' },
        { id: 'bleed-b3', kind: 'bleed', date: '2026-06-03', observed: ['呕血'], when: '上午', note: '呕吐物带血丝，随后就诊。', recordedBy: '照护者', sourceNote: '照护者亲见', createdAt: '2026-06-03T11:30:00Z' },
        { id: 'lab-b1', kind: 'lab', date: '2026-10-28', item: '血红蛋白（Hb）', value: '92', unit: 'g/L', note: '急诊化验单抄录（合成）；参考范围未取得，不判断高低。', recordedBy: '照护者', sourceNote: '化验单（合成）', createdAt: '2026-10-28T06:00:00Z' },
        { id: 'lab-b2', kind: 'lab', date: '2026-11-02', item: '血红蛋白（Hb）', value: '104', unit: 'g/L', note: '复查化验单抄录（合成）。', recordedBy: '照护者', sourceNote: '化验单（合成）', createdAt: '2026-11-02T10:00:00Z' },
        { id: 'lab-b3', kind: 'lab', date: '2026-11-12', item: '血红蛋白（Hb）', value: '99', unit: 'g/L', note: '门诊复查（合成）。', recordedBy: '本人', sourceNote: '化验单（合成）', createdAt: '2026-11-12T16:40:00Z' },
        { id: 'lab-b4', kind: 'lab', date: '2026-09-15', item: '血小板（PLT）', value: '186', unit: '×10⁹/L', note: '住院期间化验（合成）。', recordedBy: '照护者', sourceNote: '化验单（合成）', createdAt: '2026-09-15T09:00:00Z' },
        { id: 'lab-b5', kind: 'lab', date: '2026-09-15', item: '尿素氮（BUN）', value: '9.8', unit: 'mmol/L', note: '住院期间化验（合成）；参考范围未取得。', recordedBy: '照护者', sourceNote: '化验单（合成）', createdAt: '2026-09-15T09:00:00Z' },
        { id: 'treatment-b1', kind: 'treatment', date: '2026-10-28', name: '静脉补液与输血评估（院内）', note: '仅记录医生告知的处理名称，剂量与频次以医嘱单为准（合成）。', recordedBy: '照护者', sourceNote: '医嘱口头告知（合成）', createdAt: '2026-10-28T08:00:00Z' },
        { id: 'treatment-b2', kind: 'treatment', date: '2026-09-16', name: '内镜检查与内镜下止血（院内）', note: '检查名称按出院记录抄录（合成）；结果以报告原件为准。', recordedBy: '照护者', sourceNote: '出院记录（合成）', createdAt: '2026-09-20T12:00:00Z' },
        { id: 'treatment-b3', kind: 'treatment', date: '2026-11-12', name: '抗凝药调整讨论', note: '门诊讨论是否调整抗凝药；决定以医生医嘱为准（合成）。', recordedBy: '本人', sourceNote: '门诊记录（合成）', createdAt: '2026-11-12T17:10:00Z' },
        { id: 'hospital-b1', kind: 'hospital', date: '2026-09-14', place: '合成医院消化内科', reason: '黑便伴头晕住院（虚构）', note: '住院 5 天；出院记录已归档。', recordedBy: '照护者', sourceNote: '出院记录（合成）', createdAt: '2026-09-14T18:00:00Z' },
        { id: 'hospital-b2', kind: 'hospital', date: '2026-10-28', place: '合成医院急诊', reason: '再次黑便（虚构）', note: '留观 1 晚后回家。', recordedBy: '照护者', sourceNote: '急诊记录（合成）', createdAt: '2026-10-28T09:00:00Z' },
        { id: 'hospital-b3', kind: 'hospital', date: '2026-11-12', place: '合成医院门诊', reason: '便血复查（虚构）', note: '门诊复查，未住院。', recordedBy: '本人', sourceNote: '门诊记录（合成）', createdAt: '2026-11-12T15:00:00Z' },
        { id: 'report-b1', kind: 'report', date: '2026-09-16', name: '胃镜报告（合成）', note: '报告结论原文未取得，仅记录检查名称与日期；不抄写结论。', recordedBy: '照护者', sourceNote: '报告复印件（合成）', createdAt: '2026-09-20T12:05:00Z' },
        { id: 'report-b2', kind: 'report', date: '2026-10-28', name: '血常规报告（合成）', note: '数值见化验记录；报告原件待补。', recordedBy: '照护者', sourceNote: '化验单（合成）', createdAt: '2026-10-28T06:10:00Z' },
        { id: 'doc-b1', kind: 'doc', date: '2026-09-19', name: '出院小结（合成）', note: '纸质件在家；未上传任何内容。', createdAt: '2026-09-20T12:10:00Z' },
        { id: 'doc-b2', kind: 'doc', date: '2026-11-12', name: '门诊病历本（合成）', note: '随身携带。', createdAt: '2026-11-12T17:20:00Z' },
        { id: 'question-b1', kind: 'question', text: '下次复查：抗凝药是否需要停？停药多久？（就诊时问医生）', recordedBy: '本人', sourceNote: '自己的问题', createdAt: '2026-11-12T17:30:00Z' },
        { id: 'question-b2', kind: 'question', text: '如果再次黑便，家庭里应该先做什么、什么时候必须去急诊？', recordedBy: '照护者', sourceNote: '家属的问题', createdAt: '2026-10-29T09:00:00Z' },
        { id: 'mind-b1', kind: 'mind', date: '2026-10-29', text: '夜里听到一点动静就担心是不是又出血，睡不好。', private: true, createdAt: '2026-10-29T23:00:00Z' },
        { id: 'mind-b2', kind: 'mind', date: '2026-11-13', text: '便血后情绪紧张，但复查结果还没出来，不想先下结论。', private: true, createdAt: '2026-11-13T21:00:00Z' },
      ],
    },
  ],
}