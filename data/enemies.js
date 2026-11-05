// 현장 문제 = 몬스터. 작품 번호에 따라 능력치가 커집니다(config.combat.enemyScale).
//   tier : 등장 시작 작품 단계 (1: 작품 1~, 2: 작품 4~, 3: 작품 7~)
//   kind : normal / elite / boss
//   weak / resist : 약점·내성 속성 (route id)
//   moves: { name, type: attack|heavy|heal|drain|charge, power, weight }
//     charge = 다음 턴에 heavy를 쓰겠다고 예고 (막기·봉인으로 대응)
//   projects: 보스가 주로 나오는 작품 종류
export default [
  // ── 일반 ──
  { id: 'cable_knot', name: '엉킨 케이블 뭉치', emoji: '🧶', tier: 1, kind: 'normal', hp: 26, atk: 5, def: 0, exp: 10, gold: 15, weak: ['data'], resist: ['muscle'],
    moves: [{ name: '발목 감기', type: 'attack', power: 1, weight: 3 }, { name: '꼬이기', type: 'heal', power: 6, weight: 1 }] },
  { id: 'battery_slime', name: '방전 배터리 슬라임', emoji: '🔋', tier: 1, kind: 'normal', hp: 22, atk: 6, def: 0, exp: 10, gold: 15, weak: ['focus'], resist: [],
    moves: [{ name: '찌릿', type: 'attack', power: 1, weight: 3 }, { name: '전력 흡수', type: 'drain', power: 1, weight: 1 }] },
  { id: 'coffee_storm', name: '커피 주문 폭풍', emoji: '☕', tier: 1, kind: 'normal', hp: 24, atk: 5, def: 0, exp: 11, gold: 18, weak: ['social'], resist: ['focus'],
    moves: [{ name: '"아아 샷 추가요"', type: 'attack', power: 1, weight: 3 }, { name: '디카페인 누락', type: 'heavy', power: 1.6, weight: 1 }] },
  { id: 'pigeons', name: '촬영 방해 비둘기 떼', emoji: '🕊️', tier: 1, kind: 'normal', hp: 20, atk: 7, def: 0, exp: 10, gold: 12, weak: ['muscle'], resist: ['data'],
    moves: [{ name: '푸드덕', type: 'attack', power: 1, weight: 3 }] },
  { id: 'rain_spirit', name: '폭우 정령', emoji: '🌧️', tier: 2, kind: 'normal', hp: 34, atk: 7, def: 1, exp: 15, gold: 22, weak: ['data'], resist: ['art'],
    moves: [{ name: '장대비', type: 'attack', power: 1, weight: 3 }, { name: '먹구름 모으기', type: 'charge', power: 0, weight: 1 }] },
  { id: 'sd_ghost', name: '포맷된 SD카드 유령', emoji: '👻', tier: 2, kind: 'normal', hp: 30, atk: 8, def: 1, exp: 15, gold: 22, weak: ['data'], resist: ['muscle'],
    moves: [{ name: '"파일을 찾을 수 없습니다"', type: 'attack', power: 1, weight: 3 }, { name: '기억 흡수', type: 'drain', power: 1, weight: 1 }] },
  { id: 'buzzing_fairy', name: '버징 요정', emoji: '🧚', tier: 2, kind: 'normal', hp: 28, atk: 8, def: 0, exp: 15, gold: 20, weak: ['focus'], resist: ['social'],
    moves: [{ name: '초점 흐리기', type: 'attack', power: 1, weight: 3 }, { name: '아웃포커스', type: 'heavy', power: 1.5, weight: 1 }] },
  { id: 'calltime_clock', name: '콜타임 앞당기기 시계', emoji: '⏰', tier: 2, kind: 'normal', hp: 32, atk: 8, def: 1, exp: 16, gold: 20, weak: ['social'], resist: ['focus'],
    moves: [{ name: '"내일 4시 콜"', type: 'attack', power: 1, weight: 3 }, { name: '째깍째깍', type: 'charge', power: 0, weight: 1 }] },
  { id: 'budget_wraith', name: '예산 삭감 망령', emoji: '💸', tier: 3, kind: 'normal', hp: 40, atk: 9, def: 2, exp: 20, gold: 30, weak: ['money', 'social'], resist: ['art'],
    moves: [{ name: '회차 삭감', type: 'attack', power: 1, weight: 3 }, { name: '페이 깎기', type: 'drain', power: 1, weight: 1 }] },
  { id: 'hate_cloud', name: '악플 구름', emoji: '☁️', tier: 3, kind: 'normal', hp: 38, atk: 10, def: 1, exp: 20, gold: 28, weak: ['rebel', 'art'], resist: ['social'],
    moves: [{ name: '"촬영 별로네요"', type: 'attack', power: 1, weight: 3 }, { name: '좌표 찍기', type: 'charge', power: 0, weight: 1 }] },
  { id: 'reshoot_golem', name: '재촬영 골렘', emoji: '🗿', tier: 3, kind: 'normal', hp: 48, atk: 9, def: 3, exp: 22, gold: 30, weak: ['muscle', 'indie'], resist: ['focus'],
    moves: [{ name: '"한 번만 더"', type: 'attack', power: 1, weight: 3 }, { name: '테이크 99', type: 'heavy', power: 1.7, weight: 1 }] },

  // ── 엘리트 ──
  { id: 'generator_golem', name: '고장 난 발전기 골렘', emoji: '⚙️', tier: 1, kind: 'elite', hp: 50, atk: 8, def: 2, exp: 24, gold: 40, weak: ['data', 'muscle'], resist: ['social'],
    moves: [{ name: '정전', type: 'attack', power: 1, weight: 2 }, { name: '시동 모으기', type: 'charge', power: 0, weight: 1 }] },
  { id: 'nervous_manager', name: '예민한 매니저', emoji: '😠', tier: 2, kind: 'elite', hp: 58, atk: 10, def: 2, exp: 30, gold: 50, weak: ['social'], resist: ['muscle'],
    moves: [{ name: '"우리 배우 춥잖아요"', type: 'attack', power: 1, weight: 3 }, { name: '소속사 호출', type: 'charge', power: 0, weight: 1 }] },
  { id: 'night_shoot', name: '72시간 야간촬영', emoji: '🌑', tier: 3, kind: 'elite', hp: 70, atk: 11, def: 3, exp: 38, gold: 60, weak: ['muscle'], resist: ['data'],
    moves: [{ name: '졸음 공격', type: 'attack', power: 1, weight: 3 }, { name: '해 뜨기 직전', type: 'heavy', power: 1.8, weight: 1 }] },

  // ── 보스 (크랭크업) ──
  { id: 'diva_actor', name: '예민한 톱배우', emoji: '🤬', tier: 1, kind: 'boss', hp: 70, atk: 9, def: 2, exp: 40, gold: 60, weak: ['social', 'art'], resist: ['muscle'],
    projects: ['film', 'ott', 'webdrama', 'mv'],
    moves: [{ name: '대본 집어던지기', type: 'attack', power: 1, weight: 3 }, { name: '"왼쪽 얼굴 잡지 마"', type: 'charge', power: 0, weight: 1 }, { name: '눈물 연기', type: 'heal', power: 10, weight: 1 }] },
  { id: 'tyrant_pd', name: '갑질 제작부장', emoji: '😤', tier: 1, kind: 'boss', hp: 76, atk: 9, def: 3, exp: 42, gold: 60, weak: ['rebel', 'social'], resist: ['focus'],
    projects: ['film', 'ott', 'short', 'webdrama'],
    moves: [{ name: '무전기 고함', type: 'attack', power: 1, weight: 3 }, { name: '"오늘 연장이다"', type: 'charge', power: 0, weight: 1 }] },
  { id: 'client_feeling', name: '"느낌이 아니에요" 광고주', emoji: '🕴️', tier: 1, kind: 'boss', hp: 66, atk: 10, def: 2, exp: 42, gold: 80, weak: ['money', 'art'], resist: ['data'],
    projects: ['ad', 'youtube'],
    moves: [{ name: '콘셉트 전면 수정', type: 'attack', power: 1, weight: 3 }, { name: '"로고 키워주세요"', type: 'charge', power: 0, weight: 1 }] },
  { id: 'bride_mom', name: '완벽주의 신부 어머니', emoji: '👰', tier: 1, kind: 'boss', hp: 62, atk: 9, def: 1, exp: 38, gold: 90, weak: ['social', 'money'], resist: ['focus'],
    projects: ['wedding'],
    moves: [{ name: '"우리 딸 턱선이…"', type: 'attack', power: 1, weight: 3 }, { name: '하객 동선 개입', type: 'charge', power: 0, weight: 1 }] },
  { id: 'genius_director', name: '49테이크 천재 감독', emoji: '🧐', tier: 2, kind: 'boss', hp: 90, atk: 11, def: 3, exp: 55, gold: 70, weak: ['art', 'indie'], resist: ['money'],
    projects: ['film', 'short', 'mv'],
    moves: [{ name: '"한 번 더 가자"', type: 'attack', power: 1, weight: 3 }, { name: '테이크 49', type: 'charge', power: 0, weight: 1 }, { name: '영감 충전', type: 'heal', power: 14, weight: 1 }] },
  { id: 'unpaid_ceo', name: '체불 대표', emoji: '🦹', tier: 2, kind: 'boss', hp: 88, atk: 11, def: 3, exp: 55, gold: 30, weak: ['rebel', 'money'], resist: ['social'],
    projects: ['webdrama', 'short', 'mv', 'ad'],
    moves: [{ name: '"다음 주에 드릴게요"', type: 'attack', power: 1, weight: 3 }, { name: '잠수', type: 'heal', power: 16, weight: 1 }, { name: '폐업 신고', type: 'charge', power: 0, weight: 1 }] },
  { id: 'algorithm', name: '알고리즘의 신', emoji: '🤖', tier: 2, kind: 'boss', hp: 84, atk: 12, def: 2, exp: 55, gold: 80, weak: ['social', 'data'], resist: ['indie'],
    projects: ['youtube', 'mv'],
    moves: [{ name: '노출 0', type: 'attack', power: 1, weight: 3 }, { name: '쇼츠 폭격', type: 'charge', power: 0, weight: 1 }] },
  { id: 'crankup_typhoon', name: '크랭크업 날의 태풍', emoji: '🌀', tier: 3, kind: 'boss', hp: 110, atk: 13, def: 4, exp: 70, gold: 100, weak: ['muscle', 'data'], resist: ['social'],
    projects: ['film', 'ott', 'ad'],
    moves: [{ name: '돌풍', type: 'attack', power: 1, weight: 3 }, { name: '태풍의 눈', type: 'charge', power: 0, weight: 1 }] },
  { id: 'investor_ghost', name: '투자 철회 귀신', emoji: '👤', tier: 3, kind: 'boss', hp: 104, atk: 13, def: 4, exp: 70, gold: 90, weak: ['social', 'indie'], resist: ['muscle'],
    projects: ['film', 'ott', 'short'],
    moves: [{ name: '"재검토하겠습니다"', type: 'attack', power: 1, weight: 3 }, { name: '전액 회수', type: 'drain', power: 1.2, weight: 1 }, { name: '이사회 소집', type: 'charge', power: 0, weight: 1 }] },
]
