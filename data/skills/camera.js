// 촬영 계열 스킬. 레벨업마다 후보 3개 중 1개를 찍습니다(새로 배우거나 레벨 올리기, 최대 3).
// 찍을 때마다 route 성향 +2 → 전직 루트에 반영됩니다.
//   type : attack(피해) heal(HP 회복) mana(MP 회복) guard(다음 피해 감소) buff(내 피해 증가) debuff(적 공격 약화) stun(적 행동 1회 봉인) gold(피해+돈)
//   power: 기본 위력 / scale: 능력치 배율 { str, tec, sen, cha } / mp: 소모 멘탈 / hits: 타수
//   req  : 배울 조건 (level, jobs: 이 직업일 때만, tierMin, routes)
//   피해 속성 = route. 적마다 약점(weak)·내성(resist) 속성이 있음
export default [
  // ── 기본 ──
  { id: 'slate_hit', name: '슬레이트 치기', emoji: '🎬', route: 'focus', type: 'attack', power: 5, scale: { str: 0.6, tec: 0.4 }, mp: 0, basic: true,
    desc: '"씬 3, 컷 2, 테이크 1!" 딱!' },

  // ── 🎯 포커스 ──
  { id: 'focus_snipe', name: '포커스 저격', emoji: '🎯', route: 'focus', type: 'attack', power: 9, scale: { sen: 1.1, tec: 0.5 }, mp: 4,
    desc: '초점 링을 0.1mm 돌려 급소를 정확히 맞춘다.' },
  { id: 'dof_barrier', name: '심도 압축 결계', emoji: '🔵', route: 'focus', type: 'guard', power: 50, mp: 4,
    desc: '피사계 심도를 얕게 만들어 들어오는 공격을 흐려버린다. 다음 피해 감소.' },
  { id: 'mark_set', name: '마크 박기', emoji: '❌', route: 'focus', type: 'buff', power: 40, turns: 2, mp: 5, req: { level: 3 },
    desc: '바닥에 테이프 마크. 2턴 동안 내 피해 증가.' },
  { id: 'longtake', name: '롱테이크 연사', emoji: '🎞️', route: 'focus', type: 'attack', power: 5, hits: 3, scale: { sen: 0.7 }, mp: 8, req: { level: 6 },
    desc: '컷 없이 세 번 몰아친다.' },
  { id: 'focus_pull_ult', name: '풀포커스 일섬', emoji: '⚡', route: 'focus', type: 'attack', power: 26, scale: { sen: 2 }, mp: 14, req: { tierMin: 3, jobs: ['cam_first', 'b_cam', 'eternal_first', 'dop_film', 'dop_ott', 'dop_bunit'] },
    desc: '퍼스트만 쓸 수 있는 오의. 움직이는 적도 놓치지 않는다.' },

  // ── 💪 근력 ──
  { id: 'tripod_stab', name: '트라이포드 찌르기', emoji: '🦯', route: 'muscle', type: 'attack', power: 10, scale: { str: 1.2 }, mp: 3,
    desc: '삼각대 다리 끝으로 정확하게 찌른다.' },
  { id: 'case_charge', name: '하드케이스 돌진', emoji: '🧳', route: 'muscle', type: 'attack', power: 16, scale: { str: 1.5 }, mp: 7, req: { level: 3 },
    desc: '30kg 케이스를 들고 몸통 박치기.' },
  { id: 'allnighter', name: '밤샘 근성', emoji: '🌙', route: 'muscle', type: 'heal', power: 30, mp: 6,
    desc: '사흘 밤을 샌 몸이 기억하는 회복력. HP 회복.' },
  { id: 'sandbag_throw', name: '샌드백 투척', emoji: '🪨', route: 'muscle', type: 'stun', power: 6, scale: { str: 0.6 }, mp: 7, req: { level: 5 },
    desc: '스탠드 고정용 샌드백을 던져 적을 한 턴 멈춘다.' },
  { id: 'jimmy_swing', name: '지미집 대회전', emoji: '🏗️', route: 'muscle', type: 'attack', power: 30, scale: { str: 2 }, mp: 14, req: { tierMin: 2, jobs: ['grip', 'key_grip', 'grip_chief', 'grip_legend', 'steadicam', 'steadicam_ace', 'steadicam_master'] },
    desc: '그립팀의 오의. 크레인 암을 크게 휘두른다.' },
  { id: 'steady_walk', name: '스테디 활보', emoji: '🦾', route: 'muscle', type: 'buff', power: 60, turns: 3, mp: 9, req: { jobs: ['steadicam', 'steadicam_ace', 'steadicam_master'] },
    desc: '몸에 카메라를 달고 흔들림 없이 걷는다. 3턴 동안 피해 크게 증가.' },

  // ── 💾 데이터 ──
  { id: 'lens_bomb', name: '렌즈폭탄', emoji: '💣', route: 'data', type: 'attack', power: 14, scale: { tec: 1.4 }, mp: 7,
    desc: '렌즈 캡을 따서 던진다. 왜 폭발하는지는 아무도 모른다.' },
  { id: 'backup_clone', name: '백업 분신술', emoji: '👥', route: 'data', type: 'guard', power: 70, mp: 6, req: { level: 3 },
    desc: '나를 두 군데에 백업한다. 다음 피해 크게 감소.' },
  { id: 'format_purge', name: '포맷 저주 해제', emoji: '🧹', route: 'data', type: 'heal', power: 22, mp: 4,
    desc: '깨진 파일을 복구하듯 몸을 복구한다. HP 회복.' },
  { id: 'lut_overwrite', name: 'LUT 덮어쓰기', emoji: '🌈', route: 'data', type: 'debuff', power: 40, turns: 3, mp: 6, req: { level: 4 },
    desc: '적의 색을 칙칙하게 바꿔 공격력을 떨어뜨린다.' },
  { id: 'drone_strike', name: '드론 공습', emoji: '🛸', route: 'data', type: 'attack', power: 8, hits: 3, scale: { tec: 0.8 }, mp: 10, req: { jobs: ['drone', 'aerial', 'aerial_master', 'dit', 'dit_chief'] },
    desc: '하늘에서 세 번 내리꽂는다.' },
  { id: 'color_grade', name: '컬러 그레이딩 폭주', emoji: '🎨', route: 'data', type: 'attack', power: 28, scale: { tec: 1.2, sen: 1 }, mp: 14, req: { tierMin: 3, jobs: ['colorist', 'colorist_master', 'post_supervisor', 'dit_chief'] },
    desc: '화면 전체의 색을 비틀어 적을 지워버린다.' },

  // ── 🗣️ 처세 ──
  { id: 'coffee_32', name: '커피 32잔 소환', emoji: '☕', route: 'social', type: 'heal', power: 25, mp: 5,
    desc: '팀 전원의 주문을 외워 한 번에 돌린다. HP 회복.' },
  { id: 'prod_bribe', name: '제작부 회유', emoji: '🤝', route: 'social', type: 'debuff', power: 35, turns: 3, mp: 5,
    desc: '"부장님, 밥은 드셨어요?" 적의 공격 의지를 꺾는다.' },
  { id: 'groupchat', name: '단톡방 공론화', emoji: '📢', route: 'rebel', type: 'attack', power: 12, scale: { cha: 1.4 }, mp: 6, req: { level: 3 },
    desc: '모두가 보는 곳에 사실을 올린다. 투쟁 성향도 오른다.' },
  { id: 'business_card', name: '명함 뿌리기', emoji: '💳', route: 'money', type: 'gold', power: 8, scale: { cha: 1 }, gold: 25, mp: 5, req: { level: 4 },
    desc: '명함을 날려 피해를 주고 일감(돈)도 챙긴다.' },
  { id: 'wrap_party', name: '쫑파티 약속', emoji: '🍻', route: 'social', type: 'mana', power: 12, mp: 0, req: { level: 2 },
    desc: '"끝나고 한잔해요!" 멘탈 회복.' },
  { id: 'callsheet_rewrite', name: '콜시트 재작성', emoji: '📋', route: 'social', type: 'stun', power: 4, scale: { cha: 0.6 }, mp: 8, req: { level: 6 },
    desc: '스케줄을 뒤집어 적의 다음 행동을 없앤다.' },

  // ── 🎨 감각 · 🎞️ 작가주의 ──
  { id: 'magic_hour', name: '매직아워 강림', emoji: '🌅', route: 'art', type: 'attack', power: 18, scale: { sen: 1.6 }, mp: 10, req: { level: 4 },
    desc: '해 질 녘 20분의 빛을 소환한다.' },
  { id: 'dutch_angle', name: '더치 앵글 비틀기', emoji: '📐', route: 'art', type: 'debuff', power: 30, turns: 2, mp: 4,
    desc: '세상을 기울여 적을 어지럽힌다.' },
  { id: 'auteur_vision', name: '작가의 시선', emoji: '👁️', route: 'indie', type: 'buff', power: 50, turns: 3, mp: 8, req: { level: 5 },
    desc: '"이 장면은 이래야 해." 3턴 동안 피해 증가. 작가주의 성향이 오른다.' },
  { id: 'one_take_dream', name: '원테이크의 꿈', emoji: '🎥', route: 'indie', type: 'attack', power: 22, scale: { sen: 1.4, str: 0.6 }, mp: 12, req: { level: 8 },
    desc: '컷 없이 모든 걸 담아내는 꿈의 한 방.' },
  { id: 'wedding_tears', name: '신부 아버지의 눈물', emoji: '😭', route: 'money', type: 'gold', power: 10, scale: { cha: 1.2 }, gold: 40, mp: 6, req: { jobs: ['wedding_assist', 'wedding_main', 'wedding_lead', 'wedding_ceo'] },
    desc: '모두를 울려서 피해를 주고 팁도 받는다.' },
  { id: 'subscribe_bell', name: '구독·좋아요·알림', emoji: '🔔', route: 'social', type: 'attack', power: 6, hits: 3, scale: { cha: 0.8 }, mp: 8, req: { jobs: ['youtuber', 'creator_pro', 'creator_star'] },
    desc: '세 번 연타. 알림 설정까지 부탁드립니다.' },
  { id: 'set_dressing', name: '세트 변신술', emoji: '🏛️', route: 'art', type: 'guard', power: 60, mp: 5, req: { jobs: ['art_maknae', 'art_team', 'art_lead', 'art_director'] },
    desc: '순식간에 세트를 바꿔 몸을 숨긴다.' },
]
