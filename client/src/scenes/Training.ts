// 훈련장: 체력·SP 무한, 쿨타임 즉시, 더미 행동, 녹화·재생, 입력 표시, 콤보 피해·프레임 데이터, 콤보 트라이얼·시범.
// FightScene이 매 프레임 inputs() → Match.step → after() 순서로 부릅니다.
import Phaser from 'phaser'
import type { Match } from '../core/Match'
import type { InputState, MatchEvent } from '../core/types'
import { emptyInput, STAGE_W } from '../core/types'
import { Dummy, DUMMY_LABEL, DUMMY_MODES, REC_MAX, type DummyMode } from '../core/Dummy'
import { ComboRunner } from '../core/AI'
import { TrialTracker } from '../core/Trial'
import { TRIALS, loadTrialDone, saveTrialDone } from '../config/trials'
import { howTo } from '../config/characters'
import { FONT } from '../ui/widgets'

export interface TrainingOpts { infHp: boolean; infSp: boolean; noCd: boolean; hitbox: boolean }

const ARROW: Record<string, string> = { '': '・', u: '↑', d: '↓', l: '←', r: '→', ul: '↖', ur: '↗', dl: '↙', dr: '↘' }

export class Training {
  opts: TrainingOpts = { infHp: true, infSp: true, noCd: false, hitbox: false }
  dummy = new Dummy()
  recording = false
  private demo: ComboRunner | null = null
  private prevDummy: DummyMode = 'stand'
  trialIdx = 0
  tracker: TrialTracker | null = null
  private done = loadTrialDone()
  private quiet = 0
  private comboDmg = 0
  private comboHits = 0
  private lastMove = ''
  private log: { s: string; n: number }[] = []
  private prevInp = emptyInput()
  // 화면 글자
  private txtInput: Phaser.GameObjects.Text
  private txtInfo: Phaser.GameObjects.Text
  private txtTrial: Phaser.GameObjects.Text
  private txtState: Phaser.GameObjects.Text

  constructor(private scene: Phaser.Scene, private match: Match, ui: <T extends Phaser.GameObjects.GameObject>(o: T) => T, private charId: string, private onToast: (s: string) => void) {
    match.training = true
    const st = { fontFamily: FONT, fontSize: '10px', color: '#fff8e7', stroke: '#0a0812', strokeThickness: 3, resolution: 1 }
    this.txtInput = ui(scene.add.text(6, 104, '', st).setDepth(60).setLineSpacing(1))
    this.txtInfo = ui(scene.add.text(474, 46, '', { ...st, align: 'right' }).setOrigin(1, 0).setDepth(60).setLineSpacing(1))
    this.txtTrial = ui(scene.add.text(240, 46, '', { ...st, align: 'center', fontSize: '11px' }).setOrigin(0.5, 0).setDepth(60))
    this.txtState = ui(scene.add.text(240, 32, '', { ...st, color: '#ff5470' }).setOrigin(0.5, 0).setDepth(60))
    this.setTrial(0)
  }

  get trials() { return TRIALS[this.charId] ?? [] }
  isDone(i: number) { return !!this.done[`${this.charId}:${i}`] }

  setTrial(i: number) {
    const list = this.trials
    if (!list.length) { this.tracker = null; return }
    this.trialIdx = (i + list.length) % list.length
    this.tracker = new TrialTracker(list[this.trialIdx])
  }

  setDummy(mode: DummyMode) { this.dummy.mode = mode }
  cycleDummy() { const i = DUMMY_MODES.indexOf(this.dummy.mode); this.dummy.mode = DUMMY_MODES[(i + 1) % DUMMY_MODES.length]; return DUMMY_LABEL[this.dummy.mode] }

  startRecord() { this.dummy.clearRec(); this.recording = true; this.onToast('● 녹화 중 — 지금은 더미를 조작해요 (최대 10초, 일시정지로 끝)') }
  stopRecord() { if (!this.recording) return; this.recording = false; this.dummy.mode = this.dummy.rec.length ? 'play' : this.dummy.mode; this.onToast(this.dummy.rec.length ? `녹화 끝 (${(this.dummy.rec.length / 60).toFixed(1)}초) — 더미가 재생해요` : '녹화한 게 없어요') }

  /** 시범 보기: 자리 잡고 트라이얼 콤보를 자동으로 입력 */
  startDemo() {
    const t = this.trials[this.trialIdx]
    if (!t) return
    this.reset('center', 40)
    this.prevDummy = this.dummy.mode
    this.dummy.mode = 'stand'
    this.demo = new ComboRunner(this.match.fighters[0].char, t.moves)
    this.tracker?.reset()
    this.onToast(`시범: ${t.name}`)
  }

  /** 위치 초기화: 가운데 / 왼쪽 벽 / 오른쪽 벽 */
  reset(where: 'center' | 'left' | 'right', gap = 90) {
    const m = this.match
    const [a, b] = m.fighters
    const cx = where === 'center' ? STAGE_W / 2 : where === 'left' ? 60 : STAGE_W - 60
    const dir = where === 'left' ? 1 : -1
    // 벽 쪽 리셋은 더미가 벽에 붙음
    const ax = where === 'center' ? cx - gap / 2 : cx - dir * gap, bx = where === 'center' ? cx + gap / 2 : cx
    for (const [f, x] of [[a, ax], [b, bx]] as const) {
      f.x = x; f.y = 0; f.vx = 0; f.vy = 0; f.move = null; f.stun = 0; f.invuln = 0; f.dizzy = 0; f.snare = 0; f.frozen = 0; f.bleed = 0; f.slowT = 0
      f.hp = f.maxHp; f.combo = 0; f.juggles = 0
      f.setState('idle')
    }
    m.projectiles = []
    m.world.resetRound()
    m.cine = null
    this.comboDmg = 0; this.comboHits = 0
  }

