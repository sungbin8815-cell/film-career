// 측면 격투 도트 화가: 관절 좌표(포즈) + 의상(코스튬) → 48×64 픽셀 프레임.
// 외부 이미지 없이 코드로 그립니다. 실제 스프라이트 PNG가 생기면 TextureFactory에서 이 단계만 교체하면 됩니다.

export const FW = 48   // 프레임 가로
export const FH = 64   // 프레임 세로 (발바닥 y = 62)
const OUT = '#14101f'

type P = [number, number]

export interface Costume {
  skin: string
  hair: string
  cap?: string          // 모자 색 (없으면 머리카락)
  top: string           // 상의
  topDark: string
  vest?: string         // 조끼(촬영팀)
  pants: string
  shoes: string
  accent: string        // 캐릭터 고유색 포인트
}

export type Prop =
  | 'cameraShoulder' | 'cameraFront' | 'cameraUp' | 'cameraLow'
  | 'tripodBack' | 'tripodSwing' | 'tripodFront'
  | 'standPush' | 'none'

export type Face = 'normal' | 'shout' | 'hurt' | 'happy' | 'angry' | 'sad'

export interface Pose {
  hip: P; knF: P; ftF: P; knB: P; ftB: P
  sh: P; elF: P; hdF: P; elB: P; hdB: P
  head: P
  face?: Face
  prop?: Prop
  lie?: boolean          // 누운 자세(다운): 90도 회전
}

