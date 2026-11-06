// 훈련장 콤보 트라이얼: 캐릭터마다 쉬움 → 보통 → 어려움. 한 콤보 안에 순서대로 맞히면 성공.
// 모든 트라이얼은 tests/training.test.ts 에서 시범 입력으로 실제 성공하는지 확인합니다.
import type { Trial } from '../core/Trial'

export const TRIALS: Record<string, Trial[]> = {
  dp: [
    { name: '잽 → 트래킹 슬라이드', level: '쉬움', moves: ['A_n', 'B_d'], hint: '맞는 순간 ↓+B로 캔슬' },
    { name: '잽 · 렌즈 찌르기 → 돌리 트랙', level: '보통', moves: ['A_n', 'A_f', 'dolly_track'], hint: 'A, →A 다음 ↓→C' },
    { name: '로우앵글 → 돌리 → 원테이크', level: '어려움', moves: ['A_n', 'lowangle_burst', 'dolly_track', 'R'], hint: 'A, ↓↓A, ↓→C, 마지막에 R' },
  ],
  director: [
    { name: '슬레이트 → 앞 강공격', level: '쉬움', moves: ['A_n', 'B_f'] },
    { name: '하단 연계', level: '보통', moves: ['A_n', 'A_d', 'B_d'], hint: 'A, ↓A, ↓B' },
    { name: '하단 → 리테이크', level: '어려움', moves: ['A_n', 'A_d', 'R'], hint: 'A, ↓A, 맞는 순간 R (궁극기는 콤보 마무리로 이어짐)' },
  ],
  sound: [
    { name: '붐 툭 → 붐 스윙', level: '쉬움', moves: ['A_n', 'B_n'] },
    { name: '붐 삼단', level: '보통', moves: ['A_n', 'A_n', 'boom_triple'] },
    { name: '연타 → 동시녹음 풀레벨', level: '어려움', moves: ['A_n', 'A_n', 'R'] },
  ],
  gaffer: [
    { name: '잽 → 앞 강공격', level: '쉬움', moves: ['A_n', 'B_f'] },
    { name: '하이라이트 3연', level: '보통', moves: ['A_n', 'A_n', 'highlight3'] },
    { name: '연타 → 18K 풀 파워', level: '어려움', moves: ['A_n', 'A_n', 'R'] },
  ],
  art: [
    { name: '망치 → 앞 강공격', level: '쉬움', moves: ['A_n', 'B_f'] },
    { name: '합판 던지기 연계', level: '보통', moves: ['A_n', 'A_n', 'plywood_throw'] },
    { name: '연타 → 세트 체인지', level: '어려움', moves: ['A_n', 'A_n', 'R'] },
  ],
  makeup: [
    { name: '퍼프 → 하단 강공격', level: '쉬움', moves: ['A_n', 'B_d'] },
    { name: '하단 → 메이크업 러시', level: '보통', moves: ['A_n', 'A_d', 'makeup_rush'] },
    { name: '컨실러 → 브러시 스핀 → 풀메이크업', level: '어려움', moves: ['A_n', 'concealer3', 'brush_spin', 'R'] },
  ],
  actor: [
    { name: '잽 → 앞 강공격', level: '쉬움', moves: ['A_n', 'B_f'] },
    { name: '결투 3합', level: '보통', moves: ['A_n', 'A_n', 'duel3'] },
    { name: '와이어 킥 → 눈물 연기', level: '어려움', moves: ['A_n', 'wire_flykick', 'crying_act'] },
  ],
}

const KEY = 'rolling.trials.v1'
export function loadTrialDone(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}
export function saveTrialDone(id: string) {
  const d = loadTrialDone(); d[id] = true
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* 저장 실패해도 계속 */ }
}
