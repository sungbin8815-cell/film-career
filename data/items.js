// 장비. slot: tool(손에 드는 장비) / gear(몸에 다는 장비) 각 1개씩 장착.
//   stats: 능력치 보너스 / boost: 속성 피해 증가 { focus: 0.2 } = 포커스 속성 +20%
//   def: 받는 피해 감소 / rarity: common rare epic legend / tier: 상점·드롭에 나오기 시작하는 단계(1~3)
export default [
  // tool
  { id: 'old_tripod', name: '녹슨 삼각대', slot: 'tool', rarity: 'common', tier: 1, price: 60, stats: { str: 2 }, boost: { muscle: 0.1 } },
  { id: 'cheap_50mm', name: '중고 50mm 렌즈', slot: 'tool', rarity: 'common', tier: 1, price: 70, stats: { sen: 2 }, boost: { focus: 0.1 } },
  { id: 'card_reader', name: '고속 카드리더기', slot: 'tool', rarity: 'common', tier: 1, price: 60, stats: { tec: 2 }, boost: { data: 0.1 } },
  { id: 'walkie', name: '무전기', slot: 'tool', rarity: 'common', tier: 1, price: 55, stats: { cha: 2 }, boost: { social: 0.1 } },
  { id: 'carbon_tripod', name: '카본 삼각대', slot: 'tool', rarity: 'rare', tier: 2, price: 160, stats: { str: 4, hp: 10 }, boost: { muscle: 0.2 } },
  { id: 'cine_prime', name: '시네 프라임 렌즈 세트', slot: 'tool', rarity: 'rare', tier: 2, price: 180, stats: { sen: 4 }, boost: { focus: 0.2, art: 0.1 } },
  { id: 'raid_drive', name: 'RAID 백업 드라이브', slot: 'tool', rarity: 'rare', tier: 2, price: 170, stats: { tec: 4, mp: 5 }, boost: { data: 0.2 } },
  { id: 'gold_card', name: '금장 명함', slot: 'tool', rarity: 'rare', tier: 2, price: 150, stats: { cha: 4 }, boost: { social: 0.2, money: 0.2 } },
  { id: 'wireless_ff', name: '무선 팔로우포커스', slot: 'tool', rarity: 'epic', tier: 3, price: 320, stats: { sen: 5, tec: 3 }, boost: { focus: 0.35 } },
  { id: 'jib_arm', name: '전동 지미집', slot: 'tool', rarity: 'epic', tier: 3, price: 320, stats: { str: 6, hp: 20 }, boost: { muscle: 0.35 } },
  { id: 'anamorphic', name: '전설의 아나모픽 렌즈', slot: 'tool', rarity: 'legend', tier: 3, price: 600, stats: { sen: 8, mp: 10 }, boost: { art: 0.4, focus: 0.2, indie: 0.3 } },
  { id: 'master_monitor', name: '레퍼런스 모니터', slot: 'tool', rarity: 'legend', tier: 3, price: 600, stats: { tec: 7, sen: 4 }, boost: { data: 0.4, art: 0.2 } },
  // gear
  { id: 'kneepad', name: '무릎 보호대', slot: 'gear', rarity: 'common', tier: 1, price: 50, stats: { hp: 12 }, def: 1 },
  { id: 'heat_pack', name: '핫팩 조끼', slot: 'gear', rarity: 'common', tier: 1, price: 55, stats: { hp: 8, mp: 4 } },
  { id: 'nd_filter', name: 'ND 필터 파우치', slot: 'gear', rarity: 'common', tier: 1, price: 60, stats: { tec: 1, sen: 1 } },
  { id: 'rain_cover', name: '레인커버', slot: 'gear', rarity: 'rare', tier: 2, price: 140, stats: { hp: 15 }, def: 2 },
  { id: 'back_brace', name: '허리 보호대', slot: 'gear', rarity: 'rare', tier: 2, price: 150, stats: { hp: 20, str: 2 }, def: 1 },
  { id: 'tool_belt', name: '그립 공구벨트', slot: 'gear', rarity: 'rare', tier: 2, price: 150, stats: { str: 2, tec: 2 }, def: 1 },
  { id: 'steadi_vest', name: '스테디캠 조끼', slot: 'gear', rarity: 'epic', tier: 3, price: 300, stats: { hp: 25, str: 4 }, def: 3, boost: { muscle: 0.15 } },
  { id: 'crew_jacket', name: '쫑파티 기념 점퍼', slot: 'gear', rarity: 'epic', tier: 3, price: 280, stats: { cha: 5, mp: 8 }, def: 2, boost: { social: 0.15 } },
  { id: 'director_viewfinder', name: '감독용 뷰파인더', slot: 'gear', rarity: 'legend', tier: 3, price: 550, stats: { sen: 6, cha: 3 }, def: 2, boost: { indie: 0.3, art: 0.2 } },
]
