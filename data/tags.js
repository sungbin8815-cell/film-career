// 꼬리표: 같은 종류의 선택(mark)이 쌓이면 붙습니다. 좋고 나쁨 없이 이후 이벤트·선택지의 조건이 됩니다.
//   mark: { id, count }  → 그 기록이 count번 쌓이면
//   when: 조건            → 조건이 맞으면 (mark와 함께 쓰면 둘 다 만족해야 함)
export default [
  { id: 'gear_kid',    name: '장비 잘 아는 애',      mark: { id: 'fix', count: 3 },
    desc: '고장 나면 다들 나를 찾는다.' },
  { id: 'talker',      name: '말 많은 막내',          mark: { id: 'speak_up', count: 3 },
    desc: '감독 앞에서도 할 말은 한다.' },
  { id: 'youtuber',    name: '현장보다 유튜브 사람',  mark: { id: 'outsource', count: 3 },
    desc: '혼자 찍고 혼자 붙이는 게 익숙하다.' },
  { id: 'iron_body',   name: '철인',                  mark: { id: 'muscle', count: 3 },
    desc: '무거운 건 다 내 몫이 되었다.' },
  { id: 'planner',     name: '계획표 인간',           mark: { id: 'plan', count: 3 },
    desc: '몸 대신 엑셀로 현장을 굴린다.' },
  { id: 'good_eye',    name: '그림 보는 눈',          mark: { id: 'eye', count: 3 },
    desc: '모니터 앞에서 다들 내 표정을 본다.' },
  { id: 'peacemaker',  name: '현장 중재자',           mark: { id: 'mediate', count: 3 },
    desc: '싸움이 나면 다들 나를 부른다.' },
  { id: 'loner',       name: '혼자 하는 사람',        mark: { id: 'solo', count: 3 },
    desc: '팀보다 혼자가 편하다.' },
  { id: 'filmmaker',   name: '자기 영화 찍는 사람',   mark: { id: 'own_film', count: 3 },
    desc: '현장 일 사이사이 내 영화를 찍는다.' },
  { id: 'fighter',     name: '할 말 하는 사람',       mark: { id: 'protest', count: 2 },
    desc: '부당한 건 그냥 넘기지 않는다.' },
  { id: 'steady_hand', name: '포커스 장인',           mark: { id: 'focus', count: 2 },
    desc: '움직이는 배우도 놓치지 않는다.' },
  { id: 'homebody',    name: '본가 사람',             when: { flags: ['at_home'] },
    desc: '부모님 집에서 출퇴근한다.' },
]
