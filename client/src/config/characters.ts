// 캐릭터 데이터. 숫자만 바꿔도 밸런스가 바뀝니다. (체력 1000 기준)
// 스킬 구조 (LoL처럼): 약·강 기본기 + Q(특) · W(↓특 또는 W 버튼) · E(고유) · R(필살, SP 100) + 캐릭터 패시브·고유 게이지
//   Q·W·E는 쿨타임(cd, 프레임), R은 SP 게이지. 특수 효과는 effect 이름으로 core/Traits.ts에서 처리
// combos: 버튼 순서 → 새 기술 (L 약, H 강, S Q, X 필살, d = ↓ 같이)
// rank: 스테이지 모드에서 그 기술을 쓸 수 있게 되는 직급 (0 막내 · 1 서드 · 2 세컨드 · 3 퍼스트 · 4 감독)
// anim: 쓸 동작 (gfx/poses.ts, gfx/charPoses.ts의 이름). 없으면 기술 id와 같은 동작
// 기술표 전체는 MOVES.md (npm run moves 로 다시 만들 수 있음)
import type { CharacterData, ComboDef, MoveData, MoveId } from '../core/types'

/** 판정 없이 효과만 내는 스킬 (startup 프레임에 effect 발동) */
function fx(id: MoveId, name: string, effect: string, startup: number, recovery: number, o: Partial<MoveData> = {}): MoveData {
  return { id, name, effect, rank: 0, startup, active: 1, recovery, damage: 0, chip: 0, hitstun: 0, blockstun: 0, kbX: 0, hitbox: { x: 0, y: 0, w: 0, h: 0 }, meterGain: 0, sfx: 'trait', ...o }
}

const TITLES = (head: string): CharacterData['titles'] => ['막내', '서드', '세컨드', '퍼스트', head]
/** 모든 캐릭터가 같은 입력으로 쓰는 커맨드 콤보 */
const STD_COMBOS: ComboDef[] = [
  { seq: ['L', 'L', 'L'], move: 'jab3' },       // 약 약 약 → 3타 마무리
  { seq: ['L', 'L', 'H'], move: 'upper' },      // 약 약 강 → 띄우기
  { seq: ['L', 'H', 'H'], move: 'zoompunch' },  // 약 강 강 → 날려버리기
  { seq: ['H', 'H'], move: 'spin' },            // 강 강 → 회전 2연타
  { seq: ['L', 'L', 'S'], move: 'flash' },      // 약 약 Q → 긴 경직 (SP 10)
  { seq: ['L', 'H', 'S'], move: 'rush' },       // 약 강 Q → 연타 러시 (SP 25)
  { seq: ['dL'], move: 'lowjab' },              // ↓ + 약 → 빠른 하단
  { seq: ['dH'], move: 'sweep' },               // ↓ + 강 → 하단 다운
]

