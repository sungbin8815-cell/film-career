// 궁극기 전용 연출 (첫 타가 맞았을 때만). 화면 고정(UI 카메라)에 그리며, 진행은 Match.cine.t 프레임에 맞춤.
// 캐릭터마다 다른 연출:
//  촬영 = 뷰파인더·REC 롱테이크 / 연출 = VHS 되감기 / 사운드 = 거대 스피커·파형 / 조명 = 화이트아웃·오로라
//  미술 = 세트 붕괴 → 새 세트 / 분장 = 몽타주 → 변신 / 배우 = 상대 궁극기 과장 흉내 + 박수
import Phaser from 'phaser'
import { FONT } from '../ui/widgets'

const W = 480, H = 270
const BAR = 26

export class UltCinema {
  private layer: Phaser.GameObjects.Container
  private bg: Phaser.GameObjects.Graphics
  private fx: Phaser.GameObjects.Graphics
  private att: Phaser.GameObjects.Sprite
  private def: Phaser.GameObjects.Sprite
  private defGhosts: Phaser.GameObjects.Sprite[] = []
  private label: Phaser.GameObjects.Text
  private sub: Phaser.GameObjects.Text
  private flashA = 0
  private shake = 0
  private base: string
  private actor: boolean
  private bits: { x: number; y: number; vy: number; w: number; h: number; c: number; landed: boolean }[] = []

