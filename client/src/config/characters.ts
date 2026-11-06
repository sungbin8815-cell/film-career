// 캐릭터 데이터. 숫자만 바꿔도 밸런스가 바뀝니다. (체력 1000 기준)
// combos: 버튼 순서 → 새 기술 (L 약, H 강, S 특수, X 필살, d = ↓ 같이)
// rank: 스테이지 모드에서 그 기술을 쓸 수 있게 되는 직급 (0 막내 · 1 서드 · 2 세컨드 · 3 퍼스트 · 4 감독)
// anim: 쓸 동작 (gfx/poses.ts의 이름). 없으면 기술 id와 같은 동작
// 기술표 전체는 MOVES.md (npm run moves 로 다시 만들 수 있음)
import type { CharacterData, ComboDef, MoveData, MoveId } from '../core/types'

const TITLES = (head: string): CharacterData['titles'] => ['막내', '서드', '세컨드', '퍼스트', head]
/** 모든 캐릭터가 같은 입력으로 쓰는 커맨드 콤보 */
const STD_COMBOS: ComboDef[] = [
  { seq: ['L', 'L', 'H'], move: 'upper' },      // 약 약 강 → 띄우기
  { seq: ['L', 'H', 'H'], move: 'zoompunch' },  // 약 강 강 → 날려버리기
  { seq: ['H', 'H'], move: 'spin' },            // 강 강 → 회전 2연타
  { seq: ['L', 'L', 'S'], move: 'flash' },      // 약 약 특 → 긴 경직 (SP 10)
  { seq: ['L', 'H', 'S'], move: 'rush' },       // 약 강 특 → 연타 러시 (SP 25)
  { seq: ['dH'], move: 'sweep' },               // ↓ + 강 → 하단 다운
]

