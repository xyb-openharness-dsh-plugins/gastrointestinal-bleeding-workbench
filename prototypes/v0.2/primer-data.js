/* 36 号 · 消化道出血 疾病概要数据
 * 来源状态逐条对齐 docs/USER-RESEARCH.md（2026-11-19 检索记录），未取得原件的如实标注。
 * 本页只做概念性说明与求助指引，不诊断、不分级、不建议用药；院内处置内容不转译为自我处置指令。
 */
window.DISEASE_PRIMER = {
  brand: '消化道出血工作台',
  name: '消化道出血',
  en: 'Gastrointestinal Bleeding（GIB）',
  updated: '2026-11-20',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '消化道出血是血液从消化道任何部位（从食管到肛门）流出的一种临床表现，不是单一疾病。'
        + '常见提示表现包括呕血、呕吐物呈咖啡渣样、黑色柏油样大便（黑便）、鲜红或暗红色血便，也可能伴随头晕、乏力、心慌、面色苍白等表现。'
        + '出血可能来自上消化道（食管、胃、十二指肠）或下消化道（结肠、直肠、肛门），也可能来自小肠；具体来源与原因需要由医疗专业人员检查判断。',
      points: [
        '按解剖位置通常分为「上消化道出血」与「下消化道出血」——这是位置描述，本台不据此判断严重程度，也不替代就医判断。',
        '外观相似不等于来源相同：黑色大便可能与上消化道出血有关，也可能受饮食、药物（如铁剂）等影响；只有检查能区分。',
        '失血量、速度与危险程度无法凭外表估计——这正是本台只整理「观察到的事实」、不做任何判断的原因。'
      ],
      sources: [
        { org: 'ACG', doc: 'Clinical Guideline: Upper Gastrointestinal and Ulcer Bleeding', version: '2021（PMID 33929377）', original: false, secondaryUrl: 'https://pubmed.ncbi.nlm.nih.gov/33929377/', page: '摘要已读，期刊原件未核实取得', note: '摘要列举呕血、咖啡渣样呕吐、黑便及暗红/红色便血等表现' },
        { org: 'AWMF（德国）', doc: 'Update S2k Guideline Gastrointestinal Bleeding', version: '2025-12 更新', original: true, kind: 'pdf', url: 'https://register.awmf.org/assets/guidelines/021_D_Ges_fuer_Verdauungs-_und_Stoffwechselkrankheiten/021-028le_S2k_Gastrointestinale_Blutung-Gastrointestinal_Bleeding_2026-05.pdf', page: '官方 PDF 已打开检索；非中国规范，仅作概念参照', note: '成人上下消化道出血综合指南；国家与医疗体系不同，不能直接当中国患者说明' }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '这个工作台里出现的每一条患者版说法，都应能追到下面某一份文件。'
        + '原件未取得的，在表里如实标出来，不假装看过；临床审阅责任人待定，审定前所有内容均为待核占位。',
      table: {
        head: ['机构', '文件', '版本 / 年份', '原件状态', '本台的用途'],
        rows: [
          ['ACG（美国）', 'Upper Gastrointestinal and Ulcer Bleeding 指南', '2021',
            { text: '题录已核：PubMed 摘要页可读，期刊原件未取得', kind: 'hub', url: 'https://pubmed.ncbi.nlm.nih.gov/33929377/', note: '入口页需自行注册/登录期刊系统才能取得全文原件；本台未取得' },
            '上消化道出血表现的描述边界；院内评估内容不转译'],
          ['ACG（美国）', 'Management of Patients With Acute Lower Gastrointestinal Bleeding（更新版）', '2023',
            { text: '题录已核：PubMed 页面可读，期刊原件未取得', kind: 'hub', url: 'https://pubmed.ncbi.nlm.nih.gov/36735555/', note: '入口页需自行注册/登录期刊系统才能取得全文原件；本台未取得' },
            '说明上下消化道需分范围检索，不能拿上消化道指南代表全部'],
          ['AWMF（德国）', 'S2k Gastrointestinal Bleeding 综合指南（更新）', '2025-12 更新',
            { text: '已取得官方 PDF 并检索正文', kind: 'pdf', url: 'https://register.awmf.org/assets/guidelines/021_D_Ges_fuer_Verdauungs-_und_Stoffwechselkrankheiten/021-028le_S2k_Gastrointestinale_Blutung-Gastrointestinal_Bleeding_2026-05.pdf' },
            '证明存在较新综合指南；德国体系，不直接当中国患者说明'],
          ['ESGE（欧洲）', 'Endoscopic diagnosis and management of peptic ulcer bleeding: Guideline Update', '2026',
            { text: '官方 PDF 链接已取得，尚未下载核验', kind: 'pdf', url: 'https://www.esge.com/assets/downloads/pdfs/guidelines/2026_a-2863-8314.pdf' },
            '消化性溃疡出血专题的内镜诊疗动向；仅院内视角'],
          ['WSES（世界急诊外科学会）', '溃疡穿孔/出血相关指南', '2020',
            { text: '用户指定线索，题录在案，原件未取得', nolink: true, note: '作为检索起点保留，不作为引用依据' },
            '检索线索；不直接引用其条文'],
          ['中国规范', '消化道出血相关中文指南/共识', '待核',
            { text: '未取得可引用原件', nolink: true, note: '不从境外审批或外国指南推断中国情况；待临床审阅人确认现行中文规范' },
            '中国适用性的唯一依据；取得前相关段落保持待核']
        ]
      },
      points: [
        '以上是 2026-11-19 检索到的范围，不是全部现行指南；现行性由临床审阅确认后更新。',
        '医院端指南里的风险评分、输血阈值、内镜时机、药物方案等，一律不进入患者版内容。'
      ],
      sources: [
        { org: 'ACG', doc: 'Management of Patients With Acute Lower Gastrointestinal Bleeding: An Updated ACG Guideline', version: '2023（PMID 36735555）', original: false, secondaryUrl: 'https://pubmed.ncbi.nlm.nih.gov/36735555/', page: '题录页可读，期刊原件未取得' },
        { org: 'ESGE', doc: 'Endoscopic diagnosis and management of peptic ulcer bleeding: Guideline Update', version: '2026', original: false, secondaryUrl: 'https://www.esge.com/assets/downloads/pdfs/guidelines/2026_a-2863-8314.pdf', page: '官方 PDF 链接已取得，尚未下载核验' }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '这一段只描述「就诊后通常会发生什么类型的事」，帮助患者和家属理解流程，降低未知带来的恐慌。'
        + '所有处置决定由院内专业人员根据检查结果做出；本台不提供任何可以自己执行的处置建议。',
      points: [
        '就诊后通常先做的是评估与稳定：测量生命体征、建立静脉通路、抽血化验——这些是医院的流程，不是患者自己要做的事。',
        '查找出血来源的检查可能包括胃镜、肠镜等内镜检查，也可能包括影像检查；具体做什么由医生决定。',
        '针对不同原因存在多种院内处置手段（例如内镜下处理、药物、介入或手术），手段选择取决于出血原因与检查所见；本台不列清单、不比较优劣。',
        '住院观察的时长、复查与随访安排因人而异；交接摘要里记录的事实（时间、观察到的表现、既有资料）能帮医生更快了解情况。',
        '以上处置类型按受累器官与病情轻重排列，只是院内可能出现的事项类型，不代表任何一项适合你。具体选哪一项，需要问你的医生。'
      ],
      sources: [
        { org: 'AWMF（德国）', doc: 'Update S2k Guideline Gastrointestinal Bleeding', version: '2025-12 更新', original: true, kind: 'pdf', url: 'https://register.awmf.org/assets/guidelines/021_D_Ges_fuer_Verdauungs-_und_Stoffwechselkrankheiten/021-028le_S2k_Gastrointestinale_Blutung-Gastrointestinal_Bleeding_2026-05.pdf', page: '流程类描述为概念级概括，具体处置条目不转译', note: '待临床审阅后再扩充；本段当前为待核占位' }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '这一段说明「指南与知识还在更新」这一事实，帮助理解为什么要以就诊时的最新医嘱为准。'
        + '它不预测未来，也不推断任何技术走向。',
      points: [
        '近年指南更新活跃：2023 年 ACG 发布下消化道出血更新，2025 年 12 月 AWMF 发布综合指南更新，2026 年 ESGE 发布消化性溃疡出血内镜专题更新——说明这一领域仍在持续修订。',
        '地区适用性待核：上述更新来自不同国家与学会，中国适用哪些结论需临床审阅人确认；取得中国规范原件前，本段保持待核占位。',
        '对患者与家属的实际含义：就诊时获得的方案可能基于比公开资料更新的证据；请以接诊医生的当前医嘱为准，不要用本页内容比较或质疑方案。'
      ],
      sources: [
        { org: 'AWMF（德国）', doc: 'Update S2k Guideline Gastrointestinal Bleeding（版本信息见「医学资料规范和指南情况」表）', version: '2025-12 更新', original: false, secondaryUrl: 'https://register.awmf.org/assets/guidelines/021_D_Ges_fuer_Verdauungs-_und_Stoffwechselkrankheiten/021-028le_S2k_Gastrointestinale_Blutung-Gastrointestinal_Bleeding_2026-05.pdf', note: '其余版本信息来自 docs/USER-RESEARCH.md 检索记录（2026-11-19）' }
      ]
    }
  ]
}
