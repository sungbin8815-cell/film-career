// 입력: 휴대폰 격투 콘솔(DOM 터치 패드) + 키보드 → InputState 하나로 합침.
// 전투 로직은 이 InputState만 봅니다(온라인에서도 같은 형식으로 전송).
import { emptyInput, type InputState } from '../core/types'

const KEYMAP: Record<string, keyof InputState> = {
  a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right',
  w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down',
  // J A 약 · K B 강 · L C 직업기 · I D 특성기 · U R 궁극기 / 태그: Q 교체 · E 어시스트 / 방어 = 상대 반대 방향
  j: 'light', k: 'heavy', l: 'special', i: 'trait', u: 'super', q: 'swap', e: 'assist',
  z: 'light', x: 'heavy', c: 'special', v: 'trait', b: 'super',
}

export class Controls {
  private keys = emptyInput()
  private touch = emptyInput()
  private dpadDir = emptyInput()
  private root: HTMLElement
  private superBtn!: HTMLButtonElement
  private specialBtn!: HTMLButtonElement
  private traitBtn!: HTMLButtonElement
  private tagBtns: HTMLButtonElement[] = []

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
  }

  /** C·D 버튼 표시: 이름(특성 상태), 쿨타임(초), 쓸 수 있는지 */
  setSkill(slot: 'C' | 'D', label: string, cd: number, ready: boolean) {
    const btn = slot === 'C' ? this.specialBtn : this.traitBtn
    const b = btn.querySelector('b')!, sm = btn.querySelector('i')!
    const text = cd > 0 ? String(Math.ceil(cd / 60)) : label
    if (b.textContent !== text) { b.textContent = text; btn.classList.toggle('long', text.length > 2) }
    if (sm.textContent !== slot) sm.textContent = slot
    btn.classList.toggle('ready', ready && cd <= 0)
    btn.classList.toggle('cool', cd > 0)
  }
  /** 예전 이름 호환 */
  setTrait(label: string, ready: boolean) { this.setSkill('D', label, 0, ready) }
  /** 태그 모드 버튼 보이기 + 쿨타임 */
  setTag(on: boolean, swapCd = 0, assistCd = 0) {
    this.root.classList.toggle('tag', on)
    const [sw, as] = this.tagBtns
    sw.classList.toggle('cool', swapCd > 0); as.classList.toggle('cool', assistCd > 0)
    sw.querySelector('b')!.textContent = swapCd > 0 ? String(Math.ceil(swapCd / 60)) : '교체'
    as.querySelector('b')!.textContent = assistCd > 0 ? String(Math.ceil(assistCd / 60)) : '어시'
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
      b.innerHTML = `<b>${label}</b><i></i><small>${sub}</small>`
      b.setAttribute('aria-label', sub)
      const on = (e: PointerEvent) => { e.preventDefault(); this.touch[k] = true; b.classList.add('down'); b.setPointerCapture(e.pointerId); navigator.vibrate?.(8) }
      const off = () => { this.touch[k] = false; b.classList.remove('down') }
      b.addEventListener('pointerdown', on)
      b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off)
      btns.appendChild(b)
      return b
    }
    // 다이아몬드: D 위 · A 왼쪽 · C 오른쪽 · B 아래 (키보드 I·J·L·K 배치와 같음). R은 따로 크게
    // 방어는 버튼 없이 상대 반대 방향
    this.traitBtn = mk('trait', 'D', '특성기 D', 'b-trait')
    mk('light', 'A', '약공격 A', 'b-light')
    this.specialBtn = mk('special', 'C', '직업기 C', 'b-special')
    mk('heavy', 'B', '강공격 B', 'b-heavy')
    this.superBtn = mk('super', 'R', '궁극기 R (SP 100)', 'b-super')
    // 태그 모드: 교체·어시스트 (방향 패드 위쪽)
    const tag = document.createElement('div')
    tag.className = 'tagbtns'
    const mkTag = (k: keyof InputState, label: string, cls: string) => {
      const b = document.createElement('button')
      b.className = `ab ${cls}`; b.innerHTML = `<b>${label}</b>`
      const on = (e: PointerEvent) => { e.preventDefault(); this.touch[k] = true; b.classList.add('down'); b.setPointerCapture(e.pointerId) }
      const off = () => { this.touch[k] = false; b.classList.remove('down') }
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off)
      tag.appendChild(b); this.tagBtns.push(b)
    }
    mkTag('swap', '교체', 'b-swap'); mkTag('assist', '어시', 'b-assist')
    const left = document.createElement('div')
    left.className = 'leftpad'
    left.append(tag, dpad)
    this.root.append(left, btns)
    // 길게 눌러도 메뉴·확대가 안 뜨게
    this.root.addEventListener('contextmenu', (e) => e.preventDefault())
  }
}