export const DP: CharacterData = {
  id: 'dp',
  name: '촬영감독',
  nameEn: 'DP',
  color: '#3b82f6',
  desc: '장비 자부심 MAX. 구도에 민감한 밸런스형.',
  dept: '촬영부',
  titles: TITLES('촬영감독'),
  stats: { power: 3, speed: 3, reach: 3 },
  hp: 1000,
  walkSpeed: 1.7,
  runSpeed: 3.4,
  jumpV: 6.4,
  airSpeed: 2.0,
  gravity: 0.36,
  hurt: { w: 22, h: 50, crouchH: 32 },
  moves: {
    // ───── 기본기 ─────
    light: {
      id: 'light', rank: 0, name: '카메라 손잡이 타격',
      startup: 4, active: 3, recovery: 9,
      damage: 40, chip: 4, hitstun: 16, blockstun: 9, kbX: 1.4,
      hitbox: { x: 8, y: 26, w: 24, h: 16 }, meterGain: 5,
      cancelInto: ['light', 'heavy', 'special1', 'special2', 'super'],
      sfx: 'light',
    },
    heavy: {
      id: 'heavy', rank: 0, name: '삼각대 휘두르기',
      startup: 10, active: 5, recovery: 18,
      damage: 85, chip: 10, hitstun: 22, blockstun: 15, kbX: 3.4,
      hitbox: { x: 6, y: 16, w: 40, h: 28 }, meterGain: 9,
      cancelInto: ['special1', 'special2', 'super'],
      sfx: 'heavy',
    },
    special1: {
      id: 'special1', rank: 0, name: '숄더 어택', voice: '비켜! 장비 지나간다!',
      startup: 8, active: 16, recovery: 18, cost: 25,
      damage: 95, chip: 14, hitstun: 26, blockstun: 16, kbX: 4.5, kbY: 3.2,
      hitbox: { x: 2, y: 12, w: 24, h: 32 }, meterGain: 0, dash: 4.8, afterimage: true,
      sfx: 'dash',
    },
    special2: {
      id: 'special2', rank: 1, name: '조명 낙하', voice: '조명 들어갑니다~!',
      startup: 14, active: 1, recovery: 22, cost: 25,
      damage: 0, chip: 0, hitstun: 0, blockstun: 0, kbX: 0,
      hitbox: { x: 0, y: 0, w: 0, h: 0 }, meterGain: 0,
      projectile: { kind: 'lightstand', offsetX: 66, startY: 150, vx: 0, vy: -5.5, w: 20, h: 26, life: 60,
        damage: 105, chip: 16, hitstun: 30, blockstun: 18, kbX: 1.5, kbY: 2.6 },
      sfx: 'drop',
    },
    super: {
      id: 'super', rank: 3, name: '원테이크', voice: '컷 없이 간다! 원테이크!!',
      startup: 14, active: 42, recovery: 22, cost: 100,
      damage: 52, chip: 8, hitstun: 18, blockstun: 10, kbX: 1.2, lastHitKbY: 6,
      hitbox: { x: 0, y: 8, w: 32, h: 40 }, meterGain: 0, dash: 3.6, afterimage: true, finisher: true, juggle: true,
      multiHit: { interval: 8, max: 5 },
      sfx: 'super',
    },

    // ───── 커맨드 콤보 기술 ─────
    upper: {
      id: 'upper', rank: 1, name: '트라이포드 어퍼', combo: true, finisher: true, juggle: true, voice: '하이앵글!!',
      startup: 6, active: 5, recovery: 22,
      damage: 72, chip: 8, hitstun: 24, blockstun: 14, kbX: 1.2, kbY: 7,
      hitbox: { x: 2, y: 24, w: 30, h: 40 }, meterGain: 10, dash: 2.4,
      cancelInto: ['special1', 'super'],
      sfx: 'heavy',
    },
    spin: {
      id: 'spin', rank: 2, name: '삼각대 회전베기', combo: true, voice: '360도 회전숏!',
      startup: 5, active: 14, recovery: 18,
      damage: 46, chip: 6, hitstun: 20, blockstun: 12, kbX: 2.6, lastHitKbY: 3.6,
      hitbox: { x: -14, y: 10, w: 56, h: 32 }, meterGain: 8, multiHit: { interval: 7, max: 2 }, juggle: true, finisher: true,
      sfx: 'heavy',
    },
    zoompunch: {
      id: 'zoompunch', rank: 2, name: '줌인 펀치', combo: true, finisher: true, voice: '줌~인!',
      startup: 9, active: 7, recovery: 20,
      damage: 98, chip: 12, hitstun: 26, blockstun: 16, kbX: 6.5, kbY: 2.4,
      hitbox: { x: 6, y: 20, w: 30, h: 22 }, meterGain: 10, dash: 3.4, afterimage: true,
      sfx: 'dash',
    },
    flash: {
      id: 'flash', rank: 2, name: '플래시 버스트', combo: true, voice: '찰칵! 눈부시지?',
      startup: 6, active: 4, recovery: 16, cost: 10,
      damage: 30, chip: 4, hitstun: 48, blockstun: 12, kbX: 0.6,
      hitbox: { x: -4, y: 10, w: 56, h: 50 }, meterGain: 4,
      cancelInto: ['heavy', 'special1', 'super'],
      sfx: 'shutter',
    },
    rush: {
      id: 'rush', rank: 3, name: '롱테이크 러시', combo: true, finisher: true, voice: '컷 안 해! 계속 가!',
      startup: 6, active: 32, recovery: 20, cost: 25,
      damage: 28, chip: 4, hitstun: 14, blockstun: 8, kbX: 1, lastHitKbY: 5,
      hitbox: { x: 2, y: 14, w: 30, h: 34 }, meterGain: 0, dash: 2.2, afterimage: true, juggle: true,
      multiHit: { interval: 6, max: 5 },
      sfx: 'dash',
    },
    sweep: {
      id: 'sweep', rank: 0, name: '로우앵글 스윕', combo: true, voice: '로우앵글!',
      startup: 8, active: 5, recovery: 18,
      damage: 62, chip: 8, hitstun: 20, blockstun: 12, kbX: 1.5, kbY: 2.2,
      hitbox: { x: 4, y: 0, w: 34, h: 12 }, meterGain: 7,
      cancelInto: ['special1', 'super'],
      sfx: 'heavy',
    },
  },
  combos: STD_COMBOS,
}

/** DP 기술을 바탕으로 이름·수치만 바꿔 새 캐릭터 기술표를 만듦 */
type Over = Partial<MoveData> & { name: string }
function derive(over: Record<MoveId, Over>): Record<MoveId, MoveData> {
  const out: Record<MoveId, MoveData> = {}
  for (const [id, base] of Object.entries(DP.moves)) {
    const o = over[id]
    out[id] = { ...base, voice: undefined, ...o, id, anim: o?.anim ?? base.anim ?? id }
  }
  return out
}

