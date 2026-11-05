// ROLLING! 진입점: Phaser 게임 + 터치 콘솔
import Phaser from 'phaser'
import './style.css'
import { BootScene } from './scenes/BootScene'
import { MenuScene } from './scenes/MenuScene'
import { SelectScene } from './scenes/SelectScene'
import { SettingsScene } from './scenes/SettingsScene'
import { FightScene } from './scenes/FightScene'
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
  scene: [BootScene, MenuScene, SelectScene, SettingsScene, FightScene],
})
game.registry.set('controls', controls)

// 첫 터치에 오디오 깨우기 (브라우저 정책)
window.addEventListener('pointerdown', unlockAudio, { once: true })
// 화면 회전·크기 변경 대응
window.addEventListener('resize', () => game.scale.refresh())
