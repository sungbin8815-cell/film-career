// 전투 로직 테스트 (Phaser 없이): npm test
import { describe, expect, it } from 'vitest'
import { Match } from '../src/core/Match'
import { DP } from '../src/config/characters'
import { emptyInput, type InputState } from '../src/core/types'
import { SimpleAI } from '../src/core/AI'
import { cdKey } from '../src/core/Traits'

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

  it('D 렌즈 교체는 쿨타임 동안 다시 못 쓰고, 궁극기(R)는 SP 100이 있어야 나간다', () => {
    const m = new Match(DP, DP); toFight(m)
    m.fighters[1].x = 400
    m.step([press('trait'), idle()])
    expect(m.fighters[0].state).toBe('attack')
    for (let i = 0; i < 16; i++) m.step([idle(), idle()])
    expect(m.fighters[0].cds[cdKey('D_n')]).toBeGreaterThan(0)
    m.step([press('trait'), idle()])
    expect(m.fighters[0].state).not.toBe('attack')
    m.step([press('super'), idle()])
    expect(m.fighters[0].state).not.toBe('attack')
    m.fighters[0].meter = 100
    for (let i = 0; i < 2; i++) m.step([idle(), idle()])
    m.step([press('super'), idle()])
    expect(m.fighters[0].state).toBe('attack')
  })

  it('방어는 상대 반대쪽 방향을 누르면 자동, 하단은 앉아서 막아야 한다', () => {
    const blockedBy = (dirs: Partial<InputState>, moveBtn: Partial<InputState>) => {
      const m = new Match(DP, DP); toFight(m); closeIn(m)
      const hp = m.fighters[1].hp
      let blocked = false
      for (let i = 0; i < 30; i++) for (const e of m.step([i === 0 ? { ...idle(), ...moveBtn } : idle(), { ...idle(), ...dirs }])) if (e.type === 'block') blocked = true
      return { blocked, dmg: hp - m.fighters[1].hp }
    }
    // 2P는 왼쪽(1P)을 보고 있으니 오른쪽이 '뒤'
    expect(blockedBy({ right: true }, { heavy: true }).blocked).toBe(true)
    expect(blockedBy({}, { heavy: true }).blocked).toBe(false)
    expect(blockedBy({ right: true }, { heavy: true, down: true }).blocked).toBe(false)              // 하단(스윕)은 서서 못 막음
    expect(blockedBy({ right: true, down: true }, { heavy: true, down: true }).blocked).toBe(true)  // 앉아 막기
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
    expect(moves).toEqual(['A_n', 'A_n', 'tripod_upper'])
    expect(m.fighters[1].hp).toBeLessThan(DP.hp - 100)
  })
  it('빗나가도 순서만 맞으면 콤보 기술이 나간다', () => {
    const { moves } = run([{ light: true }, { light: true }, { heavy: true }], 9, false)
    expect(moves).toEqual(['A_n', 'A_n', 'tripod_upper'])
  })
  it('강 강 → 회전베기, 약 강 강 → 줌인 펀치', () => {
    expect(run([{ heavy: true }, { heavy: true }], 14).moves).toEqual(['B_n', 'spin_360'])
    expect(run([{ light: true }, { heavy: true }, { heavy: true }], 12).moves).toEqual(['A_n', 'B_n', 'zoom_punch'])
  })
  it('히트스톱 중에 누른 버튼도 놓치지 않는다 (사람 타이밍 10~16프레임)', () => {
    for (let g = 10; g <= 16; g++) expect(run([{ light: true }, { heavy: true }, { heavy: true }], g).moves, `gap ${g}`).toEqual(['A_n', 'B_n', 'zoom_punch'])
  })
  it('약 약 강 어퍼는 약 두 대로 밀린 상대에게도 닿아서 띄운다', () => {
    for (let g = 8; g <= 12; g++) {
      const { m } = run([{ light: true }, { light: true }, { heavy: true }], g)
      expect(m.fighters[1].hp, `gap ${g}`).toBeLessThan(DP.hp - 110)
    }
  })
  // 프레임별 입력을 직접 지정
  function at(map: Record<number, Partial<InputState>>, close = true, meter = 0) {
    const m = new Match(DP, DP); toFight(m); if (close) closeIn(m, 26)
    m.fighters[0].meter = meter
    const moves: string[] = []; const hits: string[] = []
    for (let f = 0; f < 120; f++) {
      const ev = m.step([map[f] ? { ...emptyInput(), ...map[f] } : idle(), idle()])
      for (const e of ev) {
        if (e.type === 'move' && e.fighter === 0) moves.push(e.move)
        if (e.type === 'hit' && e.attacker === 0) hits.push(e.moveName)
      }
    }
    return { moves, hits }
  }
  it('경직 중에 미리 누른 버튼은 기술이 끝나면 나간다 (선입력)', () => {
    // 헛친 강공격(총 33프레임)의 경직 끝 무렵에 약 → 강이 끝나자마자 약
    expect(at({ 0: { heavy: true }, 30: { light: true } }, false).moves).toEqual(['B_n', 'A_n'])
  })
  it('아주 빠르게 약 약 강을 눌러도 순서대로 기억해서 어퍼가 나간다', () => {
    expect(at({ 0: { light: true }, 2: { light: true }, 4: { heavy: true } }).moves).toEqual(['A_n', 'A_n', 'tripod_upper'])
  })
  it('게이지 없는 필살 버튼이 다른 버튼을 막지 않는다', () => {
    expect(at({ 0: { light: true }, 3: { super: true }, 5: { light: true } }).moves).toEqual(['A_n', 'A_n'])
  })
  it('강 강: 첫 강공격이 판정을 낸 뒤에 회전베기로 이어진다', () => {
    const { moves, hits } = at({ 0: { heavy: true }, 4: { heavy: true } })
    expect(moves).toEqual(['B_n', 'spin_360'])
    expect(hits[0]).toBe(DP.moves.B_n!.name)
  })
  it('↓+강 → 로우앵글 스윕', () => {
    expect(run([{ heavy: true, down: true }]).moves).toEqual(['B_d'])
  })
  it('게이지가 없으면 A B 뒤 R(궁극기)은 안 나감', () => {
    const { moves } = run([{ light: true }, { heavy: true }, { super: true }], 12)
    expect(moves.slice(0, 2)).toEqual(['A_n', 'B_n'])
    expect(moves).not.toContain('R')
  })
  it('↓→C 같은 이동+버튼 커맨드: 돌리 트랙', () => {
    expect(run([{ down: true }, { right: true }, { right: true, special: true }], 3, false).moves).toContain('dolly_track')
  })
  it('→→ 대시, ←← 백스텝(잠깐 무적)', () => {
    const m = new Match(DP, DP); toFight(m)
    const x0 = m.fighters[0].x
    for (const f of [{ right: true }, {}, { right: true }]) m.step([{ ...emptyInput(), ...f }, idle()])
    expect(m.fighters[0].state).toBe('dash')
    for (let i = 0; i < 20; i++) m.step([press('right'), idle()])
    expect(m.fighters[0].x).toBeGreaterThan(x0 + 60)
    for (let i = 0; i < 20; i++) m.step([idle(), idle()])
    for (const f of [{ left: true }, {}, { left: true }]) m.step([{ ...emptyInput(), ...f }, idle()])
    expect(m.fighters[0].state).toBe('backstep')
    expect(m.fighters[0].invuln).toBeGreaterThan(0)
  })
})

