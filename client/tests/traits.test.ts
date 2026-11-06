// 캐릭터 고유 특성 점검 (D 특성기·C 직업기·특성 모드)
import { describe, expect, it } from 'vitest'
import { Match } from '../src/core/Match'
import { getCharacter } from '../src/config/characters'
import { emptyInput, type InputState, type MatchEvent } from '../src/core/types'

const idle = () => emptyInput()
function fight(p1: string, p2 = 'dp') {
  const m = new Match(getCharacter(p1), getCharacter(p2))
  for (let i = 0; i < 90; i++) m.step([idle(), idle()])
  return m
}
/** 프레임별 입력 실행 → 이벤트 모음 */
function run(m: Match, map: Record<number, Partial<InputState>>, n = 90, p2: Record<number, Partial<InputState>> = {}) {
  const ev: MatchEvent[] = []
  for (let f = 0; f < n; f++) ev.push(...m.step([map[f] ? { ...emptyInput(), ...map[f] } : idle(), p2[f] ? { ...emptyInput(), ...p2[f] } : idle()]))
  return ev
}
const hold = (n: number, o: Partial<InputState>) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, o]))
const kinds = (ev: MatchEvent[]) => ev.filter((e) => e.type === 'trait').map((e) => (e as { kind: string }).kind)

describe('촬영감독: 렌즈 3단 (광각 돌격 ↔ 망원 저격)', () => {
  it('D← 망원, D→ 광각: 렌즈마다 같은 버튼이 다른 기술이 된다', () => {
    const m = fight('dp'); const f = m.fighters[0]
    expect(m.world.remapMove(f, 'C_n')).toBe('C_n')
    run(m, { 0: { trait: true, left: true } }, 60); expect(f.trait.lens).toBe(2)
    expect(m.world.remapMove(f, 'C_n')).toBe('C_n~tele')
    expect(m.world.remapMove(f, 'B_n')).toBe('B_n~tele')
    expect(m.world.speedMul(f)).toBeLessThan(1)
    run(m, { 0: { trait: true, right: true } }, 60); expect(f.trait.lens).toBe(0)
    expect(m.world.remapMove(f, 'C_n')).toBe('C_n~wide')
    expect(m.world.speedMul(f)).toBeGreaterThan(1)
  })
  it('망원으로 가만히 있으면 초점이 차고, 가득 찬 뒤 원거리 공격은 크리티컬', () => {
    const m = fight('dp'); const [f, d] = m.fighters
    run(m, { 0: { trait: true, left: true } }, 120)
    expect(f.trait.focus).toBe(100)
    d.x = f.x + 300
    const ev = run(m, { 0: { special: true } }, 60)
    const hit = ev.find((e) => e.type === 'hit' && e.attacker === 0) as Extract<MatchEvent, { type: 'hit' }> | undefined
    expect(hit?.crit).toBe(true)
  })
})

describe('연출감독: 콘티·엑스트라·액션!·NG!', () => {
  it('↓C 콘티를 밟으면 묶이고, D 액션!으로 터진다', () => {
    const m = fight('director'); const [f, d] = m.fighters
    run(m, { 0: { special: true, down: true } }, 30)
    expect(f.trait.traps.length).toBe(1)
    const trap = f.trait.traps[0]
    d.x = trap + 30
    run(m, {}, 40, hold(40, { left: true }))
    expect(d.snare).toBeGreaterThan(0)
    d.x = f.trait.traps[0] ?? trap; d.snare = 30
    if (!f.trait.traps.length) f.trait.traps = [d.x]
    const hp = d.hp
    const ev = run(m, { 0: { trait: true } }, 30)
    expect(kinds(ev)).toContain('cue')
    expect(d.hp).toBeLessThan(hp)
  })
  it('C 엑스트라가 나와서 상대를 때린다', () => {
    const m = fight('director'); const [, d] = m.fighters
    const ev = run(m, { 0: { special: true } }, 30)
    expect(kinds(ev)).toContain('extra')
    expect(m.world.extras.length).toBe(1)
    d.x = m.world.extras[0].x + 20
    const hp = d.hp
    run(m, {}, 120)
    expect(d.hp).toBeLessThan(hp)
  })
  it('↓D NG!: 받아치기 중 맞으면 공격이 무효', () => {
    const m = fight('director', 'dp'); const [f, d] = m.fighters
    d.x = f.x + 30
    const hp = f.hp
    const ev = run(m, { 0: { trait: true, down: true } }, 30, { 4: { light: true } })
    expect(kinds(ev)).toContain('parry')
    expect(f.hp).toBe(hp)
  })
})

