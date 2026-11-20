/* 相关记录判定：fetch 脚本、manifest 与匹配池**同一份**规则（改一处两处同改）。
 *
 * 为什么独立成文件：2026-11-20 实测，同一仓里如果没有单一来源，
 * 「相关条数」会在 fetch、服务端、界面三处漂移。
 */
export const RELEVANT_RE = /gastrointestinal bleed|upper gi bleed|peptic ulcer bleed|GI bleeding|消化道出血|胃肠道出血|消化性溃疡出血|ulcer bleeding/i

export const RELEVANT_RULE = '标题命中 gastrointestinal bleed / upper GI bleed / peptic ulcer bleed / GI bleeding / 消化道出血 / 胃肠道出血 / 消化性溃疡出血 / ulcer bleeding 任意一词记相关；只按标题，不做全文判读。GI 缩写不作为独立词匹配，避免误计无关研究'
