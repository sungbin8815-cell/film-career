// 촬영 계열 이벤트. career: ['camera']인 판에서만 등장.
// slot: 'project' = 촬영 중 / 'between' = 작품 사이
export default [
  {
    id: 'cam_art_noshow',
    slot: 'project', career: ['camera'], weight: 7, once: true,
    when: { rankMin: 'third' },
    title: '아트 디렉터 펑크',
    image: 'set_day',
    text: '촬영 당일 아침, 아트 디렉터가 연락 두절. 세트는 반쯤 비어 있고 감독은 머리를 감싸고 있다.',
    choices: [
      {
        label: '"제가 대신 해볼게요"',
        check: { stats: { sense: 1 }, base: 15 },
        outcomes: {
          great: { text: '소품 배치 하나로 공간이 살아났다. 미술감독이 "우리 팀 올래?"라고 묻는다. (미술 계열 해금)', effects: { stats: { rep: 6, sense: 1 }, favor: 8, unlockCareer: 'art', flags: ['art_unlocked'] } },
          success: { text: '급한 불은 껐다. 감독이 고맙다며 커피를 샀다.', effects: { stats: { rep: 2 }, favor: 5 } },
          fail: { text: '어설프게 손댄 소품이 화면에 다 걸렸다. 재촬영.', effects: { stats: { rep: -3, mental: -2 }, favor: -5 } },
        },
      },
      { label: '못 본 척 내 일만 한다', text: '촬영은 4시간 밀렸다. 우리 팀 잘못은 아니다.', effects: { stats: { stamina: -1 } } },
    ],
  },
  {
    id: 'cam_allnighter',
    slot: 'project', career: ['camera'], weight: 10, cooldown: 4,
    title: '밤샘 3일째',
    image: 'set_night',
    text: '사흘째 제대로 못 잤다. 눈앞의 모니터가 두 개로 보인다. 오늘도 해 뜰 때까지 찍는다고 한다.',
    choices: [
      {
        label: '계속 버틴다',
        check: { stats: { stamina: 1 }, base: 25 },
        outcomes: {
          great: { text: '마지막 컷까지 완벽하게 버텼다. 팀장이 어깨를 두드린다.', effects: { stats: { stamina: -2, rep: 2 }, favor: 8 } },
          success: { text: '겨우 버텼다. 집에 가서 14시간을 잤다.', effects: { stats: { stamina: -3 }, favor: 4 } },
          fail: { text: '장비를 들고 계단에서 굴렀다. 부상으로 현장 이탈. 한 작품을 쉬어야 한다.', effects: { stats: { stamina: -4, mental: -2 }, favor: -3, skipProjects: 1, flags: ['injured_once'] } },
        },
      },
      { label: '팀장에게 솔직하게 말하고 쪽잠', text: '30분 눈을 붙였다. 살 것 같다. 팀장 표정은 별로였다.', effects: { stats: { stamina: 2 }, favor: -4 } },
    ],
  },
  {
    id: 'cam_pitch_idea',
    slot: 'project', career: ['camera'], weight: 7, cooldown: 6,
    when: { rankMin: 'second' },
    title: '감독에게 아이디어 제안',
    image: 'set_day',
    text: '이 장면, 핸드헬드로 가면 훨씬 좋을 것 같다. 감독과 눈이 마주쳤다.',
    choices: [
      {
        label: '용기 내서 제안한다',
        check: { stats: { sense: 1, network: 0.6 }, base: 5 },
        outcomes: {
          great: { text: '"그거 좋다! 그렇게 가자." 그 컷이 예고편 메인이 됐다.', effects: { stats: { rep: 8, network: 1 }, flags: ['director_noticed'] } },
          success: { text: '감독이 고개를 끄덕였다. 다음 작품도 같이 하자고 한다.', effects: { stats: { rep: 3, network: 1 } } },
          fail: { text: '촬영감독이 "선 넘지 마"라고 조용히 말했다.', effects: { favor: -10, stats: { mental: -1 } } },
        },
      },
      { label: '촬영감독에게 먼저 말한다', text: '촬영감독이 자기 아이디어처럼 말했다. 그래도 컷은 좋았다.', effects: { favor: 5 } },
      { label: '그냥 삼킨다', text: '집에 가는 길에 계속 그 장면이 떠올랐다.', effects: { stats: { mental: -1 } } },
    ],
  },
  {
    id: 'cam_coffee_run',
    slot: 'project', career: ['camera'], weight: 9, cooldown: 3,
    when: { rank: ['maknae'] },
    title: '커피 32잔 주문',
    image: 'set_day',
    text: '"막내야, 전체 커피 돌려." 메뉴를 받아 적는데 다들 한꺼번에 말한다.',
    choices: [
      {
        label: '외워서 한 번에 처리한다',
        check: { stats: { mental: 1, skill: 0.3 }, base: 30 },
        outcomes: {
          great: { text: '감독님 샷 추가까지 기억했다. "얘 일 잘하네" 소문이 돌았다.', effects: { favor: 7, stats: { network: 1 } } },
          success: { text: '두 잔이 틀렸지만 큰 문제는 없었다.', effects: { favor: 2 } },
          fail: { text: '배우 매니저의 디카페인을 깜빡했다. 제작부가 한숨을 쉰다.', effects: { favor: -4, stats: { mental: -1 } } },
        },
      },
      { label: '단톡방에 메뉴판 링크를 올린다', text: '효율적이었다. 선배 몇 명은 "요즘 애들"이라며 웃었다.', effects: { favor: -1, stats: { mental: 1 } } },
    ],
  },
  {
    id: 'cam_slate_mistake',
    slot: 'project', career: ['camera'], weight: 8, cooldown: 4,
    when: { rank: ['maknae', 'third'] },
    title: '슬레이트 사고',
    image: 'set_day',
    text: '슬레이트에 씬 번호를 잘못 썼다. 이미 세 테이크째다.',
    choices: [
      {
        label: '바로 스크립터에게 말한다',
        check: { stats: { mental: 1 }, base: 35 },
        outcomes: {
          great: { text: '편집실이 고맙다고 연락이 왔다. 정직함도 실력이다.', effects: { favor: 5, stats: { rep: 1 } } },
          success: { text: '혼났지만 바로 수정했다.', effects: { favor: 1 } },
          fail: { text: '말하는 타이밍이 최악이었다. 감독 앞에서 크게 혼났다.', effects: { favor: -3, stats: { mental: -2 } } },
        },
      },
      { label: '모른 척한다', text: '편집실에서 하루 종일 찾느라 난리가 났다. 범인은 금방 밝혀졌다.', effects: { favor: -8 } },
    ],
  },
  {
    id: 'cam_actor_fight',
    slot: 'project', career: ['camera'], weight: 6, cooldown: 8,
    title: '배우와 시비가 붙었습니다!',
    image: 'actor',
    text: '"카메라가 내 얼굴 왼쪽을 잡잖아!" 예민해진 배우가 당신에게 손가락질하며 다가온다.',
    choices: [
      {
        label: '싸운다',
        minigame: {
          id: 'duel',
          params: { enemy: 'actor' },
          results: {
            win: { text: '현장 전설이 탄생했다. 다들 뒤에서 엄지를 든다. 배우 소속사는 이를 간다.', effects: { stats: { mental: 3, rep: 3, network: -1 }, flags: ['set_legend'] } },
            lose: { text: '처참하게 졌다. 영상이 단톡방에 돌았다.', effects: { stats: { mental: -3, rep: -4 }, favor: -5 } },
            flee: { text: '전략적 후퇴. 아무도 다치지 않았다.', effects: { stats: { mental: -1 } } },
          },
        },
      },
      { label: '고개 숙이고 참는다', text: '꾹 참았다. 화장실에서 크게 숨을 쉬었다.', effects: { stats: { mental: -2 }, favor: 3 } },
      {
        label: '촬영감독에게 중재를 부탁한다',
        check: { stats: { network: 1 }, base: 25 },
        outcomes: {
          great: { text: '촬영감독이 깔끔하게 정리했다. 배우가 사과까지 했다.', effects: { favor: 6, stats: { mental: 1 } } },
          success: { text: '일단 넘어갔다.', effects: {} },
          fail: { text: '"이런 건 네가 알아서 해야지." 오히려 혼났다.', effects: { favor: -4, stats: { mental: -1 } } },
        },
      },
    ],
  },
  {
    id: 'cam_rain_shoot',
    slot: 'project', career: ['camera'], weight: 7, cooldown: 4,
    title: '폭우 속 야외 촬영',
    image: 'rain',
    text: '갑자기 쏟아진 비. 카메라에 레인커버를 씌울 시간은 1분.',
    choices: [
      {
        label: '번개처럼 장비를 감싼다',
        check: { stats: { skill: 1, stamina: 0.5 }, base: 20 },
        outcomes: {
          great: { text: '장비 하나 젖지 않았다. 빗속 컷도 그림처럼 나왔다.', effects: { favor: 7, stats: { rep: 2 } } },
          success: { text: '조금 젖었지만 무사하다.', effects: { favor: 2, stats: { stamina: -1 } } },
          fail: { text: '모니터 하나가 먹통이 됐다. 수리비 일부를 물었다.', effects: { stats: { money: -120, mental: -1 }, favor: -3 } },
        },
      },
      { label: '철수를 건의한다', text: '안전이 먼저다. 다음날 다시 찍었다.', effects: { stats: { mental: 1 } } },
    ],
  },
  {
    id: 'cam_focus_buzz',
    slot: 'project', career: ['camera'], weight: 8, cooldown: 4,
    when: { rank: ['first'] },
    title: '원테이크 포커스',
    image: 'set_day',
    text: '3분짜리 원테이크. 배우가 리허설과 다르게 움직인다. 포커스 휠을 쥔 손에 땀이 난다.',
    choices: [
      {
        label: '감으로 따라간다',
        check: { stats: { skill: 1, sense: 0.5 }, base: 0 },
        outcomes: {
          great: { text: '"컷! 오케이!" 한 번에 끝났다. 감독이 포커스 누가 잡았냐고 묻는다.', effects: { stats: { rep: 6 }, favor: 6, flags: ['director_noticed'] } },
          success: { text: '두 테이크 만에 성공.', effects: { stats: { rep: 2 }, favor: 2 } },
          fail: { text: '마지막 클로즈업에서 버징. 12테이크까지 갔다.', effects: { stats: { mental: -3 }, favor: -6 } },
        },
      },
      { label: '마크를 다시 찍자고 요청한다', text: '시간은 걸렸지만 확실했다.', effects: { favor: -1, stats: { skill: 0.5 } } },
    ],
  },
  {
    id: 'cam_pick_team',
    slot: 'between', career: ['camera'], weight: 8, cooldown: 5,
    when: { rank: ['first'] },
    title: '팀원 뽑기',
    image: 'office',
    text: '다음 작품 카메라팀을 꾸려야 한다. 세컨드 자리에 누구를 부를까?',
    choices: [
      { label: '실력 좋은 후배 (페이 높음)', text: '현장이 편해졌다. 대신 내 몫이 줄었다.', effects: { stats: { money: -100, rep: 3 }, favor: 4 } },
      { label: '친한 동생', text: '손발은 잘 맞는데 실수가 잦다. 그래도 의리는 생겼다.', effects: { stats: { network: 2, mental: 1 } } },
      { label: '경력 없는 신입 (싸다)', text: '가르치느라 진이 빠졌다. 그래도 그 친구는 평생 고마워할 것이다.', effects: { stats: { stamina: -2, money: 50, network: 1 } } },
    ],
  },
  {
    id: 'cam_first_dop_offer',
    slot: 'between', career: ['camera'], weight: 6, once: true,
    when: { rank: ['first'], rankProjects: '>=5' },
    title: '첫 촬영감독 제안',
    image: 'office',
    text: '독립영화 감독이 연락했다. "예산은 없는데… 촬영감독 해주실래요?"',
    choices: [
      {
        label: '한다! 내 이름으로 찍는다',
        check: { stats: { sense: 1, network: 0.5 }, base: 0, bonus: [{ when: { flags: ['art_school'] }, add: 8, label: '예술학교 +8' }] },
        outcomes: {
          great: { text: '영화제에서 촬영이 극찬받았다. 이제 촬영감독 제안이 들어온다!', effects: { setRank: 'dop', stats: { rep: 10, money: -150 } } },
          success: { text: '고생했지만 좋은 레퍼런스가 생겼다.', effects: { stats: { rep: 5, sense: 1, money: -150 }, flags: ['director_noticed'] } },
          fail: { text: '촬영이 산으로 갔다. 다시 퍼스트로 돌아가자.', effects: { stats: { mental: -3, money: -150 } } },
        },
      },
      { label: '아직은 이르다', text: '정중하게 거절했다. 언젠가는.', effects: {} },
    ],
  },
  {
    id: 'cam_dop_award',
    slot: 'between', career: ['camera'], weight: 7, once: true,
    when: { rank: ['dop'] },
    title: '촬영상 후보',
    image: 'festival',
    text: '맡았던 작품이 영화상 촬영상 후보에 올랐다. 시상식 날이다.',
    choices: [
      {
        label: '정장을 빼입고 간다',
        check: { stats: { sense: 1 }, base: 10, bonus: [{ when: { track: ['film'] }, add: 10, label: '영화 트랙 +10' }] },
        outcomes: {
          great: { text: '수상! 무대 위에서 막내 시절 팀장 이름을 불렀다.', effects: { stats: { rep: 15, mental: 3 }, flags: ['dop_award'] } },
          success: { text: '수상은 못 했지만 업계 사람들과 인사를 나눴다.', effects: { stats: { rep: 4, network: 2 } } },
          fail: { text: '긴장해서 레드카펫에서 넘어졌다. 짤이 돌았다.', effects: { stats: { mental: -2, rep: 1 } } },
        },
      },
      { label: '현장 일정 때문에 못 간다', text: '수상 소식은 촬영장 휴대폰으로 들었다. 결과는 아쉬웠다.', effects: { favor: 3 } },
    ],
  },
]
