// 상태 기반 AI. 플레이어와 같은 InputState를 만들어 넣습니다(=치트 없음).
// 상대 기술을 "보고" 반응하는 데 걸리는 시간(react)을 두어 사람처럼 늦게 막습니다.
import type { Fighter } from './Fighter'
import type { InputState, Btn } from './types'
import { emptyInput } from './types'

export type Difficulty = 'easy' | 'normal' | 'hard'

const PARAM: Record<Difficulty, { think: number; react: number; guard: number; combo: number; special: number; aggro: number; afterHitGuard: number }> = {
  //        생각 간격  반응(프레임)  가드 확률  콤보 이어가기  특수기   공격성   맞은 뒤 가드
  easy:   { think: 34, react: 14, guard: 0.25, combo: 0.2,  special: 0.12, aggro: 0.38, afterHitGuard: 0.15 },
  normal: { think: 18, react: 9,  guard: 0.6,  combo: 0.6,  special: 0.3,  aggro: 0.6,  afterHitGuard: 0.5 },
  hard:   { think: 9,  react: 5,  guard: 0.85, combo: 0.95, special: 0.5,  aggro: 0.75, afterHitGuard: 0.8 },
}

type Plan = 'approach' | 'retreat' | 'wait' | 'attack' | 'guard' | 'jumpIn'

export class SimpleAI {
  private plan: Plan = 'wait'
  private planT = 0
  private nextThink = 30
  private press: keyof InputState | null = null
  private pressT = 0
  private downWithSpecial = false
  private seenOppMove = -1
  private wasHit = false
  private queue: Btn[] = []
  private readonly p: (typeof PARAM)[Difficulty]

  constructor(readonly difficulty: Difficulty = 'normal') { this.p = PARAM[difficulty] }

  input(me: Fighter, opp: Fighter, frame: number): InputState {
    const inp = emptyInput()
    const dx = opp.x - me.x
    const dist = Math.abs(dx)
    const toward: 'left' | 'right' = dx > 0 ? 'right' : 'left'
    const away: 'left' | 'right' = dx > 0 ? 'left' : 'right'
    const r = Math.random

    // 1) 상대 기술을 보고 반응 → 가드 (기술마다 한 번만 판단)
    const moveStart = opp.frame - opp.moveFrame   // 이 기술이 시작된 프레임 = 기술마다 고유
    if (opp.state === 'attack' && opp.move && opp.moveFrame >= this.p.react && this.seenOppMove !== moveStart) {
      this.seenOppMove = moveStart
      if (dist < 90 && me.neutral && r() < this.p.guard) { this.plan = 'guard'; this.planT = opp.move.startup + opp.move.active + 6 }
    }
    // 2) 맞고 풀려난 직후 겁먹고 가드
    if (me.inHitstun) this.wasHit = true
    else if (this.wasHit) { this.wasHit = false; if (r() < this.p.afterHitGuard) { this.plan = 'guard'; this.planT = 20 } }

    // 3) 커맨드 콤보 진행: 지금 기술의 startup이 끝나면 다음 버튼
    if (this.queue.length && !this.press) {
      if (me.state === 'attack' && me.move && me.moveFrame >= me.move.startup) {
        // 헛치면 잘하는 AI일수록 콤보를 멈춤 (헛친 콤보는 반격당하기 쉬움)
        if (!me.hitConfirmed && me.moveFrame >= me.move.startup + me.move.active && r() < this.p.combo * 0.8) this.queue = []
        else if (me.hitConfirmed || me.moveFrame >= me.move.startup + me.move.active) this.tapBtn(this.queue.shift()!)
      }
      else if (me.state !== 'attack') this.queue = []
    }
    if (me.inHitstun) this.queue = []
    // 3-b) 내 기술이 맞았으면 이어서 캔슬
    if (!this.queue.length && me.state === 'attack' && me.hitConfirmed && !this.press && r() < this.p.combo / 3) {
      const next = me.move?.id === 'light' ? (r() < 0.5 ? 'light' : 'heavy') : me.meter >= 25 ? 'special' : null
      if (next) this.tap(next as keyof InputState)
    }

    // 4) 평소 판단
    if (frame >= this.nextThink && me.neutral && this.plan !== 'guard') {
      const close = dist <= 44
      this.nextThink = frame + (close ? Math.ceil(this.p.think / 3) : this.p.think) + Math.floor(r() * this.p.think / (close ? 3 : 1))
      if (dist > 90) this.plan = r() < this.p.aggro ? 'approach' : r() < 0.25 ? 'jumpIn' : 'wait'
      else if (dist > 44) this.plan = r() < this.p.aggro ? (r() < 0.2 ? 'jumpIn' : 'approach') : r() < 0.35 ? 'retreat' : 'wait'
      // 붙어 있을 때: 먼저 치거나(공격성), 미리 막거나(가드 확률), 빠지거나
      else this.plan = r() < this.p.aggro ? 'attack' : r() < this.p.guard ? 'guard' : 'retreat'
      this.planT = 18 + Math.floor(r() * 24)
      if (this.plan === 'attack') {
        if (me.meter >= 100 && r() < this.p.special) this.tap('super')
        else if (me.meter >= 25 && r() < this.p.special / 2) this.tap('special')
        else if (r() < this.p.combo * 0.45) {
          const ok = me.char.combos.filter((c) => (me.char.moves[c.move]?.cost ?? 0) <= me.meter)
          const c = ok[Math.floor(r() * ok.length)]
          if (c) { this.queue = [...c.seq]; this.tapBtn(this.queue.shift()!) } else this.tap('light')
        }
        else this.tap(r() < 0.6 ? 'light' : 'heavy')
      }
      if (this.plan === 'approach' && dist > 110 && me.meter >= 25 && r() < this.p.special / 3) { this.tap('special'); this.downWithSpecial = true }
    }

    switch (this.plan) {
      case 'approach': inp[toward] = true; if (dist < 40) this.plan = 'wait'; break
      case 'retreat': inp[away] = true; break
      case 'guard': inp.guard = true; break
      case 'jumpIn': inp.up = true; inp[toward] = true; this.plan = 'wait'; break
      default: break
    }
    if (--this.planT <= 0) this.plan = 'wait'

    if (this.press) {
      inp[this.press] = this.pressT % 2 === 0
      if (this.downWithSpecial) inp.down = true
      if (--this.pressT <= 0) { this.press = null; this.downWithSpecial = false }
    }
    return inp
  }

  private tap(k: keyof InputState) { this.press = k; this.pressT = 2 }
  private tapBtn(b: Btn) {
    const k = ({ L: 'light', H: 'heavy', S: 'special', X: 'super' } as const)[b.replace('d', '') as 'L' | 'H' | 'S' | 'X']
    this.tap(k); this.downWithSpecial = b.startsWith('d')
  }
}
