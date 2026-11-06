// 콤보 트라이얼 판정: 한 콤보(끊기지 않은 연속 히트) 안에 정해진 기술이 순서대로 맞으면 성공
import type { MatchEvent } from './types'

export interface Trial { name: string; level: '쉬움' | '보통' | '어려움'; moves: string[]; hint?: string }

const base = (id: string) => id.split('~')[0]

export class TrialTracker {
  /** 지금 콤보에서 맞힌 기술들 (같은 기술 연타는 한 번으로) */
  hits: string[] = []
  progress = 0
  done = false
  constructor(public trial: Trial, private who = 0) {}

  reset() { this.hits = []; this.progress = 0; this.done = false }

  /** 이벤트를 넣으면 성공 여부 */
  feed(ev: MatchEvent[]): boolean {
    for (const e of ev) {
      if (e.type !== 'hit' || e.attacker !== this.who || !e.move) continue
      if (e.combo <= 1) { this.hits = []; this.progress = 0 }
      const id = base(e.move)
      if (this.hits[this.hits.length - 1] !== id) this.hits.push(id)
      if (!this.done && this.progress < this.trial.moves.length && base(this.trial.moves[this.progress]) === id) this.progress++
      if (this.progress >= this.trial.moves.length) this.done = true
    }
    return this.done
  }
}
