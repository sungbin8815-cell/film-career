// 직업별 고유 특성 (고유 버튼). 모션만 다른 게 아니라 싸우는 방식이 바뀌는 시스템입니다.
//  촬영 lens   : 렌즈 교체 — 광각(넓고 빠름·약함) / 표준 / 망원(멀리·강함·느림)
//  연출 mark   : 마킹 테이프 — 바닥에 표시 → 멀리서 다시 누르면 "위치로!" 순간이동. 표시 위에서 치면 더 아픔
//  사운드 rec  : REC → 플레이백 — 녹음 중 받은 피해를 모아 음파로 되돌려 줌
//  조명 light  : 조명 설치 — 빛 안에서 조명감독은 슈퍼아머·공격력↑, 상대는 눈부셔서 느려짐
//  미술 wall   : 세트벽 — 투사체·이동을 막고, 날아오는 상대를 튕겨내 추가타 (3번 맞으면 부서짐)
//  분장 makeup : 분장 스택 — 맞힐 때마다 상대에게 분장이 쌓이고, "완성!"으로 한꺼번에 터뜨림 (가드 불가)
import type { Fighter } from './Fighter'
import type { MatchEvent, MoveData, ProjectileSpec } from './types'
import { STAGE_W } from './types'

export type TraitId = 'lens' | 'mark' | 'rec' | 'light' | 'wall' | 'makeup'

export const LENSES = [
  { name: '광각 24mm', short: '24mm' },
  { name: '표준 50mm', short: '50mm' },
  { name: '망원 135mm', short: '135mm' },
] as const

export const TRAIT_INFO: Record<TraitId, { name: string; button: string; desc: string }> = {
  lens: { name: '렌즈 교체', button: '렌즈', desc: '광각: 판정 넓고 빠름, 피해 -15% · 망원: 사거리 +14, 피해 +20%, 발동 +2프레임' },
  mark: { name: '마킹 테이프', button: '마크', desc: '바닥에 표시 → 멀리서 누르면 순간이동. 표시 위에서 공격하면 피해 +15%' },
  rec: { name: 'REC → 플레이백', button: 'REC', desc: '3초 녹음 동안 받은 피해를 모아 큰 음파로 되돌려 줌' },
  light: { name: '조명 설치', button: '조명', desc: '8초 동안 빛 안에서 강한 기술(피해 90 이상)에 슈퍼아머, 빛 안의 상대는 눈부셔서 발동 +2프레임' },
  wall: { name: '세트벽', button: '세트', desc: '앞에 벽을 세움: 투사체·이동 차단, 날아오는 상대는 벽꽝 추가타. 3번 맞으면 부서짐' },
  makeup: { name: '분장 완성', button: '완성', desc: '맞힐 때마다 분장 1겹(최대 5, 4초 지나면 1겹씩 지워짐). 완성!으로 겹당 14 피해, 5겹이면 +16, 가드 불가' },
}

export interface Wall { owner: number; x: number; hp: number; t: number }
export interface Light { x: number; t: number }

/** 한 사람의 특성 상태 */
export interface TraitState {
  cd: number          // 다시 쓰기까지 남은 프레임
  lens: number        // 촬영: 0 광각 1 표준 2 망원
  mark: number | null // 연출: 표시 위치
  rec: number         // 사운드: 녹음 남은 프레임
  recorded: number    // 사운드: 녹음된 피해
  tape: number        // 사운드: 재생 대기 중인 녹음
  light: Light | null // 조명
  stacks: number      // 분장: 상대에게 쌓인 겹 (분장실장 쪽에 기록)
  stackT: number
}
export const newTraitState = (): TraitState => ({ cd: 0, lens: 1, mark: null, rec: 0, recorded: 0, tape: 0, light: null, stacks: 0, stackT: 0 })

/** Match가 구현해 주는 기능 (투사체 생성·직접 타격) */
export interface TraitHost {
  fighters: [Fighter, Fighter]
  events: MatchEvent[]
  spawnProjectile(f: Fighter, p: ProjectileSpec, name: string): void
  hitDirect(att: Fighter, def: Fighter, d: Partial<MoveData> & Pick<MoveData, 'damage' | 'hitstun' | 'kbX' | 'name'>, opts: { unblockable?: boolean }): void
}

