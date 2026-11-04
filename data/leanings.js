// 성향 축 3개 (화면에 숫자로 나오지 않음). 이벤트 효과 lean: { art: 1 } / { money: 1 } 처럼 양쪽 이름으로 씁니다.
// center: 평범하게 플레이했을 때의 중앙값(tools/simulate.js로 측정). 이 값보다 높으면 pos 쪽 성향입니다.
//         조건 lean: { art: '>=2' }도 center 기준의 상대값으로 판정합니다.
export const axes = [
  { id: 'art',    pos: 'art',    neg: 'money', posName: '예술', negName: '돈',   center: -3 },
  { id: 'risk',   pos: 'risk',   neg: 'safe',  posName: '도전', negName: '안정', center: -4.5 },
  { id: 'people', pos: 'people', neg: 'tech',  posName: '사람', negName: '기술', center: 8 },
]

// 조합 키: 각 축에서 고른 쪽 이름을 '-'로 연결 (예: art-risk-people)
export const combos = {
  'art-risk-people':   { name: '낭만파 동료',       line: '돈보다 그림, 안전보다 모험, 그리고 늘 사람 곁에 있었다.' },
  'art-risk-tech':     { name: '고집 센 장인',       line: '좋은 그림을 위해서라면 혼자서라도 끝까지 밀어붙였다.' },
  'art-safe-people':   { name: '다정한 예술가',      line: '무리하지 않고, 곁의 사람들과 오래 좋은 것을 만들었다.' },
  'art-safe-tech':     { name: '조용한 탐미주의자',  line: '조용히, 정확하게, 아름다운 것만 남기려 했다.' },
  'money-risk-people': { name: '수완 좋은 개척자',   line: '사람을 모아 판을 벌이고, 새 길을 먼저 뚫었다.' },
  'money-risk-tech':   { name: '계산 빠른 승부사',   line: '기회가 보이면 망설이지 않았고, 대부분 계산대로였다.' },
  'money-safe-people': { name: '든든한 현장 살림꾼', line: '팀을 먹이고 재우고, 현장이 굴러가게 만든 사람이었다.' },
  'money-safe-tech':   { name: '믿음직한 기술자',    line: '맡긴 일은 반드시 해냈다. 그것만으로 충분했다.' },
}

export default { axes, combos }
