// 전공 분야. career는 data/careers/의 계열 id와 연결됩니다.
// 해당 계열이 implemented:false면 config.defaultCareer(촬영)로 진행합니다.
export default [
  { id: 'directing',  name: '연출', emoji: '🎬', career: 'directing',
    desc: '감각과 리더십 성향', effects: { stats: { sense: 2, mental: 1 }, flags: ['leader_type'] } },
  { id: 'camera',     name: '촬영', emoji: '🎥', career: 'camera',
    desc: '기술과 체력', effects: { stats: { skill: 2, stamina: 1 } } },
  { id: 'editing',    name: '편집', emoji: '✂️', career: 'editing',
    desc: '기술과 감각, 엉덩이 힘', effects: { stats: { skill: 1, sense: 1, mental: 1 } } },
  { id: 'art',        name: '미술', emoji: '🖌️', career: 'art',
    desc: '감각과 체력', effects: { stats: { sense: 2, stamina: 1 } } },
  { id: 'sound',      name: '사운드', emoji: '🎙️', career: 'sound',
    desc: '기술과 멘탈', effects: { stats: { skill: 2, mental: 1 } } },
  { id: 'production', name: '제작', emoji: '📋', career: 'production',
    desc: '인맥과 멘탈', effects: { stats: { network: 2, mental: 1 } } },
]
