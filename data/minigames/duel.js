// 턴제 결투 미니게임 데이터.
// 기술 type: attack(피해) / guard(다음 피해 감소) / blind(상대 명중률 감소) / heal(회복)
// stat: 위력을 키우는 능력치. 위력 = power × (1 + 능력치 / statScale)
export default {
  title: '현장 결투',
  statScale: 10,
  player: {
    hp: { base: 30, per: { stamina: 3, mental: 1 } },   // HP = 30 + 체력×3 + 멘탈×1
    fleeChance: { base: 30, per: { stamina: 3 } },      // 도망 성공률(%)
  },

  // 계열별 기술 세트. careers/*.js의 duelMoves 키와 연결.
  moves: {
    camera: [
      { id: 'tripod', name: '트라이포드 휘두르기', type: 'attack', power: 11, acc: 75, stat: 'stamina', emoji: '🦯' },
      { id: 'slate',  name: '슬레이트 치기',       type: 'attack', power: 7,  acc: 95, stat: 'skill',   emoji: '🎬' },
      { id: 'matte',  name: '매트박스 방패',       type: 'guard',  power: 60, acc: 100, stat: 'skill',  emoji: '🛡️' },
      { id: 'bounce', name: '반사판 눈부시게',     type: 'blind',  power: 25, acc: 85, stat: 'sense',   emoji: '🔆' },
    ],
    sound: [
      { id: 'boom',     name: '붐마이크 찌르기', type: 'attack', power: 10, acc: 80, stat: 'stamina', emoji: '🎙️' },
      { id: 'feedback', name: '하울링 공격',     type: 'attack', power: 8,  acc: 90, stat: 'skill',   emoji: '📢' },
      { id: 'headset',  name: '헤드폰 차단',     type: 'guard',  power: 50, acc: 100, stat: 'mental', emoji: '🎧' },
      { id: 'slate_s',  name: '무선 슬레이트',   type: 'blind',  power: 20, acc: 85, stat: 'sense',   emoji: '📡' },
    ],
    directing: [
      { id: 'megaphone', name: '메가폰 고함', type: 'attack', power: 10, acc: 80, stat: 'mental', emoji: '📣' },
      { id: 'cut',       name: '"컷!"',      type: 'blind',  power: 30, acc: 90, stat: 'sense',  emoji: '✋' },
    ],
    editing: [
      { id: 'keyboard', name: '키보드 연타', type: 'attack', power: 8, acc: 95, stat: 'skill', emoji: '⌨️' },
    ],
    art: [
      { id: 'hammer', name: '소품 망치',   type: 'attack', power: 11, acc: 75, stat: 'stamina', emoji: '🔨' },
      { id: 'paint',  name: '페인트 뿌리기', type: 'blind', power: 25, acc: 85, stat: 'sense',  emoji: '🎨' },
    ],
    production: [
      { id: 'callsheet', name: '콜시트 던지기', type: 'attack', power: 8, acc: 90, stat: 'network', emoji: '📋' },
      { id: 'budget',    name: '예산 삭감',     type: 'blind',  power: 30, acc: 85, stat: 'mental',  emoji: '💸' },
    ],
  },

  // 상대. hp, 기술 목록(weight로 선택 빈도)
  enemies: {
    actor: {
      name: '예민한 배우', emoji: '🤬', image: 'actor', hp: 48, statPower: 6, acc: 0,
      intro: '예민한 배우가 선글라스를 벗었다!',
      moves: [
        { name: '대본 집어던지기', type: 'attack', power: 9, acc: 85, weight: 3 },
        { name: '매니저 호출',     type: 'attack', power: 13, acc: 65, weight: 2 },
        { name: '눈물 연기',       type: 'heal',   power: 8,  acc: 100, weight: 1 },
      ],
    },
    producer: {
      name: '갑질 제작부장', emoji: '😤', image: 'producer', hp: 55, statPower: 7, acc: 0,
      intro: '제작부장이 무전기를 내려놓았다!',
      moves: [
        { name: '콜타임 앞당기기', type: 'attack', power: 10, acc: 85, weight: 3 },
        { name: '페이 삭감 통보',  type: 'attack', power: 14, acc: 60, weight: 2 },
      ],
    },
  },

  // 미니게임 결과로 반환되는 outcome: 'win' | 'lose' | 'flee'
}