export const DIRECTOR: CharacterData = {
  ...DP, id: 'director', name: '연출감독', nameEn: 'DIRECTOR', color: '#ef4444', dept: '연출부', titles: TITLES('감독'),
  desc: '모든 걸 내 뜻대로. 빠른 근접 압박형.', stats: { power: 3, speed: 4, reach: 2 },
  hp: 920, walkSpeed: 1.9, runSpeed: 3.8, jumpV: 6.6,
  moves: derive({
    light: { name: '슬레이트 딱!', startup: 4, recovery: 9, damage: 32, sfx: 'slate' },
    heavy: { name: '메가폰 후려치기', startup: 9, damage: 80 },
    special1: { name: '컷!!', voice: '컷!! 컷컷컷!!', anim: 'poke', startup: 10, active: 1, recovery: 20, dash: undefined, afterimage: false, damage: 0, chip: 0, hitstun: 0, blockstun: 0, kbX: 0, kbY: undefined, hitbox: { x: 0, y: 0, w: 0, h: 0 },
      projectile: { kind: 'cut', offsetX: 24, startY: 18, vx: 5.2, vy: 0, w: 18, h: 30, life: 40, damage: 60, chip: 10, hitstun: 24, blockstun: 14, kbX: 2.6 }, sfx: 'shout' },
    special2: { name: '대본 던지기', voice: '대본 좀 읽고 와!', anim: 'throw', startup: 12,
      projectile: { kind: 'script', offsetX: 12, startY: 36, vx: 3, vy: 2.4, gy: 0.22, w: 16, h: 14, life: 90, damage: 84, chip: 12, hitstun: 28, blockstun: 16, kbX: 2, kbY: 2.6 }, sfx: 'swing' },
    super: { name: '레디~ 액션!!', voice: '레디~~ 액션!!', anim: 'rush', damage: 46, dash: 4, multiHit: { interval: 7, max: 6 } },
    upper: { name: 'NG 어퍼', voice: 'NG!!', combo: true },
    zoompunch: { name: 'OK 컷 내려찍기', voice: '오케이~ 컷!', combo: true, anim: 'heavy', dash: 2.6 },
    spin: { name: '메가폰 회전', voice: '다들 집중!', combo: true },
    flash: { name: '슬레이트 플래시', voice: '씬 원, 컷 원!', combo: true },
    rush: { name: '디렉션 폭풍', voice: '거기! 아니 거기! 아니!', combo: true },
    sweep: { name: '발 맞춰!', voice: '동선 확인!', combo: true },
  }),
}
export const SOUND: CharacterData = {
  ...DP, id: 'sound', name: '사운드감독', nameEn: 'SOUND', color: '#22c55e', dept: '녹음부', titles: TITLES('녹음감독'),
  desc: '녹음 방해는 용서 못 해. 긴 붐으로 견제하는 원거리형.', stats: { power: 2, speed: 2, reach: 5 },
  hp: 1000, walkSpeed: 1.5, runSpeed: 3.1,
  moves: derive({
    light: { name: '붐 찌르기', anim: 'poke', startup: 6, active: 4, recovery: 12, damage: 38, hitbox: { x: 16, y: 26, w: 34, h: 14 } },
    heavy: { name: '붐 내려찍기', startup: 13, recovery: 20, damage: 88, hitbox: { x: 10, y: 10, w: 50, h: 34 } },
    special1: { name: '하울링', voice: '삐이이익~!!', anim: 'poke', startup: 12, active: 1, recovery: 22, dash: undefined, afterimage: false, damage: 0, chip: 0, hitstun: 0, blockstun: 0, kbX: 0, kbY: undefined, hitbox: { x: 0, y: 0, w: 0, h: 0 },
      projectile: { kind: 'wave', offsetX: 30, startY: 16, vx: 4.4, vy: 0, w: 20, h: 34, life: 70, damage: 66, chip: 10, hitstun: 26, blockstun: 14, kbX: 2.4 }, sfx: 'wave' },
    special2: { name: '조용히!!', voice: '조용히 해주세요!!', anim: 'burst', startup: 12, active: 6, recovery: 22, cost: 25, projectile: undefined,
      damage: 60, chip: 10, hitstun: 44, blockstun: 16, kbX: 3, hitbox: { x: -12, y: 4, w: 54, h: 50 }, sfx: 'wave' },
    super: { name: '동시녹음 풀레벨', voice: '레벨 최대!! 전원 정숙!!', anim: 'burst', dash: undefined, damage: 40, hitbox: { x: -20, y: 0, w: 150, h: 60 }, multiHit: { interval: 9, max: 5 }, sfx: 'wave' },
    upper: { name: '붐 어퍼', voice: '마이크 올립니다!', combo: true, hitbox: { x: 4, y: 24, w: 34, h: 44 } },
    zoompunch: { name: '털뭉치 강타', voice: '바람 소리 컷!', combo: true, anim: 'poke', dash: 1.8, hitbox: { x: 14, y: 20, w: 40, h: 22 } },
    spin: { name: '붐 회전', voice: '360도 수음!', combo: true, hitbox: { x: -20, y: 10, w: 70, h: 32 } },
    flash: { name: '피드백 노이즈', voice: '지지직—!', combo: true },
    rush: { name: '음파 난타', voice: '들려? 들리냐고!', combo: true, anim: 'poke' },
    sweep: { name: '케이블 걸기', voice: '선 밟지 마세요!', combo: true, hitbox: { x: 4, y: 0, w: 46, h: 12 } },
  }),
}
export const GAFFER: CharacterData = {
  ...DP, id: 'gaffer', name: '조명감독', nameEn: 'GAFFER', color: '#f59e0b', dept: '조명부', titles: TITLES('조명감독'),
  desc: '빛과 힘의 사나이. 느리지만 한 방이 큰 파워형.', stats: { power: 5, speed: 2, reach: 3 },
  hp: 1060, walkSpeed: 1.45, runSpeed: 3.0, jumpV: 6.1,
  moves: derive({
    light: { name: 'LED 패널 치기', startup: 5, recovery: 10, damage: 46 },
    heavy: { name: 'C스탠드 휘두르기', startup: 12, recovery: 20, damage: 104, kbX: 4, hitbox: { x: 6, y: 14, w: 44, h: 30 } },
    special1: { name: '케이블 채찍', voice: '전원 들어갑니다!', anim: 'poke', startup: 10, active: 10, recovery: 20, dash: undefined, afterimage: false, damage: 48, kbX: 2.6, kbY: undefined, hitbox: { x: 12, y: 18, w: 50, h: 18 }, multiHit: { interval: 5, max: 2 }, sfx: 'whip' },
    special2: { name: '전구 투척', voice: '전구 나갑니다~!', anim: 'throw', startup: 13,
      projectile: { kind: 'bulb', offsetX: 12, startY: 38, vx: 3, vy: 2.6, gy: 0.24, w: 14, h: 14, life: 90, damage: 100, chip: 16, hitstun: 30, blockstun: 18, kbX: 2, kbY: 2.8 }, sfx: 'swing' },
    super: { name: '풀 파워!!', voice: '18K 풀 파워!!!', anim: 'burst', dash: undefined, damage: 0, chip: 0, hitbox: { x: 0, y: 0, w: 0, h: 0 }, multiHit: undefined, active: 1, recovery: 30,
      projectile: { kind: 'beam', offsetX: 46, startY: 1, vx: 2.6, vy: 0, w: 24, h: 70, life: 80, damage: 230, chip: 30, hitstun: 40, blockstun: 24, kbX: 3, kbY: 6.5 }, sfx: 'super' },
    upper: { name: '스탠드 어퍼', voice: '라이트 업!', combo: true, damage: 80 },
    zoompunch: { name: '백열등 강타', voice: '뜨겁지?', combo: true, damage: 108 },
    spin: { name: '스탠드 회전', voice: '돌려!', combo: true, damage: 52 },
    flash: { name: 'HMI 섬광', voice: '눈 감아!!', combo: true },
    rush: { name: '전압 러시', voice: '과부하다아!', combo: true, damage: 32 },
    sweep: { name: '케이블 걸기', voice: '발밑 조심!', combo: true, damage: 70 },
  }),
}
export const ART: CharacterData = {
  ...DP, id: 'art', name: '미술감독', nameEn: 'ART', color: '#a855f7', dept: '미술부', titles: TITLES('미술감독'),
  desc: '세트는 내가 지킨다. 망치와 롤러의 공격형.', stats: { power: 4, speed: 3, reach: 3 },
  hp: 1030,
  moves: derive({
    light: { name: '망치 콩!', startup: 4, damage: 42, sfx: 'light' },
    heavy: { name: '롤러 휘두르기', startup: 11, damage: 90 },
    special1: { name: '세트 조립 돌진', voice: '세트 들어갑니다!' },
    special2: { name: '페인트 투척', voice: '덧칠 들어간다!', anim: 'throw', startup: 12,
      projectile: { kind: 'paint', offsetX: 12, startY: 36, vx: 3.2, vy: 2.4, gy: 0.22, w: 16, h: 14, life: 90, damage: 90, chip: 14, hitstun: 30, blockstun: 16, kbX: 2, kbY: 2.4 }, sfx: 'swing' },
    super: { name: '세트 철거!!', voice: '전부 철거다아!!', anim: 'rush', dash: 3.2, damage: 48, multiHit: { interval: 7, max: 6 } },
    upper: { name: '롤러 어퍼', voice: '천장까지 칠해!', combo: true },
    zoompunch: { name: '대못 박기', voice: '쾅!!', combo: true, anim: 'heavy', damage: 104 },
    spin: { name: '롤러 회전', voice: '한 번 더 칠한다!', combo: true },
    flash: { name: '페인트 폭탄', voice: '색 좀 입혀줄게!', combo: true },
    rush: { name: '연속 망치질', voice: '뚝딱뚝딱뚝딱!', combo: true },
    sweep: { name: '바닥 칠하기', voice: '바닥 마르기 전이야!', combo: true },
  }),
}
export const MAKEUP: CharacterData = {
  ...DP, id: 'makeup', name: '분장실장', nameEn: 'MAKEUP', color: '#ec4899', dept: '분장팀', titles: TITLES('분장실장'),
  desc: '톡톡톡, 이미 끝났어. 가장 빠른 연타형.', stats: { power: 2, speed: 5, reach: 2 },
  hp: 940, walkSpeed: 2.05, runSpeed: 4.1, jumpV: 6.8, airSpeed: 2.3,
  moves: derive({
    light: { name: '퍼프 톡', startup: 3, active: 2, recovery: 7, damage: 33, hitstun: 15 },
    heavy: { name: '브러시 휘두르기', startup: 8, recovery: 15, damage: 78 },
    special1: { name: '헤어스프레이', voice: '고정 들어갑니다~', anim: 'flash', startup: 7, active: 20, recovery: 16, dash: undefined, afterimage: false, damage: 18, chip: 3, hitstun: 14, kbX: 0.8, kbY: undefined, hitbox: { x: 8, y: 16, w: 38, h: 30 }, multiHit: { interval: 5, max: 4 }, sfx: 'spray' },
    special2: { name: '파우더 연막', voice: '파우더~ 팡!', anim: 'throw', startup: 10,
      projectile: { kind: 'spray', offsetX: 20, startY: 18, vx: 2.4, vy: 0, w: 24, h: 26, life: 80, damage: 52, chip: 6, hitstun: 50, blockstun: 12, kbX: 0.8 }, sfx: 'spray' },
    super: { name: '풀메이크업!!', voice: '완벽하게 만들어 줄게!!', anim: 'rush', dash: 4.2, damage: 28, multiHit: { interval: 5, max: 8 } },
    upper: { name: '브러시 어퍼', voice: '턱선 살리고~', combo: true, damage: 64 },
    zoompunch: { name: '컬링 스트라이크', voice: '볼륨 업!', combo: true, damage: 88 },
    spin: { name: '브러시 회전', voice: '쉐딩 쉐딩~', combo: true, damage: 40 },
    flash: { name: '반짝 펄', voice: '하이라이터 반짝!', combo: true },
    rush: { name: '메이크업 러시', voice: '톡톡톡톡톡!', combo: true, damage: 24, multiHit: { interval: 5, max: 6 } },
    sweep: { name: '쓸어담기', voice: '정리 끝~', combo: true, damage: 52 },
  }),
}

