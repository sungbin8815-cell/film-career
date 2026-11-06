// 캐릭터 전용 동작. 촬영감독은 poses.ts의 기본 세트를 쓰고, 나머지 5명은 여기서 기술마다 자기 동작을 가집니다.
// 좌표: 64칸 기준, 발바닥 y=58, 오른쪽을 봄. mk()는 팔꿈치·무릎을 손·발 위치에서 자동으로 계산합니다.
// item.long = 앞손에서 긴 장비가 뻗는 방향, item.small = 한 손 장비, fx = 앞손 기준 특수 효과 위치
import type { Pose } from './Painter'
import { ANIMS, up, all, type AnimDef } from './poses'
import { CHARACTERS, KIT_OF } from '../config/characters'
import type { CharacterData, MoveData } from '../core/types'

import { mk, blink, anim, type V } from './rig'
import { motion } from './motions'

const idle4 = (p: Pose) => anim(4, true, p, p, up(p, 0, 1), up(blink(p), 0, 1))
/** 웅크린 몸통 */
const low = { sh: [32, 38] as V, head: [34, 23] as V, hip: [30, 48] as V }

// ───────────────────────── 연출감독: 슬레이트 + 메가폰, 손가락질하는 지휘형 ─────────────────────────
const D0 = mk({ hdF: [38, 36], item: { small: 'front', at: [2, 0] }, hdB: [29, 42], elB: [24, 37], ftF: [37, 58], ftB: [25, 58] })
const DIRECTOR: Record<string, AnimDef> = {
  idle: idle4(D0),
  guard: anim(1, false, mk({ hdF: [38, 26], item: { small: 'up', at: [1, -1] }, hdB: [34, 30], face: 'angry', ftF: [39, 58], ftB: [23, 58] })),
  victory: anim(5, true,
    mk({ hdF: [40, 24], item: { long: [12, -8] }, hdB: [36, 26], face: 'shout' }),
    all(mk({ hdF: [40, 22], item: { long: [12, -10] }, hdB: [36, 24], face: 'shout', ftF: [36, 55], ftB: [28, 56] }), 0, -4),
    mk({ hdF: [44, 12], hdB: [20, 14], face: 'happy' }),
    mk({ hdF: [42, 26], item: { small: 'flash' }, fx: [8, -4], hdB: [29, 42], elB: [24, 37], face: 'happy' }),
  ),
  // 약: 슬레이트를 내밀며 "딱!"
  light: anim(20, false,
    mk({ sh: [31, 32], hdF: [34, 28], item: { small: 'up' }, face: 'focus' }),
    mk({ sh: [35, 31], head: [37, 16], hdF: [47, 31], item: { small: 'flash', at: [3, 0] }, fx: [10, -1], ftF: [42, 58], face: 'shout', smear: [[36, 28], [46, 30], [55, 32]] }),
    mk({ sh: [33, 31], hdF: [43, 35], item: { small: 'front' }, face: 'angry' }),
  ),
  // 강: 메가폰을 야구 배트처럼
  heavy: anim(10, false,
    mk({ sh: [30, 32], hdF: [26, 26], hdB: [28, 28], item: { long: [-14, -10] }, ftB: [21, 58], face: 'angry' }),
    mk({ sh: [32, 31], hdF: [34, 22], hdB: [32, 24], item: { long: [8, -18] }, face: 'shout', smear: [[14, 14], [26, 4], [42, 4]] }),
    mk({ sh: [36, 32], head: [38, 18], hdF: [44, 32], hdB: [41, 33], item: { long: [22, 0] }, ftF: [44, 58], face: 'shout', smear: [[48, 8], [62, 22], [62, 36]] }),
    mk({ sh: [35, 32], hdF: [42, 38], hdB: [39, 38], item: { long: [16, 12] }, ftF: [42, 58] }),
  ),
  // 특: 메가폰에 대고 "컷!!"
  special1: anim(10, false,
    mk({ sh: [30, 31], head: [31, 16], hdF: [36, 24], hdB: [33, 25], item: { long: [10, -4] }, face: 'focus' }),
    mk({ sh: [35, 31], head: [37, 16], hdF: [42, 25], hdB: [39, 26], item: { long: [16, -2] }, fx: [24, -3], ftF: [43, 58], face: 'shout' }),
    mk({ sh: [33, 31], hdF: [40, 30], hdB: [36, 31], item: { long: [12, 4] }, face: 'angry' }),
  ),
  // ↓특: 대본을 옆으로 휙 (원반 던지기)
  special2: anim(10, false,
    mk({ sh: [31, 32], head: [31, 17], hdF: [25, 34], hdB: [28, 40], face: 'focus', ftB: [22, 58] }),
    mk({ sh: [35, 31], head: [37, 16], hdF: [48, 33], hdB: [24, 36], ftF: [43, 58], face: 'shout', smear: [[24, 34], [40, 35], [56, 33]] }),
    mk({ sh: [34, 32], hdF: [44, 38], hdB: [28, 40], face: 'happy' }),
  ),
  // 필살: 레디~ 액션! 손가락질 + 슬레이트 난타 (반복)
  super: anim(14, true,
    mk({ sh: [36, 31], head: [38, 16], hdF: [48, 28], item: { small: 'flash' }, fx: [10, -2], hdB: [26, 34], ftF: [42, 56], ftB: [20, 56], face: 'shout', smear: [[34, 26], [46, 26], [58, 28]] }),
    mk({ sh: [36, 31], head: [38, 16], hdF: [46, 38], item: { small: 'front' }, hdB: [46, 30], ftF: [26, 56], ftB: [40, 56], face: 'angry', smear: [[34, 40], [48, 38], [58, 36]] }),
  ),
  // 약약강: NG 어퍼 (메가폰 올려치기)
  upper: anim(10, false,
    mk({ ...low, hdF: [38, 46], hdB: [35, 46], item: { long: [12, 6] }, ftF: [38, 58], ftB: [24, 58], face: 'focus' }),
    all(mk({ sh: [35, 27], hdF: [40, 18], hdB: [38, 20], item: { long: [4, -20] }, ftF: [37, 56], ftB: [28, 56], face: 'shout', smear: [[50, 52], [56, 32], [48, 4]] }), 0, -3),
    all(mk({ sh: [34, 27], hdF: [38, 14], hdB: [36, 16], item: { long: [-2, -20] }, ftF: [36, 54], ftB: [29, 55], face: 'shout' }), 0, -5),
    mk({ hdF: [40, 34], item: { long: [12, 6] }, face: 'happy' }),
  ),
  // 약강강: "오케이 컷!" 슬레이트 내려찍기
  zoompunch: anim(10, false,
    all(mk({ sh: [31, 30], head: [32, 15], hdF: [34, 14], hdB: [31, 15], item: { small: 'up', at: [1, -2] }, ftF: [36, 56], ftB: [27, 57], face: 'shout' }), 0, -2),
    mk({ sh: [37, 35], head: [40, 21], hip: [33, 45], hdF: [48, 46], hdB: [45, 44], item: { small: 'flash', at: [2, 0] }, fx: [6, 4], ftF: [44, 58], ftB: [22, 58], face: 'angry', smear: [[40, 8], [54, 24], [54, 46]] }),
    mk({ sh: [36, 34], hip: [32, 45], hdF: [46, 48], item: { small: 'front' }, ftF: [43, 58], ftB: [23, 58] }),
  ),
  // 강강: 메가폰 들고 한 바퀴
  spin: anim(16, true,
    mk({ hdF: [48, 30], item: { long: [16, -2] }, hdB: [24, 36], face: 'shout', smear: [[10, 18], [30, 4], [60, 20]] }),
    mk({ hdB: [18, 30], item: { long: [-16, -2], from: 'B' }, hdF: [36, 36], face: 'shout', smear: [[60, 34], [40, 44], [6, 34]] }),
  ),
  // 약약특: 머리 위에서 슬레이트 플래시
  flash: anim(12, false,
    mk({ hdF: [37, 22], item: { small: 'up' }, face: 'happy' }),
    all(mk({ hdF: [38, 14], hdB: [30, 16], item: { small: 'flash', at: [1, -2] }, fx: [2, -12], face: 'shout' }), 0, -1),
    mk({ hdF: [40, 28], item: { small: 'front' }, face: 'happy' }),
  ),
  // 약강특: 디렉션 폭풍 (양손 번갈아 손가락질 + 슬레이트)
  rush: anim(15, true,
    mk({ sh: [35, 31], hdF: [48, 26], hdB: [28, 36], ftF: [42, 58], face: 'shout', smear: [[36, 26], [50, 24], [58, 24]] }),
    mk({ sh: [35, 31], hdF: [36, 36], hdB: [48, 32], ftF: [42, 58], face: 'angry', smear: [[36, 34], [50, 32], [58, 32]] }),
    mk({ sh: [35, 31], hdF: [47, 40], item: { small: 'front' }, ftF: [42, 58], face: 'shout', smear: [[38, 40], [50, 40], [58, 40]] }),
  ),
  // ↓강: 발 맞춰! (발로 쓸기)
  sweep: anim(10, false,
    mk({ ...low, hdF: [36, 46], item: { small: 'hip' }, ftF: [38, 58], ftB: [23, 58], face: 'focus' }),
    mk({ sh: [27, 40], head: [28, 25], hip: [28, 50], ftF: [50, 58], ftB: [22, 58], hdF: [34, 50], hdB: [20, 50], face: 'shout', smear: [[34, 60], [48, 60], [60, 57]] }),
    mk({ ...low, hdF: [36, 46], item: { small: 'hip' }, ftF: [38, 58], ftB: [23, 58] }),
  ),
  // 고유: 바닥에 마킹 테이프 붙이기
  trait: anim(10, false,
    mk({ ...low, hdF: [42, 54], hdB: [36, 52], face: 'focus', ftF: [38, 58], ftB: [24, 58] }),
    mk({ ...low, hdF: [48, 57], hdB: [38, 56], face: 'happy', ftF: [38, 58], ftB: [24, 58] }),
    mk({ hdF: [42, 30], hdB: [29, 42], elB: [24, 37], face: 'happy' }),
  ),
  // W: NG! 받아치기 자세 (메가폰을 가로로 들고 노려봄)
  parry: anim(10, false,
    mk({ sh: [31, 32], hdF: [38, 26], hdB: [32, 28], item: { long: [-2, -16] }, face: 'angry', ftF: [39, 58], ftB: [23, 58] }),
    mk({ sh: [31, 32], hdF: [38, 25], hdB: [32, 27], item: { long: [-2, -16] }, fx: [6, -4], face: 'shout', ftF: [39, 58], ftB: [23, 58] }),
  ),
  // 고유2: "위치로!" 순간이동 (팔 벌리고 착지)
  trait2: anim(10, false,
    mk({ hdF: [46, 28], hdB: [18, 28], face: 'shout' }),
    mk({ ...low, hdF: [44, 40], hdB: [20, 40], face: 'angry', ftF: [40, 58], ftB: [22, 58] }),
  ),
}

