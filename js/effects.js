// 효과(effects) 적용. 바뀐 내용을 화면 표시용 목록으로 돌려줍니다.
//   stats: { 능력치: 숫자 | [최소, 최대] }, favor, setFavor, flags, removeFlags,
//   unlockCareer, setTrack, setRank, promote, skipProjects, age, ending
import D from '../data/index.js'
import {
  addStat, statDef, addFlag, setTrack, setRank, nextRankId, getRank, getTrack, getCareer, restFor,
} from './state.js'
import { resolveNum } from './util.js'

const fmt = (n) => (n > 0 ? `+${n}` : `${n}`)

export function applyEffects(eff, s) {
  const changes = []
  if (!eff) return changes

  for (const [id, raw] of Object.entries(eff.stats ?? {})) {
    const delta = resolveNum(raw)
    if (!delta) continue
    const before = s.stats[id] ?? 0
    addStat(s, id, delta)
    const real = Math.round(((s.stats[id] ?? 0) - before) * 10) / 10
    const d = statDef(id)
    changes.push({ kind: 'stat', id, text: `${d?.icon ?? ''}${d?.name ?? id} ${fmt(real || delta)}${id === 'money' ? '만' : ''}`, good: delta > 0 })
  }
  if (eff.favor) {
    const delta = resolveNum(eff.favor)
    addStat(s, 'favor', delta)
    changes.push({ kind: 'stat', id: 'favor', text: `${D.config.favor.icon}${D.config.favor.name} ${fmt(delta)}`, good: delta > 0 })
  }
  if (eff.setFavor != null) {
    s.favor = eff.setFavor
    changes.push({ kind: 'info', text: `${D.config.favor.icon}새 팀장 호감도 ${eff.setFavor}` })
  }
  for (const f of eff.flags ?? []) addFlag(s, f)
  for (const f of eff.removeFlags ?? []) s.flags = s.flags.filter((x) => x !== f)

  if (eff.unlockCareer && !s.unlocked.includes(eff.unlockCareer)) {
    s.unlocked.push(eff.unlockCareer)
    changes.push({ kind: 'info', text: `🔓 ${getCareer(eff.unlockCareer)?.name ?? eff.unlockCareer} 계열 해금`, good: true })
  }
  if (eff.setTrack && setTrack(s, eff.setTrack)) {
    changes.push({ kind: 'info', text: `🧭 트랙 변경: ${getTrack(eff.setTrack)?.name}` })
  }
  if (eff.setRank && setRank(s, eff.setRank)) {
    changes.push({ kind: 'info', text: `🎉 직급: ${getRank(s)?.name}`, good: true })
  }
  if (eff.promote) {
    const to = nextRankId(s)
    if (to && setRank(s, to)) changes.push({ kind: 'info', text: `🎉 승진: ${getRank(s)?.name}`, good: true })
  }
  if (eff.age) {
    s.age += eff.age
    changes.push({ kind: 'info', text: `⏳ ${eff.age}년이 흘렀다` })
  }
  if (eff.skipProjects) {
    const cost = restFor(s, eff.skipProjects)
    changes.push({ kind: 'info', text: `🛌 ${eff.skipProjects}작품 쉼 (생활비 -${cost}만)`, good: false })
  }
  if (eff.ending) s.pendingEnding = eff.ending
  return changes
}
