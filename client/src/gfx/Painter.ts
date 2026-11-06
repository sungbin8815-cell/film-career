// 측면 격투 도트 화가 v2 (2등신 귀여운 스타일)
// 관절 좌표(포즈) + 의상(코스튬) → 80×76 픽셀 프레임. 외곽선·명암·휘두름 잔상 자동.
// 외부 이미지 없음. 실제 스프라이트 PNG가 생기면 TextureFactory에서 이 단계만 바꾸면 됩니다.

export const FW = 80   // 긴 장비(붐 마이크 등)가 잘리지 않게 좌우 여유 8px씩
const OX = 8           // 포즈 좌표(64칸 기준)를 가운데로 옮김
export const FH = 76   // 위로 휘두르는 동작용 여유 12px
/** 프레임 안 발바닥 높이 (스프라이트 origin) */
export const FOOT_Y = 74
const OY = 12          // 포즈 좌표(발바닥 62 기준)를 아래로 내림
const OUT = '#120d1c'

type P = [number, number]

export interface Costume {
  skin: string
  hair: string
  hairStyle?: 'short' | 'long' | 'bun' | 'spiky'
  cap?: string          // 모자 색 (hat 모양은 hat)
  hat?: 'cap' | 'beanie' | 'beret' | 'bandana' | 'bucket'
  capLogo?: string
  hoodie: string        // 윗옷
  strings: string       // 후드 끈·스카프 등 포인트 색
  top?: 'hoodie' | 'vest' | 'apron' | 'jacket'
  topAccent?: string    // 조끼·앞치마·재킷 색
  pants: string
  shoes: string
  shoeStripe: string
  eye: string
  blush: string
  glasses?: string
  headphones?: string
  gloves?: string
  belt?: string
  stubble?: boolean
}

/** 캐릭터마다 다른 장비: 한 손 장비(small)·긴 장비(long)·특수 효과(fx) */
export type SmallVar = 'hip' | 'front' | 'up' | 'low' | 'shoulder' | 'flash'
export interface Kit {
  small(g: Grid, x: number, y: number, v: SmallVar): void
  long(g: Grid, top: P, end: P): void
  fx(g: Grid, x: number, y: number): void
}

export type Prop =
  | 'cameraShoulder' | 'cameraHip' | 'cameraFront' | 'cameraUp' | 'cameraLow' | 'cameraFlash'
  | 'tripodBack' | 'tripodOver' | 'tripodFront' | 'tripodLow' | 'tripodUp' | 'tripodSpinA' | 'tripodSpinB' | 'tripodPoke'
  | 'fxFront' | 'none'

export type Face = 'normal' | 'focus' | 'shout' | 'hurt' | 'happy' | 'angry' | 'sad' | 'blink'

export interface Pose {
  hip: P; knF: P; ftF: P; knB: P; ftB: P
  sh: P; elF: P; hdF: P; elB: P; hdB: P
  head: P
  face?: Face
  prop?: Prop
  lie?: boolean
  /** 휘두름 잔상: 점들을 잇는 반투명 궤적 */
  smear?: P[]
  /** 머리 기울기용 오프셋(앞으로 숙임 등) */
  squash?: number
  /** 자유 장비 배치: long = 손에서 뻗는 방향, small = 한 손 장비, from = 앞손(F)/뒷손(B) */
  item?: { long?: P; small?: SmallVar; at?: P; from?: 'F' | 'B' }
  /** 특수 효과 위치 (앞손 기준) */
  fx?: P
}

export class Grid {
  px: (string | null)[] = new Array(FW * FH).fill(null)
  part: Uint8Array = new Uint8Array(FW * FH)   // 0 = 비어 있음, 1 = 그림(명암 대상), 2 = 명암 제외(눈 등)
  set(x: number, y: number, c: string, part = 1) {
    x = Math.round(x); y = Math.round(y)
    if (x >= 0 && y >= 0 && x < FW && y < FH) { this.px[y * FW + x] = c; this.part[y * FW + x] = part }
  }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < FW && y < FH ? this.px[y * FW + x] : null }
  rect(x: number, y: number, w: number, h: number, c: string, part = 1) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, part) }
  /** 모서리 둥근 사각형 */
  round(x: number, y: number, w: number, h: number, c: string, r = 2) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const cx = i < r ? r - i : i >= w - r ? i - (w - r - 1) : 0
      const cy = j < r ? r - j : j >= h - r ? j - (h - r - 1) : 0
      if (cx * cx + cy * cy <= r * r + 0.5) this.set(x + i, y + j, c)
    }
  }
  disc(cx: number, cy: number, r: number, c: string) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) this.set(cx + i, cy + j, c) }
  /** 두께 있는 선 (팔다리) */
  limb(a: P, b: P, w: number, c: string) {
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1)
    for (let i = 0; i <= steps; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / steps, y = a[1] + ((b[1] - a[1]) * i) / steps
      this.disc(Math.round(x), Math.round(y), Math.max(1, Math.floor(w / 2)), c)
    }
  }
  line(a: P, b: P, c: string, part = 1) {
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1)
    for (let i = 0; i <= steps; i++) this.set(a[0] + ((b[0] - a[0]) * i) / steps, a[1] + ((b[1] - a[1]) * i) / steps, c, part)
  }
  /** 자동 명암: 위쪽 가장자리 밝게, 아래·뒤쪽 가장자리 어둡게 */
  shadeAll() {
    const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < FW && y < FH && this.px[y * FW + x] != null
    const out = this.px.slice()
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const i = y * FW + x
      const c = this.px[i]
      if (!c || this.part[i] !== 1) continue
      if (!filled(x, y - 1)) out[i] = shade(c, 0.12)
      else if (!filled(x, y + 1) || !filled(x - 1, y)) out[i] = shade(c, -0.14)
    }
    this.px = out
  }
  /** 픽셀을 한 번에 캔버스로 (fillRect를 픽셀마다 부르는 것보다 훨씬 빠름) */
  toCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = FW; c.height = FH
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(FW, FH)
    for (let i = 0; i < this.px.length; i++) {
      const v = this.px[i]
      if (!v) continue
      const rgb = rgbOf(v)
      img.data[i * 4] = rgb >> 16; img.data[i * 4 + 1] = (rgb >> 8) & 255; img.data[i * 4 + 2] = rgb & 255; img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    return c
  }
  outline() {
    const add: P[] = []
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      if (this.get(x, y)) continue
      if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) add.push([x, y])
    }
    for (const [x, y] of add) this.set(x, y, OUT, 2)
  }
}

