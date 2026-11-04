// 한 판의 상태와 능력치·직급·시간 헬퍼
import D from '../data/index.js'
import { randInt, clamp, round1 } from './util.js'

const C = D.config

export const statDef = (id) => C.stats.find((s) => s.id === id)
export const getCareer = (id) => D.careers.find((c) => c.id === id)
export const getTrack = (id) => D.tracks.find((t) => t.id === id)
export const getSchool = (id) => D.schools.find((x) => x.id === id)
export const getMajor = (id) => D.majors.find((x) => x.id === id)
export const getEvent = (id) => D.events.find((e) => e.id === id)
export const getEnding = (id) => D.endings.find((e) => e.id === id)

export function newRun() {
  return {
    v: 1,
    phase: 'roll',
    stats: {},
    favor: C.start.favor,
    flags: [],
    age: C.start.age,
    rerollsLeft: C.start.rerolls,
    school: null,
    major: null,
    career: C.defaultCareer,
    track: null,
    rank: null,
    projects: 0,
    rankProjects: 0,
    careerYears: 0,
    yearProgress: 0,
    debtStreak: 0,
    student: { total: 0, done: 0, aged: 0 },
    seen: {},
    lastSeen: {},
    log: [],
    rankHistory: [],
    trackHistory: [],
    unlocked: [],
    project: null,
    pendingEnding: null,
    step: null,
  }
}

export function rollStats(s) {
  const [a, b] = C.start.range
  for (const id of C.start.random) s.stats[id] = randInt(a, b)
  s.stats.rep = C.start.rep
  s.stats.money = randInt(C.start.money[0], C.start.money[1])
}

// 판정·조건에 쓰는 값(화면 표시와 같은 정수)
export function stat(s, id) {
  if (id === 'favor') return Math.floor(s.favor)
  const v = s.stats[id] ?? 0
  return id === 'money' ? v : Math.floor(v + 1e-9)
}

export function addStat(s, id, delta) {
  if (id === 'favor') {
    s.favor = round1(clamp(s.favor + delta, C.favor.min, C.favor.max))
    return
  }
  const d = statDef(id)
  let v = (s.stats[id] ?? 0) + delta
  if (d && d.max != null) v = clamp(v, d.min ?? 0, d.max)
  s.stats[id] = id === 'money' ? Math.round(v) : round1(v)
}

export const getRank = (s) => getCareer(s.career)?.ranks.find((r) => r.id === s.rank) ?? null
export function rankIndex(s, rankId = s.rank) {
  const c = getCareer(s.career)
  return c ? c.ranks.findIndex((r) => r.id === rankId) : -1
}

export function livingCost(s) {
  const t = getTrack(s.track)
  return Math.round(C.economy.livingCostPerYear / (t?.projectsPerYear ?? 3))
}

// 프로젝트 n개만큼 시간이 흐름 → 나이·경력 연차
export function passTime(s, n = 1) {
  const t = getTrack(s.track)
  s.yearProgress += n / (t?.projectsPerYear ?? 3)
  while (s.yearProgress >= 1 - 1e-9) {
    s.yearProgress -= 1
    s.age += 1
    s.careerYears += 1
  }
}

// 직급 변경 (승진/설정)
export function setRank(s, rankId) {
  if (!rankId || rankId === s.rank) return false
  s.rank = rankId
  s.rankProjects = 0
  s.rankHistory.push({ rank: rankId, age: s.age })
  return true
}

export function nextRankId(s) {
  const c = getCareer(s.career)
  const r = getRank(s)
  if (!c || !r) return null
  if (r.promote?.to) return r.promote.to
  return c.ranks[rankIndex(s) + 1]?.id ?? null
}

export function setTrack(s, trackId) {
  if (!trackId || trackId === s.track) return false
  s.track = trackId
  s.trackHistory.push({ track: trackId, age: s.age })
  return true
}

export function hasFlag(s, f) {
  return s.flags.includes(f)
}
export function addFlag(s, f) {
  if (!s.flags.includes(f)) s.flags.push(f)
}

// 일하지 않고 n개 프로젝트만큼 쉼: 생활비 지출, 회복, 시간 경과
export function restFor(s, n, { stamina = C.body.recoverPerProject, mental = 0 } = {}) {
  const cost = livingCost(s) * n
  addStat(s, 'money', -cost)
  addStat(s, 'stamina', stamina * n)
  if (mental) addStat(s, 'mental', mental * n)
  if (s.phase === 'career') passTime(s, n)
  return cost
}
