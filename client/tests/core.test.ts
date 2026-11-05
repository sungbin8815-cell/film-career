// 전투 로직 테스트 (Phaser 없이): npm test
import { describe, expect, it } from 'vitest'
import { Match } from '../src/core/Match'
import { DP } from '../src/config/characters'
import { emptyInput, type InputState } from '../src/core/types'
import { SimpleAI } from '../src/core/AI'

const idle = () => emptyInput()
const press = (k: keyof InputState, extra: Partial<InputState> = {}) => ({ ...emptyInput(), [k]: true, ...extra })

function toFight(m: Match) {
  for (let i = 0; i < 90; i++) m.step([idle(), idle()])
  expect(m.phase).toBe('fight')
}
// 1P를 2P 앞으로 붙임
function closeIn(m: Match, gap = 28) {
  const [a, b] = m.fighters
  a.x = b.x - gap
}

describe('전투 로직', () => {
  it('라운드 시작 후 FIGHT 단계로 넘어간다', () => {
    const m = new Match(DP, DP)
    toFight(m)
  })

  it('좌우 이동과 점프', () => {
    const m = new Match(DP, DP)
    toFight(m)
    const x0 = m.fighters[0].x
    for (let i = 0; i < 20; i++) m.step([press('right'), idle()])
    expect(m.fighters[0].x).toBeGreaterThan(x0 + 20)
    m.step([press('up'), idle()])
    let maxY = 0
    for (let i = 0; i < 60; i++) { m.step([idle(), idle()]); maxY = Math.max(maxY, m.fighters[0].y) }
    expect(maxY).toBeGreaterThan(40)
    expect(m.fighters[0].y).toBe(0)
  })

  it('약공격이 맞으면 상대 체력이 줄고 피격 상태가 된다', () => {
    const m = new Match(DP, DP)
    toFight(m)
    closeIn(m)
    const hp0 = m.fighters[1].hp
    m.step([press('light'), idle()])
    let hit = false
    for (let i = 0; i < 12; i++) { const ev = m.step([idle(), idle()]); if (ev.some((e) => e.type === 'hit')) hit = true }
    expect(hit).toBe(true)
    expect(m.fighters[1].hp).toBeLessThan(hp0)
  })

  it('가드하면 피해가 크게 줄어든다', () => {
    const hit = new Match(DP, DP); toFight(hit); closeIn(hit)
    const guard = new Match(DP, DP); toFight(guard); closeIn(guard)
    hit.step([press('heavy'), idle()])
    guard.step([press('heavy'), press('guard')])
    for (let i = 0; i < 25; i++) { hit.step([idle(), idle()]); guard.step([idle(), press('guard')]) }
    const dmgHit = DP.hp - hit.fighters[1].hp
    const dmgGuard = DP.hp - guard.fighters[1].hp
    expect(dmgHit).toBeGreaterThan(50)
    expect(dmgGuard).toBeGreaterThan(0)
    expect(dmgGuard).toBeLessThan(dmgHit / 4)
  })

  it('상대가 뒤로 넘어와도 방어가 된다', () => {
    const m = new Match(DP, DP); toFight(m)
    const [a, b] = m.fighters
    for (let i = 0; i < 3; i++) m.step([idle(), press('guard')])
    b.x = a.x - 26          // 2P가 1P를 넘어 왼쪽에 섬
    a.facing = 1
    for (let i = 0; i < 2; i++) m.step([idle(), press('guard')])
    // 1P가 2P를 공격 → 2P(가드 중)는 방향을 다시 잡아 막아야 함
    m.step([press('heavy'), press('guard')])
    for (let i = 0; i < 25; i++) m.step([idle(), press('guard')])
    expect(DP.hp - b.hp).toBeLessThan(20)
  })

  it('멀리 있으면 맞지 않는다', () => {
    const m = new Match(DP, DP); toFight(m)
    m.step([press('light'), idle()])
    for (let i = 0; i < 20; i++) m.step([idle(), idle()])
    expect(m.fighters[1].hp).toBe(DP.hp)
  })

  it('약→약→강 콤보가 이어지고 콤보 수가 오른다', () => {
    const m = new Match(DP, DP); toFight(m); closeIn(m, 24)
    let maxCombo = 0
    const seq: (keyof InputState | null)[] = []
    for (let i = 0; i < 70; i++) seq.push(null)
    seq[0] = 'light'; seq[9] = 'light'; seq[18] = 'heavy'
    for (const k of seq) {
      m.step([k ? press(k) : idle(), idle()])
      maxCombo = Math.max(maxCombo, m.fighters[0].combo)
    }
    expect(maxCombo).toBeGreaterThanOrEqual(3)
  })

  it('체력이 0이 되면 KO, 2라운드를 먼저 이기면 매치 승리', () => {
    const m = new Match(DP, DP); toFight(m)
    m.fighters[1].hp = 1
    closeIn(m)
    m.step([press('light'), idle()])
    for (let i = 0; i < 400 && m.round === 1; i++) m.step([idle(), idle()])
    expect(m.wins[0]).toBe(1)
    toFight(m)
    m.fighters[1].hp = 1; closeIn(m)
    m.step([press('light'), idle()])
    for (let i = 0; i < 400 && m.phase !== 'matchOver'; i++) m.step([idle(), idle()])
    expect(m.phase).toBe('matchOver')
    expect(m.winner).toBe(0)
  })

  it('시간이 다 되면 체력이 높은 쪽이 이긴다', () => {
    const m = new Match(DP, DP); toFight(m)
    m.fighters[0].hp = 300
    m.timer = 2
    for (let i = 0; i < 5; i++) m.step([idle(), idle()])
    expect(m.wins[1]).toBe(1)
  })

  it('게이지가 없으면 특수기가 안 나가고, 있으면 소모된다', () => {
    const m = new Match(DP, DP); toFight(m)
    m.step([press('special'), idle()])
    expect(m.fighters[0].state).not.toBe('attack')
    for (let i = 0; i < 10; i++) m.step([idle(), idle()])
    m.fighters[0].meter = 30
    m.step([press('special'), idle()])
    expect(m.fighters[0].state).toBe('attack')
    expect(m.fighters[0].meter).toBe(5)
  })

  it('AI끼리 붙여도 매치가 끝까지 진행된다', () => {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      const m = new Match(DP, DP)
      const ai = [new SimpleAI(d), new SimpleAI(d)]
      for (let i = 0; i < 60 * 60 * 4 && m.phase !== 'matchOver'; i++) {
        m.step([ai[0].input(m.fighters[0], m.fighters[1], i), ai[1].input(m.fighters[1], m.fighters[0], i)])
      }
      expect(m.phase).toBe('matchOver')
    }
  })
})
