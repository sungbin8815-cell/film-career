// 커리어 트랙. 우열 없이 장단점만 다르게.
// projectsPerYear: 1년에 몇 개 프로젝트 → 나이 증가 속도, 생활비 분배
// days: 프로젝트당 회차 수 범위 / payMul: 페이 배수 / staminaMul: 체력 소모 배수
// mentalCost: 프로젝트당 멘탈 소모 / repMul: 평판 획득 배수 / favorGain: 프로젝트당 팀장 호감도 / gapChance: 끝난 뒤 공백기 확률
export default [
  {
    id: 'film', name: '영화', emoji: '🎞️',
    projectsPerYear: 3, days: [25, 40], payMul: 1.0, staminaMul: 1.3, mentalCost: 0.15, repMul: 1.4,
    favorGain: 4, gapChance: 0.35,
    pros: '필모그래피와 평판이 잘 쌓인다', cons: '밤샘이 길고 작품 사이 공백이 잦다',
    projectNames: ['장편영화 〈{t}〉', '상업영화 〈{t}〉', '독립장편 〈{t}〉'],
  },
  {
    id: 'ott', name: 'OTT·드라마', emoji: '📺',
    projectsPerYear: 3, days: [35, 55], payMul: 0.95, staminaMul: 1.2, mentalCost: 0.25, repMul: 1.0,
    favorGain: 3, gapChance: 0.1,
    pros: '회차가 많아 수입이 안정적', cons: '긴 스케줄로 몸과 멘탈이 깎인다',
    projectNames: ['OTT 시리즈 〈{t}〉', '미니시리즈 〈{t}〉', '드라마 〈{t}〉'],
  },
  {
    id: 'ad', name: '광고 프로덕션', emoji: '📣',
    projectsPerYear: 4, days: [14, 24], payMul: 1.35, staminaMul: 0.85, mentalCost: 0.05, repMul: 0.7,
    favorGain: 3, gapChance: 0.2,
    pros: '짧고 굵게, 회차당 페이가 높다', cons: '업계 평판은 천천히 오른다',
    projectNames: ['{b} 광고', '{b} 브랜드 필름', '{b} 바이럴 영상'],
  },
  {
    id: 'freelance', name: '프리랜서', emoji: '🎒',
    projectsPerYear: 4, days: [8, 34], payMul: 1.1, staminaMul: 0.9, mentalCost: 0.1, repMul: 0.9,
    favorGain: 1, gapChance: 0.3,
    pros: '일을 골라 하고 여러 곳과 인연이 생긴다', cons: '일감 편차가 커서 통장이 불안하다',
    projectNames: ['뮤직비디오 〈{t}〉', '{b} 행사 영상', '웹드라마 〈{t}〉', '단편 〈{t}〉'],
  },
]