// ───────────────────────── 사운드감독: 녹음기 + 붐 마이크, 머리 위로 붐을 드는 붐맨 자세 ─────────────────────────
const S0 = mk({ sh: [31, 32], hdF: [39, 19], hdB: [30, 20], item: { long: [16, -3] }, ftF: [37, 58], ftB: [24, 58] })
const SOUND: Record<string, AnimDef> = {
  idle: idle4(S0),
  guard: anim(1, false, mk({ hdF: [40, 34], hdB: [36, 26], item: { long: [1, -18] }, face: 'angry', ftF: [39, 58], ftB: [23, 58] })),
  victory: anim(5, true,
    mk({ hdF: [38, 20], hdB: [24, 18], item: { long: [2, -20] }, face: 'happy' }),
    all(mk({ hdF: [38, 18], hdB: [24, 16], item: { long: [2, -20] }, face: 'happy', ftF: [36, 55], ftB: [28, 56] }), 0, -4),
    mk({ hdF: [38, 20], hdB: [24, 18], item: { long: [2, -20] }, face: 'shout' }),
    mk({ hdF: [40, 30], item: { small: 'up' }, hdB: [24, 18], face: 'happy' }),
  ),
  // 약: 붐 찌르기
  light: anim(12, false,
    mk({ sh: [30, 32], hdF: [33, 30], hdB: [27, 30], item: { long: [14, -1] }, ftB: [22, 58], face: 'focus' }),
    mk({ sh: [36, 31], head: [38, 17], hdF: [44, 29], hdB: [39, 30], item: { long: [18, 0] }, ftF: [44, 58], face: 'shout', smear: [[44, 26], [58, 26], [63, 26]] }),
    mk({ sh: [34, 31], hdF: [41, 31], hdB: [36, 32], item: { long: [16, -1] }, ftF: [41, 58] }),
  ),
  // 강: 세운 붐을 앞으로 내려찍기
  heavy: anim(10, false,
    mk({ hdF: [36, 16], hdB: [32, 18], item: { long: [2, -20] }, face: 'angry' }),
    mk({ hdF: [38, 16], hdB: [33, 18], item: { long: [14, -14] }, face: 'focus', smear: [[34, 2], [48, 4], [60, 16]] }),
    mk({ sh: [36, 33], head: [38, 19], hdF: [44, 32], hdB: [40, 32], item: { long: [18, 12] }, ftF: [44, 58], face: 'shout', smear: [[58, 10], [64, 28], [62, 44]] }),
    mk({ sh: [35, 33], hdF: [42, 34], hdB: [38, 34], item: { long: [16, 10] }, ftF: [42, 58] }),
  ),
  // 특: 하울링 (붐을 겨누고 헤드폰 눌러 증폭)
  special1: anim(10, false,
    mk({ hdF: [40, 28], item: { long: [16, -2] }, hdB: [22, 18], face: 'focus' }),
    mk({ sh: [34, 31], head: [36, 16], hdF: [42, 27], item: { long: [17, -1] }, fx: [26, -2], hdB: [22, 17], ftF: [41, 58], face: 'shout' }),
    mk({ hdF: [40, 29], item: { long: [16, -1] }, hdB: [24, 22], face: 'angry' }),
  ),
  // ↓특: "조용히!!" — 쉿 하고 숨을 모았다가 터뜨리기
  special2: anim(10, false,
    mk({ sh: [32, 36], head: [33, 21], hdF: [37, 26], hdB: [28, 34], item: { long: [-4, -18], from: 'B' }, face: 'focus' }),
    all(mk({ hdF: [46, 22], hdB: [20, 22], fx: [6, 2], face: 'shout', ftF: [40, 57], ftB: [23, 57] }), 0, -1),
    mk({ hdF: [40, 34], hdB: [28, 38], face: 'angry' }),
  ),
  // 필살: 헤드폰 움켜쥐고 레벨 최대 (반복)
  super: anim(12, true,
    mk({ sh: [31, 31], head: [31, 16], hdF: [36, 12], hdB: [22, 14], fx: [10, 8], face: 'shout', ftF: [39, 58], ftB: [22, 58] }),
    all(mk({ sh: [31, 31], head: [31, 16], hdF: [36, 12], hdB: [22, 14], fx: [16, 10], face: 'shout', ftF: [39, 58], ftB: [22, 58] }), 1, 0),
  ),
  // 약약강: 붐 퍼올리기 (몸을 뒤로 젖히며 아래에서 위로)
  upper: anim(10, false,
    mk({ sh: [33, 34], head: [36, 20], hdF: [42, 40], hdB: [38, 40], item: { long: [18, 12] }, ftF: [40, 58], ftB: [24, 58], face: 'focus' }),
    mk({ sh: [29, 32], head: [27, 17], hip: [31, 43], hdF: [38, 30], hdB: [34, 30], item: { long: [16, -14] }, ftF: [40, 58], ftB: [24, 58], face: 'shout', smear: [[58, 56], [64, 34], [56, 10]] }),
    mk({ sh: [28, 31], head: [26, 16], hip: [31, 43], hdF: [34, 20], hdB: [31, 22], item: { long: [6, -20] }, ftF: [40, 58], ftB: [24, 58], face: 'shout' }),
    S0,
  ),
  // 약강강: 털뭉치(윈드스크린)로 들이받기
  zoompunch: anim(12, false,
    mk({ sh: [30, 32], hdF: [32, 30], hdB: [27, 31], item: { long: [12, 0] }, ftB: [21, 58], face: 'focus' }),
    mk({ sh: [38, 32], head: [40, 18], hdF: [48, 30], hdB: [43, 30], item: { long: [18, 0] }, ftF: [47, 58], ftB: [20, 58], face: 'shout', smear: [[30, 28], [50, 28], [64, 28]] }),
    mk({ sh: [36, 32], hdF: [45, 32], hdB: [40, 32], item: { long: [17, 1] }, ftF: [44, 58], face: 'angry' }),
  ),
  // 강강: 머리 위 헬리콥터 회전
  spin: anim(16, true,
    mk({ hdF: [40, 16], hdB: [30, 18], item: { long: [18, -2] }, face: 'shout', smear: [[8, 10], [30, 2], [60, 8]] }),
    mk({ hdF: [36, 16], hdB: [30, 18], item: { long: [-20, -2] }, face: 'shout', smear: [[60, 14], [34, 20], [4, 14]] }),
  ),
  // 약약특: 녹음기 피드백 노이즈
  flash: anim(12, false,
    mk({ hdF: [38, 26], item: { small: 'up', at: [0, -2] }, hdB: [30, 30], face: 'happy' }),
    mk({ hdF: [42, 20], item: { small: 'flash' }, fx: [6, -6], hdB: [30, 28], face: 'shout' }),
    mk({ hdF: [40, 28], item: { small: 'front' }, face: 'happy' }),
  ),
  // 약강특: 음파 난타 (높낮이 바꿔 연속 찌르기)
  rush: anim(15, true,
    mk({ hdF: [44, 24], hdB: [39, 25], item: { long: [18, -3] }, ftF: [42, 58], face: 'shout', smear: [[44, 20], [58, 20], [64, 20]] }),
    mk({ hdF: [44, 32], hdB: [39, 33], item: { long: [18, 1] }, ftF: [42, 58], face: 'angry', smear: [[44, 30], [58, 30], [64, 30]] }),
    mk({ hdF: [44, 28], hdB: [39, 29], item: { long: [18, -1] }, fx: [26, -2], ftF: [42, 58], face: 'shout' }),
  ),
  // ↓강: 케이블 걸기 (붐을 바닥에 쓸기)
  sweep: anim(10, false,
    mk({ ...low, hdF: [38, 46], hdB: [34, 46], item: { long: [14, 10] }, ftF: [38, 58], ftB: [24, 58], face: 'focus' }),
    mk({ ...low, hdF: [42, 48], hdB: [37, 48], item: { long: [20, 9] }, ftF: [40, 58], ftB: [22, 58], face: 'shout', smear: [[40, 58], [56, 58], [64, 57]] }),
    mk({ ...low, hdF: [38, 46], hdB: [34, 46], item: { long: [14, 10] }, ftF: [38, 58], ftB: [24, 58] }),
  ),
  // E: SOUND OVER (웅크렸다가 붐을 치켜들고 온몸으로 방출)
  trait: anim(10, false,
    mk({ ...low, hdF: [36, 44], hdB: [30, 44], item: { long: [10, 8] }, face: 'focus', ftF: [40, 58], ftB: [22, 58] }),
    all(mk({ sh: [31, 30], head: [30, 15], hdF: [38, 12], hdB: [24, 14], item: { long: [4, -20] }, fx: [12, 14], face: 'shout', ftF: [42, 57], ftB: [20, 57] }), 0, -1),
    mk({ hdF: [40, 30], hdB: [28, 30], item: { long: [14, 2] }, face: 'happy', ftF: [40, 58], ftB: [22, 58] }),
  ),
  // 고유2: 플레이백 (녹음기를 내밀어 재생)
  trait2: anim(10, false,
    mk({ hdF: [40, 28], item: { small: 'up' }, hdB: [22, 18], face: 'focus' }),
    mk({ sh: [35, 31], head: [37, 16], hdF: [47, 28], item: { small: 'flash' }, fx: [10, -2], hdB: [22, 17], ftF: [43, 58], face: 'shout' }),
    mk({ hdF: [42, 30], item: { small: 'front' }, hdB: [24, 22], face: 'happy' }),
  ),
}

