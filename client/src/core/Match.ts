// 경기 진행: 라운드, 타이머, 충돌 판정, 피격·가드, 히트스톱, 투사체.
// 화면은 이 객체의 상태를 읽어 그리고, events로 효과를 냅니다.
import { Fighter, METER_MAX } from './Fighter'
import type { CharacterData, InputState, MatchEvent, MoveData, ProjectileSpec, Rect } from './types'
import { FPS, STAGE_W } from './types'

export const ROUND_TIME = 60      // 초
export const ROUNDS_TO_WIN = 2
const START_X = [STAGE_W / 2 - 70, STAGE_W / 2 + 70]

export type Phase = 'intro' | 'fight' | 'ko' | 'roundEnd' | 'matchOver'

export interface Projectile extends ProjectileSpec {
  owner: number
  x: number
  y: number
  age: number
  dead: boolean
}

export const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export class Match {
  fighters: [Fighter, Fighter]
  projectiles: Projectile[] = []
  phase: Phase = 'intro'
  phaseFrame = 0
  round = 1
  wins: [number, number] = [0, 0]
  timer = ROUND_TIME * FPS
  hitstop = 0
  winner: number | null = null      // 매치 승자
  roundWinner: number | null = null
  events: MatchEvent[] = []
  frame = 0

  constructor(p1: CharacterData, p2: CharacterData) {
    this.fighters = [new Fighter(p1, 0, START_X[0]), new Fighter(p2, 1, START_X[1])]
    this.events.push({ type: 'round', round: 1 })
  }

  get timeLeft() { return Math.ceil(this.timer / FPS) }

  /** 한 프레임 진행. inputs[0] = 1P, inputs[1] = 2P(AI 또는 상대) */
  step(inputs: [InputState, InputState]): MatchEvent[] {
    this.events = []
    this.frame++
    this.phaseFrame++
    if (this.hitstop > 0) {
      this.hitstop--
      this.fighters[0].observe(inputs[0]); this.fighters[1].observe(inputs[1])
      return this.events
    }

    const [a, b] = this.fighters
    const canAct = this.phase === 'fight'
    if (this.phase === 'intro' && this.phaseFrame === 70) this.events.push({ type: 'fight' })
    if (this.phase === 'intro' && this.phaseFrame >= 80) this.setPhase('fight')

    a.think(inputs[0], b, canAct)
    b.think(inputs[1], a, canAct)
    for (const f of this.fighters) {
      for (const e of f.pendingEvents) {
        const m = f.char.moves[e.move]!
        this.events.push({ type: 'move', fighter: f.idx, move: e.move, name: m.name, combo: !!m.combo, voice: m.voice, sfx: m.sfx, afterimage: m.afterimage })
        if (e.move === 'super') { this.events.push({ type: 'super', fighter: f.idx }); this.hitstop = 24 }
        if (m.projectile) this.spawnProjectile(f, m.projectile)
      }
      f.pendingEvents = []
    }
    a.physics(); b.physics()
    for (const f of this.fighters) {
      if (f.pendingJump) { this.events.push({ type: 'jump', fighter: f.idx }); f.pendingJump = false }
      if (f.pendingLand) { this.events.push({ type: 'land', fighter: f.idx }); f.pendingLand = false }
      if (f.pendingKnockdown) { this.events.push({ type: 'knockdown', fighter: f.idx }); f.pendingKnockdown = false }
    }
    this.pushApart(a, b)

    if (this.phase === 'fight') {
      this.checkHit(a, b)
      this.checkHit(b, a)
      this.updateProjectiles()
      // 콤보 끊김: 맞던 쪽이 풀려나면 0
      if (!b.inHitstun) a.combo = 0
      if (!a.inHitstun) b.combo = 0
      this.timer--
      if (this.timer <= 0) this.timeUp()
    } else this.updateProjectiles()

    if (this.phase === 'ko' && this.phaseFrame > 150) this.endRound()
    if (this.phase === 'roundEnd' && this.phaseFrame > 40) this.nextRound()
    return this.events
  }

  private setPhase(p: Phase) { this.phase = p; this.phaseFrame = 0 }

  private pushApart(a: Fighter, b: Fighter) {
    const minGap = (a.char.hurt.w + b.char.hurt.w) / 2 - 2
    const dx = b.x - a.x
    const sameHeight = Math.abs(a.y - b.y) < 40
    if (sameHeight && Math.abs(dx) < minGap) {
      const push = (minGap - Math.abs(dx)) / 2
      const s = dx >= 0 ? 1 : -1
      a.x -= s * push; b.x += s * push
      // 벽에 붙었으면 반대쪽만 밀기
      for (const f of [a, b]) f.x = Math.max(14, Math.min(STAGE_W - 14, f.x))
    }
  }

  /** 띄운 상대 추가타 제한: 3번까지, 띄우기 기술이 아니면 1번까지 (착지 직후 넉백 프레임 포함) */
  private canJuggle(def: Fighter, juggle: boolean) {
    if (def.state !== 'knockback' && def.grounded) return true
    return !(def.juggles >= 3 || !juggle && def.juggles >= 1)
  }

  private isBlocking(def: Fighter, fromX: number) {
    if (!def.guardHeld || !def.grounded) return false
    if (def.state === 'attack' || def.inHitstun) return false
    const towardAttacker = fromX >= def.x ? 1 : -1
    return def.facing === towardAttacker
  }

  private checkHit(att: Fighter, def: Fighter) {
    const hb = att.hitbox()
    if (!hb || !att.canHitNow() || def.invuln > 0 || def.state === 'defeat') return
    if (!this.canJuggle(def, !!att.move?.juggle)) return
    if (!overlap(hb, def.hurtbox())) {
      return
    }
    att.hitsThisMove++
    this.resolve(att, def, att.move!, att.x)
  }

  /** 맞음 또는 막음 처리 (기술·투사체 공용) */
  private resolve(att: Fighter, def: Fighter, d: Pick<MoveData, 'damage' | 'chip' | 'hitstun' | 'blockstun' | 'kbX' | 'kbY' | 'meterGain' | 'name'> & Partial<Pick<MoveData, 'finisher' | 'lastHitKbY' | 'multiHit'>> & { id?: string }, fromX: number) {
    const dir = def.x >= fromX ? 1 : -1
    const hx = (att.x + def.x) / 2
    const hy = def.y + 34
    att.hitConfirmed = true
    if (this.isBlocking(def, fromX)) {
      def.hp = Math.max(1, def.hp - d.chip)
      def.setState('guard')
      def.stun = d.blockstun
      def.vx = dir * d.kbX * 0.7
      def.meter = Math.min(METER_MAX, def.meter + 3)
      att.meter = Math.min(METER_MAX, att.meter + Math.round(d.meterGain / 2))
      this.hitstop = 5
      this.events.push({ type: 'block', x: hx, y: hy, attacker: att.idx })
      return
    }
    const scale = Math.max(0.4, Math.pow(0.88, att.combo))
    const dmg = Math.max(1, Math.round(d.damage * scale))
    def.hp = Math.max(0, def.hp - dmg)
    att.combo++
    att.meter = Math.min(METER_MAX, att.meter + d.meterGain)
    def.meter = Math.min(METER_MAX, def.meter + Math.round(dmg / 18))
    def.move = null
    const lastOfMulti = !!d.multiHit && att.hitsThisMove >= d.multiHit.max
    const kbY = d.kbY ?? (lastOfMulti ? d.lastHitKbY : undefined)
    const launch = !!kbY || !def.grounded || def.hp <= 0
    if (!def.grounded) def.juggles++
    if (launch) {
      def.setState('knockback')
      def.vy = kbY ?? 3
      def.y = Math.max(def.y, 0.01)
      def.vx = dir * Math.max(1.5, d.kbX)
    } else {
      def.setState('hit')
      def.stun = d.hitstun
      def.vx = dir * d.kbX
    }
    const heavy = d.damage >= 80 || !!kbY
    const finisher = !!d.finisher && (!d.multiHit || lastOfMulti)
    this.hitstop = finisher ? 14 : heavy ? 9 : 5
    this.events.push({ type: 'hit', x: hx, y: hy, attacker: att.idx, damage: dmg, combo: att.combo, heavy, finisher, launch, moveName: d.name })
    if (def.hp <= 0) this.ko(att.idx)
  }

  private spawnProjectile(f: Fighter, p: ProjectileSpec) {
    this.projectiles.push({ ...p, owner: f.idx, x: f.x + f.facing * p.offsetX, y: p.startY, age: 0, dead: false, vx: p.vx * f.facing })
  }

  private updateProjectiles() {
    for (const p of this.projectiles) {
      p.age++
      p.x += p.vx
      p.y = Math.max(0, p.y + p.vy)
      if (p.age > p.life || (p.y <= 0 && p.age > 4 && p.kind !== 'lightstand')) p.dead = true
      if (p.y <= 0 && p.kind === 'lightstand' && p.age > p.life - 16) { /* 바닥에 쓰러진 채 잠깐 남음 */ }
      if (p.dead || this.phase !== 'fight') continue
      const def = this.fighters[1 - p.owner]
      const att = this.fighters[p.owner]
      if (def.invuln > 0) continue
      const box = { x: p.x - p.w / 2, y: p.y, w: p.w, h: p.h }
      if (p.y > 0 && this.canJuggle(def, false) && overlap(box, def.hurtbox())) {
        p.dead = true
        this.resolve(att, def, { ...p, meterGain: 6, name: '조명 낙하' }, p.x - p.vx * 4)
      }
      if (p.y <= 0) p.vy = 0
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead)
  }

  private ko(winnerIdx: number) {
    if (this.phase !== 'fight') return
    this.roundWinner = winnerIdx
    this.wins[winnerIdx]++
    this.events.push({ type: 'ko', winner: winnerIdx })
    this.hitstop = 30
    this.setPhase('ko')
  }

  private timeUp() {
    const [a, b] = this.fighters
    const winner = a.hp / a.char.hp >= b.hp / b.char.hp ? 0 : 1
    this.events.push({ type: 'timeup' })
    this.roundWinner = winner
    this.wins[winner]++
    this.setPhase('ko')
  }

  private endRound() {
    const w = this.roundWinner!
    this.fighters[w].setState('victory')
    this.fighters[1 - w].setState(this.fighters[1 - w].hp <= 0 ? 'defeat' : 'defeat')
    if (this.wins[w] >= ROUNDS_TO_WIN) { this.winner = w; this.setPhase('matchOver'); return }
    this.setPhase('roundEnd')
  }

  private nextRound() {
    this.round++
    this.timer = ROUND_TIME * FPS
    this.projectiles = []
    this.roundWinner = null
    this.fighters.forEach((f, i) => { f.resetForRound(START_X[i]); f.meter = Math.min(METER_MAX, f.meter) })
    this.events.push({ type: 'round', round: this.round })
    this.setPhase('intro')
  }
}