describe('넓은 맵·발판·튕김', () => {
  it('벽 튕김 기술로 스테이지 끝에 날리면 튕겨 나온다', () => {
    const m = new Match(DP, DP); toFight(m)
    const [a, b] = m.fighters
    b.x = 1170; a.x = b.x - 40
    const ev: string[] = []
    for (let i = 0; i < 60; i++) for (const e of m.step([i === 0 ? press('heavy') : idle(), idle()])) if (e.type === 'bounce') ev.push(e.kind)
    expect(ev).toContain('wall')
  })
  it('바닥 튕김 기술(공중 ↓B)을 맞으면 바닥에서 튀어 오른다', () => {
    const m = new Match(DP, DP); toFight(m)
    const [a, b] = m.fighters
    a.x = b.x - 20
    m.step([press('up'), idle()])
    const ev: string[] = []
    for (let i = 0; i < 70; i++) for (const e of m.step([i === 8 ? press('heavy', { down: true }) : idle(), idle()])) if (e.type === 'bounce') ev.push(e.kind)
    expect(ev).toContain('ground')
  })
  it('발판 위에 올라설 수 있고, ↓를 누르고 있으면 내려온다', () => {
    const m = new Match(DP, DP); toFight(m)
    m.platforms = [{ x: m.fighters[0].x, y: 60, w: 120 }]
    m.step([press('up'), idle()])
    for (let i = 0; i < 80; i++) m.step([idle(), idle()])
    expect(m.fighters[0].y).toBe(60)
    for (let i = 0; i < 40; i++) m.step([press('down'), idle()])
    for (let i = 0; i < 40; i++) m.step([idle(), idle()])
    expect(m.fighters[0].y).toBe(0)
  })
  it('근접 공격으로 투사체를 상쇄하고, 대시 순간에는 투사체를 뚫고 지나간다', () => {
    const shoot = (p2: (i: number) => Partial<InputState>) => {
      const m = new Match(DP, DP); toFight(m)
      const [a, b] = m.fighters
      a.trait.lens = 2; b.x = a.x + 140
      const hp = b.hp
      for (let i = 0; i < 60; i++) m.step([i === 0 ? press('special') : idle(), { ...idle(), ...p2(i) }])
      return hp - b.hp
    }
    expect(shoot(() => ({}))).toBeGreaterThan(0)
    expect(shoot((i) => (i === 8 ? { heavy: true } : {}))).toBe(0)
    expect(shoot((i) => (i === 10 || i === 12 ? { left: true } : {}))).toBe(0)
  })
})