// ───────────────────────── 조명감독: LED 패널 + C스탠드, 넓은 자세의 힘캐 ─────────────────────────
const wide = { ftF: [40, 58] as V, ftB: [22, 58] as V }
const G0 = mk({ ...wide, hip: [31, 44], hdF: [41, 40], item: { long: [2, -26] }, hdB: [27, 40] })
const GAFFER: Record<string, AnimDef> = {
  idle: idle4(G0),
  guard: anim(1, false, mk({ ...wide, hdF: [40, 26], item: { small: 'front', at: [2, 0] }, hdB: [36, 30], face: 'angry' })),
  victory: anim(4, true,
    mk({ ...wide, hdF: [42, 22], elF: [45, 28], hdB: [22, 22], elB: [19, 28], face: 'happy' }),
    mk({ ...wide, hdF: [42, 21], elF: [46, 27], hdB: [22, 21], elB: [18, 27], face: 'shout' }),
    mk({ ...wide, hdF: [38, 14], item: { small: 'flash', at: [1, -3] }, fx: [1, -12], hdB: [30, 16], face: 'happy' }),
    mk({ ...wide, hdF: [38, 14], item: { small: 'up', at: [1, -3] }, hdB: [30, 16], face: 'happy' }),
  ),
  // 약: LED 패널로 정권 지르기
  light: anim(18, false,
    mk({ ...wide, hdF: [36, 34], item: { small: 'front' }, face: 'focus' }),
    mk({ ...wide, sh: [35, 32], head: [37, 17], hdF: [47, 32], item: { small: 'front', at: [3, 0] }, ftF: [43, 58], face: 'shout', smear: [[38, 30], [50, 30], [58, 30]] }),
    mk({ ...wide, sh: [34, 32], hdF: [43, 35], item: { small: 'front' }, face: 'angry' }),
  ),
  // 강: C스탠드 크게 휘두르기
  heavy: anim(9, false,
    mk({ ...wide, sh: [30, 33], hdF: [26, 22], hdB: [28, 24], item: { long: [-12, -14] }, ftB: [20, 58], face: 'angry' }),
    mk({ ...wide, hdF: [34, 16], hdB: [32, 18], item: { long: [6, -22] }, face: 'shout', smear: [[12, 10], [28, 0], [46, 2]] }),
    mk({ ...wide, sh: [37, 33], head: [39, 19], hdF: [46, 30], hdB: [42, 31], item: { long: [20, 6] }, ftF: [46, 58], face: 'shout', smear: [[50, 6], [64, 22], [64, 42]] }),
    mk({ ...wide, sh: [36, 34], hdF: [44, 38], hdB: [40, 38], item: { long: [18, 14] }, ftF: [44, 58] }),
  ),
  // 특: 케이블 채찍
  special1: anim(10, false,
    mk({ ...wide, hdF: [24, 20], hdB: [28, 38], face: 'focus', smear: [[20, 20], [14, 24], [10, 30]] }),
    mk({ ...wide, sh: [35, 32], head: [37, 17], hdF: [46, 30], hdB: [26, 36], face: 'shout', smear: [[44, 30], [52, 28], [58, 30], [63, 34]] }),
    mk({ ...wide, hdF: [44, 36], hdB: [26, 38], face: 'angry', smear: [[44, 36], [52, 42], [60, 44]] }),
  ),
  // ↓특: 전구 볼링 던지기
  special2: anim(10, false,
    mk({ ...wide, ...low, hdF: [26, 46], hdB: [36, 46], face: 'focus' }),
    mk({ ...wide, sh: [35, 31], head: [37, 16], hdF: [46, 30], hdB: [26, 38], face: 'shout', smear: [[30, 48], [40, 44], [50, 32]] }),
    mk({ ...wide, hdF: [44, 28], hdB: [26, 38], face: 'happy' }),
  ),
  // 필살: 풀 파워!! (LED를 머리 위로)
  super: anim(10, false,
    mk({ ...wide, ...low, hdF: [36, 42], hdB: [28, 42], face: 'focus' }),
    all(mk({ ...wide, hdF: [37, 12], hdB: [30, 14], item: { small: 'flash', at: [1, -3] }, fx: [1, -12], face: 'shout' }), 0, -1),
    mk({ ...wide, hdF: [40, 30], item: { small: 'front' }, face: 'happy' }),
  ),
  // 약약강: 스탠드 어퍼
  upper: anim(10, false,
    mk({ ...wide, ...low, hdF: [40, 44], hdB: [36, 44], item: { long: [14, 8] }, face: 'focus' }),
    all(mk({ ...wide, sh: [35, 28], hdF: [40, 22], hdB: [37, 24], item: { long: [6, -22] }, face: 'shout', smear: [[54, 52], [58, 30], [50, 2]] }), 0, -2),
    all(mk({ ...wide, sh: [34, 28], hdF: [38, 20], hdB: [35, 22], item: { long: [-2, -22] }, face: 'shout' }), 0, -3),
    G0,
  ),
  // 약강강: 백열등 강타 (LED를 들고 돌진)
  zoompunch: anim(12, false,
    mk({ ...wide, sh: [30, 32], hdF: [27, 30], item: { small: 'front' }, ftB: [20, 58], face: 'focus' }),
    mk({ ...wide, sh: [38, 32], head: [40, 18], hdF: [50, 30], item: { small: 'flash', at: [2, 0] }, fx: [12, -1], ftF: [46, 58], face: 'shout', smear: [[30, 28], [48, 28], [60, 30]] }),
    mk({ ...wide, sh: [36, 32], hdF: [46, 34], item: { small: 'front' }, ftF: [44, 58], face: 'angry' }),
  ),
  // 강강: 허리 높이로 스탠드 돌리기
  spin: anim(14, true,
    mk({ ...wide, hdF: [46, 32], item: { long: [18, -4] }, hdB: [26, 36], face: 'shout', smear: [[8, 26], [30, 14], [62, 24]] }),
    mk({ ...wide, hdB: [20, 32], item: { long: [-18, -4], from: 'B' }, hdF: [36, 36], face: 'shout', smear: [[62, 38], [36, 46], [4, 38]] }),
  ),
  // 약약특: HMI 섬광 (두 손으로 패널을 내밀어)
  flash: anim(12, false,
    mk({ ...wide, hdF: [40, 30], item: { small: 'front' }, face: 'focus' }),
    mk({ ...wide, hdF: [44, 26], hdB: [36, 30], item: { small: 'flash' }, fx: [10, -2], face: 'shout' }),
    mk({ ...wide, hdF: [42, 30], item: { small: 'front' }, face: 'happy' }),
  ),
  // 약강특: 전압 러시 (장갑 주먹 연타)
  rush: anim(15, true,
    mk({ ...wide, hdF: [48, 30], hdB: [30, 34], face: 'shout', smear: [[38, 30], [50, 30], [58, 30]] }),
    mk({ ...wide, hdF: [36, 34], hdB: [48, 32], face: 'angry', smear: [[38, 32], [50, 32], [58, 32]] }),
    mk({ ...wide, hdF: [48, 38], hdB: [32, 32], face: 'shout', smear: [[40, 38], [52, 38], [60, 38]] }),
  ),
  // ↓강: 바닥 구르기 (발을 쾅 굴러 바닥 충격파)
  sweep: anim(10, false,
    mk({ sh: [31, 31], head: [32, 16], hip: [30, 42], ftF: [38, 44], ftB: [24, 58], hdF: [40, 30], hdB: [22, 30], face: 'focus' }),
    mk({ ...low, ftF: [42, 58], ftB: [22, 58], hdF: [44, 44], hdB: [20, 44], face: 'shout', smear: [[34, 59], [50, 59], [64, 58]] }),
    mk({ ...low, ftF: [42, 58], ftB: [22, 58], hdF: [40, 44], hdB: [24, 44], face: 'angry' }),
  ),
  // 고유: 조명 스탠드를 땅에 꽂기
  trait: anim(9, false,
    mk({ ...wide, hdF: [40, 24], hdB: [36, 26], item: { long: [2, -22] }, face: 'focus' }),
    mk({ ...wide, ...low, hdF: [44, 42], hdB: [40, 42], item: { long: [0, 14] }, face: 'shout' }),
    mk({ ...wide, hdF: [42, 22], elF: [45, 28], hdB: [27, 40], face: 'happy' }),
  ),
}

