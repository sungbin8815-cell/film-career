// 부팅: 도트 폰트 로드 + 코드로 그린 텍스처 생성
import Phaser from 'phaser'
import { buildFighterTextures, buildFxTextures, buildChromaStage, buildStages } from '../gfx/TextureFactory'
import { FONT, text } from '../ui/widgets'

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot') }

  create() {
    text(this, 240, 135, '로딩 중…', 10)
    const go = () => {
      performance.mark('boot')
      buildFighterTextures(this)
      buildFxTextures(this)
      buildChromaStage(this)
      buildStages(this)
      performance.mark('menu')
      this.scene.start('Menu')
    }
    // 폰트가 준비돼야 글자가 도트로 나옴 (실패해도 2초 뒤 진행)
    Promise.race([
      Promise.all([document.fonts.load(`10px ${FONT}`), document.fonts.load(`bold 10px ${FONT}`)]),
      new Promise((r) => setTimeout(r, 2000)),
    ]).then(go, go)
  }
}
