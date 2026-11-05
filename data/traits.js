// 시작 특성: 판마다 3개가 제시되고 1개를 고릅니다.
// unlock: 이 엔딩(최종 직업 id)을 한 번 보면 후보에 추가됨. 없으면 처음부터 가능.
export default [
  { id: 'athlete', name: '체육 특기생', emoji: '🏃', desc: '체력과 근력이 좋다', effects: { stats: { hp: 20, str: 2 }, routes: { muscle: 3 } } },
  { id: 'cinephile', name: '영화광', emoji: '🍿', desc: '1년에 300편을 본다', effects: { stats: { sen: 2 }, routes: { art: 3, indie: 1 } } },
  { id: 'engineer', name: '공대 출신', emoji: '🔌', desc: '기계를 뜯어봐야 직성이 풀린다', effects: { stats: { tec: 2 }, routes: { data: 3 } } },
  { id: 'insider', name: '인싸', emoji: '🥂', desc: '전화번호부가 두껍다', effects: { stats: { cha: 2 }, routes: { social: 3 } } },
  { id: 'rich', name: '금수저', emoji: '🥄', desc: '통장이 든든하다', effects: { money: 700, routes: { money: 2 } } },
  { id: 'poor', name: '흙수저', emoji: '🪨', desc: '잃을 게 없다. 경험치 +15%', effects: { money: -80, flags: ['hungry'], routes: { rebel: 2 } } },
  { id: 'artschool', name: '예술학교 출신', emoji: '🎓', desc: '단편으로 상을 받아봤다', effects: { stats: { sen: 1 }, routes: { indie: 3, art: 1 }, flags: ['short_award'] } },
  { id: 'youtuber', name: '유튜버 출신', emoji: '📱', desc: '혼자 찍고 혼자 붙여봤다', effects: { stats: { tec: 1, cha: 1 }, routes: { social: 1, data: 1 }, flags: ['youtube'] } },
  // ── 엔딩으로 해금 ──
  { id: 'focus_born', name: '포커스 천재', emoji: '🎯', desc: '움직이는 것도 놓치지 않는다', unlock: 'eternal_first', effects: { stats: { sen: 2, tec: 1 }, routes: { focus: 4 } } },
  { id: 'gear_heir', name: '렌탈샵 집 자식', emoji: '🧰', desc: '장비를 장난감처럼 갖고 놀았다', unlock: 'rental_ceo', effects: { items: ['old_tripod', 'nd_filter'], routes: { data: 2, money: 2 } } },
  { id: 'union_kid', name: '노조 2세', emoji: '✊', desc: '근로계약서부터 읽는다', unlock: 'union_leader', effects: { stats: { cha: 2 }, routes: { rebel: 4 } } },
  { id: 'wedding_kid', name: '웨딩홀 집 자식', emoji: '💒', desc: '주말마다 예식장에서 자랐다', unlock: 'wedding_ceo', effects: { flags: ['wedding'], routes: { money: 2, social: 2 } } },
]
