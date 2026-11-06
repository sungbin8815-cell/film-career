// 입력: 휴대폰 격투 콘솔(DOM 터치 패드) + 키보드 → InputState 하나로 합침.
// 전투 로직은 이 InputState만 봅니다(온라인에서도 같은 형식으로 전송).
import { emptyInput, type InputState } from '../core/types'

const KEYMAP: Record<string, keyof InputState> = {
  a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right',
  w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down',
  j: 'light', k: 'heavy', l: 'special', i: 'guard', ' ': 'guard', u: 'super', o: 'trait',
}

export class Controls {
  private keys = emptyInput()
  private touch = emptyInput()
  private dpadDir = emptyInput()
  private root: HTMLElement
  private superBtn!: HTMLButtonElement
  private specialBtn!: HTMLButtonElement
  private traitBtn!: HTMLButtonElement

  constructor(root: HTMLElement) {
    this.root = root
    window.addEventListener('keydown', (e) => this.onKey(e, true))
    window.addEventListener('keyup', (e) => this.onKey(e, false))
    window.addEventListener('blur', () => { this.keys = emptyInput(); this.touch = emptyInput(); this.dpadDir = emptyInput() })
    this.build()
    this.show(false)
  }

  /** 지금 프레임의 버튼 상태 */
  get state(): InputState {
    const s = emptyInput()
    for (const k of Object.keys(s) as (keyof InputState)[]) s[k] = this.keys[k] || this.touch[k] || this.dpadDir[k]
    return s
  }

  show(on: boolean) { this.root.classList.toggle('on', on) }

  /** 필살·특수 버튼 불 켜기 (게이지에 따라) */
  setMeter(meter: number) {
    this.superBtn.classList.toggle('ready', meter >= 100)
    this.specialBtn.classList.toggle('ready', meter >= 25)
  }

  /** 고유 버튼: 캐릭터마다 이름이 바뀌고, 쓸 수 있을 때 불이 켜짐 */
  setTrait(label: string, ready: boolean) {
    const b = this.traitBtn.querySelector('b')!
    if (b.textContent !== label) { b.textContent = label; this.traitBtn.classList.toggle('long', label.length > 2) }
    this.traitBtn.classList.toggle('ready', ready)
  }

  private onKey(e: KeyboardEvent, down: boolean) {
    const k = KEYMAP[e.key.toLowerCase()]
    if (!k) return
    if (e.target instanceof HTMLInputElement) return
    this.keys[k] = down
    e.preventDefault()
  }

  private build() {
    this.root.innerHTML = ''
    // 왼쪽: 방향 패드 (손가락을 미끄러뜨려도 됨)
    const dpad = document.createElement('div')
    dpad.className = 'dpad'
    dpad.innerHTML = '<span class="u">▲</span><span class="l">◀</span><span class="r">▶</span><span class="d">▼</span><i class="knob"></i>'
    const knob = dpad.querySelector('.knob') as HTMLElement
    let pid: number | null = null
    const setDir = (e: PointerEvent) => {
      const r = dpad.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      const d = emptyInput()
      d.left = dx < -0.32; d.right = dx > 0.32; d.up = dy < -0.45; d.down = dy > 0.45
      this.dpadDir = d
      knob.style.transform = `translate(${Math.max(-1, Math.min(1, dx)) * 28}px, ${Math.max(-1, Math.min(1, dy)) * 28}px)`
      dpad.dataset.dir = `${d.up ? 'u' : ''}${d.down ? 'd' : ''}${d.left ? 'l' : ''}${d.right ? 'r' : ''}`
    }
    const clear = () => { pid = null; this.dpadDir = emptyInput(); knob.style.transform = ''; dpad.dataset.dir = '' }
    dpad.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; dpad.setPointerCapture(e.pointerId); setDir(e) })
    dpad.addEventListener('pointermove', (e) => { if (e.pointerId === pid) setDir(e) })
    dpad.addEventListener('pointerup', (e) => { if (e.pointerId === pid) clear() })
    dpad.addEventListener('pointercancel', clear)

    // 오른쪽: 공격 버튼
    const btns = document.createElement('div')
    btns.className = 'abtns'
    const mk = (k: keyof InputState, label: string, sub: string, cls: string) => {
      const b = document.createElement('button')
      b.className = `ab ${cls}`
      b.innerHTML = `<b>${label}</b><small>${sub}</small>`
      b.setAttribute('aria-label', sub)
      const on = (e: PointerEvent) => { e.preventDefault(); this.touch[k] = true; b.classList.add('down'); b.setPointerCapture(e.pointerId); navigator.vibrate?.(8) }
      const off = () => { this.touch[k] = false; b.classList.remove('down') }
      b.addEventListener('pointerdown', on)
      b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off)
      btns.appendChild(b)
      return b
    }
    mk('light', '약', '약공격', 'b-light')
    mk('heavy', '강', '강공격', 'b-heavy')
    this.specialBtn = mk('special', '특', '특수기 (▼+특 = 다른 기술)', 'b-special')
    mk('guard', '방어', '방어', 'b-guard')
    this.traitBtn = mk('trait', '고유', '직업 고유 특성', 'b-trait')
    this.superBtn = mk('super', '필살', '필살기', 'b-super')
    this.root.append(dpad, btns)
    // 길게 눌러도 메뉴·확대가 안 뜨게
    this.root.addEventListener('contextmenu', (e) => e.preventDefault())
  }
}
