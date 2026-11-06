// 캐릭터 고유 시스템. 특성을 빼면 캐릭터가 성립하지 않도록, 싸우는 방식 자체를 여기서 만듭니다.
//  촬영 lens   : 광각(초근접 러시)·표준(중거리)·망원(완전 원거리 저격). 렌즈마다 기술이 통째로 바뀜, 망원 초점 → 크리티컬
//  연출 mark   : 설치·소환 사령관. 콘티(덫)·엑스트라 소환, "액션!"으로 전부 동시에 발동, 점프컷·NG!
//  사운드 rec  : 여의봉 붐(모으면 화면 절반) + 맞고 막을수록 사운드 게이지, 방출·우퍼 장판·피드백 기둥, 리버브
//  조명 light  : 빛 마법사. 레이저·반사판·암전 블링크·스폿·젤, 노출 100 → 기절
//  미술 wall   : 건축가. 애플박스·공중 발판·세트벽·소파, 구조물이 많을수록 강해짐, 세트 폭파
//  분장 makeup : 분장막(피해 흡수) + 상태이상(상처·노인·파우더) + 크리처 변신 모드
//  배우 copy   : 상대 기술·커맨드 복사 + 배역 전환(액션·사극·호러)
import type { Fighter } from './Fighter'
import type { MatchEvent, MoveData, ProjectileSpec } from './types'
import { STAGE_W } from './types'

export type TraitId = 'lens' | 'mark' | 'rec' | 'light' | 'wall' | 'makeup' | 'copy'

export const LENSES = [
  { name: '광각 24mm', short: '24mm', tag: 'wide' },
  { name: '표준 50mm', short: '50mm', tag: '' },
  { name: '망원 135mm', short: '135mm', tag: 'tele' },
] as const
export const ROLES = [
  { name: '액션 배우', tag: '' },
  { name: '사극 배우', tag: 'sageuk' },
  { name: '호러 배우', tag: 'horror' },
] as const

/** 특성 설명 (기술표·HUD·선택 화면) */
export const TRAIT_INFO: Record<TraitId, { name: string; button: string; gauge: string; desc: string; passive: string }> = {
  lens: { name: '렌즈 교체', button: '렌즈', gauge: '초점', passive: '렌즈마다 완전히 다른 캐릭터 (광각 러시 / 표준 / 망원 저격)',
    desc: 'D: 다음 렌즈 · →D 광각 · ←D 망원 · ↑D 표준. 교체 순간 잠깐 무적. 망원은 가만히 있으면 초점이 차고 풀초점 샷은 크리티컬' },
  mark: { name: '액션!', button: '액션', gauge: '콘티', passive: '주먹은 약하고, 콘티(덫)·엑스트라를 깔아 판을 짠다',
    desc: 'D: 깔아 둔 콘티·엑스트라 동시 발동 · →D 점프컷(내가 콘티로) · ←D 점프컷(상대를 콘티로) · ↓D NG!(받아치기·되감기)' },
  rec: { name: 'SOUND OVER', button: 'OVER', gauge: '사운드', passive: '붐마이크가 여의봉처럼 늘어남(C 모으기). 맞고 막을수록 사운드↑, 리버브, 강공격 슈퍼아머',
    desc: 'D: 사운드 방출(많을수록 화면 전체) · ↓D 노이즈 월 · →D 우퍼 장판(30) · ↑D 피드백 기둥(30)' },
  light: { name: '암전 블링크', button: '암전', gauge: '노출', passive: '빛 기술이 상대 노출을 쌓고, 100이 되면 기절',
    desc: 'D: 조명을 꺼서 앞으로 순간이동 · ←D 뒤로 · ↓D 반사판 설치(레이저가 꺾여 들어감) · ↑D 팔로우 스폿' },
  wall: { name: '세트 폭파', button: '폭파', gauge: '제작', passive: '제작 포인트로 구조물을 짓고, 구조물이 많을수록 공격력↑ (최대 +25%)',
    desc: 'D: 지어 둔 구조물을 파편으로 날림 · →D 세트벽 밀기 · ↓D 비계(벽+발판) · ↑D 공중 발판' },
  makeup: { name: '특수분장', button: '분장', gauge: '분장막', passive: '분장막이 피해의 60% 흡수. 상처(지속 피해)·노인(느려짐)·파우더(판정 축소)',
    desc: 'D: 크리처 변신 8초(분장막 30, 기술 세트가 바뀜) · ↓D 베이스(분장막 +35) · →D 클렌징(분장막 전부 폭발, 가드 불가)' },
  copy: { name: '배역 전환', button: '배역', gauge: '관찰', passive: '상대 기술·커맨드를 두 번 보면 C 칸(C·→C)에 복사',
    desc: 'D: 액션 → 사극 → 호러 배역 (배역마다 기본기가 다름) · ↓D 즉흥 연기(방금 본 기술 복사) · →D 스턴트 구르기(무적)' },
}

export interface Wall { owner: number; x: number; hp: number; t: number; h: number; vx?: number }
export interface Box { owner: number; x: number; y: number; w: number; h: number; hp: number; t: number }
export interface Extra { owner: number; x: number; y: number; vx: number; vy: number; t: number; cd: number; lunge: number; hit: boolean }
interface Delayed { owner: number; x: number; t: number; kind: 'pillar' | 'toplight' | 'sofa' | 'collapse'; landed?: boolean }
interface Field { owner: number; x: number; w: number; t: number; kind: 'woofer' | 'floorlight' | 'poison'; tick: number }
interface Echo { att: number; dmg: number; t: number }
export interface Reflector { owner: number; x: number; t: number }

