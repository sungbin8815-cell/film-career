// 한 명의 파이터: 상태 머신 + 물리. Phaser 없음.
import type { Btn, CharacterData, FighterStateName, InputState, MoveData, MoveId, Rect } from './types'
import { emptyInput, STAGE_W } from './types'
import { newTraitState, cdKey, type TraitWorld } from './Traits'

export const METER_MAX = 100
const BUFFER = 8          // 입력 선입력 허용 프레임
const ATTACK_KEYS = ['light', 'heavy', 'special', 'super', 'skill2'] as const
const RUN_TAP = 12        // 같은 방향 두 번 누르기 간격
export const WALL = 14    // 화면 끝 여백

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
  combo = 0            // 내가 넣고 있는 콤보 수
  lightChain = 0
  guardHeld = false
  crouchHeld = false
  /** 다가오는 공격이 있는지 (Match가 매 프레임 채움) → 뒤로 누르면 걷지 않고 방어 자세 */
  threat = false
  hitConfirmed = false
  private prev: InputState = emptyInput()
  private pressedAt: Partial<Record<keyof InputState, number>> = {}
  private lastTap: { dir: number; frame: number } = { dir: 0, frame: -99 }
  private running = false
  frame = 0
  /** 직업 특성 상태 + 공유 세계 (Match가 연결) */
  trait = newTraitState()
  world?: TraitWorld
  armorLeft = 0
  wallBounced = false
  hitWallThisMove = false
  /** 이번 프레임에 발동할 스킬 효과 */
  pendingEffect: { effect: string; move: MoveData } | null = null
  /** 이번 프레임에 쏠 투사체 (기술의 판정 프레임에 나감) */
  pendingShot: MoveData | null = null
  /** 스킬 쿨타임 (Q=special1, W=special2, E=trait) */
  cds: Record<string, number> = {}
  snare = 0     // 연출 콘티에 묶임 (못 움직임)
  frozen = 0    // 리테이크로 멈춤
  dizzy = 0     // 조명 노출로 기절 (별 표시)
  blind = 0     // 분장 파우더 (판정 작아짐)
  floorY = 0    // 발밑 높이 (애플박스 위면 > 0)
  /** 태그 모드 정보 (Match가 매 프레임 채움, AI가 참고) */
  team?: { partnerHp: number; canSwap: boolean; canAssist: boolean }

  readonly maxHp: number
  readonly dmgMul: number
  constructor(char: CharacterData, idx: number, x: number, opts: FighterOpts = {}) {
    // 배우는 기술을 복사해 넣으므로 자기만의 기술표 사본을 가짐
    this.char = char.trait === 'copy' ? { ...char, moves: { ...char.moves } } : char
    this.trait = newTraitState(char.trait)
    this.idx = idx
    this.x = x
    this.facing = idx === 0 ? 1 : -1
    this.maxHp = Math.round(char.hp * (opts.hpMul ?? 1))
    this.dmgMul = (opts.dmgMul ?? 1) * (char.atk ?? 1)
    this.hp = this.maxHp
  }

  get grounded() { return this.y <= this.floorY + 0.01 && this.vy <= 0 }
  get isActing() { return this.state === 'attack' }
  get inHitstun() { return this.state === 'hit' || this.state === 'knockback' || this.state === 'knockdown' }
  get neutral() { return ['idle', 'walk', 'run', 'crouch', 'jump', 'fall', 'guard'].includes(this.state) && this.stun <= 0 }

  resetForRound(x: number) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0
    this.facing = this.idx === 0 ? 1 : -1
    this.hp = this.maxHp
    this.setState('idle')
    this.move = null; this.stun = 0; this.invuln = 0; this.combo = 0; this.lightChain = 0; this.chainBtns = []; this.juggles = 0
    this.cds = {}; this.snare = 0; this.frozen = 0; this.dizzy = 0; this.blind = 0; this.floorY = 0
  }

  setState(s: FighterStateName) {
    if (this.state !== s) this.stateFrame = 0
    if (s === 'knockback' && this.state !== 'knockback') this.wallBounced = false
    this.state = s
  }

  /** 맞을 수 있는 몸통 박스 (월드 좌표, y는 지면 기준) */
  hurtbox(): Rect {
    const h = this.state === 'crouch' || (this.state === 'guard' && this.crouchHeld) || (this.state === 'attack' && !!this.move?.low)
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

  /** 새로 눌린 공격 버튼을 매 프레임 기록 (기술 중·히트스톱 중에도) */
  private record(inp: InputState) {
    for (const k of ATTACK_KEYS) if (inp[k] && !this.prev[k]) this.pressedAt[k] = this.frame
    for (const k of ATTACK_KEYS) { const at = this.pressedAt[k]; if (at != null && this.frame - at > BUFFER) delete this.pressedAt[k] }
    if (inp.trait && !this.prev.trait) this.pressedAt.trait = this.frame
    if (this.pressedAt.trait != null && this.frame - this.pressedAt.trait > BUFFER) delete this.pressedAt.trait
  }

  /** 고유 버튼: 서 있을 때만. 특성마다 낼 기술(trait / trait2)이 다름 */
  private tryTrait(): boolean {
    if (this.pressedAt.trait == null || !this.world || !this.grounded) return false
    const id = this.world.traitMove(this)
    if (!id || !this.affordable(id)) return false
    delete this.pressedAt.trait
    this.startMove(id, 'L', false)
    this.chainBtns = []
    return true
  }

  /** 선입력된 공격 버튼들 → 버튼 토큰, 먼저 누른 순 (L H S X, ↓와 같이면 dL dH dS) */
  private bufferedBtns(inp: InputState): { k: (typeof ATTACK_KEYS)[number]; b: Btn }[] {
    const d = inp.down ? 'd' : ''
    const tok = { light: 'L', heavy: 'H', special: 'S', super: 'X', skill2: 'dS' } as const
    return ATTACK_KEYS.filter((k) => this.pressedAt[k] != null)
      .sort((a, b) => this.pressedAt[a]! - this.pressedAt[b]!)
      .map((k) => ({ k, b: (k === 'super' || k === 'skill2' ? tok[k] : d + tok[k]) as Btn }))
  }

  /** 버튼 → 기본 기술 (↓+특 = special2, ↓만 다르게 정의된 기술이 있으면 그것) */
  private baseMove(b: Btn): MoveId {
    // 공중에서 약·강 = 점프 공격 (서서 막아야 하는 중단)
    if (!this.grounded && (b === 'L' || b === 'dL') && this.char.moves.jl) return 'jl'
    if (!this.grounded && (b === 'H' || b === 'dH') && this.char.moves.jh) return 'jh'
    const map: Record<Btn, MoveId> = { L: 'light', H: 'heavy', S: 'special1', X: 'super', dL: 'light', dH: 'heavy', dS: 'special2' }
    return this.world ? this.world.remapMove(this, map[b]) : map[b]
  }

  /** 커맨드 콤보 찾기: 지금까지 이어 친 버튼 + 이번 버튼 (정확히 같은 순서) */
  private findCombo(seq: Btn[]): MoveId | null {
    for (const c of this.char.combos) {
      if (c.seq.length === seq.length && c.seq.every((t, i) => t === seq[i])) return c.move
    }
    return null
  }

  private isComboPrefix(seq: Btn[]) {
    return this.char.combos.some((c) => c.seq.length > seq.length && seq.every((t, i) => c.seq[i] === t))
  }

  private affordable(id: MoveId | null): id is MoveId {
    const m = id ? this.char.moves[id] : null
    if (!m || (m.cost && this.meter < m.cost)) return false
    if ((this.cds[cdKey(m.id)] ?? 0) > 0) return false
    return !this.world || this.world.canUse(this, m)
  }

  /** 기술 발동 시도. cancel = 이전 기술 경직을 끊고 잇는 중.
   *  선입력된 버튼을 먼저 누른 순서로 시도하고, 못 쓰는 버튼은 건너뜀(버퍼에 남아 있다가 만료) */
  private tryStartMove(inp: InputState, opts: { cancel?: boolean } = {}): boolean {
    for (const { k, b } of this.bufferedBtns(inp)) {
      const id = this.chooseMove(b, !!opts.cancel)
      if (!id) continue
      delete this.pressedAt[k]
      this.startMove(id, b, !!opts.cancel)
      return true
    }
    return false
  }

  private chooseMove(b: Btn, cancel: boolean): MoveId | null {
    const single = (): MoveId => (b.startsWith('d') && this.grounded ? this.findCombo([b]) : null) ?? this.baseMove(b)
    if (!cancel) {
      const id = single()
      if (this.affordable(id)) return id
      return this.affordable(this.baseMove(b)) ? this.baseMove(b) : null
    }
    const m = this.move!
    // 맞혔으면 바로, 빗나갔으면 판정이 끝난 뒤에만 이어 침 (판정 검사 전에 끊기지 않게)
    const whiffOk = this.moveFrame >= m.startup + m.active
    const seq = [...this.chainBtns, b]
    // 1) 커맨드 콤보
    const c = this.findCombo(seq)
    if ((this.hitConfirmed || whiffOk) && this.affordable(c)) return c
    // 2) 일반 캔슬: 맞혔을 때만 cancelInto 목록으로
    const base = single()
    const okCancel = this.hitConfirmed && ((m.cancelInto ?? []).includes(base) || (m.cancelInto ?? []).includes(cdKey(base))) && !(base === 'light' && this.lightChain >= (this.world?.maxLightChain(this) ?? 2))
    // 3) 콤보 앞부분(예: 약 약 강의 '약 약')이면 빗나가도 이어 침
    const prefix = (this.hitConfirmed || whiffOk) && this.isComboPrefix(seq)
    return (okCancel || prefix) && this.affordable(base) ? base : null
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
    if (m.cd) this.cds[cdKey(m.id)] = m.cd
    this.move = this.world ? this.world.modifyMove(this, m) : m
    this.world?.onMoveStart(this, id)
    this.armorLeft = this.move.armor ?? 0
    this.hitWallThisMove = false
    this.moveFrame = 0
    this.hitsThisMove = 0
    this.hitConfirmed = false
    this.setState('attack')
    if (this.grounded) this.vx = 0
    this.pendingEvents.push({ type: 'move', move: id })
  }

  /** 태그 모드: 교대해 들어오며 공격 / 어시스트 기술 (쿨타임·조건 무시) */
  forceMove(id: MoveId) {
    if (!this.char.moves[id]) return false
    this.startMove(id, 'L', false)
    return true
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
    for (const k in this.cds) if (this.cds[k] > 0) this.cds[k]--
    if (this.dizzy > 0) this.dizzy--
    if (this.snare > 0) this.snare--
    // 리테이크로 멈춤: 아무것도 못 함
    if (this.frozen > 0) { this.frozen--; inp = emptyInput(); this.vx = 0 }
    if (!canAct) inp = emptyInput()
    // 자동 방어: 상대 반대쪽 방향키를 누르고 있으면 막음 (↓까지 같이 누르면 앉아 막기)
    const away = opp.x >= this.x ? inp.left : inp.right
    this.guardHeld = inp.guard || (away && !inp.up)
    this.crouchHeld = inp.down
    this.record(inp)
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
        if (!this.guardHeld || !this.grounded || (!this.threat && !inp.guard)) this.setState('idle')
        else if (this.tryStartMove(inp) || this.tryTrait()) break
        break
      case 'attack': {
        const m = this.move!
        this.moveFrame++
        if (m.effect && this.moveFrame === m.startup) this.pendingEffect = { effect: m.effect, move: m }
        if (m.projectile && this.moveFrame === m.startup) this.pendingShot = m
        if (m.dash && this.moveFrame >= m.startup && this.moveFrame < m.startup + m.active) this.vx = this.facing * m.dash
        else if (this.grounded) this.vx *= 0.7
        // 콤보 잇기: 판정이 나온 뒤부터 (맞히면 일반 캔슬, 커맨드 콤보는 빗나가도 OK)
        if (this.moveFrame >= m.startup && (this.tryStartMove(inp, { cancel: true }) || (this.hitConfirmed && (m.cancelInto ?? []).includes('trait') && this.tryTrait()))) break
        if (this.moveFrame >= m.startup + m.active + m.recovery) { this.move = null; this.setState(this.grounded ? 'idle' : 'fall') }
        break
      }
      default: {
        // 자유 상태: idle walk run crouch jump fall
        if (this.grounded) {
          this.facing = opp.x >= this.x ? 1 : -1
          if (this.tryStartMove(inp)) break
          if (this.tryTrait()) break
          if (this.guardHeld && (this.threat || inp.guard)) { this.setState('guard'); this.vx = 0; break }
          if (inp.up && this.snare <= 0) {
            this.vy = this.char.jumpV
            this.vx = dirNow * this.char.airSpeed
            this.y = this.floorY + 0.01
            this.setState('jump')
            this.pendingJump = true
            break
          }
          if (inp.down) { this.setState('crouch'); this.vx = 0; break }
          if (dirNow && this.snare <= 0) {
            const back = dirNow !== this.facing
            const sp = (this.running && !back ? this.char.runSpeed : this.char.walkSpeed * (back ? 0.85 : 1)) * (this.world?.speedMul(this) ?? 1)
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
    const floor = this.floorY
    const wasAir = this.y > floor + 0.01
    this.x += this.vx
    if (this.y > floor + 0.01 || this.vy > 0) {
      this.vy -= this.char.gravity
      this.y += this.vy
      if (this.y <= floor) {
        this.y = floor; this.vy = 0
        if (wasAir) this.pendingLand = true
        if (this.state === 'jump' || this.state === 'fall') { this.setState('idle'); this.vx = 0 }
        // 점프 공격 중 착지 → 짧은 착지 경직 후 끝
        if (this.state === 'attack' && this.move && (this.move.id === 'jl' || this.move.id === 'jh')) { this.move = null; this.setState('idle'); this.vx = 0; this.stun = 0 }
      }
    }
    this.x = Math.max(WALL, Math.min(STAGE_W - WALL, this.x))
  }
}
