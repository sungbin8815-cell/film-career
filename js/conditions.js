// 조건(when) 판정. 전직 조건, 사건 등장, 선택지 표시에 모두 씁니다.
//   숫자 비교: ">=5", "<0", "==3" 또는 숫자(= 이상) 또는 [최소, 최대]
import D from '../data/index.js'
import { stat, maxHp, maxMp, tierOf, hasFlag, STAT_NAMES, STAT_ICONS } from './state.js'
import { asList } from './util.js'

const OPS = {
  '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '>': (a, b) => a > b,
  '<': (a, b) => a < b, '==': (a, b) => a === b, '!=': (a, b) => a !== b,
}

export function compare(value, expr) {
  if (Array.isArray(expr)) return value >= expr[0] && value <= expr[1]
  if (typeof expr === 'number') return value >= expr
  const m = String(expr).trim().match(/^(>=|<=|==|!=|>|<)?\s*(-?\d+(?:\.\d+)?)$/)
  if (!m) { console.warn('[조건] 해석할 수 없는 비교식:', expr); return false }
  return OPS[m[1] || '>='](value, Number(m[2]))
}

const statValue = (s, id) => (id === 'hp' ? maxHp(s) : id === 'mp' ? maxMp(s) : stat(s, id))
const inList = (v, x) => asList(v).includes(x)

const TESTS = {
  routes: (o, s) => Object.entries(o).every(([k, e]) => compare(s.routes[k] ?? 0, e)),
  stats: (o, s) => Object.entries(o).every(([k, e]) => compare(statValue(s, k), e)),
  flags: (v, s) => asList(v).every((f) => hasFlag(s, f)),
  anyFlags: (v, s) => asList(v).some((f) => hasFlag(s, f)),
  notFlags: (v, s) => asList(v).every((f) => !hasFlag(s, f)),
  sinceFlag: (o, s) => Object.entries(o).every(([f, e]) => hasFlag(s, f) && compare(s.projectNo - s.flags[f], e)),
  job: (v, s) => inList(v, s.job),
  notJob: (v, s) => !inList(v, s.job),
  tierMin: (n, s) => tierOf(s) >= n,
  tierMax: (n, s) => tierOf(s) <= n,
  projects: (v, s) => s.project != null && inList(v, s.project.type),
  projectNo: (e, s) => compare(s.projectNo, e),
  money: (e, s) => compare(s.money, e),
  fame: (e, s) => compare(s.fame, e),
  level: (e, s) => compare(s.level, e),
  skills: (v, s) => asList(v).every((id) => s.skills[id]),
  seen: (v, s) => asList(v).every((id) => s.seen[id] != null),
  any: (arr, s) => arr.some((w) => test(w, s)),
  all: (arr, s) => arr.every((w) => test(w, s)),
  not: (w, s) => !test(w, s),
  chance: (p) => Math.random() * 100 < p,
}

export function test(when, s) {
  if (!when) return true
  for (const [key, val] of Object.entries(when)) {
    const fn = TESTS[key]
    if (!fn) { console.warn('[조건] 알 수 없는 키:', key); return false }
    if (!fn(val, s)) return false
  }
  return true
}

export const CONDITION_KEYS = Object.keys(TESTS)

// 선택지 열쇠 표시: 이 선택지를 연 능력치·성향·스킬·인연
export function keysOf(when) {
  const keys = []
  if (!when) return keys
  for (const k of Object.keys(when.stats ?? {})) keys.push(`${STAT_ICONS[k]} ${STAT_NAMES[k]}`)
  for (const k of Object.keys(when.routes ?? {})) {
    const r = D.routes.find((x) => x.id === k)
    if (r) keys.push(`${r.icon} ${r.name}`)
  }
  for (const id of asList(when.skills ?? [])) keys.push(`✨ ${D.skills.find((x) => x.id === id)?.name ?? id}`)
  if (when.flags || when.anyFlags || when.sinceFlag) keys.push('🔗 지난 선택')
  if (when.money) keys.push('💰 돈')
  for (const w of when.any ?? []) keys.push(...keysOf(w))
  return [...new Set(keys)]
}
