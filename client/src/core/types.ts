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

/** 기본 기술 id + 콤보 기술 id (캐릭터 데이터에서 자유롭게 추가) */
export type MoveId = string

/** 버튼 토큰: L 약, H 강, S 특수, X 필살 / 앞에 d 붙으면 ↓ 같이 (dL dH dS) */
export type Btn = 'L' | 'H' | 'S' | 'X' | 'dL' | 'dH' | 'dS'

/** 커맨드 콤보: 버튼 순서 → 새 기술. 예) { seq: ['L','L','H'], move: 'upper' } */
export interface ComboDef { seq: Btn[]; move: MoveId }

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
  combo?: boolean          // 커맨드 콤보로만 나가는 기술 (화면에 기술명 배너)
  finisher?: boolean       // 마무리 연출 (줌 펀치·슬로모션)
  lastHitKbY?: number      // 연속 판정의 마지막 타만 띄우기
  afterimage?: boolean     // 잔상 연출
  juggle?: boolean         // 공중에 뜬 상대도 맞힘
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
  moves: Record<MoveId, MoveData>
  /** 커맨드 콤보 목록 (긴 것부터 검사) */
  combos: ComboDef[]
}

export type FighterStateName =
  | 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'crouch'
  | 'attack' | 'hit' | 'knockback' | 'knockdown' | 'guard'
  | 'victory' | 'defeat'

/** 화면 연출용 이벤트 (로직 → 그래픽·사운드) */
export type MatchEvent =
  | { type: 'hit'; x: number; y: number; attacker: number; damage: number; combo: number; heavy: boolean; finisher: boolean; launch: boolean; moveName: string }
  | { type: 'block'; x: number; y: number; attacker: number }
  | { type: 'whiff'; fighter: number; move: MoveId }
  | { type: 'move'; fighter: number; move: MoveId; name: string; combo: boolean; voice?: string; sfx?: string; afterimage?: boolean }
  | { type: 'super'; fighter: number }
  | { type: 'ko'; winner: number }
  | { type: 'timeup' }
  | { type: 'round'; round: number }
  | { type: 'fight' }
  | { type: 'land'; fighter: number }
  | { type: 'knockdown'; fighter: number }
  | { type: 'jump'; fighter: number }
