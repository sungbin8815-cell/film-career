// 캐릭터 데이터. 숫자만 바꿔도 밸런스가 바뀝니다 (체력 1000 기준, 스테이지 가로 1200).
// ─ 조작: A 약 · B 강 · C 직업기 · D 특성기 · R 궁극기(SP 100) × 방향(중립 n·앞 f·뒤 b·위 u·아래 d·공중 air·공중↓ aird·대시 dash)
// ─ 기술 칸 이름 `${버튼}_${방향}`, 특성 모드 변형은 `칸~모드` (렌즈 wide/tele, 분장 creature, 배우 sageuk/horror)
// ─ 커맨드(캐릭터 고유): seq = 입력 순서. f 앞 · b 뒤 · u 위 · d 아래 · dash 대시 · bs 백스텝 · 버튼 A B C D
// ─ anim 't:템플릿:장비' = gfx/motions.ts 과장 동작 (장비 s 한 손·l 긴 것·n 맨손)
// 기술표 전체: MOVES.md (npm run moves)
import type { CharacterData, Command, MoveData, MoveId, ProjectileSpec } from '../core/types'

type M = Partial<MoveData>
/** 판정 있는 기술: [발동, 판정, 경직], 피해, 판정 [앞x, 높이y, 폭w, 높이h] */
function atk(name: string, f: [number, number, number], dmg: number, hb: [number, number, number, number], o: M = {}): MoveData {
  return {
    id: '', name, startup: f[0], active: f[1], recovery: f[2], damage: dmg,
    chip: Math.round(dmg * 0.12), hitstun: Math.round(14 + dmg * 0.12), blockstun: Math.round(8 + dmg * 0.08),
    kbX: +(1 + dmg * 0.03).toFixed(2), hitbox: { x: hb[0], y: hb[1], w: hb[2], h: hb[3] }, meterGain: Math.round(dmg / 9) + 2, ...o,
  }
}
/** 투사체 기술 */
function shot(name: string, f: [number, number, number], p: Partial<ProjectileSpec> & { kind: string; damage: number }, o: M = {}): MoveData {
  const proj: ProjectileSpec = { offsetX: 26, startY: 26, vx: 6, vy: 0, w: 18, h: 14, life: 80, chip: Math.round(p.damage * 0.12), hitstun: Math.round(16 + p.damage * 0.12), blockstun: Math.round(10 + p.damage * 0.06), kbX: 2.5, ...p }
  return { ...atk(name, f, 0, [0, 0, 0, 0]), meterGain: 0, projectile: proj, ...o }
}
/** 판정 없이 효과만 내는 기술 (startup 프레임에 effect) */
function eff(name: string, effect: string, f: [number, number, number], o: M = {}): MoveData {
  return { ...atk(name, f, 0, [0, 0, 0, 0]), meterGain: 0, effect, sfx: 'trait', ...o }
}
const air = { air: true, overhead: true } as const
const TITLES = (head: string): CharacterData['titles'] => ['막내', '서드', '세컨드', '퍼스트', head]

/** 기술표 정리: id 채우기, 스테이지 모드 직급(rank) 배분 */
function build(moves: Record<MoveId, MoveData>, commands: Command[]): Record<MoveId, MoveData> {
  const cmdIds = new Set(commands.map((c) => c.move))
  for (const [id, m] of Object.entries(moves)) {
    m.id = id
    if (cmdIds.has(id)) m.combo = true
    if (m.rank != null) continue
    const base = id.split('~')[0]
    if (id === 'R') m.rank = 3
    else if (m.combo) { const c = commands.find((k) => k.move === id)!; m.rank = c.seq.every((t) => 'ABCD'.includes(t)) ? 1 : c.seq.length >= 3 ? 3 : 2 }
    else if (/^[AB]_/.test(base) || base === 'C_n' || base === 'D_n') m.rank = 0
    else m.rank = 1
  }
  return moves
}

