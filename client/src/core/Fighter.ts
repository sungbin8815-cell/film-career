// 한 명의 파이터: 상태 머신 + 물리. Phaser 없음.
import type { CharacterData, FighterStateName, InputState, MoveData, MoveId, Rect } from './types'
import { emptyInput, STAGE_W } from './types'

export const METER_MAX = 100
const BUFFER = 8          // 입력 선입력 허용 프레임
const RUN_TAP = 12        // 같은 방향 두 번 누르기 간격
export const WALL = 14    // 화면 끝 여백

export class Fighter {
  readonly char: CharacterData
  readonly idx: number
  x: number
  y = 0
  vx = 0
  vy = 0
  facing: 1 | -1
  hp: number
  meter = 0
  state: FighterStateName = 'idle'
  stateFrame = 0
  move: MoveData | null = null
  moveFrame = 0
  hitsThisMove = 0
  stun = 0
  invuln = 0
  combo = 0            // 내가 넣고 있는 콤보 수
  lightChain = 0
  guardHeld = false
  hitConfirmed = false
  private prev: InputState = emptyInput()
  private pressedAt: Partial<Record<keyof InputState, number>> = {}
  private lastTap: { dir: number; frame: number } = { dir: 0, frame: -99 }
  private running = false
  frame = 0

  constructor(char: CharacterData, idx: number, x: number) {
    this.char = char
    this.idx = idx
    this.x = x
    this.facing = idx === 0 ? 1 : -1
    this.hp = char.hp
  }

  get grounded() { return this.y <= 0 && this.vy <= 0 }
  get isActing() { return this.state === 'attack' }
  get inHitstun() { return this.state === 'hit' || this.state === 'knockback' || this.state === 'knockdown' }
  get neutral() { return ['idle', 'walk', 'run', 'crouch', 'jump', 'fall', 'guard'].includes(this.state) && this.stun <= 0 }