export const DP: CharacterData = {
  id: 'dp', atk: 0.93, assist: 'special1', name: '촬영감독', nameEn: 'DP', color: '#3b82f6', dept: '촬영부', titles: TITLES('촬영감독'), trait: 'lens',
  desc: '렌즈를 갈아 끼우며 싸우는 만능형. 광각은 러시, 망원은 저격.',
  stats: { power: 3, speed: 3, reach: 3 },
  hp: 1060, walkSpeed: 1.7, runSpeed: 3.4, jumpV: 6.4, airSpeed: 2.0, gravity: 0.36,
  hurt: { w: 22, h: 50, crouchH: 32 },
  moves: {
    // ───── 기본기 ─────
    light: { id: 'light', rank: 0, name: '카메라 손잡이 타격', startup: 4, active: 3, recovery: 9, damage: 40, chip: 4, hitstun: 16, blockstun: 9, kbX: 1.4,
      hitbox: { x: 8, y: 26, w: 24, h: 16 }, meterGain: 5, cancelInto: ['light', 'heavy', 'special1', 'special2', 'super', 'trait'], sfx: 'light' },
    heavy: { id: 'heavy', rank: 0, name: '삼각대 휘두르기', startup: 10, active: 5, recovery: 18, damage: 85, chip: 10, hitstun: 22, blockstun: 15, kbX: 3.4,
      hitbox: { x: 6, y: 16, w: 40, h: 28 }, meterGain: 9, cancelInto: ['special1', 'special2', 'super', 'trait'], sfx: 'heavy' },
    jl: { id: 'jl', rank: 0, name: '점프 카메라 내려치기', startup: 4, active: 8, recovery: 6, damage: 36, chip: 4, hitstun: 16, blockstun: 9, kbX: 1.2, overhead: true,
      hitbox: { x: 4, y: 0, w: 22, h: 26 }, meterGain: 4, sfx: 'light' },
    jh: { id: 'jh', rank: 0, name: '점프 삼각대 찍기', startup: 7, active: 8, recovery: 10, damage: 70, chip: 8, hitstun: 22, blockstun: 14, kbX: 2.4, overhead: true,
      hitbox: { x: 0, y: -6, w: 34, h: 30 }, meterGain: 7, sfx: 'heavy' },
    // ───── 스킬 ─────
    special1: { id: 'special1', rank: 0, name: '숄더 어택', voice: '비켜! 장비 지나간다!', cd: 180, startup: 8, active: 16, recovery: 18,
      damage: 90, chip: 14, hitstun: 26, blockstun: 16, kbX: 4.5, kbY: 3.2, hitbox: { x: 2, y: 12, w: 24, h: 32 }, meterGain: 6, dash: 4.8, afterimage: true, sfx: 'dash' },
    special2: { id: 'special2', rank: 1, name: '조명 낙하', voice: '조명 들어갑니다~!', cd: 300, startup: 14, active: 1, recovery: 22,
      damage: 0, chip: 0, hitstun: 0, blockstun: 0, kbX: 0, hitbox: { x: 0, y: 0, w: 0, h: 0 }, meterGain: 0,
      projectile: { kind: 'lightstand', offsetX: 66, startY: 150, vx: 0, vy: -5.5, w: 20, h: 26, life: 60, damage: 105, chip: 16, hitstun: 30, blockstun: 18, kbX: 1.5, kbY: 2.6 }, sfx: 'drop' },
    // 광각 렌즈일 때 Q·W
    special1_wide: { id: 'special1_wide', rank: 0, name: '핸드헬드 러시', voice: '바짝 붙어서 찍는다!', anim: 'rush', cd: 150, startup: 5, active: 24, recovery: 16,
      damage: 24, chip: 4, hitstun: 14, blockstun: 8, kbX: 0.8, lastHitKbY: 4, hitbox: { x: 2, y: 14, w: 26, h: 32 }, meterGain: 5, dash: 3.2, multiHit: { interval: 6, max: 4 }, afterimage: true, juggle: true, sfx: 'dash' },
    special2_wide: { id: 'special2_wide', rank: 1, name: '로우앵글 슬라이딩', voice: '로우앵글 간다!', anim: 'sweep', cd: 240, startup: 6, active: 14, recovery: 16,
      damage: 64, chip: 8, hitstun: 20, blockstun: 12, kbX: 1.8, kbY: 2.6, low: true, hitbox: { x: 2, y: 0, w: 32, h: 14 }, meterGain: 6, dash: 4.2, sfx: 'dash' },
    // 망원 렌즈일 때 Q·W (초점이 가득 차면 크리티컬)
    special1_tele: { id: 'special1_tele', rank: 0, name: '망원 스나이프', voice: '포커스… 찰칵!', anim: 'flash', cd: 150, startup: 12, active: 1, recovery: 18,
      damage: 0, chip: 0, hitstun: 0, blockstun: 0, kbX: 0, hitbox: { x: 0, y: 0, w: 0, h: 0 }, meterGain: 0,
      projectile: { kind: 'snipe', offsetX: 26, startY: 30, vx: 9, vy: 0, w: 18, h: 10, life: 50, damage: 66, chip: 10, hitstun: 24, blockstun: 14, kbX: 2.6 }, sfx: 'shutter' },
    special2_tele: { id: 'special2_tele', rank: 1, name: '줌인 당기기', voice: '줌~ 인!', anim: 'zoompunch', cd: 300, startup: 10, active: 1, recovery: 20,
      damage: 0, chip: 0, hitstun: 0, blockstun: 0, kbX: 0, hitbox: { x: 0, y: 0, w: 0, h: 0 }, meterGain: 0,
      projectile: { kind: 'snipe', offsetX: 24, startY: 26, vx: 7, vy: 0, w: 18, h: 14, life: 40, damage: 40, chip: 6, hitstun: 30, blockstun: 14, kbX: 4, pull: true }, sfx: 'shutter' },
    super: { id: 'super', rank: 3, name: '원테이크', voice: '컷 없이 간다! 원테이크!!', startup: 14, active: 42, recovery: 22, cost: 100,
      damage: 52, chip: 8, hitstun: 18, blockstun: 10, kbX: 1.2, lastHitKbY: 6, hitbox: { x: 0, y: 8, w: 32, h: 40 }, meterGain: 0, dash: 3.6, afterimage: true, finisher: true, juggle: true,
      multiHit: { interval: 8, max: 5 }, sfx: 'super' },
    trait: fx('trait', '렌즈 교체', 'lens', 10, 6, { cd: 90 }),

    // ───── 커맨드 콤보 기술 ─────
    jab3: { id: 'jab3', rank: 0, name: '3타 렌즈캡 날리기', combo: true, startup: 5, active: 4, recovery: 16, damage: 52, chip: 6, hitstun: 20, blockstun: 12, kbX: 4.2,
      hitbox: { x: 8, y: 22, w: 28, h: 20 }, meterGain: 7, cancelInto: ['special1', 'special2', 'super', 'trait'], sfx: 'heavy' },
    lowjab: { id: 'lowjab', rank: 0, name: '발목 노리기', combo: true, startup: 4, active: 3, recovery: 10, damage: 30, chip: 3, hitstun: 14, blockstun: 8, kbX: 1, low: true,
      hitbox: { x: 6, y: 0, w: 26, h: 14 }, meterGain: 4, cancelInto: ['light', 'special1', 'special2', 'super', 'trait'], sfx: 'light' },
    upper: { id: 'upper', rank: 1, name: '트라이포드 어퍼', combo: true, finisher: true, juggle: true, voice: '하이앵글!!', startup: 6, active: 5, recovery: 22,
      damage: 72, chip: 8, hitstun: 24, blockstun: 14, kbX: 1.2, kbY: 7, hitbox: { x: 2, y: 24, w: 30, h: 40 }, meterGain: 10, dash: 2.4, cancelInto: ['special1', 'super', 'trait'], sfx: 'heavy' },
    spin: { id: 'spin', rank: 2, name: '삼각대 회전베기', combo: true, voice: '360도 회전숏!', startup: 5, active: 14, recovery: 18,
      damage: 46, chip: 6, hitstun: 20, blockstun: 12, kbX: 2.6, lastHitKbY: 3.6, hitbox: { x: -14, y: 10, w: 56, h: 32 }, meterGain: 8, multiHit: { interval: 7, max: 2 }, juggle: true, finisher: true, sfx: 'heavy' },
    zoompunch: { id: 'zoompunch', rank: 2, name: '줌인 펀치', combo: true, finisher: true, voice: '줌~인!', startup: 9, active: 7, recovery: 20,
      damage: 98, chip: 12, hitstun: 26, blockstun: 16, kbX: 6.5, kbY: 2.4, hitbox: { x: 6, y: 20, w: 30, h: 22 }, meterGain: 10, dash: 3.4, afterimage: true, sfx: 'dash' },
    flash: { id: 'flash', rank: 2, name: '플래시 버스트', combo: true, voice: '찰칵! 눈부시지?', startup: 6, active: 4, recovery: 16, cost: 10,
      damage: 30, chip: 4, hitstun: 48, blockstun: 12, kbX: 0.6, hitbox: { x: -4, y: 10, w: 56, h: 50 }, meterGain: 4, cancelInto: ['heavy', 'special1', 'super', 'trait'], sfx: 'shutter', expose: 30 },
    rush: { id: 'rush', rank: 3, name: '롱테이크 러시', combo: true, finisher: true, voice: '컷 안 해! 계속 가!', startup: 6, active: 32, recovery: 20, cost: 25,
      damage: 28, chip: 4, hitstun: 14, blockstun: 8, kbX: 1, lastHitKbY: 5, hitbox: { x: 2, y: 14, w: 30, h: 34 }, meterGain: 0, dash: 2.2, afterimage: true, juggle: true, multiHit: { interval: 6, max: 5 }, sfx: 'dash' },
    sweep: { id: 'sweep', rank: 0, name: '로우앵글 스윕', combo: true, voice: '로우앵글!', startup: 8, active: 5, recovery: 18, low: true,
      damage: 62, chip: 8, hitstun: 20, blockstun: 12, kbX: 1.5, kbY: 2.2, hitbox: { x: 4, y: 0, w: 34, h: 12 }, meterGain: 7, cancelInto: ['special1', 'super', 'trait'], sfx: 'heavy' },
  },
  combos: STD_COMBOS,
}

