// 상태 기반 AI. 플레이어와 같은 InputState를 만들어 넣습니다(=치트 없음).
// 캐릭터 데이터(기술 칸·커맨드)를 읽어 "지금 거리에서 닿는 기술"을 고르고,
// 커맨드는 실제 입력 순서(↓→C, 대시 C 등)를 프레임 단위로 흉내 냅니다.
// 캐릭터마다 선호 거리·특성 사용 습관이 달라 플레이 스타일이 갈립니다.
import type { Fighter } from './Fighter'
import type { Button, CharacterData, InputState, MoveData, Tok } from './types'
import { emptyInput } from './types'
import { cdKey } from './Traits'

export type Difficulty = 'easy' | 'normal' | 'hard'

const PARAM: Record<Difficulty, { think: number; react: number; guard: number; combo: number; special: number; aggro: number; afterHitGuard: number; cmd: number }> = {
  //        생각 간격  반응(프레임)  가드 확률  이어치기  특성·직업기  공격성  맞은 뒤 가드  커맨드 사용
  easy:   { think: 32, react: 14, guard: 0.25, combo: 0.2,  special: 0.25, aggro: 0.4,  afterHitGuard: 0.15, cmd: 0.25 },
  normal: { think: 24, react: 11, guard: 0.4,  combo: 0.45, special: 0.45, aggro: 0.5,  afterHitGuard: 0.35, cmd: 0.5 },
  hard:   { think: 9,  react: 5,  guard: 0.8,  combo: 0.9,  special: 0.75, aggro: 0.75, afterHitGuard: 0.75, cmd: 0.85 },
}

type Key = keyof InputState
const BTN_KEY: Record<Button, Key> = { A: 'light', B: 'heavy', C: 'special', D: 'trait', R: 'super' }

/** 입력 스크립트 한 칸: 한 프레임 입력, 또는 "지금 기술이 맞거나 판정이 끝날 때까지 대기" */
type Inp = Partial<Record<Key | 'fwd' | 'back', boolean>>
export type Frame = { inp: Inp } | { chain: true }

interface Option {
  id: string                 // 기술 id (칸 또는 커맨드 기술)
  frames: Frame[]
  lo: number; hi: number     // 닿는 거리 (몸 중심끼리)
  setup: boolean             // 피해 없는 설치·버프 기술
  cmd: boolean
  air: boolean
}

/** 선호 거리 (캐릭터별 플레이 스타일) */
function prefDist(me: Fighter): number {
  switch (me.char.id) {
    case 'dp': return [70, 140, 380][me.trait.lens] ?? 140
    case 'director': return 210
    case 'sound': return 170
    case 'gaffer': return 270
    case 'art': return 150
    case 'makeup': return me.trait.mode > 0 ? 70 : 110
    case 'actor': return me.trait.role === 2 ? 120 : 75
    default: return 110
  }
}

/** 기술이 닿는 거리 추정 */
function reach(m: MoveData, c: CharacterData): { lo: number; hi: number; setup: boolean } {
  if (m.projectile) {
    const p = m.projectile
    if (p.atTarget) return { lo: 0, hi: 9999, setup: false }
    return { lo: 0, hi: Math.min(1000, p.offsetX + Math.abs(p.vx) * p.life + p.w / 2), setup: false }
  }
  const hb = m.hitbox
  if (hb.w <= 0) return { lo: 0, hi: 9999, setup: true }
  const travel = (m.dash ?? 0) * (m.startup + m.active * 0.5)
  const hold = m.hold ? hb.w * (m.hold.reach - 1) * 0.6 : 0
  const half = c.hurt.w / 2
  return { lo: Math.max(0, hb.x - half), hi: hb.x + hb.w + travel + hold + half, setup: false }
}

/** 방향+버튼 칸 → 입력 프레임 */
function slotFrames(slot: string, btn: Button): Frame[] | null {
  const k = BTN_KEY[btn]
  const press = (extra: Inp = {}): Frame[] => [{ inp: { ...extra, [k]: true } }, { inp: { ...extra, [k]: true } }]
  const dir = slot.split('_')[1] ?? 'n'
  const jump: Frame[] = [{ inp: { up: true } }, ...Array.from({ length: 9 }, () => ({ inp: {} }))]
  switch (dir) {
    case 'n': return press()
    case 'f': return press({ fwd: true })
    case 'b': return press({ back: true })
    case 'u': return press({ up: true })
    case 'd': return press({ down: true })
    case 'air': return [...jump, ...press()]
    case 'aird': return [...jump, ...press({ down: true })]
    case 'dash': return [{ inp: { fwd: true } }, { inp: {} }, { inp: { fwd: true } }, ...Array.from({ length: 5 }, () => ({ inp: { fwd: true } })), ...press({ fwd: true })]
    default: return null
  }
}