describe('사운드감독: 게인 → SOUND OVER, 여의봉 붐', () => {
  it('많이 모을수록 SOUND OVER가 세다', () => {
    const power = (res: number) => {
      const m = fight('sound', 'dp'); const [s, d] = m.fighters
      s.trait.res = res; d.x = s.x + 40
      const hp = d.hp
      run(m, { 0: { trait: true } }, 50)
      return hp - d.hp
    }
    expect(power(40)).toBeGreaterThan(0)
    expect(power(100)).toBeGreaterThan(power(40))
  })
  it('C를 누르고 있으면 붐대가 길어진다 (여의봉)', () => {
    const reach = (holdN: number) => {
      const m = fight('sound', 'dp'); const [s, d] = m.fighters
      d.x = s.x + 300
      run(m, hold(holdN, { special: true }), holdN + 30)
      return d.hp < d.maxHp
    }
    expect(reach(2)).toBe(false)
    expect(reach(50)).toBe(true)
  })
  it('↓D 노이즈 월이 투사체를 막는다', () => {
    const m = fight('sound', 'dp'); const [s, d] = m.fighters
    d.trait.lens = 2; d.x = s.x + 200
    const hp = s.hp
    const ev = run(m, { 4: { trait: true, down: true } }, 70, { 0: { special: true } })
    expect(kinds(ev)).toContain('noisewall')
    expect(s.hp).toBe(hp)
  })
})

describe('조명감독: 노출 → 기절, 레이저', () => {
  it('빛 기술로 노출이 쌓이고 100이 되면 상대가 기절(별)', () => {
    const m = fight('gaffer', 'dp'); const [g, d] = m.fighters
    d.x = g.x + 200
    g.trait.expose = 85
    const ev = run(m, { 0: { special: true } }, 50)
    expect(kinds(ev)).toContain('stun')
    expect(d.dizzy).toBeGreaterThan(0)
  })
  it('D 암전 블링크로 순간이동', () => {
    const m = fight('gaffer', 'dp'); const [g] = m.fighters
    const x0 = g.x
    const ev = run(m, { 0: { trait: true } }, 30)
    expect(kinds(ev)).toContain('blink')
    expect(Math.abs(g.x - x0)).toBeGreaterThan(60)
  })
})

describe('미술감독: 제작 포인트 → 구조물', () => {
  it('C 애플박스 위에 올라서면 높아지고, 포인트가 모자라면 못 만든다', () => {
    const m = fight('art', 'dp'); const [a] = m.fighters
    a.trait.res = 60
    run(m, { 0: { special: true } }, 40)
    expect(m.world.boxes.length).toBe(1)
    a.x = m.world.boxes[0].x
    run(m, { 0: { up: true } }, 70)
    expect(a.y).toBeGreaterThan(10)
    a.trait.res = 5
    run(m, { 0: { special: true } }, 80)
    expect(m.world.boxes.length).toBe(1)
  })
  it('↓C 소파 드롭이 상대 머리 위로 떨어진다', () => {
    const m = fight('art', 'dp'); const [a, d] = m.fighters
    a.trait.res = 100
    const hp = d.hp
    const ev = run(m, { 0: { special: true, down: true } }, 90)
    expect(kinds(ev)).toContain('sofaWarn')
    expect(d.hp).toBeLessThan(hp)
  })
})

