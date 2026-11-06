// 전투 화면: Match(로직)를 60프레임 고정으로 돌리고 결과를 그립니다.
import Phaser from 'phaser'
import { Match } from '../core/Match'
import type { Fighter } from '../core/Fighter'
import { METER_MAX } from '../core/Fighter'
import { SimpleAI } from '../core/AI'
import { emptyInput, FPS, type MatchEvent } from '../core/types'
import { getCharacter, BTN_LABEL, atRank, RANK_MUL } from '../config/characters'
import { STAGES, BOSS_MUL, titleOf } from '../config/stages'
import { TRAIT_INFO, LENSES } from '../core/Traits'
import type { Difficulty } from '../core/AI'
import { animKey, ensureFighterTexture } from '../gfx/TextureFactory'
import { animsFor } from '../gfx/charPoses'
import { FW, FH, FOOT_Y } from '../gfx/Painter'
import type { Controls } from '../ui/Controls'
import { button, text, COLOR, FONT } from '../ui/widgets'
import { settings } from '../ui/Settings'
import { sfx } from '../audio/Sfx'

const GROUND = 230
const STEP_MS = 1000 / FPS

/** 전투 설정. VS 모드는 p1·p2만, 스테이지 모드는 stage(0~4)까지 */
export interface FightSetup { p1: string; p2: string; stage?: number; cpu?: Difficulty }

export class FightScene extends Phaser.Scene {
  private match!: Match
  private ai!: SimpleAI
  private sprites: Phaser.GameObjects.Sprite[] = []
  private shadows: Phaser.GameObjects.Image[] = []
  private texKeys: string[] = []
  private projSprites = new Map<object, Phaser.GameObjects.Image>()
  private acc = 0
  private controls!: Controls
  private hud!: { trait: Phaser.GameObjects.Text[]; hp: Phaser.GameObjects.Rectangle[]; hpLag: Phaser.GameObjects.Rectangle[]; meter: Phaser.GameObjects.Rectangle[]; meterTxt: Phaser.GameObjects.Text[]; timer: Phaser.GameObjects.Text; pips: Phaser.GameObjects.Rectangle[][]; combo: Phaser.GameObjects.Text[] }
  private lagHp = [1, 1]
  private flash = [0, 0]
  private paused = false
  private pauseLayer?: Phaser.GameObjects.Container
  private resultShown = false
  private debug = new URLSearchParams(location.search).has('debug')
  private dbg?: Phaser.GameObjects.Graphics
  private setup: FightSetup = { p1: 'dp', p2: 'dp' }
  private names: string[] = []
  private bg = 'stage_chroma'
  private camKick = { x: 0, y: 0 }
  private worldG!: Phaser.GameObjects.Graphics
  private tags: Phaser.GameObjects.Text[] = []
  private uiCam!: Phaser.Cameras.Scene2D.Camera
  private zoom = 1.7
  private zoomKick = 0
  private slow = 0                                    // 슬로모션 남은 프레임
  private squash = [{ x: 1, y: 1 }, { x: 1, y: 1 }]  // 스쿼시·스트레치
  private tick = 0

  constructor() { super('Fight') }

  init(data: Partial<FightSetup>) {
    this.setup = { p1: data.p1 ?? 'dp', p2: data.p2 ?? 'dp', stage: data.stage, cpu: data.cpu }
    const base1 = getCharacter(this.setup.p1), base2 = getCharacter(this.setup.p2)
    const st = this.setup.stage != null ? STAGES[this.setup.stage] : null
    if (st) {
      // 스테이지 모드: 내 직급 = 지금까지 깬 스테이지 수, 상대는 스테이지마다 정해진 직급
      const myRank = this.setup.stage!
      const c1 = atRank(base1, myRank), c2 = atRank(base2, st.oppRank)
      const oppMul = st.boss ? BOSS_MUL : { hp: RANK_MUL[st.oppRank], dmg: RANK_MUL[st.oppRank] }
      this.match = new Match(c1, c2, [{ hpMul: RANK_MUL[myRank], dmgMul: RANK_MUL[myRank] }, { hpMul: oppMul.hp, dmgMul: oppMul.dmg }])
      this.ai = new SimpleAI(st.difficulty)
      this.names = [titleOf(base1.id, myRank), titleOf(base2.id, st.oppRank, st.boss)]
      this.bg = st.bg
      this.texKeys = [base1.id, st.boss ? `${base2.id}_boss` : base2.id === base1.id ? `${base2.id}_alt` : base2.id]
    } else {
      this.match = new Match(base1, base2)
      this.ai = new SimpleAI(this.setup.cpu ?? settings.difficulty)
      this.names = [`1P ${base1.name}`, `CPU ${base2.name}`]
      this.bg = ['stage_chroma', 'stage_alley', 'stage_hanok', 'stage_roof', 'stage_award'][Math.floor(Math.random() * 5)]
      // 같은 캐릭터끼리면 2P는 다른 색
      this.texKeys = [base1.id, base2.id === base1.id ? `${base2.id}_alt` : base2.id]
    }
    this.acc = 0; this.lagHp = [1, 1]; this.paused = false; this.resultShown = false
    this.projSprites = new Map()
    this.slow = 0; this.zoomKick = 0; this.squash = [{ x: 1, y: 1 }, { x: 1, y: 1 }]; this.camKick = { x: 0, y: 0 }
  }

  /** 월드(줌 카메라)에만 보이는 오브젝트 */
  private w<T extends Phaser.GameObjects.GameObject>(o: T): T { this.uiCam?.ignore(o); return o }
  /** 화면 고정 UI(줌 없는 카메라)에만 보이는 오브젝트 */
  private ui<T extends Phaser.GameObjects.GameObject>(o: T): T { this.cameras.main.ignore(o); return o }

