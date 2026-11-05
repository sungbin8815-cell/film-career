// 전투 화면: Match(로직)를 60프레임 고정으로 돌리고 결과를 그립니다.
import Phaser from 'phaser'
import { Match } from '../core/Match'
import type { Fighter } from '../core/Fighter'
import { METER_MAX } from '../core/Fighter'
import { SimpleAI } from '../core/AI'
import { emptyInput, FPS, type MatchEvent } from '../core/types'
import { getCharacter } from '../config/characters'
import { animKey } from '../gfx/TextureFactory'
import { FW, FH } from '../gfx/Painter'
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
      this.sprites[i] = this.add.sprite(f.x, GROUND, this.texKeys[i]).setOrigin(0.5, 62 / FH).setDepth(5 + i)
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
      const mx = left ? 10 : W - 10 - 120
      this.add.rectangle(mx - 2, 254, 124, 9, COLOR.line).setOrigin(0).setDepth(20)
      meter[i] = this.add.rectangle(mx, 256, 0, 5, 0x5ec8ff).setOrigin(0).setDepth(21)
      meterTxt[i] = text(this, left ? mx + 124 + 4 : mx - 6, 258, 'SP', 11, COLOR.blue, left ? 0 : 1).setDepth(21)
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
      this.hud.meter[i].width = 120 * (f.meter / METER_MAX)
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
    spr.setPosition(Math.round(f.x), Math.round(GROUND - f.y))
    spr.setFlipX(f.facing < 0)
    this.shadows[i].setPosition(Math.round(f.x), GROUND + 1).setScale(1 - Math.min(0.5, f.y / 120), 1)
    let anim = f.state as string
    if (f.state === 'attack' && f.move) {
      const m = f.move, tex = this.textures.get(key)
      const n = ['light', 'heavy'].includes(m.id) ? 3 : 2
      if (m.id === 'super' && f.moveFrame >= m.startup) anim = 'super'
      else {
        const idx = f.moveFrame < m.startup ? 0 : f.moveFrame < m.startup + m.active ? 1 : Math.min(n - 1, 2)
        spr.anims.stop()
        spr.setFrame(tex.has(`${m.id}_${idx}`) ? `${m.id}_${idx}` : `${m.id}_0`)
        this.applyFlash(spr, i)
        return
      }
    }
    if (f.state === 'guard' && f.stun > 0) anim = 'guard'
    const ak = animKey(key, anim)
    if (spr.anims.currentAnim?.key !== ak || !spr.anims.isPlaying && this.anims.get(ak)?.repeat === -1) spr.play(ak, true)
    this.applyFlash(spr, i)
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
          this.flash[def] = 3
          this.w(this.add.sprite(e.x, GROUND - e.y, 'spark')).setDepth(30).setScale(e.heavy ? 1.6 : 1.1).play('spark').once('animationcomplete', (_: unknown, __: unknown, s: Phaser.GameObjects.Sprite) => s.destroy())
          this.cameras.main.shake(e.heavy ? 160 : 70, e.heavy ? 0.012 : 0.005)
          sfx(e.heavy ? 'hitHeavy' : 'hit')
          if (e.combo >= 2) {
            const c = this.hud.combo[e.attacker]
            c.setText(`${e.combo} HIT!`).setAlpha(1).setScale(1.3)
            this.tweens.killTweensOf(c)
            this.tweens.add({ targets: c, scale: 1, duration: 120 })
            this.tweens.add({ targets: c, alpha: 0, delay: 900, duration: 300 })
          }
          break
        }
        case 'block':
          this.w(this.add.sprite(e.x, GROUND - e.y, 'blockspark')).setDepth(30).play('blockspark').once('animationcomplete', (_: unknown, __: unknown, s: Phaser.GameObjects.Sprite) => s.destroy())
          sfx('block')
          break
        case 'move': {
          const f = this.match.fighters[e.fighter]
          if (e.voice) this.bubble(f, e.voice)
          sfx(e.sfx === 'light' || e.sfx === 'heavy' ? 'swing' : e.sfx ?? 'swing')
          break
        }
        case 'super': {
          // 필살기 컷인: 화면 어둡게 + 이름
          const f = this.match.fighters[e.fighter]
          const dark = this.ui(this.add.rectangle(0, 0, 480, 270, 0x000000, 0.6).setOrigin(0).setDepth(9))
          const band = this.ui(this.add.rectangle(240, 120, 480, 34, 0xffd23f).setDepth(36))
          const t = this.ui(this.add.text(240, 120, `🎥 ${f.move?.name ?? '필살기'}!!`, { fontFamily: FONT, fontSize: '18px', color: '#0a0812', fontStyle: 'bold', resolution: 1 }).setOrigin(0.5).setDepth(37))
          this.tweens.add({ targets: [band, t], alpha: 0, delay: 350, duration: 150 })
          this.tweens.add({ targets: dark, alpha: 0, delay: 380, duration: 200, onComplete: () => { dark.destroy(); band.destroy(); t.destroy() } })
          sfx('shutter')
          break
        }
        case 'ko': this.bigText('K.O.!', '#ff5470', 36, 1100); sfx('ko'); this.cameras.main.flash(200, 255, 255, 255); break
        case 'timeup': this.bigText('TIME UP!', '#fff8e7', 26, 1000); break
        case 'jump': sfx('jump'); break
        case 'land': {
          const f = this.match.fighters[e.fighter]
          const d = this.w(this.add.image(f.x, GROUND, 'dust').setDepth(4))
          this.tweens.add({ targets: d, alpha: 0, y: GROUND - 4, duration: 300, onComplete: () => d.destroy() })
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
    const cam = this.cameras.main
    cam.setZoom(this.zoom)
    const viewH = 270 / this.zoom
    // 세로 화면: 지면을 화면 80% 지점 / 가로 화면: 버튼에 가리지 않게 62% 지점
    const landscape = window.innerWidth > window.innerHeight
    cam.centerOn((a.x + b.x) / 2, GROUND - viewH * (landscape ? 0.12 : 0.3))
  }

  private togglePause() {
    if (this.match.phase === 'matchOver') return
    this.paused = !this.paused
    if (this.paused) {
      const W = this.scale.width
      this.pauseLayer = this.ui(this.add.container(0, 0).setDepth(100))
      this.pauseLayer.add(this.add.rectangle(0, 0, W, 270, 0x000000, 0.7).setOrigin(0))
      this.pauseLayer.add(text(this, W / 2, 90, 'PAUSE', 18, COLOR.accent))
      this.pauseLayer.add(button(this, W / 2, 130, 140, 24, '계속하기', () => this.togglePause()))
      this.pauseLayer.add(button(this, W / 2, 162, 140, 24, '메뉴로', () => this.scene.start('Menu')))
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
    this.acc += Math.min(delta, 100)
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS
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
