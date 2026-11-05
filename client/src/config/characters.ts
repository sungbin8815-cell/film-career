// 캐릭터 데이터. 숫자만 바꿔도 밸런스가 바뀝니다. (체력 1000 기준)
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
  hurt: { w: 22, h: 54, crouchH: 34 },
  moves: {
    light: {
      id: 'light', name: '카메라 손잡이 타격',
      startup: 4, active: 3, recovery: 8,
      damage: 42, chip: 4, hitstun: 15, blockstun: 9, kbX: 1.6,
      hitbox: { x: 8, y: 30, w: 24, h: 14 }, meterGain: 5,
      cancelInto: ['light', 'heavy', 'special1', 'special2', 'super'],
      sfx: 'light',
    },
    heavy: {
      id: 'heavy', name: '삼각대 휘두르기',
      startup: 10, active: 5, recovery: 17,
      damage: 88, chip: 10, hitstun: 22, blockstun: 15, kbX: 3.6,
      hitbox: { x: 6, y: 18, w: 38, h: 26 }, meterGain: 9,
      cancelInto: ['special1', 'special2', 'super'],
      sfx: 'heavy',
    },
    special1: {
      id: 'special1', name: '숄더 어택', voice: '비켜! 장비 지나간다!',
      startup: 8, active: 16, recovery: 18, cost: 25,
      damage: 95, chip: 14, hitstun: 26, blockstun: 16, kbX: 4.5, kbY: 3.2,
      hitbox: { x: 2, y: 14, w: 22, h: 32 }, meterGain: 0, dash: 4.8,
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
      damage: 52, chip: 8, hitstun: 18, blockstun: 10, kbX: 1.2, kbY: 4.2,
      hitbox: { x: 0, y: 10, w: 30, h: 40 }, meterGain: 0, dash: 3.6,
      multiHit: { interval: 8, max: 5 },
      sfx: 'super',
    },
  },
}

// PHASE 2에서 구현할 캐릭터 (선택 화면에는 잠금으로 표시)
export const DIRECTOR: CharacterData = {
  ...DP, id: 'director', name: '연출감독', nameEn: 'DIRECTOR', color: '#ef4444', implemented: false,
  desc: '모든 걸 내 뜻대로. 근접·교란형.', stats: { power: 3, speed: 4, reach: 2 }, moves: {},
}
export const SOUND: CharacterData = {
  ...DP, id: 'sound', name: '사운드감독', nameEn: 'SOUND', color: '#22c55e', implemented: false,
  desc: '녹음 방해는 용서 못 해. 원거리·광역형.', stats: { power: 2, speed: 2, reach: 5 }, moves: {},
}

export const CHARACTERS: CharacterData[] = [DP, DIRECTOR, SOUND]
export const getCharacter = (id: string) => CHARACTERS.find((c) => c.id === id) ?? DP