// ───────────────────────── 미술감독: 망치 + 페인트 롤러, 어깨에 망치 메고 다니는 공격형 ─────────────────────────
const A0 = mk({ hdF: [36, 27], item: { small: 'up', at: [0, -1] }, hdB: [27, 40], ftF: [37, 58], ftB: [25, 58] })
const ART: Record<string, AnimDef> = {
  idle: idle4(A0),
  guard: anim(1, false, mk({ hdF: [40, 30], hdB: [34, 34], item: { long: [-6, -18] }, face: 'angry', ftF: [39, 58], ftB: [23, 58] })),
  victory: anim(5, true,
    mk({ hdF: [37, 14], hdB: [30, 16], item: { long: [8, -14] }, face: 'happy' }),
    all(mk({ hdF: [37, 12], hdB: [30, 14], item: { long: [8, -14] }, face: 'happy', ftF: [36, 55], ftB: [28, 56] }), 0, -4),
    mk({ hdF: [40, 20], item: { small: 'up' }, hdB: [27, 40], face: 'shout' }),
    mk({ hdF: [42, 28], item: { small: 'flash' }, fx: [8, -6], hdB: [27, 40], face: 'happy' }),
  ),
  // 약: 망치 콩!
  light: anim(18, false,
    mk({ hdF: [36, 18], item: { small: 'up' }, face: 'focus' }),
    mk({ sh: [35, 32], head: [37, 17], hdF: [46, 32], item: { small: 'front', at: [2, -1] }, ftF: [42, 58], face: 'shout', smear: [[38, 14], [50, 20], [54, 32]] }),
    mk({ sh: [34, 32], hdF: [44, 36], item: { small: 'front' }, face: 'angry' }),
  ),
  // 강: 롤러 휘두르기
  heavy: anim(10, false,
    mk({ sh: [30, 32], hdF: [27, 24], hdB: [29, 26], item: { long: [-12, -12] }, ftB: [21, 58], face: 'angry' }),
    mk({ hdF: [34, 17], hdB: [32, 19], item: { long: [6, -20] }, face: 'shout', smear: [[12, 12], [28, 2], [46, 4]] }),
    mk({ sh: [36, 33], head: [38, 19], hdF: [45, 31], hdB: [41, 32], item: { long: [20, 8] }, ftF: [44, 58], face: 'shout', smear: [[50, 8], [64, 24], [62, 42]] }),
    mk({ sh: [35, 33], hdF: [43, 38], hdB: [39, 38], item: { long: [16, 14] }, ftF: [42, 58] }),
  ),
  // 특: 세트 조립 돌진 (롤러를 창처럼)
  special1: anim(12, false,
    mk({ sh: [31, 35], head: [32, 20], hip: [29, 46], hdF: [36, 38], hdB: [32, 40], item: { long: [14, 2] }, ftB: [20, 58], face: 'angry' }),
    mk({ sh: [39, 33], head: [42, 20], hip: [32, 43], hdF: [46, 36], hdB: [41, 37], item: { long: [18, 2] }, ftF: [45, 55], ftB: [18, 55], face: 'shout', smear: [[4, 30], [16, 32], [24, 34]] }),
    mk({ sh: [39, 33], head: [42, 20], hip: [32, 43], hdF: [46, 36], hdB: [41, 37], item: { long: [18, 2] }, ftF: [30, 55], ftB: [40, 56], face: 'shout', smear: [[2, 34], [14, 34], [22, 36]] }),
  ),
  // ↓특: 페인트 통 던지기
  special2: anim(10, false,
    mk({ sh: [31, 32], head: [31, 17], hdF: [24, 20], hdB: [30, 40], ftB: [22, 58], face: 'focus' }),
    mk({ sh: [35, 31], head: [37, 16], hdF: [46, 24], hdB: [26, 38], ftF: [43, 58], face: 'shout', smear: [[24, 14], [38, 8], [52, 18]] }),
    mk({ sh: [34, 32], hdF: [44, 36], hdB: [28, 40], face: 'happy' }),
  ),
  // 필살: 세트 철거!! (망치 내려치기 연타)
  super: anim(14, true,
    mk({ sh: [35, 31], hdF: [40, 14], item: { small: 'up' }, hdB: [30, 36], ftF: [42, 58], face: 'shout' }),
    mk({ sh: [36, 33], hdF: [48, 36], item: { small: 'front' }, hdB: [30, 38], ftF: [43, 58], face: 'angry', smear: [[42, 12], [52, 22], [54, 36]] }),
    mk({ sh: [35, 32], hdF: [46, 24], item: { small: 'flash' }, fx: [8, 0], hdB: [30, 36], ftF: [42, 58], face: 'shout' }),
  ),
  // 약약강: 망치 점프 어퍼 (뛰어오르며 망치로 올려치기)
  upper: anim(10, false,
    mk({ ...low, hdF: [36, 48], item: { small: 'low' }, ftF: [38, 58], ftB: [24, 58], face: 'focus' }),
    all(mk({ sh: [35, 29], head: [37, 14], hdF: [44, 16], item: { small: 'up', at: [1, -2] }, hdB: [26, 34], ftF: [38, 50], ftB: [30, 54], face: 'shout', smear: [[46, 50], [50, 32], [46, 10]] }), 0, -6),
    all(mk({ sh: [34, 30], hdF: [40, 12], item: { small: 'up', at: [0, -2] }, hdB: [26, 34], ftF: [36, 52], ftB: [29, 55], face: 'happy' }), 0, -7),
    A0,
  ),
  // 약강강: 대못 박기 (점프해서 망치로 쾅)
  zoompunch: anim(10, false,
    all(mk({ hdF: [36, 10], hdB: [32, 12], item: { small: 'up', at: [0, -2] }, ftF: [36, 52], ftB: [28, 52], face: 'shout' }), 0, -4),
    mk({ sh: [36, 36], head: [38, 22], hip: [32, 46], hdF: [48, 50], hdB: [44, 48], item: { small: 'flash', at: [2, 0] }, fx: [4, 6], ftF: [43, 58], ftB: [23, 58], face: 'angry', smear: [[40, 6], [50, 22], [50, 50]] }),
    mk({ sh: [35, 35], hip: [32, 46], hdF: [46, 52], item: { small: 'front' }, ftF: [42, 58], ftB: [23, 58] }),
  ),
  // 강강: 롤러 회전
  spin: anim(16, true,
    mk({ hdF: [46, 30], item: { long: [18, -2] }, hdB: [24, 36], face: 'shout', smear: [[10, 20], [30, 6], [60, 20]] }),
    mk({ hdB: [18, 30], item: { long: [-18, -2], from: 'B' }, hdF: [36, 36], face: 'shout', smear: [[60, 34], [40, 44], [6, 34]] }),
  ),
  // 약약특: 페인트 폭탄 (롤러를 튕겨 물감 뿌리기)
  flash: anim(12, false,
    mk({ hdF: [40, 40], hdB: [36, 40], item: { long: [14, 10] }, face: 'focus' }),
    mk({ hdF: [40, 22], hdB: [36, 24], item: { long: [10, -16] }, fx: [12, -16], face: 'shout', smear: [[54, 48], [56, 28], [52, 8]] }),
    mk({ hdF: [40, 30], hdB: [36, 32], item: { long: [14, -4] }, face: 'happy' }),
  ),
  // 약강특: 연속 망치질
  rush: anim(16, true,
    mk({ sh: [35, 31], hdF: [46, 24], item: { small: 'up' }, ftF: [42, 58], face: 'shout', smear: [[40, 16], [48, 18], [54, 24]] }),
    mk({ sh: [35, 32], hdF: [48, 36], item: { small: 'front' }, ftF: [42, 58], face: 'angry', smear: [[44, 22], [52, 30], [54, 38]] }),
    mk({ sh: [35, 31], hdF: [46, 30], item: { small: 'flash' }, fx: [8, -2], ftF: [42, 58], face: 'shout' }),
  ),
  // ↓강: 바닥 칠하기
  sweep: anim(10, false,
    mk({ ...low, hdF: [38, 46], hdB: [34, 46], item: { long: [14, 10] }, ftF: [38, 58], ftB: [24, 58], face: 'focus' }),
    mk({ ...low, hdF: [42, 48], hdB: [37, 48], item: { long: [22, 9] }, ftF: [40, 58], ftB: [22, 58], face: 'shout', smear: [[40, 58], [56, 58], [64, 57]] }),
    mk({ ...low, hdF: [38, 46], hdB: [34, 46], item: { long: [14, 10] }, ftF: [38, 58], ftB: [24, 58] }),
  ),
  // 고유: 세트벽 세우기 (판을 잡고 망치질)
  trait: anim(10, false,
    mk({ hdF: [40, 18], item: { small: 'up' }, hdB: [44, 34], face: 'focus', ftF: [40, 58] }),
    mk({ sh: [35, 32], hdF: [48, 30], item: { small: 'front' }, fx: [6, -2], hdB: [44, 36], face: 'shout', ftF: [42, 58] }),
    mk({ hdF: [42, 20], item: { small: 'up' }, hdB: [44, 34], face: 'happy', ftF: [40, 58] }),
  ),
}

