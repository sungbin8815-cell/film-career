// 애니메이션 = 관절 좌표 프레임 모음. 64×64 칸, 발바닥 y≈62, 오른쪽을 봄.
// 새 캐릭터는 같은 포즈를 쓰고 의상(Costume)·장비(prop)만 바꿔도 됩니다.
// 공격 기술은 frames 순서: [준비, (준비2), 판정, 회수] — FightScene이 프레임 데이터에 맞춰 고릅니다.
import type { Pose } from './Painter'

type P2 = [number, number]
const base: Pose = {
  head: [33, 17], sh: [32, 32], hip: [31, 43],
  knF: [34, 50], ftF: [36, 58], knB: [28, 50], ftB: [26, 58],
  elF: [36, 35], hdF: [38, 39], elB: [27, 35], hdB: [26, 39],
  prop: 'cameraHip',
}
const P = (o: Partial<Pose>): Pose => ({ ...base, elF: [37, 37], hdF: [39, 41], ...o })
/** 상체 전체를 옮김 (숨쉬기·숙이기) */
export const up = (p: Pose, dx: number, dy: number): Pose => {
  const m = (q: P2): P2 => [q[0] + dx, q[1] + dy]
  return { ...p, head: m(p.head), sh: m(p.sh), hip: [p.hip[0] + dx * 0.5, p.hip[1] + dy], elF: m(p.elF), hdF: m(p.hdF), elB: m(p.elB), hdB: m(p.hdB) }
}
/** 몸 전체를 옮김 (점프·넉백) */
export const all = (p: Pose, dx: number, dy: number): Pose => {
  const m = (q: P2): P2 => [q[0] + dx, q[1] + dy]
  return { ...p, head: m(p.head), sh: m(p.sh), hip: m(p.hip), knF: m(p.knF), ftF: m(p.ftF), knB: m(p.knB), ftB: m(p.ftB), elF: m(p.elF), hdF: m(p.hdF), elB: m(p.elB), hdB: m(p.hdB) }
}

const stance = P({ ftF: [38, 58], knF: [36, 50], ftB: [24, 58], knB: [27, 50] })

export interface AnimDef { frames: Pose[]; fps: number; loop: boolean; /** 다른 캐릭터 장비로 그릴 때 (배우의 따라하기) */ kit?: string }

