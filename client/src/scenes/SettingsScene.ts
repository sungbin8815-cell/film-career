// 설정: 사운드, AI 난이도, 조작법
import Phaser from 'phaser'
import { button, text, COLOR } from '../ui/widgets'
import { settings, saveSettings } from '../ui/Settings'
import type { Difficulty } from '../core/AI'

export class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings') }

  create() {
    const W = this.scale.width
    this.add.rectangle(0, 0, W, 270, COLOR.bg).setOrigin(0)
    text(this, W / 2, 18, 'SETTINGS', 14, COLOR.accent)
    const sound = button(this, W / 2, 54, 200, 24, '', () => { settings.sound = !settings.sound; saveSettings(settings); draw() })
    const diffs: Difficulty[] = ['easy', 'normal', 'hard']
    const diff = button(this, W / 2, 86, 200, 24, '', () => { settings.difficulty = diffs[(diffs.indexOf(settings.difficulty) + 1) % 3]; saveSettings(settings); draw() })
    const draw = () => {
      sound.label.setText(`사운드: ${settings.sound ? 'ON' : 'OFF'}`)
      diff.label.setText(`상대 AI 난이도: ${settings.difficulty.toUpperCase()}`)
    }
    draw()
    text(this, W / 2, 164, [
      '조작법',
      '이동 A D · 점프 W · 앉기 S · 방어 = 상대 반대쪽 방향',
      'J A약 · K B강 · L C직업기 · I D특성기 · U R궁극기 · →→ 대시 · ←← 백스텝',
      '태그 모드: Q 교체 · E 어시스트',
      '콤보: 약약약 · 약약강 · 약강강 · 강강 · ↓+약 · ↓+강',
      '약약Q(SP10) · 약강Q(SP25) · 점프 중 약·강 = 점프 공격',
    ].join('\n'), 11, COLOR.ink).setAlign('center').setLineSpacing(2)
    button(this, W / 2, 246, 120, 22, '← 메뉴', () => this.scene.start('Menu'))
  }
}
