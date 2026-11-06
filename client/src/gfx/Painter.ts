// 측면 격투 도트 화가 v2 (2등신 귀여운 스타일)
// 관절 좌표(포즈) + 의상(코스튬) → 64×64 픽셀 프레임. 외곽선·명암·휘두름 잔상 자동.
// 외부 이미지 없음. 실제 스프라이트 PNG가 생기면 TextureFactory에서 이 단계만 바꾸면 됩니다.

export const FW = 64
export const FH = 76   // 위로 휘두르는 동작용 여유 12px
/** 프레임 안 발바닥 높이 (스프라이트 origin) */
export const FOOT_Y = 74
const OY = 12          // 포즈 좌표(발바닥 62 기준)를 아래로 내림
const OUT = '#120d1c'

type P = [number, number]

export interface Costume {
  skin: string
  hair: string
  cap?: string
  capLogo?: string
  hoodie: string        // 후드티
  strings: string       // 후드 끈 (포인트 색)
  pants: string
  shoes: string
  shoeStripe: string
  eye: string
  blush: string
}

export type Prop =
  | 'cameraShoulder' | 'cameraHip' | 'cameraFront' | 'cameraUp' | 'cameraLow' | 'cameraFlash'
  | 'tripodBack' | 'tripodOver' | 'tripodFront' | 'tripodLow' | 'tripodUp' | 'tripodSpinA' | 'tripodSpinB'
  | 'none'

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
}