// ════════════════════════════════════════════ 촬영감독 ════════════════════════════════════════════
// 렌즈마다 완전히 다른 캐릭터: 광각(초근접 러시) / 표준(중거리 밸런스) / 망원(화면 끝까지 닿는 저격수)
const dpCmds: Command[] = [
  { seq: ['A', 'A', 'B'], move: 'tripod_upper' },
  { seq: ['A', 'B', 'B'], move: 'zoom_punch' },
  { seq: ['B', 'B'], move: 'spin_360' },
  { seq: ['C', 'C'], move: 'shutter_burst' },
  { seq: ['d', 'f', 'C'], move: 'dolly_track' },
  { seq: ['d', 'u', 'B'], move: 'crane_up' },
  { seq: ['bs', 'C'], move: 'pullout_flash' },
  { seq: ['dash', 'D'], move: 'swap_rush' },
  { seq: ['bs', 'D'], move: 'swap_snipe' },
  { seq: ['d', 'C'], move: 'birdseye', air: true },
  { seq: ['d', 'd', 'A'], move: 'lowangle_burst' },
]
export const DP: CharacterData = {
  id: 'dp', name: '촬영감독', nameEn: 'DP', color: '#3b82f6', dept: '촬영부', titles: TITLES('촬영감독'), trait: 'lens',
  desc: '렌즈를 갈아 끼우면 다른 사람이 된다. 광각은 코앞 러시, 망원은 화면 끝 저격.',
  style: '모드 전환형 · 근거리↔원거리', difficulty: 2, showcase: ['C_n~tele', 'C_n~wide', 'B_n'],
  stats: { power: 3, speed: 3, reach: 5 }, atk: 1.41, assist: 'C_f',
  hp: 1040, walkSpeed: 1.8, runSpeed: 3.6, jumpV: 6.6, airSpeed: 2.2, gravity: 0.34, airDashes: 1,
  hurt: { w: 22, h: 50, crouchH: 32 },
  commands: dpCmds,
  moves: build({
    A_n: atk('카메라 잽', [4, 3, 9], 34, [8, 26, 28, 16], { anim: 't:jab:s', sfx: 'light' }),
    A_f: atk('렌즈 찌르기', [6, 4, 12], 40, [10, 22, 44, 16], { anim: 't:thrust:s' }),
    A_u: atk('하이앵글 올려치기', [5, 4, 14], 40, [0, 40, 32, 36], { kbY: 4.5, juggle: true, anim: 't:upper:s' }),
    A_d: atk('로우앵글 킥', [5, 3, 10], 30, [8, 0, 32, 14], { low: true, anim: 't:crouchpoke:s' }),
    A_air: atk('공중 카메라', [4, 8, 8], 32, [4, 0, 30, 28], { ...air, anim: 't:airswing:s' }),
    A_aird: atk('탑샷 찍기', [6, 8, 10], 40, [-6, -12, 36, 30], { ...air, groundBounce: true, anim: 't:airspike:s' }),
    A_dash: atk('돌리 잽', [4, 6, 12], 36, [8, 20, 32, 20], { dash: 3, anim: 't:dashstrike:s' }),
    B_n: atk('삼각대 풀스윙', [11, 5, 20], 82, [4, 14, 64, 32], { kbX: 6.5, kbY: 4, wallBounce: true, anim: 't:swing:l', sfx: 'heavy' }),
    B_f: atk('삼각대 창찌르기', [12, 5, 20], 74, [10, 22, 88, 14], { kbX: 5.5, anim: 't:thrust:l' }),
    B_u: atk('삼각대 헬리콥터', [9, 14, 18], 28, [-24, 40, 74, 32], { multiHit: { interval: 5, max: 3 }, juggle: true, lastHitKbY: 6, anim: 't:spin:l' }),
    B_d: atk('트래킹 슬라이드', [8, 12, 18], 64, [6, 0, 42, 14], { low: true, dash: 4.4, kbY: 3, anim: 't:sweep:l' }),
    B_air: atk('공중 삼각대', [7, 8, 12], 64, [0, -4, 52, 36], { ...air, anim: 't:airswing:l' }),
    B_aird: atk('삼각대 다이브', [9, 14, 14], 70, [-4, -14, 38, 30], { ...air, lift: -7, dash: 2.4, groundBounce: true, anim: 't:dive:l' }),
    B_dash: atk('돌리 인', [6, 10, 18], 78, [6, 14, 42, 30], { dash: 5, kbX: 6.5, kbY: 3, wallBounce: true, afterimage: true, anim: 't:dashstrike:l' }),
    C_n: shot('플래시 탄', [10, 1, 18], { kind: 'snipe', vx: 7, life: 55, damage: 50 }, { anim: 't:aim:s', sfx: 'shutter' }),
    C_f: atk('숄더 어택', [8, 16, 18], 80, [2, 12, 26, 32], { cd: 120, dash: 5, kbX: 5, kbY: 3, afterimage: true, anim: 't:dashstrike:s', sfx: 'dash', voice: '비켜! 장비 지나간다!' }),
    C_u: atk('붐업 플래시', [8, 4, 18], 48, [-10, 50, 60, 60], { kbY: 5, juggle: true, anim: 't:burst:s', sfx: 'shutter' }),
    C_d: shot('조명 낙하', [14, 1, 22], { kind: 'lightstand', offsetX: 120, startY: 150, vx: 0, vy: -5.5, w: 20, h: 26, life: 60, damage: 88, kbX: 1.5, kbY: 2.6 }, { cd: 150, anim: 't:throw:n', sfx: 'drop', voice: '조명 들어갑니다~!' }),
    C_air: shot('공중 플래시', [8, 1, 14], { kind: 'snipe', vx: 6, vy: -2.5, damage: 40 }, { air: true, anim: 't:aim:s', sfx: 'shutter' }),
    D_n: eff('렌즈 교체', 'lens', [8, 1, 6], { cd: 30, anim: 't:pose:s' }),
    D_f: eff('광각 장착', 'lensWide', [6, 1, 6], { cd: 30, anim: 't:pose:s' }),
    D_b: eff('망원 장착', 'lensTele', [6, 1, 6], { cd: 30, anim: 't:pose:s' }),
    D_u: eff('표준 장착', 'lensStd', [6, 1, 6], { cd: 30, anim: 't:pose:s' }),
    // 광각: 코앞에서 쉴 새 없이
    'A_n~wide': atk('핸드헬드 연타', [3, 2, 6], 26, [6, 24, 26, 16], { anim: 't:jab:s', sfx: 'light' }),
    'B_n~wide': atk('360 회전샷', [8, 16, 16], 28, [-22, 10, 64, 34], { multiHit: { interval: 5, max: 3 }, lastHitKbY: 4.5, anim: 't:spin:s' }),
    'B_f~wide': atk('짐벌 돌진', [6, 10, 16], 70, [6, 14, 36, 30], { dash: 6, kbX: 6, kbY: 3, afterimage: true, anim: 't:dashstrike:s' }),
    'C_n~wide': atk('핸드헬드 러시', [5, 26, 16], 20, [2, 14, 30, 32], { multiHit: { interval: 5, max: 5 }, dash: 3.4, lastHitKbY: 5, afterimage: true, juggle: true, anim: 't:flurry:s', voice: '바짝 붙어서 찍는다!' }),
    'C_f~wide': atk('짐벌 슬라이드', [6, 14, 16], 60, [4, 0, 36, 14], { low: true, dash: 5, kbY: 3, anim: 't:sweep:s' }),
    // 망원: 화면 끝까지 닿는 저격 (근접은 약함)
    'A_n~tele': shot('망원 견제샷', [8, 1, 14], { kind: 'snipe', vx: 11, life: 100, damage: 30 }, { anim: 't:aim:s', sfx: 'shutter' }),
    'B_n~tele': atk('줌 레이저', [16, 6, 24], 66, [20, 26, 580, 10], { kbX: 4, vfx: 'laser', anim: 't:aim:l', sfx: 'shutter' }),
    'C_n~tele': shot('스나이프', [14, 1, 20], { kind: 'snipe', vx: 15, life: 90, w: 22, h: 12, damage: 62, kbX: 3 }, { cd: 50, anim: 't:aim:s', sfx: 'shutter', voice: '포커스… 찰칵!' }),
    'C_f~tele': shot('줌인 당기기', [12, 1, 20], { kind: 'snipe', vx: 10, life: 80, damage: 30, hitstun: 32, kbX: 4.5, pull: true }, { cd: 120, anim: 't:aim:s', voice: '줌~ 인!' }),
    'C_b~tele': atk('줌아웃 밀어내기', [10, 5, 18], 30, [10, 10, 100, 44], { kbX: 9, wallBounce: true, vfx: 'cone', anim: 't:burst:s', voice: '줌 아웃!' }),
    'B_d~tele': shot('거치 저격', [20, 1, 20], { kind: 'snipe', startY: 8, vx: 14, life: 90, damage: 52 }, { anim: 't:crouchpoke:l', sfx: 'shutter' }),
    R: atk('원테이크', [12, 20, 30], 40, [0, 8, 64, 44], { cost: 100, dash: 5, ult: { total: 320, cine: 150 }, afterimage: true, anim: 't:dashstrike:s', sfx: 'super', voice: '컷 없이 간다! 원테이크!!' }),
    // ─── 고유 커맨드 ───
    tripod_upper: atk('트라이포드 어퍼', [6, 5, 22], 70, [2, 24, 36, 46], { kbY: 8, juggle: true, finisher: true, anim: 't:upper:l', voice: '하이앵글!!' }),
    zoom_punch: atk('줌인 펀치', [9, 7, 20], 92, [6, 20, 34, 22], { dash: 4, kbX: 8, kbY: 3, wallBounce: true, finisher: true, afterimage: true, anim: 't:dashstrike:s', voice: '줌~인!' }),
    spin_360: atk('360도 회전촬영', [5, 14, 18], 44, [-24, 10, 72, 34], { multiHit: { interval: 7, max: 2 }, lastHitKbY: 4, juggle: true, anim: 't:spin:l' }),
    shutter_burst: atk('연속 셔터', [6, 12, 16], 16, [10, 10, 74, 42], { multiHit: { interval: 4, max: 3 }, hitstun: 26, anim: 't:burst:s', sfx: 'shutter', voice: '찰칵찰칵찰칵!' }),
    dolly_track: atk('달리 트랙 샷', [6, 30, 18], 22, [4, 12, 36, 34], { dash: 4, multiHit: { interval: 7, max: 4 }, lastHitKbY: 5, afterimage: true, anim: 't:flurry:s', voice: '트랙 깔았다!' }),
    crane_up: atk('크레인 업', [8, 6, 26], 86, [-6, 30, 42, 74], { kbY: 10, juggle: true, lift: 5, finisher: true, anim: 't:upper:l', voice: '크레인 올려!' }),
    pullout_flash: shot('풀아웃 플래시', [6, 1, 16], { kind: 'snipe', vx: 9, life: 70, damage: 46 }, { anim: 't:aim:s', sfx: 'shutter' }),
    swap_rush: atk('렌즈 스왑 돌진', [6, 10, 18], 60, [6, 16, 38, 30], { effect: 'lensWide', dash: 6, kbX: 5, afterimage: true, anim: 't:dashstrike:s', voice: '광각으로!' }),
    swap_snipe: shot('망원 즉사격', [10, 1, 16], { kind: 'snipe', vx: 14, life: 90, damage: 50 }, { effect: 'lensTele', anim: 't:aim:s', voice: '망원으로!' }),
    birdseye: atk('버드아이 폭격', [8, 12, 14], 26, [-30, -54, 86, 54], { ...air, multiHit: { interval: 6, max: 2 }, anim: 't:airspike:s', sfx: 'shutter', voice: '부감샷!' }),
    lowangle_burst: atk('로우앵글 연사', [4, 20, 12], 14, [6, 0, 40, 14], { low: true, multiHit: { interval: 5, max: 4 }, anim: 't:flurry:s' }),
  }, dpCmds),
}

