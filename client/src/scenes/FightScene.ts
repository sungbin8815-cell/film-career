// 전투 화면: Match(로직)를 60프레임 고정으로 돌리고 결과를 그립니다.
import Phaser from 'phaser'
import { Match } from '../core/Match'
import type { Fighter } from '../core/Fighter'
import { METER_MAX } from '../core/Fighter'
import { SimpleAI } from '../core/AI'
import { emptyInput, FPS, STAGE_W, type MatchEvent } from '../core/types'
import { getCharacter, atRank, RANK_MUL, howTo, moveList } from '../config/characters'
import { STAGES, BOSS_MUL, titleOf } from '../config/stages'
import { arenaFor } from '../config/arenas'
import { UltCinema } from './UltCine'
import { TRAIT_INFO, LENSES, cdKey } from '../core/Traits'
import type { Difficulty } from '../core/AI'
import { animKey, ensureFighterTexture } from '../gfx/TextureFactory'
import { animsFor, animOf } from '../gfx/charPoses'
import { FW, FH, FOOT_Y } from '../gfx/Painter'
import type { Controls } from '../ui/Controls'
import { button, text, COLOR, FONT } from '../ui/widgets'
import { settings } from '../ui/Settings'
import { sfx } from '../audio/Sfx'

const GROUND = 230
/** 스테이지 바깥 여백 (세트 벽) */
const EDGE = 140
const STEP_MS = 1000 / FPS

/** 전투 설정. VS 모드는 p1·p2만, 스테이지 모드는 stage(0~4)까지 */
export interface FightSetup { p1: string; p2: string; stage?: number; cpu?: Difficulty; /** 태그 모드: 두 번째 캐릭터 */ p1b?: string; p2b?: string }

export class FightScene extends Phaser.Scene {
  private match!: Match
  private ai!: SimpleAI
  private sprites: Phaser.GameObjects.Sprite[] = []
  private shadows: Phaser.GameObjects.Image[] = []
  private texKeys: string[] = []
  private projSprites = new Map<object, Phaser.GameObjects.Image>()
  private acc = 0
  private controls!: Controls
  private hud!: { trait: Phaser.GameObjects.Text[]; nameTxt: Phaser.GameObjects.Text[]; mate: Phaser.GameObjects.Rectangle[]; mateTxt: Phaser.GameObjects.Text[]; hp: Phaser.GameObjects.Rectangle[]; hpLag: Phaser.GameObjects.Rectangle[]; meter: Phaser.GameObjects.Rectangle[]; meterTxt: Phaser.GameObjects.Text[]; timer: Phaser.GameObjects.Text; pips: Phaser.GameObjects.Rectangle[][]; combo: Phaser.GameObjects.Text[] }
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
  private vfxG!: Phaser.GameObjects.Graphics
  private cinema?: UltCinema
  private tags: Phaser.GameObjects.Text[] = []
  private koSpin = [false, false]
  private assistSprites: Phaser.GameObjects.Sprite[] = []
  private uiCam!: Phaser.Cameras.Scene2D.Camera
  private zoom = 1.7
  private zoomKick = 0
  private slow = 0                                    // 슬로모션 남은 프레임
  private squash = [{ x: 1, y: 1 }, { x: 1, y: 1 }]  // 스쿼시·스트레치
  private tick = 0

  constructor() { super('Fight') }

  init(data: Partial<FightSetup>) {
    this.setup = { p1: data.p1 ?? 'dp', p2: data.p2 ?? 'dp', stage: data.stage, cpu: data.cpu, p1b: data.p1b, p2b: data.p2b }
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
    } else if (this.setup.p1b && this.setup.p2b) {
      // 태그 모드 (2대2)
      const t1 = [base1, getCharacter(this.setup.p1b)], t2 = [base2, getCharacter(this.setup.p2b)]
      this.match = new Match(t1, t2)
      this.ai = new SimpleAI(this.setup.cpu ?? settings.difficulty)
      this.names = [`1P ${base1.name}`, `CPU ${base2.name}`]
      this.bg = ['stage_chroma', 'stage_alley', 'stage_hanok', 'stage_roof', 'stage_award'][Math.floor(Math.random() * 5)]
      this.texKeys = [base1.id, base2.id === base1.id ? `${base2.id}_alt` : base2.id]
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
    this.slow = 0; this.zoomKick = 0; this.squash = [{ x: 1, y: 1 }, { x: 1, y: 1 }]; this.camKick = { x: 0, y: 0 }; this.koSpin = [false, false]
  }

  /** 월드(줌 카메라)에만 보이는 오브젝트 */
  private w<T extends Phaser.GameObjects.GameObject>(o: T): T { this.uiCam?.ignore(o); return o }
  /** 화면 고정 UI(줌 없는 카메라)에만 보이는 오브젝트 */
  private ui<T extends Phaser.GameObjects.GameObject>(o: T): T { this.cameras.main.ignore(o); return o }

