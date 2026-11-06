// 첫 실행 튜토리얼: 실제 전투 화면에서 한 단계씩 (이동 → 점프 → 대시 → 백스텝 → A → B → 방향 기술 → 방어 → C → D → 커맨드 → R)
// 촬영감독으로 진행, 상대는 쓰러지지 않는 연출감독 더미.
import Phaser from 'phaser'
import type { Match } from '../core/Match'
import type { InputState, MatchEvent } from '../core/types'
import { emptyInput } from '../core/types'
import { FONT } from '../ui/widgets'

interface Step { title: string; how: string; check: (e: MatchEvent[], m: Match, t: number) => boolean; dummy?: 'attack' }

const hitBy = (e: MatchEvent[], pre: string) => e.some((x) => x.type === 'hit' && x.attacker === 0 && !!x.move && x.move.startsWith(pre))
const moved = (e: MatchEvent[], id: string) => e.some((x) => x.type === 'move' && x.fighter === 0 && x.move.split('~')[0] === id)

const STEPS: Step[] = [
  { title: '이동', how: '왼쪽 방향 패드 ◀ ▶ (키보드 A D)로 걸어 보세요', check: (_e, m, t) => m.fighters[0].state === 'walk' && t > 30 },
  { title: '점프', how: '▲ (W)를 눌러 점프', check: (e) => e.some((x) => x.type === 'jump' && x.fighter === 0) },
  { title: '대시', how: '▶ ▶ 빠르게 두 번 = 대시 (원거리 투사체도 뚫고 지나가요)', check: (e) => e.some((x) => x.type === 'dash' && x.fighter === 0 && x.kind === 'dash') },
  { title: '백스텝', how: '◀ ◀ 두 번 = 백스텝 (잠깐 무적)', check: (e) => e.some((x) => x.type === 'dash' && x.fighter === 0 && x.kind === 'backstep') },
  { title: 'A 약공격', how: '상대에게 다가가 A (J)로 때리기', check: (e) => hitBy(e, 'A_') },
  { title: 'B 강공격', how: 'B (K): 느리지만 세게. A가 맞는 순간 B를 누르면 이어져요', check: (e) => hitBy(e, 'B_') },
  { title: '방향 기술', how: '▼ 누른 채 B = 하단 슬라이드. 같은 버튼도 방향마다 다른 기술!', check: (e) => hitBy(e, 'B_d') },
  { title: '방어', how: '상대가 공격해요! 상대 반대쪽 방향을 누르고 있으면 자동 방어', check: (e) => e.some((x) => x.type === 'block' && x.attacker === 1), dummy: 'attack' },
  { title: 'C 직업기', how: 'C (L): 직업 도구 기술. 촬영감독은 플래시 탄', check: (e) => moved(e, 'C_n') || hitBy(e, 'C_') },
  { title: 'D 특성기', how: 'D (I): 렌즈 교체! ←+D 망원 = 화면 끝 저격, →+D 광각 = 코앞 러시', check: (e) => e.some((x) => x.type === 'move' && x.fighter === 0 && x.move.startsWith('D_')) },
  { title: '커맨드', how: '▼ ▶ C 순서로 = 돌리 트랙 샷 (캐릭터마다 커맨드 10개 이상)', check: (e) => moved(e, 'dolly_track') },
  { title: '궁극기', how: 'SP 100이면 R (U)! 첫 타가 맞으면 전용 연출', check: (e) => e.some((x) => x.type === 'cine' && x.fighter === 0 && x.phase === 'start') },
]

export class Tutorial {
  private i = 0
  private t = 0
  private wait = 0
  private head: Phaser.GameObjects.Text
  private body: Phaser.GameObjects.Text
  done = false

  constructor(private scene: Phaser.Scene, private match: Match, ui: <T extends Phaser.GameObjects.GameObject>(o: T) => T, private onFinish: () => void) {
    match.training = true
    ui(scene.add.rectangle(240, 64, 400, 40, 0x0a0812, 0.75).setStrokeStyle(2, 0xffd23f).setDepth(60))
    this.head = ui(scene.add.text(240, 52, '', { fontFamily: FONT, fontSize: '12px', color: '#ffd23f', stroke: '#0a0812', strokeThickness: 3, fontStyle: 'bold', resolution: 1 }).setOrigin(0.5).setDepth(61))
    this.body = ui(scene.add.text(240, 70, '', { fontFamily: FONT, fontSize: '10px', color: '#fff8e7', stroke: '#0a0812', strokeThickness: 3, resolution: 1, align: 'center' }).setOrigin(0.5).setDepth(61).setWordWrapWidth(390))
    this.show()
  }

  private show() {
    const s = STEPS[this.i]
    this.head.setText(`튜토리얼 ${this.i + 1}/${STEPS.length} · ${s.title}`)
    this.body.setText(s.how)
  }

  /** 더미 입력: 방어 단계에서만 가까이 오면 강공격 */
  dummyInput(): InputState {
    const inp = emptyInput()
    const [a, b] = this.match.fighters
    if (STEPS[this.i]?.dummy === 'attack' && this.wait <= 0) {
      const dx = a.x - b.x
      if (Math.abs(dx) > 50) inp[dx > 0 ? 'right' : 'left'] = true
      else if (this.match.frame % 50 === 0) inp.heavy = true
    }
    return inp
  }

  after(ev: MatchEvent[]) {
    const [a, b] = this.match.fighters
    a.meter = 100; this.match.timer = 99 * 60
    if (!a.inHitstun && !b.inHitstun) { a.hp = Math.max(a.hp, a.maxHp * 0.5); b.hp = Math.max(b.hp, b.maxHp * 0.3) }
    if (this.done) return
    if (this.wait > 0) { if (--this.wait === 0) this.show(); return }
    this.t++
    if (STEPS[this.i].check(ev, this.match, this.t)) {
      this.i++; this.t = 0
      if (this.i >= STEPS.length) {
        this.done = true
        this.head.setText('튜토리얼 완료!')
        this.body.setText('일시정지(❚❚·ESC)에서 기술표를, 메뉴의 TRAINING에서 콤보 연습을 할 수 있어요')
        this.scene.time.delayedCall(2600, () => this.onFinish())
        return
      }
      this.head.setText('좋아요! ✔')
      this.body.setText('')
      this.wait = 45
    }
  }
}