  resetForRound(x: number) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0
    this.facing = this.idx === 0 ? 1 : -1
    this.hp = this.char.hp
    this.setState('idle')
    this.move = null; this.stun = 0; this.invuln = 0; this.combo = 0; this.lightChain = 0
  }

  setState(s: FighterStateName) {
    if (this.state !== s) this.stateFrame = 0
    this.state = s
  }

  /** 맞을 수 있는 몸통 박스 (월드 좌표, y는 지면 기준) */
  hurtbox(): Rect {
    const h = this.state === 'crouch' || (this.state === 'guard' && this.prev.down)
      ? this.char.hurt.crouchH
      : this.state === 'knockdown' ? 14 : this.char.hurt.h
    return { x: this.x - this.char.hurt.w / 2, y: this.y, w: this.char.hurt.w, h }
  }

  /** 지금 살아있는 공격 판정 */
  hitbox(): Rect | null {
    const m = this.move
    if (!m || this.state !== 'attack' || m.projectile) return null
    if (this.moveFrame < m.startup || this.moveFrame >= m.startup + m.active) return null
    const hb = m.hitbox
    const x = this.facing === 1 ? this.x + hb.x : this.x - hb.x - hb.w
    return { x, y: this.y + hb.y, w: hb.w, h: hb.h }
  }

  /** 이 프레임에 판정을 낼 수 있는지 (연속 판정 포함) */
  canHitNow(): boolean {
    const m = this.move
    if (!m) return false
    if (m.multiHit) {
      if (this.hitsThisMove >= m.multiHit.max) return false
      const t = this.moveFrame - m.startup
      return t >= 0 && t % m.multiHit.interval === 0
    }
    return this.hitsThisMove === 0
  }

  private pressed(k: keyof InputState, inp: InputState) {
    if (inp[k] && !this.prev[k]) this.pressedAt[k] = this.frame
    const at = this.pressedAt[k]
    return at != null && this.frame - at <= BUFFER
  }
  private consume(k: keyof InputState) { delete this.pressedAt[k] }

  private tryStartMove(inp: InputState, opts: { cancel?: boolean } = {}): boolean {
    const moves = this.char.moves
    const allowed = (id: MoveId) => {
      const m = moves[id]
      if (!m) return false
      if (m.cost && this.meter < m.cost) return false
      if (opts.cancel && this.move && !(this.move.cancelInto ?? []).includes(id)) return false
      if (opts.cancel && id === 'light' && this.lightChain >= 2) return false
      return true
    }
    let id: MoveId | null = null
    if (this.pressed('super', inp) && allowed('super')) { id = 'super'; this.consume('super') }
    else if (this.pressed('special', inp)) {
      const want: MoveId = inp.down ? 'special2' : 'special1'
      if (allowed(want)) { id = want; this.consume('special') }
    } else if (this.pressed('heavy', inp) && allowed('heavy')) { id = 'heavy'; this.consume('heavy') }
    else if (this.pressed('light', inp) && allowed('light')) { id = 'light'; this.consume('light') }
    if (!id) return false
    this.startMove(id, opts.cancel)
    return true
  }

  pendingEvents: { type: 'move'; move: MoveId }[] = []

  private startMove(id: MoveId, isCancel = false) {
    const m = this.char.moves[id]!
    if (m.cost) this.meter -= m.cost
    this.lightChain = id === 'light' ? (isCancel && this.move?.id === 'light' ? this.lightChain + 1 : 1) : 0
    this.move = m
    this.moveFrame = 0
    this.hitsThisMove = 0
    this.hitConfirmed = false
    this.setState('attack')
    if (this.grounded) this.vx = 0
    this.pendingEvents.push({ type: 'move', move: id })
  }

  /** 히트스톱 중에도 버튼 입력은 기억해 둠 (선입력) */
  observe(inp: InputState) {
    this.frame++
    for (const k of Object.keys(inp) as (keyof InputState)[]) if (inp[k] && !this.prev[k]) this.pressedAt[k] = this.frame
    this.prev = { ...inp }
  }

  /** 입력 처리와 상태 전이 (한 프레임) */
  think(inp: InputState, opp: Fighter, canAct: boolean) {
    this.frame++
    this.stateFrame++
    this.guardHeld = inp.guard
    if (!canAct) inp = emptyInput()
    // 방향 두 번 → 달리기
    const dirNow = inp.right ? 1 : inp.left ? -1 : 0
    const dirPrev = this.prev.right ? 1 : this.prev.left ? -1 : 0
    if (dirNow !== 0 && dirPrev === 0) {
      this.running = this.lastTap.dir === dirNow && this.frame - this.lastTap.frame <= RUN_TAP
      this.lastTap = { dir: dirNow, frame: this.frame }
    }
    if (dirNow === 0) this.running = false

    if (this.invuln > 0) this.invuln--
    switch (this.state) {
      case 'victory': case 'defeat':
        this.vx *= 0.8
        break
      case 'hit':
        this.vx *= 0.86
        if (--this.stun <= 0) this.setState(this.grounded ? 'idle' : 'fall')
        break
      case 'knockback':
        if (this.grounded && this.stateFrame > 3) { this.setState('knockdown'); this.stun = 34; this.vx = 0; this.invuln = 40 }
        break
      case 'knockdown':
        this.vx *= 0.7
        if (--this.stun <= 0) this.setState('idle')
        break
      case 'guard':
        this.vx *= 0.8
        if (this.grounded && this.stun <= 0) this.facing = opp.x >= this.x ? 1 : -1  // 넘어온 상대도 막도록 방향 갱신
        if (this.stun > 0) { this.stun--; break }
        if (!inp.guard || !this.grounded) this.setState('idle')
        else if (this.tryStartMove(inp)) break
        break
      case 'attack': {
        const m = this.move!
        this.moveFrame++
        if (m.dash && this.moveFrame >= m.startup && this.moveFrame < m.startup + m.active) this.vx = this.facing * m.dash
        else if (this.grounded) this.vx *= 0.7
        // 맞혔거나 막혔으면 경직을 끊고 다음 기술로 (콤보)
        if (this.hitConfirmed && this.moveFrame >= m.startup && this.tryStartMove(inp, { cancel: true })) break
        if (this.moveFrame >= m.startup + m.active + m.recovery) { this.move = null; this.setState(this.grounded ? 'idle' : 'fall') }
        break
      }
      default: {
        // 자유 상태: idle walk run crouch jump fall
        if (this.grounded) {
          this.facing = opp.x >= this.x ? 1 : -1
          if (this.tryStartMove(inp)) break
          if (inp.guard) { this.setState('guard'); this.vx = 0; break }
          if (inp.up) {
            this.vy = this.char.jumpV
            this.vx = dirNow * this.char.airSpeed
            this.y = 0.01
            this.setState('jump')
            this.pendingJump = true
            break
          }
          if (inp.down) { this.setState('crouch'); this.vx = 0; break }
          if (dirNow) {
            const back = dirNow !== this.facing
            const sp = this.running && !back ? this.char.runSpeed : this.char.walkSpeed * (back ? 0.85 : 1)
            this.vx = dirNow * sp
            this.setState(this.running && !back ? 'run' : 'walk')
          } else { this.vx = 0; this.setState('idle') }
        } else {
          if (this.tryStartMove(inp)) break
          this.setState(this.vy > 0 ? 'jump' : 'fall')
        }
      }
    }
    this.prev = { ...inp }
  }

  pendingJump = false
  pendingLand = false

  /** 물리 이동 */
  physics() {
    const wasAir = this.y > 0
    this.x += this.vx
    if (this.y > 0 || this.vy > 0) {
      this.vy -= this.char.gravity
      this.y += this.vy
      if (this.y <= 0) {
        this.y = 0; this.vy = 0
        if (wasAir) this.pendingLand = true
        if (this.state === 'jump' || this.state === 'fall') { this.setState('idle'); this.vx = 0 }
        if (this.state === 'attack' && this.move && this.moveFrame < this.move.startup + this.move.active) { /* 공중 공격 착지 */ }
      }
    }
    this.x = Math.max(WALL, Math.min(STAGE_W - WALL, this.x))
  }
}
