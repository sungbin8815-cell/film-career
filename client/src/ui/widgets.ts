// Phaser 안에서 쓰는 레트로 UI 조각 (버튼, 글자, 게이지)
import Phaser from 'phaser'
import { sfx } from '../audio/Sfx'

export const FONT = 'Galmuri11, monospace'
export const COLOR = { ink: '#fff8e7', dim: '#8b85a3', accent: '#ffd23f', bg: 0x0d0b17, panel: 0x231f3a, line: 0x0a0812, red: '#ff5470', blue: '#5ec8ff' }

// Galmuri11은 11px 격자 폰트 → 11 미만이면 글자가 뭉개져서 11 이상만 씀
export function text(scene: Phaser.Scene, x: number, y: number, s: string, size = 11, color = COLOR.ink, origin = 0.5) {
  return scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${Math.max(11, size)}px`, color, resolution: 1 }).setOrigin(origin, 0.5)
}

export interface Btn extends Phaser.GameObjects.Container { setEnabled(on: boolean): void; label: Phaser.GameObjects.Text }

/** 픽셀 버튼: 탭·클릭으로 동작, disabled면 회색 + 안내 */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, opts: { color?: number; size?: number; disabledHint?: string } = {}): Btn {
  const c = scene.add.container(x, y) as Btn
  const shadow = scene.add.rectangle(2, 2, w, h, COLOR.line)
  const bg = scene.add.rectangle(0, 0, w, h, opts.color ?? COLOR.panel).setStrokeStyle(2, COLOR.line)
  const hl = scene.add.rectangle(0, -h / 2 + 2, w - 4, 2, 0xffffff, 0.15)
  const t = text(scene, 0, 0, label, opts.size ?? 11)
  c.add([shadow, bg, hl, t])
  c.label = t
  c.setSize(w, h)
  let enabled = true
  c.setInteractive({ useHandCursor: true })
  c.on('pointerdown', () => { if (!enabled) { if (opts.disabledHint) toast(scene, opts.disabledHint); return } c.setScale(0.96) })
  c.on('pointerup', () => { if (!enabled) return; c.setScale(1); sfx('confirm'); onClick() })
  c.on('pointerout', () => c.setScale(1))
  c.on('pointerover', () => { if (enabled) bg.setFillStyle(Phaser.Display.Color.ValueToColor(opts.color ?? COLOR.panel).lighten(12).color) })
  c.on('pointerout', () => bg.setFillStyle(opts.color ?? COLOR.panel))
  c.setEnabled = (on: boolean) => { enabled = on; c.setAlpha(on ? 1 : 0.45) }
  return c
}

export function toast(scene: Phaser.Scene, msg: string) {
  const t = text(scene, scene.scale.width / 2, scene.scale.height - 24, msg, 11, COLOR.accent)
  const bg = scene.add.rectangle(t.x, t.y, t.width + 16, 18, 0x000000, 0.8).setDepth(999)
  t.setDepth(1000)
  scene.tweens.add({ targets: [t, bg], alpha: 0, delay: 1400, duration: 400, onComplete: () => { t.destroy(); bg.destroy() } })
}

/** 레트로 로고 "ROLLING!" */
export function logo(scene: Phaser.Scene, x: number, y: number, size = 40) {
  const back = scene.add.text(x + 3, y + 3, 'ROLLING!', { fontFamily: FONT, fontSize: `${size}px`, color: '#3a1d5c', fontStyle: 'bold', resolution: 1 }).setOrigin(0.5)
  const front = scene.add.text(x, y, 'ROLLING!', { fontFamily: FONT, fontSize: `${size}px`, color: '#ffd23f', fontStyle: 'bold', stroke: '#0a0812', strokeThickness: 4, resolution: 1 }).setOrigin(0.5)
  scene.tweens.add({ targets: [back, front], scaleX: 1.04, scaleY: 0.97, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' })
  return [back, front]
}
