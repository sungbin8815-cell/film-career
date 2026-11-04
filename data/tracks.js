// 트랙: 우열 없이 분위기와 페이만 다름. 이벤트에서 setTrack으로 오갑니다.
// payMul: 시즌 페이 배수 / projectNames: 필모그래피에 남는 작품 이름 형식 ({t}=제목, {b}=브랜드)
export default [
  { id: 'film', name: '영화', emoji: '🎞️', payMul: 1.0,
    projectNames: ['장편영화 〈{t}〉', '상업영화 〈{t}〉', '독립장편 〈{t}〉'] },
  { id: 'ott', name: 'OTT·드라마', emoji: '📺', payMul: 1.15,
    projectNames: ['OTT 시리즈 〈{t}〉', '미니시리즈 〈{t}〉', '드라마 〈{t}〉'] },
  { id: 'ad', name: '광고 프로덕션', emoji: '📣', payMul: 1.3,
    projectNames: ['{b} 광고', '{b} 브랜드 필름', '{b} 캠페인'] },
  { id: 'freelance', name: '프리랜서', emoji: '🎒', payMul: 0.9,
    projectNames: ['뮤직비디오 〈{t}〉', '웹드라마 〈{t}〉', '{b} 행사 영상', '단편 〈{t}〉'] },
]