class Grid {
  px: (string | null)[] = new Array(FW * FH).fill(null)
  set(x: number, y: number, c: string) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < FW && y < FH) this.px[y * FW + x] = c }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < FW && y < FH ? this.px[y * FW + x] : null }
  rect(x: number, y: number, w: number, h: number, c: string) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c) }
  /** 두께 있는 선 (팔다리) */
  limb(a: P, b: P, w: number, c: string) {
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1)
    for (let i = 0; i <= steps; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / steps, y = a[1] + ((b[1] - a[1]) * i) / steps
      this.rect(Math.round(x - w / 2), Math.round(y - w / 2), w, w, c)
    }
  }
  outline() {
    const add: P[] = []
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      if (this.get(x, y)) continue
      if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) add.push([x, y])
    }
    for (const [x, y] of add) this.set(x, y, OUT)
  }
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)))
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// ───── 장비 ─────
function camera(g: Grid, x: number, y: number, dir: 1 | -1 = 1) {
  // 몸체 10×7, 렌즈 앞쪽, 위 손잡이, 뷰파인더
  g.rect(x - 5, y - 4, 10, 7, '#2b2d35')
  g.rect(x - 5, y - 4, 10, 1, '#4a4d57')
  g.rect(x + (dir > 0 ? 5 : -9), y - 3, 4, 5, '#1b1c22')
  g.rect(x + (dir > 0 ? 8 : -9), y - 2, 1, 3, '#7dd3fc')
  g.rect(x - 3, y - 6, 6, 1, '#4a4d57')
  g.set(x - 3, y - 5, '#4a4d57'); g.set(x + 2, y - 5, '#4a4d57')
  g.set(x - 2, y - 1, '#ef4444') // REC 불
}
function tripod(g: Grid, top: P, end: P) {
  const dx = end[0] - top[0], dy = end[1] - top[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  g.limb(top, end, 1, '#9ca3af')
  g.limb(top, [end[0] + nx * 4, end[1] + ny * 4], 1, '#9ca3af')
  g.limb(top, [end[0] - nx * 4, end[1] - ny * 4], 1, '#9ca3af')
  g.rect(top[0] - 2, top[1] - 1, 4, 3, '#374151')
}
function lightStand(g: Grid, base: P, h: number) {
  g.limb([base[0], base[1]], [base[0], base[1] - h], 1, '#6b7280')
  g.limb([base[0], base[1]], [base[0] - 4, base[1] + 2], 1, '#6b7280')
  g.limb([base[0], base[1]], [base[0] + 4, base[1] + 2], 1, '#6b7280')
  g.rect(base[0] - 4, base[1] - h - 5, 8, 5, '#374151')
  g.rect(base[0] - 3, base[1] - h - 1, 6, 1, '#fde68a')
}

// ───── 캐릭터 한 프레임 ─────
export function paint(c: Costume, p: Pose): HTMLCanvasElement {
  const g = new Grid()
  const pantsB = shade(c.pants, -0.12)
  const topB = c.topDark
  // 뒤쪽 팔·다리 (조금 어둡게)
  g.limb(p.hip, p.knB, 4, pantsB); g.limb(p.knB, p.ftB, 4, pantsB)
  g.rect(p.ftB[0] - 2, p.ftB[1] - 1, 6, 3, shade(c.shoes, -0.15))
  if (p.prop === 'tripodBack') tripod(g, [p.hdB[0], p.hdB[1]], [p.hdB[0] - 14, p.hdB[1] + 6])
  g.limb(p.sh, p.elB, 3, topB); g.limb(p.elB, p.hdB, 3, topB)
  g.rect(p.hdB[0] - 1, p.hdB[1] - 1, 3, 3, shade(c.skin, -0.1))
  // 몸통
  const torsoTop: P = [p.sh[0], p.sh[1]]
  g.limb(p.hip, torsoTop, 9, c.top)
  g.limb([p.hip[0] + 2, p.hip[1]], [torsoTop[0] + 2, torsoTop[1] + 2], 2, shade(c.top, -0.12))
  if (c.vest) { g.limb([p.hip[0] - 2, p.hip[1] - 1], [torsoTop[0] - 2, torsoTop[1] + 1], 4, c.vest); g.limb([p.hip[0] - 3, p.hip[1] - 4], [p.hip[0] + 3, p.hip[1] - 4], 1, shade(c.vest, 0.15)) }
  g.rect(p.hip[0] - 4, p.hip[1] - 1, 9, 2, '#1f2937') // 벨트
  // 앞쪽 다리
  g.limb(p.hip, p.knF, 4, c.pants); g.limb(p.knF, p.ftF, 4, c.pants)
  g.rect(p.ftF[0] - 2, p.ftF[1] - 1, 7, 3, c.shoes)
  g.rect(p.ftF[0] - 2, p.ftF[1] + 1, 7, 1, shade(c.shoes, -0.3))
  // 머리 (옆얼굴, 오른쪽을 봄)
  const [hx, hy] = p.head
  g.rect(hx - 4, hy - 4, 9, 9, c.skin)
  g.rect(hx + 5, hy - 1, 1, 2, c.skin)            // 코
  g.rect(hx - 4, hy - 5, 9, 3, c.hair)            // 머리카락
  g.rect(hx - 5, hy - 3, 2, 5, c.hair)
  g.rect(hx - 1, hy + 1, 2, 2, shade(c.skin, -0.12)) // 귀
  if (c.cap) { g.rect(hx - 5, hy - 7, 10, 3, c.cap); g.rect(hx + 3, hy - 4, 5, 1, shade(c.cap, -0.18)); g.set(hx - 1, hy - 6, c.accent) }
  const face = p.face ?? 'normal'
  const E = '#14101f'
  if (face === 'hurt') { g.set(hx + 2, hy - 1, E); g.set(hx + 3, hy, E); g.set(hx + 3, hy - 1, E); g.set(hx + 2, hy, E); g.rect(hx + 2, hy + 3, 3, 1, '#7f1d1d') }
  else if (face === 'shout') { g.rect(hx + 2, hy - 1, 2, 1, E); g.set(hx + 1, hy - 2, E); g.rect(hx + 2, hy + 2, 3, 2, '#7f1d1d'); g.set(hx + 3, hy + 2, '#fca5a5') }
  else if (face === 'happy') { g.set(hx + 2, hy - 1, E); g.set(hx + 3, hy - 2, E); g.set(hx + 4, hy - 1, E); g.rect(hx + 2, hy + 2, 3, 1, '#7f1d1d') }
  else if (face === 'angry') { g.rect(hx + 2, hy - 1, 2, 2, E); g.set(hx + 1, hy - 2, E); g.set(hx + 2, hy - 2, E); g.rect(hx + 2, hy + 3, 3, 1, E) }
  else if (face === 'sad') { g.rect(hx + 2, hy, 2, 1, E); g.rect(hx + 2, hy + 3, 2, 1, E); g.set(hx + 4, hy + 1, '#7dd3fc') }
  else { g.rect(hx + 2, hy - 1, 2, 2, E); g.rect(hx + 3, hy + 3, 2, 1, shade(c.skin, -0.3)) }
  g.set(hx + 1, hy + 1, '#f9a8a8')
  // 앞쪽 팔
  g.limb(p.sh, p.elF, 3, c.top); g.limb(p.elF, p.hdF, 3, c.top)
  g.rect(p.hdF[0] - 1, p.hdF[1] - 1, 3, 3, c.skin)
  // 들고 있는 장비
  switch (p.prop) {
    case 'cameraShoulder': camera(g, p.sh[0] + 1, p.sh[1] - 3); break
    case 'cameraFront': camera(g, p.hdF[0] + 4, p.hdF[1] - 1); break
    case 'cameraUp': camera(g, p.hdF[0], p.hdF[1] - 4); break
    case 'cameraLow': camera(g, p.hdF[0] + 3, p.hdF[1] + 2); break
    case 'tripodSwing': tripod(g, [p.hdF[0], p.hdF[1]], [p.hdF[0] + 4, p.hdF[1] - 18]); break
    case 'tripodFront': tripod(g, [p.hdF[0], p.hdF[1]], [p.hdF[0] + 18, p.hdF[1] + 2]); break
    case 'standPush': lightStand(g, [p.hdF[0] + 6, p.hdF[1] + 14], 18); break
  }
  g.outline()
  const cv = document.createElement('canvas')
  cv.width = FW; cv.height = FH
  const ctx = cv.getContext('2d')!
  if (p.lie) { ctx.translate(FW / 2, FH - 6); ctx.rotate(-Math.PI / 2); ctx.translate(-FW / 2 + 6, -FH + 26) }
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const v = g.get(x, y)
    if (v) { ctx.fillStyle = v; ctx.fillRect(x, y, 1, 1) }
  }
  return cv
}

// ───── 장비 단독 (투사체 등) ─────
export function paintLightStandFalling(): HTMLCanvasElement {
  const g = new Grid()
  lightStand(g, [24, 60], 26)
  g.outline()
  const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH
  const ctx = cv.getContext('2d')!
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const v = g.get(x, y); if (v) { ctx.fillStyle = v; ctx.fillRect(x, y, 1, 1) } }
  return cv
}
