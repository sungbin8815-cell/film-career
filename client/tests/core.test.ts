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

describe('커맨드 콤보', () => {
  // 버튼을 순서대로 누르고 각 기술이 무엇으로 나갔는지 기록
  function run(seq: (Partial<InputState> | null)[], gap = 9, close = true) {
    const m = new Match(DP, DP); toFight(m); if (close) closeIn(m, 26)
    const moves: string[] = []
    const frames: (Partial<InputState> | null)[] = []
    for (const k of seq) { frames.push(k); for (let i = 1; i < gap; i++) frames.push(null) }
    for (let i = 0; i < 40; i++) frames.push(null)
    for (const f of frames) {
      const ev = m.step([f ? { ...emptyInput(), ...f } : idle(), idle()])
      for (const e of ev) if (e.type === 'move' && e.fighter === 0) moves.push(e.move)
    }
    return { m, moves }
  }
  it('약 약 강 → 트라이포드 어퍼 (상대가 높이 뜬다)', () => {
    const { m, moves } = run([{ light: true }, { light: true }, { heavy: true }])
    expect(moves).toEqual(['light', 'light', 'upper'])
    expect(m.fighters[1].hp).toBeLessThan(DP.hp - 100)
  })
  it('빗나가도 순서만 맞으면 콤보 기술이 나간다', () => {
    const { moves } = run([{ light: true }, { light: true }, { heavy: true }], 9, false)
    expect(moves).toEqual(['light', 'light', 'upper'])
  })
  it('강 강 → 회전베기, 약 강 강 → 줌인 펀치', () => {
    expect(run([{ heavy: true }, { heavy: true }], 14).moves).toEqual(['heavy', 'spin'])
    expect(run([{ light: true }, { heavy: true }, { heavy: true }], 12).moves).toEqual(['light', 'heavy', 'zoompunch'])
  })
  it('히트스톱 중에 누른 버튼도 놓치지 않는다 (사람 타이밍 10~16프레임)', () => {
    for (let g = 10; g <= 16; g++) expect(run([{ light: true }, { heavy: true }, { heavy: true }], g).moves, `gap ${g}`).toEqual(['light', 'heavy', 'zoompunch'])
  })
  it('약 약 강 어퍼는 약 두 대로 밀린 상대에게도 닿아서 띄운다', () => {
    for (let g = 8; g <= 12; g++) {
      const { m } = run([{ light: true }, { light: true }, { heavy: true }], g)
      expect(m.fighters[1].hp, `gap ${g}`).toBeLessThan(DP.hp - 110)
    }
  })
  it('↓+강 → 로우앵글 스윕', () => {
    expect(run([{ heavy: true, down: true }]).moves).toEqual(['sweep'])
  })
  it('게이지가 없으면 약 강 특(롱테이크 러시) 대신 아무것도 안 나감', () => {
    const { moves } = run([{ light: true }, { heavy: true }, { special: true }], 12)
    expect(moves.slice(0, 2)).toEqual(['light', 'heavy'])
    expect(moves).not.toContain('rush')
  })
})
