// 경기 진행: 라운드, 타이머, 충돌 판정, 피격·가드, 히트스톱, 투사체.
// 화면은 이 객체의 상태를 읽어 그리고, events로 효과를 냅니다.
import { Fighter, METER_MAX, type FighterOpts } from './Fighter'
import type { CharacterData, InputState, MatchEvent, MoveData, ProjectileSpec, Rect } from './types'
import { FPS, STAGE_W } from './types'
import { TraitWorld } from './Traits'

export const ROUND_TIME = 60      // 초 (태그 모드는 99초 한 판)
export const ROUNDS_TO_WIN = 2
export const SWAP_CD = 300        // 태그 교체 쿨타임 (5초)
export const ASSIST_CD = 420      // 어시스트 쿨타임 (7초)

/** 태그 모드 팀: 2명 중 1명이 싸우고, 1명은 대기(체력 회복·어시스트) */
export interface Team { members: Fighter[]; active: number; swapCd: number; assistCd: number; assist: Fighter | null; pendingIn: number; prevSwap: boolean; prevAssist: boolean }
const START_X = [STAGE_W / 2 - 70, STAGE_W / 2 + 70]

export type Phase = 'intro' | 'fight' | 'ko' | 'roundEnd' | 'matchOver'

export interface Projectile extends ProjectileSpec {
  owner: number
  name: string
  x: number
  y: number
  age: number
  dead: boolean
  /** 관통 투사체: 맞힌 횟수, 다음 판정까지 남은 프레임 */
  hits: number
  hitCd: number
}

export const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