  constructor(private scene: Phaser.Scene, ui: <T extends Phaser.GameObjects.GameObject>(o: T) => T, char: string,
    attKey: string, attFrame: string, defKey: string, defFrame: string, name: string, side: number, private dur: number, private lowFx = false) {
    this.actor = char.startsWith('actor:')
    this.base = this.actor ? char.split(':')[1] : char
    this.layer = ui(scene.add.container(0, 0).setDepth(90))
    this.bg = scene.add.graphics()
    this.fx = scene.add.graphics()
    const L = side === 0
    this.att = scene.add.sprite(L ? 120 : 360, 214, attKey, attFrame).setOrigin(0.5, 1).setScale(2.2).setFlipX(!L)
    this.def = scene.add.sprite(L ? 350 : 130, 210, defKey, defFrame).setOrigin(0.5, 1).setScale(1.9).setFlipX(L)
    // 연출 감독 VHS: 색이 어긋난 잔상 두 장
    if (this.base === 'director') for (const c of [0xff3b3b, 0x3bb0ff]) this.defGhosts.push(scene.add.sprite(this.def.x, this.def.y, defKey, defFrame).setOrigin(0.5, 1).setScale(2.2).setFlipX(L).setTint(c).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD))
    this.label = scene.add.text(W / 2, H - BAR / 2, name, { fontFamily: FONT, fontSize: '14px', color: '#ffd23f', stroke: '#0a0812', strokeThickness: 4, fontStyle: 'bold', resolution: 1 }).setOrigin(0.5)
    this.sub = scene.add.text(W / 2, BAR / 2, '', { fontFamily: FONT, fontSize: '11px', color: '#fff8e7', stroke: '#0a0812', strokeThickness: 3, resolution: 1 }).setOrigin(0.5)
    this.layer.add([this.bg, ...this.defGhosts, this.def, this.att, this.fx, this.label, this.sub])
    this.layer.setAlpha(0)
    scene.tweens.add({ targets: this.layer, alpha: 1, duration: 120 })
    scene.tweens.add({ targets: this.att, x: L ? 140 : 340, duration: 300, ease: 'Cubic.out' })
  }

  /** 박자마다: 번쩍 + 흔들림 */
  hit(n: number) {
    this.flashA = 0.9
    this.shake = 6 + n
    this.def.setTintFill(0xffffff)
    this.scene.time.delayedCall(50, () => this.def.active && this.def.clearTint())
    const words = this.base === 'sound' ? ['우웅!', '쿵!', '쿠웅!!', '두둥!', '쾅!!', '쾅!!!'] : this.base === 'gaffer' ? ['번쩍!', '파앗!', '번쩍!!', '찌릿!', '파아앗!', '번쩍!!!'] : this.base === 'art' ? ['쿵!', '와장!', '쾅!', '우르르!', '와장창!!', '쾅!!!'] : ['퍽!', '빡!', '쾅!', '퍼억!', '콰광!!', '쾅!!!']
    const t = this.scene.add.text(this.def.x + (Math.random() - 0.5) * 60, 90 + Math.random() * 50, words[(n - 1) % words.length], { fontFamily: FONT, fontSize: '20px', color: '#ffd23f', stroke: '#0a0812', strokeThickness: 5, fontStyle: 'bold', resolution: 1 }).setOrigin(0.5).setAngle((Math.random() - 0.5) * 30).setScale(0.3)
    this.layer.add(t)
    this.scene.tweens.add({ targets: t, scale: n >= 6 ? 1.6 : 1, duration: 120, ease: 'Back.out' })
    this.scene.tweens.add({ targets: t, alpha: 0, y: t.y - 14, delay: 260, duration: 200, onComplete: () => t.destroy() })
  }

  end(done: () => void) {
    this.scene.tweens.add({ targets: this.layer, alpha: 0, duration: 180, onComplete: () => { this.layer.destroy(); done() } })
  }

  /** 매 프레임: t = 연출 진행 프레임 */
  update(t: number) {
    const p = Math.min(1, t / this.dur)
    const g = this.bg, f = this.fx
    g.clear(); f.clear()
    this.drawTheme(this.base, g, f, t, p)
    if (this.actor) this.drawActor(f, t, p)
    // 레터박스
    f.fillStyle(0x000000, 1).fillRect(0, 0, W, BAR).fillRect(0, H - BAR, W, BAR)
    if (this.flashA > 0) { f.fillStyle(0xffffff, this.flashA).fillRect(0, 0, W, H); this.flashA = Math.max(0, this.flashA - 0.18) }
    if (this.shake > 0 && !this.lowFx) { this.layer.setPosition((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake); this.shake *= 0.8; if (this.shake < 0.5) { this.shake = 0; this.layer.setPosition(0, 0) } }
    // 맞는 쪽은 점점 크게 (클로즈업)
    this.def.setScale(1.9 + p * 0.45)
    for (const gh of this.defGhosts) gh.setScale(this.def.scaleX)
  }

  private drawTheme(base: string, g: Phaser.GameObjects.Graphics, f: Phaser.GameObjects.Graphics, t: number, p: number) {
    switch (base) {
      case 'dp': { // 뷰파인더 + REC 롱테이크
        g.fillStyle(0x111827, 1).fillRect(0, 0, W, H)
        g.fillStyle(0x1f2937, 1).fillRect(40, 40, W - 80, H - 80)
        f.lineStyle(2, 0xffffff, 0.9)
        for (const [x, y, sx, sy] of [[50, 48, 1, 1], [W - 50, 48, -1, 1], [50, H - 48, 1, -1], [W - 50, H - 48, -1, -1]] as const) f.lineBetween(x, y, x + sx * 22, y).lineBetween(x, y, x, y + sy * 16)
        f.lineStyle(1, 0xffffff, 0.6).lineBetween(W / 2 - 10, H / 2, W / 2 + 10, H / 2).lineBetween(W / 2, H / 2 - 10, W / 2, H / 2 + 10)
        if (t % 30 < 18) f.fillStyle(0xff3b3b, 1).fillCircle(62, 60, 4)
        this.sub.setText(`● REC   ${tc(t)}   ONE TAKE`)
        // 셔터 프레임: 박자 사이 잠깐 검은 막
        if (this.flashA > 0.5) f.fillStyle(0x000000, 0.5).fillRect(40, 40, W - 80, H - 80)
        break
      }
      case 'director': { // VHS 되감기
        g.fillStyle(0x1e3a8a, 1).fillRect(0, 0, W, H)
        for (let y = 0; y < H; y += 3) g.fillStyle(0x000000, 0.18).fillRect(0, y, W, 1)
        for (let k = 0; k < 3; k++) { const y = (t * (5 + k * 3) + k * 90) % H; g.fillStyle(0xffffff, 0.12).fillRect(0, y, W, 4 + k * 2) }
        const rewind = p < 0.7
        this.sub.setText(rewind ? `◀◀ REWIND   ${tc(Math.max(0, 400 - t * 3))}` : `▶ PLAY   리테이크!`)
        this.defGhosts.forEach((gh, i) => gh.setPosition(this.def.x + (i ? 3 : -3) * (rewind ? 1 + (t % 4) : 1), this.def.y))
        if (rewind) this.def.x += Math.sin(t * 0.7) * 0.6
        break
      }
      case 'sound': { // 거대 스피커 + 파형
        g.fillStyle(0x0a0812, 1).fillRect(0, 0, W, H)
        for (const x of [40, W - 40]) {
          g.fillStyle(0x1f2937, 1).fillRect(x - 34, 40, 68, 190)
          for (const [cy, r] of [[90, 22], [170, 30]] as const) {
            const pulse = Math.sin(t * 0.6) * 3 * (0.5 + p)
            g.fillStyle(0x0a0812, 1).fillCircle(x, cy, r + pulse)
            g.lineStyle(2, 0x86efac, 0.8).strokeCircle(x, cy, r * 0.6 + pulse)
            g.lineStyle(1, 0x86efac, 0.4).strokeCircle(x, cy, r + 8 + pulse * 2)
          }
        }
        f.lineStyle(2, 0x86efac, 1); f.beginPath(); f.moveTo(80, H / 2)
        for (let x = 80; x <= W - 80; x += 4) f.lineTo(x, H / 2 + Math.sin(x * 0.12 + t * 0.5) * (10 + p * 40) * Math.sin(x * 0.02 + t * 0.1))
        f.strokePath()
        if (!this.lowFx) this.shake = Math.max(this.shake, 1.5 + p * 3)
        this.sub.setText(`LEVEL ${'▮'.repeat(Math.ceil(p * 12))}${'▯'.repeat(12 - Math.ceil(p * 12))} MAX`)
        break
      }
      case 'gaffer': { // 화이트아웃 + 오로라
        g.fillStyle(0x0b1020, 1).fillRect(0, 0, W, H)
        const cols = [0x22c55e, 0x22d3ee, 0xa855f7, 0xfacc15]
        cols.forEach((c, k) => {
          g.fillStyle(c, 0.28)
          for (let x = 0; x < W; x += 6) { const y = 60 + k * 26 + Math.sin(x * 0.03 + t * 0.08 + k) * 18; g.fillRect(x, y, 6, 22 + Math.sin(x * 0.05 + k) * 8) }
        })
        g.fillStyle(0xffffff, Math.min(0.9, p * 1.1)).fillRect(0, 0, W, H)
        for (let k = 0; k < 4; k++) f.fillStyle(0xfef9c3, 0.5 - k * 0.1).fillCircle(W / 2 + (k - 1.5) * 40 * (1 - p), 80 + k * 10, 6 + k * 4)
        this.sub.setText('18K — 풀 파워')
        break
      }
      case 'art': { // 세트 붕괴 → 새 세트
        g.fillStyle(p < 0.6 ? 0x8b5a2b : 0x7f1d1d, 1).fillRect(0, 0, W, H)
        if (p >= 0.6) for (let x = 0; x < W; x += 24) g.fillStyle(0x991b1b, 1).fillRect(x, 0, 12, H)
        g.fillStyle(0x3b2312, 1).fillRect(0, 214, W, 30)
        if (p < 0.6 && t % 6 === 0) this.bits.push({ x: 40 + Math.random() * (W - 80), y: -20, vy: 2 + Math.random() * 2, w: 18 + Math.random() * 30, h: 10 + Math.random() * 24, c: [0xd6a35c, 0xb07a3a, 0x9ca3af][this.bits.length % 3], landed: false })
        for (const b of this.bits) {
          if (!b.landed) { b.vy += 0.4; b.y += b.vy; if (b.y + b.h >= 214) { b.y = 214 - b.h; b.landed = true } }
          f.fillStyle(0x0a0812, 1).fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2)
          f.fillStyle(b.c, 1).fillRect(b.x, b.y, b.w, b.h)
        }
        if (p >= 0.6) this.bits.length = 0
        this.sub.setText(p < 0.6 ? '전부 철거!!' : '새 세트 — 액션!')
        break
      }
      case 'makeup': { // 몽타주 → 변신
        g.fillStyle(0x2a1030, 1).fillRect(0, 0, W, H)
        const n = Math.min(3, Math.floor(p * 4.2))
        for (let k = 0; k < n; k++) {
          const x = 30 + k * 145
          g.fillStyle([0xf472b6, 0xa78bfa, 0xfbbf24][k], 0.35).fillRect(x, 40, 130, 70)
          g.lineStyle(2, 0xffffff, 0.8).strokeRect(x, 40, 130, 70)
          for (let s = 0; s < 6; s++) { const sx = x + 10 + ((s * 37 + t * 3) % 110), sy = 50 + ((s * 23 + t) % 50); f.fillStyle(0xffffff, 0.9).fillRect(sx - 1, sy - 4, 2, 9).fillRect(sx - 4, sy - 1, 9, 2) }
          g.lineStyle(4, [0xbe123c, 0x7c3aed, 0xd97706][k], 1).lineBetween(x + 20, 95, x + 110, 60 + ((t * 2) % 30))
        }
        if (p > 0.7) { this.def.setTint(0x4ade80); this.sub.setText('특수분장 — 변신 완료!') } else this.sub.setText(['베이스…', '컨투어…', '특수분장…'][Math.min(2, n)])
        break
      }
      default: {
        this.sub.setText('')
        g.fillStyle(0x0a0812, 1).fillRect(0, 0, W, H)
        for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2 + t * 0.02; f.lineStyle(2, 0xffffff, 0.3).lineBetween(W / 2 + Math.cos(a) * 80, H / 2 + Math.sin(a) * 50, W / 2 + Math.cos(a) * 300, H / 2 + Math.sin(a) * 200) }
      }
    }
  }

  /** 배우: 상대 궁극기를 과장해서 흉내 + 스포트라이트 + 박수 */
  private drawActor(f: Phaser.GameObjects.Graphics, t: number, p: number) {
    f.fillStyle(0xfef9c3, 0.18).fillTriangle(this.att.x, 0, this.att.x - 70, 220, this.att.x + 70, 220)
    for (let k = 0; k < 16; k++) { const x = 15 + k * 30, bob = Math.sin(t * 0.4 + k) * 2 * (p > 0.5 ? 1 : 0.3); f.fillStyle(0x0a0812, 1).fillCircle(x, H - BAR - 6 + bob, 12).fillRect(x - 13, H - BAR - 4 + bob, 26, 10) }
    if (p > 0.4 && t % 14 === 0) {
      const c = this.scene.add.text(30 + Math.random() * (W - 60), H - BAR - 26, '짝짝짝!', { fontFamily: FONT, fontSize: '11px', color: '#fff8e7', stroke: '#0a0812', strokeThickness: 3, resolution: 1 }).setOrigin(0.5)
      this.layer.add(c)
      this.scene.tweens.add({ targets: c, y: c.y - 16, alpha: 0, duration: 500, onComplete: () => c.destroy() })
    }
    this.sub.setText(`명연기! — ${this.sub.text}`.slice(0, 40))
  }
}

/** 타임코드 00:00:초:프레임 */
const tc = (t: number) => `00:00:${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