export const CHARACTERS: CharacterData[] = [DP, DIRECTOR, SOUND, GAFFER, ART, MAKEUP]
export const getCharacter = (id: string) => CHARACTERS.find((c) => c.id === id) ?? DP

/** 기술표용: 버튼 토큰 → 한글 */
export const BTN_LABEL: Record<string, string> = { L: '약', H: '강', S: '특', X: '필살', dL: '↓+약', dH: '↓+강', dS: '↓+특' }

/** 장비 세트 (gfx/Painter KITS) */
export const KIT_OF: Record<string, string> = { dp: 'camera', director: 'director', sound: 'sound', gaffer: 'gaffer', art: 'art', makeup: 'makeup' }

/** 직급별 배율: 체력·공격력 (스테이지 모드) */
export const RANK_MUL = [0.85, 0.9, 0.95, 1, 1.06]

/** 스테이지 모드용: 그 직급에서 쓸 수 있는 기술만 남긴 캐릭터 */
export function atRank(c: CharacterData, rank: number): CharacterData {
  const moves: Record<MoveId, MoveData> = {}
  for (const [id, m] of Object.entries(c.moves)) if ((m.rank ?? 0) <= rank) moves[id] = m
  return { ...c, moves, combos: c.combos.filter((k) => moves[k.move]) }
}
