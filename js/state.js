// 한 판의 상태와 조회 헬퍼
import D from '../data/index.js'
import { randInt } from './util.js'

const C = D.config

export const getJob = (id) => D.jobs.find((j) => j.id === id) ?? null
export const getField = (id) => D.fields.find((f) => f.id === id) ?? null
export const getTrack = (id) => D.tracks.find((t) => t.id === id) ?? null
export const getSchool = (id) => D.schools.find((s) => s.id === id) ?? null
export const getAction = (id) => D.actions.find((a) => a.id === id) ?? null
export const getNpc = (id) => D.npcs.find((n) => n.id === id) ?? null
export const getEnding = (id) => D.endings.find((e) => e.id === id) ?? null
export const getTag = (id) => D.tags.find((t) => t.id === id) ?? null
export const traitDef = (id) => D.traits.find((t) => t.id === id) ?? null

export function band(v) {
  if (v <= C.traitBands.low) return 'low'
  if (v >= C.traitBands.high) return 'high'
  return 'mid'
}
export const traitBand = (s, id) => band(s.traits[id] ?? 5)

export function newRun() {
  const traits = {}
  for (const t of D.traits) traits[t.id] = randInt(C.traitRange[0], C.traitRange[1])
  return {
    v: 2,
    stage: 'intro',          // intro → student → career → ended
    traits,
    money: C.startMoney[band(traits.wealth)],
    school: null,
    field: null,
    job: null,
    track: null,
    exp: Object.fromEntries(D.fields.map((f) => [f.id, 0])),
    marks: {},
    tags: [],
    lean: Object.fromEntries(D.leanings.axes.map((a) => [a.id, 0])),
    npcs: Object.fromEntries(D.npcs.map((n) => [n.id, { met: false, bond: 0, mem: {} }])),
    flags: {},               // 플래그: 붙은 시즌(t)
    film: [],                // 필모그래피
    jobHistory: [],
    trackHistory: [],
    age: C.startAge,
    t: 0,                    // 전체 시즌 카운터 (기억·플래그 "몇 시즌 전" 계산용)
    seasonIdx: 0,            // 한 해 안의 시즌 번호
    studentLeft: 0,
    careerT: 0,              // 현장 시즌 수
    seen: {},                // 이벤트 id → 본 시즌
    chose: {},               // '이벤트.선택' → 고른 시즌
    log: [],                 // 선택 기록 (회고록·바꾼 선택 3개)
    origins: {},             // 기억/플래그/꼬리표 → log 번호 (나중에 열린 이야기 세기)
    quietUsed: {},
    action: null,
    seasonFilm: null,
    pendingStage: null,
    step: null,
  }
}

export const hasFlag = (s, f) => s.flags[f] != null
export const careerYear = (s) => Math.floor(s.careerT / C.seasons.career.length) + 1
export const jobOf = (s) => getJob(s.job)

export function seasonLabel(s) {
  if (s.stage === 'intro') return '고3 겨울'
  if (s.stage === 'student') {
    const names = C.seasons.student
    const sc = getSchool(s.school)
    const total = (sc?.years ?? 0) * names.length
    const done = total - s.studentLeft
    const grade = Math.floor(done / names.length) + 1
    return `${grade}학년 ${names[s.seasonIdx] ?? ''}`
  }
  if (s.stage === 'career') return `현장 ${careerYear(s)}년차 ${C.seasons.career[s.seasonIdx] ?? ''}`
  return ''
}

export function levelName(levels, v) {
  let name = levels[0][1]
  for (const [min, n] of levels) if (v >= min) name = n
  return name
}