// ───────────────────────── 분장실장: 헤어스프레이 + 대형 브러시, 가볍게 춤추듯 ─────────────────────────
const narrow = { ftF: [38, 58] as V, ftB: [29, 58] as V }
const M0 = mk({ ...narrow, sh: [32, 32], hip: [32, 43], hdF: [40, 30], item: { long: [4, -14] }, hdB: [27, 42], elB: [24, 37] })
const MAKEUP: Record<string, AnimDef> = {
  idle: anim(4, true, M0, up(M0, 1, 0), up(M0, 1, 1), up(blink(M0), 0, 1)),
  guard: anim(1, false, mk({ ...narrow, hdF: [38, 28], item: { long: [-8, -12] }, hdB: [34, 32], face: 'angry' })),
  victory: anim(5, true,
    mk({ ...narrow, hdF: [40, 22], item: { long: [6, -12] }, hdB: [27, 42], elB: [24, 37], face: 'happy' }),
    mk({ ...narrow, hdF: [44, 20], item: { long: [10, -10] }, fx: [14, -14], hdB: [27, 42], elB: [24, 37], face: 'happy' }),
    all(mk({ ...narrow, hdF: [42, 18], hdB: [22, 20], face: 'happy', ftB: [30, 50] }), 0, -3),
    mk({ ...narrow, hdF: [40, 30], item: { long: [4, -14] }, hdB: [27, 42], elB: [24, 37], face: 'blink' }),
  ),
  // 약: 퍼프 톡 (브러시 끝으로 콕)
  light: anim(22, false,
    mk({ ...narrow, hdF: [36, 32], item: { long: [8, -4] }, face: 'focus' }),
    mk({ ...narrow, sh: [35, 31], head: [37, 16], hdF: [46, 30], item: { long: [12, -2] }, ftF: [42, 58], face: 'happy', smear: [[42, 28], [54, 28], [60, 28]] }),
    mk({ ...narrow, hdF: [42, 32], item: { long: [8, -4] } }),
  ),
  // 강: 브러시 크게 쓸기
  heavy: anim(12, false,
    mk({ ...narrow, hdF: [28, 24], item: { long: [-10, -10] }, face: 'focus' }),
    mk({ ...narrow, hdF: [36, 18], item: { long: [6, -16] }, face: 'shout', smear: [[16, 14], [30, 4], [46, 6]] }),
    mk({ ...narrow, sh: [36, 32], head: [38, 18], hdF: [46, 32], item: { long: [18, 6] }, ftF: [43, 58], face: 'shout', smear: [[50, 8], [62, 22], [62, 38]] }),
    mk({ ...narrow, hdF: [42, 38], item: { long: [14, 12] } }),
  ),
  // 특: 헤어스프레이 칙칙
  special1: anim(10, false,
    mk({ ...narrow, hdF: [40, 30], item: { small: 'front' }, face: 'focus' }),
    mk({ ...narrow, sh: [34, 32], hdF: [46, 28], item: { small: 'flash' }, fx: [10, -1], face: 'happy' }),
    mk({ ...narrow, sh: [34, 32], hdF: [46, 28], item: { small: 'flash' }, fx: [14, 0], face: 'shout' }),
  ),
  // ↓특: 손바닥 파우더 불기
  special2: anim(10, false,
    mk({ ...narrow, hdF: [40, 24], hdB: [27, 42], face: 'focus' }),
    mk({ ...narrow, sh: [35, 31], head: [37, 16], hdF: [45, 24], fx: [8, -2], hdB: [27, 42], face: 'shout' }),
    mk({ ...narrow, hdF: [42, 30], hdB: [27, 42], face: 'happy' }),
  ),
  // 필살: 풀메이크업!! (춤추듯 브러시 난타, 반복)
  super: anim(16, true,
    mk({ ...narrow, sh: [35, 31], hdF: [48, 26], item: { long: [12, -6] }, ftF: [42, 56], ftB: [24, 57], face: 'happy', smear: [[40, 22], [54, 20], [62, 24]] }),
    mk({ ...narrow, sh: [35, 31], hdF: [46, 36], item: { long: [12, 6] }, ftF: [30, 57], ftB: [40, 56], face: 'shout', smear: [[42, 40], [56, 42], [62, 38]] }),
    mk({ ...narrow, sh: [35, 31], hdF: [44, 30], item: { long: [10, 0] }, fx: [16, 0], ftF: [42, 56], ftB: [26, 57], face: 'happy' }),
  ),
  // 약약강: 하이킥 어퍼 (다리를 차올리며 브러시도 함께)
  upper: anim(11, false,
    mk({ ...narrow, ...low, hdF: [40, 44], item: { long: [12, 6] }, face: 'focus' }),
    mk({ sh: [30, 31], head: [29, 16], hip: [31, 43], ftF: [48, 28], knF: [42, 36], ftB: [28, 58], hdF: [24, 30], item: { long: [-10, -8] }, hdB: [36, 36], face: 'shout', smear: [[44, 56], [54, 40], [52, 20]] }),
    all(mk({ sh: [31, 30], head: [31, 15], hip: [31, 42], ftF: [42, 24], knF: [40, 32], ftB: [29, 56], hdF: [42, 18], item: { long: [2, -14] }, hdB: [22, 30], face: 'happy' }), 0, -2),
    M0,
  ),
  // 약강강: 컬링 스트라이크 (몸을 틀었다가 찌르기)
  zoompunch: anim(12, false,
    mk({ ...narrow, sh: [30, 32], head: [30, 17], hdF: [28, 30], item: { long: [-10, 0] }, face: 'focus' }),
    mk({ ...narrow, sh: [38, 32], head: [40, 17], hdF: [50, 30], item: { long: [16, 0] }, ftF: [46, 58], ftB: [24, 58], face: 'shout', smear: [[24, 28], [44, 28], [64, 28]] }),
    mk({ ...narrow, sh: [36, 32], hdF: [46, 32], item: { long: [12, 2] }, ftF: [44, 58] }),
  ),
  // 강강: 한 발 들고 빙글
  spin: anim(16, true,
    mk({ ...narrow, hdF: [46, 24], item: { long: [14, -6] }, hdB: [22, 24], ftB: [30, 50], face: 'happy', smear: [[10, 16], [30, 4], [60, 16]] }),
    mk({ ...narrow, hdB: [20, 26], item: { long: [-14, -6], from: 'B' }, hdF: [44, 26], ftF: [36, 50], face: 'happy', smear: [[60, 30], [40, 40], [6, 30]] }),
  ),
  // 약약특: 반짝 펄 (머리 위 하이라이터)
  flash: anim(12, false,
    mk({ ...narrow, hdF: [38, 16], item: { long: [4, -12] }, face: 'happy' }),
    all(mk({ ...narrow, hdF: [40, 12], item: { long: [4, -12] }, fx: [4, -16], hdB: [24, 20], face: 'happy' }), 0, -1),
    mk({ ...narrow, hdF: [40, 26], item: { long: [6, -10] }, face: 'happy' }),
  ),
  // 약강특: 메이크업 러시 (양손 번갈아 톡톡)
  rush: anim(18, true,
    mk({ ...narrow, sh: [35, 31], hdF: [48, 28], item: { long: [10, -4] }, hdB: [30, 36], ftF: [42, 58], face: 'happy', smear: [[40, 28], [52, 28], [60, 28]] }),
    mk({ ...narrow, sh: [35, 31], hdF: [38, 34], hdB: [48, 32], ftF: [42, 58], face: 'shout', smear: [[40, 34], [52, 32], [58, 32]] }),
    mk({ ...narrow, sh: [35, 31], hdF: [48, 36], item: { long: [10, 2] }, hdB: [32, 34], ftF: [42, 58], face: 'happy', smear: [[40, 38], [52, 38], [60, 36]] }),
  ),
  // ↓강: 쓸어담기 (낮게 브러시 쓸기)
  sweep: anim(11, false,
    mk({ ...narrow, ...low, hdF: [38, 46], item: { long: [12, 8] }, face: 'focus' }),
    mk({ ...narrow, ...low, hdF: [42, 48], item: { long: [18, 8] }, ftF: [42, 58], face: 'shout', smear: [[40, 58], [54, 58], [62, 57]] }),
    mk({ ...narrow, ...low, hdF: [38, 46], item: { long: [12, 8] } }),
  ),
  // 고유: "완성!" 손가락 튕기기
  trait: anim(10, false,
    mk({ ...narrow, hdF: [40, 30], item: { long: [4, -14] }, hdB: [36, 32], face: 'focus' }),
    mk({ ...narrow, hdF: [44, 18], fx: [4, -6], hdB: [27, 42], elB: [24, 37], face: 'happy' }),
    mk({ ...narrow, hdF: [42, 26], hdB: [27, 42], elB: [24, 37], face: 'happy' }),
  ),
}

