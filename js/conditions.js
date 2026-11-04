// 조건(when) 판정. 이벤트 등장, 선택지 표시, 행동 목록, 직업 제안, 엔딩 문장 조각이 모두 이 형식을 씁니다.
//   숫자 비교: ">=5", "<0", "==3", "!=1" 또는 숫자(= 이상) 또는 [최소, 최대]
import D from '../data/index.js'
import { traitBand, careerYear, jobOf, hasFlag } from './state.js'
import { asList } from './util.js'

const OPS = {
  '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '>': (a, b) => a > b,
  '<': (a, b) => a < b, '==': (a, b) => a === b, '!=': (a, b) => a !== b,
}

export function compare(value, expr) {
  if (Array.isArray(expr)) return value >= expr[0] && value <= expr[1]
  if (typeof expr === 'number') return value >= expr
  if (typeof expr === 'boolean') return Boolean(value) === expr
  const m = String(expr).trim().match(/^(>=|<=|==|!=|>|<)?\s*(-?\d+(?:\.\d+)?)$/)
  if (!m) {
    console.warn('[조건] 해석할 수 없는 비교식:', expr)
    return false
  }
  return OPS[m[1] || '>='](value, Number(m[2]))
}

const inList = (v, x) => asList(v).includes(x)

// 성향: lean: { art: '>=2' } 또는 반대쪽 이름 { money: '>=2' } (= art 축이 -2 이하)
function leanValue(s, name) {
  for (const a of D.leanings.axes) {
    const v = s.lean[a.id] - (a.center ?? 0)
    if (a.pos === name) return v
    if (a.neg === name) return -v
  }
  console.warn('[조건] 알 수 없는 성향:', name)
  return 0
}

// 인연: npc: { peer: { met: true, bond: '>=2', remembers: 'covered', notRemembers: 'x', since: { covered: '>=15' } } }
function npcTest(o, s) {
  return Object.entries(o).every(([id, c]) => {
    const n = s.npcs[id]
    if (!n) return false
    if (c.met != null && n.met !== c.met) return false
    if (c.bond != null && !compare(n.bond, c.bond)) return false
    if (c.remembers && !asList(c.remembers).every((m) => n.mem[m] != null)) return false
    if (c.remembersAny && !asList(c.remembersAny).some((m) => n.mem[m] != null)) return false
    if (c.notRemembers && asList(c.notRemembers).some((m) => n.mem[m] != null)) return false
    if (c.since) {
      for (const [m, e] of Object.entries(c.since)) {
        if (n.mem[m] == null || !compare(s.t - n.mem[m], e)) return false
      }
    }
    return true
  })
}

const TESTS = {
  stage: (v, s) => inList(v, s.stage),
  trait: (o, s) => Object.entries(o).every(([id, b]) => asList(b).includes(traitBand(s, id))),
  notTrait: (o, s) => Object.entries(o).every(([id, b]) => !asList(b).includes(traitBand(s, id))),
  tags: (v, s) => asList(v).every((t) => s.tags.includes(t)),
  anyTags: (v, s) => asList(v).some((t) => s.tags.includes(t)),
  notTags: (v, s) => asList(v).every((t) => !s.tags.includes(t)),
  marks: (o, s) => Object.entries(o).every(([id, e]) => compare(s.marks[id] ?? 0, e)),
  npc: npcTest,
  lean: (o, s) => Object.entries(o).every(([k, e]) => compare(leanValue(s, k), e)),
  exp: (o, s) => Object.entries(o).every(([f, e]) => compare(f === '@job' ? s.exp[jobOf(s)?.field] ?? 0 : s.exp[f] ?? 0, e)),
  job: (v, s) => inList(v, s.job),
  notJob: (v, s) => !inList(v, s.job),
  jobKind: (v, s) => inList(v, jobOf(s)?.kind),
  jobField: (v, s) => inList(v, jobOf(s)?.field),
  notJobField: (v, s) => !inList(v, jobOf(s)?.field),
  field: (v, s) => inList(v, s.field),
  notField: (v, s) => !inList(v, s.field),
  school: (v, s) => inList(v, s.school),
  track: (v, s) => inList(v, s.track),
  notTrack: (v, s) => !inList(v, s.track),
  money: (e, s) => compare(s.money, e),
  age: (e, s) => compare(s.age, e),
  careerYear: (e, s) => s.stage === 'career' && compare(careerYear(s), e),
  flags: (v, s) => asList(v).every((f) => hasFlag(s, f)),
  anyFlags: (v, s) => asList(v).some((f) => hasFlag(s, f)),
  notFlags: (v, s) => asList(v).every((f) => !hasFlag(s, f)),
  sinceFlag: (o, s) => Object.entries(o).every(([f, e]) => hasFlag(s, f) && compare(s.t - s.flags[f], e)),
  seen: (v, s) => asList(v).every((id) => s.seen[id] != null),
  notSeen: (v, s) => asList(v).every((id) => s.seen[id] == null),
  sinceSeen: (o, s) => Object.entries(o).every(([id, e]) => s.seen[id] != null && compare(s.t - s.seen[id], e)),
  chose: (v, s) => asList(v).every((k) => s.chose[k] != null),
  notChose: (v, s) => asList(v).every((k) => s.chose[k] == null),
  films: (e, s) => compare(s.film.length, e),
  any: (arr, s) => arr.some((w) => test(w, s)),
  all: (arr, s) => arr.every((w) => test(w, s)),
  not: (w, s) => !test(w, s),
  chance: (p) => Math.random() * 100 < p,
}