/** 커맨드 토큰 → 입력 프레임 (방향 엣지가 생기도록 사이사이 떼기) */
function cmdFrames(seq: Tok[], air: boolean): Frame[] {
  const out: Frame[] = []
  if (air) out.push({ inp: { up: true } }, ...Array.from({ length: 8 }, () => ({ inp: {} })))
  let lastDir: string | null = null
  let lastBtn = false
  for (let i = 0; i < seq.length; i++) {
    const t = seq[i]
    const next = seq[i + 1]
    const isBtn = t === 'A' || t === 'B' || t === 'C' || t === 'D' || t === 'R'
    if (isBtn) {
      if (lastBtn) out.push({ chain: true })
      const k = BTN_KEY[t as Button]
      const hold = lastDir ? { [lastDir]: true } : {}
      out.push({ inp: { ...hold, [k]: true } }, { inp: { ...hold, [k]: true } })
      lastBtn = true; lastDir = null
      continue
    }
    lastBtn = false
    const dk = ({ f: 'fwd', b: 'back', u: 'up', d: 'down' } as Record<string, string>)[t]
    if (dk) {
      if (lastDir === dk) out.push({ inp: {} })
      // 바로 뒤가 버튼이면 방향을 누른 채 버튼 (↓+C 등). 위(점프)는 버튼과 같은 프레임에
      if (dk === 'up' && next && next.length === 1 && 'ABCDR'.includes(next)) { lastDir = 'up'; continue }
      out.push({ inp: { [dk]: true } })
      lastDir = dk
      continue
    }
    lastDir = null
    if (t === 'dash') out.push({ inp: { fwd: true } }, { inp: {} }, { inp: { fwd: true } }, { inp: { fwd: true } }, { inp: { fwd: true } }, { inp: { fwd: true } })
    else if (t === 'bs') out.push({ inp: { back: true } }, { inp: {} }, { inp: { back: true } }, ...Array.from({ length: 13 }, () => ({ inp: {} })))
    else if (t === 'jump') out.push({ inp: { up: true } }, ...Array.from({ length: 8 }, () => ({ inp: {} })))
    else if (t === 'airdash') out.push({ inp: { fwd: true } }, { inp: {} }, { inp: { fwd: true } }, { inp: {} }, { inp: {} })
  }
  return out
}

const optionCache = new WeakMap<CharacterData, Option[]>()
function optionsFor(c: CharacterData): Option[] {
  const hit = optionCache.get(c)
  if (hit) return hit
  const opts: Option[] = []
  for (const [id, m] of Object.entries(c.moves)) {
    if (id.includes('~') || id.startsWith('copy')) continue
    const btn = id[0] as Button
    if (!'ABCDR'.includes(btn)) continue
    const frames = id === 'R' ? slotFrames('R_n', 'R') : slotFrames(id, btn)
    if (!frames) continue
    const r = reach(m, c)
    opts.push({ id, frames, ...r, cmd: false, air: id.endsWith('_air') || id.endsWith('_aird') })
  }
  for (const cmd of c.commands) {
    const m = c.moves[cmd.move]
    if (!m) continue
    opts.push({ id: cmd.move, frames: cmdFrames(cmd.seq, !!cmd.air), ...reach(m, c), cmd: true, air: !!cmd.air })
  }
  optionCache.set(c, opts)
  return opts
}

export class SimpleAI {
  private script: Frame[] = []
  private nextThink = 30
  private guardT = 0
  private moveT = 0
  private moveDir: 'fwd' | 'back' | null = null
  private seenOppMove = -1
  private wasHit = false
  private readonly p: (typeof PARAM)[Difficulty]

  constructor(readonly difficulty: Difficulty = 'normal', private rng: () => number = Math.random) { this.p = PARAM[difficulty] }

