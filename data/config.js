// 게임 전체 설정 (밸런스 숫자)
export default {
  title: '촬영현장 RPG',
  subtitle: '막내에서 최종 전직까지. 찍은 스킬과 고른 선택이 루트를 가른다.',

  startAge: 20,
  projectsPerRun: 10,     // 한 판 = 작품 10개
  yearsPerProject: 2,     // 작품 하나마다 나이 +2

  nodesPerProject: 2,     // 보스 전 칸 수 (각 칸마다 2갈래 중 선택)
  nodeChoices: 2,
  offersPerProject: 3,    // 다음 작품 의뢰 후보 수

  // 레벨: 다음 레벨까지 필요한 경험치 = base + perLevel × (현재 레벨 - 1)
  exp: { base: 16, perLevel: 9 },
  maxLevel: 25,
  // 이 레벨이 되면 전직 (tier 1~4)
  jobTierLevels: { 1: 5, 2: 10, 3: 15, 4: 20 },
  levelUpHeal: 0.4,       // 레벨업 시 HP·MP 최대치의 이 비율만큼 회복
  skillChoices: 3,        // 레벨업 때 제시되는 스킬 후보 수

  // 시작 능력치
  startStats: { hp: 60, mp: 20, str: 4, tec: 4, sen: 4, cha: 4 },
  startMoney: 100,

  combat: {
    mpRegen: 2,            // 매 턴 MP 회복
    critBase: 5, critPerSen: 1.2, critMul: 1.6,
    weakMul: 1.5, resistMul: 0.6,
    defPerTec: 0.25,       // 기술 1당 받는 피해 감소
    enemyScale: 0.16,      // 작품 번호가 오를 때마다 적 능력치 +16%
    lose: { hp: 0.3, moneyPct: 0.08 },  // 패배해도 게임오버 없음: HP 30%로, 돈 일부 손해
  },

  rest: { heal: 0.5 },
  shop: { items: 3, potion: { name: '박카스', price: 45, heal: 0.5, mana: 0.4 } },  // 가방에 넣어 전투 중 사용
  startBag: 2,

  // 지도 칸 비중: 시뮬레이션(사건) 중심. fight = 1대다수 액션, elite·boss = 1대1 턴제
  nodeWeights: { event: 44, fight: 26, elite: 9, rest: 12, shop: 9 },

  // 1대다수 액션 전투
  action: {
    count: { base: 3, perProject: 0.5, max: 8 },   // 무리 수
    mobHp: 0.42, mobAtk: 0.45,                     // 1대1 능력치 대비 배율
    timeLimit: 75,                                 // 초. 넘기면 촬영 지연
    mpRegen: 1.5,                                  // 초당
  },

  // 작품 평가: 점수 → 등급 (보상 배수)
  grades: [
    { min: 7, id: 'S', mul: 1.7 },
    { min: 5, id: 'A', mul: 1.35 },
    { min: 3, id: 'B', mul: 1.0 },
    { min: 1, id: 'C', mul: 0.8 },
    { min: -99, id: 'D', mul: 0.6 },
  ],
}