/** 촬영감독 기본기·콤보를 바탕으로 이름·수치만 바꿔 새 캐릭터 기술표를 만듦 (렌즈 전용 기술은 제외) */
type Over = Partial<MoveData> & { name: string }
const SHARED = ['light', 'heavy', 'jl', 'jh', 'super', 'jab3', 'lowjab', 'upper', 'spin', 'zoompunch', 'flash', 'rush', 'sweep']
function derive(over: Record<MoveId, Over>, own: Record<MoveId, MoveData>): Record<MoveId, MoveData> {
  const out: Record<MoveId, MoveData> = {}
  for (const id of SHARED) {
    const base = DP.moves[id]!
    const o = over[id]
    out[id] = { ...base, voice: undefined, expose: undefined, ...o, id, anim: o?.anim ?? id }
  }
  // W는 스테이지 모드 '서드'부터
  for (const [id, m] of Object.entries(own)) out[id] = { ...m, id, rank: id === 'special2' ? 1 : m.rank ?? 0 }
  return out
}
/** 스킬 하나 (판정 있는 기술) — 촬영감독 숄더 어택 수치를 기본으로 */
const skill = (id: MoveId, o: Partial<MoveData> & { name: string }): MoveData => ({ ...DP.moves.special1!, dash: undefined, afterimage: false, kbY: undefined, voice: undefined, ...o, id })
const noHit = { damage: 0, chip: 0, hitstun: 0, blockstun: 0, kbX: 0, hitbox: { x: 0, y: 0, w: 0, h: 0 }, active: 1 }

