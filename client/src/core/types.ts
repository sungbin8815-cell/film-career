// 전투 로직 공용 타입. Phaser에 의존하지 않습니다(나중에 온라인 서버에서도 같은 로직을 씀).
// 좌표: x = 화면 가로(px, 0~STAGE_W), y = 발바닥 기준 높이(지면 0, 위로 +)
// 시간 단위: 프레임 (1초 = 60프레임 고정)

export const FPS = 60
export const STAGE_W = 480
export const STAGE_H = 270

/** 한 프레임의 버튼 상태 (누르고 있는지) */
export interface InputState {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  light: boolean
  heavy: boolean
  special: boolean
  guard: boolean
  super: boolean
}

export const emptyInput = (): InputState => ({
  left: false, right: false, up: false, down: false,
  light: false, heavy: false, special: false, guard: false, super: false,
})

export interface Rect { x: number; y: number; w: number; h: number }

export type MoveId = 'light' | 'heavy' | 'special1' | 'special2' | 'super'

/** 기술 프레임 데이터 */
export interface MoveData {
  id: MoveId
  name: string
  startup: number          // 발동 전 프레임
  active: number           // 판정이 살아있는 프레임
  recovery: number         // 끝난 뒤 경직 프레임
  damage: number
  chip: number             // 가드 시 깎이는 피해
  hitstun: number          // 맞은 쪽 경직
  blockstun: number        // 막은 쪽 경직
  kbX: number              // 넉백 속도 (px/프레임)
  kbY?: number             // 띄우기 (있으면 다운)
  /** 판정 박스: 캐릭터 앞쪽 기준. x = 몸 중심에서 앞으로 떨어진 거리, y = 지면에서 높이 */
  hitbox: Rect
  meterGain: number        // 맞혔을 때 얻는 게이지
  cost?: number            // 게이지 소모
  dash?: number            // 발동 중 앞으로 이동 속도
  multiHit?: { interval: number; max: number }  // 연속 판정
  projectile?: ProjectileSpec
  cancelInto?: MoveId[]    // 맞히거나 막혔을 때 경직을 끊고 이어갈 수 있는 기술
  sfx?: string
  voice?: string           // 화면에 뜨는 외침
}

export interface ProjectileSpec {
  kind: string
  offsetX: number          // 시전자 앞 거리
  startY: number           // 시작 높이
  vx: number
  vy: number               // 아래로 떨어지면 음수
  w: number
  h: number
  life: number
  damage: number
  chip: number
  hitstun: number
  blockstun: number
  kbX: number
  kbY?: number
}

export interface CharacterData {
  id: string
  name: string
  nameEn: string
  color: string
  desc: string
  implemented: boolean
  /** 캐릭터 선택 화면 능력치 1~5 */
  stats: { power: number; speed: number; reach: number }
  hp: number
  walkSpeed: number
  runSpeed: number
  jumpV: number
  airSpeed: number
  gravity: number
  hurt: { w: number; h: number; crouchH: number }
  moves: Partial<Record<MoveId, MoveData>>
}

export type FighterStateName =
  | 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'crouch'
  | 'attack' | 'hit' | 'knockback' | 'knockdown' | 'guard'
  | 'victory' | 'defeat'

/** 화면 연출용 이벤트 (로직 → 그래픽·사운드) */
export type MatchEvent =
  | { type: 'hit'; x: number; y: number; attacker: number; damage: number; combo: number; heavy: boolean; moveName: string }
  | { type: 'block'; x: number; y: number; attacker: number }
  | { type: 'whiff'; fighter: number; move: MoveId }
  | { type: 'move'; fighter: number; move: MoveId; voice?: string; sfx?: string }
  | { type: 'super'; fighter: number }
  | { type: 'ko'; winner: number }
  | { type: 'timeup' }
  | { type: 'round'; round: number }
  | { type: 'fight' }
  | { type: 'land'; fighter: number }
  | { type: 'jump'; fighter: number }
