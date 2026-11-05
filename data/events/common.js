// 사건(❓ 칸). 한 판에 한 번씩만 나옵니다. 선택지는 조건이 맞을 때만 보이고 열쇠 표시가 붙습니다.
//   when: { tierMin, tierMax, projects: [작품 종류], routes, stats, flags, notFlags, sinceFlag, job, skills, money, fame, level, any, not, chance }
//   effects: { routes, flags, removeFlags, money, exp, hp, mp, fame, grade, item, stats, learn, fight }
//     hp/mp: 회복(+) 또는 피해(-) / grade: 이번 작품 평가 점수 / item: 장비 id 또는 'rare' 'epic'(랜덤)
//     fight: 적 id → 결과 뒤에 바로 전투 / stats: 영구 능력치 / learn: 스킬 id 습득
//   results: [{ weight, when, text, effects }] — 결과가 갈리는 선택 (확률은 화면에 안 나옴)
//   memo: 엔딩 "당신을 바꾼 선택" 후보
export default [
  {
    id: 'ev_lenscap', when: { tierMax: 1 },
    title: '사라진 렌즈캡', emoji: '🔍',
    text: '철수 직전, 고가 렌즈의 캡이 없어졌다. 동기 정민의 얼굴이 하얗다. 정민이 만진 걸 봤다.',
    choices: [
      { label: '"제가 잃어버렸어요." 덮어준다', text: '크게 혼났다. 정민이 아무 말 없이 도시락을 사줬다.',
        effects: { money: -30, routes: { social: 2 }, flags: ['covered_peer'] }, memo: '동기 정민의 실수를 덮어줬다.' },
      { label: '모른 척 내 장비를 정리한다', text: '선배가 깔끔한 정리를 눈여겨봤다. 정민과는 조금 어색해졌다.',
        effects: { routes: { focus: 2, data: 1 }, flags: ['ignored_peer'] }, memo: '동기의 실수를 모른 척했다.' },
      { label: '"같이 찾자." 트럭을 뒤진다', when: { stats: { str: '>=5' } }, text: '새벽 2시, 소품 박스 밑에서 찾았다. "우리 나중에 같이 뭐 하자."',
        effects: { hp: -10, routes: { muscle: 1, social: 1, indie: 1 }, flags: ['searched_peer'] }, memo: '새벽까지 정민과 렌즈캡을 찾았다.' },
    ],
  },
  {
    id: 'ev_peer_return_cover', when: { sinceFlag: { covered_peer: '>=3' } }, priority: 5,
    title: '정민의 전화', emoji: '📞',
    text: '"그때 렌즈캡… 나 아직 기억해. 나 이번에 OTT 팀 들어갔는데, 네 자리 하나 만들어놨어."',
    choices: [
      { label: '정민 팀으로 간다', text: '정민은 현장에서 나를 "우리 에이스"라고 불렀다.', effects: { routes: { social: 2, money: 2 }, fame: 6, item: 'rare' }, memo: '5년 전 덮어준 정민이 나를 자기 팀으로 불렀다.' },
      { label: '"마음만 받을게."', text: '"그럴 줄 알았다." 대신 정민이 장비 하나를 보내왔다.', effects: { item: 'rare' } },
    ],
  },
  {
    id: 'ev_peer_return_ignore', when: { sinceFlag: { ignored_peer: '>=3' } }, priority: 5,
    title: '선배의 라인', emoji: '🧔',
    text: '그때 선배가 촬영감독이 됐다. "막내 때 너, 정리 하나는 확실하더라. 내 라인 타라."',
    choices: [
      { label: '선배 라인에 들어간다', text: '말수 적은 선배는 말 대신 자리를 줬다.', effects: { routes: { focus: 3 }, exp: 40, fame: 4 }, memo: '선배의 라인에 들어갔다.' },
      { label: '"정민이도 같이요."', when: { routes: { social: '>=4' } }, text: '선배가 오래 나를 보더니 고개를 끄덕였다. 정민과 다시 같은 팀.',
        effects: { routes: { social: 2, focus: 1 }, removeFlags: ['ignored_peer'], flags: ['reconciled'] }, memo: '어색했던 정민과 같은 팀으로 돌아갔다.' },
    ],
  },
  {
    id: 'ev_peer_return_search', when: { sinceFlag: { searched_peer: '>=3' } }, priority: 5,
    title: '새벽 2시의 약속', emoji: '🌙',
    text: '"기억나? 렌즈캡 찾던 새벽. 같이 뭐 하자고 했잖아." 정민이 사업계획서를 내민다.',
    choices: [
      { label: '공동 창업한다', when: { money: '>=300' }, text: '반지하 사무실. 첫 일은 동네 빵집 광고였다.', effects: { money: -300, routes: { money: 4, social: 3 }, flags: ['cofounder'] }, memo: '정민과 프로덕션을 차렸다.' },
      { label: '"촬영으로 도울게."', text: '정민 회사 첫 작품에 내 이름이 올라갔다.', effects: { money: 150, routes: { indie: 2, art: 1 } } },
    ],
  },
  {
    id: 'ev_generator', when: { tierMax: 2 },
    title: '발전기 고장', emoji: '⚙️',
    text: '야간 촬영 직전, 발전기가 멈췄다. 해 지기까지 한 시간.',
    choices: [
      { label: '옆 현장까지 뛰어가 빌려온다', when: { stats: { str: '>=6' } }, text: '언덕 두 개를 넘었다. 선배가 처음으로 웃었다.', effects: { routes: { muscle: 3 }, grade: 1, hp: -8 } },
      { label: '배선을 열어 직접 고친다', when: { stats: { tec: '>=6' } }, text: '연료 필터였다. 15분 만에 시동.', effects: { routes: { data: 3 }, grade: 1 } },
      { label: '"매직아워로 바꿔 찍죠."', when: { stats: { sen: '>=6' } }, text: '감독이 하늘을 보더니 고개를 끄덕였다. 영화에서 가장 아름다운 컷이 됐다.',
        effects: { routes: { art: 3, indie: 1 }, grade: 2, flags: ['director_noticed'] }, memo: '발전기가 멈춘 날, 매직아워로 바꿔 찍자고 했다.' },
      { label: '발전기 골렘과 정면승부', text: '발전기가 으르렁거리며 일어섰다!', effects: { fight: 'generator_golem' } },
    ],
  },
  {
    id: 'ev_art_noshow', when: { tierMax: 3 },
    title: '아트 디렉터 펑크', emoji: '🖌️',
    text: '촬영 당일, 아트 디렉터가 연락 두절. 세트가 반쯤 비어 있다.',
    choices: [
      { label: '"제가 해볼게요." 세트를 꾸민다', when: { routes: { art: '>=4' } }, text: '소품 배치 하나로 공간이 살아났다. 미술감독이 묻는다. "우리 팀 올래?"',
        effects: { routes: { art: 4 }, flags: ['art_saved'], grade: 2 }, memo: '펑크 난 세트를 대신 꾸몄다. 미술팀의 눈에 들었다.' },
      { label: '소품을 나르며 돕는다', text: '급한 불은 껐다.', effects: { routes: { muscle: 1, social: 1 }, grade: 1 } },
      { label: '내 일만 한다', text: '촬영은 4시간 밀렸다.', effects: { routes: { focus: 1 }, grade: -1 } },
    ],
  },
  {
    id: 'ev_director_asks', when: { tierMax: 2 },
    title: '"막내 생각은?"', emoji: '🎬',
    text: '모니터 앞, 감독이 뒤를 돌아본다. "이 컷 어떻게 봐?"',
    choices: [
      { label: '솔직하게 말한다', when: { any: [{ stats: { sen: '>=6' } }, { routes: { art: '>=5' } }] }, text: '"다시 가자. 손 클로즈업 추가." 그 컷이 예고편에 들어갔다.',
        effects: { routes: { art: 2, indie: 2 }, flags: ['director_noticed'], fame: 3 }, memo: '막내 때 감독에게 의견을 말했다.' },
      { label: '레퍼런스를 보여준다', text: '"공부 좀 했네." 감독이 웃었다.', effects: { routes: { data: 1, art: 1 } } },
      { label: '"좋은데요!" 웃는다', text: '분위기는 부드러워졌다.', effects: { routes: { social: 2 } } },
    ],
  },
  {
    id: 'ev_unpaid',
    title: '체불', emoji: '💸',
    text: '촬영 끝난 지 두 달. 잔금이 안 들어온다. 제작사는 "다음 주에"만 반복한다.',
    choices: [
      { label: '단톡방에 공론화한다', text: '하루 만에 30명이 같은 처지라고 답했다. 일주일 뒤 전원 입금.', effects: { money: 120, routes: { rebel: 4 } }, memo: '체불을 단톡방에 공론화했다.' },
      { label: '체불 대표를 직접 찾아간다', when: { stats: { cha: '>=6' } }, text: '대표가 사무실에서 도망치려 한다!', effects: { routes: { rebel: 2 }, fight: 'unpaid_ceo' } },
      { label: '참는다', text: '석 달 뒤 70%가 들어왔다.', effects: { money: 60, routes: { money: 1 } } },
    ],
  },
  {
    id: 'ev_overnight',
    title: '72시간 촬영', emoji: '🌑',
    text: '스케줄이 꼬여 사흘 연속 촬영. 다들 하나둘 쓰러진다.',
    choices: [
      { label: '끝까지 버틴다', when: { stats: { hp: '>=80' } }, text: '마지막까지 서 있는 건 나뿐이었다.', effects: { hp: -20, routes: { muscle: 3 }, grade: 1, exp: 20 } },
      { label: '교대 쪽잠 순번표를 짠다', text: '15분씩 돌아가며 잤다. 사고가 없었다.', effects: { routes: { social: 2, data: 1 }, hp: 10 } },
      { label: '"이건 아니잖아요." 중단을 요구한다', text: '6시간 휴식이 생겼다. 몇몇은 고마워했고 몇몇은 나를 피했다.', effects: { routes: { rebel: 3 }, hp: 20 } },
    ],
  },
  {
    id: 'ev_steadicam', when: { tierMax: 2 },
    title: '스테디캠 체험', emoji: '🦾',
    text: '스테디캠 기사가 쉬는 시간에 말한다. "한번 메볼래?" 조끼가 20kg이다.',
    choices: [
      { label: '메고 10분 걷는다', when: { stats: { str: '>=6' } }, text: '세상이 흐르듯 움직였다. 기사가 휘파람을 불었다. "너 이거 해라."',
        effects: { routes: { muscle: 2, focus: 2 }, flags: ['steadicam_try'] }, memo: '스테디캠을 처음 메고 세상이 흐르는 걸 봤다.' },
      { label: '어깨 너머로 원리만 배운다', text: '균형의 원리를 노트에 적었다.', effects: { routes: { data: 1, focus: 1 } } },
      { label: '"전 됐어요."', text: '허리는 지켰다.', effects: { hp: 10 } },
    ],
  },
  {
    id: 'ev_drone',
    title: '드론 자격증', emoji: '🛸',
    text: '현장에 드론 기사가 부족하다. 제작부가 "자격증 따면 일 많아"라고 한다.',
    choices: [
      { label: '주말마다 학원에 다닌다', when: { money: '>=100' }, text: '합격. 하늘에서 본 현장은 생각보다 작았다.', effects: { money: -100, routes: { data: 2, art: 1 }, flags: ['drone_license'] }, memo: '드론 자격증을 땄다.' },
      { label: '유튜브로 독학한다', when: { stats: { tec: '>=7' } }, text: '혼자 날려보다 나무에 걸렸다. 그래도 감은 잡았다.', effects: { routes: { data: 2 }, flags: ['drone_license'] } },
      { label: '관심 없다', text: '땅이 좋다.', effects: { routes: { muscle: 1 } } },
    ],
  },
  {
    id: 'ev_wedding_side', when: { notFlags: ['wedding'] },
    title: '주말 알바', emoji: '💒',
    text: '웨딩 업체에서 주말 촬영 알바를 구한다. 일당이 짭짤하다.',
    choices: [
      { label: '주말을 내준다', text: '신부 아버지가 울 때 줌인하는 법을 배웠다.', effects: { money: 100, routes: { money: 2, social: 1 }, flags: ['wedding'] } },
      { label: '주말은 단편 찍는다', text: '친구들과 단편을 찍었다.', effects: { routes: { indie: 2, art: 1 } } },
    ],
  },
  {
    id: 'ev_brand_dm',
    title: '브랜드의 DM', emoji: '📱',
    text: '외주로 찍은 영상을 본 브랜드에서 DM이 왔다. "채널 영상 고정으로 맡아주실래요?"',
    choices: [
      { label: '고정으로 맡는다', text: '매달 고정 수입. 구독자도 조금씩 늘었다.', effects: { money: 120, routes: { social: 2, money: 1 }, flags: ['youtube'] } },
      { label: '내 스타일대로 찍게 해달라고 한다', when: { routes: { art: '>=6' } }, text: '"원하시는 대로요." 댓글이 좋았다.', effects: { money: 80, routes: { art: 2, social: 1 }, flags: ['youtube'] } },
      { label: '현장이 우선이다', text: '거절했다.', effects: { routes: { focus: 1 } } },
    ],
  },
  {
    id: 'ev_quit_team', when: { tierMin: 1, tierMax: 2 },
    title: '팀을 나갈까', emoji: '🚪',
    text: '팀장이 또 내 공을 가져갔다. 단톡방에 프리랜서 공고가 올라온다.',
    choices: [
      { label: '팀을 나와 프리랜서가 된다', text: '첫 달은 불안했다. 셋째 달부터 일이 들어왔다.', effects: { routes: { social: 2, money: 2 }, flags: ['quit_team'] }, memo: '팀을 나와 혼자 일하기 시작했다.' },
      { label: '팀장에게 정면으로 말한다', when: { stats: { cha: '>=7' } }, text: '팀장이 처음으로 사과했다. 다음 작품에서 크레딧이 한 줄 올라갔다.', effects: { routes: { rebel: 2, social: 1 }, fame: 4 } },
      { label: '참고 더 배운다', text: '팀장의 노하우를 몰래 다 적었다.', effects: { routes: { focus: 2 }, exp: 25 } },
    ],
  },
  {
    id: 'ev_new_maknae', when: { tierMin: 2 },
    title: '새 막내의 실수', emoji: '🐣',
    text: '새로 온 막내가 데이터 카드를 포맷했다. 오전 촬영분 전부. 막내 얼굴이 하얗다.',
    choices: [
      { label: '"내가 확인 안 했어." 덮어준다', text: '내가 혼났다. 막내는 그 뒤로 누구보다 꼼꼼해졌다.', effects: { routes: { social: 2 }, flags: ['mentor'], grade: -1 }, memo: '후배의 실수를 덮어주고 가르쳤다.' },
      { label: '복구 프로그램을 돌린다', when: { routes: { data: '>=8' } }, text: '새벽 3시, 92%를 살렸다.', effects: { routes: { data: 3 }, flags: ['mentor'] } },
      { label: '원칙대로 보고한다', text: '막내는 다음 작품에 오지 않았다.', effects: { routes: { focus: 1, money: 1 } } },
    ],
  },
  {
    id: 'ev_festival_short', when: { tierMin: 1 },
    title: '단편 영화제', emoji: '🏆',
    text: '현장 동료들과 주말에 찍은 단편이 영화제 본선에 올랐다.',
    choices: [
      { label: '관객과의 대화에서 의도를 말한다', when: { routes: { indie: '>=5' } }, text: '심사위원이 손을 들었다. 그날 밤 수상 연락이 왔다.',
        effects: { routes: { indie: 3, art: 2 }, fame: 8, flags: ['short_award'] }, memo: '현장 동료들과 찍은 단편으로 상을 받았다.' },
      { label: '조용히 관객 반응만 본다', text: '누군가는 웃었고 누군가는 졸았다. 둘 다 좋았다.', effects: { routes: { art: 2 }, fame: 2 } },
      { label: '영화제 대신 광고 현장에 간다', text: '페이가 두 배였다.', effects: { money: 120, routes: { money: 2 } } },
    ],
  },
  {
    id: 'ev_back_pain', when: { tierMin: 1 },
    title: '허리', emoji: '🩻',
    text: '아침에 일어나는데 허리가 움직이지 않는다.',
    choices: [
      { label: '병원에 간다', when: { money: '>=80' }, text: '물리치료 3주. 몸이 일하는 법을 다시 배웠다.', effects: { money: -80, hp: 40, stats: { hp: 5 } } },
      { label: '덜 드는 방법을 연구한다', text: '장비 동선을 다시 짰다. 팀 전체가 덜 힘들어졌다.', effects: { routes: { data: 2, social: 1 } } },
      { label: '진통제 먹고 버틴다', text: '버텼다. 허리는 이 일을 기억할 것이다.', effects: { hp: -15, routes: { muscle: 2 } } },
    ],
  },
  {
    id: 'ev_actor_cold',
    title: '한겨울 대기', emoji: '🥶',
    text: '영하 12도. 무명 배우 한유리가 대기실도 없이 길가에 서 있다.',
    choices: [
      { label: '핫팩과 담요를 챙겨준다', text: '"고마워요." 다음 날 그가 내 이름을 불렀다.', effects: { routes: { social: 2 }, flags: ['actor_friend'] }, memo: '무명 배우에게 담요를 건넸다.' },
      { label: '제작부에 대기 공간을 요구한다', text: '혼났지만 10분 뒤 승합차 하나가 비었다.', effects: { routes: { rebel: 2, social: 1 }, flags: ['actor_friend'] } },
      { label: '내 일이 바쁘다', text: '다들 바빴다.', effects: { routes: { focus: 1 } } },
    ],
  },
  {
    id: 'ev_actor_star', when: { sinceFlag: { actor_friend: '>=3' } }, priority: 5,
    title: '주연이 된 한유리', emoji: '🌟',
    text: '스타가 된 한유리가 계약서에 한 줄을 넣었다. "꼭 함께하고 싶은 스태프가 있어요." 내 이름이었다.',
    choices: [
      { label: '합류한다', text: '현장에 가니 내 자리에 핫팩이 놓여 있었다.', effects: { fame: 10, money: 200, routes: { social: 2 } }, memo: '스타가 된 배우가 계약서에 내 이름을 넣었다.' },
      { label: '"실력으로 갈게요."', text: '"그래서 당신이에요." 한유리가 웃었다.', effects: { fame: 5, routes: { focus: 2 } } },
    ],
  },
  {
    id: 'ev_investor_share', when: { tierMin: 2 },
    title: '페이 대신 지분', emoji: '📈',
    text: '제작사 대표가 말한다. "이번 작품, 페이 대신 지분으로 받을래요?"',
    choices: [
      { label: '지분으로 받는다', results: [
        { weight: 1, text: '영화가 터졌다. 정산서를 보고 손이 떨렸다.', effects: { money: 800, routes: { money: 3 } }, memo: '페이 대신 받은 지분이 대박이 났다.' },
        { weight: 2, text: '조용히 내려갔다. 지분 정산서 0원. 그래도 대표는 나를 기억했다.', effects: { money: -50, routes: { money: 1, social: 2 } } },
      ] },
      { label: '페이로 받는다', text: '확실한 게 좋다.', effects: { money: 150, routes: { money: 1 } } },
    ],
  },
  {
    id: 'ev_union_call', when: { routes: { rebel: '>=5' } },
    title: '노조 사무실', emoji: '✊',
    text: '"현장 사람이 직접 목소리를 내야 바뀝니다." 노조에서 연락이 왔다.',
    choices: [
      { label: '집행부에 들어간다', text: '첫 단체협상 테이블에 앉았다.', effects: { routes: { rebel: 5, social: 1 } }, memo: '노조 집행부에 들어갔다.' },
      { label: '조합원으로 돕는다', text: '현장에서 근로계약서를 나눠주는 사람이 되었다.', effects: { routes: { rebel: 2 } } },
      { label: '지금은 내 일이 먼저다', text: '후원금만 보냈다.', effects: { money: -20, routes: { money: 1 } } },
    ],
  },
  {
    id: 'ev_rental_owner', when: { tierMin: 2, any: [{ routes: { data: '>=8' } }, { routes: { money: '>=8' } }] },
    title: '렌탈샵 사장님', emoji: '🧰',
    text: '단골 렌탈샵 사장님이 은퇴한단다. "장비 아는 사람한테 넘기고 싶은데."',
    choices: [
      { label: '지분을 사서 동업한다', when: { money: '>=400' }, text: '셔터를 올리는 첫 아침. 장비 냄새가 좋다.', effects: { money: -400, routes: { money: 5, data: 2 } }, memo: '단골 렌탈샵의 지분을 샀다.' },
      { label: '주말에 가게를 봐준다', text: '장비 상태는 업계 최고라는 소리를 들었다.', effects: { money: 80, routes: { data: 2, money: 1 }, item: 'rare' } },
      { label: '현장이 좋다', text: '사장님이 아쉬워했다.', effects: { routes: { focus: 1 } } },
    ],
  },
  {
    id: 'ev_script_drawer', when: { tierMin: 2 },
    title: '서랍 속 시나리오', emoji: '📝',
    text: '쉬는 날, 서랍에서 오래전에 쓴 시나리오를 꺼냈다.',
    choices: [
      { label: '독립영화 지원 사업에 낸다', text: '서류 합격. 면접장에서 심사위원이 "이건 찍어야 해요"라고 했다.', effects: { routes: { indie: 4, art: 1 }, fame: 3 }, memo: '서랍 속 시나리오를 지원 사업에 냈다.' },
      { label: '제작사에 판다', text: '판권료가 들어왔다. 내 이야기는 남의 이름으로 찍힐 것이다.', effects: { money: 250, routes: { money: 3 } } },
      { label: '다시 서랍에 넣는다', text: '언젠가는.', effects: { routes: { focus: 1 } } },
    ],
  },
  {
    id: 'ev_virtual', when: { tierMin: 2 },
    title: 'LED 버추얼 스튜디오', emoji: '🟦',
    text: '새 LED 월 스튜디오. 다들 장비 앞에서 쭈뼛거린다.',
    choices: [
      { label: '매뉴얼을 통째로 익힌다', when: { stats: { tec: '>=10' } }, text: '일주일 만에 모두 나에게 묻기 시작했다.', effects: { routes: { data: 3 }, learn: 'lut_overwrite' } },
      { label: '아는 사람들을 모아 스터디를 연다', text: '스터디가 팀이 됐다.', effects: { routes: { social: 3 } } },
      { label: '"필름 질감이 좋아." 하던 대로 한다', text: '유행은 가고 질감은 남는다.', effects: { routes: { art: 2, indie: 1 } } },
    ],
  },
  {
    id: 'ev_master_lesson', when: { tierMin: 1 },
    title: '거장의 한마디', emoji: '🧓',
    text: '전설적인 촬영감독이 촬영장에 들렀다. 쉬는 시간, 당신 옆에 앉는다.',
    choices: [
      { label: '"빛은 어떻게 보세요?"', text: '"빛을 보지 말고 그림자를 봐." 그 말이 오래 남았다.', effects: { routes: { art: 3 }, stats: { sen: 1 } }, memo: '거장에게 그림자를 보라는 말을 들었다.' },
      { label: '"포커스는 어떻게 잡으세요?"', text: '"배우의 숨을 봐."', effects: { routes: { focus: 3 }, stats: { tec: 1 } } },
      { label: '"돈은 어떻게 버세요?"', text: '거장이 크게 웃었다. "광고를 해라."', effects: { routes: { money: 3 }, stats: { cha: 1 } } },
    ],
  },
  {
    id: 'ev_partner', when: { tierMin: 2 },
    title: '주말', emoji: '🏠',
    text: '오래 만난 사람이 말한다. "우리 주말에 같이 있어 본 적 있어?"',
    choices: [
      { label: '일을 줄인다', text: '수입은 줄었다. 일요일 아침이 생겼다.', effects: { money: -60, hp: 30, mp: 15, routes: { social: 1 } }, memo: '일을 줄이고 일요일 아침을 지켰다.' },
      { label: '"이 작품만 끝나면."', text: '그 약속을 몇 번 더 했다.', effects: { routes: { money: 2 }, exp: 20 } },
    ],
  },
  {
    id: 'ev_abroad', when: { flags: ['abroad'] }, priority: 2,
    title: '해외 스태프의 제안', emoji: '✈️',
    text: '해외 로케 때 만난 촬영팀이 연락했다. "우리 다음 작품, 같이 할래요?"',
    choices: [
      { label: '간다', text: '다른 언어, 같은 슬레이트.', effects: { routes: { art: 2, indie: 1 }, fame: 6, item: 'epic' } },
      { label: '여기가 좋다', text: '대신 장비 리스트를 교환했다.', effects: { routes: { data: 1 }, item: 'rare' } },
    ],
  },
  {
    id: 'ev_crowdfund', when: { routes: { indie: '>=8' } },
    title: '크라우드펀딩', emoji: '💗',
    text: '내 장편을 위해 크라우드펀딩을 열까?',
    choices: [
      { label: '연다', results: [
        { weight: 2, when: { routes: { social: '>=8' } }, text: '목표액 180%. 낯선 이름들이 내 이야기를 보고 싶어 했다.', effects: { money: 300, routes: { indie: 3, social: 2 }, fame: 6 }, memo: '크라우드펀딩이 성공했다.' },
        { weight: 1, text: '목표액 40%. 실패했지만 후원자 37명의 이름을 외웠다.', effects: { routes: { indie: 2 } } },
      ] },
      { label: '내 돈으로 찍는다', when: { money: '>=500' }, text: '통장은 가벼워졌고 영화는 무거워졌다.', effects: { money: -500, routes: { indie: 4, art: 2 } } },
      { label: '아직은 아니다', text: '시나리오를 한 번 더 고쳤다.', effects: { routes: { indie: 1 } } },
    ],
  },
]
