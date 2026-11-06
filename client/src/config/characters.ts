// 캐릭터 데이터. 숫자만 바꿔도 밸런스가 바뀝니다. (체력 1000 기준)
// combos: 버튼 순서 → 새 기술 (L 약, H 강, S 특수, X 필살, d = ↓ 같이)
import type { CharacterData } from '../core/types'

export const DP: CharacterData = {
  id: 'dp',
  name: '촬영감독',
  nameEn: 'DP',
  color: '#3b82f6',
  desc: '장비 자부심 MAX. 구도에 민감한 밸런스형.',
  implemented: true,
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
      id: 'light', name: '카메라 손잡이 타격',
      startup: 4, active: 3, recovery: 9,
      damage: 40, chip: 4, hitstun: 16, blockstun: 9, kbX: 1.4,
      hitbox: { x: 8, y: 26, w: 24, h: 16 }, meterGain: 5,
      cancelInto: ['light', 'heavy', 'special1', 'special2', 'super'],
      sfx: 'light',
    },
    heavy: {
      id: 'heavy', name: '삼각대 휘두르기',
      startup: 10, active: 5, recovery: 18,
      damage: 85, chip: 10, hitstun: 22, blockstun: 15, kbX: 3.4,
      hitbox: { x: 6, y: 16, w: 40, h: 28 }, meterGain: 9,
      cancelInto: ['special1', 'special2', 'super'],
      sfx: 'heavy',
    },
    special1: {
      id: 'special1', name: '숄더 어택', voice: '비켜! 장비 지나간다!',
      startup: 8, active: 16, recovery: 18, cost: 25,
      damage: 95, chip: 14, hitstun: 26, blockstun: 16, kbX: 4.5, kbY: 3.2,
      hitbox: { x: 2, y: 12, w: 24, h: 32 }, meterGain: 0, dash: 4.8, afterimage: true,
      sfx: 'dash',
    },
    special2: {
      id: 'special2', name: '조명 낙하', voice: '조명 들어갑니다~!',
      startup: 14, active: 1, recovery: 22, cost: 25,
      damage: 0, chip: 0, hitstun: 0, blockstun: 0, kbX: 0,
      hitbox: { x: 0, y: 0, w: 0, h: 0 }, meterGain: 0,
      projectile: { kind: 'lightstand', offsetX: 66, startY: 150, vx: 0, vy: -5.5, w: 20, h: 26, life: 60,
        damage: 105, chip: 16, hitstun: 30, blockstun: 18, kbX: 1.5, kbY: 2.6 },
      sfx: 'drop',
    },
    super: {
      id: 'super', name: '원테이크', voice: '컷 없이 간다! 원테이크!!',
      startup: 14, active: 42, recovery: 22, cost: 100,
      damage: 52, chip: 8, hitstun: 18, blockstun: 10, kbX: 1.2, lastHitKbY: 6,
      hitbox: { x: 0, y: 8, w: 32, h: 40 }, meterGain: 0, dash: 3.6, afterimage: true, finisher: true, juggle: true,
      multiHit: { interval: 8, max: 5 },
      sfx: 'super',
    },

    // ───── 커맨드 콤보 기술 ─────
    upper: {
      id: 'upper', name: '트라이포드 어퍼', combo: true, finisher: true, juggle: true, voice: '하이앵글!!',
      startup: 6, active: 5, recovery: 22,
      damage: 72, chip: 8, hitstun: 24, blockstun: 14, kbX: 1.2, kbY: 7,
      hitbox: { x: 2, y: 24, w: 30, h: 40 }, meterGain: 10, dash: 2.4,
      cancelInto: ['special1', 'super'],
      sfx: 'heavy',
    },
    spin: {
      id: 'spin', name: '삼각대 회전베기', combo: true, voice: '360도 회전숏!',
      startup: 5, active: 14, recovery: 18,
      damage: 46, chip: 6, hitstun: 20, blockstun: 12, kbX: 2.6, lastHitKbY: 3.6,
      hitbox: { x: -14, y: 10, w: 56, h: 32 }, meterGain: 8, multiHit: { interval: 7, max: 2 }, juggle: true, finisher: true,
      sfx: 'heavy',
    },
    zoompunch: {
      id: 'zoompunch', name: '줌인 펀치', combo: true, finisher: true, voice: '줌~인!',
      startup: 9, active: 7, recovery: 20,
      damage: 98, chip: 12, hitstun: 26, blockstun: 16, kbX: 6.5, kbY: 2.4,
      hitbox: { x: 6, y: 20, w: 30, h: 22 }, meterGain: 10, dash: 3.4, afterimage: true,
      sfx: 'dash',
    },
    flash: {
      id: 'flash', name: '플래시 버스트', combo: true, voice: '찰칵! 눈부시지?',
      startup: 6, active: 4, recovery: 16, cost: 10,
      damage: 30, chip: 4, hitstun: 48, blockstun: 12, kbX: 0.6,
      hitbox: { x: -4, y: 10, w: 56, h: 50 }, meterGain: 4,
      cancelInto: ['heavy', 'special1', 'super'],
      sfx: 'shutter',
    },
    rush: {
      id: 'rush', name: '롱테이크 러시', combo: true, finisher: true, voice: '컷 안 해! 계속 가!',
      startup: 6, active: 32, recovery: 20, cost: 25,
      damage: 28, chip: 4, hitstun: 14, blockstun: 8, kbX: 1, lastHitKbY: 5,
      hitbox: { x: 2, y: 14, w: 30, h: 34 }, meterGain: 0, dash: 2.2, afterimage: true, juggle: true,
      multiHit: { interval: 6, max: 5 },
      sfx: 'dash',
    },
    sweep: {
      id: 'sweep', name: '로우앵글 스윕', combo: true, voice: '로우앵글!',
      startup: 8, active: 5, recovery: 18,
      damage: 62, chip: 8, hitstun: 20, blockstun: 12, kbX: 1.5, kbY: 2.2,
      hitbox: { x: 4, y: 0, w: 34, h: 12 }, meterGain: 7,
      cancelInto: ['special1', 'super'],
      sfx: 'heavy',
    },
  },
  combos: [
    { seq: ['L', 'L', 'H'], move: 'upper' },      // 약 약 강 → 트라이포드 어퍼 (띄우기)
    { seq: ['L', 'H', 'H'], move: 'zoompunch' },  // 약 강 강 → 줌인 펀치 (날려버리기)
    { seq: ['H', 'H'], move: 'spin' },            // 강 강 → 삼각대 회전베기
    { seq: ['L', 'L', 'S'], move: 'flash' },      // 약 약 특 → 플래시 버스트 (긴 경직)
    { seq: ['L', 'H', 'S'], move: 'rush' },       // 약 강 특 → 롱테이크 러시 (5연타)
    { seq: ['dH'], move: 'sweep' },               // ↓ + 강 → 로우앵글 스윕 (하단·다운)
  ],
}

// PHASE 2에서 구현할 캐릭터 (선택 화면에는 잠금으로 표시)
export const DIRECTOR: CharacterData = {
  ...DP, id: 'director', name: '연출감독', nameEn: 'DIRECTOR', color: '#ef4444', implemented: false,
  desc: '모든 걸 내 뜻대로. 근접·교란형.', stats: { power: 3, speed: 4, reach: 2 }, moves: {}, combos: [],
}
export const SOUND: CharacterData = {
  ...DP, id: 'sound', name: '사운드감독', nameEn: 'SOUND', color: '#22c55e', implemented: false,
  desc: '녹음 방해는 용서 못 해. 원거리·광역형.', stats: { power: 2, speed: 2, reach: 5 }, moves: {}, combos: [],
}

export const CHARACTERS: CharacterData[] = [DP, DIRECTOR, SOUND]
export const getCharacter = (id: string) => CHARACTERS.find((c) => c.id === id) ?? DP

/** 기술표용: 버튼 토큰 → 한글 */
export const BTN_LABEL: Record<string, string> = { L: '약', H: '강', S: '특', X: '필살', dL: '↓+약', dH: '↓+강', dS: '↓+특' }