  /** 이번 프레임 입력: [1P, 더미] */
  inputs(p1: InputState): [InputState, InputState] {
    const [a, b] = this.match.fighters
    this.logInput(p1)
    if (this.recording) {
      if (!this.dummy.record(p1, b, a)) this.stopRecord()
      return [emptyInput(), p1]
    }
    if (this.demo) {
      const inp = this.demo.input(a, b)
      if (this.demo.done && a.state !== 'attack' && !b.inHitstun) { this.demo = null; this.dummy.mode = this.prevDummy }
      return [inp, this.dummy.input(b, a, this.match.frame)]
    }
    return [p1, this.dummy.input(b, a, this.match.frame)]
  }

  /** 이벤트 처리 + 무한 체력·SP·쿨타임 */
  after(ev: MatchEvent[]) {
    const m = this.match
    const [a, b] = m.fighters
    for (const e of ev) {
      if (e.type === 'hit' && e.attacker === 0) {
        if (e.combo <= 1) { this.comboDmg = 0; this.comboHits = 0 }
        this.comboDmg += e.damage; this.comboHits = e.combo
      }
      if (e.type === 'move' && e.fighter === 0) {
        const mv = a.char.moves[e.move]
        if (mv) this.lastMove = `${mv.name}\n발동 ${mv.startup} · 판정 ${mv.active} · 경직 ${mv.recovery}${mv.cd ? ` · 쿨 ${(mv.cd / 60).toFixed(1)}s` : ''}`
      }
    }
    if (this.tracker && !this.tracker.done && this.tracker.feed(ev)) {
      const k = `${this.charId}:${this.trialIdx}`
      if (!this.demo) { saveTrialDone(k); this.done[k] = true }
      this.onToast(this.demo ? '시범 성공! 이제 직접 해 보세요' : `트라이얼 성공! ${this.trials[this.trialIdx].name}`)
      this.scene.time.delayedCall(1600, () => this.tracker?.reset())
    }
    // 무한 체력: 콤보가 끝나고 잠깐 뒤 회복 (콤보 중에는 줄어드는 게 보이게)
    if (b.inHitstun || a.inHitstun) this.quiet = 0
    else if (++this.quiet === 40 && this.opts.infHp) { a.hp = a.maxHp; b.hp = b.maxHp }
    if (this.opts.infSp) { a.meter = 100; if (a.char.trait !== 'copy') a.trait.res = Math.max(a.trait.res, 100) }
    if (this.opts.noCd) for (const k in a.cds) a.cds[k] = 0
    m.timer = 99 * 60
  }

  private logInput(inp: InputState) {
    const dir = `${inp.up ? 'u' : inp.down ? 'd' : ''}${inp.left ? 'l' : inp.right ? 'r' : ''}`
    const btn = (['light', 'heavy', 'special', 'trait', 'super'] as const).filter((k) => inp[k] && !this.prevInp[k]).map((k) => ({ light: 'A', heavy: 'B', special: 'C', trait: 'D', super: 'R' })[k]).join('')
    const s = `${ARROW[dir] ?? '・'}${btn ? ' ' + btn : ''}`
    const top = this.log[0]
    if (top && top.s === s && !btn) top.n++
    else if (s !== '・' || (top && top.s !== '・')) { this.log.unshift({ s, n: 1 }); if (this.log.length > 8) this.log.pop() }
    this.prevInp = { ...inp }
  }

  /** 화면 표시 갱신 */
  draw() {
    this.txtInput.setText(['입력', ...this.log.map((l) => `${l.s}${l.n > 1 ? ` ${Math.min(99, l.n)}` : ''}`)].join('\n'))
    const dm = this.recording ? `● 녹화 ${(this.dummy.rec.length / 60).toFixed(1)}/${REC_MAX / 60}초` : this.demo ? '▶ 시범 중' : `더미: ${DUMMY_LABEL[this.dummy.mode]}`
    this.txtInfo.setText([dm, this.comboHits >= 1 ? `${this.comboHits} HIT · 피해 ${this.comboDmg}` : '', this.lastMove].filter(Boolean).join('\n'))
    this.txtState.setText(this.recording ? '● REC — 더미 조작 중' : '')
    const t = this.trials[this.trialIdx]
    if (t && this.tracker) {
      const c = this.match.fighters[0].char
      const steps = t.moves.map((id, i) => `${i < this.tracker!.progress ? '✔' : ''}${howTo(c, id)}`).join(' → ')
      this.txtTrial.setText(`트라이얼 ${this.trialIdx + 1}/${this.trials.length} [${t.level}]${this.isDone(this.trialIdx) ? ' ★' : ''}  ${t.name}\n${steps}`)
    }
  }

  destroy() { [this.txtInput, this.txtInfo, this.txtTrial, this.txtState].forEach((o) => o.destroy()) }
}
