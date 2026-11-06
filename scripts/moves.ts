// 기술표 MOVES.md 만들기: npm run moves
// 수정은 client/src/config/characters.ts 에서 하고, 이 스크립트로 표를 다시 뽑습니다.
import { writeFileSync } from 'node:fs'
import { CHARACTERS, BTN_LABEL } from '../client/src/config/characters'

const RANK = ['막내', '서드', '세컨드', '퍼스트', '감독']
const INPUT: Record<string, string> = { light: '약', heavy: '강', special1: '특', special2: '↓ + 특', super: '필살 (SP 100)' }
const out: string[] = [
  '# ROLLING! 기술표',
  '',
  '> 이 파일은 `npm run moves`로 자동 생성됩니다. 바꾸고 싶은 이름·대사·수치를 적어서 알려주시거나,',
  '> `client/src/config/characters.ts`를 직접 고친 뒤 `npm run moves`를 다시 실행하세요.',
  '>',
  '> - **발동**: 누르고 나서 공격 판정이 나오기까지 프레임 (60프레임 = 1초, 작을수록 빠름)',
  '> - **경직**: 공격이 끝난 뒤 못 움직이는 프레임 (클수록 막혔을 때 위험)',
  '> - **배움**: 스테이지 모드에서 이 기술을 쓸 수 있게 되는 직급',
  '> - 공통 콤보 입력: 약약강 · 약강강 · 강강 · 약약특 · 약강특 · ↓+강',
  '',
]
for (const c of CHARACTERS) {
  out.push(`## ${c.name} (${c.nameEn}) — ${c.dept}`, '')
  out.push(`${c.desc}  `, `체력 ${c.hp} · 공격 ${c.stats.power} · 속도 ${c.stats.speed} · 사거리 ${c.stats.reach}  `, `직급: ${c.titles.join(' → ')}`, '')
  out.push('| 입력 | 기술 | 대사 | 피해 | 발동 | 경직 | SP | 배움 | 특징 |', '|---|---|---|---|---|---|---|---|---|')
  const rows: [string, string][] = Object.keys(INPUT).map((id) => [INPUT[id], id])
  for (const k of c.combos) rows.push([k.seq.map((t) => BTN_LABEL[t]).join(' '), k.move])
  for (const [input, id] of rows) {
    const m = c.moves[id]
    if (!m) continue
    const p = m.projectile
    const hits = m.multiHit ? `${m.damage}×${m.multiHit.max}` : String(p ? p.damage : m.damage)
    const tags = [p ? '투사체' : '', m.multiHit ? '연타' : '', m.kbY || m.lastHitKbY || p?.kbY ? '띄우기/다운' : '', m.dash ? '돌진' : '', m.finisher ? '마무리 연출' : '', m.hitbox.y === 0 && m.hitbox.h <= 14 && !p ? '하단' : '', m.hitstun >= 40 || (p?.hitstun ?? 0) >= 40 ? '긴 경직' : ''].filter(Boolean).join(', ')
    out.push(`| ${input} | ${m.name} | ${m.voice ?? ''} | ${hits} | ${m.startup} | ${m.recovery} | ${m.cost ?? ''} | ${RANK[m.rank ?? 0]} | ${tags} |`)
  }
  out.push('')
}
writeFileSync(new URL('../MOVES.md', import.meta.url), out.join('\n'))
console.log('MOVES.md 작성 완료')
