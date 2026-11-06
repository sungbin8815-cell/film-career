// 한 명의 파이터: 입력 해석 + 상태 머신 + 물리. Phaser 없음.
// 버튼 A·B·C·D·R × 방향(중립·앞·뒤·위·아래·공중·대시) = 기술 칸, 그 위에 캐릭터 고유 커맨드(방향+버튼 순서)
import type { Button, CharacterData, Command, FighterStateName, InputState, MoveData, MoveId, Rect, Tok } from './types'
import { emptyInput, STAGE_W } from './types'
import { newTraitState, cdKey, type TraitWorld } from './Traits'

export const METER_MAX = 100
const BUFFER = 10          // 버튼 선입력 허용 프레임 (모바일 터치를 위해 넉넉히)
const CMD_GAP = 22         // 커맨드 토큰 사이 최대 간격 (프레임)
const CMD_TOTAL = 70       // 커맨드 전체 허용 시간
const TAP = 14             // 같은 방향 두 번 = 대시·백스텝
export const WALL = 14     // 스테이지 끝 여백
const BTN_KEYS: [keyof InputState, Button][] = [['light', 'A'], ['heavy', 'B'], ['special', 'C'], ['trait', 'D'], ['super', 'R']]
/** 콤보 레벨: 높은 기술로만 캔슬 (A→B→C·D·커맨드→R) */
const LEVEL: Record<Button, number> = { A: 1, B: 2, C: 3, D: 3, R: 5 }

