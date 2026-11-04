// 게임 전체 설정. 숫자는 화면에 직접 나오지 않고 흐름만 정합니다.
export default {
  title: '촬영현장 커리어',
  subtitle: '열아홉부터 마흔까지, 현장에서 사는 인생',

  startAge: 19,
  endAge: 40,          // 이 나이가 되면 엔딩

  // 1년에 몇 시즌인지, 시즌 이름
  seasons: {
    student: ['봄 학기', '가을 학기'],
    career: ['봄', '여름', '가을·겨울'],
  },

  // 타고난 자질: 1~10 랜덤. 조건에서는 low / mid / high 로만 씀
  traitRange: [1, 10],
  traitBands: { low: 3, high: 8 },   // ≤3 low, ≥8 high, 나머지 mid

  // 시작 통장(만원): 재력 단계별
  startMoney: { low: 20, mid: 120, high: 600 },
  // 학생 시즌 용돈 − 생활비 (재력 단계별)
  studentAllowance: { low: -60, mid: 40, high: 250 },
  // 현장 시즌 생활비. 본가에 살면(flag at_home) homeLivingCost
  livingCost: 420,
  homeLivingCost: 120,

  // 경험 단계 이름 (분야별 경험 수치 → 말로 표시)
  expLevels: [
    [0, '없음'], [1, '맛보기'], [3, '초보'], [6, '익숙함'], [10, '능숙함'], [15, '베테랑'], [21, '장인'],
  ],
  // 인연 단계 이름
  bondLevels: [
    [-99, '불편한 사이'], [-1, '서먹한 사이'], [0, '아는 사이'], [2, '가까운 사이'], [4, '오랜 동료'], [6, '평생의 인연'],
  ],

  // 직업 제안을 거절하면 몇 시즌 뒤에 다시 올 수 있는지
  offerCooldown: 6,

  // 시작 이야기
  introStorylet: 'intro_graduation',
  careerStartStorylet: 'career_start',
}