export interface TraitState {
  lens: number; focus: number
  res: number                // 고유 게이지 (사운드·제작·분장막) 0~100
  traps: number[]
  spot: number; expose: number; immune: number; gel: number
  mode: number               // 분장 크리처 남은 프레임
  role: number               // 배우 배역
  slots: string[]; observe: Record<string, number>; lastSeen: string | null
}
export const newTraitState = (trait?: TraitId): TraitState => ({
  lens: 1, focus: 0, res: trait === 'makeup' ? 50 : trait === 'wall' ? 40 : 0, traps: [], spot: 0, expose: 0, immune: 0, gel: 0, mode: 0, role: 0,
  slots: [], observe: {}, lastSeen: null,
})

/** 스테이지 고정 발판 */
export interface Platform { x: number; y: number; w: number }

export interface TraitHost {
  fighters: [Fighter, Fighter]
  events: MatchEvent[]
  frame: number
  platforms: Platform[]
  spawnProjectile(f: Fighter, p: ProjectileSpec, name: string): void
  spawnAt(owner: number, x: number, y: number, p: ProjectileSpec, name: string): void
  hitDirect(att: Fighter, def: Fighter, d: Partial<MoveData> & Pick<MoveData, 'damage' | 'hitstun' | 'kbX' | 'name'>, opts: { unblockable?: boolean; fromX?: number }): void
  posAgo(idx: number, frames: number): { x: number; y: number }
}

const WALL_HALF = 6
const OWNER: Record<string, TraitId> = { soundover: 'rec', woofer: 'rec', pillar: 'rec', cleanse: 'makeup', transform: 'makeup', applebox: 'wall', platform: 'wall', airPlatform: 'wall', wall: 'wall', sofa: 'wall', stairs: 'wall', scaffold: 'wall', barricade: 'wall' }
const COST: Record<string, number> = { soundover: 25, woofer: 30, pillar: 30, cleanse: 20, transform: 30, applebox: 20, platform: 20, airPlatform: 15, wall: 30, sofa: 40, stairs: 35, scaffold: 45, barricade: 25 }
/** 배우가 복사할 수 있는 기술: 직업기(C)·커맨드 */
const copyable = (m: MoveData) => !!(m.combo || m.id.startsWith('C_')) && !m.ult

export class TraitWorld {
  walls: Wall[] = []
  boxes: Box[] = []
  extras: Extra[] = []
  delayed: Delayed[] = []
  fields: Field[] = []
  echoes: Echo[] = []
  reflectors: Reflector[] = []
  /** 조준선 (망원) 등 그리기용 */
  constructor(private host: TraitHost) {}

  private evt(fighter: number, kind: string, x: number, value?: number, y?: number) { this.host.events.push({ type: 'trait', fighter, kind, x, value, y }) }
  private opp(f: Fighter) { return this.host.fighters[1 - f.idx] }
  private own(f: Fighter, effect: string) { return !OWNER[effect] || OWNER[effect] === f.char.trait }

  // ───────────── 기술 칸 → 실제 기술 (모드 변형) ─────────────
  modeTag(f: Fighter): string {
    switch (f.char.trait) {
      case 'lens': return LENSES[f.trait.lens].tag
      case 'makeup': return f.trait.mode > 0 ? 'creature' : ''
      case 'copy': return ROLES[f.trait.role].tag
    }
    return ''
  }

  remapMove(f: Fighter, slot: string): string {
    const mv = f.char.moves
    if (f.char.trait === 'copy') {
      if (slot === 'C_n' && mv.copy1) return 'copy1'
      if (slot === 'C_f' && mv.copy2) return 'copy2'
      if (slot === 'R') { this.buildCopyUlt(f); if (mv.copyR) return 'copyR' }
    }
    const tag = this.modeTag(f)
    if (tag && mv[`${slot}~${tag}`]) return `${slot}~${tag}`
    return slot
  }

  canUse(f: Fighter, m: MoveData): boolean {
    const t = f.trait
    const e = m.effect
    if (!e) return true
    if (COST[e] != null && this.own(f, e) && t.res < COST[e]) return false
    switch (e) {
      case 'action': return t.traps.length > 0 || this.extras.some((x) => x.owner === f.idx)
      case 'jumpcutSelf': case 'jumpcutOpp': return t.traps.length > 0
      case 'extraRush': return this.extras.some((x) => x.owner === f.idx)
      case 'rehearsal': return this.extras.some((x) => x.owner === f.idx)
      case 'setBlast': case 'collapse': return this.structCount(f) > 0
      case 'wallPush': return this.walls.some((w) => w.owner === f.idx)
      case 'improv': return !!t.lastSeen
      case 'transform': return t.mode <= 0
    }
    return true
  }

  ready(f: Fighter) { const m = f.char.moves[this.remapMove(f, 'D_n')]; return !!m && this.canUse(f, m) && (f.cds[cdKey(m.id)] ?? 0) <= 0 }

  private structCount(f: Fighter) { return this.walls.filter((w) => w.owner === f.idx).length + this.boxes.filter((b) => b.owner === f.idx).length }

