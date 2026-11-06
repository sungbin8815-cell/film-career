// 캐릭터 선택 / 캐릭터 소개 — 6명 모두 처음부터 선택 가능
// vsai: 내 캐릭터 → CPU 상대 고르기 → 대전 / view: 캐릭터 정보 + 기술표
import Phaser from 'phaser'
import { CHARACTERS, BTN_LABEL } from '../config/characters'
import { animKey, ensureFighterTexture } from '../gfx/TextureFactory'
import { FH, FOOT_Y } from '../gfx/Painter'
import { button, text, COLOR, type Btn } from '../ui/widgets'
import { sfx } from '../audio/Sfx'
import type { CharacterData } from '../core/types'
import { TRAIT_INFO } from '../core/Traits'

type Mode = 'vsai' | 'view'

export class SelectScene extends Phaser.Scene {
  private mode: Mode = 'vsai'
  private step: 'p1' | 'p2' = 'p1'
  private picked = 0
  private p1 = 0
  private cards: Phaser.GameObjects.Rectangle[] = []
  private panel?: Phaser.GameObjects.Container
  private title!: Phaser.GameObjects.Text
  private nextBtn?: Btn
  constructor() { super('Select') }

  init(data: { mode?: Mode }) { this.mode = data.mode ?? 'vsai'; this.step = 'p1'; this.picked = 0; this.p1 = 0 }

  create() {
    const W = this.scale.width
    this.add.rectangle(0, 0, W, 270, COLOR.bg).setOrigin(0)
    this.title = text(this, W / 2, 12, '', 14, COLOR.accent)
    this.cards = []; this.nextBtn = undefined; this.panel = undefined
    CHARACTERS.forEach((c, i) => {
      const x = 48 + (i % 3) * 78, y = 76 + Math.floor(i / 3) * 96
      const card = this.add.rectangle(x, y, 72, 90, COLOR.panel).setStrokeStyle(2, COLOR.line)
      this.cards.push(card)
      this.add.rectangle(x, y - 44, 72, 3, hex(c.color))
      this.add.sprite(x, y + 26, c.id, 'idle_0').setOrigin(0.5, FOOT_Y / FH).setScale(1.05)
      text(this, x, y + 36, c.name, 11, c.color)
      card.setInteractive({ useHandCursor: true }).on('pointerup', () => { this.picked = i; sfx('select'); this.refresh() })
    })

    if (this.mode === 'vsai') {
      button(this, 70, 248, 110, 22, '← 뒤로', () => this.back())
      button(this, 192, 248, 110, 22, '랜덤', () => { this.picked = Math.floor(Math.random() * CHARACTERS.length); sfx('select'); this.refresh() })
      this.nextBtn = button(this, 370, 248, 170, 22, '', () => this.next(), { color: 0x6a2c91 })
    } else button(this, W / 2, 248, 140, 22, '← 메뉴', () => this.scene.start('Menu'))
    this.refresh()
    this.input.keyboard?.on('keydown-ENTER', () => this.mode === 'vsai' && this.next())
    this.input.keyboard?.on('keydown-RIGHT', () => { this.picked = (this.picked + 1) % CHARACTERS.length; this.refresh() })
    this.input.keyboard?.on('keydown-LEFT', () => { this.picked = (this.picked + CHARACTERS.length - 1) % CHARACTERS.length; this.refresh() })
  }

  private back() {
    if (this.step === 'p2') { this.step = 'p1'; this.picked = this.p1; this.refresh() } else this.scene.start('Menu')
  }

  private next() {
    sfx('confirm')
    if (this.step === 'p1') { this.p1 = this.picked; this.step = 'p2'; this.picked = Math.floor(Math.random() * CHARACTERS.length); this.refresh(); return }
    sfx('slate')
    this.scene.start('Fight', { p1: CHARACTERS[this.p1].id, p2: CHARACTERS[this.picked].id })
  }

  private refresh() {
    const p2 = this.step === 'p2'
    this.title.setText(this.mode === 'view' ? 'CHARACTER' : p2 ? `상대 CPU 고르기 (나: ${CHARACTERS[this.p1].name})` : 'SELECT YOUR FIGHTER')
    this.cards.forEach((c, i) => c.setStrokeStyle(i === this.picked ? 3 : 2, i === this.picked ? (p2 ? 0xff5470 : 0xffd23f) : COLOR.line))
    this.nextBtn?.label.setText(p2 ? '대전 시작!' : '이 캐릭터로 ▶')
    this.drawPanel(CHARACTERS[this.picked], p2)
  }

  /** 오른쪽 정보 패널: 큰 그림, 이름, 능력치, 설명 (+ 기술표) */
  private drawPanel(c: CharacterData, p2: boolean) {
    this.panel?.destroy(true)
    const L = this.add.container(0, 0)
    this.panel = L
    const x0 = 262
    L.add(this.add.rectangle(x0 - 6, 26, 220, 208, COLOR.panel).setOrigin(0).setStrokeStyle(2, hex(c.color)))
    const skin = p2 && c.id === CHARACTERS[this.p1].id ? `${c.id}_alt` : c.id
    ensureFighterTexture(this, skin)
    const spr = this.add.sprite(x0 + 32, 104, skin).setOrigin(0.5, FOOT_Y / FH).setScale(1.1).play(animKey(skin, 'idle'))
    if (p2) spr.setFlipX(true)
    L.add(spr)
    L.add(text(this, x0 + 74, 36, c.name, 14, c.color, 0))
    L.add(text(this, x0 + 74, 51, `${c.nameEn} · 체력 ${c.hp}`, 11, COLOR.dim, 0))
    const stat = (label: string, v: number, row: number) => {
      const yy = 65 + row * 12
      L.add(text(this, x0 + 74, yy, label, 11, COLOR.dim, 0))
      for (let k = 0; k < 5; k++) L.add(this.add.rectangle(x0 + 122 + k * 13, yy, 11, 6, k < v ? hex(c.color) : 0x0a0812))
    }
    stat('공격', c.stats.power, 0); stat('속도', c.stats.speed, 1); stat('사거리', c.stats.reach, 2)
    L.add(text(this, x0 + 74, 101, `고유: ${TRAIT_INFO[c.trait].name}`, 11, '#5eead4', 0))
    L.add(text(this, x0 + 104, 114, c.desc, 11, COLOR.ink).setWordWrapWidth(206).setAlign('center'))
    // 기술표: 특수·필살 + 콤보 6개 (한 줄씩)
    const m = c.moves
    L.add(text(this, x0 + 104, 136, `특 ${m.special1?.name} · ↓특 ${m.special2?.name}\n필살 ${m.super?.name}`, 11, COLOR.accent).setAlign('center').setLineSpacing(0))
    const combos = c.combos.map((k) => `${k.seq.map((t) => BTN_LABEL[t]).join('')}  ${m[k.move]?.name}`)
    L.add(text(this, x0 + 2, 150, combos.join('\n'), 11, COLOR.ink, 0).setOrigin(0, 0).setLineSpacing(-2))
  }
}

const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color
