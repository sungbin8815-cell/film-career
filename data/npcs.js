// 반복 등장 인연. 텍스트에서 {peer} {senior} {director} {ceo} {actor}로 이름이 들어갑니다.
// 관계(bond)와 기억(remember)은 이벤트 효과로 쌓이고, 기억은 "언제 생겼는지"가 함께 저장됩니다.
export default [
  { id: 'peer',     name: '정민',   role: '동기',       emoji: '🧑', image: 'npc_peer',
    desc: '같은 시기에 시작한 동기. 웃음이 많고 덤벙댄다.' },
  { id: 'senior',   name: '강태식', role: '선배 퍼스트', emoji: '🧔', image: 'npc_senior',
    desc: '말수 적은 촬영팀 퍼스트. 일 잘하는 사람만 기억한다.' },
  { id: 'director', name: '윤서진', role: '감독',       emoji: '🎬', image: 'npc_director',
    desc: '독립영화 출신 감독. 현장에서 막내에게도 의견을 묻는다.' },
  { id: 'ceo',      name: '박 대표', role: '제작사 대표', emoji: '💼', image: 'npc_ceo',
    desc: '수완 좋은 제작사 대표. 돈 냄새를 잘 맡는다.' },
  { id: 'actor',    name: '한유리', role: '배우',       emoji: '🌟', image: 'npc_actor',
    desc: '무명부터 시작한 배우. 현장 스태프 이름을 다 외운다.' },
]
