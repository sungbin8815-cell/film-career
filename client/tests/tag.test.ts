// 태그 모드 (2대2): 교체·어시스트·쓰러지면 교대·끝까지 진행
import { describe, expect, it } from 'vitest'
import { Match, SWAP_CD } from '../src/core/Match'
import { getCharacter, CHARACTERS } from '../src/config/characters'
import { SimpleAI } from '../src/core/AI'
import { emptyInput, type InputState } from '../src/core/types'

const team = (a: string, b: string) => [getCharacter(a), getCharacter(b)]
function toFight(m: Match) { for (let i = 0; i < 90; i++) m.step([emptyInput(), emptyInput()]) }
const press = (o: Partial<InputState>) => ({ ...emptyInput(), ...o })

describe('태그 모드', () => {
  it('교체 버튼을 누르면 대기 캐릭터가 들어오고 쿨타임이 생긴다', () => {
    const m = new Match(team('dp', 'gaffer'), team('sound', 'art'))
    toFight(m)
    expect(m.fighters[0].char.id).toBe('dp')
    const ev = m.step([press({ swap: true }), emptyInput()])
    expect(ev.some((e) => e.type === 'tag' && e.kind === 'swap')).toBe(true)
    expect(m.fighters[0].char.id).toBe('gaffer')
    expect(m.teams[0].swapCd).toBe(SWAP_CD)
    m.step([emptyInput(), emptyInput()])
    m.step([press({ swap: true }), emptyInput()])
    expect(m.fighters[0].char.id).toBe('gaffer')   // 쿨타임 중엔 안 바뀜
  })
  it('어시스트: 대기 캐릭터가 나와 스킬을 쓰고 상대를 맞힌 뒤 퇴장', () => {
    const m = new Match(team('dp', 'makeup'), team('sound', 'art'))
    toFight(m)
    m.fighters[1].x = m.fighters[0].x + 40
    const hp = m.fighters[1].hp
    const ev = m.step([press({ assist: true }), emptyInput()])
    expect(ev.some((e) => e.type === 'tag' && e.kind === 'assist')).toBe(true)
    for (let i = 0; i < 90; i++) m.step([emptyInput(), emptyInput()])
    expect(m.teams[0].assist).toBeNull()
    expect(m.fighters[1].hp).toBeLessThan(hp)
  })
  it('한 명이 쓰러지면 동료가 교대해 들어오고, 둘 다 쓰러져야 진다', () => {
    const m = new Match(team('dp', 'gaffer'), team('sound', 'art'))
    toFight(m)
    const [a, d] = m.fighters
    d.hp = 1; d.x = a.x + 28
    for (let i = 0; i < 20; i++) m.step([i === 0 ? press({ light: true }) : emptyInput(), emptyInput()])
    expect(m.phase).toBe('fight')
    for (let i = 0; i < 120; i++) m.step([emptyInput(), emptyInput()])
    expect(m.fighters[1].char.id).toBe('art')
    expect(m.winner).toBeNull()
  })
  it('CPU끼리 태그 경기를 끝까지 하면 승부가 나고 교체·어시스트를 쓴다', () => {
    let swaps = 0, assists = 0, done = 0
    for (let k = 0; k < 6; k++) {
      const ids = CHARACTERS.map((c) => c.id)
      const m = new Match(team(ids[k % 7], ids[(k + 3) % 7]), team(ids[(k + 1) % 7], ids[(k + 5) % 7]))
      const ai = [new SimpleAI('hard'), new SimpleAI('hard')]
      for (let i = 0; i < 60 * 240 && m.phase !== 'matchOver'; i++) {
        const [x, y] = m.fighters
        for (const e of m.step([ai[0].input(x, y, i), ai[1].input(y, x, i)])) if (e.type === 'tag') { if (e.kind === 'swap') swaps++; if (e.kind === 'assist') assists++ }
      }
      if (m.phase === 'matchOver') done++
    }
    console.log('태그 CPU 경기', done, '/ 6 종료 · 교체', swaps, '· 어시스트', assists)
    expect(done).toBe(6)
    expect(swaps + assists).toBeGreaterThan(5)
  }, 60000)
})