// ════════════════════════════════════════════ 연출감독 ════════════════════════════════════════════
// 주먹은 약하다. 콘티(덫)·엑스트라를 깔고 "액션!"으로 판을 터뜨리는 사령관
const directorCmds: Command[] = [
  { seq: ['A', 'A', 'C'], move: 'ready_cue' },
  { seq: ['B', 'B'], move: 'longtake_order' },
  { seq: ['d', 'f', 'C'], move: 'extra_squad' },
  { seq: ['b', 'f', 'C'], move: 'wire_extra' },
  { seq: ['d', 'd', 'C'], move: 'conti_spread' },
  { seq: ['dash', 'C'], move: 'closeup_summon' },
  { seq: ['bs', 'B'], move: 'cut_shout' },
  { seq: ['d', 'u', 'D'], move: 'rehearsal' },
  { seq: ['bs', 'D'], move: 'slowmo_order' },
  { seq: ['d', 'B'], move: 'topview_drop', air: true },
]
export const DIRECTOR: CharacterData = {
  ...DP, id: 'director', name: '연출감독', nameEn: 'DIRECTOR', color: '#ef4444', dept: '연출부', titles: TITLES('감독'), trait: 'mark',
  desc: '직접 싸우지 않는다. 콘티와 엑스트라로 판을 짜고, "액션!" 한마디로 전부 터뜨린다.',
  style: '설치·소환형 사령관', difficulty: 3, showcase: ['C_n', 'D_n', 'B_n'],
  stats: { power: 2, speed: 3, reach: 4 }, atk: 1.5, assist: 'C_n',
  hp: 960, walkSpeed: 1.8, runSpeed: 3.6, jumpV: 6.6, airDashes: 1,
  commands: directorCmds,
  moves: build({
    A_n: atk('슬레이트 툭', [5, 3, 10], 26, [8, 26, 26, 16], { anim: 't:jab:s', sfx: 'slate' }),
    A_f: atk('대본 찌르기', [6, 4, 12], 30, [10, 24, 36, 14], { anim: 't:thrust:s' }),
    A_u: atk('슬레이트 올려치기', [6, 4, 14], 30, [0, 40, 30, 30], { kbY: 4, juggle: true, anim: 't:upper:s', sfx: 'slate' }),
    A_d: atk('발 체크', [5, 3, 10], 24, [8, 0, 30, 14], { low: true, anim: 't:crouchpoke:n' }),
    A_air: atk('공중 슬레이트', [4, 8, 8], 26, [4, 0, 28, 28], { ...air, anim: 't:airswing:s', sfx: 'slate' }),
    A_aird: atk('하이앵글 다이브', [6, 14, 12], 40, [0, -10, 30, 30], { ...air, lift: -6, dash: 3, anim: 't:dive:n' }),
    B_n: atk('메가폰 샤우트', [12, 8, 20], 30, [10, 8, 120, 48], { kbX: 8.5, vfx: 'cone', anim: 't:shout:l', sfx: 'shout', voice: '거기 비켜!!' }),
    B_f: atk('슬레이트 딱!', [10, 4, 18], 56, [10, 24, 42, 20], { kbX: 4, anim: 't:overhead:s', sfx: 'slate' }),
    B_u: atk('디렉터 체어 번쩍', [10, 6, 20], 48, [-10, 40, 52, 44], { kbY: 6, juggle: true, anim: 't:upper:l' }),
    B_d: atk('레일 깔기', [9, 6, 18], 42, [6, 0, 64, 12], { low: true, kbY: 2.5, anim: 't:sweep:l' }),
    B_air: atk('공중 메가폰', [7, 8, 12], 46, [0, -4, 48, 34], { ...air, anim: 't:airswing:l' }),
    B_dash: atk('클로즈업 돌진', [6, 10, 18], 54, [6, 14, 36, 30], { dash: 5, kbX: 5, anim: 't:dashstrike:s' }),
    C_n: eff('엑스트라 소환', 'extra', [12, 1, 20], { cd: 140, anim: 't:point:n', voice: '엑스트라 들어와!' }),
    C_f: eff('콘티 던지기', 'trapFar', [10, 1, 14], { cd: 50, anim: 't:throw:n' }),
    C_d: eff('콘티 설치', 'trap', [8, 1, 12], { cd: 40, anim: 'trait' }),
    C_u: eff('크레인 엑스트라', 'extraDrop', [12, 1, 20], { cd: 240, anim: 't:point:n', voice: '위에서 떨어져!' }),
    C_air: eff('공중 콘티 투하', 'trapHere', [6, 1, 12], { cd: 50, air: true, anim: 't:throw:n' }),
    D_n: eff('액션!', 'action', [8, 1, 16], { cd: 60, anim: 'flash', voice: '레디~ 액션!!' }),
    D_f: eff('점프컷 (나)', 'jumpcutSelf', [6, 1, 10], { cd: 110, anim: 't:blink:n', voice: '점프컷!' }),
    D_b: eff('점프컷 (상대)', 'jumpcutOpp', [8, 1, 14], { cd: 220, anim: 't:point:n', voice: '거기 서!' }),
    D_d: eff('NG!', 'parry', [3, 22, 18], { cd: 180, anim: 'parry', voice: 'NG!!' }),
    R: atk('리테이크', [12, 10, 30], 30, [10, 8, 170, 52], { cost: 100, ult: { total: 300, cine: 170 }, vfx: 'cone', anim: 't:shout:l', sfx: 'super', voice: '컷! 다시 갑니다! 리테이크!!' }),
    ready_cue: atk('레디~', [8, 4, 16], 30, [8, 20, 32, 24], { effect: 'extra', anim: 't:point:s', voice: '레디~' }),
    longtake_order: atk('롱테이크 지시', [8, 8, 18], 40, [8, 14, 40, 30], { effect: 'extraRush', anim: 't:overhead:l', voice: '그대로 계속!' }),
    extra_squad: eff('엑스트라 돌격대', 'extras2', [12, 1, 20], { cd: 300, anim: 't:point:n', voice: '전원 돌격!' }),
    wire_extra: shot('와이어 액션 엑스트라', [10, 1, 18], { kind: 'extra', vx: 6, startY: 30, w: 22, h: 30, life: 120, damage: 50, kbY: 4 }, { cd: 180, anim: 't:throw:n', voice: '와이어 당겨!' }),
    conti_spread: eff('콘티 3장', 'trap3', [10, 1, 16], { cd: 300, anim: 'trait', voice: '여기, 여기, 여기!' }),
    closeup_summon: eff('클로즈업 소환', 'extra', [6, 1, 14], { cd: 140, anim: 't:point:n' }),
    cut_shout: atk('"컷!" 대형 샤우트', [10, 10, 22], 38, [10, 0, 190, 62], { cd: 120, kbX: 10, wallBounce: true, vfx: 'cone', anim: 't:shout:l', sfx: 'shout', voice: '컷!!!' }),
    rehearsal: eff('리허설', 'rehearsal', [8, 1, 14], { cd: 180, anim: 't:point:n', voice: '위치 잡아!' }),
    slowmo_order: eff('슬로모션 지시', 'slowmo', [10, 1, 16], { cd: 420, anim: 'flash', voice: '슬로우 모션~' }),
    topview_drop: atk('탑뷰 콘티 폭격', [8, 14, 14], 46, [-8, -12, 40, 34], { ...air, effect: 'trapHere', lift: -7, anim: 't:dive:n' }),
  }, directorCmds),
}