// ─────────── 연출감독: 함정·구속·전장 통제 (CC형) ───────────
export const DIRECTOR: CharacterData = {
  ...DP, atk: 0.97, assist: 'zoompunch', id: 'director', name: '연출감독', nameEn: 'DIRECTOR', color: '#ef4444', dept: '연출부', titles: TITLES('감독'), trait: 'mark',
  desc: '콘티(함정)를 깔고 큐 사인으로 터뜨리는 전장 설계자. NG!로 공격을 끊는다.', stats: { power: 3, speed: 4, reach: 2 },
  hp: 950, walkSpeed: 1.9, runSpeed: 3.8, jumpV: 6.6,
  moves: derive({
    light: { name: '슬레이트 딱!', startup: 4, recovery: 9, damage: 38, sfx: 'slate' },
    heavy: { name: '메가폰 후려치기', startup: 9, damage: 88 },
    jl: { name: '점프 슬레이트', damage: 34 }, jh: { name: '점프 메가폰 찍기', damage: 66 },
    super: { name: '리테이크!!', voice: '컷! 다시 갑니다! 리테이크!!', effect: 'retake', ...noHit, startup: 12, active: 1, recovery: 26, multiHit: undefined, dash: undefined, lastHitKbY: undefined, finisher: false },
    jab3: { name: '컷 사인 손날', damage: 48 },
    lowjab: { name: '발 위치 체크', damage: 28 },
    upper: { name: 'NG 어퍼', voice: 'NG!!' },
    zoompunch: { name: 'OK 컷 내려찍기', voice: '오케이~ 컷!', dash: 2.6 },
    spin: { name: '메가폰 회전', voice: '다들 집중!' },
    flash: { name: '슬레이트 플래시', voice: '씬 원, 컷 원!' },
    rush: { name: '디렉션 폭풍', voice: '거기! 아니 거기! 아니!' },
    sweep: { name: '발 맞춰!', voice: '동선 확인!' },
  }, {
    // Q: 콘티 설치 (밟으면 묶임, 최대 3개)
    special1: fx('special1', '콘티 설치', 'trap', 10, 12, { cd: 70, voice: '여기서 대기!', anim: 'trait' }),
    // W: NG! (받아치기 자세: 맞으면 공격을 끊고 상대가 굳음)
    special2: fx('special2', 'NG!', 'parry', 3, 18, { cd: 210, active: 22, voice: 'NG!!', anim: 'parry' }),
    // E: 큐 사인 (깔아 둔 콘티를 한꺼번에 터뜨림)
    trait: fx('trait', '큐 사인', 'cue', 8, 14, { cd: 90, voice: '큐!!', anim: 'flash' }),
  }),
}