const rgbCache = new Map<string, number>()
function rgbOf(hex: string) {
  let v = rgbCache.get(hex)
  if (v == null) { v = parseInt(hex.slice(1, 7), 16); rgbCache.set(hex, v) }
  return v
}

export function shade(hex: string, amt: number) {
  if (!hex.startsWith('#')) return hex
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)))
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// ───── 장비 ─────
function camera(g: Grid, x: number, y: number, dir: 1 | -1 = 1) {
  // 몸체 12×8 + 렌즈 + 매트박스 + 손잡이 + 뷰파인더 + REC 불
  g.round(x - 6, y - 4, 12, 8, '#2d3038', 1)
  g.rect(x - 5, y - 3, 3, 2, '#4b505c')                       // 측면 패널
  g.rect(x - 4, y - 7, 8, 2, '#3a3e48')                       // 위 손잡이
  g.rect(x - 4, y - 5, 1, 1, '#3a3e48'); g.rect(x + 3, y - 5, 1, 1, '#3a3e48')
  const lx = dir > 0 ? x + 6 : x - 11
  g.rect(lx, y - 3, 5, 6, '#1b1d23')                          // 렌즈 경통
  g.rect(lx + (dir > 0 ? 4 : 0), y - 4, 2, 8, '#111318')      // 매트박스
  g.set(lx + (dir > 0 ? 5 : 0), y - 2, '#93e1ff', 2); g.set(lx + (dir > 0 ? 5 : 0), y - 1, '#4fb3e8', 2) // 렌즈 반사
  g.rect(dir > 0 ? x - 9 : x + 6, y - 3, 3, 3, '#2d3038')     // 뷰파인더
  g.set(x + 1, y - 1, '#ff3b3b', 2)                           // REC
}
function tripod(g: Grid, top: P, end: P) {
  const dx = end[0] - top[0], dy = end[1] - top[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  const mid: P = [top[0] + dx * 0.45, top[1] + dy * 0.45]
  g.limb(top, end, 2, '#c9ced8')
  g.limb(top, [end[0] + nx * 5, end[1] + ny * 5], 2, '#aab0bc')
  g.limb(top, [end[0] - nx * 5, end[1] - ny * 5], 2, '#aab0bc')
  g.disc(Math.round(mid[0]), Math.round(mid[1]), 1, '#3d4250')        // 관절
  g.round(top[0] - 3, top[1] - 2, 6, 4, '#2d3038', 1)                // 헤드
  g.rect(top[0] - 4, top[1] - 1, 1, 2, '#e8a33b')                    // 팬 핸들
}
export function flashBurst(g: Grid, x: number, y: number) {
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2
    const L = a % 2 ? 4 : 8
    for (let t = 2; t < L; t++) g.set(x + Math.cos(ang) * t, y + Math.sin(ang) * t, t < L - 2 ? '#ffffff' : '#fff3a0', 2)
  }
  g.disc(x, y, 2, '#ffffff')
}

