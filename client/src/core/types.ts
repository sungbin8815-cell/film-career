// 전투 로직 공용 타입. Phaser에 의존하지 않습니다 (온라인 서버·롤백에서도 같은 로직을 씀).
// 좌표: x = 스테이지 가로(px, 0~STAGE_W), y = 발바닥 기준 높이(지면 0, 위로 +)
// 시간 단위: 프레임 (1초 = 60프레임 고정)
import type { TraitId } from './Traits'

export const FPS = 60
/** 스테이지 가로 폭 (화면은 두 캐릭터를 따라가며 줌) */
export const STAGE_W = 1200
export const STAGE_H = 270
/** 화면(카메라) 기준 크기: 게임 캔버스는 480×270, 스테이지는 그보다 넓음 */
export const VIEW_W = 480

/** 한 프레임의 버튼 상태 (누르고 있는지) */
export interface InputState {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  light: boolean           // A 약공격
  heavy: boolean           // B 강공격
  special: boolean         // C 직업기 (직업 도구: 원거리·설치·소환)
  trait: boolean           // D 특성기 (고유 특성 조작)
  super: boolean           // R 궁극기 (SP 100)
  guard: boolean           // 직접 방어 (테스트용). 실제 조작은 상대 반대 방향을 누르면 자동 방어
  swap: boolean            // 태그 모드: 교체
  assist: boolean          // 태그 모드: 어시스트
}

export const emptyInput = (): InputState => ({
  left: false, right: false, up: false, down: false,
  light: false, heavy: false, special: false, trait: false, super: false, guard: false, swap: false, assist: false,
})

export interface Rect { x: number; y: number; w: number; h: number }

export type MoveId = string

/** 공격 버튼 */
export type Button = 'A' | 'B' | 'C' | 'D' | 'R'
/**
 * 입력 기록 토큰: 버튼 / 방향(f 앞·b 뒤·u 위·d 아래, 상대 기준) / 동작(dash 대시, bs 백스텝, jump 점프, airdash 공중 대시)
 * 커맨드는 이 토큰들의 순서로 정의합니다. 예) ['d','f','C'] = ↓→C, ['bs','C'] = 백스텝 직후 C, ['A','A','B'] = 약약강
 */
export type Tok = Button | 'f' | 'b' | 'u' | 'd' | 'dash' | 'bs' | 'jump' | 'airdash'

/** 캐릭터 고유 커맨드 */
export interface Command {
  seq: Tok[]
  move: MoveId
  /** 공중에서만 / 지상에서만 */
  air?: boolean
  ground?: boolean
}

/**
 * 기술 칸 이름: `${버튼}_${방향}`
 *  방향: n 중립 · f 앞 · b 뒤 · u 위 · d 아래 · air 공중 · aird 공중↓ · dash 대시 중
 *  변형: `${칸}~${모드}` (렌즈·변신·배역 등 특성 모드별 다른 기술)
 */
