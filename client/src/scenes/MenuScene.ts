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
    // 양쪽에서 노려보는 스태프들 (매번 다른 조합)
    const ids = ['dp', 'director', 'sound', 'gaffer', 'art', 'makeup'].sort(() => Math.random() - 0.5)
    this.add.sprite(70, 210, ids[0]).setOrigin(0.5, FOOT_Y / FH).setScale(2).play(animKey(ids[0], 'idle'))
    this.add.sprite(410, 210, ids[1]).setOrigin(0.5, FOOT_Y / FH).setScale(2).setFlipX(true).play(animKey(ids[1], 'guard'))
    logo(this, W / 2, 52, 40)
    text(this, W / 2, 84, '촬영장 직업인들의 병맛 픽셀 격투', 11, COLOR.dim)

    const items: [string, () => void, string?][] = [
      ['START', () => this.scene.start('Select', { mode: 'vsai' })],
      ['STAGE MODE', () => this.scene.start('Stage')],
      ['FRIEND MATCH', () => {}, '온라인 대전은 PHASE 4에서 구현 예정이에요'],
      ['CHARACTER', () => this.scene.start('Select', { mode: 'view' })],
      ['SETTINGS', () => this.scene.start('Settings')],
    ]
    items.forEach(([label, fn, locked], i) => {
      const b = button(this, W / 2, 110 + i * 28, 170, 24, locked ? `${label}  🔒` : label, () => { unlockAudio(); fn() }, { disabledHint: locked, color: i === 0 ? 0x6a2c91 : undefined })
      if (locked) b.setEnabled(false)
    })
    text(this, W / 2, 260, 'v0.3 · 캐릭터 6명 · 스테이지 모드', 11, COLOR.dim)
    this.input.keyboard?.once('keydown-ENTER', () => { sfx('confirm'); this.scene.start('Select', { mode: 'vsai' }) })
  }
}
