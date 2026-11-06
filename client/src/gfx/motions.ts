// 과장 동작 템플릿: 't:템플릿:장비' 이름으로 기술 데이터에서 씁니다.
// 모든 공격 동작은 4프레임 [예비 동작, 크게 당기기, 폭발적인 타격(잔상), 여운 포즈].
// 장비: l = 긴 장비(붐대·삼각대·롤러 등) · s = 한 손 장비(카메라·슬레이트·붓 등) · n = 맨손·발
// 같은 템플릿이라도 캐릭터 장비(kit)·의상으로 그려져서 직업마다 다르게 보입니다.
import type { Pose, SmallVar } from './Painter'
import type { AnimDef } from './poses'
import { mk, anim, type V } from './rig'

type It = 'l' | 's' | 'n'
type Item = Pose['item']

/** 장비 종류에 맞는 들기: 긴 장비는 방향, 한 손 장비는 모양 */
function itm(it: It, long: V, small: SmallVar = 'front', from?: 'F' | 'B'): { item?: Item } {
  if (it === 'l') return { item: { long, from } }
  if (it === 's') return { item: { small, from } }
  return {}
}

/** 웅크린 몸통 / 공중 몸통 / 앞으로 쏠린 몸통 */
const LOW = { sh: [32, 38] as V, head: [34, 23] as V, hip: [30, 48] as V }
const AIR = { ftF: [38, 50] as V, ftB: [27, 52] as V }
const LUNGE = { sh: [42, 33] as V, head: [45, 19] as V, hip: [35, 43] as V, ftF: [50, 58] as V, ftB: [17, 58] as V }

type Tpl = (it: It) => Pose[]

