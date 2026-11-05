// 작품 종류와 수식어. 작품마다 의뢰 3개가 제시되고 1개를 고릅니다.
//   pay: 기본 페이(만원) / fame: 기본 명성 / routes: 이 작품을 끝내면 쌓이는 성향
//   names: 작품 이름 형식 ({t} 제목, {b} 브랜드) / minProject: 이 작품 번호부터 등장
export const types = [
  { id: 'short', name: '단편영화', emoji: '🎬', pay: 40, fame: 3, routes: { indie: 2, art: 1 }, names: ['단편 〈{t}〉', '졸업작품 〈{t}〉'] },
  { id: 'webdrama', name: '웹드라마', emoji: '📲', pay: 80, fame: 3, routes: { social: 1, money: 1 }, names: ['웹드라마 〈{t}〉'] },
  { id: 'mv', name: '뮤직비디오', emoji: '🎤', pay: 90, fame: 4, routes: { art: 2 }, names: ['뮤직비디오 〈{t}〉'] },
  { id: 'ad', name: '광고', emoji: '📣', pay: 160, fame: 2, routes: { money: 2 }, names: ['{b} 광고', '{b} 캠페인 필름'] },
  { id: 'wedding', name: '웨딩', emoji: '💒', pay: 110, fame: 1, routes: { money: 1, social: 1 }, names: ['{t} 커플 본식 영상'] },
  { id: 'youtube', name: '유튜브 협업', emoji: '📱', pay: 70, fame: 3, routes: { social: 2 }, names: ['{b} 브랜드 채널 영상', '구독자 100만 채널 〈{t}〉'] },
  { id: 'ott', name: 'OTT 시리즈', emoji: '📺', pay: 200, fame: 6, routes: { money: 1, focus: 1 }, minProject: 2, names: ['OTT 시리즈 〈{t}〉', '8부작 〈{t}〉'] },
  { id: 'film', name: '상업영화', emoji: '🎞️', pay: 180, fame: 8, routes: { art: 1, focus: 1 }, minProject: 2, names: ['장편영화 〈{t}〉', '상업영화 〈{t}〉'] },
]

// 수식어: 작품마다 0~1개 랜덤. 적 강화와 보상이 같이 바뀝니다.
//   enemyHp / enemyAtk / pay / fame: 배수, routes: 끝내면 추가로 쌓이는 성향, flags: 붙는 플래그
export const affixes = [
  { id: 'rain_season', name: '장마 시즌', emoji: '🌧️', desc: '적 HP +20%, 페이 +20%', enemyHp: 1.2, pay: 1.2 },
  { id: 'half_budget', name: '예산 반토막', emoji: '✂️', desc: '페이 -40%, 투쟁 성향 +2', pay: 0.6, routes: { rebel: 2 } },
  { id: 'blockbuster', name: '천만 기대작', emoji: '🔥', desc: '적 공격 +25%, 명성 ×2', enemyAtk: 1.25, fame: 2, types: ['film', 'ott'] },
  { id: 'master_director', name: '거장 감독', emoji: '🧓', desc: '명성 +50%, 감각 성향 +2', fame: 1.5, routes: { art: 2 }, types: ['film', 'short', 'mv'] },
  { id: 'rookie_director', name: '신인 감독', emoji: '🐣', desc: '적 약함, 작가주의 성향 +2', enemyHp: 0.85, routes: { indie: 2 } },
  { id: 'night_hell', name: '야간촬영 지옥', emoji: '🌑', desc: '적 공격 +20%, 근력 성향 +2', enemyAtk: 1.2, routes: { muscle: 2 } },
  { id: 'abroad', name: '해외 로케', emoji: '✈️', desc: '페이 +30%, 명성 +30%', pay: 1.3, fame: 1.3, flags: ['abroad'] },
  { id: 'star_cast', name: '톱스타 캐스팅', emoji: '🌟', desc: '보스 HP +30%, 명성 +60%', bossHp: 1.3, fame: 1.6 },
  { id: 'passion_pay', name: '열정페이', emoji: '🔥', desc: '페이 -50%, 경험치 +40%', pay: 0.5, exp: 1.4 },
  { id: 'big_client', name: '대기업 클라이언트', emoji: '🏦', desc: '페이 +60%, 돈 성향 +2', pay: 1.6, routes: { money: 2 }, types: ['ad', 'youtube', 'wedding'] },
]

export default { types, affixes }
