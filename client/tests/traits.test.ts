// 직업 고유 특성 점검 (고유 버튼)
import { describe, expect, it } from 'vitest'
import { Match } from '../src/core/Match'
import { getCharacter } from '../src/config/characters'
import { emptyInput, type InputState } from '../src/core/types'

const idle = () => emptyInput()
function fight(p1: string, p2 = 'dp') {
  const m = new Match(getCharacter(p1), getCharacter(p2))
  for (let i = 0; i < 90; i++) m.step([idle(), idle()])
  return m
}
/** 프레임별 입력 실행 → 이벤트 모음 */
function run(m: Match, map: Record<number, Partial<InputState>>, n = 90, p2: Record<number, Partial<InputState>> = {}) {
  const ev: ReturnType<Match['step']> = []
  for (let f = 0; f < n; f++) ev.push(...m.step([map[f] ? { ...emptyInput(), ...map[f] } : idle(), p2[f] ? { ...emptyInput(), ...p2[f] } : idle()]))
  return ev
}

describe('촬영감독: 렌즈 교체', () => {
  it('누를 때마다 표준 → 망원 → 광각', () => {
    const m = fight('dp')
    expect(m.fighters[0].trait.lens).toBe(1)
    run(m, { 0: { trait: true } }, 40); expect(m.fighters[0].trait.lens).toBe(2)
    run(m, { 0: { trait: true } }, 40); expect(m.fighters[0].trait.lens).toBe(0)
  })
  it('망원은 더 멀리·더 세게, 광각은 더 빠르게·약하게', () => {
    const base = getCharacter('dp').moves.heavy!
    const m = fight('dp')
    const f = m.fighters[0]
    f.trait.lens = 2
    const tele = m.world.modifyMove(f, base)
    expect(tele.hitbox.x).toBeGreaterThan(base.hitbox.x)
    expect(tele.damage).toBeGreaterThan(base.damage)
    f.trait.lens = 0
    const wide = m.world.modifyMove(f, base)
    expect(wide.startup).toBeLessThan(base.startup)
    expect(wide.damage).toBeLessThan(base.damage)
    expect(wide.hitbox.h).toBeGreaterThan(base.hitbox.h)
  })
  it('망원이면 표준으로는 안 닿는 거리에서 강공격이 맞는다', () => {
    const hitAt = (lens: number) => {
      const m = fight('dp'); m.fighters[0].trait.lens = lens
      m.fighters[1].x = m.fighters[0].x + 62
      const hp = m.fighters[1].hp
      run(m, { 0: { heavy: true } }, 60)
      return m.fighters[1].hp < hp
    }
    expect(hitAt(1)).toBe(false)
    expect(hitAt(2)).toBe(true)
  })
})

describe('연출감독: 마킹 테이프', () => {
  it('표시를 깔고 멀리서 다시 누르면 표시 자리로 순간이동', () => {
    const m = fight('director')
    const f = m.fighters[0]
    run(m, { 0: { trait: true } }, 40)
    const mark = f.trait.mark!
    expect(mark).toBeCloseTo(f.x, 0)
    f.x = mark - 80
    const ev = run(m, { 0: { trait: true } }, 40)
    expect(ev.some((e) => e.type === 'trait' && e.kind === 'teleport')).toBe(true)
    expect(Math.abs(f.x - mark)).toBeLessThan(3)
  })
  it('표시 위에서 치면 피해가 더 크다', () => {
    const m = fight('director'); const f = m.fighters[0]
    const base = f.char.moves.heavy!
    f.trait.mark = Math.round(f.x)
    expect(m.world.modifyMove(f, base).damage).toBeGreaterThan(base.damage)
  })
})

