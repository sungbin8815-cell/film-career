// 캐릭터 선택 / 캐릭터 소개
import Phaser from 'phaser'
import { CHARACTERS } from '../config/characters'
import { animKey } from '../gfx/TextureFactory'
import { FH, FOOT_Y } from '../gfx/Painter'
import { button, text, COLOR } from '../ui/widgets'
import { sfx } from '../audio/Sfx'

export class SelectScene extends Phaser.Scene {
  private mode: 'vsai' | 'view' = 'vsai'
  private picked = 0
  constructor() { super('Select') }

  init(data: { mode?: 'vsai' | 'view' }) { this.mode = data.mode ?? 'vsai'; this.picked = 0 }

  create() {
    const W = this.scale.width
    this.add.rectangle(0, 0, W, 270, COLOR.bg).setOrigin(0)
    text(this, W / 2, 14, this.mode === 'view' ? 'CHARACTER' : 'SELECT YOUR FIGHTER', 14, COLOR.accent)

    const cards: Phaser.GameObjects.Rectangle[] = []
    CHARACTERS.forEach((c, i) => {
      const x = 90 + i * 150, y = 112
      const card = this.add.rectangle(x, y + 8, 138, 168, COLOR.panel).setStrokeStyle(2, COLOR.line)
      cards.push(card)
      if (c.implemented) {
        this.add.sprite(x, y + 24, 'dp').setOrigin(0.5, FOOT_Y / FH).setScale(1.7).play(animKey('dp', 'idle'))
      } else {
        // 아직 없는 캐릭터: 실루엣
        this.add.sprite(x, y + 24, 'dp', 'idle_0').setOrigin(0.5, FOOT_Y / FH).setScale(1.7).setTintFill(0x0a0812)
        text(this, x, y - 30, '🔒 PHASE 2', 11, COLOR.dim)
      }
      text(this, x, y + 32, `${c.name}`, 12, c.color)
      text(this, x, y + 45, c.nameEn, 11, COLOR.dim)
      // 능력치 막대
      const stat = (label: string, v: number, row: number) => {
        const yy = y + 56 + row * 12
        text(this, x - 58, yy, label, 11, COLOR.dim, 0)
        for (let k = 0; k < 5; k++) this.add.rectangle(x - 10 + k * 12, yy, 10, 6, k < v ? Phaser.Display.Color.HexStringToColor(c.color).color : 0x0a0812)
      }
      stat('공격', c.stats.power, 0); stat('속도', c.stats.speed, 1); stat('사거리', c.stats.reach, 2)
      card.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!c.implemented) return; this.picked = i; sfx('select'); this.refresh(cards) })
    })
    this.descText = text(this, W / 2, 214, '', 11)
    this.refresh(cards)

    if (this.mode === 'vsai') {
      button(this, W / 2 + 70, 248, 120, 24, '준비 완료!', () => this.startFight(), { color: 0x6a2c91 })
      button(this, W / 2 - 70, 248, 100, 24, '← 메뉴', () => this.scene.start('Menu'))
    } else button(this, W / 2, 248, 120, 24, '← 메뉴', () => this.scene.start('Menu'))
    this.input.keyboard?.once('keydown-ENTER', () => this.mode === 'vsai' && this.startFight())
  }

  private descText!: Phaser.GameObjects.Text
  private refresh(cards: Phaser.GameObjects.Rectangle[]) {
    cards.forEach((c, i) => c.setStrokeStyle(i === this.picked ? 3 : 2, i === this.picked ? 0xffd23f : COLOR.line))
    const c = CHARACTERS[this.picked]
    this.descText.setText(c.implemented ? c.desc : `${c.desc} (PHASE 2에서 추가)`).setAlign('center')
  }

  private startFight() {
    sfx('slate')
    this.scene.start('Fight', { p1: CHARACTERS[this.picked].id, p2: 'dp' })
  }
}
