// 난이도 점검: 단순한 "다가가서 연타" 봇이 난이도별 AI를 상대로 얼마나 이기는지
import { describe, expect, it } from 'vitest'
import { Match } from '../src/core/Match'
import { DP } from '../src/config/characters'
import { SimpleAI, type Difficulty } from '../src/core/AI'
import { emptyInput } from '../src/core/types'
import type { Fighter } from '../src/core/Fighter'

function masher(me: Fighter, opp: Fighter, f: number) {
  const inp = emptyInput()
  const dx = opp.x - me.x
  if (Math.abs(dx) > 34) inp[dx > 0 ? 'right' : 'left'] = true
  else {
    const t = f % 30
    inp.light = t === 0 || t === 8
    inp.heavy = t === 16
  }
  // 사람 반응속도(약 0.2초 = 12프레임) 뒤에야 가드
  if (opp.state === 'attack' && opp.moveFrame > 12 && Math.abs(dx) < 50 && f % 2 === 0) { inp.guard = true; inp.light = inp.heavy = false }
  if (me.meter >= 25 && f % 50 === 0) inp.special = true
  return inp
}

function winRate(d: Difficulty, n = 40) {
  let wins = 0
  for (let k = 0; k < n; k++) {
    const m = new Match(DP, DP)
    const ai = new SimpleAI(d)
    for (let i = 0; i < 60 * 60 * 4 && m.phase !== 'matchOver'; i++) {
      const [a, b] = m.fighters
      m.step([masher(a, b, i), ai.input(b, a, i)])
    }
    if (m.winner === 0) wins++
  }
  return wins / n
}

describe('난이도', () => {
  it('EASY > NORMAL > HARD 순으로 이기기 쉬움', () => {
    const e = winRate('easy'), n = winRate('normal'), h = winRate('hard')
    console.log(`연타 봇 승률 — EASY ${Math.round(e * 100)}% · NORMAL ${Math.round(n * 100)}% · HARD ${Math.round(h * 100)}%`)
    expect(e).toBeGreaterThan(0.5)
    expect(e).toBeGreaterThanOrEqual(n)
    expect(n).toBeGreaterThanOrEqual(h)
  })
})
