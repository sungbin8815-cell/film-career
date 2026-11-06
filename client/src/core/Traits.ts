// 캐릭터 고유 시스템 (패시브 · 고유 게이지 · 스킬 효과). LoL 챔피언처럼 캐릭터마다 싸우는 방식이 다릅니다.
//  촬영 lens   : 렌즈 교체(E) — 광각 러시(빠름·이속↑·약 3연타) / 표준 / 망원 저격(가만히 있으면 초점↑, 가득 차면 크리티컬). Q·W가 렌즈마다 다른 기술
//  연출 mark   : 콘티(Q, 밟으면 묶임) · NG!(W, 받아치기) · 큐 사인(E, 콘티 폭발) · 리테이크(R, 상대를 2초 전 자리로 되돌리고 멈춤)
//  사운드 rec  : 패시브 게인 업(맞고 막을수록 게이지↑) · 리버브(맞힌 뒤 잔향 추가 피해) · 노이즈 월(W) · SOUND OVER(E, 게이지 방출)
//  조명 light  : 패시브 노출(빛 기술이 쌓이면 상대 기절) · 키라이트(Q) · 백라이트(W, 끌어오기) · 팔로우 스폿(E, 따라다니며 노출)
//  미술 wall   : 패시브 제작 포인트 · 애플박스(Q, 발판) · 페이크 월(W) · 소파 드롭(E) · 세트 체인지(R, 구조물 폭파)
//  분장 makeup : 패시브 분장막(피해 흡수) · 베이스(Q, 충전) · 파우더 블라인드(W) · 클렌징(E, 분장막 전부 폭발)
//  배우 copy   : 패시브 관찰(상대 스킬을 두 번 보면 Q·W 칸에 복사) · 스턴트 구르기 · 즉흥 연기(E, 바로 복사) · 명연기(R, 상대 필살)
import type { Fighter } from './Fighter'
import type { MatchEvent, MoveData, ProjectileSpec } from './types'
import { STAGE_W } from './types'

export type TraitId = 'lens' | 'mark' | 'rec' | 'light' | 'wall' | 'makeup' | 'copy'

export const LENSES = [
  { name: '광각 24mm', short: '24mm' },
  { name: '표준 50mm', short: '50mm' },
  { name: '망원 135mm', short: '135mm' },
] as const

/** 고유 버튼(E)·패시브 설명 (기술표·HUD용) */
export const TRAIT_INFO: Record<TraitId, { name: string; button: string; gauge: string; desc: string; passive: string }> = {
  lens: { name: '렌즈 교체', button: '렌즈', gauge: '초점', passive: '렌즈마다 Q·W가 바뀜',
    desc: '광각: 빠르고 이동속도 +20%, 약 3연타 · 망원: 사거리 +14, 피해 +20%. 망원으로 가만히 있으면 초점이 차고, 가득 찬 뒤 첫 공격은 크리티컬(×1.6)' },
  mark: { name: '큐 사인', button: '큐', gauge: '콘티', passive: 'Q 콘티(최대 3개)를 밟으면 묶임',
    desc: '깔아 둔 콘티를 한꺼번에 터뜨려 띄움. W NG!는 받아치기, R 리테이크는 상대를 2초 전 자리로 되돌리고 멈춤' },
  rec: { name: 'SOUND OVER', button: 'OVER', gauge: '사운드', passive: '맞고 막을수록 게이지↑, 맞힌 공격은 잔향(리버브) 추가 피해, 강공격 슈퍼아머',
    desc: '사운드 게이지(30 이상)를 한 번에 방출: 많이 모을수록 범위·피해가 커지고 70 이상이면 띄움' },
  light: { name: '팔로우 스폿', button: '스폿', gauge: '노출', passive: '빛 기술을 맞히면 상대 노출↑, 100이 되면 눈부셔 기절',
    desc: '4초 동안 스폿 조명이 상대를 따라다니며 노출을 쌓음 (막고 있으면 안 쌓임). Q 키라이트, W 백라이트(끌어오기)' },
  wall: { name: '소파 드롭', button: '소파', gauge: '제작', passive: '때리고 맞을수록 제작 포인트↑ (구조물 비용). 애플박스 위에서는 공격력 +15%·하단 회피',
    desc: '상대 머리 위로 소파 낙하 (제작 50). Q 애플박스(25), W 페이크 월(35), R 세트 체인지로 구조물 폭파' },
  makeup: { name: '클렌징', button: '클렌징', gauge: '분장막', passive: '분장막이 받는 피해의 60%를 흡수, 맞히면 조금씩 회복',
    desc: '분장막(20 이상)을 전부 써서 주변 폭발, 가드 불가: 분장막이 많을수록 셈. Q 베이스로 충전, W 파우더로 상대 판정 축소' },
  copy: { name: '즉흥 연기', button: '즉흥', gauge: '관찰', passive: '상대 스킬을 두 번 보면 Q·W 칸에 복사 (피해 85%)',
    desc: '상대가 방금 쓴 스킬을 바로 따라 함. R 명연기는 지금 상대의 필살기를 흉내' },
}