// ════════════════════════════════════════════ 사운드감독 ════════════════════════════════════════════
// 붐마이크가 여의봉처럼 늘어나는 초장거리 탱커. 맞고 막으면서 모은 사운드를 한 번에 방출
const soundCmds: Command[] = [
  { seq: ['A', 'A', 'B'], move: 'boom_triple' },
  { seq: ['B', 'B'], move: 'howl_swing' },
  { seq: ['A', 'B', 'C'], move: 'reverb_combo' },
  { seq: ['d', 'f', 'C'], move: 'bass_wave' },
  { seq: ['dash', 'C'], move: 'boom_ram' },
  { seq: ['d', 'u', 'C'], move: 'boom_skyscraper' },
  { seq: ['b', 'f', 'B'], move: 'boom_windmill' },
  { seq: ['bs', 'C'], move: 'boom_snipe' },
  { seq: ['d', 'd', 'D'], move: 'woofer_quake' },
  { seq: ['d', 'C'], move: 'pole_dive', air: true },
]
export const SOUND: CharacterData = {
  ...DP, id: 'sound', name: '사운드감독', nameEn: 'SOUND', color: '#22c55e', dept: '녹음부', titles: TITLES('녹음감독'), trait: 'rec',
  desc: '붐마이크가 여의봉처럼 화면 절반까지 늘어난다. 맞을수록 사운드가 차고, 터뜨리면 화면이 운다.',
  style: '초장거리 탱커', difficulty: 2, showcase: ['C_n', 'boom_skyscraper', 'D_n'],
  stats: { power: 4, speed: 2, reach: 5 }, atk: 0.72, assist: 'bass_wave',
  hp: 1120, walkSpeed: 1.5, runSpeed: 3.1, jumpV: 6.2, airDashes: 0,
  commands: soundCmds,
  moves: build({
    A_n: atk('붐 툭', [5, 3, 10], 32, [14, 26, 50, 12], { vfx: 'pole', anim: 't:thrust:l' }),
    A_f: atk('붐 찌르기', [7, 4, 14], 38, [20, 26, 96, 12], { vfx: 'pole', anim: 't:thrust:l' }),
    A_u: atk('붐 세우기', [7, 6, 16], 38, [-6, 40, 24, 96], { kbY: 5, juggle: true, vfx: 'pole', anim: 't:upper:l' }),
    A_d: atk('케이블 툭', [5, 3, 10], 26, [10, 0, 64, 10], { low: true, vfx: 'pole', anim: 't:sweep:l' }),
    A_air: atk('공중 붐', [5, 8, 10], 32, [6, 4, 64, 16], { ...air, vfx: 'pole', anim: 't:airswing:l' }),
    A_aird: atk('붐 내려찍기', [7, 10, 12], 42, [-4, -64, 24, 74], { ...air, vfx: 'pole', anim: 't:airspike:l' }),
    A_dash: atk('달리며 붐', [5, 6, 12], 36, [16, 24, 80, 12], { dash: 2.5, vfx: 'pole', anim: 't:thrust:l' }),
    B_n: atk('붐 스윙', [14, 6, 22], 80, [-10, 10, 126, 40], { kbX: 6.5, kbY: 4, wallBounce: true, vfx: 'pole', anim: 't:swing:l', sfx: 'heavy' }),
    B_f: atk('털뭉치 강타', [12, 6, 22], 76, [30, 22, 136, 18], { kbX: 7, vfx: 'pole', anim: 't:thrust:l' }),
    B_u: atk('붐 타워', [12, 8, 24], 66, [-10, 50, 30, 176], { kbY: 9, juggle: true, vfx: 'pole', anim: 't:upper:l' }),
    B_d: atk('붐 바닥 쓸기', [10, 8, 20], 52, [10, 0, 210, 12], { low: true, kbY: 3, vfx: 'pole', anim: 't:sweep:l' }),
    B_air: atk('공중 붐 휘두르기', [8, 8, 12], 60, [-10, -10, 116, 40], { ...air, vfx: 'pole', anim: 't:airswing:l' }),
    B_dash: atk('붐 돌진', [8, 12, 18], 66, [20, 22, 116, 16], { dash: 4, kbX: 6, vfx: 'pole', anim: 't:thrust:l' }),
    // 여의봉: C를 누르고 있으면 늘어남 (최대 화면 절반)
    C_n: atk('여의봉 찌르기 (모으기)', [10, 6, 20], 44, [20, 26, 90, 14], { hold: { max: 45, reach: 6.6, dmg: 1.1 }, kbX: 5, vfx: 'pole', anim: 't:charge:l', voice: '늘어나라!' }),
    C_f: atk('붐 장대 점프', [6, 10, 14], 30, [0, 0, 32, 42], { lift: 8, dash: 3.6, anim: 't:vault:l' }),
    C_u: atk('붐 대공', [10, 6, 20], 58, [-6, 60, 30, 210], { kbY: 7, juggle: true, vfx: 'pole', anim: 't:upper:l' }),
    C_d: eff('우퍼 장판', 'woofer', [12, 1, 18], { cd: 200, anim: 't:plant:s', sfx: 'wave', voice: '저음 깔고~' }),
    C_air: shot('공중 저음파', [10, 1, 14], { kind: 'wave', vx: 4.5, vy: -2, w: 22, h: 30, damage: 40 }, { air: true, anim: 't:aim:s', sfx: 'wave' }),
    D_n: eff('SOUND OVER', 'soundover', [12, 1, 24], { cd: 60, anim: 'trait', sfx: 'wave', voice: 'SOUND… OVER!!' }),
    D_d: eff('노이즈 월', 'noisewall', [4, 36, 16], { cd: 200, anim: 'special2', sfx: 'wave', voice: '노이즈 차단!' }),
    D_f: eff('피드백 기둥', 'pillar', [10, 1, 18], { cd: 150, anim: 't:burst:s', sfx: 'wave', voice: '삐이익—!' }),
    R: atk('동시녹음 풀레벨', [14, 10, 30], 30, [-120, 0, 360, 90], { cost: 100, ult: { total: 300, cine: 160 }, anim: 'super', sfx: 'super', voice: '레벨 최대!! 전원 정숙!!' }),
    boom_triple: atk('붐 3단 찌르기', [8, 6, 20], 60, [20, 24, 146, 14], { kbX: 6, vfx: 'pole', anim: 't:thrust:l' }),
    howl_swing: atk('하울링 스윙', [10, 8, 20], 68, [-20, 10, 146, 40], { kbY: 4, vfx: 'pole', anim: 't:swing:l', sfx: 'wave' }),
    reverb_combo: atk('리버브 콤보', [8, 10, 20], 24, [20, 20, 166, 20], { multiHit: { interval: 4, max: 3 }, vfx: 'pole', anim: 't:flurry:l' }),
    bass_wave: shot('저음 충격파', [16, 1, 22], { kind: 'wave', offsetX: 30, startY: 10, vx: 4.6, w: 24, h: 42, life: 120, damage: 54, kbX: 3 }, { cd: 150, anim: 't:aim:s', sfx: 'wave', voice: '우우우웅—' }),
    boom_ram: atk('붐 돌진 찌르기', [8, 12, 20], 66, [20, 24, 266, 14], { dash: 4, kbX: 7, wallBounce: true, vfx: 'pole', anim: 't:thrust:l', voice: '마이크 들어간다!' }),
    boom_skyscraper: atk('붐 마천루', [10, 10, 26], 74, [-10, 40, 30, 270], { kbY: 11, juggle: true, finisher: true, vfx: 'pole', anim: 't:upper:l', voice: '하늘까지 수음!' }),
    boom_windmill: atk('붐 풍차', [10, 20, 22], 30, [-126, 10, 252, 40], { multiHit: { interval: 5, max: 4 }, lastHitKbY: 5, vfx: 'pole', anim: 't:spin:l', voice: '돌려라!' }),
    boom_snipe: atk('원거리 붐 견제', [8, 4, 18], 42, [40, 26, 250, 12], { vfx: 'pole', anim: 't:thrust:l' }),
    woofer_quake: atk('우퍼 대지진', [14, 8, 24], 48, [10, 0, 310, 14], { cd: 300, low: true, kbY: 3.5, vfx: 'quake', anim: 't:plant:l', sfx: 'wave', voice: '쿵—쿵—쿵!' }),
    pole_dive: atk('장대 다이브', [6, 16, 16], 68, [-20, -20, 62, 40], { ...air, lift: -8, groundBounce: true, anim: 't:dive:l' }),
  }, soundCmds),
}