// ─────────── 사운드감독: 맞으면서 모았다가 한 방에 (축적 방출형 탱커) ───────────
export const SOUND: CharacterData = {
  ...DP, atk: 0.76, assist: 'special1', id: 'sound', name: '사운드감독', nameEn: 'SOUND', color: '#22c55e', dept: '녹음부', titles: TITLES('녹음감독'), trait: 'rec',
  desc: '느리지만 단단한 탱커. 맞고 막을수록 사운드 게이지가 차고, SOUND OVER로 터뜨린다.', stats: { power: 4, speed: 2, reach: 5 },
  hp: 1060, walkSpeed: 1.45, runSpeed: 3.0, jumpV: 6.1,
  moves: derive({
    light: { name: '붐 찌르기', startup: 6, active: 4, recovery: 12, damage: 40, hitbox: { x: 16, y: 26, w: 34, h: 14 } },
    heavy: { name: '붐 스윙', startup: 15, recovery: 24, damage: 88, hitbox: { x: -6, y: 8, w: 66, h: 40 }, kbX: 4 },
    jl: { name: '점프 붐 찌르기', damage: 36, hitbox: { x: 10, y: 0, w: 30, h: 22 } }, jh: { name: '점프 붐 내려치기', damage: 74, hitbox: { x: 4, y: -8, w: 44, h: 30 } },
    super: { name: '동시녹음 풀레벨', voice: '레벨 최대!! 전원 정숙!!', anim: 'super', dash: undefined, damage: 40, hitbox: { x: -20, y: 0, w: 150, h: 60 }, multiHit: { interval: 9, max: 5 }, sfx: 'wave' },
    jab3: { name: '붐 3단 찌르기', damage: 52, hitbox: { x: 16, y: 22, w: 36, h: 18 } },
    lowjab: { name: '케이블 툭', damage: 30, hitbox: { x: 10, y: 0, w: 34, h: 12 } },
    upper: { name: '붐 퍼올리기', voice: '마이크 올립니다!', hitbox: { x: 4, y: 24, w: 34, h: 44 } },
    zoompunch: { name: '털뭉치 강타', voice: '바람 소리 컷!', dash: 1.8, hitbox: { x: 14, y: 20, w: 40, h: 22 } },
    spin: { name: '붐 헬리콥터', voice: '360도 수음!', hitbox: { x: -20, y: 10, w: 70, h: 32 } },
    flash: { name: '피드백 노이즈', voice: '지지직—!' },
    rush: { name: '음파 난타', voice: '들려? 들리냐고!' },
    sweep: { name: '케이블 걸기', voice: '선 밟지 마세요!', hitbox: { x: 4, y: 0, w: 46, h: 12 } },
  }, {
    // Q: 저음 충격파 (멀리 가는 묵직한 음파)
    special1: skill('special1', { name: '저음 충격파', voice: '우우우웅—', ...noHit, cd: 280, startup: 18, recovery: 24,
      projectile: { kind: 'wave', offsetX: 30, startY: 10, vx: 3.8, vy: 0, w: 22, h: 40, life: 80, damage: 52, chip: 12, hitstun: 26, blockstun: 16, kbX: 3 }, sfx: 'wave' }),
    // W: 노이즈 월 (앞을 소리로 막음: 막을 때마다 게이지 +)
    special2: fx('special2', '노이즈 월', 'noisewall', 4, 16, { cd: 240, active: 36, voice: '노이즈 차단!', sfx: 'wave' }),
    // E: SOUND OVER (게이지를 한 번에 방출: 많이 모을수록 넓고 셈)
    trait: fx('trait', 'SOUND OVER', 'soundover', 12, 22, { cd: 60, voice: 'SOUND… OVER!!', sfx: 'wave' }),
  }),
}