const MARK_NEAR = 22
const LIGHT_R = 52
const WALL_H = 46
const WALL_HALF = 6

export class TraitWorld {
  walls: Wall[] = []
  constructor(private host: TraitHost) {}

  private evt(e: Omit<Extract<MatchEvent, { type: 'trait' }>, 'type'>) { this.host.events.push({ type: 'trait', ...e }) }
  private opp(f: Fighter) { return this.host.fighters[1 - f.idx] }

  /** 고유 버튼을 눌렀을 때 낼 기술 (못 쓰면 null) */
  traitMove(f: Fighter): 'trait' | 'trait2' | null {
    const t = f.trait
    switch (f.char.trait) {
      case 'lens': return 'trait'
      case 'mark': return t.mark != null && Math.abs(f.x - t.mark) > MARK_NEAR * 1.2 ? (t.cd <= 0 ? 'trait2' : null) : 'trait'
      case 'rec': return t.tape > 0 || t.rec > 0 ? 'trait2' : t.cd <= 0 ? 'trait' : null
      case 'light': case 'wall': return t.cd <= 0 ? 'trait' : null
      case 'makeup': return t.stacks > 0 && t.cd <= 0 && Math.abs(this.opp(f).x - f.x) < 160 ? 'trait' : null
    }
    return null
  }

  /** 버튼 불 켜기용: 지금 쓸 수 있는지 */
  ready(f: Fighter) { return this.traitMove(f) != null }

  /** 기술 판정 순간에 효과 발동 */
  activate(f: Fighter, id: string) {
    const t = f.trait
    const o = this.opp(f)
    switch (f.char.trait) {
      case 'lens':
        t.lens = (t.lens + 1) % 3
        this.evt({ fighter: f.idx, kind: 'lens', x: f.x, value: t.lens })
        break
      case 'mark':
        if (id === 'trait2' && t.mark != null) {
          const from = f.x
          f.x = t.mark; f.invuln = Math.max(f.invuln, 10); t.cd = 150
          f.facing = o.x >= f.x ? 1 : -1
          this.evt({ fighter: f.idx, kind: 'teleport', x: f.x, value: from })
        } else {
          t.mark = Math.round(f.x)
          this.evt({ fighter: f.idx, kind: 'mark', x: t.mark })
        }
        break
      case 'rec':
        if (id === 'trait2') {
          const got = t.rec > 0 ? t.recorded : t.tape
          const power = Math.round(30 + Math.min(200, got * 0.9))
          const big = power >= 100
          this.host.spawnProjectile(f, { kind: 'wave', offsetX: 28, startY: 8, vx: 4.6, vy: 0, w: 24, h: big ? 56 : 36, life: 80, damage: power, chip: Math.round(power * 0.15), hitstun: 24, blockstun: 16, kbX: big ? 4 : 2.4, kbY: big ? 4.5 : undefined }, '플레이백')
          this.evt({ fighter: f.idx, kind: 'playback', x: f.x, value: power })
          t.rec = 0; t.recorded = 0; t.tape = 0; t.cd = 240
        } else {
          t.rec = 180; t.recorded = 0
          this.evt({ fighter: f.idx, kind: 'rec', x: f.x })
        }
        break
      case 'light':
        t.light = { x: clampX(f.x + f.facing * 12), t: 480 }; t.cd = 540
        this.evt({ fighter: f.idx, kind: 'light', x: t.light.x })
        break
      case 'wall': {
        this.walls = this.walls.filter((w) => w.owner !== f.idx)
        const x = clampX(f.x + f.facing * 32)
        this.walls.push({ owner: f.idx, x, hp: 3, t: 900 }); t.cd = 240
        this.evt({ fighter: f.idx, kind: 'wall', x })
        break
      }
      case 'makeup': {
        const n = t.stacks
        if (n <= 0) break
        this.host.hitDirect(f, o, { name: `분장 완성 ×${n}`, damage: 14 * n + (n >= 5 ? 16 : 0), hitstun: 14 + n * 4, kbX: 1.5 + n * 0.4, kbY: n >= 4 ? 4 : undefined, finisher: n >= 3 }, { unblockable: true })
        this.evt({ fighter: f.idx, kind: 'detonate', x: o.x, value: n })
        t.stacks = 0; t.cd = 240
        break
      }
    }
  }

