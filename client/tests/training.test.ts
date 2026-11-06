// 훈련장: 더미 동작·녹화 재생·콤보 트라이얼(모든 트라이얼이 실제 입력으로 성공하는지)
import { describe, expect, it } from 'vitest'
import { Match } from '../src/core/Match'
import { CHARACTERS, getCharacter } from '../src/config/characters'
import { TRIALS } from '../src/config/trials'
import { emptyInput, type InputState } from '../src/core/types'
import { ComboRunner } from '../src/core/AI'
import { TrialTracker } from '../src/core/Trial'
import { Dummy } from '../src/core/Dummy'

const fight = (p1: string, p2 = 'dp') => { const m = new Match(getCharacter(p1), getCharacter(p2)); for (let i = 0; i < 90; i++) m.step([emptyInput(), emptyInput()]); return m }

describe('콤보 트라이얼', () => {
  it('캐릭터마다 쉬움·보통·어려움 3개, 시범 입력으로 모두 성공한다', () => {
    for (const c of CHARACTERS) {
      const list = TRIALS[c.id]
      expect(list?.map((t) => t.level), c.id).toEqual(['쉬움', '보통', '어려움'])
      for (const t of list) {
        for (const id of t.moves) expect(c.moves[id], `${c.id} ${id}`).toBeTruthy()
        const m = fight(c.id)
        const [a, b] = m.fighters
        a.x = b.x - 40; a.meter = 100; a.trait.res = 100
        const run = new ComboRunner(a.char, t.moves)
        const tr = new TrialTracker(t)
        for (let i = 0; i < 500 && !tr.done; i++) { tr.feed(m.step([run.input(a, b), emptyInput()])); a.meter = 100 }
        expect(tr.done, `${c.id}: ${t.name} (${tr.hits.join('>')})`).toBe(true)
      }
    }
  }, 60000)
  it('콤보가 끊기면 처음부터', () => {
    const tr = new TrialTracker({ name: '', level: '쉬움', moves: ['A_n', 'B_n'] })
    tr.feed([{ type: 'hit', x: 0, y: 0, attacker: 0, damage: 1, combo: 1, heavy: false, finisher: false, launch: false, counter: false, moveName: '', move: 'A_n' }])
    tr.feed([{ type: 'hit', x: 0, y: 0, attacker: 0, damage: 1, combo: 1, heavy: false, finisher: false, launch: false, counter: false, moveName: '', move: 'B_n' }])
    expect(tr.done).toBe(false)
  })
})

describe('훈련장 더미', () => {
  it('항상 방어 더미는 공격을 막고, 앉기 더미는 앉아 있다', () => {
    const m = fight('dp'); const [a, b] = m.fighters
    const d = new Dummy(); d.mode = 'block'
    a.x = b.x - 30
    let blocked = false
    for (let i = 0; i < 40; i++) for (const e of m.step([i === 0 ? { ...emptyInput(), heavy: true } : emptyInput(), d.input(b, a, i)])) if (e.type === 'block') blocked = true
    expect(blocked).toBe(true)
    d.mode = 'crouch'
    for (let i = 0; i < 10; i++) m.step([emptyInput(), d.input(b, a, i)])
    expect(b.state).toBe('crouch')
  })
  it('첫 타 후 방어: 처음은 맞고, 풀려난 뒤 공격은 막는다', () => {
    const m = fight('dp'); const [a, b] = m.fighters
    const d = new Dummy(); d.mode = 'blockAfter'
    a.x = b.x - 30
    const ev: string[] = []
    for (let i = 0; i < 90; i++) for (const e of (i === 44 && (a.x = b.x - 30), m.step([i === 0 || i === 45 ? { ...emptyInput(), light: true } : emptyInput(), d.input(b, a, i)]))) if (e.type === 'hit' || e.type === 'block') ev.push(e.type)
    expect(ev[0]).toBe('hit')
    expect(ev).toContain('block')
  })
  it('녹화한 동작을 상대 기준 방향 그대로 재생', () => {
    const m = fight('dp'); const [a, b] = m.fighters
    const d = new Dummy()
    // 더미 입장에서 "앞으로 걷기"를 녹화 (더미는 오른쪽, 앞 = 왼쪽)
    for (let i = 0; i < 30; i++) d.record({ ...emptyInput(), left: true } as InputState, b, a)
    d.mode = 'play'
    const x0 = b.x
    for (let i = 0; i < 30; i++) m.step([emptyInput(), d.input(b, a, i)])
    expect(b.x).toBeLessThan(x0 - 10)
  })
})
