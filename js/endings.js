// 엔딩 판정과 커리어 요약
import D from '../data/index.js'
import { test } from './conditions.js'
import { getCareer, getTrack } from './state.js'

const byPriority = (a, b) => (b.priority ?? 0) - (a.priority ?? 0)

export function findInstantEnding(s) {
  return D.endings.filter((e) => e.timing === 'instant').sort(byPriority).find((e) => test(e.when, s)) ?? null
}

export function findFinalEnding(s) {
  return D.endings.filter((e) => e.timing === 'final').sort(byPriority).find((e) => test(e.when, s)) ?? null
}

// 도감에 표시할 엔딩(alias가 있는 엔딩은 원본 엔딩과 한 칸을 같이 씀)
export const dexEntries = () => D.endings.filter((e) => !e.alias)
export const dexId = (e) => e.alias ?? e.id

export function buildSummary(s) {
  const career = getCareer(s.career)
  const rankName = (id) => career?.ranks.find((r) => r.id === id)?.name ?? id
  const tierScore = { great: 3, win: 3, fail: 2, lose: 2, success: 1 }
  const highlights = s.log
    .map((l, i) => ({ ...l, i, score: (tierScore[l.tier] ?? 0) + (l.phase === 'career' ? 0.5 : 0) }))
    .filter((l) => l.score >= 2)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, 4)
    .sort((a, b) => a.i - b.i)
  return {
    age: s.age,
    careerYears: s.careerYears,
    projects: s.projects,
    money: s.stats.money,
    rep: Math.floor(s.stats.rep),
    career: career?.name,
    ranks: s.rankHistory.map((r) => ({ name: rankName(r.rank), age: r.age })),
    tracks: s.trackHistory.map((t) => ({ name: getTrack(t.track)?.name, age: t.age })),
    highlights: highlights.map((h) => ({ age: h.age, title: h.title, choice: h.choice, tier: h.tier })),
  }
}