export interface Wall { owner: number; x: number; hp: number; t: number }
export interface Box { owner: number; x: number; w: number; h: number; hp: number; t: number }
interface Sofa { owner: number; x: number; t: number; landed: boolean }
interface Echo { att: number; dmg: number; t: number }

/** 한 사람의 특성 상태 */
export interface TraitState {
  lens: number          // 촬영: 0 광각 1 표준 2 망원
  focus: number         // 촬영: 망원 초점 0~100
  res: number           // 고유 게이지 (사운드·미술 제작·분장막) 0~100
  traps: number[]       // 연출: 콘티 위치
  spot: number          // 조명: 팔로우 스폿 남은 프레임
  expose: number        // 조명: 상대에게 쌓인 노출 0~100
  immune: number        // 조명: 기절 뒤 노출 면역
  slots: string[]       // 배우: 복사한 기술 (원래캐릭터:기술id)
  observe: Record<string, number>
  lastSeen: string | null
}
export const newTraitState = (trait?: TraitId): TraitState => ({
  lens: 1, focus: 0, res: trait === 'makeup' ? 50 : trait === 'wall' ? 30 : 0, traps: [], spot: 0, expose: 0, immune: 0, slots: [], observe: {}, lastSeen: null,
})

/** Match가 구현해 주는 기능 */
export interface TraitHost {
  fighters: [Fighter, Fighter]
  events: MatchEvent[]
  frame: number
  spawnProjectile(f: Fighter, p: ProjectileSpec, name: string): void
  hitDirect(att: Fighter, def: Fighter, d: Partial<MoveData> & Pick<MoveData, 'damage' | 'hitstun' | 'kbX' | 'name'>, opts: { unblockable?: boolean; fromX?: number }): void
  posAgo(idx: number, frames: number): { x: number; y: number }
}

const WALL_H = 46
const WALL_HALF = 6
/** 효과의 원래 주인 (배우가 따라 하면 게이지 대신 고정 위력) */
const OWNER: Record<string, TraitId> = { soundover: 'rec', cleanse: 'makeup', applebox: 'wall', wall: 'wall', sofa: 'wall', base: 'makeup' }
const COPYABLE = /^(special1|special2|upper|zoompunch|spin|rush|flash)/

export class TraitWorld {
  walls: Wall[] = []
  boxes: Box[] = []
  sofas: Sofa[] = []
  echoes: Echo[] = []
  constructor(private host: TraitHost) {}

  private evt(fighter: number, kind: string, x: number, value?: number) { this.host.events.push({ type: 'trait', fighter, kind, x, value }) }
  private opp(f: Fighter) { return this.host.fighters[1 - f.idx] }
  private own(f: Fighter, effect: string) { return !OWNER[effect] || OWNER[effect] === f.char.trait }

  // ───────────── 버튼 → 기술 ─────────────
  /** E 버튼으로 낼 기술 (못 쓰면 null) */
  traitMove(f: Fighter): 'trait' | null {
    const m = f.char.moves.trait
    return m && this.canUse(f, m) ? 'trait' : null
  }

  /** 스킬을 지금 쓸 수 있는지 (게이지·설치물 조건) */
  canUse(f: Fighter, m: MoveData): boolean {
    const t = f.trait
    switch (m.effect) {
      case 'cue': return t.traps.length > 0
      case 'soundover': return !this.own(f, 'soundover') || t.res >= 30
      case 'cleanse': return !this.own(f, 'cleanse') || t.res >= 20
      case 'applebox': return !this.own(f, 'applebox') || t.res >= 25
      case 'wall': return !this.own(f, 'wall') || t.res >= 35
      case 'sofa': return !this.own(f, 'sofa') || t.res >= 50
      case 'improv': return !!t.lastSeen
    }
    return true
  }

