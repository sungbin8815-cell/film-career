// 스테이지 모드: 부서 고르기 → 스테이지 지도 (지금 직급, 다음 상대, 대사) → 전투
import Phaser from 'phaser'
import { CHARACTERS, getCharacter } from '../config/characters'
import { STAGES, opponentFor, titleOf, loadProgress, saveProgress } from '../config/stages'
import { animKey, ensureFighterTexture } from '../gfx/TextureFactory'
import { FH, FOOT_Y } from '../gfx/Painter'
import { button, text, COLOR } from '../ui/widgets'
import { sfx } from '../audio/Sfx'

export class StageScene extends Phaser.Scene {
  private charId?: string
  constructor() { super('Stage') }

  init(data: { char?: string }) { this.charId = data.char }

  create() {
    const W = this.scale.width
    this.add.rectangle(0, 0, W, 270, COLOR.bg).setOrigin(0)
    if (this.charId) this.drawMap(this.charId)
    else this.drawDepts()
  }

  /** 부서 고르기: 6부서 + 진행 상황 */
  private drawDepts() {
    const W = this.scale.width
    text(this, W / 2, 14, 'STAGE MODE · 어느 부서로 입사할까?', 14, COLOR.accent)
    text(this, W / 2, 32, '막내로 시작해서 스테이지를 깰 때마다 승진합니다', 11, COLOR.dim)
    const prog = loadProgress()
    CHARACTERS.forEach((c, i) => {
      const x = 62 + (i % 4) * 119, y = 92 + Math.floor(i / 4) * 92
      const card = this.add.rectangle(x, y, 114, 84, COLOR.panel).setStrokeStyle(2, COLOR.line)
      this.add.sprite(x - 32, y + 32, c.id, 'idle_0').setOrigin(0.5, FOOT_Y / FH).setScale(0.9)
      text(this, x + 20, y - 28, c.dept, 12, c.color)
      const s = prog[c.id]
      const label = !s ? '새로 시작' : s.cleared ? '★ 전설 달성' : `${STAGES[s.stage].name}`
      const rank = !s ? c.titles[0] : s.cleared ? `전설의 ${c.titles[4]}` : c.titles[Math.min(4, s.stage)]
      text(this, x + 20, y - 8, rank, 11, COLOR.ink)
      text(this, x + 20, y + 10, label, 11, s?.cleared ? COLOR.accent : COLOR.dim)
      // 직급 진행 칸 5개
      for (let k = 0; k < 5; k++) this.add.rectangle(x - 4 + k * 10, y + 30, 8, 5, s && (s.cleared || k < s.stage) ? 0xffd23f : 0x0a0812).setStrokeStyle(1, 0x3a3456)
      card.setInteractive({ useHandCursor: true }).on('pointerup', () => { sfx('confirm'); this.scene.restart({ char: c.id }) })
    })
    button(this, W / 2, 246, 140, 22, '← 메뉴', () => this.scene.start('Menu'))
  }

  /** 스테이지 지도: 5칸 + 다음 상대 소개 */
  private drawMap(id: string) {
    const W = this.scale.width
    const c = getCharacter(id)
    const s = loadProgress()[id] ?? { stage: 0, cleared: false }
    const stage = s.cleared ? 4 : s.stage
    text(this, W / 2, 14, `${c.dept} 커리어`, 14, c.color)
    // 직급 사다리
    STAGES.forEach((st, k) => {
      const x = 56 + k * 92, y = 48
      const done = s.cleared || k < stage, now = k === stage && !s.cleared
      this.add.rectangle(x, y, 84, 34, now ? 0x3a2a66 : COLOR.panel).setStrokeStyle(2, now ? 0xffd23f : done ? 0x5ec8ff : COLOR.line)
      text(this, x, y - 7, st.name, 11, now ? COLOR.accent : done ? COLOR.blue : COLOR.dim)
      text(this, x, y + 8, k < 4 ? c.titles[k] : c.titles[4], 11, COLOR.ink)
      if (k < 4) text(this, x + 46, y, '▶', 11, COLOR.dim)
    })
    if (s.cleared) {
      text(this, W / 2, 130, `★ 전설의 ${c.titles[4]} ★`, 16, COLOR.accent)
      text(this, W / 2, 152, '모든 스테이지를 깼어요. 다시 막내부터 해볼까요?', 11, COLOR.ink)
    } else {
      const st = STAGES[stage]
      const oppId = opponentFor(id, stage)
      const opp = getCharacter(oppId)
      this.add.image(W / 2, 150, st.bg).setDisplaySize(300, 88).setAlpha(0.55)
      // 나 vs 상대
      this.add.sprite(W / 2 - 100, 188, id).setOrigin(0.5, FOOT_Y / FH).setScale(1.2).play(animKey(id, 'idle'))
      const oppKey = st.boss ? `${oppId}_boss` : oppId === id ? `${oppId}_alt` : oppId
      ensureFighterTexture(this, oppKey)
      this.add.sprite(W / 2 + 100, 188, oppKey).setOrigin(0.5, FOOT_Y / FH).setScale(st.boss ? 1.35 : 1.2).setFlipX(true).play(animKey(oppKey, 'idle'))
      text(this, W / 2, 112, `${st.name} · ${st.place}`, 12, COLOR.accent)
      text(this, W / 2 - 100, 200, titleOf(id, stage), 11, COLOR.blue)
      text(this, W / 2 + 100, 200, titleOf(oppId, st.oppRank, st.boss), 11, st.boss ? COLOR.accent : COLOR.red)
      text(this, W / 2, 140, 'VS', 16, COLOR.ink)
      text(this, W / 2, 222, `${opp.name}: "${st.taunt}"`, 11, COLOR.ink).setWordWrapWidth(420).setAlign('center')
      button(this, W / 2 + 90, 246, 150, 22, '촬영 시작! 🎬', () => { sfx('slate'); this.scene.start('Fight', { p1: id, p2: oppId, stage }) }, { color: 0x6a2c91 })
    }
    button(this, 66, 246, 110, 22, '← 부서 선택', () => this.scene.restart({ char: undefined }))
    button(this, W / 2 - 50, 246, 110, 22, '처음부터', () => { saveProgress(id, { stage: 0, cleared: false }); this.scene.restart({ char: id }) })
  }
}
