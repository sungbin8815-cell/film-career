// 캐릭터 고유 시스템 점검 (패시브·Q·W·E·R)
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

describe('촬영감독: 렌즈 3단 전환', () => {
  it('E로 표준 → 망원 → 광각, 렌즈마다 Q 기술이 바뀐다', () => {
    const m = fight('dp'); const f = m.fighters[0]
    expect(m.world.remapMove(f, 'special1')).toBe('special1')
    run(m, { 0: { trait: true } }, 100); expect(f.trait.lens).toBe(2)
    expect(m.world.remapMove(f, 'special1')).toBe('special1_tele')
    run(m, { 0: { trait: true } }, 100); expect(f.trait.lens).toBe(0)
    expect(m.world.remapMove(f, 'special1')).toBe('special1_wide')
    expect(m.world.speedMul(f)).toBeGreaterThan(1)
  })
  it('망원으로 가만히 있으면 초점이 차고, 가득 찬 뒤 첫 공격은 크리티컬', () => {
    const m = fight('dp'); const [f, d] = m.fighters
    run(m, { 0: { trait: true } }, 90)
    expect(f.trait.focus).toBe(100)
    d.x = f.x + 60
    const ev = run(m, { 0: { heavy: true } }, 40)
    const hit = ev.find((e) => e.type === 'hit' && e.attacker === 0) as Extract<MatchEvent, { type: 'hit' }> | undefined
    expect(hit?.crit).toBe(true)
    expect(f.trait.focus).toBe(0)
  })
})

describe('연출감독: 콘티·NG!·큐 사인·리테이크', () => {
  it('Q 콘티를 밟으면 묶이고, E 큐 사인으로 터진다', () => {
    const m = fight('director'); const [f, d] = m.fighters
    run(m, { 0: { special: true } }, 30)
    expect(f.trait.traps.length).toBe(1)
    const trap = f.trait.traps[0]
    d.x = trap + 30
    run(m, {}, 40, hold(40, { left: true }))
    expect(d.snare).toBeGreaterThan(0)
    // 상대를 멀리 보내고 콘티를 하나 더 깐 뒤, 상대가 그 위에 있을 때 큐!
    d.x = f.x + 150; d.snare = 0
    run(m, { 0: { special: true } }, 80)
    const t2 = f.trait.traps[0]
    d.x = t2 + 10; d.snare = 30
    const hp = d.hp
    const ev = run(m, { 0: { trait: true } }, 30)
    expect(kinds(ev)).toContain('cue')
    expect(d.hp).toBeLessThan(hp)
  })
  it('W NG!: 받아치기 중 맞으면 공격이 무효, 상대가 굳는다', () => {
    const m = fight('director', 'dp'); const [f, d] = m.fighters
    d.x = f.x + 30
    const hp = f.hp
    const ev = run(m, { 0: { skill2: true } }, 30, { 2: { light: true } })
    expect(kinds(ev)).toContain('parry')
    expect(f.hp).toBe(hp)
    expect(['hit', 'idle', 'walk']).toContain(d.state)
  })
  it('R 리테이크: 상대를 2초 전 자리로 되돌리고 멈춘다', () => {
    const m = fight('director', 'dp'); const [f, d] = m.fighters
    const old = d.x
    run(m, {}, 130, hold(130, { left: true }))
    expect(d.x).toBeLessThan(old - 50)
    f.meter = 100
    const ev = run(m, { 0: { super: true } }, 40)
    expect(kinds(ev)).toContain('retake')
    expect(Math.abs(d.x - old)).toBeLessThan(40)
    expect(d.frozen).toBeGreaterThan(0)
  })
})