  /** 버튼 기술 바꿔치기: 촬영 렌즈별 Q·W, 배우 복사 칸 */
  remapMove(f: Fighter, id: string): string {
    const mv = f.char.moves
    if (f.char.trait === 'lens' && (id === 'special1' || id === 'special2')) {
      const v = `${id}_${['wide', '', 'tele'][f.trait.lens]}`
      if (f.trait.lens !== 1 && mv[v]) return v
    }
    if (f.char.trait === 'copy') {
      if (id === 'special1' && mv.copy1) return 'copy1'
      if (id === 'special2' && mv.copy2) return 'copy2'
      if (id === 'super') { this.buildCopySuper(f); if (mv.copyR) return 'copyR' }
    }
    return id
  }

  /** 버튼 불 켜기용 */
  ready(f: Fighter) { return this.traitMove(f) != null && (f.cds.trait ?? 0) <= 0 }

  // ───────────── 효과 발동 (기술 판정 순간) ─────────────
  activate(f: Fighter, effect: string, m: MoveData) {
    const t = f.trait
    const o = this.opp(f)
    const own = this.own(f, effect)
    switch (effect) {
      case 'lens':
        t.lens = (t.lens + 1) % 3; t.focus = 0
        this.evt(f.idx, 'lens', f.x, t.lens)
        break
      case 'trap': {
        if (t.traps.length >= 3) t.traps.shift()
        const x = clampX(f.x + f.facing * 46)
        t.traps.push(x)
        this.evt(f.idx, 'trap', x)
        break
      }
      case 'cue': {
        for (const x of t.traps) {
          this.evt(f.idx, 'cue', x)
          if (Math.abs(o.x - x) < 38 && o.y < 46) this.host.hitDirect(f, o, { name: '큐 사인', damage: 72, chip: 8, hitstun: 26, kbX: 2, kbY: 5.5, finisher: true }, { fromX: x })
        }
        t.traps = []
        break
      }
      case 'retake': {
        const p = this.host.posAgo(o.idx, 120)
        const from = o.x
        o.x = p.x; o.y = 0; o.vx = 0; o.vy = 0
        o.move = null; o.setState('hit'); o.stun = 72; o.frozen = 72
        o.hp = Math.max(1, o.hp - Math.round(36 * f.dmgMul))
        this.evt(f.idx, 'retake', o.x, from)
        break
      }
      case 'soundover': {
        const r = own ? t.res : 50
        const half = 30 + r * 0.7
        this.evt(f.idx, 'soundover', f.x, r)
        if (Math.abs(o.x - f.x) < half && o.y < 70) this.host.hitDirect(f, o, { name: `SOUND OVER ${Math.round(r)}`, damage: Math.round(30 + r * 1.1), chip: Math.round(r * 0.2), hitstun: 30, blockstun: 20, kbX: 3 + r / 30, kbY: r >= 70 ? 5 : undefined, finisher: r >= 70 }, {})
        if (own) t.res = 0
        break
      }
      case 'backlight':
        this.evt(f.idx, 'backlight', o.x)
        if (Math.abs(o.x - f.x) < 170) this.host.hitDirect(f, o, { name: '백라이트', damage: 32, chip: 4, hitstun: 28, blockstun: 12, kbX: 3.4, expose: 18 }, { fromX: o.x + Math.sign(o.x - f.x) * 30 })
        break
      case 'followspot':
        t.spot = 240
        this.evt(f.idx, 'spot', o.x)
        break
      case 'applebox': {
        if (own) t.res -= 25
        const mine = this.boxes.filter((b) => b.owner === f.idx)
        if (mine.length >= 2) this.boxes = this.boxes.filter((b) => b !== mine[0])
        const x = clampX(f.x + f.facing * 34)
        this.boxes.push({ owner: f.idx, x, w: 30, h: 16, hp: 3, t: 1500 })
        this.evt(f.idx, 'applebox', x)
        break
      }
      case 'wall': {
        if (own) t.res -= 35
        this.walls = this.walls.filter((w) => w.owner !== f.idx)
        const x = clampX(f.x + f.facing * 32)
        this.walls.push({ owner: f.idx, x, hp: 3, t: 900 })
        this.evt(f.idx, 'wall', x)
        break
      }
      case 'sofa':
        if (own) t.res = Math.max(0, t.res - 50)
        this.sofas.push({ owner: f.idx, x: clampX(o.x), t: 36, landed: false })
        this.evt(f.idx, 'sofaWarn', o.x)
        break
      case 'setchange': {
        for (const s of [...this.walls.filter((w) => w.owner === f.idx), ...this.boxes.filter((b) => b.owner === f.idx)]) {
          this.evt(f.idx, 'wallbreak', s.x)
          if (Math.abs(o.x - s.x) < 46) this.host.hitDirect(f, o, { name: '세트 체인지', damage: 56, hitstun: 24, kbX: 3, kbY: 4.5 }, { fromX: s.x })
        }
        this.walls = this.walls.filter((w) => w.owner !== f.idx); this.boxes = this.boxes.filter((b) => b.owner !== f.idx)
        if (f.char.trait === 'wall') t.res = 100
        break
      }
      case 'base':
        t.res = Math.min(100, t.res + 35)
        this.evt(f.idx, 'base', f.x, t.res)
        break
      case 'cleanse': {
        const r = own ? t.res : 50
        f.invuln = Math.max(f.invuln, 20)
        this.evt(f.idx, 'cleanse', f.x, r)
        if (Math.abs(o.x - f.x) < 64 && o.y < 60) this.host.hitDirect(f, o, { name: `클렌징 ${Math.round(r)}`, damage: Math.round(20 + r * 1.3), hitstun: 28, kbX: 4, kbY: r >= 60 ? 4.5 : undefined, finisher: r >= 60 }, { unblockable: true })
        if (own) t.res = 0
        break
      }
      case 'fullmakeup':
        if (f.char.trait === 'makeup') t.res = 100
        break
      case 'roll':
        f.invuln = Math.max(f.invuln, (m.active ?? 16) + 4)
        break
      case 'improv':
        if (t.lastSeen) this.learn(f, t.lastSeen, true)
        break
    }
  }

