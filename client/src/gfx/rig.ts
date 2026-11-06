// 관절 자동 계산: 손·발·몸통만 적으면 팔꿈치·무릎을 채워 줍니다.
// 좌표: 64칸 기준, 발바닥 y=58, 오른쪽을 봄.
import type { Pose } from './Painter'
import type { AnimDef } from './poses'

export type V = [number, number]

function elbow(sh: V, hd: V): V {
  const vx = hd[0] - sh[0], vy = hd[1] - sh[1]
  const len = Math.hypot(vx, vy) || 1
  let px = -vy / len, py = vx / len
  if (py < 0) { px = -px; py = -py }
  if (Math.abs(py) < 0.35 && px > 0) px = -px
  return [Math.round((sh[0] + hd[0]) / 2 + px * 2), Math.round((sh[1] + hd[1]) / 2 + py * 2)]
}
const knee = (hip: V, ft: V): V => [Math.round((hip[0] + ft[0]) / 2 + 2), Math.round((hip[1] + ft[1]) / 2 - 1)]

/** 손·발·몸통만 적으면 나머지 관절을 채워 줌 */
export function mk(o: Partial<Pose>): Pose {
  const sh = o.sh ?? (o.head ? [o.head[0] - 1, o.head[1] + 15] as V : [32, 32] as V)
  const head = o.head ?? [sh[0] + 1, sh[1] - 15] as V
  const hip = o.hip ?? [sh[0] - 1, sh[1] + 11] as V
  const ftF = o.ftF ?? [37, 58] as V, ftB = o.ftB ?? [25, 58] as V
  const hdF = o.hdF ?? [39, 41] as V, hdB = o.hdB ?? [26, 39] as V
  return { prop: 'none', ...o, head, sh, hip, ftF, ftB, hdF, hdB, elF: o.elF ?? elbow(sh, hdF), elB: o.elB ?? elbow(sh, hdB), knF: o.knF ?? knee(hip, ftF), knB: o.knB ?? knee(hip, ftB) }
}
export const blink = (p: Pose): Pose => ({ ...p, face: 'blink' })
export const anim = (fps: number, loop: boolean, ...frames: Pose[]): AnimDef => ({ frames, fps, loop })
