// 애니메이션 프레임 = 관절 좌표 모음. 48×64 칸, 발바닥 y=62, 오른쪽을 봄.
// 새 캐릭터는 같은 포즈를 쓰고 의상(Costume)과 장비(prop)만 바꿔도 됩니다.
import type { Pose } from './Painter'

const base: Pose = {
  hip: [22, 42], knF: [25, 51], ftF: [26, 61], knB: [19, 51], ftB: [17, 61],
  sh: [23, 28], elF: [27, 34], hdF: [30, 38], elB: [19, 34], hdB: [20, 39],
  head: [24, 19], prop: 'cameraShoulder',
}
const P = (o: Partial<Pose>): Pose => ({ ...base, ...o })
const up = (p: Pose, d: number): Pose => ({
  ...p,
  hip: [p.hip[0], p.hip[1] + d], sh: [p.sh[0], p.sh[1] + d], head: [p.head[0], p.head[1] + d],
  elF: [p.elF[0], p.elF[1] + d], hdF: [p.hdF[0], p.hdF[1] + d], elB: [p.elB[0], p.elB[1] + d], hdB: [p.hdB[0], p.hdB[1] + d],
})

// 기본 자세: 카메라를 어깨에 메고 앞손으로 받침
const idle0 = P({ elF: [27, 30], hdF: [26, 25] })
const idle1 = up(idle0, 1)

