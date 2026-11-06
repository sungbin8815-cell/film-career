// ROLLING! 진입점: Phaser 게임 + 터치 콘솔
import Phaser from 'phaser'
import './style.css'
import { BootScene } from './scenes/BootScene'
import { MenuScene } from './scenes/MenuScene'
import { SelectScene } from './scenes/SelectScene'
import { SettingsScene } from './scenes/SettingsScene'
import { FightScene } from './scenes/FightScene'
import { StageScene } from './scenes/StageScene'
import { PromotionScene } from './scenes/PromotionScene'
import { Controls } from './ui/Controls'
import { STAGE_W, STAGE_H } from './core/types'
import { unlockAudio } from './audio/Sfx'

const controls = new Controls(document.getElementById('pad')!)

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: STAGE_W,
  height: STAGE_H,
  backgroundColor: '#0d0b17',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 4 },
  scene: [BootScene, MenuScene, SelectScene, SettingsScene, FightScene, StageScene, PromotionScene],
})
game.registry.set('controls', controls)

// 첫 터치: 오디오 깨우기 + (지원하는 폰에서) 전체화면·가로 고정
window.addEventListener('pointerdown', () => {
  unlockAudio()
  const touchDevice = matchMedia('(pointer: coarse)').matches
  if (!touchDevice || document.fullscreenElement) return
  const el = document.documentElement
  if (typeof el.requestFullscreen !== 'function') return  // iOS Safari 등: 지원 안 함 → 세로면 안내 화면
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => { /* 거부되거나 지원 안 함: 그대로 진행 */ })
}, { once: true })
// 화면 회전·크기 변경 대응
window.addEventListener('resize', () => game.scale.refresh())