  /** 기술을 시작할 때 특성에 따라 기술을 고친 사본을 돌려줌 */
  modifyMove(f: Fighter, m: MoveData): MoveData {
    if (m.id.startsWith('trait')) return m
    let out: MoveData = m
    const t = f.trait
    const edit = (fn: (x: MoveData) => void) => { if (out === m) out = { ...m, hitbox: { ...m.hitbox }, projectile: m.projectile ? { ...m.projectile } : undefined }; fn(out) }
    if (f.char.trait === 'lens') {
      if (t.lens === 0) edit((x) => {
        x.startup = Math.max(2, x.startup - 1); x.damage = Math.round(x.damage * 0.85); x.chip = Math.round(x.chip * 0.85); x.hitstun += 2
        x.hitbox.x -= 4; x.hitbox.w = Math.round(x.hitbox.w * 1.35 + 4); x.hitbox.y = Math.max(0, x.hitbox.y - 4); x.hitbox.h = Math.round(x.hitbox.h * 1.3)
        if (x.projectile) { x.projectile.damage = Math.round(x.projectile.damage * 0.85); x.projectile.offsetX = Math.round(x.projectile.offsetX * 0.7); x.projectile.w += 8 }
      })
      if (t.lens === 2) edit((x) => {
        x.startup += 2; x.damage = Math.round(x.damage * 1.2); x.chip = Math.round(x.chip * 1.2)
        if (x.hitbox.w > 0) { x.hitbox.x += 14; x.hitbox.h = Math.round(x.hitbox.h * 0.85) }
        if (x.projectile) { x.projectile.damage = Math.round(x.projectile.damage * 1.2); x.projectile.offsetX = Math.round(x.projectile.offsetX * 1.5); x.projectile.vx *= 1.3 }
      })
    }
    if (f.char.trait === 'mark' && t.mark != null && Math.abs(f.x - t.mark) <= MARK_NEAR) edit((x) => { x.damage = Math.round(x.damage * 1.15); x.hitstun += 3; if (x.projectile) x.projectile.damage = Math.round(x.projectile.damage * 1.15) })
    if (f.char.trait === 'light' && t.light && Math.abs(f.x - t.light.x) <= LIGHT_R) edit((x) => {
      if (x.damage >= 90) x.armor = 1
    })
    // 상대 조명 안에 있으면 눈부심: 발동이 느려짐
    const o = this.opp(f)
    if (o.char.trait === 'light' && o.trait.light && Math.abs(f.x - o.trait.light.x) <= LIGHT_R) edit((x) => { x.startup += 2 })
    return out
  }

  /** 맞았을 때 (막은 피해 포함) */
  onDamaged(def: Fighter, dmg: number) {
    if (def.char.trait === 'rec' && def.trait.rec > 0) def.trait.recorded += dmg
  }

  /** 제대로 맞혔을 때 */
  onHit(att: Fighter, moveId?: string) {
    if (att.char.trait === 'makeup' && moveId && !moveId.startsWith('trait')) {
      att.trait.stacks = Math.min(5, att.trait.stacks + 1); att.trait.stackT = 240
    }
  }

