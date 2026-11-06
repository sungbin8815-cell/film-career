// 전투 화면: Match(로직)를 60프레임 고정으로 돌리고 결과를 그립니다.
import Phaser from 'phaser'
import { Match } from '../core/Match'
import type { Fighter } from '../core/Fighter'
import { METER_MAX } from '../core/Fighter'
import { SimpleAI } from '../core/AI'
import { emptyInput, FPS, type MatchEvent } from '../core/types'
import { getCharacter, BTN_LABEL } from '../config/characters'
import { animKey } from '../gfx/TextureFactory'
import { ANIMS } from '../gfx/poses'
import { FW, FH, FOOT_Y } from '../gfx/Painter'
import type { Controls } from '../ui/Controls'
import { button, text, COLOR, FONT } from '../ui/widgets'
import { settings } from '../ui/Settings'
import { sfx } from '../audio/Sfx'

const GROUND = 230
const STEP_MS = 1000 / FPS

export class FightScene extends Phaser.Scene {
  private match!: Match
  private ai!: SimpleAI
  private sprites: Phaser.GameObjects.Sprite[] = []
  private shadows: Phaser.GameObjects.Image[] = []
  private texKeys: string[] = []
  private projSprites = new Map<object, Phaser.GameObjects.Image>()
  private acc = 0
  private controls!: Controls
  private hud!: { hp: Phaser.GameObjects.Rectangle[]; hpLag: Phaser.GameObjects.Rectangle[]; meter: Phaser.GameObjects.Rectangle[]; meterTxt: Phaser.GameObjects.Text[]; timer: Phaser.GameObjects.Text; pips: Phaser.GameObjects.Rectangle[][]; combo: Phaser.GameObjects.Text[] }
  private lagHp = [1, 1]
  private flash = [0, 0]
  private paused = false
  private pauseLayer?: Phaser.GameObjects.Container
  private resultShown = false
  private debug = new URLSearchParams(location.search).has('debug')
  private dbg?: Phaser.GameObjects.Graphics
  private p1Id = 'dp'
  private uiCam!: Phaser.Cameras.Scene2D.Camera
  private zoom = 1.7
  private zoomKick = 0
  private slow = 0                                    // 슬로모션 남은 프레임
  private squash = [{ x: 1, y: 1 }, { x: 1, y: 1 }]  // 스쿼시·스트레치
  private tick = 0

  constructor() { super('Fight') }

  init(data: { p1?: string; p2?: string }) {
    this.p1Id = data.p1 ?? 'dp'
    const c1 = getCharacter(this.p1Id), c2 = getCharacter(data.p2 ?? 'dp')
    this.match = new Match(c1, c2)
    this.ai = new SimpleAI(settings.difficulty)
    // 같은 캐릭터끼리면 2P는 다른 색
    this.texKeys = [c1.id, c2.id === c1.id ? `${c2.id}_alt` : c2.id]
    this.acc = 0; this.lagHp = [1, 1]; this.paused = false; this.resultShown = false
    this.projSprites = new Map()
    this.slow = 0; this.zoomKick = 0; this.squash = [{ x: 1, y: 1 }, { x: 1, y: 1 }]
  }

  /** 월드(줌 카메라)에만 보이는 오브젝트 */
  private w<T extends Phaser.GameObjects.GameObject>(o: T): T { this.uiCam?.ignore(o); return o }
  /** 화면 고정 UI(줌 없는 카메라)에만 보이는 오브젝트 */
  private ui<T extends Phaser.GameObjects.GameObject>(o: T): T { this.cameras.main.ignore(o); return o }

