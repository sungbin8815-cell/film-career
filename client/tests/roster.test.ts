// 캐릭터 6명 점검: 데이터·동작·직급·스테이지 순서·밸런스
import { describe, expect, it, vi } from 'vitest'
import { Match } from '../src/core/Match'
import { CHARACTERS, atRank, getCharacter } from '../src/config/characters'
import { STAGES, opponentFor } from '../src/config/stages'
import { animsFor } from '../src/gfx/charPoses'
import { SimpleAI } from '../src/core/AI'
import { emptyInput, type InputState } from '../src/core/types'

describe('캐릭터 데이터', () => {
  it('6명 모두 기본기·특수·필살·콤보 6개를 가지고, 쓰는 동작이 다 있다', () => {
    expect(CHARACTERS.length).toBe(6)
    for (const c of CHARACTERS) {
      for (const id of ['light', 'heavy', 'special1', 'special2', 'super']) expect(c.moves[id], `${c.id}.${id}`).toBeTruthy()
      expect(c.combos.length, c.id).toBe(6)
      for (const k of c.combos) expect(c.moves[k.move], `${c.id} combo ${k.move}`).toBeTruthy()
      const A = animsFor(c.id)
      for (const m of Object.values(c.moves)) expect(A[m.anim ?? m.id], `${c.id}.${m.id} anim ${m.anim}`).toBeTruthy()
      // 촬영감독 외에는 모든 공격·특성 동작이 전용 동작
      if (c.id !== 'dp') for (const id of Object.keys(c.moves)) expect(A[id], `${c.id} 전용 ${id}`).not.toBe(animsFor('dp')[id])
      expect(c.titles.length).toBe(5)
    }
  })
  it('각 캐릭터의 특수기(↓특 포함)가 실제로 나가고 상대를 맞힌다', () => {
    for (const c of CHARACTERS) for (const [inp, id] of [[{ special: true }, 'special1'], [{ special: true, down: true }, 'special2']] as const) {
      const m = new Match(c, getCharacter('dp'))
      for (let i = 0; i < 90; i++) m.step([emptyInput(), emptyInput()])
      m.fighters[0].meter = 100
      // 근접기는 붙어서, 떨어뜨리는 조명은 떨어지는 자리, 날리는 기술은 멀리서
      const pr = c.moves[id]!.projectile
      m.fighters[1].x = m.fighters[0].x + (!pr ? 30 : pr.vx === 0 ? pr.offsetX : 90)
      const hp0 = m.fighters[1].hp
      const moves: string[] = []
      for (let i = 0; i < 150; i++) {
        const ev = m.step([i === 0 ? { ...emptyInput(), ...inp } : emptyInput(), emptyInput()])
        for (const e of ev) if (e.type === 'move' && e.fighter === 0) moves.push(e.move)
      }
      expect(moves, c.id).toContain(id)
      expect(m.fighters[1].hp, `${c.id} ${id} 명중`).toBeLessThan(hp0)
    }
  })
})

describe('스테이지 모드 직급', () => {
  it('막내는 기본기만, 감독은 전부', () => {
    for (const c of CHARACTERS) {
      const m0 = atRank(c, 0)
      expect(Object.keys(m0.moves).filter((k) => !k.startsWith('trait')).sort()).toEqual(['heavy', 'light', 'special1', 'sweep'])
      expect(m0.moves.trait, `${c.id} 막내도 고유 특성`).toBeTruthy()
      expect(m0.combos.map((k) => k.move)).toEqual(['sweep'])
      expect(Object.keys(atRank(c, 4).moves).length).toBe(Object.keys(c.moves).length)
      expect(atRank(c, 2).moves.super).toBeUndefined()
      expect(atRank(c, 3).moves.super).toBeTruthy()
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
    for (const a of ids) for (const b of ids) if (a !== b) w[a + b] = aiVsAi(a, b, 24)
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
    expect(worst).toBeGreaterThanOrEqual(0.25)
  }, 120000)
})