class Grid {
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
  outline() {
    const add: P[] = []
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      if (this.get(x, y)) continue
      if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) add.push([x, y])
    }
    for (const [x, y] of add) this.set(x, y, OUT, 2)
  }
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
function flashBurst(g: Grid, x: number, y: number) {
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
export function paint(c: Costume, pose: Pose): HTMLCanvasElement {
  const sh = (q: P): P => [q[0], q[1] + OY]
  const p: Pose = { ...pose, hip: sh(pose.hip), knF: sh(pose.knF), ftF: sh(pose.ftF), knB: sh(pose.knB), ftB: sh(pose.ftB), sh: sh(pose.sh), elF: sh(pose.elF), hdF: sh(pose.hdF), elB: sh(pose.elB), hdB: sh(pose.hdB), head: sh(pose.head), smear: pose.smear?.map(sh) }
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
  if (p.prop === 'tripodBack') tripod(g, [p.hdB[0], p.hdB[1]], [p.hdB[0] - 16, p.hdB[1] + 8])
  g.limb(p.sh, p.elB, 4, hoodB); g.limb(p.elB, p.hdB, 4, hoodB)
  g.disc(p.hdB[0], p.hdB[1], 2, shade(c.skin, -0.08))
  // 몸통 (후드티)
  g.limb(p.hip, p.sh, 12, c.hoodie)
  g.limb([p.hip[0] - 1, p.hip[1] + 1], [p.hip[0] + 1, p.hip[1] + 1], 11, shade(c.hoodie, -0.06)) // 밑단
  const neck: P = [p.sh[0] + 1, p.sh[1] - 2]
  g.disc(neck[0] - 4, neck[1] + 1, 4, hoodB)                                       // 등 뒤 후드
  // 후드 끈 + 주머니
  const fx = p.sh[0] + 3
  g.line([fx, p.sh[1] - 1], [fx + (p.hip[0] - p.sh[0]) * 0.3, p.sh[1] + 5], c.strings, 2)
  g.line([fx + 2, p.sh[1] - 1], [fx + 2 + (p.hip[0] - p.sh[0]) * 0.3, p.sh[1] + 5], c.strings, 2)
  g.line([p.hip[0] - 1, p.hip[1] - 4], [p.hip[0] + 5, p.hip[1] - 4], shade(c.hoodie, -0.2), 2)
  // 앞쪽 다리
  g.limb(p.hip, p.knF, 5, c.pants); g.limb(p.knF, p.ftF, 5, c.pants)
  shoe(p.ftF, c.shoes, false)
  // 머리 (2등신: 몸보다 크게)
  const [hx, hy] = p.head
  g.round(hx - 11, hy - 9, 25, 21, c.skin, 6)
  g.rect(hx - 9, hy + 3, 3, 4, shade(c.skin, -0.08)); g.set(hx - 8, hy + 4, shade(c.skin, -0.22), 2); g.set(hx - 8, hy + 5, shade(c.skin, -0.22), 2)  // 귀
  // 머리카락 + 모자
  g.round(hx - 12, hy - 12, 26, 10, c.hair, 4)
  g.rect(hx - 12, hy - 5, 4, 8, c.hair)                                           // 뒷머리
  g.rect(hx + 10, hy - 4, 3, 2, c.hair); g.set(hx + 12, hy - 2, c.hair)            // 앞머리
  if (c.cap) {
    g.round(hx - 12, hy - 15, 26, 9, c.cap, 4)
    g.rect(hx + 9, hy - 8, 9, 3, shade(c.cap, -0.2))                              // 챙
    g.rect(hx - 12, hy - 8, 22, 1, shade(c.cap, -0.12))                          // 띠
    if (c.capLogo) g.rect(hx + 1, hy - 13, 4, 3, c.capLogo, 2)
  }
  g.set(hx - 2, hy - 17, c.hair); g.set(hx - 1, hy - 18, c.hair); g.set(hx, hy - 18, c.hair); g.set(hx + 1, hy - 17, c.hair); g.set(hx + 1, hy - 16, c.hair) // 삐침머리
  face(g, c, hx, hy, p.face ?? 'normal')
  // 앞쪽 팔
  g.limb(p.sh, p.elF, 4, c.hoodie); g.limb(p.elF, p.hdF, 4, c.hoodie)
  g.disc(p.hdF[0], p.hdF[1], 2, c.skin)
  // 장비
  switch (p.prop) {
    case 'cameraShoulder': camera(g, p.sh[0] + 4, p.sh[1] + 1); break
    case 'cameraHip': camera(g, p.hdF[0] + 3, p.hdF[1] + 1); break
    case 'cameraFront': camera(g, p.hdF[0] + 5, p.hdF[1] - 1); break
    case 'cameraUp': camera(g, p.hdF[0] + 1, p.hdF[1] - 5); break
    case 'cameraLow': camera(g, p.hdF[0] + 3, p.hdF[1] + 3); break
    case 'cameraFlash': camera(g, p.hdF[0] + 5, p.hdF[1] - 1); flashBurst(g, p.hdF[0] + 17, p.hdF[1] - 1); break
    case 'tripodOver': tripod(g, [p.hdF[0], p.hdF[1]], [p.hdF[0] - 8, p.hdF[1] - 20]); break
    case 'tripodFront': tripod(g, [p.hdF[0], p.hdF[1]], [p.hdF[0] + 22, p.hdF[1] + 3]); break
    case 'tripodLow': tripod(g, [p.hdF[0], p.hdF[1]], [p.hdF[0] + 20, p.hdF[1] + 12]); break
    case 'tripodUp': tripod(g, [p.hdF[0], p.hdF[1]], [p.hdF[0] + 6, p.hdF[1] - 22]); break
    case 'tripodSpinA': tripod(g, [p.hdF[0], p.hdF[1]], [p.hdF[0] + 22, p.hdF[1] - 6]); break
    case 'tripodSpinB': tripod(g, [p.hdB[0], p.hdB[1]], [p.hdB[0] - 22, p.hdB[1] - 4]); break
  }
  g.shadeAll()
  g.outline()
  // 휘두름 잔상 (외곽선 없이 반투명)
  const cv = document.createElement('canvas')
  cv.width = FW; cv.height = FH
  const ctx = cv.getContext('2d')!
  if (p.lie) { ctx.translate(FW / 2, FH - 3); ctx.rotate(-Math.PI / 2); ctx.translate(-FW + 18, -FW / 2 - 6) }
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
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const v = g.get(x, y)
    if (v) { ctx.fillStyle = v; ctx.fillRect(x, y, 1, 1) }
  }
  return cv
}

export function paintLightStandFalling(): HTMLCanvasElement {
  const g = new Grid()
  const base: P = [32, 72], h = 26
  g.limb(base, [base[0], base[1] - h], 2, '#8a93a6')
  g.limb(base, [base[0] - 6, base[1] + 2], 2, '#8a93a6'); g.limb(base, [base[0] + 6, base[1] + 2], 2, '#8a93a6')
  g.round(base[0] - 7, base[1] - h - 9, 14, 9, '#2d3038', 2)
  g.rect(base[0] - 9, base[1] - h - 9, 2, 9, '#1b1d23'); g.rect(base[0] + 7, base[1] - h - 9, 2, 9, '#1b1d23') // 반도어
  g.rect(base[0] - 5, base[1] - h - 1, 10, 2, '#fff3a0', )
  g.shadeAll(); g.outline()
  const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = 'rgba(255,243,160,0.25)'; ctx.beginPath(); ctx.moveTo(base[0] - 5, base[1] - h); ctx.lineTo(base[0] - 14, base[1] + 2); ctx.lineTo(base[0] + 14, base[1] + 2); ctx.lineTo(base[0] + 5, base[1] - h); ctx.fill()
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const v = g.get(x, y); if (v) { ctx.fillStyle = v; ctx.fillRect(x, y, 1, 1) } }
  return cv
}
