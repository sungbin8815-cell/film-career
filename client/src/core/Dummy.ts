// 훈련장 더미: 서기·앉기·점프·항상 방어·첫 타 후 방어·CPU·녹화 재생. Phaser와 무관한 순수 로직.
import type { Fighter } from './Fighter'
import type { InputState } from './types'
import { emptyInput } from './types'
import { SimpleAI } from './AI'

export type DummyMode = 'stand' | 'crouch' | 'jump' | 'block' | 'blockAfter' | 'cpu' | 'play'
export const DUMMY_LABEL: Record<DummyMode, string> = { stand: '서기', crouch: '앉기', jump: '점프', block: '항상 방어', blockAfter: '첫 타 후 방어', cpu: 'CPU', play: '녹화 재생' }
export const DUMMY_MODES = Object.keys(DUMMY_LABEL) as DummyMode[]

/** 녹화는 앞·뒤를 상대 기준으로 저장 → 어느 쪽에 있어도 같은 동작 */
type Rec = { fwd: boolean; back: boolean } & Omit<InputState, 'left' | 'right'>
export const REC_MAX = 600   // 10초

export class Dummy {
  mode: DummyMode = 'stand'
  private ai = new SimpleAI('normal')
  private guardT = 0
  rec: Rec[] = []
  private playI = 0

  /** 녹화: 플레이어 입력을 더미 입장(상대 기준 앞·뒤)으로 저장 */
  record(inp: InputState, me: Fighter, opp: Fighter) {
    if (this.rec.length >= REC_MAX) return false
    const fwdRight = opp.x >= me.x
    const { left, right, ...rest } = inp
    this.rec.push({ ...rest, fwd: fwdRight ? right : left, back: fwdRight ? left : right })
    return true
  }
  clearRec() { this.rec = []; this.playI = 0 }

  input(me: Fighter, opp: Fighter, frame: number): InputState {
    const inp = emptyInput()
    const away: 'left' | 'right' = opp.x >= me.x ? 'left' : 'right'
    const perfectBlock = () => { inp[away] = true; const m = opp.move; if (m?.low) inp.down = true }
    switch (this.mode) {
      case 'stand': break
      case 'crouch': inp.down = true; break
      case 'jump': inp.up = me.grounded && me.neutral && frame % 4 === 0; break
      case 'block': perfectBlock(); break
      case 'blockAfter':
        // 한 대 맞은 뒤 풀려나면 1초 동안 방어 (연속기가 끊겼는지 확인용)
        if (me.inHitstun) this.guardT = 60
        else if (this.guardT > 0) { this.guardT--; perfectBlock() }
        break
      case 'cpu': return this.ai.input(me, opp, frame)
      case 'play': {
        if (!this.rec.length) break
        const r = this.rec[this.playI++ % this.rec.length]
        const fwdRight = opp.x >= me.x
        const { fwd, back, ...rest } = r
        Object.assign(inp, rest)
        inp.right = fwdRight ? fwd : back; inp.left = fwdRight ? back : fwd
        break
      }
    }
    return inp
  }
}