  input(me: Fighter, opp: Fighter, frame: number): InputState {
    const inp = emptyInput()
    const dx = opp.x - me.x
    const dist = Math.abs(dx)
    const fwdKey: 'left' | 'right' = dx >= 0 ? 'right' : 'left'
    const backKey: 'left' | 'right' = dx >= 0 ? 'left' : 'right'
    const r = this.rng

    // 1) 상대 기술을 보고 반응 → 가드 (기술마다 한 번만 판단)
    const moveStart = opp.frame - opp.moveFrame
    if (opp.state === 'attack' && opp.move && opp.moveFrame >= this.p.react && this.seenOppMove !== moveStart) {
      this.seenOppMove = moveStart
      const rr = reach(opp.move, opp.char)
      if (dist < rr.hi + 30 && me.neutral && !this.script.length && r() < this.p.guard) this.guardT = opp.move.startup + opp.move.active + 6
    }
    if (me.inHitstun) { this.wasHit = true; this.script = [] }
    else if (this.wasHit) { this.wasHit = false; if (r() < this.p.afterHitGuard) this.guardT = 20 }

    // 2) 내 기술이 맞았으면 이어서 캔슬 (다음 레벨 버튼)
    if (!this.script.length && me.state === 'attack' && me.hitConfirmed && r() < this.p.combo / 4) {
      const lvl = me.move?.lvl ?? (me.move?.id.startsWith('A') ? 1 : me.move?.id.startsWith('B') ? 2 : 3)
      const nextBtn: Button = lvl <= 1 ? (r() < 0.5 ? 'A' : 'B') : lvl === 2 ? (r() < 0.5 ? 'C' : 'D') : me.meter >= 100 && r() < 0.5 ? 'R' : 'C'
      const k = BTN_KEY[nextBtn]
      const dir = r() < 0.4 ? { fwd: true } : r() < 0.3 ? { down: true } : {}
      this.script = [{ inp: { ...dir, [k]: true } }, { inp: { ...dir, [k]: true } }]
    }

    // 3) 평소 판단
    if (frame >= this.nextThink && me.neutral && this.guardT <= 0 && !this.script.length) {
      // 원거리 기술이 모두 쿨타임이면 근접 거리로 다가감 (원거리는 한 방, 그다음엔 접근)
      const rangedReady = Object.values(me.char.moves).some((m) => m.ranged && !m.cost && (me.cds[cdKey(m.id)] ?? 0) <= 0 && (!me.world || me.world.canUse(me, m)))
      const pref = rangedReady ? prefDist(me) : Math.min(prefDist(me), 75)
      this.nextThink = frame + this.p.think + Math.floor(r() * this.p.think)
      // 태그 모드
      if (me.team?.canSwap && me.hp / me.maxHp < 0.35 && me.team.partnerHp > 0.5 && r() < 0.3 + this.p.combo * 0.3) { inp.swap = true; return inp }
      if (me.team?.canAssist && dist < 260 && r() < 0.08 + this.p.special * 0.15) inp.assist = true
      // 원거리 캐릭터(망원 촬영·조명 등)는 붙으면 먼저 거리를 벌림
      if (pref >= 200 && dist < pref - 110 && dist > 40 && r() < 0.35 + this.p.combo * 0.3) {
        this.script = r() < 0.5 ? [{ inp: { back: true } }, { inp: {} }, { inp: { back: true } }] : []
        this.moveDir = 'back'; this.moveT = 18
        return inp
      }
      const pick = this.pickOption(me, opp, dist, pref)
      if (pick && r() < this.p.aggro + 0.15) this.script = [...pick.frames]
      else {
        // 망원 촬영: 멀리 있으면 가만히 서서 초점 모으기
        if (me.char.id === 'dp' && me.trait.lens === 2 && dist > 160 && me.trait.focus < 100) { this.moveDir = null; this.moveT = 0; return inp }
        // 거리 조절: 선호 거리로
        this.moveT = 14 + Math.floor(r() * 20)
        if (dist > pref + 50) this.moveDir = 'fwd'
        else if (dist < pref - 50) this.moveDir = 'back'
        else this.moveDir = r() < 0.3 ? 'fwd' : r() < 0.2 ? 'back' : null
        // 멀면 달리기(→→), 원거리 캐릭터가 붙으면 백스텝(←←)
        if (this.moveDir === 'fwd' && dist > pref + 220 && r() < 0.5) this.script = [{ inp: { fwd: true } }, { inp: {} }, { inp: { fwd: true } }]
        if (this.moveDir === 'back' && pref > 150 && dist < 90 && r() < 0.4) this.script = [{ inp: { back: true } }, { inp: {} }, { inp: { back: true } }]
        if (this.moveDir === 'fwd' && r() < 0.12) this.script = [{ inp: { up: true, fwd: true } }]
      }
    }

    // 4) 출력
    if (this.guardT > 0) { this.guardT--; inp[backKey] = true; if (opp.move?.low && this.p.guard > 0.7) inp.down = true; return inp }
    if (this.script.length) {
      const f = this.script[0]
      if ('chain' in f) {
        // 체인: 지금 기술이 맞았거나 판정이 끝나면 다음 버튼
        const m = me.move
        if (me.state !== 'attack' || !m) { this.script = []; return inp }
        if (!me.hitConfirmed && me.moveFrame >= m.startup + m.active && r() < this.p.combo * 0.6) { this.script = []; return inp }
        if (me.hitConfirmed || me.moveFrame >= m.startup + m.active) this.script.shift()
        return inp
      }
      this.script.shift()
      for (const [k, v] of Object.entries(f.inp)) {
        if (!v) continue
        if (k === 'fwd') inp[fwdKey] = true
        else if (k === 'back') inp[backKey] = true
        else inp[k as Key] = true
      }
      return inp
    }
    if (this.moveT > 0 && this.moveDir) { this.moveT--; inp[this.moveDir === 'fwd' ? fwdKey : backKey] = true }
    return inp
  }