describe('사운드감독: 게인 업 → SOUND OVER', () => {
  it('맞을수록 게이지가 차고, 많이 모을수록 SOUND OVER가 세다', () => {
    const power = (res: number) => {
      const m = fight('sound', 'dp'); const [s, d] = m.fighters
      s.trait.res = res; d.x = s.x + 40
      const hp = d.hp
      run(m, { 0: { trait: true } }, 50)
      return hp - d.hp
    }
    expect(power(40)).toBeGreaterThan(0)
    expect(power(100)).toBeGreaterThan(power(40))
    const m = fight('sound', 'dp'); const [s, d] = m.fighters
    d.x = s.x + 30
    run(m, {}, 40, { 0: { heavy: true } })
    expect(s.trait.res).toBeGreaterThan(10)
  })
  it('게이지 30 미만이면 SOUND OVER가 안 나간다', () => {
    const m = fight('sound'); m.fighters[0].trait.res = 10
    const ev = run(m, { 0: { trait: true } }, 20)
    expect(ev.some((e) => e.type === 'move' && e.fighter === 0)).toBe(false)
  })
  it('W 노이즈 월이 투사체를 막는다', () => {
    const m = fight('sound', 'director'); const [s, d] = m.fighters
    d.x = s.x + 90
    const hp = s.hp
    run(m, { 6: { skill2: true } }, 60, { 0: { special: true } })
    // 연출 Q는 콘티라 투사체가 아님 → 촬영 망원 스나이프로 확인
    const m2 = fight('sound', 'dp'); const [s2, d2] = m2.fighters
    d2.trait.lens = 2; d2.x = s2.x + 100
    const hp2 = s2.hp
    const ev = run(m2, { 10: { skill2: true } }, 60, { 0: { special: true } })
    expect(kinds(ev)).toContain('noisewall')
    expect(s2.hp).toBe(hp2)
    expect(s.hp).toBe(hp)
  })
})

describe('조명감독: 노출 → 기절', () => {
  it('빛 기술로 노출이 쌓이고 100이 되면 상대가 기절(별)', () => {
    const m = fight('gaffer', 'dp'); const [g, d] = m.fighters
    d.x = g.x + 50
    g.trait.expose = 80
    const ev = run(m, { 0: { special: true } }, 40)
    expect(kinds(ev)).toContain('stun')
    expect(d.dizzy).toBeGreaterThan(0)
  })
  it('W 백라이트는 상대를 내 쪽으로 끌어온다', () => {
    const m = fight('gaffer', 'dp'); const [g, d] = m.fighters
    d.x = g.x + 120
    run(m, { 0: { skill2: true } }, 40)
    expect(d.x).toBeLessThan(g.x + 120)
  })
})

describe('미술감독: 제작 포인트 → 구조물', () => {
  it('Q 애플박스 위에 올라서면 높아지고, 포인트가 모자라면 못 만든다', () => {
    const m = fight('art', 'dp'); const [a] = m.fighters
    a.trait.res = 60
    run(m, { 0: { special: true } }, 30)
    expect(m.world.boxes.length).toBe(1)
    a.x = m.world.boxes[0].x
    run(m, { 0: { up: true } }, 70)
    expect(a.y).toBeGreaterThan(10)
    a.trait.res = 5
    run(m, { 0: { special: true } }, 80)
    expect(m.world.boxes.length).toBe(1)
  })
  it('E 소파 드롭이 상대 머리 위로 떨어진다', () => {
    const m = fight('art', 'dp'); const [a, d] = m.fighters
    a.trait.res = 100
    const hp = d.hp
    const ev = run(m, { 0: { trait: true } }, 90)
    expect(kinds(ev)).toContain('sofa')
    expect(d.hp).toBeLessThan(hp)
  })
})

describe('분장실장: 분장막', () => {
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
  it('E 클렌징: 분장막이 많을수록 세고, 막아도 들어간다', () => {
    const power = (res: number) => {
      const m = fight('makeup', 'dp'); const [k, d] = m.fighters
      k.trait.res = res; d.x = k.x + 30
      const hp = d.hp
      run(m, { 0: { trait: true } }, 40, hold(40, { right: true }))
      return hp - d.hp
    }
    expect(power(30)).toBeGreaterThan(0)
    expect(power(100)).toBeGreaterThan(power(30))
  })
})

describe('배우: 관찰 → 복사', () => {
  it('상대 스킬을 두 번 보면 Q 칸에 복사되고, Q를 누르면 그 기술이 나간다', () => {
    const m = fight('actor', 'gaffer'); const [a, g] = m.fighters
    g.x = a.x + 100
    run(m, {}, 200, { 0: { special: true }, 170: { special: true } })
    expect(a.char.moves.copy1?.copyOf).toBe('gaffer')
    expect(m.world.remapMove(a, 'special1')).toBe('copy1')
    const ev = run(m, { 0: { special: true } }, 30)
    expect(ev.some((e) => e.type === 'move' && e.fighter === 0 && e.move === 'copy1')).toBe(true)
  })
  it('R 명연기는 지금 상대의 필살기를 흉내 낸다', () => {
    const m = fight('actor', 'director'); const a = m.fighters[0]
    expect(m.world.remapMove(a, 'super')).toBe('copyR')
    expect(a.char.moves.copyR?.effect).toBe('retake')
  })
})