const T: Record<string, { fps: number; loop?: boolean; f: Tpl }> = {
  // 찌르기: 한껏 뒤로 당겼다가 몸을 던지듯 쭉
  thrust: { fps: 12, f: (it) => [
    mk({ sh: [29, 33], head: [28, 18], hip: [30, 43], hdF: [30, 36], hdB: [26, 38], ftB: [22, 58], ftF: [36, 58], face: 'focus', ...itm(it, [-6, 2]) }),
    mk({ sh: [27, 34], head: [24, 19], hip: [29, 44], hdF: [22, 36], hdB: [20, 38], ftB: [19, 58], ftF: [37, 58], face: 'angry', ...itm(it, [-12, 0]) }),
    mk({ ...LUNGE, hdF: [56, 32], hdB: [51, 33], face: 'shout', smear: [[28, 32], [46, 32], [64, 32]], ...itm(it, [22, 0]) }),
    mk({ sh: [38, 33], head: [40, 18], hip: [33, 43], hdF: [47, 35], hdB: [43, 36], ftF: [46, 58], ftB: [21, 58], face: 'angry', ...itm(it, [15, 2]) }),
  ] },
  // 겨누기·발사: 반동으로 몸이 젖혀짐
  aim: { fps: 12, f: (it) => [
    mk({ hdF: [38, 30], hdB: [34, 32], ftF: [40, 58], ftB: [22, 58], face: 'focus', ...itm(it, [16, -2]) }),
    mk({ sh: [33, 33], head: [35, 18], hdF: [40, 31], hdB: [36, 32], ftF: [40, 58], ftB: [22, 58], face: 'focus', ...itm(it, [17, -2]) }),
    mk({ sh: [28, 32], head: [26, 17], hip: [30, 43], hdF: [37, 28], hdB: [33, 30], ftF: [40, 58], ftB: [20, 58], face: 'shout', fx: it === 'l' ? [20, -3] : [10, -1], ...itm(it, [18, -4], 'flash') }),
    mk({ sh: [30, 32], head: [30, 17], hdF: [37, 30], hdB: [33, 32], ftF: [39, 58], ftB: [22, 58], face: 'focus', ...itm(it, [16, -2]) }),
  ] },
  // 올려치기: 바닥까지 웅크렸다가 하늘로 솟구침
  upper: { fps: 12, f: (it) => [
    mk({ ...LOW, hdF: [36, 46], hdB: [30, 46], face: 'focus', ...itm(it, [10, 8]) }),
    mk({ sh: [33, 41], head: [35, 26], hip: [30, 51], hdF: [34, 52], hdB: [28, 50], ftF: [38, 58], ftB: [24, 58], face: 'angry', ...itm(it, [8, 6]) }),
    mk({ sh: [36, 25], head: [38, 10], hip: [33, 37], hdF: [44, 5], hdB: [28, 20], ftF: [38, 53], ftB: [28, 58], face: 'shout', smear: [[46, 44], [54, 22], [46, 0]], ...itm(it, [6, -20]) }),
    mk({ sh: [34, 30], head: [36, 15], hip: [32, 41], hdF: [42, 16], hdB: [28, 26], face: 'happy', ...itm(it, [10, -14]) }),
  ] },
  // 폭발: 몸을 말았다가 양팔을 활짝
  burst: { fps: 12, f: (it) => [
    mk({ sh: [31, 36], head: [32, 21], hip: [30, 46], hdF: [34, 40], hdB: [30, 40], face: 'angry', ...itm(it, [6, 10], 'low') }),
    mk({ sh: [31, 39], head: [32, 24], hip: [30, 49], hdF: [33, 44], hdB: [29, 44], ftF: [36, 58], ftB: [26, 58], face: 'focus', ...itm(it, [4, 10], 'low') }),
    mk({ sh: [32, 29], head: [33, 14], hip: [31, 41], hdF: [50, 16], hdB: [14, 16], ftF: [44, 58], ftB: [18, 58], face: 'shout', fx: [4, -4], ...itm(it, [14, -12], 'flash') }),
    mk({ hdF: [43, 26], hdB: [21, 26], ftF: [41, 58], ftB: [21, 58], face: 'happy', ...itm(it, [14, -6], 'up') }),
  ] },
  // 던지기: 머리 뒤로 크게 젖혔다가 내리꽂듯
  throw: { fps: 12, f: (it) => [
    mk({ sh: [29, 32], head: [28, 17], hdF: [24, 22], hdB: [36, 34], ftB: [22, 58], face: 'focus', ...itm(it, [-8, -12], 'up') }),
    mk({ sh: [27, 33], head: [25, 18], hip: [29, 43], hdF: [18, 18], hdB: [38, 32], ftB: [20, 58], ftF: [38, 58], face: 'angry', ...itm(it, [-12, -10], 'up') }),
    mk({ sh: [39, 33], head: [42, 19], hip: [33, 43], hdF: [52, 34], hdB: [22, 30], ftF: [47, 58], ftB: [20, 58], face: 'shout', smear: [[22, 16], [42, 18], [54, 32]], ...(it === 'n' ? {} : itm(it, [14, 6], 'front')) }),
    mk({ sh: [36, 34], head: [39, 20], hdF: [45, 41], hdB: [25, 34], ftF: [45, 58], ftB: [22, 58], face: 'happy' }),
  ] },
  // 돌진 베기: 낮게 깔렸다가 화면을 가르듯
  dashstrike: { fps: 14, f: (it) => [
    mk({ sh: [36, 35], head: [39, 21], hip: [31, 44], hdF: [30, 40], hdB: [26, 40], ftB: [20, 58], face: 'focus', ...itm(it, [-12, 8]) }),
    mk({ sh: [38, 37], head: [42, 23], hip: [31, 46], hdF: [28, 42], hdB: [24, 42], ftF: [42, 58], ftB: [18, 58], face: 'angry', ...itm(it, [-14, 6]) }),
    mk({ sh: [45, 34], head: [49, 21], hip: [36, 44], hdF: [58, 33], hdB: [54, 35], ftF: [53, 58], ftB: [14, 58], face: 'shout', smear: [[14, 34], [40, 34], [64, 33]], ...itm(it, [18, -2]) }),
    mk({ sh: [42, 35], head: [46, 21], hip: [35, 45], hdF: [54, 38], hdB: [50, 40], ftF: [50, 58], ftB: [22, 58], face: 'angry', ...itm(it, [14, 8]) }),
  ] },
  // 난타: 위·아래·정면·반대 손 번갈아 (반복)
  flurry: { fps: 18, loop: true, f: (it) => [
    mk({ sh: [38, 32], head: [40, 17], hdF: [52, 26], hdB: [32, 36], ftF: [44, 58], face: 'shout', smear: [[40, 22], [54, 20], [62, 24]], ...itm(it, [16, -6]) }),
    mk({ sh: [38, 32], head: [40, 17], hdF: [52, 38], hdB: [32, 34], ftF: [44, 58], face: 'angry', smear: [[40, 40], [54, 42], [62, 38]], ...itm(it, [16, 6]) }),
    mk({ sh: [39, 32], head: [41, 17], hdF: [55, 31], hdB: [32, 35], ftF: [44, 58], face: 'shout', smear: [[40, 31], [56, 31], [64, 31]], ...itm(it, [18, 0]) }),
    mk({ sh: [38, 32], head: [40, 17], hdF: [40, 36], hdB: [52, 30], ftF: [44, 58], face: 'shout', smear: [[38, 28], [50, 29], [58, 30]], ...itm(it, [12, -2]) }),
  ] },
  // 공중 휘두르기
  airswing: { fps: 12, f: (it) => [
    mk({ ...AIR, sh: [31, 30], head: [31, 15], hip: [31, 41], hdF: [24, 22], hdB: [28, 26], face: 'focus', ...itm(it, [-14, -8]) }),
    mk({ ...AIR, sh: [30, 30], head: [29, 15], hip: [31, 41], hdF: [28, 14], hdB: [30, 18], face: 'angry', ...itm(it, [-6, -16]) }),
    mk({ ...AIR, sh: [35, 31], head: [38, 17], hip: [32, 42], hdF: [49, 35], hdB: [44, 36], face: 'shout', smear: [[28, 8], [52, 14], [62, 38]], ...itm(it, [18, 8]) }),
    mk({ ...AIR, sh: [34, 32], head: [36, 18], hip: [32, 43], hdF: [44, 41], hdB: [40, 40], face: 'angry', ...itm(it, [14, 12]) }),
  ] },
  // 하단 쓸기: 바닥을 쓸며 다리·장비를 길게
  sweep: { fps: 12, f: (it) => [
    mk({ ...LOW, hdF: [34, 46], hdB: [28, 46], face: 'focus', ...itm(it, [-10, 8]) }),
    mk({ ...LOW, hip: [29, 49], hdF: [28, 48], hdB: [24, 47], ftF: [34, 58], face: 'angry', ...itm(it, [-14, 6]) }),
    mk({ sh: [36, 40], head: [39, 26], hip: [30, 50], hdF: [46, 52], hdB: [22, 46], ftF: [52, 58], ftB: [22, 58], face: 'shout', smear: [[28, 58], [48, 58], [64, 57]], ...itm(it, [20, 6]) }),
    mk({ ...LOW, hdF: [40, 50], hdB: [26, 46], ftF: [44, 58], face: 'angry', ...itm(it, [14, 8]) }),
  ] },
  // 회전 (반복)
  spin: { fps: 16, loop: true, f: (it) => [
    mk({ hdF: [48, 30], hdB: [24, 36], face: 'shout', smear: [[10, 18], [30, 4], [60, 20]], ...itm(it, [16, -2]) }),
    mk({ hdF: [35, 34], hdB: [31, 34], head: [33, 16], face: 'shout', ...itm(it, [2, -16]) }),
    mk({ hdB: [16, 30], hdF: [36, 36], face: 'shout', smear: [[60, 34], [40, 44], [6, 34]], ...itm(it, [-16, -2], 'front', 'B') }),
    mk({ hdF: [38, 26], hdB: [28, 28], head: [32, 16], face: 'angry', ...itm(it, [4, 16]) }),
  ] },
  // 지시·시전: 손가락으로 가리키며 "거기!"
  point: { fps: 12, f: (it) => [
    mk({ hdF: [32, 28], hdB: [28, 40], face: 'focus', ...itm(it, [6, -12], 'up') }),
    mk({ sh: [30, 32], head: [29, 17], hdF: [26, 24], hdB: [28, 40], ftB: [22, 58], face: 'angry', ...itm(it, [-4, -14], 'up') }),
    mk({ sh: [37, 31], head: [39, 16], hip: [33, 42], hdF: [54, 25], hdB: [22, 36], ftF: [45, 58], ftB: [20, 58], face: 'shout', fx: [6, -2], ...itm(it, [16, -4], 'flash') }),
    mk({ sh: [35, 31], head: [37, 16], hdF: [47, 29], hdB: [26, 38], ftF: [43, 58], face: 'focus', ...itm(it, [14, -2], 'front') }),
  ] },
  // 크게 가로 휘두르기 (양손)
  swing: { fps: 12, f: (it) => [
    mk({ sh: [30, 32], head: [29, 17], hdF: [24, 26], hdB: [26, 28], ftB: [21, 58], face: 'focus', ...itm(it, [-14, -10]) }),
    mk({ sh: [29, 31], head: [27, 16], hdF: [28, 16], hdB: [30, 18], ftB: [20, 58], ftF: [38, 58], face: 'angry', ...itm(it, [-2, -20]) }),
    mk({ sh: [38, 32], head: [41, 18], hip: [33, 43], hdF: [48, 32], hdB: [44, 33], ftF: [47, 58], ftB: [19, 58], face: 'shout', smear: [[42, 4], [62, 18], [63, 38]], ...itm(it, [22, 0]) }),
    mk({ sh: [36, 33], head: [39, 19], hdF: [43, 41], hdB: [40, 40], ftF: [45, 58], face: 'angry', ...itm(it, [16, 12]) }),
  ] },
  // 하이킥: 무릎 접었다가 머리 높이까지
  kick: { fps: 12, f: (it) => [
    mk({ hdF: [38, 30], hdB: [34, 32], ftF: [37, 47], face: 'focus', ...itm(it, [4, -14], 'up', 'B') }),
    mk({ sh: [29, 31], head: [28, 16], hip: [31, 43], hdF: [37, 30], hdB: [30, 30], ftF: [39, 42], face: 'angry', ...itm(it, [4, -14], 'up', 'B') }),
    mk({ sh: [26, 32], head: [23, 17], hip: [32, 43], hdF: [34, 38], hdB: [20, 30], ftF: [57, 28], ftB: [27, 58], face: 'shout', smear: [[40, 52], [56, 40], [60, 24]], ...itm(it, [-6, -14], 'up', 'B') }),
    mk({ sh: [30, 32], head: [30, 17], hdF: [37, 34], hdB: [26, 32], ftF: [45, 50], face: 'happy', ...itm(it, [-4, -14], 'up', 'B') }),
  ] },
  // 포즈·강화: 팔을 하늘로 "짠!"
  pose: { fps: 10, f: (it) => [
    mk({ hdF: [38, 30], hdB: [28, 38], face: 'focus', ...itm(it, [6, -14], 'up') }),
    mk({ hdF: [40, 22], hdB: [24, 24], face: 'happy', ...itm(it, [8, -16], 'up') }),
    mk({ sh: [32, 30], head: [33, 14], hip: [31, 41], hdF: [45, 12], hdB: [20, 16], ftF: [41, 58], ftB: [22, 58], face: 'shout', fx: [0, -6], ...itm(it, [4, -20], 'flash') }),
    mk({ hdF: [41, 25], hdB: [24, 30], face: 'happy', ...itm(it, [10, -14], 'up') }),
  ] },
  // 잽: 빠르고 짧게
  jab: { fps: 20, f: (it) => [
    mk({ sh: [31, 32], hdF: [38, 32], hdB: [34, 32], ftF: [40, 58], ftB: [24, 58], face: 'focus', ...itm(it, [12, -4]) }),
    mk({ sh: [30, 32], head: [30, 17], hdF: [34, 33], hdB: [34, 31], ftF: [40, 58], ftB: [24, 58], face: 'angry', ...itm(it, [10, -2]) }),
    mk({ sh: [38, 32], head: [41, 17], hip: [33, 43], hdF: [54, 30], hdB: [36, 32], ftF: [46, 58], ftB: [22, 58], face: 'shout', smear: [[38, 30], [48, 30], [58, 30]], ...itm(it, [16, -2]) }),
    mk({ sh: [34, 32], head: [36, 17], hdF: [45, 32], hdB: [35, 32], ftF: [43, 58], ftB: [23, 58], face: 'focus', ...itm(it, [13, -2]) }),
  ] },
  // 순간이동: 몸을 웅크렸다가 빛 속으로 튀어 오름
  blink: { fps: 12, f: (it) => [
    mk({ sh: [32, 36], head: [33, 21], hip: [31, 46], hdF: [30, 30], hdB: [34, 30], face: 'focus', ...itm(it, [4, -14], 'up') }),
    mk({ sh: [32, 40], head: [33, 25], hip: [31, 49], hdF: [30, 36], hdB: [34, 36], ftF: [37, 58], ftB: [25, 58], face: 'blink', ...itm(it, [4, -12], 'up') }),
    mk({ sh: [32, 28], head: [33, 13], hip: [31, 39], hdF: [47, 10], hdB: [17, 10], ftF: [35, 52], ftB: [28, 53], face: 'happy', fx: [0, -4], ...itm(it, [6, -18], 'flash') }),
    mk({ hdF: [38, 31], hdB: [28, 36], face: 'happy', ...itm(it, [10, -10], 'front') }),
  ] },
  // 날아차기
  airkick: { fps: 12, f: (it) => [
    mk({ sh: [32, 30], head: [33, 15], hip: [31, 42], hdF: [36, 30], hdB: [28, 32], ftF: [36, 50], ftB: [26, 50], face: 'focus', ...itm(it, [-6, -12], 'up', 'B') }),
    mk({ sh: [31, 30], head: [31, 15], hip: [31, 42], hdF: [35, 28], hdB: [27, 30], ftF: [34, 46], ftB: [26, 48], face: 'angry', ...itm(it, [-6, -12], 'up', 'B') }),
    mk({ sh: [28, 30], head: [25, 16], hip: [33, 41], hdF: [22, 30], hdB: [18, 34], ftF: [56, 52], ftB: [26, 48], face: 'shout', smear: [[38, 48], [48, 52], [60, 54]], ...itm(it, [-10, -10], 'up', 'B') }),
    mk({ sh: [30, 30], head: [29, 15], hip: [32, 42], hdF: [28, 32], hdB: [22, 34], ftF: [45, 50], ftB: [26, 50], face: 'happy', ...itm(it, [-8, -10], 'up', 'B') }),
  ] },
  // 외침: 몸을 젖혔다가 앞으로 "컷!!"
  shout: { fps: 10, f: (it) => [
    mk({ sh: [29, 32], head: [27, 17], hdF: [34, 22], hdB: [32, 24], face: 'focus', ...itm(it, [8, -10], 'up') }),
    mk({ sh: [27, 33], head: [24, 18], hip: [29, 43], hdF: [32, 20], hdB: [30, 22], ftB: [21, 58], face: 'angry', ...itm(it, [6, -12], 'up') }),
    mk({ sh: [39, 32], head: [43, 17], hip: [33, 43], hdF: [51, 25], hdB: [19, 28], ftF: [46, 58], ftB: [19, 58], face: 'shout', fx: [6, -6], ...itm(it, [16, 0], 'flash') }),
    mk({ sh: [35, 32], head: [38, 17], hdF: [45, 29], hdB: [24, 32], ftF: [43, 58], face: 'shout', ...itm(it, [14, 2], 'front') }),
  ] },
  // 공중 급강하: 머리부터 비스듬히 꽂힘
  dive: { fps: 12, f: (it) => [
    mk({ ...AIR, sh: [32, 30], head: [33, 15], hip: [31, 42], hdF: [38, 22], hdB: [26, 22], face: 'focus', ...itm(it, [4, -18], 'up') }),
    mk({ ...AIR, sh: [31, 29], head: [31, 14], hip: [31, 41], hdF: [36, 13], hdB: [26, 14], face: 'angry', ...itm(it, [2, -20], 'up') }),
    mk({ sh: [38, 36], head: [44, 25], hip: [30, 34], hdF: [51, 50], hdB: [46, 48], ftF: [22, 28], ftB: [17, 34], face: 'shout', smear: [[42, 18], [54, 34], [57, 54]], ...itm(it, [10, 14], 'low') }),
    mk({ sh: [36, 37], head: [41, 25], hip: [30, 38], hdF: [46, 52], hdB: [42, 50], ftF: [30, 44], ftB: [24, 48], face: 'angry', ...itm(it, [8, 12], 'low') }),
  ] },
  // 앉아 찌르기
  crouchpoke: { fps: 14, f: (it) => [
    mk({ ...LOW, hdF: [36, 46], hdB: [30, 46], face: 'focus', ...itm(it, [-8, 4], 'low') }),
    mk({ ...LOW, sh: [30, 39], head: [31, 24], hdF: [30, 46], hdB: [27, 46], face: 'angry', ...itm(it, [-12, 2], 'low') }),
    mk({ sh: [37, 40], head: [40, 26], hip: [30, 50], hdF: [52, 48], hdB: [46, 48], ftF: [45, 58], ftB: [21, 58], face: 'shout', smear: [[34, 48], [48, 48], [63, 48]], ...itm(it, [18, 2], 'low') }),
    mk({ ...LOW, hdF: [44, 48], hdB: [38, 48], face: 'angry', ...itm(it, [14, 2], 'low') }),
  ] },
  // 공중 내려찍기
  airspike: { fps: 12, f: (it) => [
    mk({ ...AIR, sh: [32, 30], head: [33, 15], hip: [31, 42], hdF: [38, 14], hdB: [30, 14], face: 'focus', ...itm(it, [0, -18], 'up') }),
    mk({ ...AIR, sh: [31, 30], head: [31, 15], hip: [31, 42], hdF: [33, 9], hdB: [28, 10], face: 'angry', ...itm(it, [-6, -18], 'up') }),
    mk({ ...AIR, sh: [35, 34], head: [38, 20], hip: [32, 44], hdF: [47, 46], hdB: [43, 44], face: 'shout', smear: [[34, 4], [50, 22], [53, 50]], ...itm(it, [10, 16], 'low') }),
    mk({ ...AIR, sh: [34, 34], head: [37, 20], hip: [32, 44], hdF: [44, 44], hdB: [40, 42], face: 'angry', ...itm(it, [8, 14], 'low') }),
  ] },
  // 설치: 번쩍 들었다가 바닥에 "쾅"
  plant: { fps: 10, f: (it) => [
    mk({ hdF: [38, 28], hdB: [34, 30], face: 'focus', ...itm(it, [0, -18], 'up') }),
    mk({ sh: [31, 31], head: [31, 16], hdF: [37, 18], hdB: [33, 20], face: 'angry', ...itm(it, [-2, -20], 'up') }),
    mk({ sh: [35, 38], head: [38, 23], hip: [31, 48], hdF: [47, 49], hdB: [43, 48], ftF: [43, 58], ftB: [22, 58], face: 'shout', fx: [10, 8], ...itm(it, [4, 14], 'low') }),
    mk({ ...LOW, hdF: [44, 46], hdB: [40, 46], face: 'happy', ...itm(it, [2, 12], 'low') }),
  ] },
  // 내려찍기: 머리 위로 높이 들었다가 수직으로
  overhead: { fps: 12, f: (it) => [
    mk({ sh: [30, 32], head: [29, 17], hdF: [31, 14], hdB: [30, 16], face: 'focus', ...itm(it, [-10, -14], 'up') }),
    mk({ sh: [28, 31], head: [26, 16], hip: [29, 42], hdF: [26, 9], hdB: [27, 11], ftB: [20, 58], ftF: [38, 58], face: 'angry', ...itm(it, [-14, -10], 'up') }),
    mk({ sh: [38, 35], head: [42, 21], hip: [33, 45], hdF: [49, 41], hdB: [46, 41], ftF: [47, 58], ftB: [19, 58], face: 'shout', smear: [[22, 2], [50, 8], [63, 40]], ...itm(it, [18, 14], 'low') }),
    mk({ sh: [37, 36], head: [41, 22], hip: [33, 46], hdF: [46, 45], hdB: [43, 45], ftF: [46, 58], face: 'angry', ...itm(it, [14, 14], 'low') }),
  ] },
  // 장대높이뛰기: 장비를 꽂고 몸을 띄움
  vault: { fps: 10, f: (it) => [
    mk({ sh: [37, 33], head: [40, 19], hip: [32, 43], hdF: [45, 36], hdB: [41, 36], ftF: [44, 58], ftB: [20, 58], face: 'focus', ...itm(it, [14, 16], 'low') }),
    mk({ sh: [38, 27], head: [40, 12], hip: [34, 38], hdF: [43, 32], hdB: [40, 30], ftF: [38, 50], ftB: [30, 52], face: 'angry', ...itm(it, [4, 22], 'low') }),
    mk({ sh: [34, 22], head: [36, 8], hip: [33, 34], hdF: [35, 38], hdB: [31, 36], ftF: [52, 40], ftB: [40, 44], face: 'shout', smear: [[36, 52], [46, 40], [56, 38]], ...itm(it, [0, 18], 'low') }),
    mk({ ...AIR, sh: [33, 30], head: [35, 15], hip: [32, 41], hdF: [40, 32], hdB: [28, 30], face: 'happy', ...itm(it, [12, -6]) }),
  ] },
  // 모으기: 잔뜩 웅크려 힘을 모았다가 터뜨림 (누르는 동안 2번째 프레임)
  charge: { fps: 12, f: (it) => [
    mk({ sh: [30, 35], head: [30, 20], hip: [30, 45], hdF: [30, 40], hdB: [26, 40], ftF: [38, 58], ftB: [22, 58], face: 'focus', ...itm(it, [-14, 6]) }),
    mk({ sh: [28, 37], head: [27, 22], hip: [29, 47], hdF: [24, 42], hdB: [22, 42], ftF: [39, 58], ftB: [19, 58], face: 'angry', fx: [-6, -2], ...itm(it, [-16, 4]) }),
    mk({ ...LUNGE, hdF: [57, 32], hdB: [53, 33], face: 'shout', smear: [[20, 32], [44, 32], [64, 32]], ...itm(it, [24, 0]) }),
    mk({ sh: [39, 33], head: [42, 18], hip: [34, 43], hdF: [48, 34], hdB: [44, 35], ftF: [47, 58], ftB: [21, 58], face: 'happy', ...itm(it, [16, 2]) }),
  ] },
}

export const MOTION_NAMES = Object.keys(T)

/** 't:템플릿:장비' → 동작. 없는 템플릿이면 null */
export function motion(name: string): AnimDef | null {
  const [, tpl, it] = name.split(':')
  const t = T[tpl]
  if (!t) return null
  return anim(t.fps, !!t.loop, ...t.f((it as It) || 'n'))
}
