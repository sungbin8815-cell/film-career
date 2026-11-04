// 직업/직급. 이벤트의 setJob으로 바뀝니다.
//   field : 일할 때 경험이 쌓이는 분야
//   kind  : crew(현장 팀) / post(후반·데이터) / own(내 일: 사업·창작·기타) — 시즌 행동 목록이 달라짐
//   pay   : 일한 시즌의 수입 범위(만원). 트랙 payMul이 곱해짐(own은 제외)
//   ending: 40세에 이 직업이면 나오는 엔딩 (data/endings.js)
//   offer : 승진·전환 제안. from 직업일 때 when이 맞고 '일하는' 행동을 고르면 제안 이벤트가 뜸
export default [
  // ── 촬영 사다리 ──
  { id: 'cam_maknae', name: '촬영팀 막내', field: 'camera', kind: 'crew', pay: [560, 700], ending: 'crew_backbone' },
  { id: 'cam_third', name: '촬영팀 서드', field: 'camera', kind: 'crew', pay: [700, 880], ending: 'crew_backbone',
    offer: { from: ['cam_maknae'], when: { exp: { camera: '>=3' } },
      text: '{senior}: "이번 작품부터 서드 맡아. 배터리, 메모리, 모니터 라인 전부 네 거다."', memo: '서드가 되어 처음으로 장비 리스트에 내 이름이 올라갔다.' } },
  { id: 'cam_second', name: '촬영팀 세컨드', field: 'camera', kind: 'crew', pay: [900, 1150], ending: 'crew_backbone',
    offer: { from: ['cam_third'], when: { exp: { camera: '>=7' }, any: [{ npc: { senior: { bond: '>=1' } } }, { tags: ['gear_kid'] }, { careerYear: '>=5' }] },
      text: '"렌즈 교체랑 카메라 리포트, 이제 네가 해." 세컨드 자리가 비었다.', memo: '세컨드가 되어 렌즈를 내 손으로 갈아 끼웠다.' } },
  { id: 'cam_first', name: '촬영팀 퍼스트(포커스풀러)', field: 'camera', kind: 'crew', pay: [1250, 1600], ending: 'first',
    offer: { from: ['cam_second'], when: { exp: { camera: '>=12' }, any: [{ npc: { senior: { bond: '>=2' } } }, { tags: ['gear_kid'] }, { tags: ['steady_hand'] }, { careerYear: '>=9' }] },
      text: '촬영감독이 직접 전화했다. "퍼스트 해줄 수 있어요? 포커스는 당신이 제일 믿음직해서."', memo: '퍼스트가 되어 처음으로 내 팀원을 직접 뽑았다.' } },
  { id: 'cam_dop', name: '촬영감독(DOP)', field: 'camera', kind: 'crew', pay: [2000, 3200], ending: 'dop',
    offer: { from: ['cam_first'], when: { exp: { camera: '>=17' }, any: [{ npc: { director: { bond: '>=2' } } }, { tags: ['good_eye'] }, { lean: { art: '>=3' } }, { flags: ['short_award'] }] },
      text: '{director}: "다음 작품, 촬영감독으로 같이 하자. 네 그림이 보고 싶어."', memo: '촬영감독이 되어 처음으로 "컷"보다 "빛"을 먼저 생각했다.' } },

  // ── 촬영 옆길 ──
  { id: 'grip', name: '그립팀', field: 'camera', kind: 'crew', pay: [850, 1100], ending: 'crew_backbone' },
  { id: 'dit', name: 'DIT(데이터 매니저)', field: 'camera', kind: 'post', pay: [900, 1250], ending: 'colorist' },
  { id: 'colorist', name: '컬러리스트', field: 'editing', kind: 'post', pay: [1400, 2300], ending: 'colorist',
    offer: { from: ['dit'], when: { exp: { camera: '>=8' }, tags: ['gear_kid'] },
      text: '후반 업체 대표가 말한다. "현장 데이터 보는 눈이 남달라요. 우리 컬러리스트로 올래요?"', memo: '컬러리스트가 되어 어두운 방에서 색을 고르기 시작했다.' } },

  // ── 연출 ──
  { id: 'dir_pa', name: '연출부', field: 'directing', kind: 'crew', pay: [520, 640], ending: 'crew_backbone' },
  { id: 'dir_ad', name: '조감독', field: 'directing', kind: 'crew', pay: [850, 1150], ending: 'crew_backbone',
    offer: { from: ['dir_pa'], when: { exp: { directing: '>=5' } },
      text: '"다음 작품 조감독 맡아줘. 콜시트는 이제 네가 쓴다."', memo: '조감독이 되어 현장의 시간표를 쥐었다.' } },
  { id: 'director', name: '영화감독', field: 'directing', kind: 'crew', pay: [1200, 3000], ending: 'director',
    offer: { from: ['dir_ad', 'indie_director'], when: { exp: { directing: '>=11' }, any: [{ npc: { ceo: { bond: '>=2' } } }, { flags: ['short_award'] }, { tags: ['good_eye'] }] },
      text: '{ceo}: "당신 시나리오, 우리가 투자하겠습니다. 입봉합시다."', memo: '입봉했다. 크레딧 맨 앞에 내 이름이 올라갔다.' } },
  { id: 'indie_director', name: '독립영화 감독', field: 'directing', kind: 'own', pay: [200, 700], ending: 'indie' },

  // ── 편집 ──
  { id: 'edit_assist', name: '편집 보조', field: 'editing', kind: 'post', pay: [500, 640], ending: 'editor' },
  { id: 'editor', name: '편집기사', field: 'editing', kind: 'post', pay: [850, 1250], ending: 'editor',
    offer: { from: ['edit_assist'], when: { exp: { editing: '>=4' } },
      text: '"이번 작품 1차 편집, 네가 붙어봐."', memo: '편집기사가 되어 처음으로 내 리듬으로 컷을 붙였다.' } },
  { id: 'edit_chief', name: '편집감독', field: 'editing', kind: 'post', pay: [1500, 2400], ending: 'editor',
    offer: { from: ['editor'], when: { exp: { editing: '>=11' } },
      text: '감독이 말했다. "이 영화는 당신이 편집해야 해요."', memo: '편집감독이 되어 영화의 마지막 작가가 되었다.' } },

  // ── 미술 ──
  { id: 'art_maknae', name: '미술팀 막내', field: 'art', kind: 'crew', pay: [520, 640], ending: 'crew_backbone' },
  { id: 'art_team', name: '미술팀장', field: 'art', kind: 'crew', pay: [900, 1200], ending: 'art',
    offer: { from: ['art_maknae'], when: { exp: { art: '>=5' } },
      text: '"세트 하나 통째로 맡아볼래?"', memo: '미술팀장이 되어 세트 하나를 통째로 맡았다.' } },
  { id: 'art_director', name: '미술감독', field: 'art', kind: 'crew', pay: [1500, 2600], ending: 'art',
    offer: { from: ['art_team'], when: { exp: { art: '>=12' } },
      text: '{director}: "이번엔 미술감독으로 이름 올립시다."', memo: '미술감독이 되어 영화의 공기를 설계했다.' } },

  // ── 사운드 ──
  { id: 'sound_boom', name: '붐 오퍼레이터', field: 'sound', kind: 'crew', pay: [560, 700], ending: 'sound' },
  { id: 'sound_mixer', name: '동시녹음 기사', field: 'sound', kind: 'crew', pay: [1100, 1800], ending: 'sound',
    offer: { from: ['sound_boom'], when: { exp: { sound: '>=7' } },
      text: '"우리 팀 이제 네가 끌어. 믹서 앞자리 네 거야."', memo: '동시녹음 기사가 되어 현장의 소리를 책임졌다.' } },

  // ── 제작 ──
  { id: 'prod_pa', name: '제작부', field: 'production', kind: 'crew', pay: [520, 640], ending: 'producer' },
  { id: 'line_producer', name: '라인PD', field: 'production', kind: 'crew', pay: [1000, 1400], ending: 'producer',
    offer: { from: ['prod_pa'], when: { exp: { production: '>=5' } },
      text: '{ceo}: "예산표 볼 줄 알지? 라인PD 해봐."', memo: '라인PD가 되어 영화의 돈과 시간을 쥐었다.' } },
  { id: 'producer', name: '프로듀서', field: 'production', kind: 'crew', pay: [1600, 3000], ending: 'producer',
    offer: { from: ['line_producer'], when: { exp: { production: '>=12' } },
      text: '"이 프로젝트, 당신 이름으로 끌고 가요."', memo: '프로듀서가 되어 영화를 처음부터 끝까지 책임졌다.' } },

  // ── 내 일 (사업·창작·기타) ──
  { id: 'freelancer', name: '프리랜서 영상인', field: 'camera', kind: 'own', pay: [400, 1100], ending: 'freelancer' },
  { id: 'rental_owner', name: '장비 렌탈샵 사장', field: 'camera', kind: 'own', pay: [700, 2000], ending: 'rental' },
  { id: 'creator', name: '영상 크리에이터', field: 'editing', kind: 'own', pay: [300, 1800], ending: 'creator' },
  { id: 'wedding', name: '웨딩 촬영 작가', field: 'camera', kind: 'own', pay: [600, 1000], ending: 'wedding' },
  { id: 'prod_ceo', name: '프로덕션 대표', field: 'production', kind: 'own', pay: [500, 3000], ending: 'ceo' },
  { id: 'ad_staff', name: '광고 프로덕션 실장', field: 'camera', kind: 'crew', pay: [1100, 1300], ending: 'ad_staff' },
  { id: 'teacher', name: '영상 강사', field: 'directing', kind: 'own', pay: [500, 800], ending: 'teacher' },
  { id: 'union', name: '노조 상근 활동가', field: 'production', kind: 'own', pay: [420, 520], ending: 'union' },
  { id: 'outside', name: '현장 밖의 일', field: 'production', kind: 'own', pay: [600, 900], ending: 'outside' },
]