  /** 지금 거리에서 쓸 기술 고르기 (점수 = 피해 × 거리 적합 × 캐릭터 습관) */
  private pickOption(me: Fighter, opp: Fighter, dist: number, pref: number): Option | null {
    const r = this.rng
    let best: Option | null = null
    let bestS = 0
    for (const o of optionsFor(me.char)) {
      if (o.cmd && r() > this.p.cmd) continue
      const id = me.world ? me.world.remapMove(me, o.id) : o.id
      const m = me.char.moves[id]
      if (!m) continue
      if (m.cost && me.meter < m.cost) continue
      if ((me.cds[cdKey(m.id)] ?? 0) > 0) continue
      if (me.world && !me.world.canUse(me, m)) continue
      const rr = o.id === id ? o : { ...o, ...reach(m, me.char) }
      let s: number
      if (rr.setup) s = 26 * this.p.special
      else {
        const airAdj = o.air ? me.char.airSpeed * 9 : 0
        if (dist < rr.lo || dist > rr.hi + airAdj) continue
        s = (m.damage + (m.projectile?.damage ?? 0) + 20) * (o.cmd ? 1.25 : 1)
        if (dist < 70 && m.startup > 14) s *= 0.4
        if (m.ult) s *= 3
        if (m.id.startsWith('C') || m.id.startsWith('D')) s *= 0.5 + this.p.special
      }
      // 대공: 상대가 머리 위에서 덮쳐 오면 위쪽 기술
      if (opp.y > 30 && dist < 110) s *= o.id.endsWith('_u') || (m.lift ?? 0) > 0 || m.juggle ? 3 : 0.6
      s *= this.habit(me, opp, m, dist, pref)
      s *= 0.5 + r()
      if (s > bestS) { bestS = s; best = o }
    }
    return best
  }