// ════════════════════════════════════════════ 조명감독 ════════════════════════════════════════════
// 빛을 다루는 마법사. 레이저·반사판·암전 블링크로 노출을 쌓아 기절시키고 콤보
const gafferCmds: Command[] = [
  { seq: ['A', 'A', 'C'], move: 'highlight3' },
  { seq: ['B', 'B'], move: 'stand_windmill' },
  { seq: ['A', 'B', 'C'], move: 'expose_over' },
  { seq: ['d', 'f', 'C'], move: 'keylight_cannon' },
  { seq: ['dash', 'C'], move: 'light_rush' },
  { seq: ['d', 'u', 'C'], move: 'toplight_fall' },
  { seq: ['bs', 'D'], move: 'blackout_back' },
  { seq: ['b', 'f', 'D'], move: 'backlight_blink' },
  { seq: ['d', 'd', 'D'], move: 'gel_filter' },
  { seq: ['d', 'C'], move: 'downlight_drop', air: true },
]
export const GAFFER: CharacterData = {
  ...DP, id: 'gaffer', name: '조명감독', nameEn: 'GAFFER', color: '#f59e0b', dept: '조명부', titles: TITLES('조명감독'), trait: 'light',
  desc: '빛줄기로 노출을 쌓고, 조명을 꺼 순간이동한다. 노출이 차면 상대는 눈부셔 쓰러진다.',
  style: '빛 마법사 · 스턴 콤보', difficulty: 2, showcase: ['C_n', 'D_n', 'keylight_cannon'],
  stats: { power: 3, speed: 3, reach: 4 }, atk: 0.78, assist: 'C_n',
  hp: 1000, walkSpeed: 1.7, runSpeed: 3.4, jumpV: 6.4, airDashes: 1,
  commands: gafferCmds,
  moves: build({
    A_n: atk('LED 잽', [4, 3, 9], 32, [8, 26, 28, 16], { expose: 5, anim: 't:jab:s' }),
    A_f: atk('하이빔 찌르기', [6, 4, 12], 36, [10, 22, 52, 14], { expose: 6, anim: 't:thrust:s' }),
    A_u: atk('업라이트', [5, 4, 14], 36, [0, 40, 32, 36], { kbY: 4.5, juggle: true, expose: 6, anim: 't:upper:s' }),
    A_d: atk('발밑 조명', [5, 3, 10], 26, [8, 0, 32, 14], { low: true, expose: 5, anim: 't:crouchpoke:s' }),
    A_air: atk('공중 LED', [4, 8, 8], 30, [4, 0, 30, 28], { ...air, expose: 5, anim: 't:airswing:s' }),
    A_aird: atk('다운라이트', [6, 8, 10], 38, [-6, -12, 36, 30], { ...air, expose: 8, anim: 't:airspike:s' }),
    B_n: atk('C스탠드 스윙', [12, 5, 20], 78, [4, 14, 72, 32], { kbX: 6.5, kbY: 3.5, wallBounce: true, anim: 't:swing:l', sfx: 'heavy' }),
    B_f: atk('스탠드 찌르기', [12, 5, 20], 68, [10, 22, 94, 14], { kbX: 5, anim: 't:thrust:l' }),
    B_u: atk('스탠드 대공', [10, 6, 20], 58, [-10, 40, 42, 64], { kbY: 6, juggle: true, anim: 't:upper:l' }),
    B_d: atk('케이블 스윕', [9, 6, 18], 50, [6, 0, 74, 12], { low: true, kbY: 2.5, anim: 't:sweep:l' }),
    B_air: atk('공중 스탠드', [7, 8, 12], 58, [0, -4, 54, 34], { ...air, anim: 't:airswing:l' }),
    B_dash: atk('라이트 대시', [6, 10, 18], 64, [6, 14, 40, 30], { dash: 5, kbX: 5.5, afterimage: true, expose: 8, anim: 't:dashstrike:l' }),
    C_n: atk('레이저 빛줄기', [10, 12, 18], 14, [20, 26, 430, 8], { effect: 'reflect', multiHit: { interval: 4, max: 3 }, expose: 10, cd: 60, vfx: 'laser', anim: 't:aim:s', sfx: 'shutter', voice: '키라이트 온!' }),
    C_f: atk('플래시', [6, 4, 16], 24, [-4, 10, 74, 52], { hitstun: 40, expose: 32, cd: 120, anim: 't:burst:s', sfx: 'shutter', voice: '눈 감아!!' }),
    C_u: eff('빛기둥', 'toplight', [12, 1, 18], { cd: 110, anim: 't:point:s' }),
    C_d: eff('바닥 조명', 'floorlight', [10, 1, 16], { cd: 240, anim: 't:plant:l' }),
    C_air: atk('공중 빛줄기', [8, 10, 14], 14, [20, 0, 270, 10], { air: true, multiHit: { interval: 5, max: 2 }, expose: 8, vfx: 'laser', anim: 't:aim:s' }),
    D_n: eff('암전 블링크', 'blinkFwd', [8, 1, 10], { cd: 90, anim: 't:blink:n', sfx: 'dash', voice: '암전!' }),
    D_b: eff('암전 후퇴', 'blinkBack', [6, 1, 10], { cd: 90, anim: 't:blink:n', sfx: 'dash' }),
    D_d: eff('반사판 설치', 'reflector', [10, 1, 14], { cd: 120, anim: 't:plant:l', voice: '반사판!' }),
    D_u: eff('팔로우 스폿', 'spot', [12, 1, 10], { cd: 480, anim: 'trait', voice: '스폿 따라가!' }),
    R: atk('18K 풀 파워', [16, 10, 30], 30, [10, 0, 600, 80], { cost: 100, ult: { total: 300, cine: 160 }, expose: 100, vfx: 'laser', anim: 'super', sfx: 'super', voice: '18K 풀 파워!!!' }),
    highlight3: atk('하이라이트 3연광', [6, 10, 16], 18, [10, 14, 92, 30], { multiHit: { interval: 4, max: 3 }, expose: 10, vfx: 'laser', anim: 't:burst:s' }),
    stand_windmill: atk('스탠드 풍차', [6, 14, 18], 42, [-24, 10, 76, 34], { multiHit: { interval: 7, max: 2 }, lastHitKbY: 4, anim: 't:spin:l' }),
    expose_over: atk('노출 오버', [8, 6, 20], 38, [-10, 10, 94, 52], { expose: 26, kbY: 5, juggle: true, anim: 't:burst:s', sfx: 'shutter' }),
    keylight_cannon: atk('키라이트 대포', [14, 10, 22], 24, [20, 18, 540, 22], { effect: 'reflect', cd: 150, multiHit: { interval: 3, max: 3 }, expose: 12, vfx: 'laser', anim: 't:aim:l', sfx: 'shutter', voice: '빛이여!' }),
    light_rush: atk('빛의 돌진', [6, 16, 18], 18, [2, 14, 32, 32], { dash: 5, multiHit: { interval: 4, max: 4 }, expose: 8, afterimage: true, anim: 't:flurry:s' }),
    toplight_fall: eff('탑라이트 폭포', 'toplight', [10, 1, 16], { cd: 200, anim: 't:point:s', voice: '위를 봐!' }),
    blackout_back: eff('암전 백스텝', 'blinkBack', [4, 1, 8], { cd: 60, anim: 't:blink:n' }),
    backlight_blink: atk('역광 블링크', [10, 6, 18], 48, [6, 14, 38, 36], { effect: 'blinkBehind', cd: 180, kbX: 5, kbY: 3, expose: 14, anim: 't:dashstrike:s', voice: '뒤를 봐!' }),
    gel_filter: eff('젤라틴 필터', 'gel', [10, 1, 14], { cd: 420, anim: 'trait', voice: '앰버 젤!' }),
    downlight_drop: atk('다운라이트 낙하', [8, 16, 14], 40, [-20, -20, 62, 40], { ...air, lift: -7, expose: 20, anim: 't:dive:l' }),
  }, gafferCmds),
}