  create() {
    const W = this.scale.width
    const before = new Set(this.children.list)
    // 넓은 스테이지: 배경 판을 이어 붙임 (가운데는 좌우 반전), 위쪽은 스튜디오 천장
    const ceil = this.add.graphics()
    // 배경 맨 윗줄 색을 위로 이어서 줌아웃해도 하늘·벽이 끊기지 않게
    const top = this.textures.getPixel(2, 1, this.bg)
    const topCol = top ? Phaser.Display.Color.GetColor(top.red, top.green, top.blue) : 0x0d0b17
    ceil.fillStyle(topCol, 1).fillRect(-40, -440, STAGE_W + 80, 442)
    ceil.fillStyle(0x000000, 0.25).fillRect(-40, -440, STAGE_W + 80, 260)
    // 바닥 아래도 이어서 (줌아웃 때 발밑이 비지 않게)
    const bot = this.textures.getPixel(2, 268, this.bg)
    ceil.fillStyle(bot ? Phaser.Display.Color.GetColor(bot.red, bot.green, bot.blue) : 0x1a1626, 1).fillRect(-40, 268, STAGE_W + 80, 90)
    ceil.lineStyle(2, 0x2f2a4d, 1)
    for (const yy of [-250, -150, -50]) { ceil.lineBetween(-40, yy, STAGE_W + 40, yy); ceil.lineBetween(-40, yy + 12, STAGE_W + 40, yy + 12); for (let x = 0; x < STAGE_W; x += 24) ceil.lineBetween(x, yy, x + 12, yy + 12) }
    for (let x = 0, k = 0; x < STAGE_W; x += 480, k++) this.add.image(x, 0, this.bg).setOrigin(0).setFlipX(k % 2 === 1)
    // 스테이지 양 끝: 세트 벽(여기에 부딪히면 튕김). 카메라가 벽 너머까지 보여서 끝에 있는 캐릭터가 터치 버튼에 가리지 않음
    const edge = this.add.graphics()
    for (const [x0, w] of [[-EDGE, EDGE], [STAGE_W, EDGE]] as const) {
      edge.fillStyle(0x2a2338, 1).fillRect(x0, -440, w, 800)
      edge.fillStyle(0x3b3355, 1)
      for (let y = -440; y < 280; y += 40) edge.fillRect(x0, y, w, 2)
      edge.fillStyle(0x0a0812, 1).fillRect(x0 === -EDGE ? -6 : STAGE_W, -320, 6, 600)
      edge.fillStyle(0xfacc15, 1)
      for (let y = 0; y < GROUND; y += 24) edge.fillRect(x0 === -EDGE ? -6 : STAGE_W, y, 6, 10)
      edge.fillStyle(0x1a1626, 1).fillRect(x0, GROUND, w, 130)
    }
    // 떠 있는 발판 (스테이지마다 모양이 다름)
    const arena = arenaFor(this.bg)
    this.match.platforms = arena.platforms
    this.drawPlatforms(this.add.graphics().setDepth(2), arena.look)
    for (const t of this.match.teams) for (const f of t.members) ensureFighterTexture(this, this.keyOf(f))
    this.controls = this.registry.get('controls') as Controls
    this.controls.show(true)
    this.events.once('shutdown', () => this.controls.show(false))

    // 특성 오브젝트(마크·조명·세트벽)와 머리 위 표시
    this.worldG = this.add.graphics().setDepth(3)
    this.vfxG = this.add.graphics().setDepth(28)
    this.tags = [0, 1].map(() => this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: '#ffffff', stroke: '#0a0812', strokeThickness: 3, resolution: 6 }).setOrigin(0.5).setScale(0.6).setDepth(33))
    this.match.fighters.forEach((f, i) => {
      this.shadows[i] = this.add.image(f.x, GROUND + 1, 'shadow').setDepth(1)
      this.sprites[i] = this.add.sprite(f.x, GROUND, this.keyOf(f)).setOrigin(0.5, FOOT_Y / FH).setDepth(5 + i)
      this.assistSprites[i] = this.add.sprite(-100, GROUND, this.keyOf(f)).setOrigin(0.5, FOOT_Y / FH).setDepth(4).setVisible(false)
    })
    const worldObjs = this.children.list.filter((o) => !before.has(o))
    this.buildHud(W)
    const hudObjs = this.children.list.filter((o) => !before.has(o) && !worldObjs.includes(o))
    // 카메라 두 대: 메인 = 두 캐릭터를 따라가며 확대, UI = HUD 고정
    const main = this.cameras.main
    main.setBounds(-EDGE, -440, STAGE_W + EDGE * 2, 780).setZoom(this.zoom).centerOn(this.match.fighters[0].x / 2 + this.match.fighters[1].x / 2, GROUND - 52)
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
    const trait: Phaser.GameObjects.Text[] = [], nameTxt: Phaser.GameObjects.Text[] = [], mate: Phaser.GameObjects.Rectangle[] = [], mateTxt: Phaser.GameObjects.Text[] = []
    const hp: Phaser.GameObjects.Rectangle[] = [], hpLag: Phaser.GameObjects.Rectangle[] = [], meter: Phaser.GameObjects.Rectangle[] = [], meterTxt: Phaser.GameObjects.Text[] = [], pips: Phaser.GameObjects.Rectangle[][] = [], combo: Phaser.GameObjects.Text[] = []
    this.match.fighters.forEach((f, i) => {
      const left = i === 0
      const x0 = left ? 10 : W - 10 - bw
      nameTxt[i] = text(this, left ? 10 : W - 10, 8, this.names[i], 11, i === 0 ? COLOR.accent : COLOR.red, left ? 0 : 1).setDepth(20)
      // 태그 모드: 대기 캐릭터 작은 체력바
      if (this.match.tag) {
        this.add.rectangle(left ? x0 + bw - 64 : x0, 44, 64, 4, COLOR.line).setOrigin(0).setDepth(20)
        mate[i] = this.add.rectangle(left ? x0 + bw - 63 : x0 + 1, 45, 62, 2, 0x86efac).setOrigin(0).setDepth(21)
        mateTxt[i] = text(this, left ? x0 + bw - 66 : x0 + 66, 46, '', 11, COLOR.dim, left ? 1 : 0).setDepth(21)
      }
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
    this.hud = { trait, nameTxt, mate, mateTxt, hp, hpLag, meter, meterTxt, timer, pips, combo }
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
      this.hud.meterTxt[i].setText(f.meter >= 100 ? '궁극기 OK!' : `SP ${Math.floor(f.meter)}`)
      this.hud.pips[i].forEach((p, k) => p.setFillStyle(k < m.wins[i] ? 0xffd23f : 0x0a0812))
      if (m.tag) {
        const t = m.teams[i], p = t.members.find((x) => x !== f)!
        const nm = `${i === 0 ? '1P' : 'CPU'} ${f.char.name}`
        if (this.hud.nameTxt[i].text !== nm) this.hud.nameTxt[i].setText(nm)
        this.hud.mate[i].width = 62 * Math.max(0, p.hp / p.maxHp)
        this.hud.mate[i].fillColor = p.hp <= 0 ? 0x3a3456 : 0x86efac
        const ms = `${p.char.name}${p.hp <= 0 ? ' (다운)' : ''}`
        if (this.hud.mateTxt[i].text !== ms) this.hud.mateTxt[i].setText(ms)
      }
      const tl = m.world.gauge(f).text
      if (this.hud.trait[i].text !== tl) this.hud.trait[i].setText(tl)
    })
    this.hud.timer.setText(String(Math.max(0, m.timeLeft)))
    this.controls.setMeter(m.fighters[0].meter)
    this.controls.setTag(m.tag, m.teams[0].swapCd, m.teams[0].assistCd)
    // 스킬 버튼: 쿨타임 숫자, 쓸 수 있으면 불
    const me = m.fighters[0]
    const live = m.phase === 'fight'
    for (const slot of ['C', 'D'] as const) {
      const id = m.world.remapMove(me, `${slot}_n`)
      const mv = me.char.moves[id]
      const cd = mv ? me.cds[cdKey(mv.id)] ?? 0 : 0
      this.controls.setSkill(slot, slot === 'D' ? TRAIT_INFO[me.char.trait].button : 'C', cd, live && !!mv && m.world.canUse(me, mv))
    }
  }

  // ───── 그리기 ─────
  /** 이 파이터의 텍스처 키 (같은 캐릭터가 양 팀에 있으면 2P는 다른 색, 스테이지 보스는 보스 색) */
  private keyOf(f: Fighter) {
    const st = this.setup.stage != null ? STAGES[this.setup.stage] : null
    if (f.idx === 1 && st?.boss) return `${f.char.id}_boss`
    const mine = this.match.teams[0].members.some((m) => m.char.id === f.char.id)
    return f.idx === 1 && mine ? `${f.char.id}_alt` : f.char.id
  }

  private drawFighter(f: Fighter, i: number, spr = this.sprites[i]) {
    const key = this.keyOf(f)
    if (spr.texture.key !== key) { spr.setTexture(key); this.texKeys[i] = key }
    // 히트스톱 중 맞은 쪽 덜덜 떨림
    const jitter = this.match.hitstop > 0 && f.inHitstun ? (this.tick % 2 ? 1 : -1) : 0
    spr.setPosition(Math.round(f.x) + jitter, Math.round(GROUND - f.y))
    spr.setFlipX(f.facing < 0)
    const sq = this.squash[i]
    // 과장 동작: 예비 동작에 움츠렸다가, 판정 순간 쭉 늘어남 (무거운 기술일수록 크게)
    if (f.state === 'attack' && f.move && spr === this.sprites[i]) {
      const w = Math.min(1, (f.move.damage + (f.move.projectile?.damage ?? 0)) / 90)
      if (f.moveFrame === 1) this.squash[i] = { x: 1 - 0.1 * w, y: 1 + 0.08 * w }
      if (f.moveFrame === f.move.startup) this.squash[i] = { x: 1 + 0.22 * w, y: 1 - 0.14 * w }
    }
    spr.setScale(sq.x, sq.y)
    // KO 회전 / 리테이크 정지(흑백) / 기절 흔들림
    if (this.koSpin[i] && f.state === 'knockback') spr.setAngle(spr.angle + 24 * f.facing * -1)
    else if (spr.angle !== 0) spr.setAngle(0)
    if (this.koSpin[i] && f.state !== 'knockback' && f.state !== 'hit') this.koSpin[i] = false
    if (f.dizzy > 0) spr.x += Math.sin(this.tick * 0.35) * 1.5
    this.shadows[i].setPosition(Math.round(f.x), GROUND + 1).setScale(1 - Math.min(0.5, f.y / 120), 1)
    let anim = f.state as string
    if (f.state === 'attack' && f.move) {
      const m = f.move
      const ANIMS = animsFor(f.char.id)
      const want = m.copyOf ? m.anim ?? m.id : animOf(m)
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
    const seq = howTo(ch, moveId)
    const y = 206   // 머리 위 말풍선과 겹치지 않게 아래쪽에
    const band = this.ui(this.add.rectangle(fighter === 0 ? -240 : 720, y, 300, 24, fighter === 0 ? 0x2f6fe4 : 0xe0353f).setDepth(39).setAngle(-4))
    const t = this.ui(this.add.text(fighter === 0 ? -240 : 720, y, `${seq} ▶ ${name}!`, { fontFamily: FONT, fontSize: '14px', color: '#fff8e7', stroke: '#0a0812', strokeThickness: 3, fontStyle: 'bold', resolution: 1 }).setOrigin(0.5).setDepth(40).setAngle(-4))
    const tx = fighter === 0 ? 170 : 310
    this.tweens.add({ targets: [band, t], x: tx, duration: 160, ease: 'Back.out' })
    this.tweens.add({ targets: [band, t], alpha: 0, x: tx + (fighter === 0 ? 40 : -40), delay: 900, duration: 220, onComplete: () => { band.destroy(); t.destroy() } })
  }

  /** 필살기 컷인: 레터박스 + 캐릭터 + 이름 */
  /** 궁극기 연출: 시작(첫 타 명중) → 박자마다 타격 → 끝(날려 보냄) / 헛침은 짧게 */
  private onCine(e: Extract<MatchEvent, { type: 'cine' }>) {
    const att = this.match.fighters[e.fighter], def = this.match.fighters[1 - e.fighter]
    switch (e.phase) {
      case 'start': {
        this.cinema?.end(() => undefined)
        const ak = this.texKeys[e.fighter], dk = this.texKeys[1 - e.fighter]
        const sup = animsFor(att.char.id).super
        this.cinema = new UltCinema(this, (o) => this.ui(o), e.char, ak, `super_${Math.min(1, sup.frames.length - 1)}`, dk, 'hit_0', this.match.cine?.name ?? '', e.fighter, e.value ?? 150)
        this.controls.show(false)
        sfx('super')
        break
      }
      case 'hit': this.cinema?.hit(e.value ?? 1); sfx(e.value && e.value >= 6 ? 'hitFinish' : 'hitHeavy'); navigator.vibrate?.(e.value && e.value >= 6 ? 60 : 20); break
      case 'end': {
        const c = this.cinema
        this.cinema = undefined
        c?.end(() => undefined)
        if (this.match.phase === 'fight' || this.match.phase === 'ko') this.controls.show(true)
        this.impact(def.x, def.y + 34, 3, 0xffd23f, e.value, def.x >= att.x ? 1 : -1)
        this.cameras.main.shake(300, 0.02)
        this.zoomKick = Math.max(this.zoomKick, 0.25)
        this.bigText(`${e.value ?? ''} DAMAGE!`, '#ffd23f', 22, 700)
        break
      }
      case 'whiff':
        this.popText(att.x, 90, 'NG… 헛스윙!', '#9ca3af')
        this.onomato(att.x, 60, '휙—', '#9ca3af')
        break
    }
  }

  /** 궁극기로 KO: 필름이 타들어 가는 특별 연출 */
  private ultKo(winner: number) {
    const f = this.match.fighters[winner]
    this.slow = Math.max(this.slow, 90)
    this.koSpin[1 - winner] = true
    this.cameras.main.flash(300, 255, 240, 200)
    this.zoomKick = Math.max(this.zoomKick, 0.4)
    sfx('ko'); sfx('shutter')
    const g = this.ui(this.add.graphics().setDepth(95))
    let k = 0
    const burn = this.time.addEvent({ delay: 30, repeat: 40, callback: () => {
      k++
      g.clear()
      for (let i = 0; i < 18; i++) {
        const r = k * 3 + ((i * 37) % 20)
        g.fillStyle(i % 2 ? 0xff9f43 : 0x7c2d12, 0.8).fillCircle((i * 61) % 480, i % 3 ? 0 : 270, r)
        g.fillStyle(0x0a0812, 0.9).fillCircle((i * 61) % 480, i % 3 ? -6 : 276, r * 0.7)
      }
    } })
    const t = this.ui(this.add.text(240, 120, 'FINAL CUT!!', { fontFamily: FONT, fontSize: '34px', color: '#ffd23f', stroke: '#0a0812', strokeThickness: 6, fontStyle: 'bold', resolution: 1 }).setOrigin(0.5).setDepth(96).setScale(3))
    const s = this.ui(this.add.text(240, 152, `${f.char.name} — 궁극기 K.O.`, { fontFamily: FONT, fontSize: '12px', color: '#fff8e7', stroke: '#0a0812', strokeThickness: 3, resolution: 1 }).setOrigin(0.5).setDepth(96).setAlpha(0))
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.out' })
    this.tweens.add({ targets: s, alpha: 1, delay: 300, duration: 200 })
    this.tweens.add({ targets: [t, s, g], alpha: 0, delay: 1700, duration: 400, onComplete: () => { burn.remove(); t.destroy(); s.destroy(); g.destroy() } })
  }

  private superCutIn(fighter: number) {
    const f = this.match.fighters[fighter]
    const key = this.texKeys[fighter]
    const top = this.ui(this.add.rectangle(0, -30, 480, 30, 0x000000).setOrigin(0).setDepth(41))
    const bot = this.ui(this.add.rectangle(0, 270, 480, 30, 0x000000).setOrigin(0).setDepth(41))
    const dark = this.ui(this.add.rectangle(0, 0, 480, 270, 0x0a0812, 0.65).setOrigin(0).setDepth(36))
    const band = this.ui(this.add.rectangle(240, 140, 480, 64, fighter === 0 ? 0x2f6fe4 : 0xe0353f).setDepth(37))
    const who = this.ui(this.add.sprite(fighter === 0 ? -60 : 540, 172, key, `super_${Math.min(1, animsFor(f.char.id).super.frames.length - 1)}`).setOrigin(0.5, 1).setScale(2.2).setFlipX(fighter !== 0).setDepth(38))
    const t = this.ui(this.add.text(fighter === 0 ? 300 : 180, 140, `🎥 ${f.move?.name ?? '궁극기'}!!`, { fontFamily: FONT, fontSize: '22px', color: '#ffd23f', stroke: '#0a0812', strokeThickness: 4, fontStyle: 'bold', resolution: 1 }).setOrigin(0.5).setDepth(39).setScale(1.8))
    this.tweens.add({ targets: top, y: 0, duration: 120 }); this.tweens.add({ targets: bot, y: 240, duration: 120 })
    this.tweens.add({ targets: who, x: fighter === 0 ? 110 : 370, duration: 200, ease: 'Cubic.out' })
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.out' })
    this.tweens.add({ targets: [dark, band, who, t, top, bot], alpha: 0, delay: 420, duration: 160, onComplete: () => [dark, band, who, t, top, bot].forEach((o) => o.destroy()) })
  }

  private applyFlash(spr: Phaser.GameObjects.Sprite, i: number) {
    const f = this.match.fighters[i]
    if (this.flash[i] > 0) { spr.setTintFill(0xffffff); this.flash[i]-- } else if (f.frozen > 0) spr.setTint(0x9ca3af)
    else spr.clearTint()
  }

  private drawProjectiles() {
    const live = new Set(this.match.projectiles)
    for (const [p, img] of this.projSprites) if (!live.has(p as never)) { img.destroy(); this.projSprites.delete(p) }
    for (const p of this.match.projectiles) {
      let img = this.projSprites.get(p)
      if (!img) {
        // 그림 기준점: 조명은 바닥(72), 빛기둥은 바닥(66), 나머지는 물체 가운데(60)
        const oy = p.kind === 'lightstand' ? 1 : p.kind === 'beam' ? 66 / FH : 60 / FH
        img = this.w(this.add.image(p.x, GROUND - p.y, this.textures.exists(`proj_${p.kind}`) ? `proj_${p.kind}` : 'proj_snipe').setOrigin(0.5, oy).setDepth(8).setFlipX(p.vx < 0)); this.projSprites.set(p, img)
      }
      const mid = p.kind === 'lightstand' || p.kind === 'beam' ? 0 : p.h / 2
      img.setPosition(Math.round(p.x), Math.round(GROUND - p.y - mid))
      if (p.gy) img.setAngle(p.age * 14 * Math.sign(p.vx))                 // 던진 물건은 빙글빙글
      if (p.kind === 'wave' || p.kind === 'cut') img.setScale(1 + Math.sin(p.age * 0.5) * 0.12)
      if (p.kind === 'beam') img.setAlpha(0.75 + Math.sin(p.age * 0.9) * 0.25)
    }
  }

  /** 스킬 오브젝트·상태 그리기: 콘티, 애플박스, 세트벽, 소파, 스폿, 기절 별, 묶임, 멈춤, 노이즈 월 */
  private drawTraits() {
    const g = this.worldG
    const m = this.match
    const W = m.world
    g.clear()
    m.fighters.forEach((f, i) => {
      const t = f.trait
      const col = i === 0 ? 0x5ec8ff : 0xff5470
      const o = m.fighters[1 - i]
      for (const x of t.traps) {   // 연출 콘티 (바닥에 붙은 종이 + 테이프)
        const y = GROUND + 2
        g.fillStyle(0xf4f1ea, 1).fillRect(x - 8, y - 2, 16, 5)
        g.fillStyle(0x26232e, 1).fillRect(x - 6, y - 1, 5, 1).fillRect(x + 1, y + 1, 5, 1)
        g.lineStyle(1, col, 1).strokeRect(x - 9, y - 3, 18, 7)
        if (this.tick % 40 < 20) g.fillStyle(0xfacc15, 1).fillRect(x - 1, y - 5, 2, 2)
      }
      if (t.spot > 0) {            // 조명 팔로우 스폿 (상대를 따라감)
        const x = o.x
        g.fillStyle(0xfef9c3, 0.12 + 0.05 * Math.sin(this.tick * 0.3)).fillTriangle(x - 4, 0, x - 30, GROUND - o.y + 2, x + 30, GROUND - o.y + 2)
        g.fillStyle(0xfef9c3, 0.2).fillEllipse(x, GROUND + 1, 60, 6)
      }
      if (f.state === 'attack' && f.move?.effect === 'noisewall' && f.moveFrame >= f.move.startup && f.moveFrame < f.move.startup + f.move.active) {
        const x = f.x + f.facing * 20
        for (let k = 0; k < 4; k++) { g.lineStyle(2, 0x86efac, 0.8 - k * 0.15); g.beginPath(); g.arc(x - f.facing * 6, GROUND - f.y - 26, 14 + k * 5 + (this.tick % 6), -1.1, 1.1, false); g.strokePath() }
      }
      if (f.dizzy > 0) {           // 기절: 머리 위 별 빙글빙글
        for (let k = 0; k < 3; k++) {
          const a = this.tick * 0.18 + (k * Math.PI * 2) / 3
          const sx = f.x + Math.cos(a) * 11, sy = GROUND - f.y - 64 + Math.sin(a) * 3
          g.fillStyle(0xfde047, 1).fillRect(sx - 2, sy, 5, 1).fillRect(sx, sy - 2, 1, 5)
        }
      }
      if (f.snare > 0) {           // 콘티에 묶임: 발목에 테이프 칭칭
        g.lineStyle(2, 0xfacc15, 1).strokeEllipse(f.x, GROUND - f.y - 4, 22, 6)
        g.lineStyle(1, 0x26232e, 1).strokeEllipse(f.x, GROUND - f.y - 7, 18, 5)
      }
      if (f.frozen > 0) {          // 리테이크: 멈춘 화면 테두리
        g.lineStyle(1, 0xffffff, 0.8).strokeRect(f.x - 16, GROUND - f.y - 64, 32, 64)
        g.fillStyle(0xffffff, 1).fillRect(f.x - 16, GROUND - f.y - 64, 4, 1).fillRect(f.x + 12, GROUND - f.y - 1, 4, 1)
      }
      if (f.blind > 0 && this.tick % 8 < 5) g.fillStyle(0xfbcfe8, 0.7).fillRect(f.x - 8 + (this.tick % 5), GROUND - f.y - 56, 3, 3).fillRect(f.x + 4 - (this.tick % 4), GROUND - f.y - 50, 2, 2)
      // 머리 위 짧은 표시: 망원 초점·사운드 게이지·노출
      const tag = this.tags[i]
      let s = '', c = '#5eead4'
      if (f.char.trait === 'lens') { s = LENSES[t.lens].short; if (t.lens === 2 && t.focus > 0) s += t.focus >= 100 ? ' ◎' : ` ${'▮'.repeat(Math.ceil(t.focus / 25))}`; if (t.focus >= 100) c = '#ff5470' }
      else if (f.char.trait === 'rec' && t.res >= 30) { s = `♪${Math.round(t.res)}`; c = t.res >= 70 ? '#ff5470' : '#86efac' }
      tag.setText(s).setPosition(f.x, GROUND - f.y - 70).setColor(c)
      // 조명: 상대 머리 위 노출 막대
      if (f.char.trait === 'light' && t.expose > 0) {
        g.fillStyle(0x0a0812, 1).fillRect(o.x - 13, GROUND - o.y - 70, 26, 4)
        g.fillStyle(t.expose >= 80 ? 0xff5470 : 0xfde68a, 1).fillRect(o.x - 12, GROUND - o.y - 69, 24 * (t.expose / 100), 2)
      }
      // 분장막: 몸 둘레 분홍 테두리
      if (f.char.trait === 'makeup' && t.res > 0) { g.lineStyle(1, 0xff7eb6, 0.25 + 0.5 * (t.res / 100)); g.strokeEllipse(f.x, GROUND - f.y - 26, 34, 58) }
    })
    for (const bx of W.boxes) {      // 미술 애플박스 (발판)
      const x = bx.x, top = GROUND - bx.y - bx.h
      if (bx.y > 0) { g.fillStyle(0x6b4423, 1).fillRect(x - bx.w / 2 + 2, top + bx.h, 2, Math.min(bx.y, 40)).fillRect(x + bx.w / 2 - 4, top + bx.h, 2, Math.min(bx.y, 40)) }
      g.fillStyle(0x0a0812, 1).fillRect(x - bx.w / 2 - 1, top - 1, bx.w + 2, bx.h + 1)
      g.fillStyle(0xd6a35c, 1).fillRect(x - bx.w / 2, top, bx.w, bx.h)
      g.fillStyle(0x8b5a2b, 1).fillRect(x - 6, top + 5, 12, 5).fillRect(x - bx.w / 2, top, bx.w, 1)
      if (bx.hp <= 2) g.lineStyle(1, 0x3b2312, 1).lineBetween(x - 10, top + 2, x - 4, top + 12)
      g.fillStyle(bx.owner === 0 ? 0x5ec8ff : 0xff5470, 1).fillRect(x - bx.w / 2, top, 3, 2)
    }
    for (const w of W.walls) {       // 합판 세트벽 (금 간 정도 = 남은 내구도)
      const x = w.x, hh = w.h, top = GROUND - hh
      g.fillStyle(0x0a0812, 1).fillRect(x - 7, top - 1, 14, hh + 1)
      g.fillStyle(0xc8955c, 1).fillRect(x - 6, top, 12, hh)
      g.fillStyle(0xa87442, 1).fillRect(x - 6, top + hh / 3, 12, 1).fillRect(x - 6, top + (hh * 2) / 3, 12, 1).fillRect(x - 1, top, 1, hh)
      g.fillStyle(0x6b4423, 1).fillRect(x - 8, GROUND - 4, 16, 4)
      g.lineStyle(1, 0x3b2312, 1)
      if (w.hp <= 2) g.lineBetween(x - 4, top + 6, x + 2, top + 18).lineBetween(x + 2, top + 18, x - 1, top + 24)
      if (w.hp <= 1) g.lineBetween(x + 4, top + 26, x - 3, top + 38).lineBetween(x - 3, top + 38, x + 2, top + 44)
      g.fillStyle(w.owner === 0 ? 0x5ec8ff : 0xff5470, 1).fillRect(x - 6, top, 12, 2)
    }
    for (const d of W.delayed) {     // 떨어질 자리 경고 → 쾅 (소파·조명·기둥·붕괴)
      const warn = Math.max(0, d.t)
      const col = d.kind === 'sofa' ? 0xb91c1c : d.kind === 'pillar' ? 0x86efac : d.kind === 'toplight' ? 0xfef08a : 0xd6a35c
      g.fillStyle(col, 0.12 + 0.25 * (this.tick % 10 < 5 ? 1 : 0)).fillEllipse(d.x, GROUND + 1, 54, 7)
      g.lineStyle(1, col, 0.8).strokeEllipse(d.x, GROUND + 1, 54 - warn, 7)
      if (d.kind === 'sofa') {
        const y = GROUND - 14 - warn * 5
        g.fillStyle(0x0a0812, 1).fillRect(d.x - 23, y - 1, 46, 16)
        g.fillStyle(0xb91c1c, 1).fillRect(d.x - 22, y, 44, 14)
        g.fillStyle(0x7f1d1d, 1).fillRect(d.x - 22, y + 8, 44, 6).fillRect(d.x - 22, y - 6, 8, 14).fillRect(d.x + 14, y - 6, 8, 14)
      } else if (warn < 6) g.fillStyle(col, 0.5).fillRect(d.x - 10, 0, 20, GROUND)
    }
    for (const fl of W.fields) {     // 장판: 우퍼(음파 고리) · 바닥 조명 · 독
      const col = fl.kind === 'woofer' ? 0x86efac : fl.kind === 'floorlight' ? 0xfef08a : 0xa3e635
      g.fillStyle(col, 0.16).fillRect(fl.x - fl.w / 2, GROUND - 3, fl.w, 5)
      for (let k = 0; k < 3; k++) { const r = ((this.tick * 0.6 + k * 12) % 36) / 36; g.lineStyle(1, col, 0.6 * (1 - r)).strokeEllipse(fl.x, GROUND, fl.w * r, 8 * r) }
    }
    for (const r of W.reflectors) {  // 조명 반사판
      g.fillStyle(0x0a0812, 1).fillRect(r.x - 1, GROUND - 30, 3, 30)
      g.fillStyle(0xe5e7eb, 1).fillRect(r.x - 8, GROUND - 46, 16, 18)
      g.fillStyle(0xfef9c3, 0.6 + 0.3 * Math.sin(this.tick * 0.2)).fillRect(r.x - 6, GROUND - 44, 12, 14)
    }
    for (const e of W.extras) {      // 연출 엑스트라: 단역 배우 (팀 색 조끼)
      const x = e.x, y = GROUND - e.y
      const col = e.owner === 0 ? 0x5ec8ff : 0xff5470
      const bob = e.lunge > 0 ? 0 : Math.sin(this.tick * 0.3 + x) * 1
      g.fillStyle(0x0a0812, 1).fillRect(x - 6, y - 34 + bob, 12, 34)
      g.fillStyle(0xf1c27d, 1).fillCircle(x, y - 30 + bob, 4)
      g.fillStyle(0x64748b, 1).fillRect(x - 5, y - 25 + bob, 10, 12)
      g.fillStyle(col, 1).fillRect(x - 5, y - 25 + bob, 10, 3)
      g.fillStyle(0x334155, 1).fillRect(x - 4, y - 13, 3, 12).fillRect(x + 1, y - 13, 3, 12)
      if (e.lunge > 0) g.lineStyle(2, 0xffffff, 0.5).lineBetween(x - 14, y - 20, x - 24, y - 20)
    }
    // 망원 렌즈: 조준선 (화면 끝까지)
    for (const f of m.fighters) if (f.char.trait === 'lens' && f.trait.lens === 2 && f.hp > 0) {
      const y = GROUND - f.y - 26, full = f.trait.focus >= 100
      g.lineStyle(1, full ? 0xff5470 : 0x93e1ff, full ? 0.7 : 0.3)
      for (let k = 0; k < 40; k++) { const x0 = f.x + f.facing * (24 + k * 14); g.lineBetween(x0, y, x0 + f.facing * 7, y) }
    }
  }

  /** 발판 그리기: 조명 트러스 / 비계 / 크레인 / 옥상 / 시상식 단상 */
  private drawPlatforms(g: Phaser.GameObjects.Graphics, look: string) {
    for (const p of this.match.platforms) {
      const x0 = p.x - p.w / 2, top = GROUND - p.y
      if (look === 'truss' || look === 'stage') {
        g.fillStyle(0x0a0812, 1).fillRect(x0 - 1, top - 1, p.w + 2, 10)
        g.fillStyle(0x9ca3af, 1).fillRect(x0, top, p.w, 2).fillRect(x0, top + 6, p.w, 2)
        g.lineStyle(1, 0x9ca3af, 1)
        for (let x = x0; x < x0 + p.w - 6; x += 8) g.lineBetween(x, top + 2, x + 8, top + 6)
        g.lineStyle(1, 0x4b5563, 1).lineBetween(x0 + 10, top + 8, x0 + 10, top - 200).lineBetween(x0 + p.w - 10, top + 8, x0 + p.w - 10, top - 200)
        for (let x = x0 + 16; x < x0 + p.w - 10; x += 34) { g.fillStyle(0x1f2937, 1).fillRect(x, top + 8, 8, 6); g.fillStyle(0xfef08a, 1).fillRect(x + 2, top + 13, 4, 2) }
      } else if (look === 'scaffold') {
        g.fillStyle(0x0a0812, 1).fillRect(x0 - 1, top - 1, p.w + 2, 6)
        g.fillStyle(0xd6a35c, 1).fillRect(x0, top, p.w, 4)
        g.lineStyle(2, 0xf59e0b, 1)
        for (const x of [x0 + 4, x0 + p.w - 4]) g.lineBetween(x, top + 4, x, GROUND)
        g.lineStyle(1, 0xf59e0b, 0.8).lineBetween(x0 + 4, top + 4, x0 + p.w - 4, GROUND).lineBetween(x0 + p.w - 4, top + 4, x0 + 4, GROUND)
      } else if (look === 'crane') {
        g.lineStyle(1, 0x26232e, 1).lineBetween(p.x - 20, top, p.x, top - 300).lineBetween(p.x + 20, top, p.x, top - 300)
        g.fillStyle(0x0a0812, 1).fillRect(x0 - 1, top - 1, p.w + 2, 8)
        g.fillStyle(0x8b5a2b, 1).fillRect(x0, top, p.w, 6)
        g.fillStyle(0x6b4423, 1).fillRect(x0, top + 4, p.w, 2)
      } else {
        g.fillStyle(0x0a0812, 1).fillRect(x0 - 1, top - 1, p.w + 2, GROUND - top + 1)
        g.fillStyle(0x64748b, 1).fillRect(x0, top, p.w, GROUND - top)
        g.fillStyle(0x94a3b8, 1).fillRect(x0, top, p.w, 3)
        for (let y = top + 10; y < GROUND; y += 10) g.fillStyle(0x475569, 1).fillRect(x0 + 4, y, p.w - 8, 1)
      }
    }
  }

  /** 긴 사거리 기술 이펙트: 판정 범위를 따라 그림 (붐대·레이저·베기·지진·기둥·부채꼴·채찍·발톱·필름) */
  private drawMoveFx() {
    const g = this.vfxG
    g.clear()
    for (const f of this.match.fighters) {
      const m = f.move
      if (!m || f.state !== 'attack' || !m.vfx) continue
      const st = m.startup, t = f.moveFrame - st
      const hb = f.hitbox()
      // 예비 동작: 모으는 중에는 빛이 모임
      if (t < 0) {
        if (f.charge > 0 || t > -4) { const r = 4 + (f.charge > 0 ? Math.min(14, f.charge / 3) : 2); g.fillStyle(0xffffff, 0.35 + 0.3 * Math.sin(this.tick)).fillCircle(f.x + f.facing * 14, GROUND - f.y - 30, r) }
        continue
      }
      if (!hb) continue
      const y0 = GROUND - hb.y - hb.h, cy = y0 + hb.h / 2
      const nearX = f.facing > 0 ? hb.x : hb.x + hb.w, farX = f.facing > 0 ? hb.x + hb.w : hb.x
      const fade = 1 - t / Math.max(1, m.active)
      switch (m.vfx) {
        case 'pole': {   // 붐대: 끝에 마이크(털뭉치)
          g.lineStyle(3, 0x0a0812, 1).lineBetween(nearX, cy, farX, cy)
          g.lineStyle(2, 0xd1d5db, 1).lineBetween(nearX, cy, farX, cy)
          g.fillStyle(0x0a0812, 1).fillEllipse(farX, cy, 16, 10)
          g.fillStyle(0x6b7280, 1).fillEllipse(farX, cy, 13, 8)
          g.lineStyle(1, 0xffffff, 0.5 * fade).lineBetween(nearX, cy - 4, farX - f.facing * 8, cy - 4)
          if (hb.h > 60) { g.lineStyle(3, 0xd1d5db, 1).lineBetween(f.x + f.facing * 8, GROUND - f.y - 20, f.x + f.facing * 8, y0); g.fillStyle(0x6b7280, 1).fillEllipse(f.x + f.facing * 8, y0, 10, 14) }
          break
        }
        case 'laser': {  // 빛줄기: 흰 심 + 노란 테두리
          g.fillStyle(0xfef08a, 0.5 * fade + 0.2).fillRect(hb.x, cy - hb.h / 2 - 3, hb.w, hb.h + 6)
          g.fillStyle(0xffffff, 0.9).fillRect(hb.x, cy - hb.h / 4, hb.w, Math.max(2, hb.h / 2))
          g.fillStyle(0xffffff, 0.8).fillCircle(nearX, cy, 6 + (this.tick % 3))
          for (let k = 0; k < 4; k++) g.fillStyle(0xfef9c3, 0.7).fillRect(hb.x + ((this.tick * 13 + k * 97) % Math.max(1, hb.w)), cy - 1, 6, 2)
          break
        }
        case 'slash': {  // 베기: 반달 궤적
          g.lineStyle(4, 0xffffff, 0.9 * fade)
          g.beginPath(); g.arc(f.x, cy, hb.w * 0.7, f.facing > 0 ? -1.2 : Math.PI - 1.2, f.facing > 0 ? 1.2 : Math.PI + 1.2, false); g.strokePath()
          g.lineStyle(2, 0x93e1ff, 0.7 * fade); g.beginPath(); g.arc(f.x, cy, hb.w * 0.6, f.facing > 0 ? -1 : Math.PI - 1, f.facing > 0 ? 1 : Math.PI + 1, false); g.strokePath()
          break
        }
        case 'quake': {  // 지진: 바닥 균열 + 튀는 흙
          g.lineStyle(2, 0x0a0812, 1)
          for (let x = hb.x; x < hb.x + hb.w; x += 14) g.lineBetween(x, GROUND + 1, x + 7, GROUND - 3 - ((x * 7) % 5)).lineBetween(x + 7, GROUND - 3 - ((x * 7) % 5), x + 14, GROUND + 1)
          for (let k = 0; k < 6; k++) g.fillStyle(0xd6a35c, fade).fillRect(hb.x + ((k * 53 + this.tick * 5) % Math.max(1, hb.w)), GROUND - 4 - ((t * 3 + k * 5) % 18), 3, 3)
          break
        }
        case 'pillar': { // 기둥: 위로 솟는 빛·음파
          g.fillStyle(0x86efac, 0.35 * fade + 0.15).fillRect(hb.x, y0, hb.w, hb.h)
          g.fillStyle(0xffffff, 0.6 * fade).fillRect(hb.x + hb.w / 3, y0, hb.w / 3, hb.h)
          break
        }
        case 'cone': {   // 부채꼴: 외침·스프레이
          g.fillStyle(0xfff8e7, 0.25 * fade + 0.1).fillTriangle(nearX, cy, farX, y0, farX, y0 + hb.h)
          for (let k = 1; k <= 3; k++) { const xx = nearX + (farX - nearX) * (k / 3) * ((t % 6) / 6 + 0.5) / 1.5; g.lineStyle(2, 0xffffff, 0.5 * fade).lineBetween(xx, cy - hb.h * 0.4 * k / 3, xx, cy + hb.h * 0.4 * k / 3) }
          break
        }
        case 'whip': {   // 채찍·케이블: 물결선
          g.lineStyle(2, 0x0a0812, 1); g.beginPath(); g.moveTo(nearX, cy)
          for (let k = 1; k <= 12; k++) g.lineTo(nearX + (farX - nearX) * (k / 12), cy + Math.sin(k * 1.3 + this.tick * 0.8) * 5 * (1 - k / 12))
          g.strokePath()
          g.lineStyle(1, 0xf472b6, 1); g.beginPath(); g.moveTo(nearX, cy)
          for (let k = 1; k <= 12; k++) g.lineTo(nearX + (farX - nearX) * (k / 12), cy + Math.sin(k * 1.3 + this.tick * 0.8) * 5 * (1 - k / 12))
          g.strokePath()
          break
        }
        case 'claw': {   // 크리처 발톱: 세 줄 긁기
          for (let k = 0; k < 3; k++) { g.lineStyle(3, 0xff5470, fade); g.lineBetween(nearX, y0 + k * hb.h / 3, farX, y0 + k * hb.h / 3 + hb.h / 3) }
          break
        }
        case 'film': {   // 필름: 구멍 뚫린 필름 띠
          g.fillStyle(0x0a0812, 0.9).fillRect(hb.x, cy - 8, hb.w, 16)
          for (let x = hb.x + 2; x < hb.x + hb.w - 4; x += 8) g.fillStyle(0xfef3c7, 1).fillRect(x, cy - 6, 4, 3).fillRect(x, cy + 3, 4, 3)
          break
        }
      }
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

  /** 만화 의성어: 굵은 글자가 기울어진 채 튀어나왔다 사라짐 (퍽! 쾅! 딱!) */
  private onomato(x: number, y: number, s: string, color = '#ffd23f', big = false) {
    const t = this.w(this.add.text(x + (Math.random() - 0.5) * 14, GROUND - y, s, { fontFamily: FONT, fontSize: big ? '16px' : '13px', color, stroke: '#0a0812', strokeThickness: 4, fontStyle: 'bold', resolution: 6 })
      .setOrigin(0.5).setDepth(37).setAngle((Math.random() - 0.5) * 30).setScale(0.2))
    this.tweens.add({ targets: t, scale: big ? 1.05 : 0.8, duration: 110, ease: 'Back.out' })
    this.tweens.add({ targets: t, y: t.y - 10, alpha: 0, scale: big ? 1.2 : 0.95, delay: big ? 520 : 360, duration: 220, onComplete: () => t.destroy() })
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
          if (e.crit) { this.bigText('FOCUS!!', '#ff5470', 22, 380); this.cameras.main.flash(90, 255, 255, 255) }
          // 만화 의성어: 기술 종류·세기에 따라
          const ono = e.crit ? '찰칵—쾅!!' : e.sfx === 'slate' ? '딱!' : e.sfx === 'shutter' ? '찰칵!' : e.sfx === 'wave' ? '우웅!' : e.sfx === 'spray' ? '칙!' : e.sfx === 'whip' ? '촥!' : e.finisher ? ['콰광!!', '와장창!!', '쾅!!'][e.combo % 3] : e.heavy ? ['쾅!', '빡!', '퍼억!'][e.combo % 3] : ['퍽!', '탁!', '툭!'][e.combo % 3]
          if (e.heavy || e.finisher || e.combo % 2 === 1 || e.sfx === 'slate' || e.crit) this.onomato(e.x + dir * 10, e.y + 22, ono, e.finisher ? '#ff9f43' : e.heavy ? '#ffd23f' : '#ffffff', e.finisher || !!e.crit)
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
        case 'bounce': {
          const f = this.match.fighters[e.fighter]
          const wall = e.kind === 'wall'
          const x = wall ? (f.x < STAGE_W / 2 ? 6 : STAGE_W - 6) : f.x
          this.impact(x, wall ? f.y + 30 : 2, 3, 0xffd23f, undefined, f.x < STAGE_W / 2 ? 1 : -1)
          this.onomato(x + (wall ? (f.x < STAGE_W / 2 ? 16 : -16) : 0), wall ? f.y + 52 : 34, wall ? '벽쿵!!' : '바운드!', '#ffd23f', true)
          this.cameras.main.shake(wall ? 220 : 160, wall ? 0.014 : 0.01)
          this.zoomKick = Math.max(this.zoomKick, 0.12)
          for (let k = 0; k < 6; k++) { const du = this.w(this.add.image(x, GROUND - (wall ? f.y + 10 + k * 8 : 0), 'dust').setDepth(4).setScale(1.3)); this.tweens.add({ targets: du, alpha: 0, x: du.x + (wall ? (f.x < STAGE_W / 2 ? 1 : -1) * (8 + k * 3) : (k - 2.5) * 10), y: du.y - 6, duration: 360, onComplete: () => du.destroy() }) }
          sfx('hitHeavy')
          break
        }
        case 'dash': {
          const f = this.match.fighters[e.fighter]
          const back = e.kind === 'backstep' ? -1 : 1
          const du = this.w(this.add.image(f.x - f.facing * back * 10, GROUND - f.y, 'dust').setDepth(4).setScale(1.2))
          this.tweens.add({ targets: du, alpha: 0, x: du.x - f.facing * back * 14, duration: 260, onComplete: () => du.destroy() })
          this.ghost(this.sprites[e.fighter], e.fighter)
          sfx('dash')
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
        case 'cine': this.onCine(e); break
        case 'ko': {
          if (e.ult) this.ultKo(e.winner)
          else { this.bigText('K.O.!', '#ff5470', 36, 1100); sfx('ko'); this.cameras.main.flash(200, 255, 255, 255) }
          // 진 쪽은 빙글빙글 날아감 (만화식 KO)
          this.koSpin[1 - e.winner] = true
          this.slow = Math.max(this.slow, 40)
          break
        }
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
        case 'tag': {
          const f = this.match.fighters[e.team]
          if (e.kind === 'swap' || e.kind === 'in') { this.popText(f.x, 90, `${e.name} 교대!`, e.team === 0 ? '#5ec8ff' : '#ff5470'); sfx('dash'); this.camKick = { x: 0, y: -3 } }
          if (e.kind === 'assist') { this.popText(f.x, 96, `${e.name} 어시스트!`, '#67e8f9'); sfx('trait') }
          if (e.kind === 'down') { this.bigText(`${e.name} 다운!`, '#ff5470', 22, 900); sfx('ko'); this.koSpin[e.team] = true; this.slow = Math.max(this.slow, 30) }
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

  /** 스킬 발동 연출 */
  private traitFx(e: Extract<MatchEvent, { type: 'trait' }>) {
    const f = this.match.fighters[e.fighter]
    const o = this.match.fighters[1 - e.fighter]
    const dust = (x: number, n = 2) => { for (let k = 0; k < n; k++) { const d = this.w(this.add.image(x + (k - n / 2) * 6, GROUND, 'dust').setDepth(4)); this.tweens.add({ targets: d, alpha: 0, y: GROUND - 8, x: d.x + (k - n / 2) * 6, duration: 360, onComplete: () => d.destroy() }) } }
    const burst = (x: number, y: number, color: number, n = 14, r = 30) => { for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, rr = r * (0.4 + Math.random() * 0.6); const p = this.w(this.add.rectangle(x, y, 3, 3, k % 3 ? color : 0xffffff).setDepth(31)); this.tweens.add({ targets: p, x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * 0.7, alpha: 0, duration: 420, onComplete: () => p.destroy() }) } }
    switch (e.kind) {
      case 'lens': this.popText(f.x, 84, `${LENSES[e.value ?? 1].name}!`, '#5eead4'); sfx('shutter'); break
      case 'trap': this.popText(e.x, 18, '콘티!', '#facc15'); sfx('trait'); break
      case 'snare': this.popText(e.x, 30, '묶였다!', '#facc15'); this.onomato(e.x, 20, '찌익!', '#facc15'); sfx('whip'); break
      case 'cue': this.cameras.main.flash(60, 255, 240, 150); this.onomato(e.x, 30, '큐!', '#facc15'); burst(e.x, GROUND - 14, 0xfacc15, 12, 34); sfx('slate'); break
      case 'parry': this.popText(e.x, 70, 'NG!!', '#ff5470'); this.onomato(e.x, 40, '탁!', '#ffffff'); this.cameras.main.flash(80, 255, 255, 255); this.slow = Math.max(this.slow, 14); sfx('counter'); break
      case 'retake': {
        const from = e.value ?? o.x
        const g = this.w(this.add.image(from, GROUND - o.y, this.texKeys[1 - e.fighter], this.sprites[1 - e.fighter].frame.name).setOrigin(0.5, FOOT_Y / FH).setFlipX(this.sprites[1 - e.fighter].flipX).setTintFill(0xffffff).setAlpha(0.7).setDepth(4))
        this.tweens.add({ targets: g, x: o.x, alpha: 0, duration: 260, onComplete: () => g.destroy() })
        this.bigText('리테이크!', '#ff5470', 22, 700); this.cameras.main.flash(120, 230, 230, 255); sfx('slate')
        break
      }
      case 'soundover': {
        const r = e.value ?? 50
        for (let k = 0; k < 4; k++) { const ring = this.w(this.add.circle(f.x, GROUND - 26, 6).setStrokeStyle(3, 0x86efac).setDepth(29)); this.tweens.add({ targets: ring, scale: 4 + r / 12, alpha: 0, delay: k * 70, duration: 420, onComplete: () => ring.destroy() }) }
        this.cameras.main.shake(200 + r * 4, 0.006 + r * 0.00018); this.onomato(f.x, 60, '쿠우웅!!', '#86efac'); sfx('hitFinish'); sfx('wave')
        break
      }
      case 'noisewall': this.onomato(e.x, 40, '지잉!', '#86efac'); sfx('block'); break
      case 'reverb': this.popText(e.x, 70, `~${e.value}`, '#86efac'); break
      case 'backlight': this.cameras.main.flash(70, 255, 250, 200); burst(e.x, GROUND - 30, 0xfef08a, 10, 24); sfx('shutter'); break
      case 'spot': this.popText(e.x, 84, '스폿!', '#fde68a'); sfx('trait'); break
      case 'stun': this.popText(e.x, 84, '눈부셔!!', '#fde047'); this.onomato(e.x, 60, '번쩍!', '#fef08a'); this.cameras.main.flash(140, 255, 255, 220); this.slow = Math.max(this.slow, 18); sfx('counter'); break
      case 'applebox': dust(e.x, 2); this.onomato(e.x, 30, '탕!', '#d6a35c'); sfx('heavy'); break
      case 'wall': dust(e.x, 3); this.onomato(e.x, 56, '세트!', '#d6b27a'); sfx('heavy'); this.camKick = { x: 0, y: 2 }; break
      case 'sofaWarn': this.popText(e.x, 96, '위!!', '#ff5470'); sfx('drop'); break
      case 'sofa': dust(e.x, 5); this.onomato(e.x, 40, '쿠당!!', '#ff9f43'); this.cameras.main.shake(180, 0.014); sfx('hitHeavy'); break
      case 'wallhit': dust(e.x, 1); sfx('block'); break
      case 'wallbreak': {
        for (let k = 0; k < 10; k++) { const b = this.w(this.add.rectangle(e.x, GROUND - 10 - k * 4, 4, 3, 0xc8955c).setDepth(30)); this.tweens.add({ targets: b, x: b.x + (Math.random() - 0.5) * 60, y: GROUND - Math.random() * 6, angle: 200, duration: 420, ease: 'Quad.out', onComplete: () => b.destroy() }) }
        this.onomato(e.x, 50, '와장창!', '#ff9f43'); sfx('hitHeavy')
        break
      }
      case 'wallbounce': this.onomato(e.x, 50, '벽꽝!', '#ff9f43'); this.cameras.main.shake(120, 0.012); sfx('hitHeavy'); dust(e.x, 2); break
      case 'base': burst(f.x, GROUND - 30, 0xff7eb6, 12, 20); this.popText(f.x, 84, `분장막 ${Math.round(e.value ?? 0)}`, '#ff7eb6'); sfx('spray'); break
      case 'shieldBreak': this.popText(f.x, 84, '분장 무너짐!', '#ff7eb6'); burst(f.x, GROUND - 30, 0xff7eb6, 10, 28); break
      case 'blind': this.popText(e.x, 84, '눈 따가워!', '#fbcfe8'); break
      case 'cleanse': burst(f.x, GROUND - 26, 0xff7eb6, 30, 56); this.cameras.main.flash(90, 255, 220, 240); this.onomato(f.x, 60, '싹!!', '#ff7eb6'); sfx('spray'); sfx('hitHeavy'); break
      case 'observe': this.popText(f.x, 84, `관찰 ${e.value}/2`, '#5eead4'); break
      case 'learn': case 'improv': this.popText(f.x, 84, `${e.value === 1 ? 'C' : '→C'} 복사: ${f.char.moves[`copy${e.value}`]?.name ?? ''}!`, '#5eead4'); burst(f.x, GROUND - 40, 0x5eead4, 12, 22); sfx('trait'); break
    }
  }

  /** 두 캐릭터 가운데를 따라가며, 멀어지면 줌아웃 */
  private followCamera() {
    const [a, b] = this.match.fighters
    const dist = Math.abs(a.x - b.x)
    const dy = Math.abs(a.y - b.y)
    const target = Phaser.Math.Clamp(Math.min(480 / (dist + 280), 270 / (dy + 150)), 0.42, 1.8)
    this.zoom += (target - this.zoom) * 0.08
    this.zoomKick *= 0.88
    this.camKick.x *= 0.78; this.camKick.y *= 0.78
    const cam = this.cameras.main
    cam.setZoom(this.zoom + this.zoomKick)
    const viewH = 270 / (this.zoom + this.zoomKick)
    // 지면이 화면 62% 지점 → 캐릭터 발이 아래쪽 버튼에 가리지 않음
    const midY = (a.y + b.y) / 2
    cam.centerOn((a.x + b.x) / 2 + this.camKick.x, GROUND - midY * 0.8 - viewH * 0.12 + this.camKick.y)
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
      // 기술표: 구역을 쪽으로 나눠 ◀ ▶ 로 넘김
      const pages: { title: string; lines: string[] }[] = []
      for (const sec of moveList(ch)) for (let i = 0; i < sec.lines.length; i += 20) pages.push({ title: sec.title, lines: sec.lines.slice(i, i + 20) })
      const ti = TRAIT_INFO[ch.trait]
      pages.push({ title: `특성: ${ti.name}`, lines: [`D 버튼 · 패시브: ${ti.passive}`, '', ti.desc, '', '방어: 상대 반대 방향 · 하단은 앉아서', '대시 →→ · 백스텝 ←← · 공중 대시(공중에서 →→)'] })
      if (this.setup.stage != null && this.setup.stage < 4) pages[pages.length - 1].lines.push('', '(직급이 오르면 기술이 더 생겨요)')
      let pi = 0
      const head = text(this, W / 2, 40, '', 11, COLOR.dim)
      const colL = text(this, 20, 56, '', 10, COLOR.ink, 0).setOrigin(0, 0).setLineSpacing(2)
      const colR = text(this, W / 2 + 6, 56, '', 10, COLOR.ink, 0).setOrigin(0, 0).setLineSpacing(2)
      colL.setWordWrapWidth(W / 2 - 26); colR.setWordWrapWidth(W / 2 - 26)
      const show = () => {
        const p = pages[pi]
        head.setText(`${p.title}  (${pi + 1}/${pages.length})`)
        colL.setText(p.lines.slice(0, 10).join('\n')); colR.setText(p.lines.slice(10).join('\n'))
      }
      show()
      this.pauseLayer.add([head, colL, colR])
      this.pauseLayer.add(button(this, 30, 40, 40, 20, '◀', () => { pi = (pi + pages.length - 1) % pages.length; show() }))
      this.pauseLayer.add(button(this, W - 30, 40, 40, 20, '▶', () => { pi = (pi + 1) % pages.length; show() }))
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
    // 태그 어시스트 캐릭터
    this.match.teams.forEach((t, i) => {
      const spr = this.assistSprites[i]
      if (t.assist) { spr.setVisible(true); this.drawFighter(t.assist, i, spr); spr.setAlpha(0.92) }
      else spr.setVisible(false)
    })
    if (this.cinema && this.match.cine) this.cinema.update(this.match.cine.t)
    this.followCamera()
    this.drawProjectiles()
    this.drawTraits()
    this.drawMoveFx()
    this.updateHud()
    if (this.dbg) this.drawDebug()
    if (this.match.phase === 'matchOver' && !this.resultShown && this.match.phaseFrame > 60) this.showResult()
  }
}

// 다른 장면에서 크기 상수가 필요할 때
export { FW }
