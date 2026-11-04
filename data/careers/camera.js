// 촬영 계열. 직급은 배열 순서대로 올라갑니다.
// pay: 회차(12시간)당 페이 범위(만원) / staminaCost: 프로젝트당 체력 소모
// growth: 프로젝트를 마칠 때마다 오르는 능력치(소수점 누적) / repGain: 프로젝트당 평판
// promote.when: 승진 조건(조건 형식은 이벤트와 동일) / promote.chance: 조건 충족 시 기본 승진 확률(%)
export default {
  id: 'camera',
  name: '촬영',
  emoji: '🎥',
  implemented: true,
  duelMoves: 'camera',   // data/minigames/duel.js의 moves 키
  ranks: [
    {
      id: 'maknae', name: '막내', image: 'player_maknae',
      pay: [15, 25], staminaCost: 3.6, repGain: 0.6,
      growth: { skill: 0.45, stamina: 0.25, network: 0.15 },
      duties: '밥차 챙기기, 커피 심부름, 슬레이트, 케이블 정리',
      promote: { to: 'third', when: { rankProjects: '>=3', stats: { skill: '>=4' }, favor: '>=35' }, chance: 55 },
    },
    {
      id: 'third', name: '서드', image: 'player_third',
      pay: [20, 30], staminaCost: 3.1, repGain: 0.9,
      growth: { skill: 0.5, network: 0.25 },
      duties: '배터리·메모리 관리, 장비 세팅, 모니터 라인',
      promote: { to: 'second', when: { rankProjects: '>=4', stats: { skill: '>=6' }, favor: '>=40' }, chance: 50 },
    },
    {
      id: 'second', name: '세컨드', image: 'player_second',
      pay: [30, 40], staminaCost: 2.7, repGain: 1.3,
      growth: { skill: 0.45, sense: 0.3, network: 0.2 },
      duties: '렌즈 교체, 카메라 리포트, 데이터 관리',
      promote: { to: 'first', when: { rankProjects: '>=7', stats: { skill: '>=9', sense: '>=6' }, favor: '>=50' }, chance: 40 },
    },
    {
      id: 'first', name: '퍼스트(포커스풀러)', image: 'player_first',
      pay: [40, 55], staminaCost: 2.5, repGain: 1.7,
      growth: { skill: 0.3, sense: 0.4, network: 0.35 },
      duties: '포커스, 팀원 선발, 장비 리스트',
      perks: ['팀원을 직접 뽑는다'],
      promote: { to: 'dop', when: { rankProjects: '>=9', stats: { sense: '>=10', network: '>=8' }, favor: '>=55', any: [{ stats: { rep: '>=35' } }, { flags: ['director_noticed'] }] }, chance: 35 },
    },
    {
      id: 'dop', name: '촬영감독(DOP)', image: 'player_dop',
      pay: [50, 110], staminaCost: 2.2, repGain: 2.4,
      growth: { sense: 0.45, network: 0.3 },
      duties: '룩 설계, 조명 지시, 카메라팀 운영',
    },
  ],
}