// ───────────────────────── 배우: 소품 칼 + 대본, 폼 잡는 연기파 (펜싱 자세) ─────────────────────────
const C0 = mk({ sh: [32, 32], hdF: [38, 34], item: { long: [10, -12] }, hdB: [27, 41], elB: [24, 36], ftF: [39, 58], ftB: [24, 58] })
const ACTOR: Record<string, AnimDef> = {
  idle: anim(4, true, C0, C0, up(C0, 0, 1), up(blink(C0), 0, 1)),
  guard: anim(1, false, mk({ hdF: [38, 30], item: { long: [2, -18] }, hdB: [33, 34], face: 'angry', ftF: [39, 58], ftB: [23, 58] })),
  victory: anim(4, true,
    mk({ hdF: [40, 20], item: { long: [4, -18] }, hdB: [27, 41], elB: [24, 36], face: 'happy' }),
    mk({ sh: [33, 34], head: [36, 21], hdF: [42, 34], item: { long: [14, 6] }, hdB: [24, 30], face: 'blink' }),
    mk({ sh: [33, 34], head: [36, 21], hdF: [42, 34], item: { long: [14, 6] }, hdB: [24, 30], face: 'happy' }),
    mk({ hdF: [40, 24], item: { small: 'up' }, fx: [6, -8], hdB: [27, 41], elB: [24, 36], face: 'happy' }),
  ),
  // 약: 펜싱 찌르기
  light: anim(20, false,
    mk({ sh: [31, 32], hdF: [35, 34], item: { long: [12, -2] }, hdB: [24, 28], ftB: [22, 58], face: 'focus' }),
    mk({ sh: [36, 32], head: [38, 17], hdF: [46, 31], item: { long: [16, 0] }, hdB: [22, 26], ftF: [45, 58], ftB: [21, 58], face: 'shout', smear: [[44, 30], [58, 30], [63, 30]] }),
    mk({ sh: [34, 32], hdF: [42, 33], item: { long: [14, -1] }, hdB: [24, 28], ftF: [42, 58], face: 'angry' }),
  ),
  // 강: 사선 베기
  heavy: anim(10, false,
    mk({ sh: [30, 32], hdF: [28, 18], hdB: [30, 22], item: { long: [-8, -14] }, ftB: [21, 58], face: 'angry' }),
    mk({ hdF: [38, 18], hdB: [34, 20], item: { long: [14, -12] }, face: 'shout', smear: [[20, 4], [40, 2], [58, 12]] }),
    mk({ sh: [36, 33], head: [38, 19], hdF: [44, 34], hdB: [40, 34], item: { long: [16, 12] }, ftF: [44, 58], face: 'shout', smear: [[58, 14], [64, 34], [56, 52]] }),
    mk({ sh: [35, 33], hdF: [42, 40], item: { long: [14, 14] }, ftF: [42, 58] }),
  ),
  // Q 기본: 마임 펀치 (보이지 않는 주먹)
  special1: anim(12, false,
    mk({ sh: [30, 32], hdF: [30, 32], hdB: [26, 30], face: 'focus', ftB: [21, 58] }),
    mk({ sh: [38, 32], head: [40, 18], hdF: [50, 30], hdB: [28, 34], fx: [8, 0], ftF: [46, 58], ftB: [20, 58], face: 'shout', smear: [[28, 28], [44, 28], [58, 30]] }),
    mk({ sh: [36, 32], hdF: [46, 32], hdB: [28, 36], ftF: [44, 58], face: 'happy' }),
  ),
  // W 기본: 스턴트 구르기 (몸을 말고 앞으로 데굴)
  special2: anim(14, true,
    mk({ sh: [33, 44], head: [37, 34], hip: [28, 50], hdF: [38, 52], hdB: [30, 52], ftF: [34, 58], ftB: [24, 56], face: 'focus' }),
    mk({ sh: [30, 46], head: [32, 40], hip: [34, 48], hdF: [28, 54], hdB: [36, 54], ftF: [40, 50], ftB: [36, 56], face: 'shout' }),
  ),
  // E: 즉흥 연기 (턱 괴고 관찰 → 손가락 딱)
  trait: anim(10, false,
    mk({ hdF: [36, 28], hdB: [30, 38], item: { long: [10, -12], from: 'B' }, face: 'focus' }),
    mk({ hdF: [44, 22], fx: [4, -6], hdB: [27, 41], elB: [24, 36], face: 'happy' }),
    mk({ hdF: [42, 30], item: { small: 'front' }, hdB: [27, 41], elB: [24, 36], face: 'happy' }),
  ),
  // R 기본(상대 필살이 없을 때): 칼 난무
  super: anim(14, true,
    mk({ sh: [36, 31], hdF: [46, 24], item: { long: [14, -8] }, ftF: [42, 56], ftB: [22, 56], face: 'shout', smear: [[34, 18], [50, 14], [62, 22]] }),
    mk({ sh: [36, 31], hdF: [46, 38], item: { long: [14, 8] }, ftF: [28, 56], ftB: [40, 56], face: 'angry', smear: [[36, 44], [52, 46], [62, 38]] }),
  ),
  jab3: anim(14, false,
    mk({ sh: [30, 32], hdF: [26, 26], item: { long: [-10, -8] }, ftB: [21, 58], face: 'focus' }),
    mk({ sh: [37, 32], head: [39, 18], hdF: [48, 30], item: { long: [16, 2] }, ftF: [46, 58], face: 'shout', smear: [[22, 18], [44, 24], [64, 30]] }),
    mk({ sh: [35, 32], hdF: [44, 34], item: { long: [14, 4] }, ftF: [43, 58], face: 'angry' }),
  ),
  upper: anim(10, false,
    mk({ ...low, hdF: [38, 46], item: { long: [14, 6] }, ftF: [38, 58], ftB: [24, 58], face: 'focus' }),
    all(mk({ sh: [35, 28], hdF: [42, 20], item: { long: [6, -18] }, face: 'shout', smear: [[52, 52], [58, 30], [50, 4]] }), 0, -3),
    all(mk({ sh: [34, 28], hdF: [40, 14], item: { long: [0, -18] }, face: 'happy', ftB: [30, 52] }), 0, -5),
    C0,
  ),
  zoompunch: anim(12, false,
    mk({ sh: [29, 33], head: [29, 18], hdF: [28, 32], item: { long: [12, -2] }, ftB: [20, 58], face: 'focus' }),
    mk({ sh: [40, 33], head: [43, 19], hip: [33, 43], hdF: [52, 30], item: { long: [16, 0] }, ftF: [48, 58], ftB: [18, 58], face: 'shout', smear: [[20, 30], [42, 30], [64, 30]] }),
    mk({ sh: [37, 33], hdF: [47, 32], item: { long: [15, 1] }, ftF: [45, 58], face: 'angry' }),
  ),
  spin: anim(16, true,
    mk({ hdF: [48, 28], item: { long: [16, -2] }, hdB: [24, 34], face: 'shout', smear: [[10, 16], [32, 4], [62, 18]] }),
    mk({ hdB: [18, 28], item: { long: [-16, -2], from: 'B' }, hdF: [36, 34], face: 'shout', smear: [[62, 34], [40, 44], [4, 34]] }),
  ),
  flash: anim(12, false,
    mk({ hdF: [38, 24], item: { small: 'up' }, face: 'happy' }),
    mk({ hdF: [44, 18], fx: [2, -6], hdB: [22, 22], face: 'happy', ftB: [30, 52] }),
    mk({ hdF: [40, 28], item: { long: [10, -12] }, face: 'blink' }),
  ),
  rush: anim(16, true,
    mk({ sh: [35, 31], hdF: [48, 26], item: { long: [14, -6] }, ftF: [42, 58], face: 'shout', smear: [[40, 22], [54, 20], [62, 24]] }),
    mk({ sh: [35, 31], hdF: [48, 36], item: { long: [14, 6] }, ftF: [42, 58], face: 'angry', smear: [[40, 40], [54, 42], [62, 38]] }),
    mk({ sh: [35, 31], hdF: [48, 31], item: { long: [16, 0] }, ftF: [42, 58], face: 'shout', smear: [[40, 31], [56, 31], [64, 31]] }),
  ),
  sweep: anim(10, false,
    mk({ ...low, hdF: [38, 46], item: { long: [12, 8] }, ftF: [38, 58], ftB: [24, 58], face: 'focus' }),
    mk({ ...low, hdF: [42, 50], item: { long: [20, 6] }, ftF: [42, 58], ftB: [22, 58], face: 'shout', smear: [[40, 58], [56, 58], [64, 57]] }),
    mk({ ...low, hdF: [38, 46], item: { long: [12, 8] }, ftF: [38, 58], ftB: [24, 58] }),
  ),
}

