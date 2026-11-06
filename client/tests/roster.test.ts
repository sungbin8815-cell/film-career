// 캐릭터 6명 점검: 데이터·동작·직급·스테이지 순서·밸런스
import { describe, expect, it, vi } from 'vitest'
import { Match } from '../src/core/Match'
import { CHARACTERS, atRank, getCharacter } from '../src/config/characters'
import { STAGES, opponentFor } from '../src/config/stages'
import { animsFor } from '../src/gfx/charPoses'
import { SimpleAI } from '../src/core/AI'
import { emptyInput, type InputState } from '../src/core/types'

describe('캐릭터 데이터', () => {
  it('7명 모두 기본기·Q·W·E·R·점프 공격·콤보 8개를 가지고, 쓰는 동작이 다 있다', () => {
    expect(CHARACTERS.length).toBe(7)
    for (const c of CHARACTERS) {
      for (const id of ['light', 'heavy', 'jl', 'jh', 'special1', 'special2', 'trait', 'super']) expect(c.moves[id], `${c.id}.${id}`).toBeTruthy()
      expect(c.combos.length, c.id).toBe(8)
      for (const k of c.combos) expect(c.moves[k.move], `${c.id} combo ${k.move}`).toBeTruthy()
      const A = animsFor(c.id)
      for (const m of Object.values(c.moves)) expect(A[m.anim ?? m.id], `${c.id}.${m.id} anim ${m.anim}`).toBeTruthy()
      expect(c.titles.length).toBe(5)
    }
  })
  it('촬영감독 외에는 공격·스킬 동작이 전용 동작', () => {
    const dp = animsFor('dp')
    for (const c of CHARACTERS) if (c.id !== 'dp') for (const id of ['light', 'heavy', 'special1', 'super', 'upper', 'zoompunch', 'spin', 'rush', 'sweep']) {
      const name = c.moves[id]!.anim ?? id
      expect(animsFor(c.id)[name], `${c.id} 전용 ${id}`).not.toBe(dp[name])
    }
  })
  it('모든 캐릭터의 Q·W·E가 실제로 나간다 (조건이 필요한 건 채워 줌)', () => {
    for (const c of CHARACTERS) for (const [inp, slot] of [[{ special: true }, 'special1'], [{ skill2: true }, 'special2'], [{ trait: true }, 'trait']] as const) {
      const m = new Match(c, getCharacter('dp'))
      for (let i = 0; i < 90; i++) m.step([emptyInput(), emptyInput()])
      const f = m.fighters[0]
      f.trait.res = 100; f.trait.traps = [f.x + 40]; f.trait.lastSeen = 'dp:special1'; f.meter = 100
      m.fighters[1].x = f.x + 60
      const moves: string[] = []
      for (let i = 0; i < 40; i++) for (const e of m.step([i === 0 ? { ...emptyInput(), ...inp } : emptyInput(), emptyInput()])) if (e.type === 'move' && e.fighter === 0) moves.push(e.move)
      expect(moves.length, `${c.id} ${slot}`).toBeGreaterThan(0)
    }
  })
})

describe('스테이지 모드 직급', () => {
  it('막내는 W·R이 없고, 서드에 W, 퍼스트에 R, 감독은 전부', () => {
    for (const c of CHARACTERS) {
      const m0 = atRank(c, 0)
      expect(m0.moves.super, c.id).toBeUndefined()
      expect(m0.moves.special2, c.id).toBeUndefined()
      expect(m0.moves.special1 && m0.moves.trait && m0.moves.light).toBeTruthy()
      expect(atRank(c, 1).moves.special2, c.id).toBeTruthy()
      expect(atRank(c, 2).moves.super).toBeUndefined()
      expect(atRank(c, 3).moves.super).toBeTruthy()
      expect(Object.keys(atRank(c, 4).moves).length).toBe(Object.keys(c.moves).length)
    }
  })
  it('막내는 필살 버튼을 눌러도 아무것도 안 나간다', () => {
    const m = new Match(atRank(getCharacter('dp'), 0), getCharacter('dp'))
    for (let i = 0; i < 90; i++) m.step([emptyInput(), emptyInput()])
    m.fighters[0].meter = 100
    const ev = m.step([{ ...emptyInput(), super: true }, emptyInput()])
    expect(ev.some((e) => e.type === 'move')).toBe(false)
  })
  it('스테이지 1~4 상대는 모두 다른 부서, 마지막은 같은 부서의 전설', () => {
    for (const c of CHARACTERS) {
      const opps = [0, 1, 2, 3].map((s) => opponentFor(c.id, s))
      expect(new Set(opps).size).toBe(4)
      expect(opps).not.toContain(c.id)
      expect(opponentFor(c.id, STAGES.length - 1)).toBe(c.id)
    }
  })
})

function aiVsAi(a: string, b: string, n: number) {
  // 매번 같은 결과가 나오도록 난수를 고정
  let seed = 12345
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 })
  let wins = 0
  for (let k = 0; k < n; k++) {
    const m = new Match(getCharacter(a), getCharacter(b))
    const ai = [new SimpleAI('normal'), new SimpleAI('normal')]
    for (let i = 0; i < 60 * 60 * 4 && m.phase !== 'matchOver'; i++) {
      const [x, y] = m.fighters
      const inp: [InputState, InputState] = [ai[0].input(x, y, i), ai[1].input(y, x, i)]
      m.step(inp)
    }
    if (m.winner === 0) wins++
  }
  spy.mockRestore()
  return wins / n
}

describe('밸런스', () => {
  it('어떤 캐릭터도 다른 캐릭터에게 일방적으로 지거나 이기지 않는다 (AI끼리, 양쪽 자리 바꿔 평균)', () => {
    const ids = CHARACTERS.map((c) => c.id)
    const w: Record<string, number> = {}
    for (const a of ids) for (const b of ids) if (a !== b) w[a + b] = aiVsAi(a, b, 16)
    const rows: string[] = []
    let worst = 0.5
    for (const a of ids) {
      const r: string[] = []
      for (const b of ids) {
        if (a === b) { r.push('  -'); continue }
        const v = (w[a + b] + 1 - w[b + a]) / 2
        worst = Math.min(worst, v)
        r.push(String(Math.round(v * 100)).padStart(3))
      }
      rows.push(`${a.padEnd(9)}${r.join(' ')}`)
    }
    console.log('승률표 (행 캐릭터가 이긴 비율 %, 양쪽 자리 평균)\n' + rows.join('\n'))
    expect(worst).toBeGreaterThanOrEqual(0.2)
  }, 120000)
})