  // ───────────── 기술 고치기 (렌즈·초점·발판·블라인드·아머) ─────────────
  modifyMove(f: Fighter, m: MoveData): MoveData {
    if (m.effect && m.hitbox.w === 0 && !m.projectile) return m
    let out: MoveData = m
    const t = f.trait
    const edit = (fn: (x: MoveData) => void) => { if (out === m) out = { ...m, hitbox: { ...m.hitbox }, projectile: m.projectile ? { ...m.projectile } : undefined }; fn(out) }
    const scale = (x: MoveData, k: number) => { x.damage = Math.round(x.damage * k); x.chip = Math.round(x.chip * k); if (x.projectile) { x.projectile.damage = Math.round(x.projectile.damage * k); x.projectile.chip = Math.round(x.projectile.chip * k) } }
    if (f.char.trait === 'lens') {
      if (t.lens === 0) edit((x) => {
        x.startup = Math.max(2, x.startup - 1); scale(x, 0.88); x.hitstun += 2
        if (x.hitbox.w > 0) { x.hitbox.x -= 4; x.hitbox.w = Math.round(x.hitbox.w * 1.25 + 4); x.hitbox.y = Math.max(0, x.hitbox.y - 4); x.hitbox.h = Math.round(x.hitbox.h * 1.25) }
      })
      if (t.lens === 2) edit((x) => {
        x.startup += 2; scale(x, 1.2)
        if (x.hitbox.w > 0) { x.hitbox.x += 14; x.hitbox.h = Math.round(x.hitbox.h * 0.85) }
        if (x.projectile && x.projectile.vx !== 0) x.projectile.vx *= 1.3
      })
      // 초점이 가득 찬 첫 공격 = 크리티컬
      if (t.lens === 2 && t.focus >= 100) edit((x) => { scale(x, 1.6); x.hitstun += 6; x.crit = true; if (x.projectile) x.projectile.crit = true })
    }
    // 미술: 애플박스 위에서 공격력 +15%
    if (f.y > 0 && this.boxes.some((b) => Math.abs(f.x - b.x) < b.w / 2 + 4 && Math.abs(f.y - b.h) < 2)) edit((x) => scale(x, 1.15))
    // 사운드: 강공격 슈퍼아머 (탱커)
    if (f.char.trait === 'rec' && m.id === 'heavy') edit((x) => { x.armor = 1 })
    // 분장 파우더에 맞은 상대: 판정이 작아지고 투사체가 약해짐
    if (f.blind > 0) edit((x) => { if (x.hitbox.w > 0) { x.hitbox.w = Math.round(x.hitbox.w * 0.6); x.hitbox.h = Math.round(x.hitbox.h * 0.75) } if (x.projectile) x.projectile.damage = Math.round(x.projectile.damage * 0.8) })
    return out
  }