  create() {
    const W = this.scale.width
    const before = new Set(this.children.list)
    this.add.image(0, 0, this.bg).setOrigin(0)
    for (const k of this.texKeys) ensureFighterTexture(this, k)
    this.controls = this.registry.get('controls') as Controls
    this.controls.show(true)
    this.events.once('shutdown', () => this.controls.show(false))

    // 특성 오브젝트(마크·조명·세트벽)와 머리 위 표시
    this.worldG = this.add.graphics().setDepth(3)
    this.tags = [0, 1].map(() => this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: '#ffffff', stroke: '#0a0812', strokeThickness: 3, resolution: 6 }).setOrigin(0.5).setScale(0.6).setDepth(33))
    this.match.fighters.forEach((f, i) => {
      this.shadows[i] = this.add.image(f.x, GROUND + 1, 'shadow').setDepth(1)
      this.sprites[i] = this.add.sprite(f.x, GROUND, this.texKeys[i]).setOrigin(0.5, FOOT_Y / FH).setDepth(5 + i)
    })
    const worldObjs = this.children.list.filter((o) => !before.has(o))
    this.buildHud(W)
    const hudObjs = this.children.list.filter((o) => !before.has(o) && !worldObjs.includes(o))
    // 카메라 두 대: 메인 = 두 캐릭터를 따라가며 확대, UI = HUD 고정
    const main = this.cameras.main
    main.setBounds(0, 0, 480, 270).setZoom(this.zoom).centerOn(240, GROUND - 52)
    main.ignore(hudObjs)
    this.uiCam = this.cameras.add(0, 0, 480, 270)
    this.uiCam.ignore(worldObjs)
    if (this.debug) this.dbg = this.w(this.add.graphics().setDepth(50))
    // 일시정지 버튼
    const pz = this.ui(text(this, W / 2, 46, '❚❚', 11, COLOR.dim).setInteractive({ useHandCursor: true }).setDepth(30))
    pz.on('pointerup', () => this.togglePause())
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause())
    this.input.keyboard?.on('keydown-P', () => this.togglePause())
    this.handleEvents(this.match.events)
    ;(window as unknown as { __rolling?: unknown }).__rolling = { match: this.match, scene: this }
  }

  // ───── HUD ─────
  private buildHud(W: number) {
    const bw = 190
    const trait: Phaser.GameObjects.Text[] = []
    const hp: Phaser.GameObjects.Rectangle[] = [], hpLag: Phaser.GameObjects.Rectangle[] = [], meter: Phaser.GameObjects.Rectangle[] = [], meterTxt: Phaser.GameObjects.Text[] = [], pips: Phaser.GameObjects.Rectangle[][] = [], combo: Phaser.GameObjects.Text[] = []
    this.match.fighters.forEach((f, i) => {
      const left = i === 0
      const x0 = left ? 10 : W - 10 - bw
      text(this, left ? 10 : W - 10, 8, this.names[i], 11, i === 0 ? COLOR.accent : COLOR.red, left ? 0 : 1).setDepth(20)
      this.add.rectangle(x0 - 2, 17, bw + 4, 12, COLOR.line).setOrigin(0).setDepth(20)
      this.add.rectangle(x0, 19, bw, 8, 0x5b1a2a).setOrigin(0).setDepth(20)
      hpLag[i] = this.add.rectangle(left ? x0 + bw : x0, 19, bw, 8, 0xff5470).setOrigin(left ? 1 : 0, 0).setDepth(21)
      hp[i] = this.add.rectangle(left ? x0 + bw : x0, 19, bw, 8, 0xffd23f).setOrigin(left ? 1 : 0, 0).setDepth(22)
      this.add.rectangle(left ? x0 + bw : x0, 19, bw, 2, 0xffffff, 0.35).setOrigin(left ? 1 : 0, 0).setDepth(23)
      // 라운드 승리 표시
      pips[i] = [0, 1].map((k) => this.add.rectangle(left ? x0 + bw - 6 - k * 10 : x0 + 6 + k * 10, 34, 7, 4, 0x0a0812).setStrokeStyle(1, 0xffd23f).setDepth(20))
      // 직업 특성 상태
      trait[i] = text(this, left ? x0 : x0 + bw, 35, '', 11, '#5eead4', left ? 0 : 1).setDepth(20)
      // 하단 필살 게이지
      // 하단 필살 게이지: 양쪽 터치 버튼 사이(화면 가운데)에 둬서 가리지 않게
      const mx = left ? W / 2 - 8 - 100 : W / 2 + 8
      this.add.rectangle(mx - 2, 250, 104, 9, COLOR.line).setOrigin(0).setDepth(20)
      meter[i] = this.add.rectangle(left ? mx + 100 : mx, 252, 0, 5, 0x5ec8ff).setOrigin(left ? 1 : 0, 0).setDepth(21)
      meterTxt[i] = text(this, left ? mx - 6 : mx + 106, 254, 'SP', 11, COLOR.blue, left ? 1 : 0).setDepth(21)
      combo[i] = this.add.text(left ? 14 : W - 14, 96, '', { fontFamily: FONT, fontSize: '16px', color: '#ffd23f', stroke: '#0a0812', strokeThickness: 3, fontStyle: 'bold', resolution: 1 }).setOrigin(left ? 0 : 1, 0.5).setDepth(25)
    })
    this.add.rectangle(W / 2, 22, 30, 22, COLOR.line).setDepth(20)
    const timer = this.add.text(W / 2, 22, '60', { fontFamily: FONT, fontSize: '16px', color: '#ffd23f', fontStyle: 'bold', resolution: 1 }).setOrigin(0.5).setDepth(21)
    this.hud = { trait, hp, hpLag, meter, meterTxt, timer, pips, combo }
  }

  private updateHud() {
    const m = this.match
    m.fighters.forEach((f, i) => {
      const frac = f.hp / f.maxHp
      this.hud.hp[i].width = 190 * frac
      this.lagHp[i] = Math.max(frac, this.lagHp[i] - 0.006)
      this.hud.hpLag[i].width = 190 * this.lagHp[i]
      this.hud.meter[i].width = 100 * (f.meter / METER_MAX)
      this.hud.meter[i].fillColor = f.meter >= 100 ? 0xffd23f : 0x5ec8ff
      this.hud.meterTxt[i].setText(f.meter >= 100 ? '필살 OK!' : `SP ${Math.floor(f.meter)}`)
      this.hud.pips[i].forEach((p, k) => p.setFillStyle(k < m.wins[i] ? 0xffd23f : 0x0a0812))
      const tl = m.world.label(f)
      if (this.hud.trait[i].text !== tl) this.hud.trait[i].setText(tl)
    })
    this.hud.timer.setText(String(Math.max(0, m.timeLeft)))
    this.controls.setMeter(m.fighters[0].meter)
    const me = m.fighters[0]
    this.controls.setTrait(TRAIT_INFO[me.char.trait].button, m.phase === 'fight' && m.world.ready(me))
  }

  // ───── 그리기 ─────
  private drawFighter(f: Fighter, i: number) {
    const spr = this.sprites[i]
    const key = this.texKeys[i]
    // 히트스톱 중 맞은 쪽 덜덜 떨림
    const jitter = this.match.hitstop > 0 && f.inHitstun ? (this.tick % 2 ? 1 : -1) : 0
    spr.setPosition(Math.round(f.x) + jitter, Math.round(GROUND - f.y))
    spr.setFlipX(f.facing < 0)
    const sq = this.squash[i]
    spr.setScale(sq.x, sq.y)
    this.shadows[i].setPosition(Math.round(f.x), GROUND + 1).setScale(1 - Math.min(0.5, f.y / 120), 1)
    let anim = f.state as string
    if (f.state === 'attack' && f.move) {
      const m = f.move
      const ANIMS = animsFor(f.char.id)
      const want = m.anim ?? m.id
      const animId = ANIMS[want] ? want : 'light'   // 애니메이션이 없는 기술은 약공격 모션으로
      const def = ANIMS[animId]
      const n = def.frames.length
      const mf = f.moveFrame, st = m.startup, ac = m.active
      const activeNow = mf >= st && mf < st + ac
      if (m.afterimage && activeNow && this.tick % 3 === 0) this.ghost(spr, i)
      if (def.loop && activeNow) anim = animId
      else {
        let idx: number
        if (n <= 2) idx = mf < st ? 0 : n - 1
        else if (n === 3) idx = mf < st ? 0 : mf < st + ac ? 1 : 2
        else idx = mf < st / 2 ? 0 : mf < st ? 1 : mf < st + ac ? 2 : 3
        spr.anims.stop()
        spr.setFrame(`${animId}_${Math.min(idx, n - 1)}`)
        this.applyFlash(spr, i)
        return
      }
    }
    if (f.state === 'guard' && f.stun > 0) anim = 'guard'
    if (f.state === 'run' && this.tick % 6 === 0) { const d = this.w(this.add.image(f.x - f.facing * 8, GROUND, 'dust').setDepth(4).setAlpha(0.7)); this.tweens.add({ targets: d, alpha: 0, x: d.x - f.facing * 8, duration: 280, onComplete: () => d.destroy() }) }
    const ak = animKey(key, anim)
    if (spr.anims.currentAnim?.key !== ak || !spr.anims.isPlaying && this.anims.get(ak)?.repeat === -1) spr.play(ak, true)
    this.applyFlash(spr, i)
  }

  /** 잔상 */
  private ghost(spr: Phaser.GameObjects.Sprite, i: number) {
    const g = this.w(this.add.image(spr.x, spr.y, spr.texture.key, spr.frame.name).setOrigin(spr.originX, spr.originY).setFlipX(spr.flipX).setScale(spr.scaleX, spr.scaleY)
      .setTintFill(i === 0 ? 0x5ec8ff : 0xff5470).setAlpha(0.55).setDepth(4))
    this.tweens.add({ targets: g, alpha: 0, duration: 230, onComplete: () => g.destroy() })
  }

  /** 타격 임팩트: 불꽃 + 충격파 링 + 베는 선 + 파편 + 데미지 숫자. dir = 날아가는 방향 */
  private impact(x: number, y: number, power: number, color: number, dmg?: number, dir = 1) {
    const sy = GROUND - y
    // 맞은 방향으로 뻗는 날카로운 선 (타격 방향이 보이게)
    const streaks = this.w(this.add.graphics().setDepth(32))
    for (let k = 0; k < 2 + power * 2; k++) {
      const a = (Math.random() - 0.5) * 0.9 + (dir > 0 ? 0 : Math.PI)
      const r0 = 4 + Math.random() * 4, r1 = 18 + power * 10 + Math.random() * 10
      streaks.lineStyle(k % 2 ? 1 : 2, k % 2 ? color : 0xffffff, 1)
      streaks.lineBetween(x + Math.cos(a) * r0, sy + Math.sin(a) * r0, x + Math.cos(a) * r1, sy + Math.sin(a) * r1)
    }
    this.tweens.add({ targets: streaks, alpha: 0, duration: 120 + power * 40, onComplete: () => streaks.destroy() })
    this.w(this.add.sprite(x, sy, 'spark')).setDepth(30).setScale(0.9 + power * 0.5).setAngle(Math.random() * 360).play('spark').once('animationcomplete', (_: unknown, __: unknown, s: Phaser.GameObjects.Sprite) => s.destroy())
    const ring = this.w(this.add.circle(x, sy, 3).setStrokeStyle(2, color).setDepth(29))
    this.tweens.add({ targets: ring, scale: 4 + power * 3, alpha: 0, duration: 220 + power * 60, ease: 'Cubic.out', onComplete: () => ring.destroy() })
    const n = 5 + power * 4
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * (14 + power * 10)
      const bit = this.w(this.add.rectangle(x, sy, 2, 2, k % 3 ? 0xffffff : color).setDepth(31))
      this.tweens.add({ targets: bit, x: x + Math.cos(a) * r, y: sy + Math.sin(a) * r * 0.7 + 6, alpha: 0, duration: 260 + Math.random() * 200, ease: 'Quad.out', onComplete: () => bit.destroy() })
    }
    if (dmg != null) {
      const t = this.w(this.add.text(x + (Math.random() - 0.5) * 10, sy - 10, String(dmg), { fontFamily: FONT, fontSize: '11px', color: power >= 2 ? '#ffd23f' : '#ffffff', stroke: '#0a0812', strokeThickness: 3, fontStyle: 'bold', resolution: 6 }).setOrigin(0.5).setDepth(34).setScale(power >= 2 ? 0.95 : 0.7))
      this.tweens.add({ targets: t, y: t.y - 14, duration: 260, ease: 'Back.out' })
      this.tweens.add({ targets: t, alpha: 0, delay: 420, duration: 220, onComplete: () => t.destroy() })
    }
  }

  /** 마무리 연출: 슬로모션 + 카메라 줌 펀치 + 집중선 */
  private finisherFx() {
    this.slow = 26
    this.zoomKick = 0.35
    // 화면 전체 플래시는 K.O. 전용 → 마무리기는 옅은 섬광만
    const fl = this.ui(this.add.rectangle(0, 0, 480, 270, 0xfff4d6, 0.35).setOrigin(0).setDepth(37))
    this.tweens.add({ targets: fl, alpha: 0, duration: 140, onComplete: () => fl.destroy() })
    const g = this.ui(this.add.graphics().setDepth(38))
    g.lineStyle(2, 0xffffff, 0.75)
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2 + Math.random() * 0.1
      const r1 = 120 + Math.random() * 40, r2 = 300
      g.lineBetween(240 + Math.cos(a) * r1, 135 + Math.sin(a) * r1 * 0.6, 240 + Math.cos(a) * r2, 135 + Math.sin(a) * r2 * 0.6)
    }
    this.tweens.add({ targets: g, alpha: 0, duration: 380, onComplete: () => g.destroy() })
  }

  /** 커맨드 콤보 배너: "약 약 강 ▶ 트라이포드 어퍼!" */
  private comboBanner(fighter: number, moveId: string, name: string) {
    const ch = this.match.fighters[fighter].char
    const seq = ch.combos.find((c) => c.move === moveId)?.seq.map((t) => BTN_LABEL[t]).join(' ') ?? ''
    const y = 206   // 머리 위 말풍선과 겹치지 않게 아래쪽에
    const band = this.ui(this.add.rectangle(fighter === 0 ? -240 : 720, y, 300, 24, fighter === 0 ? 0x2f6fe4 : 0xe0353f).setDepth(39).setAngle(-4))
    const t = this.ui(this.add.text(fighter === 0 ? -240 : 720, y, `${seq} ▶ ${name}!`, { fontFamily: FONT, fontSize: '14px', color: '#fff8e7', stroke: '#0a0812', strokeThickness: 3, fontStyle: 'bold', resolution: 1 }).setOrigin(0.5).setDepth(40).setAngle(-4))
    const tx = fighter === 0 ? 170 : 310
    this.tweens.add({ targets: [band, t], x: tx, duration: 160, ease: 'Back.out' })
    this.tweens.add({ targets: [band, t], alpha: 0, x: tx + (fighter === 0 ? 40 : -40), delay: 900, duration: 220, onComplete: () => { band.destroy(); t.destroy() } })
  }

  /** 필살기 컷인: 레터박스 + 캐릭터 + 이름 */
  private superCutIn(fighter: number) {
    const f = this.match.fighters[fighter]
    const key = this.texKeys[fighter]
    const top = this.ui(this.add.rectangle(0, -30, 480, 30, 0x000000).setOrigin(0).setDepth(41))
    const bot = this.ui(this.add.rectangle(0, 270, 480, 30, 0x000000).setOrigin(0).setDepth(41))
    const dark = this.ui(this.add.rectangle(0, 0, 480, 270, 0x0a0812, 0.65).setOrigin(0).setDepth(36))
    const band = this.ui(this.add.rectangle(240, 140, 480, 64, fighter === 0 ? 0x2f6fe4 : 0xe0353f).setDepth(37))
    const who = this.ui(this.add.sprite(fighter === 0 ? -60 : 540, 172, key, `super_${Math.min(1, animsFor(f.char.id).super.frames.length - 1)}`).setOrigin(0.5, 1).setScale(2.2).setFlipX(fighter !== 0).setDepth(38))
    const t = this.ui(this.add.text(fighter === 0 ? 300 : 180, 140, `🎥 ${f.move?.name ?? '필살기'}!!`, { fontFamily: FONT, fontSize: '22px', color: '#ffd23f', stroke: '#0a0812', strokeThickness: 4, fontStyle: 'bold', resolution: 1 }).setOrigin(0.5).setDepth(39).setScale(1.8))
    this.tweens.add({ targets: top, y: 0, duration: 120 }); this.tweens.add({ targets: bot, y: 240, duration: 120 })
    this.tweens.add({ targets: who, x: fighter === 0 ? 110 : 370, duration: 200, ease: 'Cubic.out' })
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.out' })
    this.tweens.add({ targets: [dark, band, who, t, top, bot], alpha: 0, delay: 420, duration: 160, onComplete: () => [dark, band, who, t, top, bot].forEach((o) => o.destroy()) })
  }

  private applyFlash(spr: Phaser.GameObjects.Sprite, i: number) {
    if (this.flash[i] > 0) { spr.setTintFill(0xffffff); this.flash[i]-- } else spr.clearTint()
  }

  private drawProjectiles() {
    const live = new Set(this.match.projectiles)
    for (const [p, img] of this.projSprites) if (!live.has(p as never)) { img.destroy(); this.projSprites.delete(p) }
    for (const p of this.match.projectiles) {
      let img = this.projSprites.get(p)
      if (!img) {
        // 그림 기준점: 조명은 바닥(72), 빛기둥은 바닥(66), 나머지는 물체 가운데(60)
        const oy = p.kind === 'lightstand' ? 1 : p.kind === 'beam' ? 66 / FH : 60 / FH
        img = this.w(this.add.image(p.x, GROUND - p.y, `proj_${p.kind}`).setOrigin(0.5, oy).setDepth(8).setFlipX(p.vx < 0)); this.projSprites.set(p, img)
      }
      const mid = p.kind === 'lightstand' || p.kind === 'beam' ? 0 : p.h / 2
      img.setPosition(Math.round(p.x), Math.round(GROUND - p.y - mid))
      if (p.gy) img.setAngle(p.age * 14 * Math.sign(p.vx))                 // 던진 물건은 빙글빙글
      if (p.kind === 'wave' || p.kind === 'cut') img.setScale(1 + Math.sin(p.age * 0.5) * 0.12)
      if (p.kind === 'beam') img.setAlpha(0.75 + Math.sin(p.age * 0.9) * 0.25)
    }
  }

  /** 특성 오브젝트 그리기: 연출 마크, 조명, 세트벽, 분장 겹, REC 표시 */
  private drawTraits() {
    const g = this.worldG
    const m = this.match
    g.clear()
    m.fighters.forEach((f, i) => {
      const t = f.trait
      const col = i === 0 ? 0x5ec8ff : 0xff5470
      if (t.mark != null) {   // 바닥 마킹 테이프 (X자)
        const x = t.mark, y = GROUND + 3
        g.lineStyle(2, 0xfacc15, 1).lineBetween(x - 6, y - 2, x + 6, y + 2).lineBetween(x - 6, y + 2, x + 6, y - 2)
        g.lineStyle(1, col, 1).strokeRect(x - 9, y - 4, 18, 8)
      }
      if (t.light) {          // 조명 스탠드 + 빛 범위
        const x = t.light.x, a = 0.1 + 0.05 * Math.sin(this.tick * 0.2) + (t.light.t < 90 && this.tick % 10 < 5 ? -0.08 : 0)
        g.fillStyle(0xfef9c3, Math.max(0.03, a)).fillTriangle(x, GROUND - 70, x - 54, GROUND, x + 54, GROUND)
        g.fillStyle(0xfef9c3, Math.max(0.02, a * 0.7)).fillRect(x - 52, GROUND - 2, 104, 4)
        g.fillStyle(0x6b7280, 1).fillRect(x - 1, GROUND - 68, 2, 68).fillRect(x - 8, GROUND - 2, 16, 2)
        g.fillStyle(0x1f2937, 1).fillRect(x - 7, GROUND - 78, 14, 10)
        g.fillStyle(0xfef08a, 1).fillRect(x - 5, GROUND - 70, 10, 3)
      }
      if (f.char.trait === 'makeup' && t.stacks > 0) {   // 상대 머리 위 분장 겹
        const o = m.fighters[1 - i]
        for (let k = 0; k < t.stacks; k++) {
          const bx = o.x - (t.stacks - 1) * 4 + k * 8, by = GROUND - o.y - 66 + Math.sin(this.tick * 0.2 + k) * 1.5
          g.fillStyle(0xff7eb6, 1).fillCircle(bx, by, 2.5); g.fillStyle(0xffffff, 1).fillRect(bx - 1, by - 1, 1, 1)
        }
      }
      // 머리 위 짧은 표시 (REC·렌즈)
      const tag = this.tags[i]
      let s = ''
      if (f.char.trait === 'rec' && t.rec > 0) s = this.tick % 30 < 18 ? `● REC ${t.recorded}` : `  REC ${t.recorded}`
      else if (f.char.trait === 'rec' && t.tape > 0) s = `▶ ${t.tape}`
      else if (f.char.trait === 'lens') s = LENSES[t.lens].short
      tag.setText(s).setPosition(f.x, GROUND - f.y - 70).setColor(f.char.trait === 'rec' ? '#ff5470' : '#5eead4')
    })
    for (const w of m.world.walls) {   // 합판 세트벽 (금 간 정도 = 남은 내구도)
      const x = w.x, top = GROUND - 46
      g.fillStyle(0x0a0812, 1).fillRect(x - 7, top - 1, 14, 47)
      g.fillStyle(0xc8955c, 1).fillRect(x - 6, top, 12, 46)
      g.fillStyle(0xa87442, 1).fillRect(x - 6, top + 15, 12, 1).fillRect(x - 6, top + 31, 12, 1).fillRect(x - 1, top, 1, 46)
      g.fillStyle(0x6b4423, 1).fillRect(x - 8, GROUND - 4, 16, 4)
      g.lineStyle(1, 0x3b2312, 1)
      if (w.hp <= 2) g.lineBetween(x - 4, top + 6, x + 2, top + 18).lineBetween(x + 2, top + 18, x - 1, top + 24)
      if (w.hp <= 1) g.lineBetween(x + 4, top + 26, x - 3, top + 38).lineBetween(x - 3, top + 38, x + 2, top + 44)
      if (w.owner === 0) g.fillStyle(0x5ec8ff, 1).fillRect(x - 6, top, 12, 2); else g.fillStyle(0xff5470, 1).fillRect(x - 6, top, 12, 2)
    }
  }

  private drawDebug() {
    const g = this.dbg!
    g.clear()
    for (const f of this.match.fighters) {
      const hb = f.hurtbox()
      g.lineStyle(1, 0x22d3ee).strokeRect(hb.x, GROUND - hb.y - hb.h, hb.w, hb.h)
      const at = f.hitbox()
      if (at) g.lineStyle(1, 0xff0000).strokeRect(at.x, GROUND - at.y - at.h, at.w, at.h)
    }
  }

  // ───── 연출 ─────
  private bigText(s: string, color = '#ffd23f', size = 28, hold = 700) {
    const t = this.ui(this.add.text(240, 120, s, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#0a0812', strokeThickness: 5, fontStyle: 'bold', resolution: 1 }).setOrigin(0.5).setDepth(40).setScale(1.6))
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.out' })
    this.tweens.add({ targets: t, alpha: 0, delay: hold, duration: 250, onComplete: () => t.destroy() })
  }

  /** 맞은 자리 위에 잠깐 뜨는 글자 (COUNTER! 등) */
  private popText(x: number, y: number, s: string, color: string) {
    const t = this.w(this.add.text(x, GROUND - y, s, { fontFamily: FONT, fontSize: '11px', color, stroke: '#0a0812', strokeThickness: 3, fontStyle: 'bold', resolution: 6 }).setOrigin(0.5).setDepth(36).setScale(1.3))
    this.tweens.add({ targets: t, scale: 0.8, y: t.y - 10, duration: 200, ease: 'Back.out' })
    this.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 200, onComplete: () => t.destroy() })
  }

  private bubble(f: Fighter, s: string) {
    const t = this.w(this.add.text(f.x, GROUND - 74, s, { fontFamily: FONT, fontSize: '11px', color: '#0a0812', backgroundColor: '#fff8e7', padding: { x: 3, y: 1 }, resolution: 6 }).setOrigin(0.5).setDepth(35).setScale(0.6))
    this.tweens.add({ targets: t, y: t.y - 8, alpha: 0, delay: 700, duration: 400, onComplete: () => t.destroy() })
  }

  private handleEvents(evs: MatchEvent[]) {
    for (const e of evs) {
      switch (e.type) {
        case 'round': this.bigText(e.round >= 3 ? 'FINAL ROUND' : `ROUND ${e.round}`, '#fff8e7', 22); break
        case 'fight': this.bigText('ACTION!', '#ffd23f', 30, 500); sfx('slate'); break
        case 'hit': {
          const def = 1 - e.attacker
          const fa = this.match.fighters[e.attacker], fd = this.match.fighters[def]
          const dir = fd.x >= fa.x ? 1 : -1
          this.flash[def] = e.finisher ? 6 : e.heavy ? 4 : 3
          const power = (e.finisher ? 3 : e.heavy ? 2 : 1) + (e.counter ? 1 : 0)
          this.impact(e.x, e.y, Math.min(3, power), e.attacker === 0 ? 0x5ec8ff : 0xff8a3d, e.damage, dir)
          this.squash[def] = { x: 0.82, y: 1.14 }
          this.squash[e.attacker] = { x: 1.08, y: 0.94 }                     // 때린 쪽도 살짝 눌림 (반동)
          // 카메라를 맞은 방향으로 툭 밀었다가 돌아옴 + 강타는 흔들림·줌
          this.camKick = { x: dir * (2 + power * 2), y: power >= 2 ? -2 : -1 }
          if (power >= 2) this.cameras.main.shake(e.finisher ? 260 : 130, e.finisher ? 0.018 : 0.009)
          if (power >= 2) this.zoomKick = Math.max(this.zoomKick, 0.07 * power)
          // 강타는 '임팩트 프레임': 아주 짧게 화면이 어두워졌다 돌아옴
          if (power >= 2 && !e.finisher) this.cameras.main.flash(70, 10, 6, 20)
          if (power >= 2) for (const d2 of [-1, 1]) { const du = this.w(this.add.image(fd.x - dir * 6, GROUND, 'dust').setDepth(4).setAlpha(0.8)); this.tweens.add({ targets: du, alpha: 0, x: du.x + d2 * 10 - dir * 8, y: GROUND - 3, duration: 300, onComplete: () => du.destroy() }) }
          sfx(e.finisher ? 'hitFinish' : e.heavy ? 'hitHeavy' : 'hit')
          if (e.counter) { sfx('counter'); this.popText(e.x, e.y + 26, 'COUNTER!', '#ff5470') }
          // 휴대폰 진동 (안드로이드 등 지원 기기)
          if (e.attacker === 0) navigator.vibrate?.(power >= 3 ? 40 : power >= 2 ? 22 : 10)
          else navigator.vibrate?.([0, 30])
          if (e.finisher) { this.finisherFx(); sfx('shutter') }
          if (e.combo >= 2) {
            const c = this.hud.combo[e.attacker]
            const col = e.combo >= 8 ? '#ff5470' : e.combo >= 5 ? '#ff9f43' : '#ffd23f'
            c.setText(`${e.combo} HIT!`).setColor(col).setAlpha(1).setScale(1.5 + Math.min(0.6, e.combo * 0.05))
            this.tweens.killTweensOf(c)
            this.tweens.add({ targets: c, scale: 1 + Math.min(0.4, e.combo * 0.04), duration: 140, ease: 'Back.out' })
            this.tweens.add({ targets: c, alpha: 0, delay: 1000, duration: 300 })
          }
          break
        }
        case 'block':
          this.w(this.add.sprite(e.x, GROUND - e.y, 'blockspark')).setDepth(30).play('blockspark').once('animationcomplete', (_: unknown, __: unknown, s: Phaser.GameObjects.Sprite) => s.destroy())
          sfx('block')
          break
        case 'move': {
          const f = this.match.fighters[e.fighter]
          if (e.combo) this.comboBanner(e.fighter, e.move, e.name)
          if (e.voice) this.bubble(f, e.voice)
          sfx(e.sfx === 'light' || e.sfx === 'heavy' ? 'swing' : e.sfx ?? 'swing')
          break
        }
        case 'super': this.superCutIn(e.fighter); sfx('shutter'); sfx('super'); break
        case 'ko': this.bigText('K.O.!', '#ff5470', 36, 1100); sfx('ko'); this.cameras.main.flash(200, 255, 255, 255); break
        case 'timeup': this.bigText('TIME UP!', '#fff8e7', 26, 1000); break
        case 'jump': sfx('jump'); this.squash[e.fighter] = { x: 0.8, y: 1.25 }; break
        case 'land': {
          const f = this.match.fighters[e.fighter]
          this.squash[e.fighter] = { x: 1.25, y: 0.8 }
          const d = this.w(this.add.image(f.x, GROUND, 'dust').setDepth(4))
          this.tweens.add({ targets: d, alpha: 0, y: GROUND - 4, duration: 300, onComplete: () => d.destroy() })
          sfx('land')
          break
        }
        case 'armor': {
          const f = this.match.fighters[e.fighter]
          this.popText(e.x, e.y + 22, '아머!', '#fbbf24')
          this.flash[e.fighter] = 0
          this.ghost(this.sprites[e.fighter], e.fighter === 0 ? 1 : 0)
          sfx('block'); void f
          break
        }
        case 'trait': this.traitFx(e); break
        case 'knockdown': {
          const f = this.match.fighters[e.fighter]
          for (const dir of [-1, 1]) {
            const d = this.w(this.add.image(f.x + dir * 6, GROUND, 'dust').setDepth(4).setScale(1.4))
            this.tweens.add({ targets: d, alpha: 0, x: d.x + dir * 18, y: GROUND - 6, duration: 420, onComplete: () => d.destroy() })
          }
          this.cameras.main.shake(120, 0.008)
          sfx('hitHeavy')
          break
        }
      }
    }
  }

  /** 특성 발동 연출 */
  private traitFx(e: Extract<MatchEvent, { type: 'trait' }>) {
    const f = this.match.fighters[e.fighter]
    const dust = (x: number, n = 2) => { for (let k = 0; k < n; k++) { const d = this.w(this.add.image(x + (k - n / 2) * 6, GROUND, 'dust').setDepth(4)); this.tweens.add({ targets: d, alpha: 0, y: GROUND - 8, x: d.x + (k - n / 2) * 6, duration: 360, onComplete: () => d.destroy() }) } }
    switch (e.kind) {
      case 'lens': this.popText(f.x, 84, `${LENSES[e.value ?? 1].name}!`, '#5eead4'); sfx('shutter'); break
      case 'mark': this.popText(e.x, 18, 'MARK!', '#facc15'); sfx('trait'); break
      case 'teleport': {
        const from = e.value ?? f.x
        const g = this.w(this.add.image(from, GROUND, this.texKeys[e.fighter], this.sprites[e.fighter].frame.name).setOrigin(0.5, FOOT_Y / FH).setFlipX(this.sprites[e.fighter].flipX).setTintFill(0xffffff).setAlpha(0.7).setDepth(4))
        this.tweens.add({ targets: g, alpha: 0, scaleX: 0.2, duration: 220, onComplete: () => g.destroy() })
        this.flash[e.fighter] = 4; dust(e.x, 3); this.popText(e.x, 84, '위치로!', '#facc15'); sfx('dash')
        break
      }
      case 'rec': this.popText(f.x, 84, '● REC', '#ff5470'); sfx('select'); break
      case 'recEnd': if ((e.value ?? 0) > 0) this.popText(f.x, 84, `녹음 완료 ${e.value}`, '#ff5470'); break
      case 'playback': this.popText(f.x, 84, `플레이백 ${e.value}!`, '#86efac'); sfx('wave'); this.camKick = { x: f.facing * 4, y: 0 }; if ((e.value ?? 0) >= 100) this.cameras.main.shake(160, 0.01); break
      case 'light': this.cameras.main.flash(120, 255, 250, 210); this.popText(e.x, 90, '조명 세팅!', '#fde68a'); sfx('trait'); break
      case 'wall': dust(e.x, 3); this.popText(e.x, 56, '세트!', '#d6b27a'); sfx('heavy'); this.camKick = { x: 0, y: 2 }; break
      case 'wallhit': dust(e.x, 1); sfx('block'); break
      case 'wallbreak': {
        for (let k = 0; k < 10; k++) { const b = this.w(this.add.rectangle(e.x, GROUND - 10 - k * 4, 4, 3, 0xc8955c).setDepth(30)); this.tweens.add({ targets: b, x: b.x + (Math.random() - 0.5) * 60, y: GROUND - Math.random() * 6, angle: 200, duration: 420, ease: 'Quad.out', onComplete: () => b.destroy() }) }
        this.popText(e.x, 50, '와장창!', '#ff9f43'); sfx('hitHeavy')
        break
      }
      case 'wallbounce': this.popText(e.x, 50, '벽꽝!', '#ff9f43'); this.cameras.main.shake(120, 0.012); sfx('hitHeavy'); dust(e.x, 2); break
      case 'detonate': {
        const o = this.match.fighters[1 - e.fighter]
        for (let k = 0; k < 16 + (e.value ?? 1) * 4; k++) { const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 26; const p = this.w(this.add.rectangle(o.x, GROUND - o.y - 36, 3, 3, k % 3 ? 0xff7eb6 : 0xffffff).setDepth(31)); this.tweens.add({ targets: p, x: o.x + Math.cos(a) * r, y: GROUND - o.y - 36 + Math.sin(a) * r, alpha: 0, duration: 500, onComplete: () => p.destroy() }) }
        this.popText(o.x, 80, `분장 완성 ×${e.value}!`, '#ff7eb6'); sfx('shutter')
        break
      }
    }
  }

  /** 두 캐릭터 가운데를 따라가며, 멀어지면 줌아웃 */
  private followCamera() {
    const [a, b] = this.match.fighters
    const dist = Math.abs(a.x - b.x)
    const target = Phaser.Math.Clamp(480 / (dist + 190), 1.15, 1.9)
    this.zoom += (target - this.zoom) * 0.08
    this.zoomKick *= 0.88
    this.camKick.x *= 0.78; this.camKick.y *= 0.78
    const cam = this.cameras.main
    cam.setZoom(this.zoom + this.zoomKick)
    const viewH = 270 / (this.zoom + this.zoomKick)
    // 지면이 화면 62% 지점 → 캐릭터 발이 아래쪽 버튼에 가리지 않음
    cam.centerOn((a.x + b.x) / 2 + this.camKick.x, GROUND - viewH * 0.12 + this.camKick.y)
  }

  private togglePause() {
    if (this.match.phase === 'matchOver') return
    this.paused = !this.paused
    if (this.paused) {
      const W = this.scale.width
      this.pauseLayer = this.ui(this.add.container(0, 0).setDepth(100))
      this.pauseLayer.add(this.add.rectangle(0, 0, W, 270, 0x000000, 0.78).setOrigin(0))
      this.pauseLayer.add(text(this, W / 2, 18, 'PAUSE · 기술표', 16, COLOR.accent))
      this.controls.show(false)   // 기술표를 가리지 않게 터치 버튼 숨김
      const ch = this.match.fighters[0].char
      const sp = (id: string) => ch.moves[id]?.cost ? ` (SP ${ch.moves[id]!.cost})` : ''
      // 왼쪽: 커맨드 콤보 / 오른쪽: 특수·필살·고유 특성
      const combos = ch.combos.map((c) => `${c.seq.map((t) => BTN_LABEL[t]).join(' ')} ▶ ${ch.moves[c.move]?.name ?? c.move}${sp(c.move)}`)
      if (this.setup.stage != null && this.setup.stage < 4) combos.push('', '(직급이 오르면 기술이 더 생겨요)')
      this.pauseLayer.add(text(this, 20, 40, '커맨드 콤보', 11, COLOR.dim, 0).setOrigin(0, 0))
      this.pauseLayer.add(text(this, 20, 56, combos.join('\n'), 11, COLOR.ink, 0).setOrigin(0, 0).setLineSpacing(3))
      const basic = [['특', 'special1'], ['↓+특', 'special2'], ['필살', 'super']].filter(([, id]) => ch.moves[id]).map(([k, id]) => `${k} ▶ ${ch.moves[id]!.name}${sp(id)}`)
      this.pauseLayer.add(text(this, 250, 40, '특수기', 11, COLOR.dim, 0).setOrigin(0, 0))
      this.pauseLayer.add(text(this, 250, 56, basic.join('\n'), 11, COLOR.ink, 0).setOrigin(0, 0).setLineSpacing(3))
      const ti = TRAIT_INFO[ch.trait]
      this.pauseLayer.add(text(this, 250, 116, `고유 버튼 (O) ▶ ${ti.name}`, 11, '#5eead4', 0).setOrigin(0, 0))
      this.pauseLayer.add(text(this, 250, 132, ti.desc, 11, COLOR.ink, 0).setOrigin(0, 0).setWordWrapWidth(215).setLineSpacing(2))
      this.pauseLayer.add(button(this, W / 2 - 80, 246, 140, 24, '계속하기', () => this.togglePause(), { color: 0x6a2c91 }))
      this.pauseLayer.add(button(this, W / 2 + 80, 246, 140, 24, '메뉴로', () => this.scene.start('Menu')))
    } else { this.pauseLayer?.destroy(); this.pauseLayer = undefined; this.controls.show(true) }
  }

  private showResult() {
    this.resultShown = true
    const win = this.match.winner === 0
    sfx(win ? 'win' : 'ko')
    const W = this.scale.width
    const layer = this.ui(this.add.container(0, 0).setDepth(100))
    layer.add(this.add.rectangle(0, 0, W, 270, 0x000000, 0.55).setOrigin(0))
    layer.add(this.add.text(W / 2, 92, win ? 'YOU WIN!' : 'YOU LOSE…', { fontFamily: FONT, fontSize: '32px', color: win ? '#ffd23f' : '#ff5470', stroke: '#0a0812', strokeThickness: 5, fontStyle: 'bold', resolution: 1 }).setOrigin(0.5))
    layer.add(text(this, W / 2, 124, win ? '"오케이! 이 구도로 갑니다."' : '"…다음 테이크 갑시다."', 11, COLOR.ink))
    if (this.setup.stage != null) {
      // 스테이지 모드: 이기면 승진 화면, 지면 다시 도전
      if (win) layer.add(button(this, W / 2, 160, 160, 24, '다음 ▶', () => this.scene.start('Promotion', { char: this.setup.p1, cleared: this.setup.stage }), { color: 0x6a2c91 }))
      else layer.add(button(this, W / 2, 160, 160, 24, '다시 촬영', () => this.scene.restart(this.setup), { color: 0x6a2c91 }))
      layer.add(button(this, W / 2, 192, 160, 24, '스테이지 선택으로', () => this.scene.start('Stage')))
    } else {
      layer.add(button(this, W / 2, 156, 140, 24, '재대결', () => this.scene.restart(this.setup), { color: 0x6a2c91 }))
      layer.add(button(this, W / 2, 188, 140, 24, '캐릭터 선택', () => this.scene.start('Select', { mode: 'vsai' })))
      layer.add(button(this, W / 2, 220, 140, 24, '메뉴로', () => this.scene.start('Menu')))
    }
  }

  update(_t: number, delta: number) {
    if (this.paused) return
    this.acc += Math.min(delta, 100) * (this.slow > 0 ? 0.35 : 1)
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS
      this.tick++   // 잔상·먼지·찌그러짐은 시뮬레이션 스텝 기준 (144Hz 화면에서도 같은 속도, 슬로모션에선 같이 느려짐)
      for (const sq of this.squash) { sq.x += (1 - sq.x) * 0.22; sq.y += (1 - sq.y) * 0.22 }
      if (this.slow > 0) this.slow--
      const p1 = this.controls.state
      const [a, b] = this.match.fighters
      const p2 = this.match.phase === 'fight' ? this.ai.input(b, a, this.match.frame) : emptyInput()
      this.handleEvents(this.match.step([p1, p2]))
    }
    this.match.fighters.forEach((f, i) => this.drawFighter(f, i))
    this.followCamera()
    this.drawProjectiles()
    this.drawTraits()
    this.updateHud()
    if (this.dbg) this.drawDebug()
    if (this.match.phase === 'matchOver' && !this.resultShown && this.match.phaseFrame > 60) this.showResult()
  }
}

// 다른 장면에서 크기 상수가 필요할 때
export { FW }
