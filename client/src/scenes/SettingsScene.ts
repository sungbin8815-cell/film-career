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
    const row = (y: number, label: () => string, fn: () => void) => { const b = button(this, W / 2, y, 220, 20, label(), () => { fn(); saveSettings(settings); b.label.setText(label()) }); return b }
    const onoff = (v: boolean) => (v ? 'ON' : 'OFF')
    const diffs: Difficulty[] = ['easy', 'normal', 'hard']
    row(42, () => `사운드: ${onoff(settings.sound)}`, () => { settings.sound = !settings.sound })
    row(66, () => `상대 AI 난이도: ${settings.difficulty.toUpperCase()}`, () => { settings.difficulty = diffs[(diffs.indexOf(settings.difficulty) + 1) % 3] })
    row(90, () => `이펙트 낮음 (휴대폰 가볍게): ${onoff(settings.fxLow)}`, () => { settings.fxLow = !settings.fxLow })
    row(114, () => `화면 흔들림 줄이기: ${onoff(settings.reduceShake)}`, () => { settings.reduceShake = !settings.reduceShake })
    row(138, () => `번쩍임 줄이기: ${onoff(settings.reduceFlash)}`, () => { settings.reduceFlash = !settings.reduceFlash })
    button(this, W / 2, 162, 220, 20, '튜토리얼 다시 하기', () => this.scene.start('Fight', { p1: 'dp', p2: 'director', tutorial: true }), { color: 0x0f766e })
    text(this, W / 2, 206, [
      '조작: 이동 A D · 점프 W · 앉기 S · 방어 = 상대 반대쪽 방향',
      'J A약 · K B강 · L C직업기 · I D특성기 · U R궁극기 · →→ 대시 · ←← 백스텝',
      '태그 모드: Q 교체 · E 어시스트 · 기술표는 전투 중 일시정지(ESC)',
    ].join('\n'), 10, COLOR.ink).setAlign('center').setLineSpacing(2)
    button(this, W / 2, 246, 120, 22, '← 메뉴', () => this.scene.start('Menu'))
  }
}