// ════════════════════════════════════════════ 미술감독 ════════════════════════════════════════════
// 맵을 직접 짓는 건축가. 발판·벽·소파를 지어 무대를 만들고, 지은 만큼 강해진다
const artCmds: Command[] = [
  { seq: ['A', 'A', 'B'], move: 'nail3' },
  { seq: ['B', 'B'], move: 'roller_spin' },
  { seq: ['A', 'B', 'C'], move: 'paint_bomb' },
  { seq: ['d', 'f', 'C'], move: 'stair_set' },
  { seq: ['dash', 'B'], move: 'roller_dash' },
  { seq: ['d', 'u', 'B'], move: 'hammer_super_upper' },
  { seq: ['bs', 'C'], move: 'barricade' },
  { seq: ['b', 'f', 'C'], move: 'plywood_throw' },
  { seq: ['d', 'd', 'B'], move: 'set_quake' },
  { seq: ['d', 'B'], move: 'nail_dive', air: true },
]
export const ART: CharacterData = {
  ...DP, id: 'art', name: '미술감독', nameEn: 'ART', color: '#a855f7', dept: '미술부', titles: TITLES('미술감독'), trait: 'wall',
  desc: '무대를 직접 짓는다. 공중에도 발판을 올리고, 벽으로 막고, 다 지으면 부숴서 날린다.',
  style: '건축·지형형 운영', difficulty: 3, showcase: ['C_u', 'C_f', 'D_n'],
  stats: { power: 4, speed: 3, reach: 3 }, atk: 2.35, assist: 'C_d',
  hp: 1040, airDashes: 1,
  commands: artCmds,
  moves: build({
    A_n: atk('망치 콩!', [4, 3, 9], 34, [8, 26, 28, 16], { anim: 't:jab:s', sfx: 'light' }),
    A_f: atk('못 박기', [6, 4, 12], 40, [10, 22, 42, 16], { anim: 't:overhead:s' }),
    A_u: atk('망치 어퍼', [6, 4, 14], 38, [0, 40, 32, 36], { kbY: 5, juggle: true, anim: 't:upper:s' }),
    A_d: atk('정강이 망치', [5, 3, 10], 28, [8, 0, 32, 14], { low: true, anim: 't:crouchpoke:s' }),
    A_air: atk('공중 망치', [4, 8, 8], 32, [4, 0, 30, 28], { ...air, anim: 't:airswing:s' }),
    A_aird: atk('망치 내려찍기', [6, 10, 10], 42, [-6, -12, 36, 30], { ...air, groundBounce: true, anim: 't:airspike:s' }),
    B_n: atk('롤러 스윙', [12, 5, 20], 80, [4, 14, 70, 32], { kbX: 6.5, kbY: 3.5, wallBounce: true, anim: 't:swing:l', sfx: 'heavy' }),
    B_f: atk('롤러 밀기', [12, 8, 20], 66, [10, 10, 54, 30], { dash: 3, kbX: 6, anim: 't:thrust:l' }),
    B_u: atk('롤러 대공', [10, 6, 20], 58, [-10, 40, 42, 64], { kbY: 6, juggle: true, anim: 't:upper:l' }),
    B_d: atk('바닥 칠하기', [9, 8, 18], 50, [6, 0, 76, 12], { low: true, debuff: { slow: 60 }, anim: 't:sweep:l' }),
    B_air: atk('공중 롤러', [7, 8, 12], 62, [0, -4, 54, 34], { ...air, anim: 't:airswing:l' }),
    B_dash: atk('망치 돌진', [6, 10, 18], 66, [6, 14, 40, 30], { dash: 5, kbX: 6, anim: 't:dashstrike:s' }),
    C_n: eff('애플박스', 'applebox', [10, 1, 12], { cd: 30, anim: 'trait', voice: '애플박스!' }),
    C_u: eff('공중 발판', 'platform', [10, 1, 12], { cd: 30, anim: 't:point:s', voice: '발판 올려!' }),
    C_f: eff('페이크 월', 'wall', [12, 1, 12], { cd: 60, anim: 'trait', voice: '벽 세웁니다!' }),
    C_d: eff('소파 드롭', 'sofa', [12, 1, 16], { cd: 150, anim: 't:throw:n', voice: '소파 들어갑니다~!' }),
    C_air: eff('공중 발판 생성', 'airPlatform', [6, 1, 10], { cd: 40, air: true, anim: 't:pose:s' }),
    D_n: eff('세트 폭파', 'setBlast', [10, 1, 18], { cd: 120, anim: 't:burst:s', voice: '날려 버려!' }),
    D_f: eff('세트벽 밀기', 'wallPush', [8, 1, 14], { cd: 90, anim: 't:thrust:s', voice: '밀어!' }),
    D_d: eff('비계 설치', 'scaffold', [14, 1, 16], { cd: 240, anim: 'trait', voice: '비계 올려!' }),
    D_u: eff('세트 붕괴', 'collapse', [10, 1, 18], { cd: 200, anim: 't:point:s', voice: '무너져라!' }),
    R: atk('세트 체인지', [14, 10, 30], 30, [-40, 0, 230, 100], { cost: 100, effect: 'setchange', ult: { total: 300, cine: 170 }, anim: 't:overhead:l', sfx: 'super', voice: '전부 철거하고 새로 짓는다!!' }),
    nail3: atk('못질 3연타', [6, 10, 18], 28, [8, 20, 34, 24], { multiHit: { interval: 4, max: 3 }, anim: 't:flurry:s' }),
    roller_spin: atk('롤러 회전', [6, 14, 18], 44, [-24, 10, 74, 34], { multiHit: { interval: 7, max: 2 }, lastHitKbY: 4, anim: 't:spin:l' }),
    paint_bomb: shot('페인트 폭탄', [10, 1, 18], { kind: 'paint', offsetX: 14, startY: 36, vx: 3.4, vy: 2.6, gy: 0.2, w: 18, h: 16, life: 90, damage: 48, kbY: 2.4, debuff: { slow: 120 } }, { anim: 't:throw:n' }),
    stair_set: eff('계단 세트', 'stairs', [12, 1, 16], { cd: 120, anim: 'trait', voice: '계단 깔고~' }),
    roller_dash: atk('롤러 대시', [6, 16, 18], 58, [4, 0, 44, 30], { dash: 5.5, debuff: { slow: 90 }, afterimage: true, anim: 't:dashstrike:l' }),
    hammer_super_upper: atk('망치 슈퍼 어퍼', [8, 6, 24], 88, [-4, 24, 40, 64], { kbY: 10, juggle: true, lift: 4, finisher: true, anim: 't:upper:s', voice: '천장까지!' }),
    barricade: eff('바리케이드', 'barricade', [8, 1, 12], { cd: 90, anim: 'trait' }),
    plywood_throw: shot('합판 날리기', [10, 1, 18], { kind: 'plywood', vx: 6.5, startY: 22, w: 26, h: 18, life: 110, damage: 58, kbX: 5, wallBounce: true }, { cd: 120, anim: 't:throw:n', voice: '합판 간다!' }),
    set_quake: atk('세트 망치 대지진', [12, 6, 22], 62, [-40, 0, 186, 12], { low: true, kbY: 3, vfx: 'quake', anim: 't:overhead:s', voice: '쿵!!' }),
    nail_dive: atk('대못 다이브', [8, 16, 14], 76, [-4, -16, 40, 32], { ...air, lift: -8, groundBounce: true, anim: 't:dive:s' }),
  }, artCmds),
}

// ════════════════════════════════════════════ 분장실장 ════════════════════════════════════════════
// 분장막으로 버티며 상처·노인·파우더 분장을 걸고, 크리처로 변신하면 기술 세트가 통째로 바뀐다
const makeupCmds: Command[] = [
  { seq: ['A', 'A', 'B'], move: 'concealer3' },
  { seq: ['B', 'B'], move: 'brush_spin' },
  { seq: ['A', 'B', 'C'], move: 'makeup_rush' },
  { seq: ['d', 'f', 'C'], move: 'sfx_barrage' },
  { seq: ['dash', 'A'], move: 'puff_sprint' },
  { seq: ['d', 'u', 'B'], move: 'highkick_upper' },
  { seq: ['bs', 'C'], move: 'fixer_mist' },
  { seq: ['b', 'f', 'C'], move: 'curling_whip' },
  { seq: ['d', 'd', 'D'], move: 'aging_curse' },
  { seq: ['d', 'B'], move: 'brush_dive', air: true },
]
export const MAKEUP: CharacterData = {
  ...DP, id: 'makeup', name: '분장실장', nameEn: 'MAKEUP', color: '#ec4899', dept: '분장팀', titles: TITLES('분장실장'), trait: 'makeup',
  desc: '분장막으로 버티며 상처·노인 분장을 건다. 자기 얼굴에 특수분장하면 크리처로 변신.',
  style: '상태이상·변신형', difficulty: 2, showcase: ['C_n', 'D_n', 'B_n~creature'],
  stats: { power: 3, speed: 5, reach: 3 }, atk: 1.32, assist: 'C_f',
  hp: 930, walkSpeed: 2.1, runSpeed: 4.2, jumpV: 6.9, airSpeed: 2.4, airDashes: 2,
  commands: makeupCmds,
  moves: build({
    A_n: atk('퍼프 톡', [3, 2, 7], 28, [8, 26, 26, 16], { anim: 't:jab:l' }),
    A_f: atk('브러시 찌르기', [5, 4, 10], 32, [10, 22, 52, 14], { anim: 't:thrust:l' }),
    A_u: atk('브러시 올려', [5, 4, 12], 32, [0, 40, 32, 36], { kbY: 4, juggle: true, anim: 't:upper:l' }),
    A_d: atk('발끝 파우더', [4, 3, 9], 22, [8, 0, 32, 14], { low: true, debuff: { blind: 60 }, anim: 't:crouchpoke:s' }),
    A_air: atk('공중 퍼프', [3, 8, 8], 26, [4, 0, 30, 28], { ...air, anim: 't:airswing:l' }),
    A_aird: atk('공중 브러시 찍기', [5, 8, 10], 32, [-6, -12, 36, 30], { ...air, anim: 't:airspike:l' }),
    B_n: atk('브러시 스윙', [9, 5, 16], 64, [4, 14, 62, 32], { kbX: 5, kbY: 3, anim: 't:swing:l', sfx: 'heavy' }),
    B_f: atk('고데기 찌르기', [9, 5, 16], 56, [10, 22, 74, 14], { debuff: { bleed: 120 }, anim: 't:thrust:l' }),
    B_u: atk('하이킥', [7, 6, 18], 54, [-4, 36, 36, 46], { kbY: 6, juggle: true, anim: 't:kick:n' }),
    B_d: atk('쓸어담기', [7, 6, 16], 44, [6, 0, 60, 12], { low: true, kbY: 2.5, anim: 't:sweep:l' }),
    B_air: atk('공중 브러시', [6, 8, 10], 52, [0, -4, 50, 34], { ...air, anim: 't:airswing:l' }),
    B_dash: atk('퍼프 대시', [5, 10, 16], 56, [6, 14, 38, 30], { dash: 5, kbX: 5, afterimage: true, anim: 't:dashstrike:l' }),
    C_n: shot('상처분장 브러시', [8, 1, 16], { kind: 'brush', vx: 6, life: 70, damage: 32, debuff: { bleed: 240 } }, { cd: 60, anim: 't:throw:n', voice: '상처 하나 그려 줄게~' }),
    C_f: atk('노인분장 스프레이', [8, 10, 16], 12, [10, 10, 94, 40], { multiHit: { interval: 4, max: 3 }, debuff: { slow: 180 }, cd: 150, vfx: 'cone', anim: 't:aim:s', sfx: 'spray', voice: '주름 들어갑니다~' }),
    C_d: shot('파우더 블라인드', [10, 1, 18], { kind: 'spray', offsetX: 20, startY: 18, vx: 2.6, w: 26, h: 30, life: 80, damage: 26, debuff: { blind: 180 } }, { cd: 120, anim: 'special2', sfx: 'spray' }),
    C_u: atk('반짝 펄', [6, 4, 16], 28, [-10, 40, 62, 62], { kbY: 5, juggle: true, anim: 't:burst:s', sfx: 'shutter' }),
    C_air: shot('공중 파우더', [8, 1, 14], { kind: 'spray', vx: 2.2, vy: -2, w: 24, h: 26, life: 60, damage: 22, debuff: { blind: 120 } }, { air: true, anim: 't:throw:n', sfx: 'spray' }),
    D_n: eff('크리처 변신', 'transform', [14, 1, 16], { cd: 600, anim: 'trait', voice: '특수분장… 변신!' }),
    D_d: eff('베이스', 'base', [10, 1, 12], { cd: 240, anim: 'flash' }),
    D_f: eff('클렌징', 'cleanse', [10, 1, 18], { cd: 120, anim: 't:burst:s', voice: '싹— 지워!!' }),
    // 크리처 모드: 길고 무거운 손톱·촉수
    'A_n~creature': atk('크리처 할퀴기', [4, 4, 10], 38, [6, 14, 48, 36], { vfx: 'claw', anim: 't:swing:n' }),
    'A_f~creature': atk('할퀴며 돌진', [6, 8, 14], 46, [6, 14, 40, 36], { dash: 5, vfx: 'claw', anim: 't:dashstrike:n' }),
    'B_n~creature': atk('크리처 강타', [10, 6, 18], 94, [4, 10, 84, 42], { kbX: 7, kbY: 4, wallBounce: true, vfx: 'claw', anim: 't:overhead:n', sfx: 'heavy' }),
    'B_f~creature': atk('촉수 채찍', [10, 8, 18], 66, [10, 20, 160, 14], { vfx: 'whip', anim: 't:thrust:n' }),
    'C_n~creature': atk('크리처 포효', [12, 10, 20], 36, [-30, 0, 190, 72], { kbX: 8, wallBounce: true, vfx: 'cone', anim: 't:shout:n', sfx: 'shout', voice: '크와아아앙!!' }),
    R: atk('풀메이크업', [12, 26, 30], 24, [0, 8, 64, 44], { cost: 100, effect: 'fullmakeup', dash: 5, ult: { total: 300, cine: 170 }, afterimage: true, anim: 't:flurry:l', sfx: 'super', voice: '완벽하게 만들어 줄게!!' }),
    concealer3: atk('컨실러 3연타', [5, 10, 16], 20, [8, 20, 34, 24], { multiHit: { interval: 4, max: 3 }, anim: 't:flurry:l' }),
    brush_spin: atk('브러시 회전', [5, 14, 16], 38, [-24, 10, 72, 34], { multiHit: { interval: 7, max: 2 }, lastHitKbY: 4, anim: 't:spin:l' }),
    makeup_rush: atk('메이크업 러시', [6, 24, 16], 16, [2, 14, 32, 32], { dash: 3, multiHit: { interval: 5, max: 5 }, lastHitKbY: 5, anim: 't:flurry:l', voice: '톡톡톡톡톡!' }),
    sfx_barrage: atk('특수분장 연타', [6, 20, 16], 16, [2, 14, 34, 32], { dash: 2.5, multiHit: { interval: 5, max: 4 }, debuff: { bleed: 180, slow: 120 }, anim: 't:flurry:l', voice: '상처! 주름! 분칠!' }),
    puff_sprint: atk('퍼프 질주', [4, 16, 14], 13, [2, 14, 30, 32], { dash: 5, multiHit: { interval: 4, max: 4 }, afterimage: true, anim: 't:flurry:l' }),
    highkick_upper: atk('하이킥 어퍼', [7, 6, 22], 68, [-4, 24, 38, 60], { kbY: 9, juggle: true, lift: 4, finisher: true, anim: 't:kick:n', voice: '턱선 살리고~' }),
    fixer_mist: eff('픽서 미스트', 'fixer', [8, 1, 14], { cd: 240, anim: 't:aim:s', sfx: 'spray' }),
    curling_whip: atk('고데기 채찍', [10, 8, 18], 56, [10, 20, 186, 12], { debuff: { bleed: 120 }, vfx: 'whip', anim: 't:thrust:l', voice: '컬 들어갑니다!' }),
    aging_curse: eff('노화 저주', 'curse', [12, 1, 18], { cd: 420, anim: 't:point:s', voice: '세월을 드리지~' }),
    brush_dive: atk('브러시 다이브', [7, 14, 12], 58, [-4, -16, 40, 32], { ...air, lift: -8, anim: 't:dive:l' }),
  }, makeupCmds),
}

