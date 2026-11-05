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
    text(this, W / 2, 162, [
      '조작법',
      '휴대폰: 왼쪽 방향패드 · 오른쪽 버튼',
      '키보드: A D 이동 · W 점프 · S 앉기',
      'J 약 · K 강 · L 특수 · I/스페이스 방어 · U 필살',
      '▼ + 특 = 조명 낙하 · 같은 방향 두 번 = 달리기',
      '약 → 약 → 강 → 특 순서로 이어 치면 콤보!',
    ].join('\n'), 11, COLOR.ink).setAlign('center').setLineSpacing(2)
    button(this, W / 2, 240, 120, 24, '← 메뉴', () => this.scene.start('Menu'))
  }
}
