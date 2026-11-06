// 한 명의 파이터: 상태 머신 + 물리. Phaser 없음.
import type { Btn, CharacterData, FighterStateName, InputState, MoveData, MoveId, Rect } from './types'
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
    this.move = null; this.stun = 0; this.invuln = 0; this.combo = 0; this.lightChain = 0; this.chainBtns = []; this.juggles = 0
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

  /** 이번 프레임에 눌린 공격 버튼 → 버튼 토큰 (L H S X, ↓와 같이면 dL dH dS) */
  private pressedBtn(inp: InputState): Btn | null {
    const d = inp.down ? 'd' : ''
    if (this.pressed('super', inp)) { this.consume('super'); return 'X' }
    if (this.pressed('special', inp)) { this.consume('special'); return (d + 'S') as Btn }
    if (this.pressed('heavy', inp)) { this.consume('heavy'); return (d + 'H') as Btn }
    if (this.pressed('light', inp)) { this.consume('light'); return (d + 'L') as Btn }
    return null
  }

  /** 버튼 → 기본 기술 (↓+특 = special2, ↓만 다르게 정의된 기술이 있으면 그것) */
  private baseMove(b: Btn): MoveId {
    const map: Record<Btn, MoveId> = { L: 'light', H: 'heavy', S: 'special1', X: 'super', dL: 'light', dH: 'heavy', dS: 'special2' }
    return map[b]
  }

  /** 커맨드 콤보 찾기: 지금까지 이어 친 버튼 + 이번 버튼 */
  private findCombo(seq: Btn[]): MoveId | null {
    const combos = [...this.char.combos].sort((a, b) => b.seq.length - a.seq.length)
    for (const c of combos) {
      if (c.seq.length !== seq.length) continue
      if (c.seq.every((t, i) => t === seq[i])) return c.move
    }
    return null
  }

  private isComboPrefix(seq: Btn[]) {
    return this.char.combos.some((c) => c.seq.length > seq.length && seq.every((t, i) => c.seq[i] === t))
  }

  private affordable(id: MoveId | null): id is MoveId {
    const m = id ? this.char.moves[id] : null
    return !!m && (!m.cost || this.meter >= m.cost)
  }

  /** 기술 발동 시도. cancel = 이전 기술 경직을 끊고 잇는 중 */
  private tryStartMove(inp: InputState, opts: { cancel?: boolean } = {}): boolean {
    const saved = { ...this.pressedAt }
    const b = this.pressedBtn(inp)
    if (!b) return false
    const single = (): MoveId => (b.startsWith('d') ? this.findCombo([b]) : null) ?? this.baseMove(b)
    let id: MoveId | null = null
    if (opts.cancel) {
      // 1) 커맨드 콤보: 순서만 맞으면 앞 기술이 빗나가도 이어짐
      const c = this.findCombo([...this.chainBtns, b])
      if (this.affordable(c)) id = c
      else {
        // 2) 일반 캔슬: 맞혔을 때만 cancelInto 목록으로
        const base = single()
        const okCancel = this.hitConfirmed && (this.move?.cancelInto ?? []).includes(base) && !(base === 'light' && this.lightChain >= 2)
        // 콤보 앞부분(예: 약 약 강의 '약 약')이면 빗나가도 이어 침
        const prefix = this.isComboPrefix([...this.chainBtns, b])
        if ((okCancel || prefix) && this.affordable(base)) id = base
      }
      if (!id) { this.pressedAt = saved; return false } // 못 이으면 선입력으로 남겨 둠
    } else {
      id = single()
      if (!this.affordable(id)) id = this.affordable(this.baseMove(b)) ? this.baseMove(b) : null
      if (!id) return false
    }
    this.startMove(id, b, !!opts.cancel)
    return true
  }

  pendingEvents: { type: 'move'; move: MoveId }[] = []
  /** 지금 이어 치고 있는 버튼 기록 (커맨드 콤보 판정용) */
  chainBtns: Btn[] = []
  juggles = 0

  private startMove(id: MoveId, b: Btn, isCancel = false) {
    const m = this.char.moves[id]!
    if (m.cost) this.meter -= m.cost
    this.lightChain = id === 'light' ? (isCancel && this.move?.id === 'light' ? this.lightChain + 1 : 1) : 0
    this.chainBtns = isCancel ? [...this.chainBtns, b] : [b]
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
    // 히트스톱 동안은 시간이 멈춘 것으로 보고 frame을 올리지 않음 → 선입력이 만료되지 않음
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
        if (this.grounded && this.stateFrame > 3) { this.setState('knockdown'); this.stun = 34; this.vx = 0; this.invuln = 40; this.juggles = 0; this.pendingKnockdown = true }
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
        // 콤보 잇기: 판정이 나온 뒤부터 (맞히면 일반 캔슬, 커맨드 콤보는 빗나가도 OK)
        if (this.moveFrame >= m.startup && this.tryStartMove(inp, { cancel: true })) break
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
  pendingKnockdown = false
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
