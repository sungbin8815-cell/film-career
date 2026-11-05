// 한 판의 상태와 조회 헬퍼
import D from '../data/index.js'

const C = D.config

export const getJob = (id) => D.jobs.find((j) => j.id === id) ?? null
export const getSkill = (id) => D.skills.find((s) => s.id === id) ?? null
export const getEnemy = (id) => D.enemies.find((e) => e.id === id) ?? null
export const getItem = (id) => D.items.find((i) => i.id === id) ?? null
export const getEvent = (id) => D.events.find((e) => e.id === id) ?? null
export const getTrait = (id) => D.traits.find((t) => t.id === id) ?? null
export const getClass = (id) => D.classes.find((c) => c.id === id) ?? null
export const getRoute = (id) => D.routes.find((r) => r.id === id) ?? null
export const getType = (id) => D.projects.types.find((t) => t.id === id) ?? null
export const getAffix = (id) => D.projects.affixes.find((a) => a.id === id) ?? null

export const STAT_NAMES = { hp: '체력', mp: '멘탈', str: '근력', tec: '기술', sen: '감각', cha: '처세' }
export const STAT_ICONS = { hp: '❤️', mp: '🧠', str: '💪', tec: '🔧', sen: '👁️', cha: '🗣️' }

export function newRun() {
  return {
    v: 3,
    cls: null,
    trait: null,
    job: null,
    jobHistory: [],
    level: 1,
    exp: 0,
    pendingLevels: 0,
    base: { ...C.startStats },
    hp: C.startStats.hp,
    mp: C.startStats.mp,
    skills: {},
    moves: [],        // 전투에 들고 가는 기술 (기본기 외 최대 3개)
    bag: { bacchus: C.startBag ?? 0 },
    routes: Object.fromEntries(D.routes.map((r) => [r.id, 0])),
    flags: {},
    money: C.startMoney,
    fame: 0,
    inventory: [],
    equip: { tool: null, gear: null },
    projectNo: 0,     // 끝낸 작품 수
    age: C.startAge,
    project: null,
    combat: null,
    film: [],
    seen: {},
    log: [],
    step: null,
  }
}

export const jobOf = (s) => getJob(s.job)
export const tierOf = (s) => jobOf(s)?.tier ?? 0
export const stageTier = (s) => (s.projectNo < 3 ? 1 : s.projectNo < 6 ? 2 : 3)
export const expToNext = (s) => C.exp.base + C.exp.perLevel * (s.level - 1)
export const hasFlag = (s, f) => s.flags[f] != null

function equipped(s) {
  return ['tool', 'gear'].map((k) => getItem(s.equip[k])).filter(Boolean)
}

// 장비 포함 능력치
export function stat(s, id) {
  let v = s.base[id] ?? 0
  for (const it of equipped(s)) v += it.stats?.[id] ?? 0
  return v
}
export const maxHp = (s) => stat(s, 'hp')
export const maxMp = (s) => stat(s, 'mp')
export const defense = (s) => Math.floor(stat(s, 'tec') * C.combat.defPerTec) + equipped(s).reduce((a, it) => a + (it.def ?? 0), 0)
export function boost(s, route) {
  return equipped(s).reduce((a, it) => a + (it.boost?.[route] ?? 0), 0)
}

export function topRoutes(s, n = 3) {
  return D.routes.map((r) => ({ ...r, v: s.routes[r.id] })).filter((r) => r.v > 0).sort((a, b) => b.v - a.v).slice(0, n)
}

export function clampVitals(s) {
  s.hp = Math.max(0, Math.min(maxHp(s), Math.round(s.hp)))
  s.mp = Math.max(0, Math.min(maxMp(s), Math.round(s.mp)))
}