const emptyAssistInput: InputState = { left: false, right: false, up: false, down: false, light: false, heavy: false, special: false, guard: false, super: false, trait: false, swap: false, assist: false }

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
  world: TraitWorld
  /** 떠 있는 발판 (스테이지별) */
  platforms: { x: number; y: number; w: number }[] = []

  teams: [Team, Team]
  readonly tag: boolean
  readonly roundsToWin: number

  /** p1·p2: 캐릭터 1명(1대1) 또는 2명 배열(태그). opts: 스테이지 모드 직급 배율 */
  constructor(p1: CharacterData | CharacterData[], p2: CharacterData | CharacterData[], opts: [FighterOpts?, FighterOpts?] = []) {
    const list = (p: CharacterData | CharacterData[]) => (Array.isArray(p) ? p : [p])
    const mk = (cs: CharacterData[], i: number): Team => ({ members: cs.map((c) => new Fighter(c, i, START_X[i], opts[i])), active: 0, swapCd: 0, assistCd: 0, assist: null, pendingIn: 0, prevSwap: false, prevAssist: false })
    this.teams = [mk(list(p1), 0), mk(list(p2), 1)]
    this.tag = this.teams[0].members.length > 1 || this.teams[1].members.length > 1
    this.roundsToWin = this.tag ? 1 : ROUNDS_TO_WIN
    if (this.tag) this.timer = 99 * FPS
    this.fighters = [this.teams[0].members[0], this.teams[1].members[0]]
    this.world = new TraitWorld(this)
    for (const t of this.teams) for (const f of t.members) { f.world = this.world; if (f !== t.members[t.active]) f.x = -200 }
    this.events.push({ type: 'round', round: 1 })
  }

  // ───────────── 태그 모드 ─────────────
  private partner(t: Team) { return t.members.find((m, i) => i !== t.active) ?? null }

  /** 교체: 대기 캐릭터가 위에서 뛰어들어옴. 내 공격이 맞은 중이면 들어오며 점프 공격(태그 콤보) */
  private doSwap(i: number, forced = false) {
    const t = this.teams[i]
    const cur = this.fighters[i], next = this.partner(t)
    if (!next || next.hp <= 0) return
    const opp = this.fighters[1 - i]
    const tagCombo = !forced && cur.state === 'attack' && cur.hitConfirmed
    next.x = Math.max(20, Math.min(STAGE_W - 20, cur.x - cur.facing * 8)); next.y = 46; next.vx = 0; next.vy = 0.5
    next.facing = opp.x >= next.x ? 1 : -1
    next.setState('fall'); next.move = null; next.stun = 0; next.invuln = 14; next.combo = cur.combo
    next.floorY = 0
    cur.x = -200; cur.vx = 0; cur.vy = 0; cur.y = 0; cur.move = null; if (cur.hp > 0) cur.setState('idle')
    t.active = t.members.indexOf(next)
    this.fighters[i] = next
    if (tagCombo) next.forceMove('B_air')
    t.swapCd = SWAP_CD
    this.events.push({ type: 'tag', team: i, kind: forced ? 'in' : 'swap', name: next.char.name })
  }

  /** 어시스트: 대기 캐릭터가 뒤에서 나와 스킬 하나만 쓰고 퇴장 (무적) */
  private doAssist(i: number) {
    const t = this.teams[i]
    const cur = this.fighters[i], p = this.partner(t)
    if (!p || p.hp <= 0 || t.assist) return
    const opp = this.fighters[1 - i]
    p.x = Math.max(20, Math.min(STAGE_W - 20, cur.x - cur.facing * 26)); p.y = 0; p.vx = 0; p.vy = 0
    p.facing = opp.x >= p.x ? 1 : -1
    p.setState('idle'); p.invuln = 999; p.floorY = 0
    const id = this.world.remapMove(p, p.char.assist ?? 'C_n')
    const mv = p.char.moves[id]
    if (!(mv && this.world.canUse(p, mv) && p.forceMove(id))) p.forceMove('B_n')
    t.assist = p; t.assistCd = ASSIST_CD
    this.events.push({ type: 'tag', team: i, kind: 'assist', name: p.char.name })
  }

  /** 매 프레임: 교체·어시스트 입력, 대기 캐릭터 체력 회복, 어시스트 진행, 쓰러진 뒤 교대 */
  private updateTeams(inputs: [InputState, InputState]) {
    this.teams.forEach((t, i) => {
      if (t.swapCd > 0) t.swapCd--
      if (t.assistCd > 0) t.assistCd--
      const cur = this.fighters[i], p = this.partner(t)
      for (const m of t.members) if (m !== cur && m !== t.assist && m.hp > 0 && m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + 0.12)
      cur.team = p ? { partnerHp: p.hp / p.maxHp, canSwap: t.swapCd <= 0 && p.hp > 0, canAssist: t.assistCd <= 0 && p.hp > 0 && !t.assist } : undefined
      if (t.pendingIn > 0 && --t.pendingIn === 0) this.doSwap(i, true)
      if (!this.tag || this.phase !== 'fight' || !p || p.hp <= 0) { t.prevSwap = inputs[i].swap; t.prevAssist = inputs[i].assist; return }
      const free = cur.neutral || (cur.state === 'attack' && cur.hitConfirmed)
      if (inputs[i].swap && !t.prevSwap && t.swapCd <= 0 && free && !t.assist && cur.hp > 0) this.doSwap(i)
      if (inputs[i].assist && !t.prevAssist && t.assistCd <= 0 && !t.assist && cur.hp > 0) this.doAssist(i)
      t.prevSwap = inputs[i].swap; t.prevAssist = inputs[i].assist
    })
  }

  /** 어시스트 캐릭터 한 프레임 (자기 기술만 진행, 끝나면 퇴장) */
  private stepAssists() {
    this.teams.forEach((t, i) => {
      const p = t.assist
      if (!p) return
      const opp = this.fighters[1 - i]
      p.think(emptyAssistInput, opp, true)
      for (const e of p.pendingEvents) {
        const m = p.char.moves[e.move]!
        this.events.push({ type: 'move', fighter: i, move: e.move, name: m.name, combo: false, voice: m.voice, sfx: m.sfx })
      }
      p.pendingEvents = []
      if (p.pendingShot) { this.spawnProjectile(p, p.pendingShot.projectile!, p.pendingShot.name); p.pendingShot = null }
      if (p.pendingEffect) { this.world.activate(p, p.pendingEffect.effect, p.pendingEffect.move); p.pendingEffect = null }
      p.floorY = 0
      p.physics()
      if (this.phase === 'fight') this.checkHit(p, opp)
      if (p.state !== 'attack') { t.assist = null; p.x = -200; p.invuln = 0; p.setState('idle') }
    })
  }

  /** 위치 기록 (연출 리테이크: 2초 전 자리) */
  private hist: { x: number; y: number }[][] = [[], []]
  posAgo(idx: number, frames: number) {
    const h = this.hist[idx]
    return h[Math.max(0, h.length - 1 - frames)] ?? { x: this.fighters[idx].x, y: 0 }
  }

  get timeLeft() { return Math.ceil(this.timer / FPS) }

  /** 한 프레임 진행. inputs[0] = 1P, inputs[1] = 2P(AI 또는 상대) */
  step(inputs: [InputState, InputState]): MatchEvent[] {
    this.events = []
    this.frame++
    this.phaseFrame++
    if (this.hitstop > 0) {
      this.hitstop--
      this.fighters[0].observe(inputs[0], this.fighters[1]); this.fighters[1].observe(inputs[1], this.fighters[0])
      return this.events
    }

    const canAct = this.phase === 'fight'
    if (this.phase === 'intro' && this.phaseFrame === 70) this.events.push({ type: 'fight' })
    if (this.phase === 'intro' && this.phaseFrame >= 80) this.setPhase('fight')

    this.updateTeams(inputs)
    const [a, b] = this.fighters
    this.updateThreat()
    a.think(inputs[0], b, canAct)
    b.think(inputs[1], a, canAct)
    for (const f of this.fighters) {
      for (const e of f.pendingEvents) {
        const m = f.char.moves[e.move]!
        this.events.push({ type: 'move', fighter: f.idx, move: e.move, name: m.name, combo: !!m.combo, voice: m.voice, sfx: m.sfx, afterimage: m.afterimage })
        if (m.ult) { this.events.push({ type: 'super', fighter: f.idx }); this.hitstop = 24 }
      }
      f.pendingEvents = []
      // 투사체는 판정 프레임에 (수정된 기술 기준: 렌즈·크리티컬 등 반영)
      if (f.pendingShot) { this.spawnProjectile(f, f.pendingShot.projectile!, f.pendingShot.name); f.pendingShot = null }
      if (f.pendingEffect) { this.world.activate(f, f.pendingEffect.effect, f.pendingEffect.move); f.pendingEffect = null }
    }
    const prevX: [number, number] = [a.x, b.x]
    for (const f of this.fighters) f.floorY = this.world.floorAt(f)
    a.physics(); b.physics()
    for (const [i, f] of this.fighters.entries()) { this.hist[i].push({ x: f.x, y: f.y }); if (this.hist[i].length > 180) this.hist[i].shift() }
    this.world.physics(prevX)
    for (const f of this.fighters) {
      if (f.pendingJump) { this.events.push({ type: 'jump', fighter: f.idx }); f.pendingJump = false }
      if (f.pendingLand) { this.events.push({ type: 'land', fighter: f.idx }); f.pendingLand = false }
      if (f.pendingKnockdown) { this.events.push({ type: 'knockdown', fighter: f.idx }); f.pendingKnockdown = false }
      if (f.pendingBounce) { this.events.push({ type: 'bounce', fighter: f.idx, kind: f.pendingBounce, x: f.x, y: f.y }); f.pendingBounce = null; this.hitstop = Math.max(this.hitstop, 6) }
      if (f.pendingDash) { this.events.push({ type: 'dash', fighter: f.idx, kind: f.pendingDash }); f.pendingDash = null }
    }
    this.pushApart(a, b)
    this.stepAssists()

    if (this.phase === 'fight') {
      this.checkHit(a, b)
      this.checkHit(b, a)
      this.updateProjectiles()
      this.world.tick()
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
    // 배우 스턴트 구르기 중에는 상대를 통과
    const rolling = (f: Fighter) => f.state === 'attack' && f.move?.effect === 'roll' && f.moveFrame < f.move.startup + f.move.active
    if (rolling(a) || rolling(b)) return
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

  /** 방어 판정: 뒤로 누르고 있어야 하고, 하단은 앉아서, 점프 공격(중단)은 서서 */
  private isBlocking(def: Fighter, fromX: number, d?: { low?: boolean; overhead?: boolean }) {
    if (!def.guardHeld || !def.grounded) return false
    if (def.state === 'attack' || def.inHitstun) return false
    if (d?.low && !def.crouchHeld) return false
    if (d?.overhead && def.crouchHeld) return false
    const towardAttacker = fromX >= def.x ? 1 : -1
    return def.facing === towardAttacker || def.state === 'guard'
  }

  /** 뒤로 누르고 있을 때 걷지 않고 방어 자세를 잡을지: 상대가 공격 중이거나 투사체가 다가올 때 */
  private updateThreat() {
    for (const f of this.fighters) {
      const o = this.fighters[1 - f.idx]
      let t = o.state === 'attack' && Math.abs(o.x - f.x) < 130
      for (const p of this.projectiles) if (p.owner !== f.idx && Math.abs(p.x - f.x) < 110 && Math.sign(f.x - p.x) === Math.sign(p.vx || 1)) t = true
      f.threat = t
    }
  }

  private checkHit(att: Fighter, def: Fighter) {
    const hb = att.hitbox()
    if (hb && hb.w > 0 && att.moveFrame === att.move!.startup) this.world.hitWalls(att, hb)
    if (!hb || !att.canHitNow() || def.invuln > 0 || def.state === 'defeat' || def.hp <= 0) return
    if (!this.canJuggle(def, !!att.move?.juggle)) return
    if (!overlap(hb, def.hurtbox())) {
      return
    }
    att.hitsThisMove++
    this.resolve(att, def, att.move!, att.x)
  }

  /** 맞음 또는 막음 처리 (기술·투사체 공용) */
  /** 특성에서 쓰는 직접 타격 (분장 완성 등) */
  hitDirect(att: Fighter, def: Fighter, d: Partial<MoveData> & Pick<MoveData, 'damage' | 'hitstun' | 'kbX' | 'name'>, opts: { unblockable?: boolean; fromX?: number } = {}) {
    if (this.phase !== 'fight' || def.invuln > 0 || def.hp <= 0) return
    this.resolve(att, def, { chip: 0, blockstun: 0, meterGain: 8, ...d, id: 'trait' }, opts.fromX ?? att.x, opts.unblockable)
  }

  private resolve(att: Fighter, def: Fighter, d: Pick<MoveData, 'damage' | 'chip' | 'hitstun' | 'blockstun' | 'kbX' | 'kbY' | 'meterGain' | 'name'> & Partial<Pick<MoveData, 'finisher' | 'lastHitKbY' | 'multiHit' | 'low' | 'overhead' | 'expose' | 'pull' | 'crit' | 'sfx' | 'wallBounce' | 'groundBounce'>> & { id?: string; blind?: number }, fromX: number, unblockable = false) {
    const dir = def.x >= fromX ? 1 : -1
    const hx = (att.x + def.x) / 2
    const hy = def.y + 34
    att.hitConfirmed = true
    // 받아치기(연출 NG!)·노이즈 월(사운드)
    const ic = unblockable ? null : this.world.intercept(att, def)
    if (ic === 'parried') { this.hitstop = 14; return }
    if (ic === 'walled' || (!unblockable && this.isBlocking(def, fromX, d))) {
      const chip = ic === 'walled' ? 0 : d.chip
      this.world.onDamaged(def, chip, true)
      this.world.onHit(att, def, d, chip, true)
      def.hp = Math.max(1, def.hp - chip)
      def.setState('guard')
      def.stun = d.blockstun
      def.vx = dir * d.kbX * 0.7
      def.meter = Math.min(METER_MAX, def.meter + 3)
      att.meter = Math.min(METER_MAX, att.meter + Math.round(d.meterGain / 2))
      this.hitstop = 5
      this.events.push({ type: 'block', x: hx, y: hy, attacker: att.idx })
      return
    }
    // 카운터: 상대가 기술을 내는 도중(판정 나오기 전)에 맞히면 더 아프고 더 오래 굳음
    const counter = def.state === 'attack' && !!def.move && def.moveFrame < def.move.startup
    const scale = Math.max(0.4, Math.pow(0.88, att.combo)) * (counter ? 1.25 : 1) * (d.id ? att.dmgMul : 1)
    const dmg = this.world.absorb(def, Math.max(1, Math.round(d.damage * scale)))
    def.hp = Math.max(0, def.hp - dmg)
    this.world.onDamaged(def, dmg, false)
    this.world.onHit(att, def, d, dmg, false)
    // 슈퍼아머(조명 특성): 피해는 받지만 기술이 끊기지 않음
    if (def.state === 'attack' && def.armorLeft > 0 && def.hp > 0 && !d.kbY) {
      def.armorLeft--
      att.combo++
      this.hitstop = 7
      this.events.push({ type: 'armor', fighter: def.idx, x: hx, y: hy })
      this.events.push({ type: 'hit', x: hx, y: hy, attacker: att.idx, damage: dmg, combo: att.combo, heavy: false, finisher: false, launch: false, counter: false, moveName: d.name })
      return
    }
    att.combo++
    att.meter = Math.min(METER_MAX, att.meter + d.meterGain)
    def.meter = Math.min(METER_MAX, def.meter + Math.round(dmg / 18))
    def.move = null
    const lastOfMulti = !!d.multiHit && att.hitsThisMove >= d.multiHit.max
    const kbY = d.kbY ?? (lastOfMulti ? d.lastHitKbY : undefined)
    // 바닥 튕김 기술(내려찍기)은 서 있는 상대도 바닥에 꽂아 튀어 오르게 함
    const spike = !!d.groundBounce && def.grounded
    const launch = !!kbY || !def.grounded || def.hp <= 0 || spike
    if (!def.grounded) def.juggles++
    def.wallArm = !!d.wallBounce
    def.groundArm = !!d.groundBounce
    if (launch) {
      def.setState('knockback')
      def.vy = spike && !kbY ? 1.5 : kbY ?? 3
      def.y = Math.max(def.y, def.floorY + 0.01)
      def.vx = dir * Math.max(1.5, d.kbX)
    } else {
      def.setState('hit')
      def.stun = Math.max(def.stun, d.hitstun + (counter ? 8 : 0))
      // 끌어오기(줌인·백라이트): 내 쪽으로
      def.vx = (d.pull ? -Math.sign(def.x - att.x) || -dir : dir) * d.kbX
    }
    const heavy = d.damage >= 80 || !!kbY
    const finisher = !!d.finisher && (!d.multiHit || lastOfMulti)
    // 히트스톱은 기술 무게(피해)에 비례
    this.hitstop = Math.round(Math.min(16, 4 + d.damage / 11)) + (finisher ? 4 : 0) + (counter ? 5 : 0) + (d.crit ? 8 : 0)
    this.events.push({ type: 'hit', x: hx, y: hy, attacker: att.idx, damage: dmg, combo: att.combo, heavy: heavy || !!d.crit, finisher: finisher || !!d.crit, launch, counter, crit: !!d.crit, moveName: d.name, sfx: d.sfx })
    if (def.hp <= 0) this.ko(att.idx)
  }

  spawnProjectile(f: Fighter, p: ProjectileSpec, name: string) {
    const d = f.dmgMul
    const o = this.fighters[1 - f.idx]
    const x = p.atTarget ? o.x + f.facing * p.offsetX : f.x + f.facing * p.offsetX
    const y = p.atTarget ? o.y + p.startY : p.startY
    this.projectiles.push({ ...p, damage: Math.round(p.damage * d), chip: Math.round(p.chip * d), name, owner: f.idx, x, y, age: 0, dead: false, vx: p.vx * f.facing, hits: 0, hitCd: 0 })
  }

  /** 지정 위치에서 투사체 생성 (세트 파편·머리 위 낙하 등) */
  spawnAt(owner: number, x: number, y: number, p: ProjectileSpec, name: string) {
    const f = this.fighters[owner]
    const d = f.dmgMul
    this.projectiles.push({ ...p, damage: Math.round(p.damage * d), chip: Math.round(p.chip * d), name, owner, x, y, age: 0, dead: false, hits: 0, hitCd: 0 })
  }

  private updateProjectiles() {
    for (const p of this.projectiles) {
      p.age++
      p.x += p.vx
      if (p.gy) p.vy -= p.gy
      p.y = Math.max(0, p.y + p.vy)
      // 조명 낙하는 바닥에 쓰러진 채 잠깐 남고, 나머지는 바닥·화면 밖에서 사라짐
      if (p.age > p.life || (p.y <= 0 && p.age > 4 && p.kind !== 'lightstand') || p.x < -20 || p.x > STAGE_W + 20) p.dead = true
      if (p.dead || this.phase !== 'fight') continue
      if (this.world.blocksProjectile(p.owner, p.x, p.y)) { p.dead = true; continue }
      const def = this.fighters[1 - p.owner]
      const att = this.fighters[p.owner]
      if (def.invuln > 0 || def.hp <= 0) continue
      const box = { x: p.x - p.w / 2, y: p.y, w: p.w, h: p.h }
      // 상쇄: 상대의 근접 공격 판정에 닿으면 사라짐 (관통 투사체 제외)
      const hb = def.hitbox()
      if (hb && !p.pierce && overlap(box, hb)) { p.dead = true; this.events.push({ type: 'block', x: p.x, y: p.y, attacker: def.idx }); continue }
      // 대시 시작 순간은 투사체를 뚫고 지나감 (원거리 캐릭터에게 다가가는 수단)
      if ((def.state === 'dash' && def.stateFrame < 10) || def.state === 'airdash') continue
      if (p.hitCd > 0) p.hitCd--
      if (p.y > 0 && p.hitCd <= 0 && this.canJuggle(def, false) && overlap(box, def.hurtbox())) {
        p.hits++
        if (!p.pierce || p.hits >= (p.multiHit ?? 1)) p.dead = true
        else p.hitCd = 10
        const { multiHit: _m, ...spec } = p
        this.resolve(att, def, { ...spec, meterGain: 6 }, p.x - p.vx * 4)
      }
      if (p.y <= 0) p.vy = 0
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead)
  }

  private ko(winnerIdx: number) {
    if (this.phase !== 'fight') return
    // 태그 모드: 쓰러진 쪽 동료가 남아 있으면 잠시 뒤 교대해서 계속
    const lt = this.teams[1 - winnerIdx]
    const mate = this.partner(lt)
    if (this.tag && mate && mate.hp > 0) {
      this.events.push({ type: 'tag', team: 1 - winnerIdx, kind: 'down', name: this.fighters[1 - winnerIdx].char.name })
      lt.pendingIn = 70; lt.assist = null
      this.hitstop = 20
      return
    }
    this.roundWinner = winnerIdx
    this.wins[winnerIdx]++
    this.events.push({ type: 'ko', winner: winnerIdx })
    this.hitstop = 30
    this.setPhase('ko')
  }

  private timeUp() {
    const ratio = (t: Team) => t.members.reduce((s, m) => s + Math.max(0, m.hp), 0) / t.members.reduce((s, m) => s + m.maxHp, 0)
    const winner = ratio(this.teams[0]) >= ratio(this.teams[1]) ? 0 : 1
    this.events.push({ type: 'timeup' })
    this.roundWinner = winner
    this.wins[winner]++
    this.setPhase('ko')
  }

  private endRound() {
    const w = this.roundWinner!
    this.fighters[w].setState('victory')
    this.fighters[1 - w].setState(this.fighters[1 - w].hp <= 0 ? 'defeat' : 'defeat')
    if (this.wins[w] >= this.roundsToWin) { this.winner = w; this.setPhase('matchOver'); return }
    this.setPhase('roundEnd')
  }

  private nextRound() {
    this.round++
    this.timer = ROUND_TIME * FPS
    this.projectiles = []
    this.world.resetRound()
    this.roundWinner = null
    this.fighters.forEach((f, i) => { f.resetForRound(START_X[i]); f.meter = Math.min(METER_MAX, f.meter) })
    this.events.push({ type: 'round', round: this.round })
    this.setPhase('intro')
  }
}
