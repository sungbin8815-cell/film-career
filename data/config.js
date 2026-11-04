// 게임 전체 밸런스 수치. 숫자만 바꿔도 난이도·플레이 시간이 바뀝니다.
export default {
  title: '촬영현장 커리어',
  subtitle: '막내부터 촬영감독까지',

  // 능력치 정의. id는 이벤트·엔딩 조건에서 쓰는 이름입니다.
  stats: [
    { id: 'stamina', name: '체력', icon: '❤️', min: 0, max: 20 },
    { id: 'skill',   name: '기술', icon: '🔧', min: 0, max: 20 },
    { id: 'sense',   name: '감각', icon: '👁️', min: 0, max: 20 },
    { id: 'network', name: '인맥', icon: '🤝', min: 0, max: 20 },
    { id: 'mental',  name: '멘탈', icon: '🧠', min: 0, max: 20 },
    { id: 'rep',     name: '평판', icon: '⭐', min: 0, max: 100 },
    { id: 'money',   name: '통장', icon: '💰', unit: '만원' },
  ],
  favor: { name: '팀장 호감도', icon: '💬', min: 0, max: 100 },

  start: {
    random: ['stamina', 'skill', 'sense', 'network', 'mental'],
    range: [1, 10],        // 랜덤 능력치 범위
    rep: 0,
    money: [50, 150],      // 만원
    age: 19,
    rerolls: 1,
    favor: 30,             // 첫 현장 팀장 호감도
  },

  // 판정: 성공 확률 = base + Σ(능력치 × 가중치 × perPoint)
  // 굴림(1~100) ≤ 확률 × greatRatio → 대성공, ≤ 확률 → 성공, 그 외 실패
  check: { perPoint: 4, min: 5, max: 95, greatRatio: 0.3 },

  economy: {
    livingCostPerYear: 1400,           // 만원. 프로젝트당 = 연 생활비 ÷ 트랙의 연간 프로젝트 수
    passiveIncome: {                    // 플래그별 프로젝트당 부수입
      gear_owner: 90,
      wedding_regular: 70,
    },
  },

  body: {
    recoverPerProject: 2.6,   // 프로젝트 사이 자연 회복
    agingFrom: 38,            // 이 나이부터 체력 소모 증가
    agingExtraDrain: 0.6,
    rest: { stamina: 7, mental: 3 },  // '한 작품 쉬어간다' 효과
    // 능력치가 처음 0이 되면 쓰러져서 쉼(플래그 기록). 플래그가 있는 상태에서 또 0이 되면 엔딩(endings.js)
    collapse: [
      { stat: 'stamina', flag: 'injured_once', restProjects: 1, restore: 6, title: '현장에서 쓰러졌다', image: 'hospital',
        text: '눈을 떠보니 병원이었다. 의사가 "이대로면 다음엔 정말 못 일어나요"라고 했다. 한 작품을 통째로 쉬었다.' },
      { stat: 'mental', flag: 'burnout_once', restProjects: 1, restore: 2, title: '아무것도 할 수 없었다', image: 'home',
        text: '휴대폰을 끄고 한 달 동안 방에서 나가지 않았다. 친구가 찾아와 밥을 사줬다. 조금씩 숨이 쉬어진다.' },
    ],
  },

  career: {
    maxYears: 15,           // 현장 경력 N년이 되면 커리어 종료 → 엔딩 판정
    maxAge: 52,
    retireAfterYears: 7,    // 이 경력 이후 '은퇴한다' 버튼 노출
  },

  eventChance: { project: 0.85, between: 0.45 },  // 프로젝트 중/사이 이벤트 확률

  promote: { favorBonusPer10: 4, mentalBoost: 2 },  // 승진 확률 보너스: 호감도 10당 +N% / 승진 시 멘탈 회복

  defaultCareer: 'camera',  // 아직 구현 안 된 계열을 골랐을 때 진행할 계열
}