  /** 받아치기·노이즈 월: 맞기 전에 가로챔. 'parried'면 공격 무효 + 상대 굳음, 'walled'면 막은 것으로 처리 */
  intercept(att: Fighter, def: Fighter): 'parried' | 'walled' | null {
    const m = def.move
    if (def.state !== 'attack' || !m?.effect) return null
    const active = def.moveFrame >= m.startup && def.moveFrame < m.startup + m.active
    if (!active) return null
    if (m.effect === 'parry') {
      att.move = null; att.setState('hit'); att.stun = 44; att.vx = -att.facing * 1.5
      def.move = null; def.setState('idle')
      def.invuln = 8
      this.evt(def.idx, 'parry', (att.x + def.x) / 2)
      return 'parried'
    }
    if (m.effect === 'noisewall') {
      if (def.char.trait === 'rec') def.trait.res = Math.min(100, def.trait.res + 15)
      this.evt(def.idx, 'noisewall', (att.x + def.x) / 2)
      return 'walled'
    }
    return null
  }

  /** 분장막: 받는 피해의 60% 흡수 */
  absorb(def: Fighter, dmg: number): number {
    const t = def.trait
    if (def.char.trait !== 'makeup' || t.res <= 0) return dmg
    const a = Math.min(t.res, dmg * 0.6)
    t.res -= a
    if (t.res <= 0) this.evt(def.idx, 'shieldBreak', def.x)
    return Math.max(1, Math.round(dmg - a))
  }

  onDamaged(def: Fighter, dmg: number, blocked: boolean) {
    const t = def.trait
    if (def.char.trait === 'rec') t.res = Math.min(100, t.res + (blocked ? 5 : dmg * 0.3))
    if (def.char.trait === 'wall') t.res = Math.min(100, t.res + (blocked ? 2 : 4))
    if (!blocked) def.trait.focus = 0
  }

  /** 맞혔을 때 (막혔으면 blocked) */
  onHit(att: Fighter, def: Fighter, d: Partial<MoveData> & { blind?: number }, dmg: number, blocked: boolean) {
    const t = att.trait
    if (att.char.trait === 'rec' && !blocked) { t.res = Math.min(100, t.res + 2); if (dmg >= 10 && d.id !== 'trait') this.echoes.push({ att: att.idx, dmg: Math.max(1, Math.round(dmg * 0.15)), t: 28 }) }
    if (att.char.trait === 'wall') t.res = Math.min(100, t.res + (blocked ? 3 : 8))
    if (att.char.trait === 'makeup' && !blocked) t.res = Math.min(100, t.res + 4)
    if (att.char.trait === 'light' && d.expose) this.addExpose(att, blocked ? d.expose / 3 : d.expose)
    if (d.blind && !blocked) { def.blind = d.blind; this.evt(def.idx, 'blind', def.x) }
  }

  private addExpose(g: Fighter, v: number) {
    const t = g.trait
    if (t.immune > 0) return
    t.expose = Math.min(100, t.expose + v)
  }

  /** 상대가 기술을 시작했을 때 (배우 관찰) + 내 기술 시작 (초점 소모) */
  onMoveStart(f: Fighter, id: string) {
    if (f.char.trait === 'lens' && f.trait.lens === 2 && !id.startsWith('trait')) f.trait.focus = 0
    const o = this.opp(f)
    if (o.char.trait === 'copy' && f.char.trait !== 'copy' && COPYABLE.test(id) && Math.abs(o.x - f.x) < 260) {
      const key = `${f.char.id}:${id}`
      const t = o.trait
      t.lastSeen = key
      t.observe[key] = (t.observe[key] ?? 0) + 1
      if (t.observe[key] >= 2 && !t.slots.includes(key)) this.learn(o, key, false)
      else this.evt(o.idx, 'observe', o.x, t.observe[key])
    }
  }

  /** 배우: 기술 복사 (칸 2개, 넘치면 오래된 것부터) */
  private learn(actor: Fighter, key: string, improv: boolean) {
    const [cid, mid] = key.split(':')
    const o = this.opp(actor)
    if (o.char.id !== cid) return
    const src = o.char.moves[mid]
    if (!src) return
    const t = actor.trait
    if (!t.slots.includes(key)) { t.slots.push(key); if (t.slots.length > 2) t.slots.shift() }
    t.slots.forEach((k, i) => {
      const [c2, m2] = k.split(':')
      const s = c2 === o.char.id ? o.char.moves[m2] : null
      if (s) actor.char.moves[`copy${i + 1}`] = copyMove(s, `copy${i + 1}`, c2, 0.85)
    })
    this.evt(actor.idx, improv ? 'improv' : 'learn', actor.x, t.slots.indexOf(key) + 1)
  }

