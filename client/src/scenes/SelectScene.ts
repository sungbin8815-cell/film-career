// 캐릭터 선택 / 캐릭터 소개 — 7명 모두 처음부터 선택 가능
// vsai: 1대1 (내 캐릭터 → CPU) / tag: 2대2 (내 2명 → CPU 2명) / view: 캐릭터 정보
import Phaser from 'phaser'
import { CHARACTERS } from '../config/characters'
import { animKey, ensureFighterTexture } from '../gfx/TextureFactory'
import { FH, FOOT_Y } from '../gfx/Painter'
import { button, text, COLOR, type Btn } from '../ui/widgets'
import { sfx } from '../audio/Sfx'
import type { CharacterData } from '../core/types'
import { TRAIT_INFO } from '../core/Traits'

type Mode = 'vsai' | 'tag' | 'view'

export class SelectScene extends Phaser.Scene {
  private mode: Mode = 'vsai'
  /** 지금까지 고른 캐릭터 순서: 1대1 [나, CPU], 태그 [나1, 나2, CPU1, CPU2] */
  private picks: number[] = []
  private picked = 0
  private cards: Phaser.GameObjects.Rectangle[] = []
  private badges: Phaser.GameObjects.Text[] = []
  private panel?: Phaser.GameObjects.Container
  private title!: Phaser.GameObjects.Text
  private nextBtn?: Btn
  constructor() { super('Select') }

  init(data: { mode?: Mode }) { this.mode = data.mode ?? 'vsai'; this.picks = []; this.picked = 0 }

  private get need() { return this.mode === 'tag' ? 4 : 2 }
  /** 지금 고르는 쪽이 CPU인지 */
  private get cpuTurn() { return this.picks.length >= this.need / 2 }

  create() {
    const W = this.scale.width
    this.add.rectangle(0, 0, W, 270, COLOR.bg).setOrigin(0)
    this.title = text(this, W / 2, 12, '', 14, COLOR.accent)
    this.cards = []; this.badges = []; this.nextBtn = undefined; this.panel = undefined
    CHARACTERS.forEach((c, i) => {
      const x = 36 + (i % 4) * 62, y = 76 + Math.floor(i / 4) * 96
      const card = this.add.rectangle(x, y, 58, 90, COLOR.panel).setStrokeStyle(2, COLOR.line)
      this.cards.push(card)
      this.add.rectangle(x, y - 44, 58, 3, hex(c.color))
      this.add.sprite(x, y + 26, c.id, 'idle_0').setOrigin(0.5, FOOT_Y / FH).setScale(0.95)
      text(this, x, y + 36, c.name, 11, c.color)
      this.badges.push(text(this, x + 22, y - 34, '', 11, COLOR.accent).setDepth(5))
      card.setInteractive({ useHandCursor: true }).on('pointerup', () => { this.picked = i; sfx('select'); this.refresh() })
    })

    if (this.mode !== 'view') {
      button(this, 58, 248, 100, 22, '← 뒤로', () => this.back())
      button(this, 168, 248, 100, 22, '랜덤', () => { this.picked = this.randomFree(); sfx('select'); this.refresh() })
      this.nextBtn = button(this, 370, 248, 170, 22, '', () => this.next(), { color: 0x6a2c91 })
    } else button(this, W / 2, 248, 140, 22, '← 메뉴', () => this.scene.start('Menu'))
    this.refresh()
    this.input.keyboard?.on('keydown-ENTER', () => this.mode !== 'view' && this.next())
    this.input.keyboard?.on('keydown-RIGHT', () => { this.picked = (this.picked + 1) % CHARACTERS.length; this.refresh() })
    this.input.keyboard?.on('keydown-LEFT', () => { this.picked = (this.picked + CHARACTERS.length - 1) % CHARACTERS.length; this.refresh() })
  }

  /** 같은 팀에 같은 캐릭터를 두 번 넣지 않게 */
  private teamOf(n: number) { return this.mode === 'tag' ? (n < 2 ? this.picks.slice(0, 2) : this.picks.slice(2, 4)) : [] }
  private takenNow() { return this.mode === 'tag' ? this.teamOf(this.picks.length) : [] }
  private randomFree() { const free = CHARACTERS.map((_, i) => i).filter((i) => !this.takenNow().includes(i)); return free[Math.floor(Math.random() * free.length)] }

  private back() {
    if (this.picks.length) { this.picked = this.picks.pop()!; this.refresh() } else this.scene.start('Menu')
  }

