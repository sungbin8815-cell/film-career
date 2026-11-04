// 학생 단계 이벤트 (slot: 'student')
// 스키마는 README의 "이벤트 추가하기" 참고.
export default [
  {
    id: 'stu_short_film',
    slot: 'student', weight: 12, once: true,
    title: '단편영화 촬영',
    image: 'classroom',
    text: '과제로 단편영화를 찍는다. 팀에서 어떤 역할을 맡을까?',
    choices: [
      {
        label: '촬영을 맡는다',
        check: { stats: { skill: 1, sense: 0.5 }, base: 20 },
        outcomes: {
          great: { text: '조명 하나로 만든 롱테이크가 화제가 됐다. 교수님이 이름을 외웠다.', effects: { stats: { skill: 2, rep: 4 }, flags: ['festival_short'] } },
          success: { text: '무난하게 완성. 장비 다루는 손이 조금 익었다.', effects: { stats: { skill: 1 } } },
          fail: { text: '포커스가 전부 나갔다. 합평회에서 조용히 고개를 숙였다.', effects: { stats: { mental: -1 } } },
        },
      },
      {
        label: '연출을 맡는다',
        check: { stats: { sense: 1, network: 0.5 }, base: 15, bonus: [{ when: { flags: ['art_school'] }, add: 10, label: '예술학교 +10' }] },
        outcomes: {
          great: { text: '작품이 학교 대표로 뽑혀 영화제에 나간다!', effects: { stats: { sense: 2, rep: 6 }, flags: ['festival_short'] } },
          success: { text: '팀원들과 끝까지 완주했다. 사람 다루는 법을 배웠다.', effects: { stats: { sense: 1, network: 1 } } },
          fail: { text: '촬영 중 팀이 쪼개졌다. 결국 미완성.', effects: { stats: { network: -1, mental: -1 } } },
        },
      },
      { label: '그냥 스태프로 돕는다', text: '이것저것 날랐다. 선배들이 성실하다고 기억해 줬다.', effects: { stats: { network: 1, stamina: 1 } } },
    ],
  },
  {
    id: 'stu_senior_set',
    slot: 'student', weight: 10, once: true,
    title: '선배 현장 보조',
    image: 'set_day',
    text: '졸업한 선배가 상업영화 현장 보조 자리가 났다고 연락했다. 3일, 일당은 적다.',
    choices: [
      {
        label: '간다',
        check: { stats: { stamina: 1 }, base: 30 },
        outcomes: {
          great: { text: '눈치 빠르게 움직였더니 촬영팀 퍼스트가 번호를 물어봤다.', effects: { stats: { network: 2, skill: 1, money: 30 }, flags: ['senior_connection'] } },
          success: { text: '죽도록 뛰었다. 현장이 어떤 곳인지 감이 왔다.', effects: { stats: { skill: 1, money: 30, stamina: -1 } } },
          fail: { text: '이틀째에 쓰러져 실려 갔다. 선배 얼굴 보기가 민망하다.', effects: { stats: { stamina: -2, network: -1 } } },
        },
      },
      { label: '시험 기간이라 거절한다', text: '학점은 지켰다. 선배는 "다음에 또 불러줄게"라고 했지만…', effects: { stats: { mental: 1 } } },
    ],
  },
  {
    id: 'stu_gap_year',
    slot: 'student', weight: 8, once: true,
    when: { school: ['college2', 'uni4', 'artschool'] },
    title: '휴학 고민',
    image: 'home',
    text: '등록금 고지서를 보며 생각한다. 이대로 계속 다닐까?',
    choices: [
      { label: '휴학하고 현장 알바', text: '1년간 현장을 돌았다. 돈과 연락처가 생겼다.', effects: { stats: { skill: 1, network: 1, money: 150, stamina: -1 }, age: 1, flags: ['senior_connection'] } },
      { label: '학교에 집중한다', text: '이론과 실습을 꾹꾹 채웠다.', effects: { stats: { skill: 1, sense: 1 } } },
      { label: '휴학하고 여행', text: '낯선 풍경을 잔뜩 봤다. 마음이 말랑해졌다.', effects: { stats: { mental: 3, sense: 1, money: -60 }, age: 1 } },
    ],
  },
  {
    id: 'stu_part_time',
    slot: 'student', weight: 9, once: true,
    title: '생활비가 바닥났다',
    image: 'home',
    text: '월세 날이 다가온다. 어떤 알바를 할까?',
    choices: [
      { label: '편의점 야간 알바', text: '돈은 확실히 들어왔다. 대신 늘 졸리다.', effects: { stats: { money: 120, stamina: -1 } } },
      { label: '웨딩 촬영 보조', text: '주말마다 예식장을 돌았다. 짐벌 다루는 실력이 늘었다.', effects: { stats: { money: 80, skill: 1 }, flags: ['wedding_exp'] } },
      { label: '유튜브 편집 외주', text: '컷 편집을 수백 개 했다. 리듬감이 생겼다.', effects: { stats: { money: 70, sense: 1 } } },
    ],
  },
  {
    id: 'stu_festival',
    slot: 'student', weight: 14, once: true,
    when: { any: [{ flags: ['festival_short'] }, { flags: ['art_school'] }] },
    title: '영화제 출품',
    image: 'festival',
    text: '작품을 영화제에 출품했다. 상영관 불이 꺼진다.',
    choices: [
      {
        label: '관객과의 대화에 나간다',
        check: { stats: { sense: 1, mental: 0.5 }, base: 15, bonus: [{ when: { flags: ['art_school'] }, add: 10, label: '예술학교 +10' }] },
        outcomes: {
          great: { text: '촬영상 수상! 업계 사람들이 명함을 건넨다.', effects: { stats: { rep: 10, network: 2 }, flags: ['festival_award'] } },
          success: { text: '좋은 질문을 많이 받았다. 몇 명과 연락처를 주고받았다.', effects: { stats: { rep: 3, network: 1 } } },
          fail: { text: '긴장해서 말이 꼬였다. 그래도 큰 스크린으로 본 건 좋았다.', effects: { stats: { mental: -1 } } },
        },
      },
      { label: '뒤에서 조용히 본다', text: '관객 반응을 몰래 지켜봤다. 다음엔 더 잘할 수 있을 것 같다.', effects: { stats: { sense: 1 } } },
    ],
  },
  {
    id: 'stu_gear_club',
    slot: 'student', weight: 8, once: true,
    title: '장비 동아리',
    image: 'gear',
    text: '학교 장비실 관리 동아리에서 사람을 뽑는다. 매일 장비 점검을 해야 한다.',
    choices: [
      {
        label: '지원한다',
        check: { stats: { skill: 1 }, base: 30 },
        outcomes: {
          great: { text: '렌즈 하나하나의 특성을 외웠다. 장비 대여점 사장님과도 친해졌다.', effects: { stats: { skill: 2, network: 1 }, flags: ['gear_nerd'] } },
          success: { text: '케이블 감는 법부터 제대로 배웠다.', effects: { stats: { skill: 1 } } },
          fail: { text: '첫 주에 렌즈 캡을 잃어버렸다. 눈치가 보인다.', effects: { stats: { mental: -1 } } },
        },
      },
      { label: '시간 낭비 같다', text: '그 시간에 영화를 더 봤다.', effects: { stats: { sense: 1 } } },
    ],
  },
  {
    id: 'stu_thesis',
    slot: 'student', weight: 10, once: true,
    when: { school: ['uni4', 'artschool'] },
    title: '졸업작품',
    image: 'classroom',
    text: '졸업작품 촬영 일정이 잡혔다. 예산은 턱없이 부족하다.',
    choices: [
      {
        label: '사비를 털어 제대로 찍는다',
        check: { stats: { skill: 1, sense: 1 }, base: 5 },
        outcomes: {
          great: { text: '업계 선배들이 보고 "졸업하면 연락해"라고 했다.', effects: { stats: { rep: 6, network: 2, money: -80 }, flags: ['senior_connection'] } },
          success: { text: '돈은 들었지만 만족스러운 포트폴리오가 생겼다.', effects: { stats: { skill: 1, money: -80 } } },
          fail: { text: '돈만 날렸다. 데이터 카드가 깨졌다.', effects: { stats: { money: -80, mental: -2 } } },
        },
      },
      { label: '있는 예산으로 찍는다', text: '소박하지만 완성은 했다.', effects: { stats: { skill: 1 } } },
    ],
  },
  {
    id: 'stu_critique',
    slot: 'student', weight: 7, once: true,
    title: '합평회 혹평',
    image: 'classroom',
    text: '"이건 그냥 예쁜 그림일 뿐이야." 교수님의 말이 가슴에 꽂힌다.',
    choices: [
      {
        label: '정면으로 반박한다',
        check: { stats: { mental: 1, sense: 0.5 }, base: 20 },
        outcomes: {
          great: { text: '교수님이 웃으며 "그 고집 좋다"고 했다. 뜻밖의 인정.', effects: { stats: { mental: 2, rep: 2 } } },
          success: { text: '말은 했다. 속은 시원하다.', effects: { stats: { mental: 1 } } },
          fail: { text: '말이 엉켜서 분위기만 싸해졌다.', effects: { stats: { mental: -2 } } },
        },
      },
      { label: '메모하고 다시 본다', text: '밤새 영화를 다시 보며 무엇이 부족했는지 적었다.', effects: { stats: { sense: 1, stamina: -1 } } },
    ],
  },
  {
    id: 'stu_selftaught',
    slot: 'student', weight: 12, once: true,
    when: { school: ['selftaught', 'direct'] },
    title: '유튜브 강의의 바다',
    image: 'home',
    text: '새벽 3시, 시네마 카메라 세팅 영상을 20개째 보고 있다.',
    choices: [
      {
        label: '중고 카메라를 사서 직접 찍어본다',
        check: { stats: { skill: 1 }, base: 25 },
        outcomes: {
          great: { text: '찍은 영상이 SNS에서 퍼졌다. 외주 문의가 들어온다.', effects: { stats: { skill: 2, rep: 4, money: -50 } } },
          success: { text: '직접 만져보니 확실히 다르다.', effects: { stats: { skill: 1, money: -50 } } },
          fail: { text: '사기 매물이었다… 카메라가 켜지지 않는다.', effects: { stats: { money: -80, mental: -1 } } },
        },
      },
      { label: '오픈채팅 촬영 커뮤니티에 들어간다', text: '정보와 사람이 동시에 생겼다.', effects: { stats: { network: 2 } } },
    ],
  },
  {
    id: 'stu_professor',
    slot: 'student', weight: 6, once: true,
    when: { school: ['college2', 'uni4', 'artschool'] },
    title: '교수님의 추천',
    image: 'office',
    text: '교수님이 아는 촬영감독 팀에 막내 자리가 있다고 한다. 면접은 내일.',
    choices: [
      {
        label: '면접을 본다',
        check: { stats: { network: 1, mental: 0.5 }, base: 25 },
        outcomes: {
          great: { text: '"졸업하면 바로 와." 첫 팀이 생겼다.', effects: { favor: 15, flags: ['senior_connection'], stats: { network: 1 } } },
          success: { text: '좋은 인상을 남겼다. 기억은 해줄 것 같다.', effects: { favor: 5 } },
          fail: { text: '지각했다. 첫인상은 망했다.', effects: { stats: { mental: -1 } } },
        },
      },
      { label: '내 힘으로 찾겠다', text: '자존심은 지켰다.', effects: { stats: { mental: 1 } } },
    ],
  },
]