describe('분장실장: 분장막·디버프·변신', () => {
  it('분장막이 피해를 흡수한다', () => {
    const hurt = (res: number) => {
      const m = fight('makeup', 'dp'); const [k, d] = m.fighters
      k.trait.res = res; d.x = k.x + 30
      const hp = k.hp
      run(m, {}, 40, { 0: { heavy: true } })
      return hp - k.hp
    }
    expect(hurt(100)).toBeLessThan(hurt(0))
  })
  it('C 상처분장 브러시를 맞으면 출혈', () => {
    const m = fight('makeup', 'dp'); const [k, d] = m.fighters
    d.x = k.x + 120
    run(m, { 0: { special: true } }, 60)
    expect(d.bleed).toBeGreaterThan(0)
  })
  it('D 크리처 변신: 기술이 크리처 버전으로 바뀐다', () => {
    const m = fight('makeup', 'dp'); const [k] = m.fighters
    k.trait.res = 100
    run(m, { 0: { trait: true } }, 50)
    expect(k.trait.mode).toBeGreaterThan(0)
    expect(m.world.remapMove(k, 'A_n')).toBe('A_n~creature')
  })
})

describe('배우: 관찰 → 복사, 배역 전환', () => {
  it('상대 직업기를 두 번 보면 C 칸에 복사되고, C를 누르면 그 기술이 나간다', () => {
    const m = fight('actor', 'gaffer'); const [a, g] = m.fighters
    g.x = a.x + 300
    run(m, {}, 260, { 0: { special: true }, 170: { special: true } })
    expect(a.char.moves.copy1?.copyOf).toBe('gaffer')
    expect(m.world.remapMove(a, 'C_n')).toBe('copy1')
    const ev = run(m, { 0: { special: true } }, 30)
    expect(ev.some((e) => e.type === 'move' && e.fighter === 0 && e.move === 'copy1')).toBe(true)
  })
  it('R 명연기는 지금 상대의 궁극기를 흉내 낸다', () => {
    const m = fight('actor', 'director'); const a = m.fighters[0]
    expect(m.world.remapMove(a, 'R')).toBe('copyR')
    expect(a.char.moves.copyR?.copyOf).toBe('director')
  })
  it('D 배역 전환: 사극이면 기본기가 사극 버전', () => {
    const m = fight('actor', 'dp'); const a = m.fighters[0]
    run(m, { 0: { trait: true } }, 30)
    expect(a.trait.role).toBe(1)
    expect(m.world.remapMove(a, 'B_n')).toBe('B_n~sageuk')
  })
})

describe('원거리 제약·무게', () => {
  it('모든 원거리 기술은 최소 쿨타임이 있어 연사할 수 없다', async () => {
    const { CHARACTERS, RANGED_CD } = await import('../src/config/characters')
    for (const c of CHARACTERS) for (const m of Object.values(c.moves)) {
      if (m.ult || !(m.projectile || (m.hitbox.x + m.hitbox.w >= 200 && m.vfx !== 'pole'))) continue
      expect(m.cd ?? 0, `${c.id}.${m.id}`).toBeGreaterThanOrEqual(RANGED_CD)
    }
  })
  it('망원 저격: 초점이 안 맞으면 약하고, 가만히 서서 풀초점이면 크게 한 방', () => {
    const shot = (wait: number) => {
      const m = fight('dp'); const [f, d] = m.fighters
      f.trait.lens = 2; f.trait.focus = 0
      run(m, {}, wait)
      d.x = f.x + 300
      const hp = d.hp
      run(m, { 0: { special: true } }, 60)
      return hp - d.hp
    }
    const weak = shot(5), strong = shot(100)
    expect(weak).toBeGreaterThan(0)
    expect(strong).toBeGreaterThan(weak * 4)
  })
  it('붐대는 느린 대신 세고, 히트스톱이 더 길다', () => {
    const hs = (id: string, inp: Partial<InputState>) => {
      const m = fight(id); const [a, d] = m.fighters
      a.x = d.x - 60
      let stop = 0
      for (let i = 0; i < 40; i++) { const ev = m.step([i === 0 ? { ...emptyInput(), ...inp } : emptyInput(), emptyInput()]); if (ev.some((e) => e.type === 'hit')) stop = Math.max(stop, m.hitstop) }
      return stop
    }
    expect(hs('sound', { heavy: true })).toBeGreaterThan(hs('makeup', { heavy: true }))
  })
})