  private next() {
    if (this.takenNow().includes(this.picked)) { sfx('block'); return }
    sfx('confirm')
    this.picks.push(this.picked)
    if (this.picks.length < this.need) { this.picked = this.cpuTurn && this.picks.length === this.need / 2 ? this.randomFree() : this.picked; this.refresh(); return }
    sfx('slate')
    const id = (i: number) => CHARACTERS[this.picks[i]].id
    if (this.mode === 'tag') this.scene.start('Fight', { p1: id(0), p1b: id(1), p2: id(2), p2b: id(3) })
    else this.scene.start('Fight', { p1: id(0), p2: id(1) })
  }

  private refresh() {
    const n = this.picks.length
    const cpu = this.mode !== 'view' && this.cpuTurn
    const tag = this.mode === 'tag'
    const who = tag ? `${cpu ? 'CPU' : '내'} ${n % 2 + 1}번째` : cpu ? '상대 CPU' : '내 캐릭터'
    this.title.setText(this.mode === 'view' ? 'CHARACTER' : `${tag ? 'TAG MATCH 2 VS 2' : 'SOLO MATCH 1 VS 1'} · ${who} 고르기`)
    this.cards.forEach((c, i) => c.setStrokeStyle(i === this.picked ? 3 : 2, i === this.picked ? (cpu ? 0xff5470 : 0xffd23f) : COLOR.line))
    // 이미 고른 캐릭터 표시 (1P 파랑 / CPU 빨강)
    this.badges.forEach((b, i) => {
      const marks = this.picks.map((p, k) => (p === i ? (k < this.need / 2 ? '1P' : 'CP') : '')).filter(Boolean)
      b.setText(marks.join(' ')).setColor(marks[0] === 'CP' ? COLOR.red : COLOR.blue)
    })
    const last = n === this.need - 1
    this.nextBtn?.label.setText(last ? '대전 시작!' : tag ? `${n % 2 === 0 ? '첫' : '두'} 번째로 ▶` : '이 캐릭터로 ▶')
    this.drawPanel(CHARACTERS[this.picked], cpu)
  }

  /** 오른쪽 정보 패널: 그림, 이름, 능력치, 패시브·Q·W·E·R */
  private drawPanel(c: CharacterData, cpu: boolean) {
    this.panel?.destroy(true)
    const L = this.add.container(0, 0)
    this.panel = L
    const x0 = 262
    L.add(this.add.rectangle(x0 - 6, 26, 220, 208, COLOR.panel).setOrigin(0).setStrokeStyle(2, hex(c.color)))
    const mineIds = this.picks.slice(0, this.need / 2).map((i) => CHARACTERS[i].id)
    const skin = cpu && mineIds.includes(c.id) ? `${c.id}_alt` : c.id
    ensureFighterTexture(this, skin)
    const spr = this.add.sprite(x0 + 30, 100, skin).setOrigin(0.5, FOOT_Y / FH).setScale(1.05).play(animKey(skin, 'idle'))
    if (cpu) spr.setFlipX(true)
    L.add(spr)
    L.add(text(this, x0 + 70, 36, c.name, 14, c.color, 0))
    L.add(text(this, x0 + 70, 51, `${c.nameEn} · 체력 ${c.hp}`, 11, COLOR.dim, 0))
    const stat = (label: string, v: number, row: number) => {
      const yy = 65 + row * 12
      L.add(text(this, x0 + 70, yy, label, 11, COLOR.dim, 0))
      for (let k = 0; k < 5; k++) L.add(this.add.rectangle(x0 + 118 + k * 13, yy, 11, 6, k < v ? hex(c.color) : 0x0a0812))
    }
    stat('공격', c.stats.power, 0); stat('속도', c.stats.speed, 1); stat('사거리', c.stats.reach, 2)
    const ti = TRAIT_INFO[c.trait]
    L.add(text(this, x0 + 104, 120, c.desc, 11, COLOR.ink).setWordWrapWidth(208).setAlign('center'))
    const m = c.moves
    const lines = [
      `패시브: ${ti.passive}`,
      `Q ${m.special1?.name}   W ${m.special2?.name}`,
      `E ${ti.name}   R ${m.super?.name}`,
    ]
    L.add(text(this, x0 + 2, 148, lines.join('\n'), 11, '#5eead4', 0).setOrigin(0, 0).setWordWrapWidth(212).setLineSpacing(1))
  }
}

const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color
