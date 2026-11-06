// 난이도 점검: 단순한 "다가가서 연타" 봇이 난이도별 AI를 상대로 얼마나 이기는지
import { describe, expect, it } from 'vitest'
import { Match } from '../src/core/Match'
import { DP, getCharacter } from '../src/config/characters'
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

describe('AI 커맨드 콤보', () => {
  it('HARD AI가 콤보 기술을 실제로 씀', () => {
    const used = new Set<string>()
    for (let k = 0; k < 10; k++) {
      const m = new Match(DP, DP)
      const ai = new SimpleAI('hard')
      for (let i = 0; i < 60 * 60 * 2 && m.phase !== 'matchOver'; i++) {
        const [a, b] = m.fighters
        m.step([masher(a, b, i), ai.input(b, a, i)])
        for (const e of m.events) if (e.type === 'move' && e.fighter === 1 && e.combo) used.add(e.move)
      }
    }
    console.log('AI가 쓴 콤보:', [...used].join(', '))
    expect(used.size).toBeGreaterThanOrEqual(2)
  })
})

describe('캐릭터별 AI 성향', () => {
  const avgDist = (id: string, setup?: (m: Match) => void) => {
    const m = new Match(getCharacter(id), DP)
    setup?.(m)
    const ai = new SimpleAI('hard')
    let sum = 0, n = 0
    const setups: string[] = []
    for (let i = 0; i < 60 * 30 && m.phase !== 'matchOver'; i++) {
      const [a, b] = m.fighters
      const dx = Math.abs(a.x - b.x)
      m.step([ai.input(a, b, i), masher(b, a, i)])
      if (m.phase === 'fight') { sum += dx; n++ }
      for (const e of m.events) if (e.type === 'move' && e.fighter === 0 && a.char.moves[e.move]?.effect) setups.push(e.move)
    }
    return { dist: sum / Math.max(1, n), setups }
  }
  it('망원 촬영·조명은 거리를 두고, 분장(근접)은 붙어서 싸운다', () => {
    const gaffer = avgDist('gaffer').dist, makeup = avgDist('makeup').dist
    console.log(`평균 거리 — 조명 ${Math.round(gaffer)} · 분장 ${Math.round(makeup)}`)
    expect(gaffer).toBeGreaterThan(makeup)
  })
  it('연출감독 AI는 콘티·엑스트라를 깔고, 미술감독 AI는 구조물을 짓는다', () => {
    const d = avgDist('director').setups, a = avgDist('art').setups
    expect(d.some((x) => /^C_|extra|trap/.test(x))).toBe(true)
    expect(a.length).toBeGreaterThan(0)
  })
})