export const ANIMS: Record<string, { frames: Pose[]; fps: number; loop: boolean }> = {
  idle: { frames: [idle0, idle1], fps: 3, loop: true },
  walk: {
    frames: [
      P({ elF: [27, 30], hdF: [26, 25], knF: [27, 50], ftF: [30, 61], knB: [18, 52], ftB: [14, 61] }),
      up(P({ elF: [27, 30], hdF: [26, 25], knF: [24, 51], ftF: [24, 61], knB: [21, 51], ftB: [20, 61] }), -1),
      P({ elF: [27, 30], hdF: [26, 25], knF: [21, 52], ftF: [17, 61], knB: [26, 50], ftB: [29, 61] }),
      up(P({ elF: [27, 30], hdF: [26, 25], knF: [23, 51], ftF: [22, 61], knB: [23, 51], ftB: [23, 61] }), -1),
    ], fps: 8, loop: true,
  },
  run: {
    frames: [
      P({ hip: [22, 41], sh: [26, 28], head: [28, 20], elF: [30, 30], hdF: [29, 25], knF: [29, 48], ftF: [34, 58], knB: [16, 50], ftB: [10, 56], elB: [18, 33], hdB: [15, 37] }),
      P({ hip: [22, 40], sh: [26, 27], head: [28, 19], elF: [30, 29], hdF: [29, 24], knF: [24, 50], ftF: [22, 61], knB: [22, 49], ftB: [18, 56], elB: [21, 32], hdB: [24, 36] }),
      P({ hip: [22, 41], sh: [26, 28], head: [28, 20], elF: [30, 30], hdF: [29, 25], knF: [16, 50], ftF: [11, 57], knB: [28, 48], ftB: [33, 58], elB: [24, 34], hdB: [28, 38] }),
      P({ hip: [22, 40], sh: [26, 27], head: [28, 19], elF: [30, 29], hdF: [29, 24], knF: [22, 49], ftF: [19, 56], knB: [24, 50], ftB: [23, 61], elB: [21, 32], hdB: [18, 36] }),
    ], fps: 12, loop: true,
  },
  jump: { frames: [P({ hip: [22, 38], knF: [28, 42], ftF: [26, 50], knB: [17, 44], ftB: [18, 52], sh: [23, 25], head: [24, 16], elF: [28, 26], hdF: [27, 21], elB: [17, 28], hdB: [14, 24] })], fps: 1, loop: false },
  fall: { frames: [P({ hip: [22, 38], knF: [26, 47], ftF: [28, 56], knB: [19, 47], ftB: [16, 55], sh: [23, 25], head: [24, 16], elF: [29, 22], hdF: [31, 17], elB: [16, 22], hdB: [13, 17], face: 'shout', prop: 'none' })], fps: 1, loop: false },
  crouch: { frames: [P({ hip: [22, 50], knF: [29, 53], ftF: [27, 61], knB: [16, 54], ftB: [17, 61], sh: [24, 38], head: [26, 29], elF: [29, 40], hdF: [28, 35], elB: [20, 43], hdB: [22, 47] })], fps: 1, loop: false },
  // 약: 카메라 손잡이로 쿡
  light: {
    frames: [
      P({ sh: [22, 28], head: [23, 19], elF: [24, 32], hdF: [27, 31], prop: 'cameraLow', face: 'angry' }),
      P({ sh: [25, 28], head: [27, 19], elF: [32, 31], hdF: [38, 30], prop: 'cameraFront', face: 'shout', knF: [28, 51], ftF: [31, 61] }),
      P({ sh: [24, 28], head: [25, 19], elF: [29, 32], hdF: [33, 32], prop: 'cameraFront', face: 'angry' }),
    ], fps: 20, loop: false,
  },
  // 강: 삼각대 휘두르기
  heavy: {
    frames: [
      P({ sh: [21, 28], head: [21, 19], elF: [20, 22], hdF: [17, 17], elB: [18, 24], hdB: [16, 18], prop: 'tripodSwing', face: 'angry', ftB: [14, 61] }),
      P({ sh: [26, 29], head: [29, 21], elF: [32, 30], hdF: [36, 31], elB: [28, 32], hdB: [33, 33], prop: 'tripodFront', face: 'shout', knF: [30, 50], ftF: [34, 61] }),
      P({ sh: [25, 30], head: [27, 22], elF: [30, 36], hdF: [32, 41], elB: [26, 36], hdB: [29, 42], prop: 'tripodFront', face: 'normal', knF: [29, 51], ftF: [33, 61] }),
    ], fps: 10, loop: false,
  },
  // 특수1: 숄더 어택 (카메라 메고 돌진)
  special1: {
    frames: [
      P({ hip: [20, 43], sh: [24, 31], head: [27, 23], knF: [26, 50], ftF: [30, 61], knB: [15, 52], ftB: [10, 61], prop: 'cameraShoulder', face: 'angry' }),
      P({ hip: [21, 42], sh: [28, 30], head: [31, 23], elF: [32, 31], hdF: [31, 26], knF: [28, 48], ftF: [34, 57], knB: [15, 50], ftB: [9, 58], prop: 'cameraShoulder', face: 'shout' }),
    ], fps: 10, loop: false,
  },
  // 특수2: 조명 낙하 (스탠드를 앞으로 밀어 넘어뜨림)
  special2: {
    frames: [
      P({ elF: [26, 22], hdF: [28, 16], prop: 'cameraLow', face: 'happy' }),
      P({ sh: [25, 28], head: [27, 19], elF: [31, 26], hdF: [36, 22], prop: 'none', face: 'shout' }),
    ], fps: 6, loop: false,
  },
  // 필살: 원테이크 (카메라를 앞으로 들고 달림)
  super: {
    frames: [
      P({ hip: [22, 41], sh: [27, 28], head: [29, 20], elF: [32, 29], hdF: [36, 28], knF: [29, 48], ftF: [34, 58], knB: [16, 50], ftB: [10, 56], prop: 'cameraFront', face: 'shout' }),
      P({ hip: [22, 40], sh: [27, 27], head: [29, 19], elF: [32, 28], hdF: [36, 27], knF: [16, 50], ftF: [11, 57], knB: [28, 48], ftB: [33, 58], prop: 'cameraFront', face: 'shout' }),
    ], fps: 14, loop: true,
  },
  hit: { frames: [P({ hip: [20, 42], sh: [17, 29], head: [15, 21], elF: [22, 33], hdF: [26, 30], elB: [13, 32], hdB: [10, 28], face: 'hurt', prop: 'none', ftF: [27, 61] })], fps: 1, loop: false },
  knockback: { frames: [P({ hip: [24, 36], knF: [31, 40], ftF: [36, 46], knB: [29, 44], ftB: [34, 50], sh: [17, 28], head: [13, 22], elF: [20, 20], hdF: [24, 15], elB: [12, 30], hdB: [8, 26], face: 'hurt', prop: 'none' })], fps: 1, loop: false },
  knockdown: { frames: [P({ face: 'hurt', prop: 'none', lie: true, elF: [28, 32], hdF: [33, 30] })], fps: 1, loop: false },
  guard: { frames: [P({ sh: [22, 29], head: [22, 20], elF: [28, 27], hdF: [28, 21], elB: [26, 32], hdB: [29, 28], prop: 'cameraUp', face: 'angry', ftF: [28, 61], ftB: [15, 61] })], fps: 1, loop: false },
  victory: {
    frames: [
      P({ elF: [27, 20], hdF: [28, 12], elB: [18, 22], hdB: [17, 14], prop: 'cameraUp', face: 'happy' }),
      up(P({ elF: [27, 20], hdF: [28, 12], elB: [18, 22], hdB: [17, 14], prop: 'cameraUp', face: 'happy' }), -2),
    ], fps: 4, loop: true,
  },
  defeat: { frames: [P({ hip: [22, 52], knF: [28, 56], ftF: [30, 61], knB: [18, 60], ftB: [12, 61], sh: [25, 39], head: [28, 32], elF: [29, 46], hdF: [28, 52], elB: [21, 46], hdB: [20, 52], face: 'sad', prop: 'none' })], fps: 1, loop: false },
}