// ════════════════════════════════════════════ 배우 ════════════════════════════════════════════
// 상대 기술·커맨드를 보고 복사, 배역(액션·사극·호러)마다 기본기가 바뀐다
const actorCmds: Command[] = [
  { seq: ['A', 'A', 'B'], move: 'duel3' },
  { seq: ['B', 'B'], move: 'spin_slash' },
  { seq: ['A', 'B', 'C'], move: 'ranmu' },
  { seq: ['d', 'f', 'A'], move: 'wire_flykick' },
  { seq: ['dash', 'C'], move: 'dash_thrust' },
  { seq: ['d', 'u', 'B'], move: 'rising_slash' },
  { seq: ['bs', 'D'], move: 'stunt_counter' },
  { seq: ['b', 'f', 'C'], move: 'line_bomb' },
  { seq: ['d', 'd', 'C'], move: 'crying_act' },
  { seq: ['d', 'B'], move: 'ukemi_drop', air: true },
]
export const ACTOR: CharacterData = {
  ...DP, id: 'actor', name: '배우', nameEn: 'ACTOR', color: '#14b8a6', dept: '연기팀', titles: ['단역', '조연', '주연', '톱스타', '명배우'], trait: 'copy',
  desc: '상대 기술과 커맨드를 두 번 보면 따라 한다. 배역을 바꾸면 기본기가 통째로 바뀐다.',
  style: '카피·배역 전환형', difficulty: 3, showcase: ['B_n', 'B_n~sageuk', 'D_n'],
  stats: { power: 3, speed: 4, reach: 3 }, atk: 2.13, assist: 'B_f',
  hp: 990, walkSpeed: 1.9, runSpeed: 3.8, jumpV: 6.8, airDashes: 1,
  commands: actorCmds,
  moves: build({
    A_n: atk('액션 잽', [4, 3, 9], 32, [8, 26, 28, 16], { anim: 't:kick:n' }),
    A_f: atk('앞차기', [6, 4, 12], 38, [10, 18, 40, 20], { anim: 't:kick:n' }),
    A_u: atk('올려차기', [5, 4, 14], 38, [0, 40, 32, 36], { kbY: 4.5, juggle: true, anim: 't:kick:n' }),
    A_d: atk('다리 걸기', [5, 3, 10], 26, [8, 0, 32, 14], { low: true, anim: 't:crouchpoke:n' }),
    A_air: atk('공중 킥', [4, 8, 8], 32, [4, 0, 30, 28], { ...air, anim: 't:airkick:n' }),
    A_aird: atk('내려차기', [6, 10, 10], 42, [-6, -12, 36, 30], { ...air, groundBounce: true, anim: 't:airspike:n' }),
    B_n: atk('돌려차기', [11, 5, 20], 78, [4, 14, 56, 32], { kbX: 6.5, kbY: 3.5, wallBounce: true, anim: 't:kick:n', sfx: 'heavy' }),
    B_f: atk('와이어 킥', [10, 8, 18], 68, [6, 14, 40, 30], { dash: 4.5, lift: 3, kbX: 6, anim: 't:airkick:n' }),
    B_u: atk('공중제비 킥', [8, 6, 20], 62, [-4, 30, 38, 56], { kbY: 7, juggle: true, lift: 4, anim: 't:upper:n' }),
    B_d: atk('슬라이딩', [8, 10, 18], 52, [6, 0, 44, 14], { low: true, dash: 4.5, kbY: 3, anim: 't:sweep:n' }),
    B_air: atk('공중 돌려차기', [7, 8, 12], 62, [0, -4, 50, 34], { ...air, anim: 't:airkick:n' }),
    B_dash: atk('드롭킥', [6, 10, 18], 70, [6, 14, 40, 30], { dash: 5, kbX: 7, wallBounce: true, anim: 't:airkick:n' }),
    C_n: shot('명대사', [10, 1, 18], { kind: 'shout', vx: 5, life: 80, w: 26, h: 26, damage: 40 }, { cd: 90, anim: 't:shout:n', sfx: 'shout', voice: '이거 실화냐!' }),
    C_f: eff('스턴트 구르기', 'roll', [2, 18, 12], { cd: 120, dash: 4, anim: 'special2', voice: '대역 없이!' }),
    C_d: atk('클로즈업 표정연기', [10, 4, 18], 18, [6, 10, 64, 50], { hitstun: 62, cd: 240, anim: 't:pose:n', voice: '(울컥…)' }),
    C_u: atk('와이어 액션', [6, 10, 16], 48, [0, 10, 36, 40], { lift: 9, dash: 2, kbY: 5, juggle: true, anim: 't:upper:n' }),
    C_air: shot('공중 명대사', [8, 1, 14], { kind: 'shout', vx: 5, vy: -1.5, w: 22, h: 22, damage: 32 }, { air: true, anim: 't:shout:n', sfx: 'shout' }),
    D_n: eff('배역 전환', 'role', [8, 1, 8], { cd: 60, anim: 'trait', voice: '이번엔 이 배역!' }),
    D_d: eff('즉흥 연기', 'improv', [8, 1, 12], { cd: 480, anim: 'trait', voice: '방금 그거… 나도!' }),
    D_f: eff('대역 교체', 'double', [2, 20, 10], { cd: 300, anim: 'special2' }),
    // 사극: 소품 칼로 길고 묵직하게
    'A_n~sageuk': atk('칼 찌르기', [6, 4, 12], 38, [10, 22, 64, 14], { vfx: 'slash', anim: 't:thrust:l' }),
    'B_n~sageuk': atk('일도양단', [14, 6, 22], 92, [4, 10, 104, 42], { kbX: 7, kbY: 4, wallBounce: true, vfx: 'slash', anim: 't:overhead:l', sfx: 'heavy', voice: '이얍!!' }),
    'B_f~sageuk': atk('찌르기 돌진', [10, 8, 18], 72, [10, 20, 70, 16], { dash: 5, vfx: 'slash', anim: 't:dashstrike:l' }),
    // 호러: 기어 오고 소름 끼치게
    'A_n~horror': atk('소름 손짓', [6, 6, 12], 30, [6, 10, 42, 40], { debuff: { slow: 60 }, anim: 't:point:n' }),
    'B_n~horror': atk('처녀귀신 기어오기', [10, 16, 18], 28, [4, 0, 40, 26], { low: true, dash: 3, multiHit: { interval: 5, max: 3 }, anim: 't:sweep:n', voice: '끼기기긱…' }),
    'B_f~horror': atk('귀신 순간이동 할퀴기', [12, 6, 18], 60, [6, 14, 40, 36], { effect: 'blinkBehind', vfx: 'claw', anim: 't:blink:n' }),
    R: atk('액션 클라이맥스', [12, 20, 30], 30, [0, 8, 64, 44], { cost: 100, dash: 5, ult: { total: 290, cine: 160 }, anim: 't:dashstrike:l', sfx: 'super', voice: '이 장면… 내가 주인공!' }),
    duel3: atk('결투 3연격', [6, 10, 18], 26, [8, 20, 40, 24], { multiHit: { interval: 4, max: 3 }, vfx: 'slash', anim: 't:flurry:l' }),
    spin_slash: atk('회전 베기', [6, 14, 18], 44, [-24, 10, 74, 34], { multiHit: { interval: 7, max: 2 }, lastHitKbY: 4, vfx: 'slash', anim: 't:spin:l' }),
    ranmu: atk('난무', [6, 24, 16], 16, [2, 14, 34, 32], { dash: 3, multiHit: { interval: 5, max: 5 }, lastHitKbY: 5, vfx: 'slash', anim: 't:flurry:l', voice: '이건 애드리브!' }),
    wire_flykick: atk('와이어 플라잉킥', [8, 12, 18], 70, [6, 14, 40, 30], { dash: 5.5, lift: 3, kbX: 7, kbY: 4, wallBounce: true, afterimage: true, anim: 't:airkick:n', voice: '와이어 당겨!' }),
    dash_thrust: atk('돌진 찌르기', [8, 10, 18], 72, [6, 20, 64, 16], { dash: 6, kbX: 6, vfx: 'slash', anim: 't:dashstrike:l', voice: '액션!' }),
    rising_slash: atk('칼 올려베기', [8, 6, 24], 82, [-6, 24, 42, 66], { kbY: 9, juggle: true, finisher: true, vfx: 'slash', anim: 't:upper:l', voice: '클라이맥스!' }),
    stunt_counter: atk('대역 교체 반격', [4, 8, 16], 48, [6, 10, 40, 40], { effect: 'double', kbX: 5, kbY: 3, anim: 't:dashstrike:n' }),
    line_bomb: shot('명대사 폭탄', [12, 1, 18], { kind: 'shout', vx: 5.5, life: 100, w: 34, h: 34, damage: 54, kbY: 3 }, { cd: 150, anim: 't:shout:n', sfx: 'shout', voice: '너 나한테 왜 그랬어!!' }),
    crying_act: atk('오열 연기', [12, 10, 20], 26, [-60, 0, 186, 42], { hitstun: 42, cd: 240, anim: 't:burst:n', voice: '흐어어엉…' }),
    ukemi_drop: atk('낙법 찍기', [8, 14, 14], 64, [-4, -16, 40, 32], { ...air, lift: -8, groundBounce: true, anim: 't:dive:n' }),
  }, actorCmds),
}