  create() {
    const W = this.scale.width
    const before = new Set(this.children.list)
    this.add.image(0, 0, 'stage_chroma').setOrigin(0)
    this.controls = this.registry.get('controls') as Controls
    this.controls.show(true)
    this.events.once('shutdown', () => this.controls.show(false))

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
    const hp: Phaser.GameObjects.Rectangle[] = [], hpLag: Phaser.GameObjects.Rectangle[] = [], meter: Phaser.GameObjects.Rectangle[] = [], meterTxt: Phaser.GameObjects.Text[] = [], pips: Phaser.GameObjects.Rectangle[][] = [], combo: Phaser.GameObjects.Text[] = []
    this.match.fighters.forEach((f, i) => {
      const left = i === 0
      const x0 = left ? 10 : W - 10 - bw
      text(this, left ? 10 : W - 10, 8, `${i === 0 ? '1P' : 'CPU'} ${f.char.name}`, 11, i === 0 ? COLOR.accent : COLOR.red, left ? 0 : 1).setDepth(20)
      this.add.rectangle(x0 - 2, 17, bw + 4, 12, COLOR.line).setOrigin(0).setDepth(20)
      this.add.rectangle(x0, 19, bw, 8, 0x5b1a2a).setOrigin(0).setDepth(20)
      hpLag[i] = this.add.rectangle(left ? x0 + bw : x0, 19, bw, 8, 0xff5470).setOrigin(left ? 1 : 0, 0).setDepth(21)
      hp[i] = this.add.rectangle(left ? x0 + bw : x0, 19, bw, 8, 0xffd23f).setOrigin(left ? 1 : 0, 0).setDepth(22)
      this.add.rectangle(left ? x0 + bw : x0, 19, bw, 2, 0xffffff, 0.35).setOrigin(left ? 1 : 0, 0).setDepth(23)
      // 라운드 승리 표시
      pips[i] = [0, 1].map((k) => this.add.rectangle(left ? x0 + bw - 6 - k * 10 : x0 + 6 + k * 10, 34, 7, 4, 0x0a0812).setStrokeStyle(1, 0xffd23f).setDepth(20))
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
    this.hud = { hp, hpLag, meter, meterTxt, timer, pips, combo }
  }

  private updateHud() {
    const m = this.match
    m.fighters.forEach((f, i) => {
      const frac = f.hp / f.char.hp
      this.hud.hp[i].width = 190 * frac
      this.lagHp[i] = Math.max(frac, this.lagHp[i] - 0.006)
      this.hud.hpLag[i].width = 190 * this.lagHp[i]
      this.hud.meter[i].width = 100 * (f.meter / METER_MAX)
      this.hud.meter[i].fillColor = f.meter >= 100 ? 0xffd23f : 0x5ec8ff
      this.hud.meterTxt[i].setText(f.meter >= 100 ? '필살 OK!' : `SP ${Math.floor(f.meter)}`)
      this.hud.pips[i].forEach((p, k) => p.setFillStyle(k < m.wins[i] ? 0xffd23f : 0x0a0812))
    })
    this.hud.timer.setText(String(Math.max(0, m.timeLeft)))
    this.controls.setMeter(m.fighters[0].meter)
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
      const animId = ANIMS[m.id] ? m.id : 'light'   // 애니메이션이 없는 기술은 약공격 모션으로
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

  /** 타격 임팩트: 불꽃 + 충격파 링 + 파편 + 데미지 숫자 */
  private impact(x: number, y: number, power: number, color: number, dmg?: number) {
    const sy = GROUND - y
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
    const who = this.ui(this.add.sprite(fighter === 0 ? -60 : 540, 172, key, 'super_0').setOrigin(0.5, 1).setScale(2.2).setFlipX(fighter !== 0).setDepth(38))
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
      if (!img) { img = this.w(this.add.image(p.x, GROUND - p.y, 'lightstand').setOrigin(0.5, 1).setDepth(8)); this.projSprites.set(p, img) }
      img.setPosition(Math.round(p.x), Math.round(GROUND - p.y))
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
          this.flash[def] = e.finisher ? 6 : 3
          const power = e.finisher ? 3 : e.heavy ? 2 : 1
          this.impact(e.x, e.y, power, e.attacker === 0 ? 0x5ec8ff : 0xff8a3d, e.damage)
          this.squash[def] = { x: 0.86, y: 1.12 }
          this.cameras.main.shake(e.finisher ? 260 : e.heavy ? 150 : 70, e.finisher ? 0.02 : e.heavy ? 0.011 : 0.005)
          sfx(e.heavy || e.finisher ? 'hitHeavy' : 'hit')
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

  /** 두 캐릭터 가운데를 따라가며, 멀어지면 줌아웃 */
  private followCamera() {
    const [a, b] = this.match.fighters
    const dist = Math.abs(a.x - b.x)
    const target = Phaser.Math.Clamp(480 / (dist + 190), 1.15, 1.9)
    this.zoom += (target - this.zoom) * 0.08
    this.zoomKick *= 0.88
    const cam = this.cameras.main
    cam.setZoom(this.zoom + this.zoomKick)
    const viewH = 270 / (this.zoom + this.zoomKick)
    // 지면이 화면 62% 지점 → 캐릭터 발이 아래쪽 버튼에 가리지 않음
    cam.centerOn((a.x + b.x) / 2, GROUND - viewH * 0.12)
  }

  private togglePause() {
    if (this.match.phase === 'matchOver') return
    this.paused = !this.paused
    if (this.paused) {
      const W = this.scale.width
      this.pauseLayer = this.ui(this.add.container(0, 0).setDepth(100))
      this.pauseLayer.add(this.add.rectangle(0, 0, W, 270, 0x000000, 0.78).setOrigin(0))
      this.pauseLayer.add(text(this, W / 2, 30, 'PAUSE · 기술표', 16, COLOR.accent))
      const ch = this.match.fighters[0].char
      const lines = ch.combos.map((c) => `${c.seq.map((t) => BTN_LABEL[t]).join(' ')}  ▶  ${ch.moves[c.move]?.name ?? c.move}${ch.moves[c.move]?.cost ? ` (SP ${ch.moves[c.move]!.cost})` : ''}`)
      lines.push('특 ▶ 숄더 어택 (SP 25) · ↓+특 ▶ 조명 낙하 (SP 25) · 필살 ▶ 원테이크 (SP 100)')
      this.pauseLayer.add(text(this, W / 2, 106, lines.join('\n'), 11, COLOR.ink).setAlign('center').setLineSpacing(3))
      this.pauseLayer.add(button(this, W / 2 - 80, 214, 140, 24, '계속하기', () => this.togglePause(), { color: 0x6a2c91 }))
      this.pauseLayer.add(button(this, W / 2 + 80, 214, 140, 24, '메뉴로', () => this.scene.start('Menu')))
    } else { this.pauseLayer?.destroy(); this.pauseLayer = undefined }
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
    layer.add(button(this, W / 2, 156, 140, 24, '재대결', () => this.scene.restart({ p1: this.p1Id, p2: 'dp' }), { color: 0x6a2c91 }))
    layer.add(button(this, W / 2, 188, 140, 24, '메뉴로', () => this.scene.start('Menu')))
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
    this.updateHud()
    if (this.dbg) this.drawDebug()
    if (this.match.phase === 'matchOver' && !this.resultShown && this.match.phaseFrame > 60) this.showResult()
  }
}

// 다른 장면에서 크기 상수가 필요할 때
export { FW }
