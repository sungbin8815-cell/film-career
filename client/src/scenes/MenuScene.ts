// 메인 메뉴
import Phaser from 'phaser'
import { button, logo, text, COLOR } from '../ui/widgets'
import { animKey } from '../gfx/TextureFactory'
import { FH, FOOT_Y } from '../gfx/Painter'
import { unlockAudio, sfx } from '../audio/Sfx'

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu') }

  create() {
    const W = this.scale.width
    this.add.image(0, 0, 'stage_chroma').setOrigin(0).setAlpha(0.35)
    this.add.rectangle(0, 0, W, 270, COLOR.bg, 0.55).setOrigin(0)
    // 양쪽에서 노려보는 촬영감독들
    this.add.sprite(70, 210, 'dp').setOrigin(0.5, FOOT_Y / FH).setScale(2).play(animKey('dp', 'idle'))
    this.add.sprite(410, 210, 'dp_alt').setOrigin(0.5, FOOT_Y / FH).setScale(2).setFlipX(true).play(animKey('dp_alt', 'guard'))
    logo(this, W / 2, 52, 40)
    text(this, W / 2, 84, '촬영장 직업인들의 병맛 픽셀 격투', 11, COLOR.dim)

    const items: [string, () => void, string?][] = [
      ['START', () => this.scene.start('Select', { mode: 'vsai' })],
      ['STAGE MODE', () => {}, 'STAGE MODE는 PHASE 3에서 구현 예정이에요'],
      ['FRIEND MATCH', () => {}, '온라인 대전은 PHASE 4에서 구현 예정이에요'],
      ['CHARACTER', () => this.scene.start('Select', { mode: 'view' })],
      ['SETTINGS', () => this.scene.start('Settings')],
    ]
    items.forEach(([label, fn, locked], i) => {
      const b = button(this, W / 2, 110 + i * 28, 170, 24, locked ? `${label}  🔒` : label, () => { unlockAudio(); fn() }, { disabledHint: locked, color: i === 0 ? 0x6a2c91 : undefined })
      if (locked) b.setEnabled(false)
    })
    text(this, W / 2, 260, 'v0.1 · PHASE 1 프로토타입', 11, COLOR.dim)
    this.input.keyboard?.once('keydown-ENTER', () => { sfx('confirm'); this.scene.start('Select', { mode: 'vsai' }) })
  }
}