  /** 매 프레임 타이머 */
  tick() {
    for (const f of this.host.fighters) {
      const t = f.trait
      if (t.cd > 0) t.cd--
      if (t.rec > 0 && --t.rec === 0) { t.tape = t.recorded; if (t.tape <= 0) t.cd = 90; this.evt({ fighter: f.idx, kind: 'recEnd', x: f.x, value: t.tape }) }
      if (t.light && --t.light.t <= 0) t.light = null
      if (t.stacks > 0 && --t.stackT <= 0) { t.stacks--; t.stackT = 240 }
    }
    for (const w of this.walls) w.t--
    this.walls = this.walls.filter((w) => w.t > 0 && w.hp > 0)
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
        // 벽꽝! 반대로 튕기고 한 번 더 때릴 틈
        f.wallBounced = true
        f.vx = side * Math.max(1.6, speed * 0.55)
        f.vy = Math.max(f.vy, 3.4); f.y = Math.max(f.y, 0.01)
        f.juggles = Math.max(0, f.juggles - 1)
        w.hp--
        this.evt({ fighter: w.owner, kind: 'wallbounce', x: w.x, value: w.hp })
      } else f.vx = 0
    }
    this.walls = this.walls.filter((w) => w.hp > 0)
  }

  /** 공격 판정이 남의 세트벽에 닿으면 벽이 깎임 (기술마다 한 번) */
  hitWalls(att: Fighter, hb: { x: number; y: number; w: number; h: number }) {
    for (const w of this.walls) {
      if (w.owner === att.idx || att.hitWallThisMove) continue
      if (hb.x < w.x + WALL_HALF && hb.x + hb.w > w.x - WALL_HALF && hb.y < WALL_H) {
        att.hitWallThisMove = true
        w.hp--
        this.evt({ fighter: w.owner, kind: w.hp <= 0 ? 'wallbreak' : 'wallhit', x: w.x, value: w.hp })
      }
    }
    this.walls = this.walls.filter((w) => w.hp > 0)
  }

  /** 상대 투사체가 세트벽에 막히는지 */
  blocksProjectile(owner: number, x: number, y: number) {
    for (const w of this.walls) {
      if (w.owner === owner || y >= WALL_H) continue
      if (Math.abs(x - w.x) < WALL_HALF + 6) {
        w.hp--
        this.evt({ fighter: w.owner, kind: w.hp <= 0 ? 'wallbreak' : 'wallhit', x: w.x, value: w.hp })
        this.walls = this.walls.filter((q) => q.hp > 0)
        return true
      }
    }
    return false
  }

  resetRound() {
    this.walls = []
    for (const f of this.host.fighters) { const lens = f.trait.lens; f.trait = newTraitState(); f.trait.lens = lens }
  }

  /** HUD 글자 */
  label(f: Fighter): string {
    const t = f.trait
    const cd = t.cd > 0 ? ` (${Math.ceil(t.cd / 60)}s)` : ''
    switch (f.char.trait) {
      case 'lens': return `렌즈 ${LENSES[t.lens].name}`
      case 'mark': return t.mark == null ? '마크 없음' : `마크 있음${cd}`
      case 'rec': return t.rec > 0 ? `● REC ${(t.rec / 60).toFixed(1)}s · ${t.recorded}` : t.tape > 0 ? `▶ 재생 대기 ${t.tape}` : `녹음 대기${cd}`
      case 'light': return t.light ? `조명 ON ${Math.ceil(t.light.t / 60)}s` : `조명 OFF${cd}`
      case 'wall': { const w = this.walls.find((q) => q.owner === f.idx); return w ? `세트벽 ${'■'.repeat(w.hp)}${'□'.repeat(3 - w.hp)}` : `세트벽 없음${cd}` }
      case 'makeup': return `분장 ${'●'.repeat(t.stacks)}${'○'.repeat(5 - t.stacks)}${cd}`
    }
    return ''
  }
}

const clampX = (x: number) => Math.max(24, Math.min(STAGE_W - 24, Math.round(x)))

/** CPU가 고유 버튼을 누를지 (상황 판단) */
export function aiWantsTrait(me: Fighter, opp: Fighter, r: () => number): boolean {
  const w = me.world
  if (!w || !w.ready(me)) return false
  const t = me.trait
  const dist = Math.abs(opp.x - me.x)
  switch (me.char.trait) {
    // 멀면 망원, 붙으면 광각으로
    case 'lens': return (dist > 100 && t.lens !== 2) || (dist < 40 && t.lens !== 0) ? r() < 0.5 : false
    // 표시가 없으면 깔고, 상대가 표시 근처에 있고 내가 멀면 순간이동
    case 'mark': return t.mark == null ? r() < 0.4 : Math.abs(opp.x - t.mark) < 50 && dist > 90 ? r() < 0.6 : false
    // 상대가 다가오면 녹음 시작, 많이 모였으면 재생
    case 'rec': return t.rec > 0 ? t.recorded >= 60 && r() < 0.5 : t.tape > 0 ? r() < 0.7 : dist < 90 && r() < 0.3
    case 'light': return dist > 60 && r() < 0.5
    case 'wall': return dist > 80 && r() < 0.35
    case 'makeup': return (t.stacks >= 3 || (t.stacks >= 1 && opp.hp < 150)) && dist < 120 && r() < 0.8
  }
  return false
}
