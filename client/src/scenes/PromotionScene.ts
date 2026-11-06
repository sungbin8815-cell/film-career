// 스테이지를 깨면: 승진 화면 (새 직급, 새로 생긴 기술, 능력치 상승) / 마지막이면 엔딩
import Phaser from 'phaser'
import { getCharacter, howTo, RANK_MUL } from '../config/characters'
import { STAGES, saveProgress } from '../config/stages'
import { animKey } from '../gfx/TextureFactory'
import { FH, FOOT_Y } from '../gfx/Painter'
import { button, text, logo, COLOR, FONT } from '../ui/widgets'
import { sfx } from '../audio/Sfx'

export class PromotionScene extends Phaser.Scene {
  private charId = 'dp'
  private cleared = 0
  constructor() { super('Promotion') }

  init(data: { char: string; cleared: number }) { this.charId = data.char; this.cleared = data.cleared }

  create() {
    const W = this.scale.width
    const c = getCharacter(this.charId)
    this.add.rectangle(0, 0, W, 270, COLOR.bg).setOrigin(0)
    const final = this.cleared >= STAGES.length - 1
    saveProgress(c.id, final ? { stage: 4, cleared: true } : { stage: this.cleared + 1, cleared: false })
    sfx('win')
    // 반짝이 배경
    for (let k = 0; k < 40; k++) {
      const d = this.add.rectangle(Math.random() * W, Math.random() * 270, 2, 2, [0xffd23f, 0x5ec8ff, 0xff5470][k % 3])
      this.tweens.add({ targets: d, y: d.y + 30, alpha: 0, duration: 1200 + Math.random() * 1200, repeat: -1, delay: Math.random() * 1000 })
    }
    this.add.sprite(110, 206, c.id).setOrigin(0.5, FOOT_Y / FH).setScale(2).play(animKey(c.id, 'victory'))

    if (final) {
      logo(this, W / 2 + 60, 40, 30)
      text(this, W / 2 + 60, 84, `전설의 ${c.titles[4]} 탄생!`, 16, COLOR.accent)
      text(this, W / 2 + 60, 120, [
        `${c.dept} 막내로 들어와`,
        `${c.titles.slice(1).join(' → ')}까지.`,
        '시상식 무대에서 전설을 꺾고',
        '트로피를 들어 올렸습니다.',
      ].join('\n'), 11, COLOR.ink).setAlign('center').setLineSpacing(3)
      text(this, W / 2 + 60, 178, 'THE END · 다른 부서도 도전해 보세요!', 11, COLOR.dim)
      button(this, W / 2 + 0, 240, 130, 22, '스테이지 선택', () => this.scene.start('Stage'))
      button(this, W / 2 + 140, 240, 110, 22, '메뉴로', () => this.scene.start('Menu'))
      return
    }

    const newRank = this.cleared + 1
    const old = c.titles[this.cleared], now = c.titles[newRank]
    const head = this.add.text(W / 2 + 60, 36, '승진!', { fontFamily: FONT, fontSize: '28px', color: '#ffd23f', stroke: '#0a0812', strokeThickness: 5, fontStyle: 'bold', resolution: 1 }).setOrigin(0.5).setScale(2)
    this.tweens.add({ targets: head, scale: 1, duration: 260, ease: 'Back.out' })
    text(this, W / 2 + 60, 70, `${c.dept}  ${old}  ▶  ${now}`, 14, COLOR.ink)
    // 새로 생긴 기술
    const unlocked = Object.values(c.moves).filter((m) => (m.rank ?? 0) === newRank)
    text(this, W / 2 + 60, 98, unlocked.length ? '새 기술을 배웠다!' : '능력치가 올랐다!', 12, COLOR.accent)
    unlocked.slice(0, 6).forEach((m, i) => text(this, W / 2 + 60, 118 + i * 16, `${howTo(c, m.id)}  ▶  ${m.name}${m.cost ? ` (SP ${m.cost})` : ''}`, 11, COLOR.ink))
    const up = Math.round((RANK_MUL[newRank] / RANK_MUL[this.cleared] - 1) * 100)
    text(this, W / 2 + 60, 128 + Math.min(6, unlocked.length) * 16, `${unlocked.length > 6 ? `외 ${unlocked.length - 6}개 · ` : ''}체력·공격력 +${up}%`, 11, COLOR.blue)
    button(this, W / 2 + 60, 240, 170, 22, `${STAGES[newRank].name} 으로 ▶`, () => this.scene.start('Stage', { char: c.id }), { color: 0x6a2c91 })
  }
}