// ─────────── 조명감독: 빛을 쌓아 스턴 → 콤보 (스턴 콤보형) ───────────
export const GAFFER: CharacterData = {
  ...DP, atk: 0.95, assist: 'special1', id: 'gaffer', name: '조명감독', nameEn: 'GAFFER', color: '#f59e0b', dept: '조명부', titles: TITLES('조명감독'), trait: 'light',
  desc: '빛을 비출수록 상대 노출이 쌓이고, 가득 차면 눈부셔 기절. 그 틈에 콤보를 퍼붓는다.', stats: { power: 4, speed: 3, reach: 3 },
  hp: 1000, walkSpeed: 1.6, runSpeed: 3.2, jumpV: 6.2,
  moves: derive({
    light: { name: 'LED 패널 치기', startup: 5, recovery: 10, damage: 42, expose: 6 },
    heavy: { name: 'C스탠드 휘두르기', startup: 12, recovery: 20, damage: 94, kbX: 4, hitbox: { x: 6, y: 14, w: 44, h: 30 } },
    jl: { name: '점프 LED', damage: 36, expose: 6 }, jh: { name: '점프 스탠드 찍기', damage: 72 },
    super: { name: '풀 파워!!', voice: '18K 풀 파워!!!', ...noHit, active: 1, recovery: 30, dash: undefined, multiHit: undefined, finisher: true,
      projectile: { kind: 'beam', offsetX: 46, startY: 1, vx: 2.6, vy: 0, w: 24, h: 70, life: 80, damage: 200, chip: 30, hitstun: 40, blockstun: 24, kbX: 3, kbY: 6.5, expose: 100 }, sfx: 'super' },
    jab3: { name: '하이빔 3타', damage: 50, expose: 10 },
    lowjab: { name: '발밑 조명', damage: 30, expose: 6 },
    upper: { name: '스탠드 어퍼', voice: '라이트 업!', damage: 76 },
    zoompunch: { name: '백열등 강타', voice: '뜨겁지?', damage: 100, expose: 12 },
    spin: { name: '스탠드 회전', voice: '돌려!', damage: 50 },
    flash: { name: 'HMI 섬광', voice: '눈 감아!!', expose: 34 },
    rush: { name: '전압 러시', voice: '과부하다아!', damage: 30 },
    sweep: { name: '바닥 구르기', voice: '발밑 조심!', damage: 66 },
  }, {
    // Q: 키라이트 (정면 빛줄기 3연타: 노출 +)
    special1: skill('special1', { name: '키라이트', voice: '키라이트 온!', anim: 'flash', cd: 150, startup: 9, active: 15, recovery: 16, damage: 16, chip: 2, hitstun: 16, blockstun: 10, kbX: 0.6,
      hitbox: { x: 10, y: 18, w: 82, h: 18 }, multiHit: { interval: 5, max: 3 }, expose: 13, meterGain: 3, sfx: 'shutter' }),
    // W: 백라이트 (상대 뒤에서 빛을 쏴 내 쪽으로 끌어옴)
    special2: fx('special2', '백라이트', 'backlight', 12, 16, { cd: 240, voice: '역광이다!', anim: 'special2' }),
    // E: 팔로우 스폿 (4초 동안 상대를 따라다니며 노출)
    trait: fx('trait', '팔로우 스폿', 'followspot', 14, 10, { cd: 540, voice: '스폿 따라가!' }),
  }),
}