export const ANIMS: Record<string, AnimDef> = {
  idle: { frames: [stance, stance, up(stance, 0, 1), up({ ...stance, face: 'blink' }, 0, 1)], fps: 4, loop: true },
  walk: {
    frames: [
      P({ knF: [36, 49], ftF: [40, 58], knB: [27, 51], ftB: [22, 58] }),
      up(P({ knF: [33, 50], ftF: [33, 58], knB: [30, 50], ftB: [29, 58] }), 0, -1),
      P({ knF: [30, 51], ftF: [26, 58], knB: [33, 49], ftB: [38, 58] }),
      up(P({ knF: [32, 50], ftF: [31, 58], knB: [31, 50], ftB: [31, 58] }), 0, -1),
    ], fps: 9, loop: true,
  },
  run: {
    frames: [
      P({ head: [38, 18], sh: [35, 31], hip: [31, 42], elF: [40, 32], hdF: [39, 27], elB: [28, 36], hdB: [24, 39], knF: [37, 47], ftF: [43, 54], knB: [25, 50], ftB: [19, 54], face: 'focus' }),
      up(P({ head: [38, 17], sh: [35, 30], hip: [31, 41], elF: [40, 31], hdF: [39, 26], elB: [31, 35], hdB: [33, 38], knF: [32, 50], ftF: [30, 58], knB: [30, 48], ftB: [26, 53], face: 'focus' }), 0, -1),
      P({ head: [38, 18], sh: [35, 31], hip: [31, 42], elF: [40, 32], hdF: [39, 27], elB: [33, 37], hdB: [37, 39], knF: [25, 50], ftF: [19, 55], knB: [37, 47], ftB: [42, 54], face: 'focus' }),
      up(P({ head: [38, 17], sh: [35, 30], hip: [31, 41], elF: [40, 31], hdF: [39, 26], elB: [29, 35], hdB: [26, 38], knF: [30, 48], ftF: [27, 53], knB: [32, 50], ftB: [31, 58], face: 'focus' }), 0, -1),
    ], fps: 13, loop: true,
  },
  jump: {
    frames: [
      all(P({ knF: [37, 45], ftF: [35, 52], knB: [26, 46], ftB: [27, 53], elB: [24, 30], hdB: [21, 26], face: 'shout' }), 0, -2),
    ], fps: 1, loop: false,
  },
  fall: { frames: [P({ knF: [35, 50], ftF: [38, 57], knB: [28, 49], ftB: [24, 55], elF: [39, 26], hdF: [42, 21], elB: [24, 26], hdB: [20, 21], prop: 'none', face: 'shout' })], fps: 1, loop: false },
  crouch: { frames: [P({ head: [35, 27], sh: [33, 40], hip: [31, 49], knF: [39, 51], ftF: [38, 58], knB: [24, 53], ftB: [25, 58], elF: [38, 43], hdF: [37, 38], elB: [28, 45], hdB: [29, 49] })], fps: 1, loop: false },

  // ───── 기본기 ─────
  light: {
    frames: [
      P({ head: [32, 16], sh: [30, 30], elF: [30, 34], hdF: [32, 34], prop: 'cameraLow', face: 'focus', ftF: [38, 58] }),
      P({ head: [37, 16], sh: [35, 30], elF: [42, 32], hdF: [48, 31], prop: 'cameraFront', face: 'shout', knF: [38, 50], ftF: [42, 58], smear: [[34, 36], [42, 33], [54, 30]] }),
      P({ head: [35, 16], sh: [33, 30], elF: [39, 34], hdF: [43, 34], prop: 'cameraFront', face: 'angry', ftF: [40, 58] }),
    ], fps: 20, loop: false,
  },
  heavy: {
    frames: [
      P({ head: [30, 17], sh: [29, 31], elF: [27, 24], hdF: [25, 19], elB: [26, 26], hdB: [24, 21], prop: 'tripodOver', face: 'angry', ftB: [21, 58], knB: [25, 50] }),
      P({ head: [33, 16], sh: [32, 30], elF: [36, 22], hdF: [38, 17], elB: [33, 24], hdB: [36, 19], prop: 'tripodUp', face: 'shout', smear: [[16, 12], [28, 2], [44, 4]] }),
      P({ head: [38, 19], sh: [36, 32], elF: [42, 32], hdF: [46, 33], elB: [38, 34], hdB: [43, 35], prop: 'tripodFront', face: 'shout', knF: [39, 50], ftF: [44, 58], smear: [[46, 8], [60, 18], [62, 36]] }),
      P({ head: [36, 19], sh: [34, 32], elF: [39, 37], hdF: [41, 42], elB: [35, 38], hdB: [38, 43], prop: 'tripodLow', face: 'normal', knF: [38, 51], ftF: [42, 58] }),
    ], fps: 10, loop: false,
  },
  special1: {
    frames: [
      P({ head: [31, 21], sh: [30, 34], hip: [29, 45], knF: [35, 51], ftF: [38, 58], knB: [23, 53], ftB: [20, 58], face: 'angry' }),
      P({ head: [40, 21], sh: [37, 32], hip: [31, 42], elF: [42, 32], hdF: [41, 27], knF: [37, 48], ftF: [44, 55], knB: [24, 50], ftB: [17, 55], face: 'shout', smear: [[6, 30], [16, 32], [22, 34]] }),
      P({ head: [41, 21], sh: [38, 32], hip: [31, 42], elF: [43, 32], hdF: [42, 27], knF: [36, 50], ftF: [41, 58], knB: [24, 49], ftB: [18, 54], face: 'shout', smear: [[4, 26], [14, 30], [22, 32]] }),
    ], fps: 10, loop: false,
  },
  special2: {
    frames: [
      P({ elF: [37, 24], hdF: [39, 18], prop: 'cameraLow', face: 'happy' }),
      P({ head: [36, 16], sh: [34, 30], elF: [40, 27], hdF: [46, 24], prop: 'none', face: 'shout' }),
      P({ head: [35, 16], elF: [40, 30], hdF: [45, 29], elB: [29, 32], hdB: [31, 37], prop: 'none', face: 'happy' }),
    ], fps: 6, loop: false,
  },
  super: {
    frames: [
      P({ head: [40, 19], sh: [37, 31], elF: [42, 32], hdF: [46, 31], prop: 'cameraFront', knF: [38, 47], ftF: [44, 54], knB: [25, 50], ftB: [19, 54], face: 'shout', smear: [[2, 28], [14, 30], [24, 32]] }),
      P({ head: [40, 18], sh: [37, 30], elF: [42, 31], hdF: [46, 30], prop: 'cameraFront', knF: [26, 50], ftF: [20, 55], knB: [37, 47], ftB: [42, 54], face: 'shout', smear: [[2, 34], [14, 32], [24, 34]] }),
    ], fps: 14, loop: true,
  },

  // ───── 커맨드 콤보 기술 ─────
  upper: {
    frames: [
      P({ head: [34, 25], sh: [32, 37], hip: [30, 47], knF: [38, 51], ftF: [39, 58], knB: [24, 53], ftB: [24, 58], elF: [37, 43], hdF: [40, 47], elB: [33, 44], hdB: [37, 48], prop: 'tripodLow', face: 'focus' }),
      all(P({ head: [37, 13], sh: [35, 27], hip: [32, 39], elF: [40, 22], hdF: [42, 16], elB: [37, 24], hdB: [40, 18], knF: [36, 48], ftF: [37, 56], knB: [28, 48], ftB: [27, 56], prop: 'tripodUp', face: 'shout', smear: [[52, 54], [58, 34], [52, 6]] }), 0, -3),
      all(P({ head: [36, 13], sh: [34, 27], hip: [32, 39], elF: [38, 20], hdF: [40, 14], elB: [36, 22], hdB: [39, 16], knF: [37, 46], ftF: [35, 52], knB: [28, 47], ftB: [27, 54], prop: 'tripodUp', face: 'shout' }), 0, -5),
      P({ elF: [37, 33], hdF: [39, 37], prop: 'tripodLow', face: 'happy' }),
    ], fps: 10, loop: false,
  },
  spin: {
    frames: [
      P({ head: [36, 17], elF: [41, 32], hdF: [45, 32], prop: 'tripodSpinA', face: 'shout', smear: [[10, 18], [30, 4], [56, 14]] }),
      P({ head: [33, 17], elB: [24, 32], hdB: [20, 32], elF: [33, 33], hdF: [32, 36], prop: 'tripodSpinB', face: 'shout', smear: [[58, 30], [40, 44], [8, 36]] }),
    ], fps: 16, loop: true,
  },
  zoompunch: {
    frames: [
      P({ head: [29, 17], sh: [28, 31], elF: [26, 34], hdF: [24, 33], prop: 'cameraLow', face: 'focus', ftB: [20, 58], knB: [24, 50] }),
      P({ head: [41, 19], sh: [38, 31], elF: [46, 31], hdF: [53, 30], prop: 'cameraFront', face: 'shout', knF: [41, 49], ftF: [47, 57], knB: [26, 50], ftB: [18, 56], smear: [[4, 26], [20, 28], [40, 30]] }),
      P({ head: [38, 18], sh: [36, 31], elF: [42, 33], hdF: [47, 33], prop: 'cameraFront', face: 'angry', knF: [39, 50], ftF: [44, 58] }),
    ], fps: 12, loop: false,
  },
  flash: {
    frames: [
      P({ elF: [38, 27], hdF: [42, 24], prop: 'cameraFront', face: 'happy' }),
      P({ head: [36, 16], elF: [41, 28], hdF: [46, 26], prop: 'cameraFlash', face: 'happy' }),
      P({ elF: [38, 29], hdF: [42, 27], prop: 'cameraFront', face: 'happy' }),
    ], fps: 12, loop: false,
  },
  rush: {
    frames: [
      P({ head: [38, 18], sh: [35, 31], elF: [44, 31], hdF: [50, 30], elB: [29, 35], hdB: [27, 38], prop: 'none', face: 'shout', knF: [37, 50], ftF: [42, 58], smear: [[30, 30], [44, 29], [56, 29]] }),
      P({ head: [38, 18], sh: [35, 31], elF: [37, 35], hdF: [36, 38], elB: [42, 33], hdB: [49, 34], prop: 'none', face: 'angry', knF: [36, 50], ftF: [40, 58], smear: [[30, 36], [44, 34], [56, 34]] }),
      P({ head: [38, 17], sh: [35, 30], elF: [44, 26], hdF: [50, 22], elB: [29, 35], hdB: [27, 38], prop: 'none', face: 'shout', knF: [37, 50], ftF: [42, 58], smear: [[32, 34], [44, 26], [54, 18]] }),
    ], fps: 15, loop: true,
  },
  sweep: {
    frames: [
      P({ head: [33, 26], sh: [31, 38], hip: [29, 48], knF: [36, 52], ftF: [37, 58], knB: [23, 53], ftB: [23, 58], elF: [36, 44], hdF: [39, 48], prop: 'tripodLow', face: 'focus' }),
      P({ head: [30, 27], sh: [29, 39], hip: [29, 49], knF: [40, 55], ftF: [50, 58], knB: [23, 53], ftB: [22, 58], elF: [35, 45], hdF: [40, 50], elB: [26, 45], hdB: [22, 50], prop: 'tripodLow', face: 'shout', smear: [[34, 61], [48, 61], [62, 58]] }),
      P({ head: [32, 24], sh: [30, 36], hip: [29, 46], knF: [36, 51], ftF: [39, 58], knB: [23, 52], ftB: [23, 58], elF: [35, 41], hdF: [38, 45], prop: 'tripodLow', face: 'normal' }),
    ], fps: 10, loop: false,
  },

  // ───── 여러 캐릭터 공용 동작 ─────
  // 긴 장비로 앞 찌르기 (붐 마이크·메가폰·케이블)
  poke: {
    frames: [
      P({ head: [31, 17], sh: [30, 31], elF: [31, 34], hdF: [30, 33], prop: 'tripodFront', face: 'focus', ftB: [22, 58], knB: [26, 50] }),
      P({ head: [38, 18], sh: [36, 31], elF: [42, 32], hdF: [46, 32], elB: [37, 33], hdB: [41, 33], prop: 'tripodPoke', face: 'shout', knF: [40, 50], ftF: [45, 58], knB: [27, 50], ftB: [21, 58], smear: [[40, 30], [56, 30], [63, 30]] }),
      P({ head: [35, 17], sh: [33, 31], elF: [38, 34], hdF: [41, 34], prop: 'tripodFront', face: 'normal', ftF: [40, 58] }),
    ], fps: 12, loop: false,
  },
  // 위로 던지기 (대본·전구·페인트·파우더)
  throw: {
    frames: [
      P({ head: [30, 18], sh: [29, 31], elF: [25, 25], hdF: [22, 20], elB: [33, 34], hdB: [37, 35], prop: 'none', face: 'focus', ftB: [21, 58], knB: [25, 50] }),
      P({ head: [37, 17], sh: [35, 30], elF: [41, 25], hdF: [46, 22], elB: [29, 34], hdB: [25, 37], prop: 'none', face: 'shout', knF: [39, 50], ftF: [43, 58], smear: [[22, 14], [36, 8], [50, 16]] }),
      P({ head: [36, 18], sh: [34, 31], elF: [40, 34], hdF: [44, 38], prop: 'none', face: 'happy', ftF: [41, 58] }),
    ], fps: 10, loop: false,
  },
  // 온몸으로 터뜨리기 (음파·섬광·풀파워)
  burst: {
    frames: [
      P({ head: [33, 22], sh: [32, 35], hip: [31, 46], knF: [37, 51], ftF: [39, 58], knB: [25, 52], ftB: [23, 58], elF: [35, 40], hdF: [33, 43], elB: [29, 40], hdB: [31, 43], prop: 'none', face: 'focus' }),
      all(P({ head: [34, 15], sh: [33, 29], elF: [40, 24], hdF: [46, 19], elB: [26, 24], hdB: [20, 19], prop: 'fxFront', face: 'shout', knF: [37, 49], ftF: [40, 57], knB: [26, 49], ftB: [23, 57] }), 0, -1),
      P({ elF: [38, 31], hdF: [42, 30], elB: [27, 31], hdB: [24, 30], prop: 'none', face: 'happy' }),
    ], fps: 10, loop: false,
  },

  // ───── 공용: 점프 공격·3타·하단 잽 (장비는 캐릭터마다) ─────
  jl: {
    frames: [
      all(P({ knF: [37, 45], ftF: [35, 52], knB: [26, 46], ftB: [27, 53], elF: [33, 30], hdF: [32, 26], prop: 'cameraUp', face: 'focus' }), 0, -2),
      all(P({ head: [35, 18], knF: [37, 45], ftF: [36, 52], knB: [27, 47], ftB: [26, 53], elF: [40, 38], hdF: [44, 44], prop: 'cameraLow', face: 'shout', smear: [[36, 26], [46, 36], [50, 48]] }), 0, -2),
    ], fps: 12, loop: false,
  },
  jh: {
    frames: [
      all(P({ knF: [36, 44], ftF: [34, 51], knB: [27, 45], ftB: [27, 52], elF: [27, 24], hdF: [24, 18], elB: [26, 26], hdB: [24, 21], prop: 'tripodOver', face: 'angry' }), 0, -2),
      all(P({ head: [36, 19], knF: [38, 46], ftF: [40, 53], knB: [27, 47], ftB: [25, 54], elF: [41, 34], hdF: [45, 38], elB: [38, 35], hdB: [42, 39], prop: 'tripodLow', face: 'shout', smear: [[30, 4], [50, 14], [60, 40]] }), 0, -2),
      all(P({ knF: [37, 46], ftF: [38, 53], knB: [27, 47], ftB: [26, 54], elF: [39, 38], hdF: [42, 44], prop: 'tripodLow', face: 'angry' }), 0, -2),
    ], fps: 12, loop: false,
  },
  jab3: {
    frames: [
      P({ head: [30, 17], sh: [29, 31], elF: [27, 30], hdF: [25, 27], prop: 'cameraLow', face: 'focus', ftB: [21, 58], knB: [25, 50] }),
      P({ head: [39, 17], sh: [37, 31], elF: [44, 31], hdF: [50, 30], prop: 'cameraFront', face: 'shout', knF: [41, 50], ftF: [46, 58], knB: [26, 50], ftB: [20, 57], smear: [[24, 22], [40, 26], [56, 30]] }),
      P({ head: [37, 17], sh: [35, 31], elF: [41, 34], hdF: [45, 34], prop: 'cameraFront', face: 'angry', ftF: [43, 58] }),
    ], fps: 14, loop: false,
  },
  lowjab: {
    frames: [
      P({ head: [35, 27], sh: [33, 40], hip: [31, 49], knF: [39, 51], ftF: [38, 58], knB: [24, 53], ftB: [25, 58], elF: [36, 44], hdF: [37, 47], elB: [28, 45], hdB: [29, 49], prop: 'cameraLow', face: 'focus' }),
      P({ head: [37, 27], sh: [35, 40], hip: [31, 49], knF: [41, 51], ftF: [42, 58], knB: [24, 53], ftB: [24, 58], elF: [41, 47], hdF: [47, 52], elB: [29, 45], hdB: [30, 49], prop: 'cameraLow', face: 'shout', smear: [[38, 56], [50, 56], [58, 55]] }),
    ], fps: 16, loop: false,
  },

  // 촬영감독 고유: 렌즈 교체 (뒷손으로 렌즈를 돌려 끼움)
  trait: {
    frames: [
      P({ head: [33, 18], elF: [36, 36], hdF: [38, 34], elB: [33, 32], hdB: [40, 30], prop: 'cameraFront', face: 'focus' }),
      P({ head: [34, 18], elF: [36, 36], hdF: [38, 34], elB: [37, 28], hdB: [44, 26], prop: 'cameraFront', face: 'focus' }),
      P({ head: [34, 17], elF: [38, 27], hdF: [40, 22], elB: [30, 30], hdB: [33, 33], prop: 'cameraUp', face: 'happy' }),
    ], fps: 10, loop: false,
  },

  // ───── 피격·방어·결과 ─────
  hit: {
    frames: [
      P({ head: [28, 17], sh: [28, 31], hip: [30, 42], elF: [33, 33], hdF: [37, 30], elB: [23, 31], hdB: [19, 28], face: 'hurt', prop: 'none', ftF: [38, 58] }),
      P({ head: [27, 18], sh: [27, 32], hip: [30, 42], elF: [32, 30], hdF: [36, 26], elB: [22, 29], hdB: [18, 25], face: 'hurt', prop: 'none', ftF: [39, 58] }),
    ], fps: 10, loop: false,
  },
  knockback: {
    frames: [
      P({ head: [24, 19], sh: [27, 30], hip: [34, 38], knF: [41, 40], ftF: [47, 44], knB: [38, 44], ftB: [44, 49], elF: [30, 22], hdF: [33, 16], elB: [22, 27], hdB: [17, 23], face: 'hurt', prop: 'none' }),
      P({ head: [26, 26], sh: [29, 34], hip: [36, 36], knF: [42, 32], ftF: [46, 26], knB: [40, 38], ftB: [46, 36], elF: [32, 26], hdF: [36, 22], elB: [24, 36], hdB: [19, 39], face: 'hurt', prop: 'none' }),
    ], fps: 8, loop: true,
  },
  knockdown: { frames: [P({ face: 'hurt', prop: 'none', lie: true, elF: [39, 33], hdF: [44, 31] })], fps: 1, loop: false },
  guard: { frames: [P({ head: [31, 17], sh: [30, 31], elF: [37, 29], hdF: [37, 22], elB: [35, 34], hdB: [38, 29], prop: 'cameraUp', face: 'angry', ftF: [39, 58], knF: [36, 50], ftB: [23, 58] })], fps: 1, loop: false },
  victory: {
    frames: [
      P({ elF: [37, 21], hdF: [38, 12], elB: [27, 22], hdB: [26, 13], prop: 'cameraUp', face: 'happy' }),
      all(P({ elF: [37, 21], hdF: [38, 12], elB: [27, 22], hdB: [26, 13], prop: 'cameraUp', face: 'happy', knF: [36, 48], ftF: [35, 55], knB: [27, 49], ftB: [27, 56] }), 0, -4),
      P({ elF: [37, 21], hdF: [38, 12], elB: [27, 22], hdB: [26, 13], prop: 'cameraUp', face: 'happy' }),
      P({ elF: [40, 28], hdF: [44, 24], elB: [27, 22], hdB: [25, 14], prop: 'none', face: 'happy' }),
    ], fps: 5, loop: true,
  },
  defeat: {
    frames: [
      P({ head: [35, 30], sh: [33, 41], hip: [31, 52], knF: [38, 56], ftF: [40, 58], knB: [27, 60], ftB: [20, 58], elF: [37, 49], hdF: [36, 55], elB: [29, 49], hdB: [28, 55], face: 'sad', prop: 'none' }),
      P({ head: [35, 31], sh: [33, 42], hip: [31, 52], knF: [38, 56], ftF: [40, 58], knB: [27, 60], ftB: [20, 58], elF: [37, 49], hdF: [36, 55], elB: [29, 49], hdB: [28, 55], face: 'sad', prop: 'none' }),
    ], fps: 2, loop: true,
  },
}
