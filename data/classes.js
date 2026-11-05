// 시작 계열. implemented:false는 선택 화면에 "준비 중"으로 표시됩니다.
// startJob: data/jobs/의 직업 id, basicSkill: 기본 공격
export default [
  { id: 'camera', name: '촬영팀', emoji: '🎥', implemented: true, startJob: 'cam_maknae', basicSkill: 'slate_hit',
    desc: '카메라 옆에서 시작한다. 포커스, 근력, 데이터, 처세 어디로든 갈 수 있다.',
    bonus: { str: 1, tec: 1 } },
  { id: 'directing', name: '연출부', emoji: '🎬', implemented: false, desc: '준비 중' },
  { id: 'art', name: '미술팀', emoji: '🖌️', implemented: false, desc: '준비 중 (촬영팀에서 숨은 루트로 전직 가능)' },
  { id: 'sound', name: '동시녹음팀', emoji: '🎙️', implemented: false, desc: '준비 중' },
  { id: 'editing', name: '편집실', emoji: '✂️', implemented: false, desc: '준비 중' },
  { id: 'production', name: '제작부', emoji: '📋', implemented: false, desc: '준비 중' },
]