  private buildCopySuper(f: Fighter) {
    const s = this.opp(f).char.moves.super
    if (s && this.opp(f).char.trait !== 'copy') f.char.moves.copyR = { ...copyMove(s, 'copyR', this.opp(f).char.id, 0.9), cost: 100, name: `명연기: ${s.name}` }
  }

  // ───────────── 매 프레임 ─────────────
  tick() {
    const [a, b] = this.host.fighters
    for (const f of [a, b]) {
      const t = f.trait
      const o = this.opp(f)
      if (f.blind > 0) f.blind--
      // 촬영 망원: 가만히 있으면 초점이 참
      if (f.char.trait === 'lens') {
        if (t.lens === 2 && f.grounded && (f.state === 'idle' || f.state === 'crouch' || f.state === 'guard')) t.focus = Math.min(100, t.focus + 1.7)
        else if (f.state === 'walk' || f.state === 'run' || f.state === 'jump') t.focus = Math.max(0, t.focus - 4)
        if (t.lens !== 2) t.focus = 0
      }
      if (f.char.trait === 'wall') t.res = Math.min(100, t.res + 0.06)
      if (f.char.trait === 'makeup') t.res = Math.min(100, t.res + 0.03)
      // 연출 콘티: 상대가 밟으면 묶임
      if (t.traps.length && o.grounded && o.invuln <= 0 && o.snare <= 0) {
        const hit = t.traps.find((x) => Math.abs(o.x - x) < 14)
        if (hit != null) {
          t.traps = t.traps.filter((x) => x !== hit)
          o.snare = 54
          this.host.hitDirect(f, o, { name: '콘티 밟음', damage: 20, hitstun: 12, kbX: 0 }, { unblockable: true })
          this.evt(f.idx, 'snare', hit)
        }
      }
      // 조명: 팔로우 스폿 + 노출이 가득 차면 기절
      if (f.char.trait === 'light') {
        if (t.immune > 0) t.immune--
        if (t.spot > 0) { t.spot--; if (o.state !== 'guard') this.addExpose(f, 0.55) }
        if (t.expose >= 100 && o.grounded && o.hp > 0 && o.state !== 'knockdown' && o.state !== 'knockback') {
          o.move = null; o.setState('hit'); o.stun = 86; o.dizzy = 86; o.vx = 0
          t.expose = 0; t.immune = 240
          this.evt(f.idx, 'stun', o.x)
        }
      }
    }
    // 사운드 리버브: 조금 뒤에 잔향 피해
    for (const e of this.echoes) {
      if (--e.t > 0) continue
      const def = this.host.fighters[1 - e.att]
      if (def.hp > 1) { def.hp = Math.max(1, def.hp - e.dmg); this.evt(e.att, 'reverb', def.x, e.dmg) }
    }
    this.echoes = this.echoes.filter((e) => e.t > 0)
    // 미술 소파 낙하
    for (const s of this.sofas) {
      if (--s.t > 0 || s.landed) continue
      s.landed = true; s.t = 50
      const att = this.host.fighters[s.owner], def = this.host.fighters[1 - s.owner]
      this.evt(s.owner, 'sofa', s.x)
      if (Math.abs(def.x - s.x) < 28 && def.y < 50) this.host.hitDirect(att, def, { name: '소파 드롭', damage: 84, chip: 14, hitstun: 30, blockstun: 18, kbX: 1.5, kbY: 3, overhead: true, finisher: true }, { fromX: s.x })
    }
    this.sofas = this.sofas.filter((s) => !s.landed || s.t-- > 0)
    for (const w of this.walls) w.t--
    for (const bx of this.boxes) bx.t--
    this.walls = this.walls.filter((w) => w.t > 0 && w.hp > 0)
    this.boxes = this.boxes.filter((q) => q.t > 0 && q.hp > 0)
  }

  /** 발판(애플박스) 높이: 위에서 내려오면 올라섬 */
  floorAt(f: Fighter): number {
    for (const b of this.boxes) if (Math.abs(f.x - b.x) < b.w / 2 + 3 && f.y >= b.h - 6) return b.h
    return 0
  }