export type Slot = string

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
  kbY?: number             // 띄우기 (있으면 날아감·다운)
  /** 판정 박스: 캐릭터 앞쪽 기준. x = 몸 중심에서 앞으로 떨어진 거리, y = 지면에서 높이 */
  hitbox: Rect
  meterGain: number        // 맞혔을 때 얻는 SP
  cost?: number            // SP 소모 (궁극기 100)
  cd?: number              // 쿨타임 (프레임). 강한 기술에만
  dash?: number            // 발동 중 앞으로 이동 속도
  lift?: number            // 발동 순간 위로 튀어오름 (뛰어오르는 기술)
  multiHit?: { interval: number; max: number }  // 연속 판정
  projectile?: ProjectileSpec
  sfx?: string
  voice?: string           // 화면에 뜨는 외침
  combo?: boolean          // 커맨드 기술 (화면에 기술명 배너)
  finisher?: boolean       // 마무리 연출 (슬로모션·줌)
  lastHitKbY?: number      // 연속 판정의 마지막 타만 띄우기
  afterimage?: boolean     // 잔상
  juggle?: boolean         // 공중에 뜬 상대도 맞힘
  anim?: string            // 쓸 동작 (없으면 id). 't:템플릿:장비' = gfx/motions.ts 과장 동작
  rank?: number            // 스테이지 모드에서 배우는 직급 (0 막내 ~ 4 감독)
  desc?: string            // 기술표 설명
  armor?: number           // 슈퍼아머 (이만큼 맞아도 안 끊김)
  low?: boolean            // 하단 (앉아서 막아야 함)
  overhead?: boolean       // 중단 (서서 막아야 함)
  effect?: string          // 판정 순간 발동하는 특수 효과 (core/Traits.ts)
  expose?: number          // 조명 노출
  crit?: boolean           // 크리티컬 (촬영 망원 풀초점)
  pull?: boolean           // 맞으면 내 쪽으로 끌려옴
  copyOf?: string          // 배우가 따라 한 기술의 원래 캐릭터
  wallBounce?: boolean     // 벽에 부딪히면 튕겨 나옴 (추가타)
  groundBounce?: boolean   // 바닥에 튕겨 오름
  /** 누르고 있으면 모았다가 놓을 때 발동 (사운드 붐 여의봉 등) */
  hold?: { max: number; reach: number; dmg: number }
  /** 화면 연출용: 판정 범위를 따라 그리는 효과 (긴 붐대·빛줄기·베기 등) */
  vfx?: 'pole' | 'laser' | 'slash' | 'quake' | 'pillar' | 'cone' | 'whip' | 'claw' | 'film'
  /** 디버프 (분장): 맞히면 상대에게 */
  debuff?: { bleed?: number; slow?: number; blind?: number }
  /** 궁극기: 첫 타가 맞으면 전용 연출 (총 피해, 연출 프레임) */
  ult?: { total: number; cine: number }
  /** 공중에서 착지하면 끝나는 기술 */
  air?: boolean
  /** 콤보 레벨 (캔슬 순서). 없으면 버튼으로 정함: A1 B2 C3 D3 커맨드3 R5 */
  lvl?: number
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
  gy?: number              // 중력 (포물선)
  pull?: boolean           // 맞으면 쏜 사람 쪽으로 끌려옴
  blind?: number
  expose?: number
  crit?: boolean
  pierce?: boolean         // 맞아도 사라지지 않음 (관통)
  multiHit?: number        // 관통 투사체가 맞히는 최대 횟수
  debuff?: { bleed?: number; slow?: number; blind?: number }
  /** 목표 위치(상대 머리 위 등)에서 생성 */
  atTarget?: boolean
  wallBounce?: boolean
}

export interface CharacterData {
  id: string
  name: string
  nameEn: string
  color: string
  desc: string
  dept: string
  titles: [string, string, string, string, string]
  stats: { power: number; speed: number; reach: number }
  /** 선택 화면: 플레이스타일·난이도(1~3)·대표 기술 */
  style: string
  difficulty: number
  showcase: MoveId[]
  hp: number
  assist?: MoveId
  atk?: number
  walkSpeed: number
  runSpeed: number
  jumpV: number
  airSpeed: number
  gravity: number
  airDashes: number
  hurt: { w: number; h: number; crouchH: number }
  moves: Record<MoveId, MoveData>
  trait: TraitId
  /** 캐릭터 고유 커맨드 (긴 것부터 검사) */
  commands: Command[]
}

export type FighterStateName =
  | 'idle' | 'walk' | 'run' | 'dash' | 'backstep' | 'airdash' | 'jump' | 'fall' | 'crouch'
  | 'attack' | 'hit' | 'knockback' | 'knockdown' | 'guard'
  | 'victory' | 'defeat'

/** 화면 연출용 이벤트 (로직 → 그래픽·사운드) */
export type MatchEvent =
  | { type: 'hit'; x: number; y: number; attacker: number; damage: number; combo: number; heavy: boolean; finisher: boolean; launch: boolean; counter: boolean; crit?: boolean; moveName: string; sfx?: string; move?: MoveId }
  | { type: 'block'; x: number; y: number; attacker: number }
  | { type: 'move'; fighter: number; move: MoveId; name: string; combo: boolean; voice?: string; sfx?: string; afterimage?: boolean }
  | { type: 'super'; fighter: number }
  | { type: 'cine'; fighter: number; char: string; phase: 'start' | 'hit' | 'end' | 'whiff'; value?: number }
  | { type: 'ko'; winner: number; ult?: boolean }
  | { type: 'timeup' }
  | { type: 'round'; round: number }
  | { type: 'fight' }
  | { type: 'land'; fighter: number }
  | { type: 'knockdown'; fighter: number }
  | { type: 'jump'; fighter: number }
  | { type: 'dash'; fighter: number; kind: 'dash' | 'backstep' | 'airdash' }
  | { type: 'bounce'; fighter: number; kind: 'wall' | 'ground'; x: number; y: number }
  | { type: 'trait'; fighter: number; kind: string; x: number; value?: number; y?: number }
  | { type: 'armor'; fighter: number; x: number; y: number }
  | { type: 'tag'; team: number; kind: 'swap' | 'assist' | 'down' | 'in'; name: string }