// ─────────── 미술감독: 구조물로 전장을 바꿈 (지형 생성형) ───────────
export const ART: CharacterData = {
  ...DP, atk: 1.05, assist: 'trait', id: 'art', name: '미술감독', nameEn: 'ART', color: '#a855f7', dept: '미술부', titles: TITLES('미술감독'), trait: 'wall',
  desc: '제작 포인트로 애플박스·세트벽·소파를 만들어 전장을 내 무대로. 높은 곳에선 더 세다.', stats: { power: 4, speed: 3, reach: 3 },
  hp: 1040,
  moves: derive({
    light: { name: '망치 콩!', startup: 4, damage: 42, sfx: 'light' },
    heavy: { name: '롤러 휘두르기', startup: 11, damage: 88 },
    jl: { name: '점프 망치', damage: 38 }, jh: { name: '점프 롤러 찍기', damage: 74 },
    super: { name: '세트 체인지!!', voice: '전부 철거하고 새로 짓는다!!', effect: 'setchange', dash: 3.2, damage: 46, multiHit: { interval: 7, max: 6 } },
    jab3: { name: '못 박기 3타', damage: 52 },
    lowjab: { name: '정강이 망치', damage: 30 },
    upper: { name: '망치 점프 어퍼', voice: '천장까지!' },
    zoompunch: { name: '대못 박기', voice: '쾅!!', damage: 102 },
    spin: { name: '롤러 회전', voice: '한 번 더 칠한다!' },
    flash: { name: '페인트 폭탄', voice: '색 좀 입혀줄게!' },
    rush: { name: '연속 망치질', voice: '뚝딱뚝딱뚝딱!' },
    sweep: { name: '바닥 칠하기', voice: '바닥 마르기 전이야!' },
  }, {
    // Q: 애플박스 (발판: 올라서면 공격력 +15%, 하단기를 피함) — 제작 포인트 25
    special1: fx('special1', '애플박스', 'applebox', 12, 12, { cd: 60, voice: '애플박스!', anim: 'trait' }),
    // W: 페이크 월 (투사체·이동 차단, 벽꽝) — 제작 포인트 35
    special2: fx('special2', '페이크 월', 'wall', 14, 12, { cd: 90, voice: '벽 세웁니다!', anim: 'trait' }),
    // E: 소파 드롭 (상대 머리 위로 소파 낙하) — 제작 포인트 40
    trait: fx('trait', '소파 드롭', 'sofa', 12, 16, { cd: 120, voice: '소파 들어갑니다~!', anim: 'special2' }),
  }),
}

// ─────────── 분장실장: 분장막으로 버티다 한 번에 쏟아냄 (자원 관리 카운터형) ───────────
export const MAKEUP: CharacterData = {
  ...DP, atk: 0.86, assist: 'special2', id: 'makeup', name: '분장실장', nameEn: 'MAKEUP', color: '#ec4899', dept: '분장팀', titles: TITLES('분장실장'), trait: 'makeup',
  desc: '분장막이 피해를 흡수한다. 지킬지, 클렌징으로 한 번에 터뜨릴지 고르는 빠른 서바이버.', stats: { power: 2, speed: 5, reach: 2 },
  hp: 920, walkSpeed: 2.05, runSpeed: 4.1, jumpV: 6.8, airSpeed: 2.3,
  moves: derive({
    light: { name: '퍼프 톡', startup: 3, active: 2, recovery: 7, damage: 31, hitstun: 15 },
    heavy: { name: '브러시 휘두르기', startup: 9, recovery: 16, damage: 70 },
    jl: { name: '점프 퍼프', damage: 30 }, jh: { name: '점프 브러시', damage: 62 },
    super: { name: '풀메이크업!!', voice: '완벽하게 만들어 줄게!!', effect: 'fullmakeup', dash: 4.2, damage: 28, multiHit: { interval: 5, max: 8 } },
    jab3: { name: '컨실러 톡톡톡', damage: 44 },
    lowjab: { name: '발끝 파우더', damage: 26 },
    upper: { name: '하이킥 어퍼', voice: '턱선 살리고~', damage: 64 },
    zoompunch: { name: '컬링 스트라이크', voice: '볼륨 업!', damage: 86 },
    spin: { name: '브러시 회전', voice: '쉐딩 쉐딩~', damage: 40 },
    flash: { name: '반짝 펄', voice: '하이라이터 반짝!' },
    rush: { name: '메이크업 러시', voice: '톡톡톡톡톡!', damage: 24, multiHit: { interval: 5, max: 6 } },
    sweep: { name: '쓸어담기', voice: '정리 끝~', damage: 52 },
  }, {
    // Q: 베이스 (분장막 +35)
    special1: fx('special1', '베이스', 'base', 10, 12, { cd: 240, voice: '베이스 깔고~', anim: 'flash' }),
    // W: 파우더 블라인드 (맞은 상대는 판정이 작아짐)
    special2: skill('special2', { name: '파우더 블라인드', voice: '파우더~ 팡!', ...noHit, cd: 270, startup: 10, recovery: 18,
      projectile: { kind: 'spray', offsetX: 20, startY: 18, vx: 2.6, vy: 0, w: 26, h: 30, life: 80, damage: 30, chip: 4, hitstun: 30, blockstun: 12, kbX: 0.8, blind: 180 }, sfx: 'spray' }),
    // E: 클렌징 (분장막을 전부 써서 주변 폭발, 가드 불가)
    trait: fx('trait', '클렌징', 'cleanse', 10, 18, { cd: 120, voice: '싹— 지워!!' }),
  }),
}