export function test(when, s) {
  if (!when) return true
  for (const [key, val] of Object.entries(when)) {
    const fn = TESTS[key]
    if (!fn) {
      console.warn('[조건] 알 수 없는 키:', key)
      return false
    }
    if (!fn(val, s)) return false
  }
  return true
}

export const CONDITION_KEYS = Object.keys(TESTS)

// 조건이 참조하는 "기록"들 (나중에 열린 이야기 세기용): npc 기억, 플래그, 꼬리표, 선택
export function referencedKeys(when, out = []) {
  if (!when || typeof when !== 'object') return out
  for (const [k, v] of Object.entries(when)) {
    if (k === 'npc') {
      for (const [id, c] of Object.entries(v)) {
        for (const m of [...asList(c.remembers ?? []), ...asList(c.remembersAny ?? []), ...Object.keys(c.since ?? {})]) out.push(`mem:${id}:${m}`)
      }
    } else if (k === 'flags' || k === 'anyFlags') asList(v).forEach((f) => out.push(`flag:${f}`))
    else if (k === 'sinceFlag') Object.keys(v).forEach((f) => out.push(`flag:${f}`))
    else if (k === 'tags' || k === 'anyTags') asList(v).forEach((t) => out.push(`tag:${t}`))
    else if (k === 'chose') asList(v).forEach((c) => out.push(`chose:${c}`))
    else if (k === 'any' || k === 'all') v.forEach((w) => referencedKeys(w, out))
  }
  return out
}

// 선택지 "열쇠" 표시용: 이 선택지를 연 자질·꼬리표·인연·상황
export function keysOf(when, s) {
  const keys = []
  if (!when) return keys
  for (const [id, b] of Object.entries(when.trait ?? {})) {
    const t = D.traits.find((x) => x.id === id)
    const bands = asList(b)
    if (bands.includes('high')) keys.push(`${t.icon} ${t.keyHigh}`)
    else if (bands.includes('low')) keys.push(`${t.icon} ${t.keyLow}`)
  }
  for (const id of asList(when.tags ?? [])) keys.push(`🏷️ ${D.tags.find((t) => t.id === id)?.name ?? id}`)
  for (const [id, c] of Object.entries(when.npc ?? {})) {
    if (c.remembers || c.remembersAny || c.bond) keys.push(`🤝 ${D.npcs.find((n) => n.id === id)?.name ?? id}`)
  }
  if (when.money && /</.test(String(when.money))) keys.push('💸 빈 통장')
  if (when.money && />/.test(String(when.money))) keys.push('💰 모아둔 돈')
  for (const f of Object.keys(when.exp ?? {})) {
    const name = f === '@job' ? '경험' : `${D.fields.find((x) => x.id === f)?.name ?? f} 경험`
    keys.push(`📈 ${name}`)
  }
  return keys
}
