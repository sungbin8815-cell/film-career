// 캐릭터 7명 점검: 데이터·동작·직급·스테이지 순서·밸런스
import { describe, expect, it, vi } from 'vitest'
import { Match } from '../src/core/Match'
import { CHARACTERS, atRank, getCharacter } from '../src/config/characters'
import { STAGES, opponentFor } from '../src/config/stages'
import { animsFor, animOf } from '../src/gfx/charPoses'
import { SimpleAI } from '../src/core/AI'
import { emptyInput, type InputState } from '../src/core/types'

describe('캐릭터 데이터', () => {
  it('7명 모두 방향×버튼 칸·궁극기·고유 커맨드 10개 이상, 쓰는 동작이 다 있다', () => {
    expect(CHARACTERS.length).toBe(7)
    for (const c of CHARACTERS) {
      for (const id of ['A_n', 'B_n', 'C_n', 'D_n', 'R', 'A_air', 'B_air']) expect(c.moves[id], `${c.id}.${id}`).toBeTruthy()
      expect(c.moves.R!.ult, `${c.id} R ult`).toBeTruthy()
      expect(c.commands.length, c.id).toBeGreaterThanOrEqual(10)
      // 절반 이상은 이동 입력(방향·대시·백스텝·점프)이 섞인 커맨드
      const motion = c.commands.filter((k) => k.air || k.seq.some((t) => !'ABCDR'.includes(t)))
      expect(motion.length * 2, `${c.id} 이동 섞인 커맨드`).toBeGreaterThanOrEqual(c.commands.length)
      for (const k of c.commands) expect(c.moves[k.move], `${c.id} cmd ${k.move}`).toBeTruthy()
      const A = animsFor(c.id)
      for (const m of Object.values(c.moves)) expect(A[animOf(m)], `${c.id}.${m.id} anim ${animOf(m)}`).toBeTruthy()
      expect(c.titles.length).toBe(5)
      expect(c.showcase.length).toBeGreaterThan(0)
      for (const id of c.showcase) expect(c.moves[id], `${c.id} showcase ${id}`).toBeTruthy()
    }
  })
  it('같은 입력이 캐릭터마다 다른 기술 (커맨드 이름이 겹치지 않음)', () => {
    const seen = new Map<string, string>()
    for (const c of CHARACTERS) for (const k of c.commands) {
      const name = c.moves[k.move]!.name
      expect(seen.get(name), `${c.id} ${name}`).toBeUndefined()
      seen.set(name, c.id)
    }
  })
  it('모든 캐릭터의 C·D가 실제로 나간다 (조건이 필요한 건 채워 줌)', () => {
    for (const c of CHARACTERS) for (const [inp, slot] of [[{ special: true }, 'C'], [{ trait: true }, 'D']] as const) {
      const m = new Match(c, getCharacter('dp'))
      for (let i = 0; i < 90; i++) m.step([emptyInput(), emptyInput()])
      const f = m.fighters[0]
      f.trait.res = 100; f.trait.traps = [f.x + 40]; f.trait.lastSeen = 'dp:C_n'; f.meter = 100
      m.world.boxes.push({ owner: 0, x: f.x + 30, y: 0, w: 24, h: 18, hp: 3, t: 999 })
      m.fighters[1].x = f.x + 60
      const moves: string[] = []
      for (let i = 0; i < 40; i++) for (const e of m.step([i === 0 ? { ...emptyInput(), ...inp } : emptyInput(), emptyInput()])) if (e.type === 'move' && e.fighter === 0) moves.push(e.move)
      expect(moves.length, `${c.id} ${slot}`).toBeGreaterThan(0)
    }
  })
  it('모든 고유 커맨드가 실제 입력으로 나간다', () => {
    const keyOf = { A: 'light', B: 'heavy', C: 'special', D: 'trait', R: 'super' } as const
    for (const c of CHARACTERS) for (const k of c.commands) {
      const m = new Match(c, getCharacter('dp'))
      for (let i = 0; i < 90; i++) m.step([emptyInput(), emptyInput()])
      const f = m.fighters[0]
      f.trait.res = 100; f.trait.traps = [f.x + 40]; f.meter = 100
      m.world.extras.push({ owner: 0, x: f.x + 30, y: 0, vx: 0, vy: 0, t: 999, cd: 99, lunge: 0, hit: false })
      m.fighters[1].x = f.x + 90
      // 토큰 → 프레임 입력 (오른쪽이 앞)
      const frames: Partial<InputState>[] = []
      if (k.air) frames.push({ up: true }, ...Array(8).fill({}))
      for (let i = 0; i < k.seq.length; i++) {
        const t = k.seq[i]
        if (t in keyOf) {
          const prev = k.seq[i - 1]
          const hold: Partial<InputState> = prev === 'u' ? { up: true } : prev === 'd' ? { down: true } : prev === 'f' ? { right: true } : prev === 'b' ? { left: true } : {}
          frames.push({ ...hold, [keyOf[t as keyof typeof keyOf]]: true })
          // 체인: 앞 기술이 끝날 무렵까지 기다림 (헛쳐도 이어짐)
          if (k.seq[i + 1] && k.seq[i + 1] in keyOf) {
            // 체인: 앞 기술 판정이 끝날 무렵까지 기다림 (무거운 기술은 더 길게)
            const pm = c.moves[`${t}_n`]
            frames.push(...Array(Math.max(16, pm ? pm.startup + pm.active - 2 : 16)).fill({}))
          }
        } else if (t === 'f') frames.push({ right: true })
        else if (t === 'b') frames.push({ left: true })
        else if (t === 'd') frames.push(k.seq[i - 1] === 'd' ? {} : { down: true }, ...(k.seq[i - 1] === 'd' ? [{ down: true }] : []))
        else if (t === 'u') { if (!(k.seq[i + 1] in keyOf)) frames.push({ up: true }) }
        else if (t === 'dash') frames.push({ right: true }, {}, { right: true }, { right: true }, { right: true })
        else if (t === 'bs') frames.push({ left: true }, {}, { left: true }, ...Array(14).fill({}))
        else if (t === 'jump') frames.push({ up: true }, ...Array(8).fill({}))
        else if (t === 'airdash') frames.push({ right: true }, {}, { right: true }, {})
      }
      const moves: string[] = []
      for (let i = 0; i < frames.length + 30; i++) for (const e of m.step([{ ...emptyInput(), ...(frames[i] ?? {}) }, emptyInput()])) if (e.type === 'move' && e.fighter === 0) moves.push(e.move)
      expect(moves, `${c.id} ${k.seq.join(' ')} → ${k.move}`).toContain(k.move)
    }
  })
})