// ───── 얼굴 (3/4 옆얼굴, 오른쪽을 봄) ─────
function face(g: Grid, c: Costume, hx: number, hy: number, f: Face) {
  const E = c.eye
  const e1: P = [hx, hy + 1]       // 뒤쪽 눈
  const e2: P = [hx + 8, hy + 1]   // 앞쪽 눈
  const eye = (p: P) => {
    g.rect(p[0], p[1], 3, 4, E, 2)
    g.set(p[0], p[1], '#ffffff', 2); g.set(p[0] + 1, p[1], '#ffffff', 2)   // 큰 하이라이트
    g.set(p[0] + 2, p[1] + 3, '#6b5a8a', 2)                                 // 아래 반사
  }
  const brow = (p: P, tilt: number) => {
    g.set(p[0], p[1] - 2 + (tilt > 0 ? 1 : 0), E, 2); g.set(p[0] + 1, p[1] - 2, E, 2); g.set(p[0] + 2, p[1] - 2 + (tilt < 0 ? 1 : 0), E, 2)
  }
  const mouth = (w: number, h: number, inner = '#5c1424', tongue = true) => {
    g.rect(hx + 4, hy + 7, w, h, inner, 2)
    if (tongue && h > 1) g.rect(hx + 5, hy + 6 + h, w - 2, 1, '#ff7b8f', 2)
  }
  switch (f) {
    case 'hurt':
      for (const p of [e1, e2]) { g.set(p[0], p[1], E, 2); g.set(p[0] + 1, p[1] + 1, E, 2); g.set(p[0] + 2, p[1] + 2, E, 2); g.set(p[0] + 1, p[1] + 3, E, 2); g.set(p[0], p[1] + 4, E, 2) }
      g.rect(hx + 4, hy + 8, 4, 1, '#7a1f2b', 2); g.set(hx + 5, hy + 7, '#7a1f2b', 2); g.set(hx + 7, hy + 9, '#7a1f2b', 2)
      g.set(hx + 12, hy - 3, '#7dd3fc', 2); g.set(hx + 12, hy - 2, '#7dd3fc', 2)   // 식은땀
      break
    case 'shout':
      eye(e1); eye(e2); brow(e1, 1); brow(e2, -1)
      mouth(5, 4); g.rect(hx + 4, hy + 7, 5, 1, '#ffffff', 2)
      break
    case 'happy':
      for (const p of [e1, e2]) { g.set(p[0], p[1] + 2, E, 2); g.set(p[0] + 1, p[1] + 1, E, 2); g.set(p[0] + 2, p[1] + 2, E, 2) }
      mouth(4, 3)
      break
    case 'angry':
      eye(e1); eye(e2); brow(e1, 1); brow(e2, -1); g.rect(e2[0], e2[1], 3, 1, E, 2)
      g.rect(hx + 4, hy + 8, 4, 1, E, 2); g.rect(hx + 4, hy + 7, 4, 1, '#ffffff', 2)
      break
    case 'focus':
      g.rect(e1[0], e1[1] + 1, 3, 3, E, 2); g.rect(e2[0], e2[1] + 1, 3, 3, E, 2); g.set(e2[0], e2[1] + 1, '#ffffff', 2)
      brow(e1, 1); brow(e2, -1); g.rect(e1[0], e1[1], 3, 1, shade(c.skin, -0.18), 2); g.rect(e2[0], e2[1], 3, 1, shade(c.skin, -0.18), 2)
      g.rect(hx + 5, hy + 8, 3, 1, shade(c.skin, -0.32), 2)
      break
    case 'sad':
      eye(e1); eye(e2); g.set(e2[0] + 2, e2[1] + 4, '#7dd3fc', 2); g.set(e2[0] + 2, e2[1] + 5, '#7dd3fc', 2); g.set(e2[0] + 2, e2[1] + 6, '#7dd3fc', 2)
      g.rect(hx + 5, hy + 8, 3, 1, E, 2); g.set(hx + 4, hy + 9, E, 2); g.set(hx + 8, hy + 9, E, 2)
      break
    case 'blink':
      g.rect(e1[0], e1[1] + 3, 3, 1, E, 2); g.rect(e2[0], e2[1] + 3, 3, 1, E, 2)
      g.rect(hx + 5, hy + 8, 2, 1, shade(c.skin, -0.32), 2)
      break
    default:
      eye(e1); eye(e2)
      g.rect(hx + 5, hy + 8, 2, 1, shade(c.skin, -0.32), 2); g.set(hx + 4, hy + 7, shade(c.skin, -0.32), 2); g.set(hx + 7, hy + 7, shade(c.skin, -0.32), 2) // 웃는 입
  }
  if (f !== 'hurt') { g.rect(hx - 2, hy + 6, 3, 1, c.blush, 2); g.rect(hx + 11, hy + 6, 3, 1, c.blush, 2) }
}