  /** 캐릭터별 특성 사용 습관 */
  private habit(me: Fighter, opp: Fighter, m: MoveData, dist: number, pref: number): number {
    const e = m.effect
    const t = me.trait
    switch (me.char.id) {
      case 'dp':
        // 망원: 풀초점이 될 때까지 원거리를 아낌 (초점 안 맞은 사격은 약함)
        if (t.lens === 2 && m.ranged) return t.focus >= 100 ? 4 : 0.03
        if (e === 'lensTele') return dist > 340 && t.lens !== 2 ? 3 : 0
        if (e === 'lensWide') return (dist < 110 || (t.lens === 2 && dist < 180)) && t.lens !== 0 ? 6 : 0
        if (e === 'lensStd') return dist >= 110 && dist <= 230 && t.lens !== 1 ? 3 : 0
        if (e === 'lens') return 0
        return 1
      case 'director':
        if (e === 'action') return t.traps.some((x) => Math.abs(x - opp.x) < 44) ? 8 : 0.4
        if (e && /^trap|extra/.test(e)) return t.traps.length + (me.world?.extras.filter((x) => x.owner === me.idx).length ?? 0) < 2 ? 3 : 0.5
        if (e === 'parry') return 0.3
        return 1
      case 'art': {
        const n = (me.world?.walls.filter((w) => w.owner === me.idx).length ?? 0) + (me.world?.boxes.filter((b) => b.owner === me.idx).length ?? 0)
        if (e && ['applebox', 'platform', 'airPlatform', 'wall', 'sofa', 'stairs', 'scaffold', 'barricade'].includes(e)) return n < 3 ? (dist > pref ? 3 : 1.2) : 0.2
        if (e === 'setBlast' || e === 'collapse') return n >= 2 ? 3 : 0.5
        return 1 + n * 0.1
      }
      case 'makeup':
        if (e === 'transform') return me.hp / me.maxHp < 0.6 && t.mode === 0 ? 5 : 0.2
        if (m.debuff) return 1.6
        return 1
      case 'gaffer':
        if (e === 'blinkBack') return dist < 90 ? 4 : 0.2
        if (e === 'blinkFwd') return dist > 300 ? 2 : 0.3
        return m.projectile || m.vfx === 'laser' ? 1.5 : dist < 90 ? 1 : 0.6
      case 'sound':
        if (e === 'soundover') return t.res >= 60 ? 4 : 0.3
        return m.vfx === 'pole' ? 1.5 : 1
      case 'actor':
        if (e === 'role') return 0.6
        if (e === 'improv') return 2
        if (m.copyOf) return 2
        return 1
    }
    return 1
  }
}

/** 기술 하나를 내는 입력 프레임 (훈련장 시범·콤보 트라이얼용). 커맨드 기술이면 커맨드 입력 */
export function framesForMove(c: CharacterData, id: string): Frame[] | null {
  const o = optionsFor(c).find((x) => x.id === id)
  return o ? [...o.frames] : null
}

/** 입력 스크립트를 한 프레임씩 InputState로 (앞·뒤는 상대 방향 기준) */
export function frameInput(f: Frame, me: Fighter, opp: Fighter): InputState {
  const inp = emptyInput()
  if ('chain' in f) return inp
  const fwdKey: 'left' | 'right' = opp.x >= me.x ? 'right' : 'left'
  const backKey: 'left' | 'right' = fwdKey === 'right' ? 'left' : 'right'
  for (const [k, v] of Object.entries(f.inp)) {
    if (!v) continue
    if (k === 'fwd') inp[fwdKey] = true
    else if (k === 'back') inp[backKey] = true
    else inp[k as Key] = true
  }
  return inp
}

/**
 * 콤보 시범: 기술 목록을 차례로 입력. 앞 기술이 맞으면(또는 끝나면) 바로 다음 기술 입력을 넣어 캔슬
 */
export class ComboRunner {
  private queue: string[]
  private frames: Frame[] = []
  private waitHit = false
  private idle = 0
  done = false
  constructor(private c: CharacterData, moves: string[]) { this.queue = [...moves] }

  input(me: Fighter, opp: Fighter): InputState {
    if (this.done) return emptyInput()
    if (this.waitHit) {
      // 앞 기술이 맞았거나 끝나면 다음 기술
      if (me.hitConfirmed || me.state !== 'attack') { this.waitHit = false; this.idle = 0 }
      else return emptyInput()
    }
    if (!this.frames.length) {
      const next = this.queue.shift()
      if (!next) { this.done = true; return emptyInput() }
      this.frames = framesForMove(this.c, next) ?? []
    }
    const f = this.frames.shift()!
    if (!this.frames.length) this.waitHit = true
    if ('chain' in f) {
      // 체인 커맨드 중간: 지금 기술이 맞을 때까지 기다림
      if (!(me.hitConfirmed || me.state !== 'attack') && this.idle++ < 40) { this.frames.unshift(f); return emptyInput() }
      return emptyInput()
    }
    return frameInput(f, me, opp)
  }
}