describe('사운드감독: REC → 플레이백', () => {
  it('녹음 중 받은 피해만큼 센 음파가 나간다', () => {
    const m = fight('sound', 'dp')
    const [s, d] = m.fighters
    run(m, { 0: { trait: true } }, 14)
    expect(s.trait.rec).toBeGreaterThan(0)
    d.x = s.x + 30
    run(m, {}, 40, { 0: { heavy: true } })
    expect(s.trait.recorded).toBeGreaterThan(50)
    const rec = s.trait.recorded
    d.x = s.x + 120
    const ev = run(m, { 0: { trait: true } }, 30)
    const pb = ev.find((e) => e.type === 'trait' && e.kind === 'playback')
    expect(pb && pb.type === 'trait' && pb.value).toBe(Math.round(30 + rec * 0.9))
  })
})

describe('조명감독: 조명 설치', () => {
  it('빛 안에서 강공격은 한 번 맞아도 끊기지 않는다 (슈퍼아머)', () => {
    const m = fight('gaffer', 'dp')
    const [g, d] = m.fighters
    run(m, { 0: { trait: true } }, 40)
    expect(g.trait.light).not.toBeNull()
    d.x = g.x + 34
    // 조명감독 강공격 시작 직후 촬영감독 약공격이 먼저 맞음
    const ev = run(m, { 0: { heavy: true } }, 40, { 2: { light: true } })
    expect(ev.some((e) => e.type === 'armor' && e.fighter === 0)).toBe(true)
    expect(ev.some((e) => e.type === 'hit' && e.attacker === 0)).toBe(true)
  })
  it('빛 안의 상대는 눈부셔서 기술이 느려진다', () => {
    const m = fight('gaffer', 'dp'); const [g, d] = m.fighters
    g.trait.light = { x: d.x, t: 300 }
    const base = d.char.moves.light!
    expect(m.world.modifyMove(d, base).startup).toBe(base.startup + 2)
  })
})

describe('미술감독: 세트벽', () => {
  it('벽이 상대 투사체를 막고, 몸도 못 지나간다', () => {
    const m = fight('art', 'director')
    const [a, d] = m.fighters
    run(m, { 0: { trait: true } }, 30)
    const w = m.world.walls[0]
    expect(w).toBeTruthy()
    // 연출감독이 "컷!!" 음파를 쏴도 벽에 막힘
    d.meter = 100; d.x = w.x + 90
    const hp = a.hp
    run(m, {}, 80, { 0: { special: true } })
    expect(a.hp).toBe(hp)
    expect(m.world.walls[0]?.hp ?? 0).toBeLessThan(3)
    // 걸어서 못 지나감
    const m2 = fight('art', 'dp'); run(m2, { 0: { trait: true } }, 30)
    const w2 = m2.world.walls[0]; const o = m2.fighters[1]; o.x = w2.x + 30
    run(m2, {}, 60, Object.fromEntries(Array.from({ length: 60 }, (_, i) => [i, { left: true }])))
    expect(o.x).toBeGreaterThan(w2.x)
  })
})

describe('분장실장: 분장 완성', () => {
  it('맞힐 때마다 겹이 쌓이고, 완성!은 막아도 들어간다', () => {
    const m = fight('makeup', 'dp')
    const [mk, d] = m.fighters
    d.x = mk.x + 26
    run(m, { 0: { light: true }, 14: { light: true } }, 40)
    expect(mk.trait.stacks).toBe(2)
    // 상대가 가드를 계속 누르고 있어도
    const hold = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [i, { guard: true }]))
    const hp = d.hp
    const ev = run(m, { 0: { trait: true } }, 50, hold)
    expect(ev.some((e) => e.type === 'trait' && e.kind === 'detonate')).toBe(true)
    expect(hp - d.hp).toBeGreaterThanOrEqual(28)
    expect(mk.trait.stacks).toBe(0)
  })
  it('겹이 없으면 고유 버튼을 눌러도 아무것도 안 나간다', () => {
    const m = fight('makeup')
    const ev = run(m, { 0: { trait: true } }, 20)
    expect(ev.some((e) => e.type === 'move' && e.fighter === 0)).toBe(false)
  })
})
