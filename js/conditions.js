// 조건(when) 판정. 이벤트 등장·선택지 표시·승진·엔딩이 모두 이 형식을 씁니다.
//   숫자 비교: ">=5", "<0", "==3", "!=1" 또는 숫자(= 이상) 또는 [최소, 최대]
import { stat, rankIndex } from './state.js'
import { asList } from './util.js'

const OPS = {
  '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '>': (a, b) => a > b,
  '<': (a, b) => a < b, '==': (a, b) => a === b, '!=': (a, b) => a !== b,
}

export function compare(value, expr) {
  if (Array.isArray(expr)) return value >= expr[0] && value <= expr[1]
  if (typeof expr === 'number') return value >= expr
  const m = String(expr).trim().match(/^(>=|<=|==|!=|>|<)?\s*(-?\d+(?:\.\d+)?)$/)
  if (!m) {
    console.warn('[조건] 해석할 수 없는 비교식:', expr)
    return false
  }
  return OPS[m[1] || '>='](value, Number(m[2]))
}

const inList = (v, x) => asList(v).includes(x)

const TESTS = {
  phase: (v, s) => inList(v, s.phase),
  career: (v, s) => inList(v, s.career),
  track: (v, s) => inList(v, s.track),
  notTrack: (v, s) => !inList(v, s.track),
  rank: (v, s) => inList(v, s.rank),
  rankMin: (v, s) => s.rank != null && rankIndex(s) >= rankIndex(s, v),
  rankMax: (v, s) => s.rank != null && rankIndex(s) <= rankIndex(s, v),
  school: (v, s) => inList(v, s.school),
  major: (v, s) => inList(v, s.major),
  stats: (o, s) => Object.entries(o).every(([id, e]) => compare(stat(s, id), e)),
  favor: (e, s) => compare(stat(s, 'favor'), e),
  projects: (e, s) => compare(s.projects, e),
  rankProjects: (e, s) => compare(s.rankProjects, e),
  careerYears: (e, s) => compare(s.careerYears, e),
  age: (e, s) => compare(s.age, e),
  debtStreak: (e, s) => compare(s.debtStreak, e),
  flags: (v, s) => asList(v).every((f) => s.flags.includes(f)),
  notFlags: (v, s) => asList(v).every((f) => !s.flags.includes(f)),
  anyFlags: (v, s) => asList(v).some((f) => s.flags.includes(f)),
  unlocked: (v, s) => asList(v).every((c) => s.unlocked.includes(c)),
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