describe('스테이지 모드 직급', () => {
  it('막내는 기본기·C_n·D_n만, 퍼스트부터 궁극기, 감독은 전부', () => {
    for (const c of CHARACTERS) {
      const m0 = atRank(c, 0)
      expect(m0.moves.R, c.id).toBeUndefined()
      expect(m0.moves.A_n && m0.moves.C_n && m0.moves.D_n).toBeTruthy()
      expect(Object.keys(atRank(c, 1).moves).length).toBeGreaterThan(Object.keys(m0.moves).length)
      expect(atRank(c, 2).moves.R).toBeUndefined()
      expect(atRank(c, 3).moves.R).toBeTruthy()
      expect(Object.keys(atRank(c, 4).moves).length).toBe(Object.keys(c.moves).length)
    }
  })
  it('막내는 궁극기 버튼을 눌러도 아무것도 안 나간다', () => {
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
  it('캐릭터별 평균 승률 40~60% (AI끼리, 양쪽 자리 바꿔 평균), 완전히 못 이기는 상대는 없음', () => {
    const ids = CHARACTERS.map((c) => c.id)
    const w: Record<string, number> = {}
    for (const a of ids) for (const b of ids) if (a !== b) w[a + b] = aiVsAi(a, b, 16)
    const rows: string[] = []
    let worst = 0.5
    const avg: Record<string, number> = {}
    for (const a of ids) {
      avg[a] = 0
      const r: string[] = []
      for (const b of ids) {
        if (a === b) { r.push('  -'); continue }
        const v = (w[a + b] + 1 - w[b + a]) / 2
        worst = Math.min(worst, v)
        avg[a] += v / (ids.length - 1)
        r.push(String(Math.round(v * 100)).padStart(3))
      }
      rows.push(`${a.padEnd(9)}${r.join(' ')}   평균 ${Math.round(avg[a] * 100)}`)
    }
    console.log('승률표 (행 캐릭터가 이긴 비율 %, 양쪽 자리 평균)\n' + rows.join('\n'))
    for (const a of ids) { expect(avg[a], `${a} 평균`).toBeGreaterThanOrEqual(0.4); expect(avg[a], `${a} 평균`).toBeLessThanOrEqual(0.6) }
    expect(worst).toBeGreaterThan(0.05)
  }, 120000)
})