// ───── 캐릭터 한 프레임 ─────
export function paint(c: Costume, pose: Pose, kit: Kit = KITS.camera): HTMLCanvasElement {
  const sh = (q: P): P => [q[0] + OX, q[1] + OY]
  const p: Pose = { ...pose, fx: pose.fx, hip: sh(pose.hip), knF: sh(pose.knF), ftF: sh(pose.ftF), knB: sh(pose.knB), ftB: sh(pose.ftB), sh: sh(pose.sh), elF: sh(pose.elF), hdF: sh(pose.hdF), elB: sh(pose.elB), hdB: sh(pose.hdB), head: sh(pose.head), smear: pose.smear?.map(sh) }
  const g = new Grid()
  const pantsB = shade(c.pants, -0.1)
  const hoodB = shade(c.hoodie, -0.1)
  const shoe = (ft: P, col: string, back: boolean) => {
    g.round(ft[0] - 3, ft[1], 8, 4, col, 1)
    g.rect(ft[0] - 3, ft[1] + 3, 8, 1, back ? '#b9b2a6' : '#efe8dc')
    g.rect(ft[0] - 1, ft[1] + 1, 3, 1, back ? shade(c.shoeStripe, -0.15) : c.shoeStripe)
  }
  // 뒤쪽 다리·팔
  g.limb(p.hip, p.knB, 5, pantsB); g.limb(p.knB, p.ftB, 5, pantsB)
  shoe(p.ftB, shade(c.shoes, -0.12), true)
  if (p.prop === 'tripodBack') kit.long(g, [p.hdB[0], p.hdB[1]], [p.hdB[0] - 16, p.hdB[1] + 8])
  const drawItem = () => {
    const it = p.item!
    const H = it.from === 'B' ? p.hdB : p.hdF
    if (it.long) kit.long(g, [H[0], H[1]], [H[0] + it.long[0], H[1] + it.long[1]])
    if (it.small) kit.small(g, H[0] + (it.at?.[0] ?? 3), H[1] + (it.at?.[1] ?? 1), it.small)
  }
  if (p.item?.from === 'B') drawItem()   // 뒷손 장비는 몸 뒤에
  g.limb(p.sh, p.elB, 4, hoodB); g.limb(p.elB, p.hdB, 4, hoodB)
  g.disc(p.hdB[0], p.hdB[1], 2, shade(c.gloves ?? c.skin, -0.08))
  // 몸통 (후드티)
  g.limb(p.hip, p.sh, 12, c.hoodie)
  g.limb([p.hip[0] - 1, p.hip[1] + 1], [p.hip[0] + 1, p.hip[1] + 1], 11, shade(c.hoodie, -0.06)) // 밑단
  const neck: P = [p.sh[0] + 1, p.sh[1] - 2]
  g.disc(neck[0] - 4, neck[1] + 1, 4, hoodB)                                       // 등 뒤 후드
  const top = c.top ?? 'hoodie'
  const lean = (p.hip[0] - p.sh[0])
  const fx = p.sh[0] + 3
  if (top === 'hoodie') {
    // 후드 끈 + 주머니
    g.line([fx, p.sh[1] - 1], [fx + lean * 0.3, p.sh[1] + 5], c.strings, 2)
    g.line([fx + 2, p.sh[1] - 1], [fx + 2 + lean * 0.3, p.sh[1] + 5], c.strings, 2)
    g.line([p.hip[0] - 1, p.hip[1] - 4], [p.hip[0] + 5, p.hip[1] - 4], shade(c.hoodie, -0.2), 2)
  } else if (top === 'vest' && c.topAccent) {
    // 낚시 조끼: 주머니 많은 조끼
    g.limb([p.hip[0] - 1, p.hip[1] - 2], [p.sh[0] - 1, p.sh[1] + 1], 10, c.topAccent)
    g.rect(fx - 1 + lean * 0.4, p.sh[1] + 4, 3, 3, shade(c.topAccent, -0.15)); g.rect(fx - 6 + lean * 0.6, p.sh[1] + 6, 3, 3, shade(c.topAccent, -0.15))
    g.line([fx + 1, p.sh[1]], [fx + 1 + lean * 0.8, p.hip[1] - 2], c.strings, 2)
  } else if (top === 'apron' && c.topAccent) {
    // 앞치마 + 물감 얼룩
    g.limb([p.hip[0] + 2, p.hip[1] + 2], [p.sh[0] + 3, p.sh[1] + 3], 7, c.topAccent)
    g.line([p.sh[0] + 1, p.sh[1] - 1], [p.sh[0] + 5, p.sh[1] - 1], c.topAccent)
    g.set(p.sh[0] + 4 + lean * 0.4, p.sh[1] + 6, '#f43f5e', 2); g.set(p.sh[0] + 2 + lean * 0.6, p.sh[1] + 9, '#facc15', 2); g.set(p.sh[0] + 5 + lean * 0.7, p.sh[1] + 10, '#22c55e', 2)
  } else if (top === 'jacket' && c.topAccent) {
    // 재킷 앞섶 + 스카프
    g.line([fx, p.sh[1]], [fx + lean * 0.9, p.hip[1] - 1], c.topAccent, 2)
    g.line([fx + 1, p.sh[1]], [fx + 1 + lean * 0.9, p.hip[1] - 1], shade(c.topAccent, -0.2), 2)
    g.rect(p.sh[0] - 3, p.sh[1] - 2, 8, 3, c.strings); g.rect(p.sh[0] + 2, p.sh[1] + 1, 2, 5, shade(c.strings, -0.1))
  }
  if (c.belt) {
    g.line([p.hip[0] - 6, p.hip[1] - 2], [p.hip[0] + 6, p.hip[1] - 2], c.belt)
    g.line([p.hip[0] - 6, p.hip[1] - 1], [p.hip[0] + 6, p.hip[1] - 1], shade(c.belt, -0.2))
    g.rect(p.hip[0] + 3, p.hip[1] - 1, 3, 3, shade(c.belt, 0.1))
  }
  // 앞쪽 다리
  g.limb(p.hip, p.knF, 5, c.pants); g.limb(p.knF, p.ftF, 5, c.pants)
  shoe(p.ftF, c.shoes, false)
  // 머리 (2등신: 몸보다 크게)
  const [hx, hy] = p.head
  g.round(hx - 11, hy - 9, 25, 21, c.skin, 6)
  g.rect(hx - 9, hy + 3, 3, 4, shade(c.skin, -0.08)); g.set(hx - 8, hy + 4, shade(c.skin, -0.22), 2); g.set(hx - 8, hy + 5, shade(c.skin, -0.22), 2)  // 귀
  // 머리카락
  const hs = c.hairStyle ?? 'short'
  if (hs === 'long') { g.round(hx - 14, hy - 8, 8, 22, c.hair, 3); g.rect(hx - 13, hy + 10, 5, 3, shade(c.hair, -0.1)) }  // 등까지 내려오는 머리
  g.round(hx - 12, hy - 12, 26, 10, c.hair, 4)
  g.rect(hx - 12, hy - 5, 4, 8, c.hair)                                           // 뒷머리
  g.rect(hx + 10, hy - 4, 3, 2, c.hair); g.set(hx + 12, hy - 2, c.hair)            // 앞머리
  if (hs === 'long') { g.rect(hx + 6, hy - 5, 7, 3, c.hair); g.rect(hx + 11, hy - 2, 2, 4, c.hair) }   // 앞머리 내림
  if (hs === 'spiky') for (let k = 0; k < 4; k++) { g.set(hx - 9 + k * 6, hy - 13, c.hair); g.set(hx - 8 + k * 6, hy - 14, c.hair); g.set(hx - 8 + k * 6, hy - 15, c.hair) }
  if (hs === 'bun') { g.disc(hx - 6, hy - 15, 4, c.hair); g.rect(hx - 8, hy - 12, 5, 1, c.strings) }
  // 모자
  const hat = c.cap ? (c.hat ?? 'cap') : null
  if (hat === 'cap' && c.cap) {
    g.round(hx - 12, hy - 15, 26, 9, c.cap, 4)
    g.rect(hx + 9, hy - 8, 9, 3, shade(c.cap, -0.2))                              // 챙
    g.rect(hx - 12, hy - 8, 22, 1, shade(c.cap, -0.12))                          // 띠
    if (c.capLogo) g.rect(hx + 1, hy - 13, 4, 3, c.capLogo, 2)
  } else if (hat === 'beanie' && c.cap) {
    g.round(hx - 13, hy - 17, 27, 11, c.cap, 5)
    g.rect(hx - 13, hy - 8, 27, 3, shade(c.cap, -0.12))                          // 접힌 단
    for (let k = 0; k < 9; k++) g.set(hx - 12 + k * 3, hy - 7, shade(c.cap, -0.25))
    if (c.capLogo) g.rect(hx + 3, hy - 8, 4, 2, c.capLogo, 2)
    g.disc(hx, hy - 18, 2, c.capLogo ?? shade(c.cap, 0.2))                       // 방울
  } else if (hat === 'beret' && c.cap) {
    g.round(hx - 13, hy - 16, 25, 7, c.cap, 3)
    g.rect(hx + 8, hy - 11, 7, 3, c.cap); g.set(hx - 1, hy - 17, shade(c.cap, -0.2)); g.set(hx - 1, hy - 18, shade(c.cap, -0.2))
  } else if (hat === 'bandana' && c.cap) {
    g.round(hx - 12, hy - 14, 26, 8, c.cap, 3)
    for (let k = 0; k < 5; k++) g.set(hx - 9 + k * 5, hy - 11 + (k % 2), c.capLogo ?? '#ffffff', 2)
    g.rect(hx - 16, hy - 9, 5, 2, c.cap); g.rect(hx - 17, hy - 7, 3, 3, shade(c.cap, -0.12))   // 매듭
  } else if (hat === 'bucket' && c.cap) {
    g.round(hx - 11, hy - 17, 23, 10, c.cap, 4)
    g.rect(hx - 15, hy - 8, 31, 3, shade(c.cap, -0.15))
  }
  if (!hat || hat === 'bandana') { g.set(hx - 2, hy - 17, c.hair); g.set(hx - 1, hy - 18, c.hair); g.set(hx, hy - 18, c.hair); g.set(hx + 1, hy - 17, c.hair); g.set(hx + 1, hy - 16, c.hair) } // 삐침머리
  else if (hat === 'cap') { g.set(hx - 2, hy - 17, c.hair); g.set(hx - 1, hy - 18, c.hair); g.set(hx, hy - 18, c.hair); g.set(hx + 1, hy - 17, c.hair); g.set(hx + 1, hy - 16, c.hair) }
  face(g, c, hx, hy, p.face ?? 'normal')
  if (c.stubble) for (let k = 0; k < 6; k++) g.set(hx + 2 + k * 2, hy + 10 + (k % 2), shade(c.skin, -0.25), 2)
  if (c.glasses) {
    g.rect(hx - 1, hy, 5, 5, c.glasses, 2); g.rect(hx, hy + 1, 3, 3, '#cfe8ff', 2)
    g.rect(hx + 7, hy, 5, 5, c.glasses, 2); g.rect(hx + 8, hy + 1, 3, 3, '#cfe8ff', 2)
    g.line([hx + 4, hy + 1], [hx + 7, hy + 1], c.glasses, 2)
    g.set(hx + 8, hy + 2, c.eye, 2); g.set(hx + 9, hy + 2, c.eye, 2); g.set(hx, hy + 2, c.eye, 2); g.set(hx + 1, hy + 2, c.eye, 2)
  }
  if (c.headphones) {
    g.line([hx - 10, hy - 6], [hx - 6, hy - 15], c.headphones); g.line([hx - 6, hy - 15], [hx + 6, hy - 17], c.headphones)
    g.round(hx - 13, hy - 4, 7, 10, c.headphones, 2); g.rect(hx - 12, hy - 2, 2, 6, '#4ade80', 2)
  }
  // 앞쪽 팔
  g.limb(p.sh, p.elF, 4, c.hoodie); g.limb(p.elF, p.hdF, 4, c.hoodie)
  g.disc(p.hdF[0], p.hdF[1], 2, c.gloves ?? c.skin)
  // 장비
  const H = p.hdF
  switch (p.prop) {
    case 'cameraShoulder': kit.small(g, p.sh[0] + 4, p.sh[1] + 1, 'shoulder'); break
    case 'cameraHip': kit.small(g, H[0] + 3, H[1] + 1, 'hip'); break
    case 'cameraFront': kit.small(g, H[0] + 5, H[1] - 1, 'front'); break
    case 'cameraUp': kit.small(g, H[0] + 1, H[1] - 5, 'up'); break
    case 'cameraLow': kit.small(g, H[0] + 3, H[1] + 3, 'low'); break
    case 'cameraFlash': kit.small(g, H[0] + 5, H[1] - 1, 'flash'); kit.fx(g, H[0] + 17, H[1] - 1); break
    case 'tripodOver': kit.long(g, [H[0], H[1]], [H[0] - 8, H[1] - 20]); break
    case 'tripodFront': kit.long(g, [H[0], H[1]], [H[0] + 22, H[1] + 3]); break
    case 'tripodLow': kit.long(g, [H[0], H[1]], [H[0] + 20, H[1] + 12]); break
    case 'tripodUp': kit.long(g, [H[0], H[1]], [H[0] + 6, H[1] - 22]); break
    case 'tripodSpinA': kit.long(g, [H[0], H[1]], [H[0] + 22, H[1] - 6]); break
    case 'tripodSpinB': kit.long(g, [p.hdB[0], p.hdB[1]], [p.hdB[0] - 22, p.hdB[1] - 4]); break
    case 'tripodPoke': kit.long(g, [H[0] - 4, H[1]], [H[0] + 24, H[1] - 1]); break
    case 'fxFront': kit.fx(g, H[0] + 10, H[1] - 1); break
  }
  if (p.item && p.item.from !== 'B') drawItem()
  if (p.fx) kit.fx(g, H[0] + p.fx[0], H[1] + p.fx[1])
  g.shadeAll()
  g.outline()
  // 휘두름 잔상 (외곽선 없이 반투명)
  const cv = document.createElement('canvas')
  cv.width = FW; cv.height = FH
  const ctx = cv.getContext('2d')!
  // 누운 자세: 몸 가운데(40,40)를 기준으로 90° 눕혀서 바닥(y≈72)에 닿게, 머리는 뒤쪽
  if (p.lie) { ctx.translate(FW / 2, 60); ctx.rotate(-Math.PI / 2); ctx.translate(-FW / 2, -40) }
  if (p.smear) {
    for (let k = 0; k < p.smear.length - 1; k++) {
      const a = p.smear[k], b = p.smear[k + 1]
      const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1)
      for (let i = 0; i <= steps; i++) {
        const t = (k + i / steps) / (p.smear.length - 1)
        const x = Math.round(a[0] + ((b[0] - a[0]) * i) / steps), y = Math.round(a[1] + ((b[1] - a[1]) * i) / steps)
        ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.55 * t})`
        ctx.fillRect(x - 1, y - 1, 3, 3)
        ctx.fillStyle = `rgba(147,225,255,${0.5 * t})`
        ctx.fillRect(x - 2, y, 1, 1)
      }
    }
  }
  ctx.drawImage(g.toCanvas(), 0, 0)
  return cv
}

export function paintLightStandFalling(): HTMLCanvasElement {
  const g = new Grid()
  const base: P = [FW / 2, 72], h = 26
  g.limb(base, [base[0], base[1] - h], 2, '#8a93a6')
  g.limb(base, [base[0] - 6, base[1] + 2], 2, '#8a93a6'); g.limb(base, [base[0] + 6, base[1] + 2], 2, '#8a93a6')
  g.round(base[0] - 7, base[1] - h - 9, 14, 9, '#2d3038', 2)
  g.rect(base[0] - 9, base[1] - h - 9, 2, 9, '#1b1d23'); g.rect(base[0] + 7, base[1] - h - 9, 2, 9, '#1b1d23') // 반도어
  g.rect(base[0] - 5, base[1] - h - 1, 10, 2, '#fff3a0', )
  g.shadeAll(); g.outline()
  const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = 'rgba(255,243,160,0.25)'; ctx.beginPath(); ctx.moveTo(base[0] - 5, base[1] - h); ctx.lineTo(base[0] - 14, base[1] + 2); ctx.lineTo(base[0] + 14, base[1] + 2); ctx.lineTo(base[0] + 5, base[1] - h); ctx.fill()
  ctx.drawImage(g.toCanvas(), 0, 0)
  return cv
}

// ───── 부서별 장비 세트 ─────
function cone(g: Grid, a: P, b: P, r0: number, r1: number, col: string) {
  const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    g.disc(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(r0 + (r1 - r0) * t), col)
  }
}
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
function arcs(g: Grid, x: number, y: number, col: string) {
  for (let r = 3; r <= 9; r += 3) for (let a = -0.9; a <= 0.9; a += 0.15) g.set(x + Math.cos(a) * r, y + Math.sin(a) * r, r === 9 ? shade(col, -0.2) : col, 2)
}

export const KITS: Record<string, Kit> = {
  // 촬영부: 카메라 + 삼각대
  camera: { small: (g, x, y) => camera(g, x, y), long: tripod, fx: flashBurst },
  // 연출부: 슬레이트(딱!) + 메가폰
  director: {
    small(g, x, y, v) {
      g.rect(x - 5, y - 3, 11, 8, '#26232e')                                   // 보드
      g.rect(x - 4, y - 1, 9, 1, '#f4f1ea'); g.rect(x - 4, y + 2, 6, 1, '#f4f1ea')   // 분필 글씨
      const open = v === 'flash' || v === 'up'
      const cy = open ? y - 7 : y - 5
      for (let i = 0; i < 11; i++) g.set(x - 5 + i, cy + (open ? Math.round(i * -0.3) : 0), i % 4 < 2 ? '#f4f1ea' : '#26232e')
      for (let i = 0; i < 11; i++) g.set(x - 5 + i, cy + 1 + (open ? Math.round(i * -0.3) : 0), i % 4 < 2 ? '#26232e' : '#f4f1ea')
    },
    long(g, top, end) {
      cone(g, top, end, 1, 5, '#f4f1ea')
      g.disc(Math.round(end[0]), Math.round(end[1]), 5, '#e0353f')                // 나팔 입구
      g.disc(Math.round(end[0]), Math.round(end[1]), 3, '#7a1f2b')
      const m = lerp(top, end, 0.3); g.rect(Math.round(m[0]) - 1, Math.round(m[1]), 3, 4, '#26232e')   // 손잡이
    },
    fx(g, x, y) { for (const [dx, dy] of [[0, -6], [4, -4], [6, 0], [4, 4], [0, 6]]) g.line([x + dx * 0.5, y + dy * 0.5], [x + dx * 1.3, y + dy * 1.3], '#ffffff', 2); g.disc(x, y, 1, '#fff3a0') },
  },
  // 녹음부: 녹음기 + 붐 마이크(털 윈드스크린)
  sound: {
    small(g, x, y) {
      g.round(x - 5, y - 3, 10, 8, '#3d4250', 1); g.rect(x - 4, y - 2, 4, 2, '#93e1ff', 2)
      g.set(x + 2, y - 2, '#ffd23f', 2); g.set(x + 3, y + 1, '#ffd23f', 2); g.set(x + 1, y + 1, '#ff3b3b', 2)
      g.line([x - 5, y - 3], [x - 2, y - 7], '#26232e'); g.line([x + 4, y - 3], [x + 1, y - 7], '#26232e')
    },
    long(g, top, end) {
      const e2 = lerp(top, end, 1.35)
      g.limb(lerp(top, end, -0.25), e2, 2, '#c9ced8')
      g.round(Math.round(e2[0]) - 5, Math.round(e2[1]) - 3, 11, 7, '#9a9aa4', 3)       // 털 윈드스크린
      for (let k = 0; k < 6; k++) g.set(Math.round(e2[0]) - 5 + k * 2, Math.round(e2[1]) - 4 + (k % 2), '#b8b8c2')
      g.line([top[0], top[1] + 1], [lerp(top, end, 0.6)[0], lerp(top, end, 0.6)[1] + 2], '#26232e', 2)   // 케이블
    },
    fx(g, x, y) { arcs(g, x - 4, y, '#86efac') },
  },
  // 조명부: LED 패널 + C스탠드(플래그)
  gaffer: {
    small(g, x, y, v) {
      g.rect(x - 4, y - 5, 9, 9, '#2d3038'); g.rect(x - 3, y - 4, 7, 7, v === 'flash' ? '#ffffff' : '#fef3c7', 2)
      for (let i = 0; i < 3; i++) g.set(x - 2 + i * 2, y - 2, '#fde68a', 2)
    },
    long(g, top, end) {
      const e2 = lerp(top, end, 1.2)
      g.limb(lerp(top, end, -0.2), e2, 2, '#9ca3af')
      const k = lerp(top, end, 0.75); g.disc(Math.round(k[0]), Math.round(k[1]), 2, '#4b5563')           // 그립 헤드
      g.round(Math.round(e2[0]) - 4, Math.round(e2[1]) - 5, 9, 10, '#111827', 1)                          // 블랙 플래그
    },
    fx(g, x, y) { g.disc(x, y, 3, '#ffffff'); for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; for (let t = 4; t < (a % 2 ? 7 : 11); t++) g.set(x + Math.cos(an) * t, y + Math.sin(an) * t, '#fef9c3', 2) } },
  },
  // 미술부: 망치 + 페인트 롤러
  art: {
    small(g, x, y, v) {
      const up = v === 'up' || v === 'flash'
      g.limb([x - 2, y + 3], up ? [x + 1, y - 6] : [x + 5, y - 2], 2, '#b45309')
      const hx = up ? x + 1 : x + 5, hy = up ? y - 6 : y - 2
      g.rect(hx - 3, hy - 2, 7, 4, '#6b7280'); g.rect(hx + 3, hy - 2, 1, 4, '#9ca3af')
    },
    long(g, top, end) {
      g.limb(lerp(top, end, -0.15), end, 2, '#d6b27a')
      const n: P = [end[0] - (end[1] - top[1]) * 0.25, end[1] + (end[0] - top[0]) * 0.25]
      g.limb([end[0], end[1]], n, 1, '#6b7280')
      g.limb([n[0] - 3, n[1]], [n[0] + 3, n[1]], 6, '#3b82f6'); g.limb([n[0] - 3, n[1] + 2], [n[0] + 3, n[1] + 2], 2, '#1d4ed8')
    },
    fx(g, x, y) { for (const [dx, dy, c] of [[0, 0, '#3b82f6'], [4, -3, '#f43f5e'], [6, 2, '#facc15'], [2, 4, '#3b82f6'], [8, -1, '#22c55e']] as const) g.disc(x + dx, y + dy, 2, c) },
  },
  // 분장팀: 헤어스프레이 + 대형 브러시
  makeup: {
    small(g, x, y) {
      g.rect(x - 2, y - 5, 5, 9, '#ff7eb6'); g.rect(x - 2, y - 7, 5, 2, '#f4f1ea'); g.set(x + 2, y - 7, '#26232e', 2)
      g.rect(x - 1, y - 2, 3, 3, '#ffd6e8', 2)
    },
    long(g, top, end) {
      g.limb(lerp(top, end, -0.1), lerp(top, end, 0.7), 2, '#1f1a24')
      g.limb(lerp(top, end, 0.68), lerp(top, end, 0.78), 3, '#d4af37')
      cone(g, lerp(top, end, 0.78), lerp(top, end, 1.1), 2, 4, '#f9a8d4')
      g.disc(Math.round(lerp(top, end, 1.1)[0]), Math.round(lerp(top, end, 1.1)[1]), 3, '#fbcfe8')
    },
    fx(g, x, y) { for (let k = 0; k < 14; k++) g.set(x + Math.round(Math.cos(k * 2.3) * (2 + k % 6)), y + Math.round(Math.sin(k * 2.3) * (1 + k % 4)), k % 3 ? '#fbcfe8' : '#ffffff', 2) },
  },
}

/** 투사체 그림 (80×76 칸, 바닥 기준 아래 가운데) */
export function paintProjectile(kind: string): HTMLCanvasElement {
  if (kind === 'lightstand') return paintLightStandFalling()
  const g = new Grid()
  const cx = FW / 2, cy = 60
  switch (kind) {
    case 'cut': // 메가폰 "컷!" 충격파
      for (let r = 4; r <= 12; r += 4) for (let a = -1; a <= 1; a += 0.08) g.set(cx - 6 + Math.cos(a) * r, cy + Math.sin(a) * r * 1.3, r === 12 ? '#fde68a' : '#ffffff', 2)
      break
    case 'wave': // 하울링 음파
      for (let r = 3; r <= 13; r += 5) for (let a = -1.1; a <= 1.1; a += 0.07) { g.set(cx - 6 + Math.cos(a) * r, cy + Math.sin(a) * r * 1.4, '#86efac', 2); g.set(cx - 7 + Math.cos(a) * r, cy + Math.sin(a) * r * 1.4, '#22c55e', 2) }
      break
    case 'script': // 대본 뭉치
      g.rect(cx - 6, cy - 4, 12, 9, '#f4f1ea'); g.rect(cx - 6, cy - 4, 2, 9, '#e0353f')
      for (let k = 0; k < 3; k++) g.rect(cx - 2, cy - 2 + k * 2, 6, 1, '#9ca3af')
      g.shadeAll(); g.outline()
      break
    case 'bulb': // 전구
      g.disc(cx, cy - 2, 4, '#fef3c7'); g.rect(cx - 2, cy + 2, 4, 3, '#9ca3af'); g.set(cx - 1, cy - 4, '#ffffff', 2)
      g.shadeAll(); g.outline()
      break
    case 'paint': // 페인트 덩어리
      g.disc(cx, cy, 4, '#3b82f6'); g.disc(cx - 4, cy + 2, 2, '#3b82f6'); g.set(cx + 1, cy - 2, '#93c5fd', 2)
      g.shadeAll(); g.outline()
      break
    case 'spray': // 헤어스프레이 구름
      for (let k = 0; k < 40; k++) g.set(cx + Math.round(Math.cos(k * 2.4) * (k % 9)), cy + Math.round(Math.sin(k * 2.4) * (k % 6)), k % 3 ? '#fbcfe8' : '#ffffff', 2)
      break
    case 'beam': // 풀파워 조명 빛기둥
      for (let y = 0; y < 66; y++) for (let x = -7; x <= 7; x++) if (Math.abs(x) < 7 - (y % 7 === 0 ? 1 : 0)) g.set(cx + x, 74 - y - 8, Math.abs(x) < 3 ? '#ffffff' : '#fef08a', 2)
      break
  }
  const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH
  const ctx = cv.getContext('2d')!
  ctx.drawImage(g.toCanvas(), 0, 0)
  return cv
}