  /** 세트벽: 몸이 못 지나가게 밀어내고, 날아오는 상대는 튕겨냄 */
  physics(prevX: [number, number]) {
    for (const w of this.walls) for (const f of this.host.fighters) {
      if (f.y >= WALL_H) continue
      const half = f.char.hurt.w / 2 + WALL_HALF
      if (Math.abs(f.x - w.x) >= half) continue
      const side = prevX[f.idx] < w.x ? -1 : prevX[f.idx] > w.x ? 1 : (f.x < w.x ? -1 : 1)
      const speed = Math.abs(f.vx)
      f.x = w.x + side * half
      if (f.state === 'knockback' && !f.wallBounced && speed > 1.2) {
        f.wallBounced = true
        f.vx = side * Math.max(1.6, speed * 0.55)
        f.vy = Math.max(f.vy, 3.4); f.y = Math.max(f.y, 0.01)
        f.juggles = Math.max(0, f.juggles - 1)
        w.hp--
        this.evt(w.owner, 'wallbounce', w.x, w.hp)
      } else f.vx = 0
    }
    this.walls = this.walls.filter((w) => w.hp > 0)
  }

  /** 공격 판정이 남의 구조물에 닿으면 깎임 (기술마다 한 번) */
  hitWalls(att: Fighter, hb: { x: number; y: number; w: number; h: number }) {
    for (const s of [...this.walls.map((w) => ({ s: w, half: WALL_HALF, h: WALL_H })), ...this.boxes.map((b) => ({ s: b, half: b.w / 2, h: b.h }))]) {
      if (s.s.owner === att.idx || att.hitWallThisMove) continue
      if (hb.x < s.s.x + s.half && hb.x + hb.w > s.s.x - s.half && hb.y < s.h) {
        att.hitWallThisMove = true
        s.s.hp--
        this.evt(s.s.owner, s.s.hp <= 0 ? 'wallbreak' : 'wallhit', s.s.x, s.s.hp)
      }
    }
    this.walls = this.walls.filter((w) => w.hp > 0); this.boxes = this.boxes.filter((b) => b.hp > 0)
  }

  /** 투사체가 막히는지: 상대 세트벽, 사운드 노이즈 월 */
  blocksProjectile(owner: number, x: number, y: number) {
    for (const w of this.walls) {
      if (w.owner === owner || y >= WALL_H) continue
      if (Math.abs(x - w.x) < WALL_HALF + 6) {
        w.hp--
        this.evt(w.owner, w.hp <= 0 ? 'wallbreak' : 'wallhit', w.x, w.hp)
        this.walls = this.walls.filter((q) => q.hp > 0)
        return true
      }
    }
    const d = this.host.fighters[1 - owner]
    const m = d.move
    if (m?.effect === 'noisewall' && d.state === 'attack' && d.moveFrame >= m.startup && d.moveFrame < m.startup + m.active && Math.abs(x - (d.x + d.facing * 20)) < 22) {
      if (d.char.trait === 'rec') d.trait.res = Math.min(100, d.trait.res + 15)
      this.evt(d.idx, 'noisewall', x)
      return true
    }
    return false
  }

  /** 촬영 광각: 이동속도 +20% */
  speedMul(f: Fighter) { return f.char.trait === 'lens' && f.trait.lens === 0 ? 1.2 : 1 }
  /** 약공격 연타 한도 (광각 3) */
  maxLightChain(f: Fighter) { return f.char.trait === 'lens' && f.trait.lens === 0 ? 3 : 2 }

  resetRound() {
    this.walls = []; this.boxes = []; this.sofas = []; this.echoes = []
    for (const f of this.host.fighters) {
      const t = f.trait
      const keep = { lens: t.lens, slots: t.slots, observe: t.observe, res: f.char.trait === 'rec' ? t.res * 0.5 : undefined }
      f.trait = newTraitState(f.char.trait)
      f.trait.lens = keep.lens; f.trait.slots = keep.slots; f.trait.observe = keep.observe
      if (keep.res != null) f.trait.res = keep.res
    }
  }

  // ───────────── HUD ─────────────
  /** 고유 게이지 (0~1)와 표시 글자 */
  gauge(f: Fighter): { v: number; text: string; color: number } {
    const t = f.trait
    switch (f.char.trait) {
      case 'lens': return { v: t.lens === 2 ? t.focus / 100 : 0, text: `${LENSES[t.lens].name}${t.lens === 2 ? (t.focus >= 100 ? ' ◎초점!' : ` 초점 ${Math.round(t.focus)}`) : ''}`, color: t.focus >= 100 ? 0xff5470 : 0x5eead4 }
      case 'mark': return { v: t.traps.length / 3, text: `콘티 ${'■'.repeat(t.traps.length)}${'□'.repeat(3 - t.traps.length)}`, color: 0xfacc15 }
      case 'rec': return { v: t.res / 100, text: `사운드 ${Math.round(t.res)}`, color: t.res >= 70 ? 0xff5470 : 0x86efac }
      case 'light': return { v: t.expose / 100, text: t.immune > 0 ? '노출 (면역)' : `상대 노출 ${Math.round(t.expose)}${t.spot > 0 ? ' · 스폿' : ''}`, color: 0xfde68a }
      case 'wall': return { v: t.res / 100, text: `제작 ${Math.round(t.res)}`, color: 0xd6b27a }
      case 'makeup': return { v: t.res / 100, text: `분장막 ${Math.round(t.res)}`, color: 0xff7eb6 }
      case 'copy': {
        const name = (i: number) => f.char.moves[`copy${i}`]?.name ?? '-'
        return { v: t.slots.length / 2, text: `Q:${name(1)} W:${name(2)}`, color: 0x5eead4 }
      }
    }
    return { v: 0, text: '', color: 0xffffff }
  }
}