export const CHAR_ANIMS: Record<string, Record<string, AnimDef>> = { director: DIRECTOR, sound: SOUND, gaffer: GAFFER, art: ART, makeup: MAKEUP, actor: ACTOR }

/** 기술이 쓰는 동작 이름 (anim이 없으면 칸에 맞는 기본 동작) */
export function animOf(m: MoveData): string {
  if (m.anim) return m.anim
  const [slot] = m.id.split('~')
  const [btn, dir] = slot.split('_')
  if (dir === 'air' || dir === 'aird') return btn === 'A' ? 'jl' : 'jh'
  if (dir === 'd') return btn === 'A' ? 'lowjab' : 'sweep'
  if (dir === 'u') return 'upper'
  if (dir === 'dash') return 'rush'
  return ({ A: 'light', B: 'heavy', C: 'special1', D: 'trait', R: 'super' } as Record<string, string>)[btn] ?? 'light'
}

/** 그 캐릭터의 기본 동작 세트 + 기술에서 쓰는 과장 동작 템플릿 */
function ownAnims(c: CharacterData): Record<string, AnimDef> {
  const out: Record<string, AnimDef> = { ...ANIMS, ...(CHAR_ANIMS[c.id] ?? {}) }
  for (const m of Object.values(c.moves)) {
    const a = m.anim
    if (a?.startsWith('t:') && !out[a]) { const d = motion(a); if (d) out[a] = d }
  }
  return out
}

/** 배우가 따라 할 수 있는 다른 캐릭터 동작: "캐릭터:동작" 이름, 그 캐릭터 장비로 그림 */
function copyAnims(): Record<string, AnimDef> {
  const out: Record<string, AnimDef> = {}
  for (const c of CHARACTERS) {
    if (c.id === 'actor') continue
    const own = ownAnims(c)
    for (const m of Object.values(c.moves)) {
      if (!(m.combo || m.id.startsWith('C_') || m.id === 'R')) continue
      const def = own[animOf(m)]
      if (def) out[`${c.id}:${m.anim ?? m.id}`] = { ...def, kit: KIT_OF[c.id] }
    }
  }
  return out
}

/** 그 캐릭터가 쓰는 동작 전체 (공용 동작 + 전용 동작 + 템플릿 [+ 배우: 따라 하기]) */
const cache: Record<string, Record<string, AnimDef>> = {}
export function animsFor(charId: string): Record<string, AnimDef> {
  const hit = cache[charId]
  if (hit) return hit
  const c = CHARACTERS.find((x) => x.id === charId)
  const own = c ? ownAnims(c) : { ...ANIMS }
  return (cache[charId] = charId === 'actor' ? { ...own, ...copyAnims() } : own)
}