  // ───────────── 효과 발동 ─────────────
  activate(f: Fighter, effect: string, m: MoveData) {
    const t = f.trait
    const o = this.opp(f)
    const own = this.own(f, effect)
    if (COST[effect] != null && own) t.res = Math.max(0, t.res - COST[effect])
    const ahead = (d: number) => clampX(f.x + f.facing * d)
    switch (effect) {
      // ─── 촬영 ───
      case 'lens': this.setLens(f, (t.lens + 1) % 3); break
      case 'lensWide': this.setLens(f, 0); break
      case 'lensStd': this.setLens(f, 1); break
      case 'lensTele': this.setLens(f, 2); break
      // ─── 연출 ───
      case 'trap': this.addTrap(f, ahead(70)); break
      case 'trapFar': this.addTrap(f, ahead(170)); break
      case 'trap3': for (const d of [60, 120, 180]) this.addTrap(f, ahead(d)); break
      case 'trapHere': this.addTrap(f, clampX(f.x)); break
      case 'extra': this.summon(f, 1); break
      case 'extras2': this.summon(f, 2); break
      case 'extraDrop': this.extras.push({ owner: f.idx, x: clampX(o.x), y: 150, vx: 0, vy: 0, t: 420, cd: 0, lunge: 0, hit: false }); this.evt(f.idx, 'extra', o.x); break
      case 'action': {
        for (const x of t.traps) {
          this.evt(f.idx, 'cue', x)
          if (Math.abs(o.x - x) < 44 && o.y < 60) this.host.hitDirect(f, o, { name: '액션! (콘티 폭발)', damage: 62, chip: 8, hitstun: 26, kbX: 2.4, kbY: 6, finisher: true }, { fromX: x })
        }
        t.traps = []
        for (const e of this.extras) if (e.owner === f.idx) { e.lunge = 16; e.hit = false }
        this.evt(f.idx, 'action', f.x)
        break
      }
      case 'jumpcutSelf': { const x = t.traps[t.traps.length - 1]; const from = f.x; f.x = x; f.invuln = Math.max(f.invuln, 10); this.evt(f.idx, 'teleport', x, from); break }
      case 'jumpcutOpp': { const x = t.traps[t.traps.length - 1]; const from = o.x; if (o.invuln <= 0 && o.grounded) { o.x = x; o.vx = 0; this.evt(f.idx, 'teleport', x, from) } break }
      case 'extraRush': for (const e of this.extras) if (e.owner === f.idx) { e.lunge = 22; e.hit = false; e.vx = (o.x >= e.x ? 1 : -1) * 6 } this.evt(f.idx, 'action', f.x); break
      case 'rehearsal': for (const e of this.extras) if (e.owner === f.idx) { e.x = clampX(o.x + (e === this.extras[0] ? -24 : 24)); e.y = 0; e.lunge = 10; e.hit = false } this.evt(f.idx, 'action', o.x); break
      case 'slowmo': if (o.invuln <= 0) { o.slowT = 200; this.evt(f.idx, 'slow', o.x) } break
      // ─── 사운드 ───
      case 'soundover': {
        const r = own ? t.res + COST.soundover : 50
        const half = 60 + r * 3.2
        this.evt(f.idx, 'soundover', f.x, r)
        if (Math.abs(o.x - f.x) < half && o.y < 120) this.host.hitDirect(f, o, { name: `SOUND OVER ${Math.round(r)}`, damage: Math.round(34 + r * 1.25), chip: Math.round(r * 0.25), hitstun: 32, blockstun: 22, kbX: 3 + r / 18, kbY: r >= 60 ? 6 : 2.5, finisher: r >= 60, wallBounce: true }, {})
        if (own) t.res = 0
        break
      }
      case 'woofer': this.fields.push({ owner: f.idx, x: ahead(110), w: 150, t: 300, kind: 'woofer', tick: 0 }); this.evt(f.idx, 'woofer', ahead(110)); break
      case 'pillar': for (const dx of [-50, 0, 50]) this.delayed.push({ owner: f.idx, x: clampX(o.x + dx), t: 26 + Math.abs(dx) / 5, kind: 'pillar' }); this.evt(f.idx, 'pillarWarn', o.x); break
      // ─── 조명 ───
      case 'blinkFwd': this.blink(f, ahead(190)); break
      case 'blinkBack': this.blink(f, ahead(-210)); break
      case 'blinkBehind': this.blink(f, clampX(o.x + (o.x >= f.x ? 36 : -36))); f.facing = o.x >= f.x ? 1 : -1; break
      case 'spot': t.spot = 240; this.evt(f.idx, 'spot', o.x); break
      case 'reflector': this.reflectors = [...this.reflectors.filter((r) => r.owner !== f.idx).slice(-1), { owner: f.idx, x: ahead(120), t: 900 }]; this.evt(f.idx, 'reflector', ahead(120)); break
      case 'gel': t.gel = 3; this.evt(f.idx, 'gel', f.x); break
      case 'toplight': this.delayed.push({ owner: f.idx, x: clampX(o.x), t: 30, kind: 'toplight' }); this.evt(f.idx, 'pillarWarn', o.x); break
      case 'floorlight': this.fields.push({ owner: f.idx, x: ahead(90), w: 120, t: 360, kind: 'floorlight', tick: 0 }); this.evt(f.idx, 'floorlight', ahead(90)); break
      case 'reflect':
        for (const r of this.reflectors) if (r.owner === f.idx && Math.abs(o.x - r.x) < 420) {
          this.evt(f.idx, 'reflectBeam', r.x, o.x)
          this.host.hitDirect(f, o, { name: '반사광', damage: 26, chip: 4, hitstun: 20, kbX: 1.5, expose: 14 }, { fromX: r.x })
        }
        break
      // ─── 미술 ───
      case 'applebox': this.addBox(f, ahead(40), 0, 32, 18); break
      case 'platform': this.addBox(f, ahead(50), 70, 56, 6); break
      case 'airPlatform': this.addBox(f, clampX(f.x), Math.max(20, f.y - 10), 50, 6); f.vy = Math.max(f.vy, 0); break
      case 'stairs': this.addBox(f, ahead(60), 34, 44, 6); this.addBox(f, ahead(110), 74, 44, 6); break
      case 'scaffold': this.addWall(f, ahead(70), 80); this.addBox(f, ahead(70), 80, 40, 6); break
      case 'wall': this.addWall(f, ahead(40), 50); break
      case 'barricade': this.addWall(f, ahead(28), 46); break
      case 'sofa': this.delayed.push({ owner: f.idx, x: clampX(o.x), t: 34, kind: 'sofa' }); this.evt(f.idx, 'sofaWarn', o.x); break
      case 'collapse': for (const s of this.ownStructs(f)) if (Math.abs(o.x - s.x) < 160) this.delayed.push({ owner: f.idx, x: clampX(o.x + (s.x - o.x) * 0.3), t: 18, kind: 'collapse' }); this.clearStructs(f); break
      case 'setBlast': {
        // 구조물을 파편 투사체로 상대에게 날림
        for (const s of this.ownStructs(f)) {
          const dir = o.x >= s.x ? 1 : -1
          this.host.spawnAt(f.idx, s.x, (s as Box).y ?? 20, { kind: 'debris', offsetX: 0, startY: 0, vx: 6 * dir, vy: 1.5, gy: 0.08, w: 20, h: 20, life: 90, damage: 34, chip: 6, hitstun: 22, blockstun: 12, kbX: 3, kbY: 3, wallBounce: true }, '세트 파편')
          this.evt(f.idx, 'wallbreak', s.x)
        }
        this.clearStructs(f)
        break
      }
      case 'wallPush': {
        const w = this.walls.filter((q) => q.owner === f.idx).sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0]
        if (w) { w.vx = (o.x >= w.x ? 1 : -1) * 4.5; this.evt(f.idx, 'wallPush', w.x) }
        break
      }
      case 'setchange': for (const s of this.ownStructs(f)) this.evt(f.idx, 'wallbreak', s.x); this.clearStructs(f); if (f.char.trait === 'wall') t.res = 100; break
      // ─── 분장 ───
      case 'base': t.res = Math.min(100, t.res + 35); this.evt(f.idx, 'base', f.x, t.res); break
      case 'fixer': t.res = Math.min(100, t.res + 15); this.fields.push({ owner: f.idx, x: ahead(50), w: 90, t: 240, kind: 'poison', tick: 0 }); this.evt(f.idx, 'base', f.x, t.res); break
      case 'transform': t.mode = 480; f.invuln = Math.max(f.invuln, 16); this.evt(f.idx, 'transform', f.x); break
      case 'cleanse': {
        const r = own ? t.res + COST.cleanse : 50
        f.invuln = Math.max(f.invuln, 20)
        this.evt(f.idx, 'cleanse', f.x, r)
        if (Math.abs(o.x - f.x) < 90 && o.y < 80) this.host.hitDirect(f, o, { name: `클렌징 ${Math.round(r)}`, damage: Math.round(24 + r * 1.3), hitstun: 30, kbX: 5, kbY: r >= 50 ? 5.5 : 2, finisher: r >= 50, wallBounce: true }, { unblockable: true })
        if (own) t.res = 0
        break
      }
      case 'curse': if (o.invuln <= 0) { o.slowT = 300; o.bleed = Math.max(o.bleed, 180); this.evt(f.idx, 'slow', o.x) } break
      case 'fullmakeup': if (f.char.trait === 'makeup') { t.res = 100; t.mode = 480 } break
      // ─── 배우 ───
      case 'role': t.role = (t.role + 1) % 3; this.evt(f.idx, 'role', f.x, t.role); break
      case 'roll': f.invuln = Math.max(f.invuln, (m.active ?? 16) + 4); break
      case 'double': f.invuln = Math.max(f.invuln, 24); this.evt(f.idx, 'double', f.x); break
      case 'improv': if (t.lastSeen) this.learn(f, t.lastSeen, true); break
    }
  }

  private setLens(f: Fighter, lens: number) {
    f.trait.lens = lens; f.trait.focus = 0
    f.invuln = Math.max(f.invuln, 8)
    this.evt(f.idx, 'lens', f.x, lens)
  }
  private addTrap(f: Fighter, x: number) {
    const t = f.trait
    t.traps.push(x); if (t.traps.length > 4) t.traps.shift()
    this.evt(f.idx, 'trap', x)
  }
  private summon(f: Fighter, n: number) {
    const mine = this.extras.filter((e) => e.owner === f.idx)
    for (let k = 0; k < n; k++) {
      if (mine.length + k >= 3) this.extras.splice(this.extras.indexOf(this.extras.find((e) => e.owner === f.idx)!), 1)
      this.extras.push({ owner: f.idx, x: clampX(f.x + f.facing * (24 + k * 20)), y: 0, vx: 0, vy: 0, t: 600, cd: 20 + k * 12, lunge: 0, hit: false })
    }
    this.evt(f.idx, 'extra', f.x + f.facing * 24, n)
  }
  private blink(f: Fighter, x: number) {
    const from = f.x
    f.x = x; f.y = Math.max(f.y, f.floorY); f.vx = 0
    f.invuln = Math.max(f.invuln, 10)
    this.evt(f.idx, 'blink', x, from)
  }
  private addBox(f: Fighter, x: number, y: number, w: number, h: number) {
    const mine = this.boxes.filter((b) => b.owner === f.idx)
    if (mine.length >= 4) this.boxes.splice(this.boxes.indexOf(mine[0]), 1)
    this.boxes.push({ owner: f.idx, x, y, w, h, hp: 3, t: 1800 })
    this.evt(f.idx, 'applebox', x, undefined, y)
  }
  private addWall(f: Fighter, x: number, h: number) {
    const mine = this.walls.filter((w) => w.owner === f.idx)
    if (mine.length >= 2) this.walls.splice(this.walls.indexOf(mine[0]), 1)
    this.walls.push({ owner: f.idx, x, hp: 3, t: 1200, h })
    this.evt(f.idx, 'wall', x, h)
  }
  private ownStructs(f: Fighter): { x: number; y?: number }[] { return [...this.walls.filter((w) => w.owner === f.idx), ...this.boxes.filter((b) => b.owner === f.idx)] }
  private clearStructs(f: Fighter) { this.walls = this.walls.filter((w) => w.owner !== f.idx); this.boxes = this.boxes.filter((b) => b.owner !== f.idx) }

  // ───────────── 기술 고치기 ─────────────
  modifyMove(f: Fighter, m: MoveData): MoveData {
    if (m.effect && m.hitbox.w === 0 && !m.projectile) return m
    let out: MoveData = m
    const t = f.trait
    const edit = (fn: (x: MoveData) => void) => { if (out === m) out = { ...m, hitbox: { ...m.hitbox }, projectile: m.projectile ? { ...m.projectile } : undefined }; fn(out) }
    const scale = (x: MoveData, k: number) => { x.damage = Math.round(x.damage * k); x.chip = Math.round(x.chip * k); if (x.projectile) { x.projectile.damage = Math.round(x.projectile.damage * k); x.projectile.chip = Math.round(x.projectile.chip * k) } }
    if (f.char.trait === 'lens' && t.lens === 2) {
      // 망원: 근접기는 약함, 원거리는 초점이 가득 차면 크리티컬
      if (!m.projectile && m.hitbox.x + m.hitbox.w < 120) edit((x) => scale(x, 0.7))
      if (t.focus >= 100 && (m.projectile || m.hitbox.x + m.hitbox.w >= 200)) edit((x) => { scale(x, 1.8); x.hitstun += 8; x.kbX *= 1.6; x.kbY = Math.max(x.kbY ?? 0, 5); x.crit = true; x.wallBounce = true; if (x.projectile) { x.projectile.crit = true; x.projectile.kbX *= 1.6; x.projectile.kbY = 5; x.projectile.wallBounce = true } })
    }
    // 미술: 구조물이 많을수록 강해짐, 애플박스·발판 위에서 +10%
    if (f.char.trait === 'wall') {
      const n = this.structCount(f)
      const onBox = f.y > 0 && this.boxes.some((b) => Math.abs(f.x - b.x) < b.w / 2 + 4 && Math.abs(f.y - (b.y + b.h)) < 2)
      const k = 1 + Math.min(0.25, n * 0.06) + (onBox ? 0.1 : 0)
      if (k > 1) edit((x) => scale(x, k))
    }
    if (f.char.trait === 'rec' && (m.id.startsWith('B_') || m.id.startsWith('C_n'))) edit((x) => { x.armor = 1 })
    if (f.char.trait === 'makeup' && t.mode > 0) edit((x) => { scale(x, 1.2); if (m.id.startsWith('B_')) x.armor = 1 })
    if (f.blind > 0) edit((x) => { if (x.hitbox.w > 0) { x.hitbox.w = Math.round(x.hitbox.w * 0.6); x.hitbox.h = Math.round(x.hitbox.h * 0.75) } if (x.projectile) x.projectile.damage = Math.round(x.projectile.damage * 0.8) })
    return out
  }

  /** 받아치기(NG!)·노이즈 월: 맞기 전에 가로챔 */
  intercept(att: Fighter, def: Fighter): 'parried' | 'walled' | null {
    const m = def.move
    if (def.state !== 'attack' || !m?.effect) return null
    const active = def.moveFrame >= m.startup && def.moveFrame < m.startup + m.active
    if (!active) return null
    if (m.effect === 'parry') {
      // NG! 공격을 끊고 상대를 1초 전 자리로 되감기
      const p = this.host.posAgo(att.idx, 50)
      att.move = null; att.setState('hit'); att.stun = 46; att.vx = 0
      att.x = p.x; att.y = Math.max(0, p.y)
      def.move = null; def.setState('idle'); def.invuln = 8
      this.evt(def.idx, 'parry', (att.x + def.x) / 2)
      return 'parried'
    }
    if (m.effect === 'noisewall') {
      if (def.char.trait === 'rec') def.trait.res = Math.min(100, def.trait.res + 12)
      this.evt(def.idx, 'noisewall', (att.x + def.x) / 2)
      return 'walled'
    }
    return null
  }

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
    if (def.char.trait === 'rec') t.res = Math.min(100, t.res + (blocked ? 6 : dmg * 0.32))
    if (def.char.trait === 'wall') t.res = Math.min(100, t.res + (blocked ? 2 : 4))
    if (!blocked) def.trait.focus = 0
  }

  onHit(att: Fighter, def: Fighter, d: Partial<MoveData> & { blind?: number; debuff?: MoveData['debuff'] }, dmg: number, blocked: boolean) {
    const t = att.trait
    if (att.char.trait === 'rec' && !blocked) { t.res = Math.min(100, t.res + 2); if (dmg >= 12 && d.id !== 'trait') this.echoes.push({ att: att.idx, dmg: Math.max(1, Math.round(dmg * 0.15)), t: 30 }) }
    if (att.char.trait === 'wall') t.res = Math.min(100, t.res + (blocked ? 3 : 7))
    if (att.char.trait === 'makeup' && !blocked) t.res = Math.min(100, t.res + 3)
    if (att.char.trait === 'light' && d.expose) { const v = (blocked ? d.expose / 3 : d.expose) * (t.gel > 0 ? 2 : 1); if (t.gel > 0 && !blocked) t.gel--; this.addExpose(att, v) }
    if (!blocked) {
      const db = d.debuff ?? (d.blind ? { blind: d.blind } : undefined)
      if (db?.blind) { def.blind = Math.max(def.blind, db.blind); this.evt(def.idx, 'blind', def.x) }
      if (db?.slow) { def.slowT = Math.max(def.slowT, db.slow); this.evt(def.idx, 'slow', def.x) }
      if (db?.bleed) { def.bleed = Math.max(def.bleed, db.bleed); this.evt(def.idx, 'bleed', def.x) }
    }
  }

  private addExpose(g: Fighter, v: number) {
    const t = g.trait
    if (t.immune > 0) return
    t.expose = Math.min(100, t.expose + v)
  }

  onMoveStart(f: Fighter, id: string) {
    if (f.char.trait === 'lens' && f.trait.lens === 2) f.trait.focus = 0
    const o = this.opp(f)
    const m = f.char.moves[id]
    if (o.char.trait === 'copy' && f.char.trait !== 'copy' && m && copyable(m) && Math.abs(o.x - f.x) < 520) {
      const key = `${f.char.id}:${id}`
      const t = o.trait
      t.lastSeen = key
      t.observe[key] = (t.observe[key] ?? 0) + 1
      if (t.observe[key] >= 2 && !t.slots.includes(key)) this.learn(o, key, false)
      else this.evt(o.idx, 'observe', o.x, t.observe[key])
    }
  }

  private learn(actor: Fighter, key: string, improv: boolean) {
    const [cid] = key.split(':')
    const o = this.opp(actor)
    if (o.char.id !== cid) return
    const t = actor.trait
    if (!t.slots.includes(key)) { t.slots.push(key); if (t.slots.length > 2) t.slots.shift() }
    t.slots.forEach((k, i) => {
      const [c2, m2] = k.split(':')
      const s = c2 === o.char.id ? o.char.moves[m2] : null
      if (s) actor.char.moves[`copy${i + 1}`] = copyMove(s, `copy${i + 1}`, c2, 0.85)
    })
    this.evt(actor.idx, improv ? 'improv' : 'learn', actor.x, t.slots.indexOf(key) + 1)
  }

  private buildCopyUlt(f: Fighter) {
    const o = this.opp(f)
    const s = o.char.moves.R
    if (s && o.char.trait !== 'copy') f.char.moves.copyR = { ...copyMove(s, 'copyR', o.char.id, 1.1), cost: 100, name: `명연기: ${s.name}`, ult: s.ult ? { ...s.ult, total: Math.round(s.ult.total * 1.1) } : undefined }
  }

  // ───────────── 매 프레임 ─────────────
  tick() {
    const fs = this.host.fighters
    for (const f of fs) {
      const t = f.trait
      const o = this.opp(f)
      if (f.blind > 0) f.blind--
      if (f.bleed > 0) { f.bleed--; if (f.bleed % 20 === 0 && f.hp > 1) { f.hp = Math.max(1, f.hp - 3); this.evt(f.idx, 'bleedTick', f.x, 3) } }
      if (f.char.trait === 'lens') {
        if (t.lens === 2 && f.grounded && (f.state === 'idle' || f.state === 'crouch' || f.state === 'guard')) t.focus = Math.min(100, t.focus + 1.6)
        else if (['walk', 'run', 'dash', 'jump'].includes(f.state)) t.focus = Math.max(0, t.focus - 4)
        if (t.lens !== 2) t.focus = 0
      }
      if (f.char.trait === 'wall') t.res = Math.min(100, t.res + 0.07)
      if (f.char.trait === 'makeup') { t.res = Math.min(100, t.res + 0.03); if (t.mode > 0) t.mode-- }
      // 연출 콘티: 밟으면 묶임
      if (t.traps.length && o.grounded && o.invuln <= 0 && o.snare <= 0) {
        const hit = t.traps.find((x) => Math.abs(o.x - x) < 15)
        if (hit != null) {
          t.traps = t.traps.filter((x) => x !== hit)
          o.snare = 60
          this.host.hitDirect(f, o, { name: '콘티 밟음', damage: 18, hitstun: 14, kbX: 0 }, { unblockable: true })
          this.evt(f.idx, 'snare', hit)
        }
      }
      if (f.char.trait === 'light') {
        if (t.immune > 0) t.immune--
        if (t.spot > 0) { t.spot--; if (o.state !== 'guard') this.addExpose(f, 0.55) }
        if (t.expose >= 100 && o.grounded && o.hp > 0 && o.state !== 'knockdown' && o.state !== 'knockback') {
          o.move = null; o.setState('hit'); o.stun = 90; o.dizzy = 90; o.vx = 0
          t.expose = 0; t.immune = 240
          this.evt(f.idx, 'stun', o.x)
        }
      }
    }
    this.tickExtras()
    // 지연 공격: 피드백 기둥·탑라이트·소파·붕괴
    for (const d of this.delayed) {
      if (--d.t > 0 || d.landed) continue
      d.landed = true; d.t = d.kind === 'sofa' ? 50 : 14
      const att = fs[d.owner], def = fs[1 - d.owner]
      this.evt(d.owner, d.kind, d.x)
      const near = Math.abs(def.x - d.x) < (d.kind === 'sofa' ? 30 : 24)
      if (!near) continue
      if (d.kind === 'pillar') this.host.hitDirect(att, def, { name: '피드백 기둥', damage: 32, chip: 6, hitstun: 22, blockstun: 14, kbX: 0.5, kbY: 5.5 }, { fromX: d.x })
      if (d.kind === 'toplight') this.host.hitDirect(att, def, { name: '탑라이트', damage: 36, chip: 6, hitstun: 24, blockstun: 14, kbX: 0.5, kbY: 3, overhead: true, expose: 24 }, { fromX: d.x })
      if (d.kind === 'sofa') this.host.hitDirect(att, def, { name: '소파 드롭', damage: 78, chip: 12, hitstun: 30, blockstun: 18, kbX: 1.5, kbY: 3, overhead: true, finisher: true, groundBounce: true }, { fromX: d.x })
      if (d.kind === 'collapse') this.host.hitDirect(att, def, { name: '세트 붕괴', damage: 54, chip: 10, hitstun: 26, blockstun: 16, kbX: 2, kbY: 4, overhead: true }, { fromX: d.x })
    }
    this.delayed = this.delayed.filter((d) => !d.landed || d.t-- > 0)
    // 장판: 우퍼(지속 피해+느려짐)·바닥 조명(노출)·독 안개(분장)
    for (const fl of this.fields) {
      fl.t--; fl.tick++
      const att = fs[fl.owner], def = fs[1 - fl.owner]
      if (Math.abs(def.x - fl.x) > fl.w / 2 || def.y > 30) continue
      if (fl.kind === 'woofer' && fl.tick % 15 === 0 && def.hp > 1) { def.hp = Math.max(1, def.hp - 4); def.slowT = Math.max(def.slowT, 20); this.evt(fl.owner, 'wooferTick', def.x) }
      if (fl.kind === 'floorlight') this.addExpose(att, 0.5)
      if (fl.kind === 'poison' && fl.tick % 20 === 0 && def.hp > 1) { def.hp = Math.max(1, def.hp - 3); this.evt(fl.owner, 'bleedTick', def.x, 3) }
    }
    this.fields = this.fields.filter((f) => f.t > 0)
    for (const e of this.echoes) {
      if (--e.t > 0) continue
      const def = fs[1 - e.att]
      if (def.hp > 1) { def.hp = Math.max(1, def.hp - e.dmg); this.evt(e.att, 'reverb', def.x, e.dmg) }
    }
    this.echoes = this.echoes.filter((e) => e.t > 0)
    for (const r of this.reflectors) r.t--
    this.reflectors = this.reflectors.filter((r) => r.t > 0)
    // 밀려가는 세트벽
    for (const w of this.walls) if (w.vx) {
      w.x += w.vx
      const def = fs[1 - w.owner]
      if (Math.abs(def.x - w.x) < 16 && def.y < w.h) { this.host.hitDirect(fs[w.owner], def, { name: '세트벽 밀기', damage: 52, chip: 8, hitstun: 24, blockstun: 14, kbX: 6, kbY: 3, wallBounce: true }, { fromX: w.x - w.vx * 4 }); w.hp = 0; this.evt(w.owner, 'wallbreak', w.x) }
      if (w.x < 20 || w.x > STAGE_W - 20) w.hp = 0
    }
    for (const w of this.walls) w.t--
    for (const b of this.boxes) b.t--
    this.walls = this.walls.filter((w) => w.t > 0 && w.hp > 0)
    this.boxes = this.boxes.filter((b) => b.t > 0 && b.hp > 0)
  }

  /** 엑스트라: 상대에게 걸어가 주먹질, "액션!"이면 몸통 박치기 */
  private tickExtras() {
    const fs = this.host.fighters
    for (const e of this.extras) {
      const att = fs[e.owner], def = fs[1 - e.owner]
      e.t--
      if (e.y > 0 || e.vy > 0) { e.vy -= 0.35; e.y = Math.max(0, e.y + e.vy); if (e.y === 0) { e.vy = 0; if (Math.abs(def.x - e.x) < 26 && !e.hit) { e.hit = true; this.host.hitDirect(att, def, { name: '엑스트라 낙하', damage: 40, chip: 6, hitstun: 22, blockstun: 14, kbX: 1.5, kbY: 3.5, overhead: true }, { fromX: e.x }) } } continue }
      const dir = def.x >= e.x ? 1 : -1
      if (e.lunge > 0) {
        e.lunge--; e.x = clampX(e.x + dir * 4.6)
        if (!e.hit && Math.abs(def.x - e.x) < 22) { e.hit = true; this.host.hitDirect(att, def, { name: '엑스트라 박치기', damage: 34, chip: 6, hitstun: 24, blockstun: 14, kbX: 3, kbY: 4.5 }, { fromX: e.x - dir * 10 }) }
        continue
      }
      if (e.cd > 0) e.cd--
      if (Math.abs(def.x - e.x) > 24) e.x = clampX(e.x + dir * 1.3)
      else if (e.cd <= 0) { e.cd = 55; this.host.hitDirect(att, def, { name: '엑스트라 주먹', damage: 14, chip: 2, hitstun: 18, blockstun: 10, kbX: 1.2 }, { fromX: e.x }); this.evt(e.owner, 'extraPunch', e.x) }
    }
    this.extras = this.extras.filter((e) => e.t > 0)
  }

  /** 공격 판정이 엑스트라·구조물에 닿으면 (엑스트라는 한 방에 퇴장) */
  hitWalls(att: Fighter, hb: { x: number; y: number; w: number; h: number }) {
    const before = this.extras.length
    this.extras = this.extras.filter((e) => e.owner === att.idx || !(hb.x < e.x + 8 && hb.x + hb.w > e.x - 8 && hb.y < e.y + 40))
    if (this.extras.length < before) this.evt(1 - att.idx, 'extraDown', hb.x + hb.w / 2)
    if (att.hitWallThisMove) return
    for (const w of this.walls) if (w.owner !== att.idx && hb.x < w.x + WALL_HALF && hb.x + hb.w > w.x - WALL_HALF && hb.y < w.h) { att.hitWallThisMove = true; w.hp--; this.evt(w.owner, w.hp <= 0 ? 'wallbreak' : 'wallhit', w.x, w.hp); break }
    for (const b of this.boxes) if (b.owner !== att.idx && hb.x < b.x + b.w / 2 && hb.x + hb.w > b.x - b.w / 2 && hb.y < b.y + b.h && hb.y + hb.h > b.y) { att.hitWallThisMove = true; b.hp--; this.evt(b.owner, b.hp <= 0 ? 'wallbreak' : 'wallhit', b.x, b.hp); break }
    this.walls = this.walls.filter((w) => w.hp > 0); this.boxes = this.boxes.filter((b) => b.hp > 0)
  }

  blocksProjectile(owner: number, x: number, y: number) {
    for (const w of this.walls) {
      if (w.owner === owner || y >= w.h) continue
      if (Math.abs(x - w.x) < WALL_HALF + 6) { w.hp--; this.evt(w.owner, w.hp <= 0 ? 'wallbreak' : 'wallhit', w.x, w.hp); this.walls = this.walls.filter((q) => q.hp > 0); return true }
    }
    const ex = this.extras.find((e) => e.owner !== owner && Math.abs(x - e.x) < 10 && y < e.y + 40)
    if (ex) { this.extras = this.extras.filter((e) => e !== ex); this.evt(1 - owner, 'extraDown', ex.x); return true }
    const d = this.host.fighters[1 - owner]
    const m = d.move
    if (m?.effect === 'noisewall' && d.state === 'attack' && d.moveFrame >= m.startup && d.moveFrame < m.startup + m.active && Math.abs(x - (d.x + d.facing * 24)) < 30) {
      if (d.char.trait === 'rec') d.trait.res = Math.min(100, d.trait.res + 12)
      this.evt(d.idx, 'noisewall', x)
      return true
    }
    return false
  }

  /** 발밑 높이: 스테이지 발판 + 미술 구조물 (위에서 내려올 때만 올라섬) */
  floorAt(f: Fighter): number {
    let best = 0
    const consider = (x: number, w: number, top: number) => {
      if (Math.abs(f.x - x) >= w / 2 + 3) return
      if (f.dropFrom >= 0 && top >= f.dropFrom - 1) return
      if (f.y >= top - 7 && top > best) best = top
    }
    for (const p of this.host.platforms) consider(p.x, p.w, p.y)
    for (const b of this.boxes) consider(b.x, b.w, b.y + b.h)
    return best
  }

  physics(prevX: [number, number]) {
    for (const w of this.walls) for (const f of this.host.fighters) {
      if (f.y >= w.h) continue
      const half = f.char.hurt.w / 2 + WALL_HALF
      if (Math.abs(f.x - w.x) >= half) continue
      const side = prevX[f.idx] < w.x ? -1 : prevX[f.idx] > w.x ? 1 : (f.x < w.x ? -1 : 1)
      const speed = Math.abs(f.vx)
      f.x = w.x + side * half
      if (f.state === 'knockback' && !f.wallBounced && speed > 1.2) {
        f.wallBounced = true
        f.vx = side * Math.max(1.8, speed * 0.6)
        f.vy = Math.max(f.vy, 4); f.y = Math.max(f.y, 0.01)
        f.juggles = Math.max(0, f.juggles - 1)
        w.hp--
        this.evt(w.owner, 'wallbounce', w.x, w.hp)
      } else f.vx = 0
    }
    this.walls = this.walls.filter((w) => w.hp > 0)
  }

  speedMul(f: Fighter) {
    if (f.char.trait === 'lens') return [1.3, 1, 0.7][f.trait.lens]
    if (f.char.trait === 'makeup' && f.trait.mode > 0) return 1.15
    return 1
  }

  resetRound() {
    this.walls = []; this.boxes = []; this.extras = []; this.delayed = []; this.fields = []; this.echoes = []; this.reflectors = []
    for (const f of this.host.fighters) {
      const t = f.trait
      const keep = { lens: t.lens, role: t.role, slots: t.slots, observe: t.observe, res: f.char.trait === 'rec' ? t.res * 0.5 : undefined }
      f.trait = newTraitState(f.char.trait)
      Object.assign(f.trait, { lens: keep.lens, role: keep.role, slots: keep.slots, observe: keep.observe })
      if (keep.res != null) f.trait.res = keep.res
    }
  }

  // ───────────── HUD ─────────────
  gauge(f: Fighter): { v: number; text: string; color: number } {
    const t = f.trait
    switch (f.char.trait) {
      case 'lens': return { v: t.lens === 2 ? t.focus / 100 : 0, text: `${LENSES[t.lens].name}${t.lens === 2 ? (t.focus >= 100 ? ' ◎풀초점' : ` 초점 ${Math.round(t.focus)}`) : ''}`, color: t.focus >= 100 ? 0xff5470 : 0x5eead4 }
      case 'mark': { const n = this.extras.filter((e) => e.owner === f.idx).length; return { v: t.traps.length / 4, text: `콘티 ${t.traps.length} · 엑스트라 ${n}`, color: 0xfacc15 } }
      case 'rec': return { v: t.res / 100, text: `사운드 ${Math.round(t.res)}`, color: t.res >= 60 ? 0xff5470 : 0x86efac }
      case 'light': return { v: t.expose / 100, text: t.immune > 0 ? '노출 (면역)' : `상대 노출 ${Math.round(t.expose)}${t.gel > 0 ? ` · 젤×${t.gel}` : ''}${t.spot > 0 ? ' · 스폿' : ''}`, color: 0xfde68a }
      case 'wall': return { v: t.res / 100, text: `제작 ${Math.round(t.res)} · 구조물 ${this.structCount(f)}`, color: 0xd6b27a }
      case 'makeup': return { v: t.res / 100, text: `분장막 ${Math.round(t.res)}${t.mode > 0 ? ` · 크리처 ${Math.ceil(t.mode / 60)}s` : ''}`, color: 0xff7eb6 }
      case 'copy': { const name = (i: number) => f.char.moves[`copy${i}`]?.name ?? '-'; return { v: t.slots.length / 2, text: `${ROLES[t.role].name} · C:${name(1)} →C:${name(2)}`, color: 0x5eead4 } }
    }
    return { v: 0, text: '', color: 0xffffff }
  }
}

function copyMove(s: MoveData, id: string, srcChar: string, k: number): MoveData {
  return {
    ...s, id, copyOf: srcChar, cost: undefined, rank: 0, lvl: 3,
    cd: s.cd ?? 150,
    anim: `${srcChar}:${s.anim ?? s.id}`,
    damage: Math.round(s.damage * k), chip: Math.round(s.chip * k),
    projectile: s.projectile ? { ...s.projectile, damage: Math.round(s.projectile.damage * k) } : undefined,
  }
}

const clampX = (x: number) => Math.max(24, Math.min(STAGE_W - 24, Math.round(x)))

/** 쿨타임 칸: 같은 버튼·방향(모드 변형 포함)은 쿨타임 공유 */
export function cdKey(id: string): string {
  if (id === 'copy1') return 'C_n'
  if (id === 'copy2') return 'C_f'
  return id.split('~')[0]
}