export interface FighterOpts { hpMul?: number; dmgMul?: number }

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
  combo = 0
  guardHeld = false
  crouchHeld = false
  threat = false
  hitConfirmed = false
  frame = 0
  trait = newTraitState()
  world?: TraitWorld
  armorLeft = 0
  wallBounced = false
  groundBounced = false
  /** 맞은 기술의 튕김 속성 (벽·바닥) */
  wallArm = false
  groundArm = false
  pendingBounce: 'wall' | 'ground' | null = null
  hitWallThisMove = false
  pendingEffect: { effect: string; move: MoveData } | null = null
  pendingShot: MoveData | null = null
  cds: Record<string, number> = {}
  snare = 0
  frozen = 0
  dizzy = 0
  blind = 0
  bleed = 0
  slowT = 0
  floorY = 0
  /** 발판을 아래로 통과 중 (이 높이 이상의 발판 무시) */
  dropFrom = -1
  airDashesLeft = 0
  /** 모으는 기술 (누르고 있는 동안 늘어남) */
  charge = 0
  private holdBtn: keyof InputState | null = null
  team?: { partnerHp: number; canSwap: boolean; canAssist: boolean }
  /** 최근 입력 (커맨드 판정) */
  history: { t: Tok; f: number }[] = []
  /** 이번 기술 줄기에서 누른 버튼 순서 (A A B 같은 체인 판정) */
  chain: Button[] = []
  /** 마지막으로 나간 기술의 버튼 (캔슬 레벨용) */
  private lastBtn: Button | null = null
  private lastCmd = false
  private prev: InputState = emptyInput()
  private pressedAt: Partial<Record<keyof InputState, number>> = {}
  /** 버튼을 누른 순간의 방향 (선입력이 나중에 나가도 그때 방향으로) */
  private pressedDir: Partial<Record<keyof InputState, Pick<InputState, 'left' | 'right' | 'up' | 'down'>>> = {}
  private lastDir: { t: 'f' | 'b'; f: number } = { t: 'f', f: -99 }
  private running = false
  pendingEvents: { type: 'move'; move: MoveId }[] = []
  pendingJump = false
  pendingKnockdown = false
  pendingLand = false
  pendingDash: 'dash' | 'backstep' | 'airdash' | null = null
  juggles = 0

  readonly maxHp: number
  readonly dmgMul: number
  constructor(char: CharacterData, idx: number, x: number, opts: FighterOpts = {}) {
    // 배우는 기술을 복사해 넣으므로 자기만의 기술표 사본을 가짐
    this.char = char.trait === 'copy' ? { ...char, moves: { ...char.moves }, commands: [...char.commands] } : char
    this.trait = newTraitState(char.trait)
    this.idx = idx
    this.x = x
    this.facing = idx === 0 ? 1 : -1
    this.maxHp = Math.round(char.hp * (opts.hpMul ?? 1))
    this.dmgMul = (opts.dmgMul ?? 1) * (char.atk ?? 1)
    this.hp = this.maxHp
    this.airDashesLeft = char.airDashes
  }

  get grounded() { return this.y <= this.floorY + 0.01 && this.vy <= 0 }
  get inHitstun() { return this.state === 'hit' || this.state === 'knockback' || this.state === 'knockdown' }
  get neutral() { return ['idle', 'walk', 'run', 'dash', 'crouch', 'jump', 'fall', 'guard'].includes(this.state) && this.stun <= 0 }
  get airborne() { return !this.grounded }

  resetForRound(x: number) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0
    this.facing = this.idx === 0 ? 1 : -1
    this.hp = this.maxHp
    this.setState('idle')
    this.move = null; this.stun = 0; this.invuln = 0; this.combo = 0; this.chain = []; this.juggles = 0
    this.cds = {}; this.snare = 0; this.frozen = 0; this.dizzy = 0; this.blind = 0; this.bleed = 0; this.slowT = 0; this.floorY = 0
    this.history = []; this.charge = 0; this.airDashesLeft = this.char.airDashes
  }

  setState(s: FighterStateName) {
    if (this.state !== s) this.stateFrame = 0
    if (s === 'knockback' && this.state !== 'knockback') { this.wallBounced = false; this.groundBounced = false }
    this.state = s
  }

  hurtbox(): Rect {
    const low = this.state === 'crouch' || (this.state === 'guard' && this.crouchHeld) || (this.state === 'attack' && !!this.move?.low)
    const h = low ? this.char.hurt.crouchH : this.state === 'knockdown' ? 14 : this.char.hurt.h
    return { x: this.x - this.char.hurt.w / 2, y: this.y, w: this.char.hurt.w, h }
  }

  /** 지금 살아있는 공격 판정 */
  hitbox(): Rect | null {
    const m = this.move
    if (!m || this.state !== 'attack' || m.projectile) return null
    if (this.moveFrame < m.startup || this.moveFrame >= m.startup + m.active) return null
    const hb = m.hitbox
    if (hb.w <= 0) return null
    const x = this.facing === 1 ? this.x + hb.x : this.x - hb.x - hb.w
    return { x, y: this.y + hb.y, w: hb.w, h: hb.h }
  }

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

  // ───────────── 입력 기록 ─────────────
  private push(t: Tok) {
    this.history.push({ t, f: this.frame })
    if (this.history.length > 16) this.history.shift()
  }

  /** 새로 눌린 버튼·방향을 기록 */
  private record(inp: InputState, opp: Fighter) {
    const fwdKey = opp.x >= this.x ? 'right' : 'left'
    const backKey = fwdKey === 'right' ? 'left' : 'right'
    const edge = (k: keyof InputState) => inp[k] && !this.prev[k]
    if (edge(fwdKey)) this.push('f')
    if (edge(backKey)) this.push('b')
    if (edge('up')) this.push('u')
    if (edge('down')) this.push('d')
    for (const [k] of BTN_KEYS) if (edge(k)) { this.pressedAt[k] = this.frame; this.pressedDir[k] = { left: inp.left, right: inp.right, up: inp.up, down: inp.down } }
    for (const [k] of BTN_KEYS) { const at = this.pressedAt[k]; if (at != null && this.frame - at > BUFFER) delete this.pressedAt[k] }
    while (this.history.length && this.frame - this.history[0].f > CMD_TOTAL + 20) this.history.shift()
  }

  /** 지금 누른 버튼으로 끝나는 커맨드 찾기 (긴 것부터). 방향 토큰 사이 다른 방향은 건너뜀 */
  private findCommand(btn: Button): Command | null {
    const air = this.airborne
    const cmds = this.char.commands.filter((c) => c.seq[c.seq.length - 1] === btn).sort((a, b) => b.seq.length - a.seq.length)
    for (const c of cmds) {
      if (c.air && !air) continue
      if (c.ground && air) continue
      if (this.matches(c.seq)) return c
    }
    return null
  }

  private matches(seq: Tok[]): boolean {
    // 맨 끝(지금 누른 버튼)은 history에 막 들어간 상태
    let hi = this.history.length - 1
    let lastF = this.frame
    const startF = this.frame
    for (let si = seq.length - 1; si >= 0; si--) {
      const want = seq[si]
      let found = false
      while (hi >= 0) {
        const h = this.history[hi]
        hi--
        if (lastF - h.f > CMD_GAP || startF - h.f > CMD_TOTAL) return false
        if (h.t === want) { found = true; lastF = h.f; break }
        // 버튼은 건너뛸 수 없음 (체인 순서가 중요), 방향·동작은 다른 게 끼어 있어도 OK
        if (isButton(h.t) && isButton(want)) return false
      }
      if (!found) return false
    }
    return true
  }

  /** 체인(A A B 등)의 앞부분인지 → 헛쳐도 다음 버튼으로 이어 침 */
  private isChainPrefix(next: Button): boolean {
    const seq = [...this.chain, next]
    return this.char.commands.some((c) => c.seq.every((t) => isButton(t)) && c.seq.length > seq.length && seq.every((t, i) => c.seq[i] === t))
  }

  /** 버튼 + 지금 방향 → 기술 칸 (없으면 중립 칸으로) */
  slotFor(btn: Button, inp: InputState, opp: Fighter): MoveId | null {
    if (btn === 'R') return this.resolve('R')
    const fwd = opp.x >= this.x ? inp.right : inp.left
    const back = opp.x >= this.x ? inp.left : inp.right
    const tries: string[] = []
    if (this.airborne) { if (inp.down) tries.push(`${btn}_aird`); tries.push(`${btn}_air`) }
    else {
      if (this.state === 'dash' || this.state === 'run') tries.push(`${btn}_dash`)
      if (inp.up) tries.push(`${btn}_u`)
      if (inp.down) tries.push(`${btn}_d`)
      if (fwd) tries.push(`${btn}_f`)
      if (back) tries.push(`${btn}_b`)
    }
    tries.push(`${btn}_n`)
    for (const s of tries) { const id = this.resolve(s); if (id) return id }
    return null
  }

  /** 특성 모드 변형(렌즈·변신·배역·복사) 반영 */
  private resolve(slot: string): MoveId | null {
    const id = this.world ? this.world.remapMove(this, slot) : slot
    return this.char.moves[id] ? id : null
  }

  private affordable(id: MoveId | null): id is MoveId {
    const m = id ? this.char.moves[id] : null
    if (!m || (m.cost && this.meter < m.cost)) return false
    if ((this.cds[cdKey(m.id)] ?? 0) > 0) return false
    return !this.world || this.world.canUse(this, m)
  }

  /** 기술 발동 시도. 선입력된 버튼을 먼저 누른 순서로 */
  private tryStartMove(inp: InputState, opp: Fighter, cancel: boolean): boolean {
    const pressed = BTN_KEYS.filter(([k]) => this.pressedAt[k] != null).sort((a, b) => this.pressedAt[a[0]]! - this.pressedAt[b[0]]!)
    for (const [k, btn] of pressed) {
      // 버튼 토큰을 넣고 판정, 실패하면 되돌림 (선입력으로 남음)
      this.push(btn)
      // 지금 방향을 안 누르고 있으면 버튼을 누른 순간의 방향으로 칸을 고름
      const d = this.pressedDir[k]
      const dirInp = !inp.left && !inp.right && !inp.up && !inp.down && d ? { ...inp, ...d } : inp
      const pick = this.choose(btn, dirInp, opp, cancel)
      if (!pick) { this.history.pop(); continue }
      delete this.pressedAt[k]
      this.startMove(pick.id, btn, cancel, pick.cmd)
      if (this.char.moves[pick.id]?.hold) this.holdBtn = k
      return true
    }
    return false
  }

  private choose(btn: Button, inp: InputState, opp: Fighter, cancel: boolean): { id: MoveId; cmd: boolean } | null {
    const cmd = this.findCommand(btn)
    const cmdId = cmd ? this.resolve(cmd.move) : null
    const slot = this.slotFor(btn, inp, opp)
    if (!cancel) {
      if (this.affordable(cmdId)) return { id: cmdId, cmd: true }
      return this.affordable(slot) ? { id: slot, cmd: false } : null
    }
    // 캔슬: 맞혔으면(막혀도) 더 높은 레벨로, 헛쳤으면 판정이 끝난 뒤 체인 콤보만
    const m = this.move!
    const curLvl = m.lvl ?? (this.lastCmd ? 3 : LEVEL[this.lastBtn ?? 'A'])
    const whiffOk = this.moveFrame >= m.startup + m.active
    const lvlOf = (id: MoveId, isCmd: boolean) => this.char.moves[id]?.lvl ?? (isCmd ? 3 : LEVEL[btn])
    if (cmdId && this.affordable(cmdId)) {
      const chainCmd = cmd!.seq.every((t) => isButton(t))
      if (this.hitConfirmed && (lvlOf(cmdId, true) >= curLvl || chainCmd)) return { id: cmdId, cmd: true }
      if (whiffOk && chainCmd) return { id: cmdId, cmd: true }
    }
    if (slot && this.affordable(slot)) {
      const sameA = btn === 'A' && this.lastBtn === 'A' && this.chain.length < 3
      if (this.hitConfirmed && (lvlOf(slot, false) > curLvl || sameA)) return { id: slot, cmd: false }
      if ((this.hitConfirmed || whiffOk) && this.isChainPrefix(btn)) return { id: slot, cmd: false }
    }
    return null
  }

  private startMove(id: MoveId, btn: Button, isCancel: boolean, isCmd: boolean) {
    const m = this.char.moves[id]!
    if (m.cost) this.meter -= m.cost
    if (m.cd) this.cds[cdKey(m.id)] = m.cd
    this.chain = isCancel ? [...this.chain, btn] : [btn]
    this.lastBtn = btn
    this.lastCmd = isCmd
    this.move = this.world ? this.world.modifyMove(this, m) : m
    this.world?.onMoveStart(this, id)
    this.armorLeft = this.move.armor ?? 0
    // 궁극기: 발동 전까지 무적 (끊기지 않고 연출로 이어짐)
    if (m.ult) this.invuln = Math.max(this.invuln, m.startup + 2)
    this.hitWallThisMove = false
    this.moveFrame = 0
    this.hitsThisMove = 0
    this.hitConfirmed = false
    this.charge = 0
    this.holdBtn = null
    this.setState('attack')
    if (this.grounded) this.vx = 0
    if (m.lift) { this.vy = m.lift; this.y = Math.max(this.y, this.floorY + 0.01) }
    this.pendingEvents.push({ type: 'move', move: id })
  }

  /** 태그 모드 교대·어시스트, 훈련장: 조건 무시하고 기술 시작 */
  forceMove(id: MoveId) {
    if (!this.char.moves[id]) return false
    this.startMove(id, 'C', false, false)
    return true
  }

  /** 히트스톱 중에도 입력은 기억 (선입력) */
  observe(inp: InputState, opp: Fighter) {
    this.record(inp, opp)
    this.prev = { ...inp }
  }

  // ───────────── 한 프레임 ─────────────
  think(inp: InputState, opp: Fighter, canAct: boolean) {
    this.frame++
    this.stateFrame++
    for (const k in this.cds) if (this.cds[k] > 0) this.cds[k]--
    if (this.dizzy > 0) this.dizzy--
    if (this.snare > 0) this.snare--
    if (this.slowT > 0) this.slowT--
    if (this.frozen > 0) { this.frozen--; inp = emptyInput(); this.vx = 0 }
    if (!canAct) inp = emptyInput()
    const away = opp.x >= this.x ? inp.left : inp.right
    this.guardHeld = inp.guard || (away && !inp.up)
    this.crouchHeld = inp.down
    this.record(inp, opp)
    const dirNow = inp.right ? 1 : inp.left ? -1 : 0
    const speed = (this.world?.speedMul(this) ?? 1) * (this.slowT > 0 ? 0.6 : 1)
    if (this.invuln > 0) this.invuln--

    // 같은 방향 두 번 → 대시(앞) / 백스텝(뒤) / 공중 대시
    const fwdNow = opp.x >= this.x ? inp.right : inp.left
    const fwdPrev = opp.x >= this.x ? this.prev.right : this.prev.left
    const backNow = opp.x >= this.x ? inp.left : inp.right
    const backPrev = opp.x >= this.x ? this.prev.left : this.prev.right
    let doubleTap: 'f' | 'b' | null = null
    if (fwdNow && !fwdPrev) { if (this.lastDir.t === 'f' && this.frame - this.lastDir.f <= TAP) doubleTap = 'f'; this.lastDir = { t: 'f', f: this.frame } }
    if (backNow && !backPrev) { if (this.lastDir.t === 'b' && this.frame - this.lastDir.f <= TAP) doubleTap = 'b'; this.lastDir = { t: 'b', f: this.frame } }
    if (!fwdNow) this.running = false

    switch (this.state) {
      case 'victory': case 'defeat':
        this.vx *= 0.8
        break
      case 'hit':
        this.vx *= 0.88
        if (--this.stun <= 0) this.setState(this.grounded ? 'idle' : 'fall')
        break
      case 'knockback':
        // 바닥 튕김: 다시 떠올라 추가타 기회
        if (this.grounded && this.stateFrame > 3 && this.groundArm && !this.groundBounced) {
          this.groundBounced = true; this.groundArm = false
          this.vy = 5.2; this.y = this.floorY + 0.01; this.vx *= 0.6
          this.juggles = Math.max(0, this.juggles - 1)
          this.pendingBounce = 'ground'
          break
        }
        if (this.grounded && this.stateFrame > 3) { this.setState('knockdown'); this.stun = 30; this.vx = 0; this.invuln = 38; this.juggles = 0; this.pendingKnockdown = true }
        break
      case 'knockdown':
        this.vx *= 0.7
        if (--this.stun <= 0) this.setState('idle')
        break
      case 'guard':
        this.vx *= 0.8
        if (this.grounded && this.stun <= 0) this.facing = opp.x >= this.x ? 1 : -1
        if (this.stun > 0) { this.stun--; break }
        if (!this.guardHeld || !this.grounded || (!this.threat && !inp.guard)) this.setState('idle')
        else if (this.tryStartMove(inp, opp, false)) break
        break
      case 'dash':
        // 앞 대시: 순간 가속 후 계속 누르면 달리기
        this.vx = this.facing * this.char.runSpeed * 1.7 * speed * Math.max(0.6, 1 - this.stateFrame / 16)
        if (this.tryStartMove(inp, opp, false)) break
        if (this.stateFrame >= 12) { this.running = fwdNow; this.setState(fwdNow ? 'run' : 'idle'); if (!fwdNow) this.vx = 0 }
        break
      case 'backstep':
        this.vx = -this.facing * 4.4 * Math.max(0.2, 1 - this.stateFrame / 14)
        if (this.stateFrame >= 14) { this.setState('idle'); this.vx = 0 }
        break
      case 'airdash':
        this.vy = 0
        this.vx *= 0.97
        if (this.tryStartMove(inp, opp, false)) break
        if (this.stateFrame >= 12) this.setState('fall')
        break
      case 'attack': {
        const m = this.move!
        // 모으는 기술: 버튼을 누르고 있는 동안 발동 직전에서 멈추고 모음
        if (m.hold && this.holdBtn && inp[this.holdBtn] && this.moveFrame === m.startup - 1 && this.charge < m.hold.max) { this.charge++; this.vx *= 0.7; break }
        if (m.hold && this.moveFrame === m.startup - 1 && this.charge > 0 && this.holdBtn) { this.applyCharge(m); this.holdBtn = null }
        this.moveFrame++
        if (m.effect && this.moveFrame === m.startup) this.pendingEffect = { effect: m.effect, move: this.move! }
        if (m.projectile && this.moveFrame === m.startup) this.pendingShot = this.move!
        if (m.dash && this.moveFrame >= m.startup && this.moveFrame < m.startup + m.active) this.vx = this.facing * m.dash
        else if (this.grounded) this.vx *= 0.7
        if (this.moveFrame >= Math.min(m.startup, 4) && this.tryStartMove(inp, opp, true)) break
        if (this.moveFrame >= m.startup + m.active + m.recovery) { this.move = null; this.setState(this.grounded ? 'idle' : 'fall') }
        break
      }
      default: {
        if (this.grounded) {
          this.facing = opp.x >= this.x ? 1 : -1
          this.airDashesLeft = this.char.airDashes
          if (this.tryStartMove(inp, opp, false)) break
          if (this.guardHeld && (this.threat || inp.guard)) { this.setState('guard'); this.vx = 0; break }
          if (doubleTap === 'f' && this.snare <= 0) { this.setState('dash'); this.push('dash'); this.pendingDash = 'dash'; break }
          if (doubleTap === 'b' && this.snare <= 0) { this.setState('backstep'); this.invuln = Math.max(this.invuln, 7); this.push('bs'); this.pendingDash = 'backstep'; break }
          if (inp.up && this.snare <= 0) {
            this.vy = this.char.jumpV * (speed < 1 ? 0.92 : 1)
            this.vx = dirNow * this.char.airSpeed * Math.min(1.3, speed)
            this.y = this.floorY + 0.01
            this.setState('jump'); this.push('jump')
            this.pendingJump = true
            break
          }
          // 발판 위에서 ↓를 잠깐 누르고 있으면 아래로 내려감
          if (inp.down && this.floorY > 0 && this.state === 'crouch' && this.stateFrame > 8) { this.dropFrom = this.floorY; this.y -= 1; this.floorY = 0; this.vy = -0.5; this.setState('fall'); break }
          if (inp.down) { if (this.state !== 'crouch') this.setState('crouch'); this.vx = 0; break }
          if (dirNow && this.snare <= 0) {
            const back = dirNow !== this.facing
            if (!back && this.state === 'run') this.running = true
            const sp = (this.running && !back ? this.char.runSpeed : this.char.walkSpeed * (back ? 0.85 : 1)) * speed
            this.vx = dirNow * sp
            this.setState(this.running && !back ? 'run' : 'walk')
          } else { this.vx = 0; this.setState('idle') }
        } else {
          if (this.tryStartMove(inp, opp, false)) break
          if (doubleTap && this.airDashesLeft > 0) {
            this.airDashesLeft--
            this.vx = (doubleTap === 'f' ? this.facing : -this.facing) * 5.2
            this.vy = 0
            this.setState('airdash'); this.push('airdash'); this.pendingDash = 'airdash'
            break
          }
          // 공중 좌우 조금 조종
          if (dirNow) this.vx = Math.max(-this.char.airSpeed * 1.4, Math.min(this.char.airSpeed * 1.4, this.vx + dirNow * 0.12))
          this.setState(this.vy > 0 ? 'jump' : 'fall')
        }
      }
    }
    this.prev = { ...inp }
  }

  /** 모은 만큼 판정·피해를 키움 */
  private applyCharge(m: MoveData) {
    const h = m.hold!
    const c = this.charge
    const cur = this.move!
    this.move = { ...cur, hitbox: { ...cur.hitbox, w: cur.hitbox.w + c * h.reach }, damage: Math.round(cur.damage + c * h.dmg), kbX: cur.kbX + c * 0.05 }
  }

  /** 물리 이동 */
  physics() {
    const floor = this.floorY
    const wasAir = this.y > floor + 0.01
    this.x += this.vx
    if (this.state !== 'airdash' && (this.y > floor + 0.01 || this.vy > 0)) {
      this.vy -= this.char.gravity
      this.y += this.vy
      if (this.y <= floor) {
        this.y = floor; this.vy = 0
        if (wasAir) { this.pendingLand = true; this.dropFrom = -1 }
        if (this.state === 'jump' || this.state === 'fall') { this.setState('idle'); this.vx = 0 }
        // 공중 기술 중 착지 → 끝
        // 단, 내려꽂는 기술(급강하·바닥 튕김)은 착지해서 판정까지 마저 냄
        const m = this.move
        const dive = !!m && ((m.lift ?? 0) < 0 || !!m.groundBounce) && this.moveFrame < m.startup + m.active
        if (this.state === 'attack' && m?.air && !dive) { this.move = null; this.setState('idle'); this.vx = 0 }
        else if (dive) this.vx *= 0.3
      }
    } else if (this.state === 'airdash') this.y = Math.max(this.y, floor)
    const cx = Math.max(WALL, Math.min(STAGE_W - WALL, this.x))
    // 스테이지 끝 벽 튕김: 벽 튕김 기술이거나 아주 세게 날아오면 튕겨 나옴
    if (cx !== this.x && this.state === 'knockback' && !this.wallBounced && (this.wallArm || Math.abs(this.vx) > 5)) {
      this.wallBounced = true; this.wallArm = false
      this.vx = -this.vx * 0.55
      this.vy = Math.max(this.vy, 4.5); this.y = Math.max(this.y, this.floorY + 0.01)
      this.juggles = Math.max(0, this.juggles - 1)
      this.pendingBounce = 'wall'
    }
    this.x = cx
  }
}

const isButton = (t: Tok): t is Button => t === 'A' || t === 'B' || t === 'C' || t === 'D' || t === 'R'
