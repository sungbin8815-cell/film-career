// 엔딩: 최종 직업 × 성향 조합, 회고록, "당신을 바꾼 선택 3개"
import D from '../data/index.js'
import * as St from './state.js'
import { render } from './text.js'

export function leaningCombo(s) {
  const key = D.leanings.axes.map((a) => (s.lean[a.id] - (a.center ?? 0) >= 0 ? a.pos : a.neg)).join('-')
  return { key, ...(D.leanings.combos[key] ?? { name: key, line: '' }) }
}

export const comboKeys = () => Object.keys(D.leanings.combos)

function score(l) {
  return (l.pivotal ?? 0) * 2 + (l.opened ?? 0) * 3 + (l.memo ? 1 : 0)
}

export function buildEnding(s) {
  const job = St.jobOf(s)
  const e = St.getEnding(job?.ending) ?? St.getEnding('crew_backbone')
  const combo = leaningCombo(s)
  const field = St.getField(s.field)
  const school = St.getSchool(s.school)

  const memos = s.log
    .map((l, i) => ({ ...l, i }))
    .filter((l) => l.memo)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3)
    .sort((a, b) => a.i - b.i)
    .map((l) => `${l.age}살, ${l.memo}`)

  const memoir = [
    `열아홉, ${field?.memoir ?? '영화가 좋았다'}. ${school?.memoir ?? ''}`,
    ...memos,
    `${render(e.text, s)} ${combo.line}`,
  ]

  const turning = s.log
    .map((l, i) => ({ ...l, i }))
    .filter((l) => score(l) > 1)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3)
    .sort((a, b) => a.i - b.i)
    .map((l) => ({
      age: l.age, title: l.title, label: l.label,
      after: l.opened > 0 ? `이 선택에서 이야기 ${l.opened}개가 이어졌다` : l.memo ?? '',
    }))

  return {
    id: e.id, title: e.title, emoji: e.emoji, image: e.image,
    job: job?.name ?? '', combo, dexKey: `${e.id}|${combo.key}`,
    memoir, turning,
    film: s.film.slice(),
    age: s.age,
    jobs: s.jobHistory.map((j) => ({ name: St.getJob(j.job)?.name, age: j.age })),
  }
}