/** 배우가 따라 한 기술: 원래 기술 + 피해 감소, 동작은 원래 캐릭터 것 */
function copyMove(s: MoveData, id: string, srcChar: string, k: number): MoveData {
  return {
    ...s, id, copyOf: srcChar, combo: false, cost: undefined, rank: 0,
    cd: s.cd ?? 200,
    anim: `${srcChar}:${s.anim ?? s.id}`,
    damage: Math.round(s.damage * k), chip: Math.round(s.chip * k),
    projectile: s.projectile ? { ...s.projectile, damage: Math.round(s.projectile.damage * k) } : undefined,
  }
}

const clampX = (x: number) => Math.max(24, Math.min(STAGE_W - 24, Math.round(x)))

/** CPU가 어떤 스킬 버튼을 누를지 (캐릭터별 판단) */
export function aiSkill(me: Fighter, opp: Fighter, r: () => number): 'trait' | 'special' | 'skill2' | null {
  const w = me.world
  if (!w) return null
  const t = me.trait
  const dist = Math.abs(opp.x - me.x)
  const ok = (id: string) => { const m = me.char.moves[w.remapMove(me, id)]; return !!m && (me.cds[cdKey(m.id)] ?? 0) <= 0 && w.canUse(me, m) && (!m.cost || me.meter >= m.cost) }
  const E = ok('trait'), Q = ok('special1'), W = ok('special2')
  switch (me.char.trait) {
    case 'lens':
      // 멀면 망원(2), 붙으면 광각(0)이 목표: 목표 렌즈가 아닐 때만, 가끔
      if (E && r() < 0.35 && ((dist > 130 && t.lens !== 2) || (dist < 45 && t.lens !== 0))) return 'trait'
      if (Q && (t.lens === 2 ? dist > 80 : dist < 80)) return 'special'
      if (W && r() < 0.4) return 'skill2'
      return null
    case 'mark':
      if (E && t.traps.some((x) => Math.abs(opp.x - x) < 36)) return 'trait'
      if (Q && t.traps.length < 3 && dist > 60) return 'special'
      if (W && opp.state === 'attack' && dist < 70 && r() < 0.5) return 'skill2'
      return null
    case 'rec':
      if (E && t.res >= 60 && dist < 30 + t.res * 0.7) return 'trait'
      if (W && opp.state === 'attack' && dist < 90 && r() < 0.4) return 'skill2'
      if (Q && dist > 90) return 'special'
      return null
    case 'light':
      if (E && dist < 200 && r() < 0.6) return 'trait'
      if (Q && dist < 90) return 'special'
      if (W && dist > 70 && dist < 160) return 'skill2'
      return null
    case 'wall':
      if (E && r() < 0.25) return 'trait'
      if (W && dist > 90 && r() < 0.5) return 'skill2'
      if (Q && r() < 0.3) return 'special'
      return null
    case 'makeup':
      if (E && t.res >= 60 && dist < 60) return 'trait'
      if (Q && t.res < 40) return 'special'
      if (W && dist > 60 && dist < 160) return 'skill2'
      return null
    case 'copy':
      if (E && r() < 0.6) return 'trait'
      if (Q && dist < 120) return 'special'
      if (W && (opp.state === 'attack' || t.slots.length >= 2) && r() < 0.5) return 'skill2'
      return null
  }
  return null
}

/** 쿨타임 칸: 렌즈 변형·복사 칸은 같은 버튼(Q·W)과 공유 */
export function cdKey(id: string): string {
  if (id.startsWith('special1') || id === 'copy1') return 'special1'
  if (id.startsWith('special2') || id === 'copy2') return 'special2'
  if (id.startsWith('trait')) return 'trait'
  return id
}