export const CHARACTERS: CharacterData[] = [DP, DIRECTOR, SOUND, GAFFER, ART, MAKEUP, ACTOR]
export const getCharacter = (id: string) => CHARACTERS.find((c) => c.id === id) ?? DP

/** 기술표용: 토큰 → 한글 */
export const TOK_LABEL: Record<string, string> = { A: 'A', B: 'B', C: 'C', D: 'D', R: 'R', f: '→', b: '←', u: '↑', d: '↓', dash: '대시', bs: '백스텝', jump: '점프', airdash: '공중대시' }
export const cmdLabel = (c: Command) => `${c.air ? '공중 ' : ''}${c.seq.map((t) => TOK_LABEL[t]).join(' ')}`
/** 기술 칸 → 한글 입력 */
export function slotLabel(id: string): string {
  const [slot, mode] = id.split('~')
  if (slot === 'R') return 'R'
  const [btn, dir] = slot.split('_')
  const d: Record<string, string> = { n: '', f: '→', b: '←', u: '↑', d: '↓', air: '공중 ', aird: '공중 ↓', dash: '대시 중 ' }
  const pre = d[dir] ?? ''
  const label = pre.endsWith(' ') ? `${pre}${btn}` : `${pre}${pre ? '+' : ''}${btn}`
  const MODE: Record<string, string> = { wide: '광각', tele: '망원', creature: '크리처', sageuk: '사극', horror: '호러' }
  return mode ? `${label} (${MODE[mode] ?? mode})` : label
}

export const KIT_OF: Record<string, string> = { dp: 'camera', director: 'director', sound: 'sound', gaffer: 'gaffer', art: 'art', makeup: 'makeup', actor: 'actor' }

/** 직급별 배율: 체력·공격력 (스테이지 모드) */
export const RANK_MUL = [0.85, 0.9, 0.95, 1, 1.06]

/** 스테이지 모드용: 그 직급에서 쓸 수 있는 기술만 남긴 캐릭터 */
export function atRank(c: CharacterData, rank: number): CharacterData {
  const moves: Record<MoveId, MoveData> = {}
  for (const [id, m] of Object.entries(c.moves)) if ((m.rank ?? 0) <= rank) moves[id] = m
  return { ...c, moves, commands: c.commands.filter((k) => moves[k.move]) }
}

/** 기술의 입력 방법 (커맨드면 커맨드, 아니면 칸) */
export function howTo(c: CharacterData, id: MoveId): string {
  const k = c.commands.find((x) => x.move === id)
  return k ? cmdLabel(k) : slotLabel(id)
}

/** 기술표: 구역별 "입력 ▶ 이름" 줄 */
export function moveList(c: CharacterData): { title: string; lines: string[] }[] {
  const line = (id: MoveId) => { const m = c.moves[id]!; return `${howTo(c, id)} ▶ ${m.name}${m.cost ? ` (SP ${m.cost})` : ''}` }
  const cmdIds = new Set(c.commands.map((k) => k.move))
  const slots = Object.keys(c.moves).filter((id) => !cmdIds.has(id) && !id.startsWith('copy'))
  const base = slots.filter((id) => !id.includes('~'))
  return [
    { title: 'A·B 기본기', lines: base.filter((id) => id[0] === 'A' || id[0] === 'B').map(line) },
    { title: 'C 직업기 · D 특성기 · R 궁극기', lines: base.filter((id) => id[0] === 'C' || id[0] === 'D' || id === 'R').map(line) },
    { title: '고유 커맨드', lines: c.commands.filter((k) => c.moves[k.move]).map((k) => line(k.move)) },
    { title: '특성 모드 변형', lines: slots.filter((id) => id.includes('~')).map(line) },
  ].filter((s) => s.lines.length)
}