// ─────────── 배우: 상대 기술을 보고 따라 함 (카피형) ───────────
export const ACTOR: CharacterData = {
  ...DP, atk: 1.1, assist: 'special1', id: 'actor', name: '배우', nameEn: 'ACTOR', color: '#14b8a6', dept: '연기팀', titles: ['단역', '조연', '주연', '톱스타', '명배우'], trait: 'copy',
  desc: '상대 스킬을 두 번 보면 따라 한다(Q·W 칸). 즉흥 연기로 바로 베끼고, 필살은 상대 필살을 흉내.', stats: { power: 3, speed: 4, reach: 3 },
  hp: 1010, walkSpeed: 1.85, runSpeed: 3.7, jumpV: 6.6,
  moves: derive({
    light: { name: '소품 칼 찌르기', startup: 4, damage: 42 },
    heavy: { name: '소품 칼 베기', startup: 10, damage: 90, hitbox: { x: 4, y: 14, w: 44, h: 30 } },
    jl: { name: '점프 찌르기', damage: 36 }, jh: { name: '점프 내려베기', damage: 70 },
    super: { name: '명연기 (상대 필살 따라하기)', voice: '이 장면… 내가 더 잘해!' },
    jab3: { name: '결투 3연격', damage: 50 },
    lowjab: { name: '발등 찍기', damage: 28 },
    upper: { name: '칼 올려베기', voice: '클라이맥스!' },
    zoompunch: { name: '돌진 찌르기', voice: '액션!' },
    spin: { name: '회전 베기', voice: '롱테이크로 간다!' },
    flash: { name: '플래시 포즈', voice: '찍어 주세요~' },
    rush: { name: '난무', voice: '이건 애드리브!' },
    sweep: { name: '구르며 베기', voice: '대역 없이!' },
  }, {
    // Q·W 기본: 따라 하기 전까지 쓰는 연기 기술. 상대 스킬을 두 번 보면 이 자리에 복사됨
    special1: skill('special1', { name: '마임 펀치', voice: '보이지 않는 주먹!', cd: 150, startup: 7, active: 10, recovery: 16, damage: 64, hitstun: 22, kbX: 3.4, hitbox: { x: 4, y: 18, w: 28, h: 24 }, dash: 3.6, afterimage: true, sfx: 'dash' }),
    special2: fx('special2', '스턴트 구르기', 'roll', 2, 14, { cd: 150, active: 16, voice: '대역 없이 간다!', dash: 3.6 }),
    // E: 즉흥 연기 (상대가 방금 쓴 스킬을 바로 따라 함)
    trait: fx('trait', '즉흥 연기', 'improv', 8, 12, { cd: 600, voice: '방금 그거… 나도 할 수 있어!' }),
  }),
}

export const CHARACTERS: CharacterData[] = [DP, DIRECTOR, SOUND, GAFFER, ART, MAKEUP, ACTOR]
export const getCharacter = (id: string) => CHARACTERS.find((c) => c.id === id) ?? DP

/** 기술표용: 버튼 토큰 → 한글 */
export const BTN_LABEL: Record<string, string> = { L: '약', H: '강', S: 'Q', X: 'R', dL: '↓+약', dH: '↓+강', dS: 'W' }

/** 장비 세트 (gfx/Painter KITS) */
export const KIT_OF: Record<string, string> = { dp: 'camera', director: 'director', sound: 'sound', gaffer: 'gaffer', art: 'art', makeup: 'makeup', actor: 'actor' }

/** 직급별 배율: 체력·공격력 (스테이지 모드) */
export const RANK_MUL = [0.85, 0.9, 0.95, 1, 1.06]

/** 스테이지 모드용: 그 직급에서 쓸 수 있는 기술만 남긴 캐릭터 */
export function atRank(c: CharacterData, rank: number): CharacterData {
  const moves: Record<MoveId, MoveData> = {}
  for (const [id, m] of Object.entries(c.moves)) if ((m.rank ?? 0) <= rank) moves[id] = m
  return { ...c, moves, combos: c.combos.filter((k) => moves[k.move]) }
}
